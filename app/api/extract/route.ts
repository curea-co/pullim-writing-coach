// POST /api/extract — 안내서 자동 추출 (LLM). Phase 1 PR B (Overnight 6/8 위임).
//   v2 → v1 수평 이식. /api/score와 동일한 게이트·재호출·에러 모델.
//   순수 로직은 app/lib/extract.ts·anthropic.ts (PR #67 lib 이식 산출).
//
// Codex 4 layer 정합 (docs/22_infra_pr_checklist.md):
//   - Layer 1 onRequestError: instrumentation.ts에서 자동 (uncaught 예외)
//   - Layer 4 API catch + return: 본 route의 model call catch + schema fail 502 두 지점에 Sentry.captureException 명시 (E4·E8·E5)
//   - Token gate: timingSafeEqual 상수시간 비교 (DEMO_ACCESS_TOKEN 미설정 시 fail-closed)
//   - 1회 스키마 재호출 (E 흡수, predeadline budget 보호)

import { createHash, timingSafeEqual } from "node:crypto";
import * as Sentry from "@sentry/nextjs";
import { callAnthropic, isModelCallError } from "@/app/lib/anthropic";
import {
  EXTRACT_SYSTEM_PROMPT,
  buildExtractUserPrompt,
  finalizeExtraction,
  validateExtractOutput,
  validateExtractRequest,
} from "@/app/lib/extract";
import { ERROR_HTTP, type ErrorCode, errorEnvelope, parseModelJson } from "@/app/lib/grading";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // POST는 기본 비캐시이나 명시 (Cache Components OFF)
export const maxDuration = 60; // 누락 시 플랫폼 기본 타임아웃에 함수가 먼저 죽음

// /api/score와 동일 토큰을 공유하므로 별도 env 없이 DEMO_ACCESS_TOKEN 재사용.
const MAX_TOKENS = 1200;
const TOTAL_BUDGET_MS = 55_000; // SDK timeout 55s (maxDuration 60s 안쪽) — 1회 재호출과 공유
const MIN_RETRY_BUDGET_MS = 8_000; // 남은 예산이 이보다 적으면 스키마 재호출 생략

// ── 토큰 게이트 (x-demo-token 상수시간 비교) ─────────────────────────────
function timingSafeEqualStr(a: string, b: string): boolean {
  // 길이 누설 방지: 양쪽을 고정 길이 해시로 비교 (timingSafeEqual은 길이 다르면 throw).
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

function isAuthorized(req: Request): boolean {
  const expected = process.env.DEMO_ACCESS_TOKEN;
  if (!expected) {
    // fail-closed: 비밀이 등록 안 됐으면 아무도 통과시키지 않는다 (익명 인터넷 차단).
    console.warn("[/api/extract] DEMO_ACCESS_TOKEN 미설정 — 모든 요청 401 처리");
    return false;
  }
  const provided = req.headers.get("x-demo-token") ?? "";
  return timingSafeEqualStr(provided, expected);
}

// Codex PR #69: grading.ts errorEnvelope 기본 카피는 채점 컨텍스트("결과를 다시 만들어야 해요"·
//   "지금 첨삭이 지연되고 있어요"). extract 컨텍스트와 다름. 서버 응답에 추출 전용 메시지
//   명시해 FE의 EXTRACT_MESSAGE 분리 의도 실효 (extract-client는 server message 우선 사용).
//   E1·E2·E3는 validateExtractRequest가 컨텍스트 메시지 자체 제공 — jsonError는 그 외 코드용.
const EXTRACT_MESSAGE: Record<ErrorCode, string> = {
  "E-PARSE": "추출 결과 형식이 올바르지 않아요. 다시 시도해 주세요.",
  "E-AUTH": "데모 비밀번호를 다시 확인해 주세요.",
  "E-CAP": "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.",
  E1: "안내서 정보가 올바르지 않아요. 다시 입력해 주세요.",
  E2: "안내서 내용이 너무 짧아요. 좀 더 입력해 주세요.",
  E3: "안내서가 너무 길어요. 8,000자 이내로 줄여 주세요.",
  E4: "지금 추출이 지연되고 있어요. 다시 시도해 주세요.",
  E5: "추출 결과를 다시 만들어야 해요. 잠시 후 다시 시도해 주세요.",
  E6: "추출 결과를 다시 만들어야 해요. 잠시 후 다시 시도해 주세요.",
  E8: "일시적 오류예요. 잠시 후 다시 시도해 주세요.",
  E10: "분량 정보가 올바르지 않아요.",
  E11: "안내서가 비어 있어요. 내용을 입력해 주세요.",
};

function jsonError(code: ErrorCode): Response {
  return Response.json(errorEnvelope(code, EXTRACT_MESSAGE[code]), { status: ERROR_HTTP[code] });
}

// ── 메트릭 로깅 (12 §4.3 · /api/score 동일 패턴) ──────────────────────────
function logMetric(event: string, extra: Record<string, unknown> = {}): void {
  console.warn(`[/api/extract][metric] ${JSON.stringify({ event, ...extra })}`);
}

export async function POST(req: Request): Promise<Response> {
  // [G1] 토큰 게이트
  if (!isAuthorized(req)) return jsonError("E-AUTH");

  // [G2] 본문 파싱
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonError("E-PARSE");
  }

  // [V1] 입력 검증 + 정규화 (raw_text 길이·channel 화이트리스트)
  const validated = validateExtractRequest(raw);
  if (!validated.ok) {
    return Response.json(errorEnvelope(validated.code, validated.message), {
      status: ERROR_HTTP[validated.code],
    });
  }
  const { raw_text, channel } = validated.value;
  const userPrompt = buildExtractUserPrompt(raw_text, channel);

  // [M1→P1→S1] 모델 호출 → 파싱 → 스키마 검증. 무효 시 예산 내 1회 재호출.
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  let lastErrs: string[] | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const remaining = deadline - Date.now();
    if (attempt === 1) {
      if (remaining < MIN_RETRY_BUDGET_MS) {
        logMetric("schema_retry_skipped_budget", {
          remainingMs: remaining,
          prevErrs: lastErrs,
        });
        break;
      }
      logMetric("schema_retry", { remainingMs: remaining, prevErrs: lastErrs });
    }

    let text: string;
    try {
      text = await callAnthropic({
        system: EXTRACT_SYSTEM_PROMPT,
        userPrompt,
        timeoutMs: remaining,
        maxTokens: MAX_TOKENS,
      });
    } catch (e) {
      // 모델 호출 에러(E4 timeout / E8 network·upstream)는 스키마 재호출 대상이 아니라 즉시 반환.
      // docs/22 Layer 4: catch 후 JSON 반환이라 onRequestError가 못 잡음 — 명시적 captureException.
      if (isModelCallError(e)) {
        console.error(`[/api/extract] model call ${e.code}: ${e.detail}`);
        Sentry.captureException(
          new Error(`/api/extract model call ${e.code}: ${e.detail}`),
          { tags: { route: "/api/extract", errorCode: e.code } },
        );
        return jsonError(e.code);
      }
      console.error("[/api/extract] 예기치 못한 호출 오류", e);
      Sentry.captureException(e, { tags: { route: "/api/extract", errorCode: "E8" } });
      return jsonError("E8");
    }

    // [P1] 파싱 (코드펜스 제거 포함)
    let parsed: unknown;
    try {
      parsed = parseModelJson(text);
    } catch {
      lastErrs = ["JSON 파싱 실패"];
      continue; // 1회 재호출
    }

    // [S1] 스키마 검증
    const errs = validateExtractOutput(parsed);
    if (errs.length > 0) {
      lastErrs = errs;
      console.warn(`[/api/extract] 스키마 위반(attempt ${attempt}): ${errs.join("; ")}`);
      continue; // 1회 재호출
    }

    // [O1] 후처리 + raw_excerpt 보존 → 200
    const output = finalizeExtraction(
      parsed as Parameters<typeof finalizeExtraction>[0],
      raw_text,
      channel,
    );
    return Response.json(output, { status: 200 });
  }

  // 재호출까지 무효 → 502 (E5). 깨진 결과는 절대 화면에 내보내지 않음.
  // docs/22 Layer 4: catch 후 JSON 반환이라 onRequestError가 못 잡음 — 명시적 captureMessage.
  logMetric("schema_fail_502", { errs: lastErrs });
  console.error(`[/api/extract] 재호출 후에도 무효 → 502: ${lastErrs?.join("; ") ?? "?"}`);
  Sentry.captureMessage(
    `/api/extract schema fail 502: ${lastErrs?.join("; ") ?? "?"}`,
    { level: "error", tags: { route: "/api/extract", errorCode: "E5" } },
  );
  return jsonError("E5");
}
