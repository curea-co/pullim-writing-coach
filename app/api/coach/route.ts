// Pullim Writing Coach — POST /api/coach (EPIC2 T2.2 / docs/25)
// 과정 코치 엔드포인트. /api/score(route.ts) 서버 패턴을 그대로 답습한다:
//   토큰게이트(상수시간) → JSON 파싱 → 코치요청 검증 → splitParagraphs → getCoachProfile
//   → buildCoachPrompt → callModel(프리필 "{") → parseModelJson → validateCoachOutput
//   → runCoachGuards(권위적 백스톱) → prioritizeNudges 정렬 후 200.
//
// 모듈 경계: 부수효과(모델 호출·env·crypto)는 전부 이 파일에. 순수 로직은 app/lib/*.ts.
//
// ★ MOCK 폴백: ANTHROPIC_API_KEY 미설정 또는 COACH_MOCK=1이면 모델 대신 coach-mock(순수 휴리스틱)으로
//   유효한 CoachOutput을 만든다 → 키 없이도 /coach가 작동(데모·로컬·테스트). mock 경로에도 동일 가드를 건다.
//
// ★ 중대 불변식: 코치는 학생 문장을 대신 쓰지 않는다. 프롬프트가 1차 강제 + runCoachGuards가 권위 백스톱.
//   가드 위반 → 1회 재호출 → 그래도 위반이면 502류 에러. **생성 문장은 절대 응답에 누출하지 않는다.**

import * as Sentry from "@sentry/nextjs";
import {
  ERROR_HTTP,
  type ErrorCode,
  errorEnvelope,
  parseModelJson,
} from "@/app/lib/grading";
import {
  type CoachOutput,
  runCoachGuards,
  validateCoachOutput,
} from "@/app/lib/coach-schema";
import { getAgeBand, getCoachProfile } from "@/app/lib/coach-profile";
import { splitParagraphs } from "@/app/lib/paragraphs";
import { prioritizeNudges } from "@/app/lib/nudge-priority";
import { COACH_SYSTEM_PROMPT, buildCoachPrompt } from "@/app/lib/coach-prompt";
import { runCoachMock } from "@/app/lib/coach-mock";
import { verifyWritingAccess } from "@/app/lib/server/pullim-session";
import { quotaGate, consumeQuota } from "@/app/lib/server/quota";
import { validateCoachRequest } from "./request";

// ── 비기능 요구 (score route 정합) ──────────────────────────────────
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

// ── 모델 호출 파라미터 (score route 정합) ────────────────────────────
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
// 코치는 nudge 다수 + diagnosis/question 텍스트가 길 수 있어 채점(2000)보다 넉넉히.
const MAX_TOKENS = 3000;
const TEMPERATURE = 0.3;
const TOTAL_BUDGET_MS = 55_000;
const MIN_RETRY_BUDGET_MS = 8_000;

// ── 모델 단일 호출 (score route callModel 이식, coach용 프롬프트/토큰) ──
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
        system: [
          { type: "text", text: COACH_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
        ],
        // JSON 강제 프리필 "{" — 응답엔 프리필이 echo되지 않으므로 호출부에서 prepend.
        messages: [
          { role: "user", content: userPrompt },
          { role: "assistant", content: "{" },
        ],
      }),
    });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError")
      throw { code: "E4", detail: "model timeout" } satisfies ModelError;
    throw { code: "E8", detail: e instanceof Error ? e.message : "network" } satisfies ModelError;
  } finally {
    clearTimeout(timer);
  }

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

function logMetric(event: string, extra: Record<string, unknown> = {}): void {
  console.warn(`[/api/coach][metric] ${JSON.stringify({ event, ...extra })}`);
}

// 가드 통과 출력에 prioritizeNudges 적용 후 200 응답.
function respondCoach(output: CoachOutput): Response {
  const nudges = prioritizeNudges(output.nudges, output.area_scores);
  return Response.json({ area_scores: output.area_scores, nudges }, { status: 200 });
}

export async function POST(req: Request): Promise<Response> {
  // [G1] 인가 게이트 — SSO 세션(/me) 우선, 비prod 데모토큰 fallback (fail-closed).
  if (!(await verifyWritingAccess(req))) return jsonError("E-AUTH");

  // [G1.5] 무료 1일 1세션 한도(QA WRITING-ACCESS-002) — 유료(writing≥2)·데모(비prod)·인프라 실패는 통과.
  //   "1일 1회"의 단위는 세션 — 1세션 = 첫 [봐줘] + 수정 재점검 2회 = 3호출(MAX_CHECKS=3, 첫 점검 포함)
  //   이라 호출 예산 3회로 환산(quota-core FREE_DAILY_LIMITS.coach). 진행 중 세션이 재점검에서 끊기지 않게.
  //   소비는 성공 응답 직전(에러 재시도가 예산을 태우지 않게).
  const quota = await quotaGate(req, "coach");
  if (!quota.allowed) {
    logMetric("quota_capped", { feature: "coach" });
    // 공통 E-CAP 카피는 "무료 채점"(score용) — 코치 전용 메시지로 덮어쓴다(봉투 계약 정합, Codex #143).
    return Response.json(
      errorEnvelope("E-CAP", "오늘의 무료 코치 이용을 모두 사용했어요. 내일 다시 만나요!"),
      { status: ERROR_HTTP["E-CAP"] },
    );
  }

  // [G2] 본문 파싱
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return jsonError("E-PARSE");
  }

  // [V1] 코치요청 검증 + 정규화
  const validated = validateCoachRequest(raw);
  if (!validated.ok) {
    return Response.json(errorEnvelope(validated.code, validated.message), {
      status: ERROR_HTTP[validated.code],
    });
  }
  const { assignment, rubricText, draft, mode } = validated.value;
  // mode는 후속 슬라이스에서 사용(현재 무동작 — Wave2 Slice 1 no-op 배선)
  void mode;

  // 문단 분해 + 연령/톤 프로필
  const paragraphs = splitParagraphs(draft);
  const profile = getCoachProfile(getAgeBand(assignment.school_level));

  // ── MOCK 폴백 ──────────────────────────────────────────────────────
  // 키 없거나 COACH_MOCK=1이면 결정적 휴리스틱으로. mock도 동일 가드를 통과해야 응답한다.
  const useMock = process.env.COACH_MOCK === "1" || !process.env.ANTHROPIC_API_KEY;
  if (useMock) {
    const mock = runCoachMock(draft);
    const schemaErrs = validateCoachOutput(mock);
    const guardErrs = runCoachGuards(mock, draft);
    if (schemaErrs.length > 0 || guardErrs.length > 0) {
      // mock은 결정적이라 정상 코드패스에선 발생 불가 — 발생하면 버그. 깨진 출력 누출 금지.
      logMetric("mock_invalid", { schemaErrs, guardErrs });
      console.error(`[/api/coach] mock 무효(버그): ${[...schemaErrs, ...guardErrs].join("; ")}`);
      Sentry.captureMessage(
        `/api/coach mock invalid: ${[...schemaErrs, ...guardErrs].join("; ")}`,
        { level: "error", tags: { route: "/api/coach", errorCode: "E6", mock: "1" } },
      );
      return jsonError("E6");
    }
    logMetric("mock_served", { nudges: mock.nudges.length });
    if (quota.consume) await consumeQuota(req, "coach", quota.raw);
    return respondCoach(mock);
  }

  // ── 모델 경로 ───────────────────────────────────────────────────────
  const userPrompt = buildCoachPrompt({
    assignment,
    rubricText,
    draft,
    paragraphs,
    profile,
  });

  const deadline = Date.now() + TOTAL_BUDGET_MS;
  let lastErrs: string[] | null = null;

  // 스키마 무효 또는 가드 위반 → 예산 내 1회 재호출. 그래도 위반이면 502류. 생성문장 누출 금지.
  for (let attempt = 0; attempt < 2; attempt++) {
    const remaining = deadline - Date.now();
    if (attempt === 1) {
      if (remaining < MIN_RETRY_BUDGET_MS) {
        logMetric("retry_skipped_budget", { remainingMs: remaining, prevErrs: lastErrs });
        break;
      }
      logMetric("coach_retry", { remainingMs: remaining, prevErrs: lastErrs });
    }

    let text: string;
    try {
      text = await callModel(userPrompt, remaining);
    } catch (e) {
      if (isModelError(e)) {
        console.error(`[/api/coach] model call ${e.code}: ${e.detail}`);
        Sentry.captureException(new Error(`/api/coach model call ${e.code}: ${e.detail}`), {
          tags: { route: "/api/coach", errorCode: e.code },
        });
        return jsonError(e.code);
      }
      console.error("[/api/coach] 예기치 못한 호출 오류", e);
      Sentry.captureException(e, { tags: { route: "/api/coach", errorCode: "E8" } });
      return jsonError("E8");
    }

    // [P1] 파싱
    let parsed: unknown;
    try {
      parsed = parseModelJson(text);
    } catch {
      lastErrs = ["JSON 파싱 실패"];
      continue;
    }

    // [S1] 스키마 검증
    const schemaErrs = validateCoachOutput(parsed);
    if (schemaErrs.length > 0) {
      lastErrs = schemaErrs;
      console.warn(`[/api/coach] 스키마 위반(attempt ${attempt}): ${schemaErrs.join("; ")}`);
      continue;
    }

    // [GUARD] 생성 차단 가드 — 권위적. 위반 시 재호출, 절대 누출하지 않는다.
    const guardErrs = runCoachGuards(parsed as CoachOutput, draft);
    if (guardErrs.length > 0) {
      lastErrs = guardErrs;
      console.warn(`[/api/coach] 가드 위반(attempt ${attempt}): ${guardErrs.join("; ")}`);
      logMetric("guard_violation", { attempt, errs: guardErrs });
      continue; // 1회 재호출 — 통과 못 하면 아래 502
    }

    // [O1] 통과 → prioritizeNudges 정렬 후 200. 성공 확정 후에만 쿼터 소비(fail-open).
    if (quota.consume) await consumeQuota(req, "coach", quota.raw);
    return respondCoach(parsed as CoachOutput);
  }

  // 재호출 후에도 무효/위반 → 502 (E6). 깨진/대필 결과는 절대 화면에 내보내지 않는다.
  logMetric("coach_fail_502", { errs: lastErrs });
  console.error(`[/api/coach] 재호출 후에도 무효 → 502: ${lastErrs?.join("; ") ?? "?"}`);
  Sentry.captureMessage(`/api/coach fail 502: ${lastErrs?.join("; ") ?? "?"}`, {
    level: "error",
    tags: { route: "/api/coach", errorCode: "E6" },
  });
  return jsonError("E6");
}
