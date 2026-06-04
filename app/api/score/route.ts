// Pullim Writing Coach — POST /api/score (12 API 계약 v0.1 / WBS P2.1·P2.2·P2.3)
// scripts/verify.mjs의 호출·파싱·스키마검증 코어에 HTTP 래퍼 + 토큰게이트 + 정규화 + 후처리 가드를 씌운 것.
//
// 모듈 경계: 부수효과(모델 호출·env·crypto)는 전부 이 파일에. 순수 로직은 app/lib/grading.ts·prompt.ts.
//
// ⚠️ 계약 §6 divergence: 계약은 `@anthropic-ai/sdk`(timeout/maxRetries=0)를 명시하나, 본 구현은
//    verify.mjs와 동일하게 raw fetch + AbortController로 이식했다. 의미는 동일 —
//    timeout 55s(AbortController), 업스트림 429/5xx·네트워크 자동재시도 없음(=maxRetries:0).
//    신규 의존성을 추가하지 않고, grading.ts/prompt.ts 순수성(§9 S4)을 유지하기 위함. (EPO 검수 항목)

import { createHash, timingSafeEqual } from "node:crypto";
import * as Sentry from "@sentry/nextjs";
import type { F3Output } from "@/app/data/samples";
import {
  ERROR_HTTP,
  type ErrorCode,
  errorEnvelope,
  finalizeOutput,
  parseModelJson,
  validateOutput,
  validateRequest,
} from "@/app/lib/grading";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/app/lib/prompt";

// ── 비기능 요구 (12 §9 / critical gap C1) ────────────────────────────
export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // POST는 기본 비캐시지만 명시 (Cache Components OFF)
export const maxDuration = 60; // 누락 시 플랫폼 기본 타임아웃에 함수가 먼저 죽음 (WBS §9)

// ── 모델 호출 파라미터 (12 §6) ───────────────────────────────────────
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 2000;
const TEMPERATURE = 0.2;
const TOTAL_BUDGET_MS = 55_000; // SDK timeout 55s (maxDuration 60s 안쪽) — 1회 재호출과 공유
const MIN_RETRY_BUDGET_MS = 8_000; // 남은 예산이 이보다 적으면 스키마 재호출 생략

// ── G1 토큰 게이트 (12 §7) — x-demo-token 상수시간 비교 ────────────────
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
    console.warn("[/api/score] DEMO_ACCESS_TOKEN 미설정 — 모든 요청 401 처리");
    return false;
  }
  const provided = req.headers.get("x-demo-token") ?? "";
  return timingSafeEqualStr(provided, expected);
}

// ── 모델 단일 호출 (verify.mjs callApi 이식, 단 자동재시도 제거 = maxRetries:0) ──
type ModelError = { code: Extract<ErrorCode, "E4" | "E8">; detail: string };

function isModelError(e: unknown): e is ModelError {
  return typeof e === "object" && e !== null && "code" in e;
}

async function callModel(userPrompt: string, timeoutMs: number): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw { code: "E8", detail: "ANTHROPIC_API_KEY 미설정" } satisfies ModelError;
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(timeoutMs, 1));
  let res: Response;
  try {
    res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: MAX_TOKENS,
        temperature: TEMPERATURE,
        // system 캐싱 (12 §6) — 데모 트래픽은 산발적이라 적중률 낮지만 정합 목적.
        system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        // JSON 강제 프리필 "{" (12 §6 / S2) — 응답엔 프리필이 echo되지 않으므로 호출부에서 prepend.
        messages: [
          { role: "user", content: userPrompt },
          { role: "assistant", content: "{" },
        ],
      }),
    });
  } catch (e) {
    // AbortController abort → 타임아웃(E4), 그 외 fetch 실패 → 네트워크(E8). 자동재시도 없음.
    if (e instanceof Error && e.name === "AbortError")
      throw { code: "E4", detail: "model timeout" } satisfies ModelError;
    throw { code: "E8", detail: e instanceof Error ? e.message : "network" } satisfies ModelError;
  } finally {
    clearTimeout(timer);
  }

  // 업스트림 429/5xx → 503(E8). 자동 백오프 재시도 안 함 (maxDuration 예산 보호).
  if (!res.ok) {
    throw { code: "E8", detail: `upstream HTTP ${res.status}` } satisfies ModelError;
  }

  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const body = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("");
  return `{${body}`; // 프리필 "{" 복원
}

function jsonError(code: ErrorCode): Response {
  return Response.json(errorEnvelope(code), { status: ERROR_HTTP[code] });
}

// ── 메트릭 로깅 (EPO 결정 2026-05-26, 12 §4.3) ─────────────────────────
// 스키마 무효 시 자동 1회 재호출(E 흡수)은 유지하되, **발동 횟수와 502 발생을 집계 가능하게** 로깅.
// 목적: P2.4·P5에서 "재호출이 실제로 얼마나 터지나 / 502는 ~0인가"를 측정해 2단 설계를 검증.
//   ⚠ 서버리스 인메모리 카운터는 인스턴스 간 미공유 — 영속 집계는 로그 수집(Vercel)에서 grep.
//   안정 태그 `[/api/score][metric]` + 단일 JSON 라인으로 카운트 가능하게 둔다(외부 스토어는 §7.2 후속).
function logMetric(event: string, extra: Record<string, unknown> = {}): void {
  console.warn(`[/api/score][metric] ${JSON.stringify({ event, ...extra })}`);
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

  // [V1·N1] 입력 검증 + 정규화 + char_count 재산출 (서버 권위)
  const validated = validateRequest(raw);
  if (!validated.ok) {
    return Response.json(errorEnvelope(validated.code, validated.message), {
      status: ERROR_HTTP[validated.code],
    });
  }
  const { assignment, submission } = validated.value;
  const userPrompt = buildUserPrompt(assignment, submission);

  // [M1→P1→S1] 모델 호출 → 파싱 → 스키마 검증. 무효 시 예산 내 1회 재호출 (E 흡수, 05-22 #4).
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  let lastSchemaErrs: string[] | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    const remaining = deadline - Date.now();
    if (attempt === 1) {
      // 재호출(attempt 1)은 남은 예산이 충분할 때만 — 예산 초과로 함수가 죽는 것 방지.
      if (remaining < MIN_RETRY_BUDGET_MS) {
        logMetric("schema_retry_skipped_budget", {
          remainingMs: remaining,
          prevErrs: lastSchemaErrs,
        });
        break;
      }
      logMetric("schema_retry", { remainingMs: remaining, prevErrs: lastSchemaErrs });
    }

    let text: string;
    try {
      text = await callModel(userPrompt, remaining);
    } catch (e) {
      // 모델 호출 에러(E4 타임아웃 / E8 네트워크·업스트림)는 스키마 재호출 대상이 아니라 즉시 반환.
      // Codex PR #60: catch 후 JSON 반환하므로 onRequestError가 못 잡음 — 명시적 captureException.
      if (isModelError(e)) {
        console.error(`[/api/score] model call ${e.code}: ${e.detail}`);
        Sentry.captureException(new Error(`/api/score model call ${e.code}: ${e.detail}`), {
          tags: { route: "/api/score", errorCode: e.code },
        });
        return jsonError(e.code);
      }
      console.error("[/api/score] 예기치 못한 호출 오류", e);
      Sentry.captureException(e, { tags: { route: "/api/score", errorCode: "E8" } });
      return jsonError("E8");
    }

    // [P1] 파싱 (코드펜스 제거 포함)
    let parsed: unknown;
    try {
      parsed = parseModelJson(text);
    } catch {
      lastSchemaErrs = ["JSON 파싱 실패"];
      continue; // 1회 재호출
    }

    // [S1] 스키마 검증
    const errs = validateOutput(parsed);
    if (errs.length > 0) {
      lastSchemaErrs = errs;
      console.warn(`[/api/score] 스키마 위반(attempt ${attempt}): ${errs.join("; ")}`);
      continue; // 1회 재호출
    }

    // [O1] 후처리 가드 + meta 주입 → 200
    const output = finalizeOutput(parsed as F3Output);
    return Response.json(output, { status: 200 });
  }

  // 재호출까지 무효 → 502 (E5). 깨진 결과는 절대 화면에 내보내지 않음.
  // Codex PR #60: catch 후 JSON 반환이라 onRequestError가 못 잡음 — 명시적 captureMessage.
  logMetric("schema_fail_502", { errs: lastSchemaErrs });
  console.error(`[/api/score] 재호출 후에도 무효 → 502: ${lastSchemaErrs?.join("; ") ?? "?"}`);
  Sentry.captureMessage(
    `/api/score schema fail 502: ${lastSchemaErrs?.join("; ") ?? "?"}`,
    { level: "error", tags: { route: "/api/score", errorCode: "E5" } },
  );
  return jsonError("E5");
}
