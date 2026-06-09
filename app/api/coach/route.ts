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

import { createHash, timingSafeEqual } from "node:crypto";
import * as Sentry from "@sentry/nextjs";
import {
  ERROR_HTTP,
  type ErrorCode,
  GENRES,
  SCHOOL_LEVELS,
  SUBJECTS,
  charCount,
  errorEnvelope,
  normalizeBody,
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

// ── 본문 길이 정책 (코치는 "쓰는 중"이라 채점보다 하한이 낮다) ───────
const COACH_BODY_MIN = 10; // 막 시작한 초안도 코치 가능. 빈 글만 막는다.
const COACH_BODY_MAX = 4000; // 채점(2000)보다 여유 — 코치는 더 긴 초안도 본다.

// ── 토큰 게이트 (score route isAuthorized 동일) ──────────────────────
function timingSafeEqualStr(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

function isAuthorized(req: Request): boolean {
  const expected = process.env.DEMO_ACCESS_TOKEN;
  if (!expected) {
    console.warn("[/api/coach] DEMO_ACCESS_TOKEN 미설정 — 모든 요청 401 처리");
    return false; // fail-closed
  }
  const provided = req.headers.get("x-demo-token") ?? "";
  return timingSafeEqualStr(provided, expected);
}

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

// ── 코치 요청 검증 ───────────────────────────────────────────────────
// 채점과 달리 target_char_count는 없고, rubric(선택)이 있으며, 본문 하한이 낮다(쓰는 중).
type ValidatedCoachRequest = {
  assignment: {
    school_level: string;
    subject: string;
    genre: string;
    target_char_count: null; // 코치는 분량 미사용 — 프롬프트 타입 정합용 null 고정
    prompt_text: string;
  };
  rubricText?: string;
  draft: string; // 정규화 후 본문
};

type CoachValidation =
  | { ok: true; value: ValidatedCoachRequest }
  | { ok: false; code: ErrorCode; message?: string };

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function validateCoachRequest(raw: unknown): CoachValidation {
  if (!isObject(raw)) return { ok: false, code: "E1" };
  const assignment = raw.assignment;
  const submission = raw.submission;
  if (!isObject(assignment)) return { ok: false, code: "E1" };
  if (!isObject(submission)) return { ok: false, code: "E1" };

  const school = assignment.school_level;
  const subject = assignment.subject;
  const genre = assignment.genre;
  const promptText = assignment.prompt_text;

  if (typeof school !== "string" || !(SCHOOL_LEVELS as readonly string[]).includes(school))
    return { ok: false, code: "E1", message: "학년을 선택해 주세요." };
  if (typeof subject !== "string" || !(SUBJECTS as readonly string[]).includes(subject))
    return { ok: false, code: "E1", message: "과목을 선택해 주세요." };
  if (typeof genre !== "string" || !(GENRES as readonly string[]).includes(genre))
    return { ok: false, code: "E1", message: "장르를 선택해 주세요." };
  if (typeof promptText !== "string" || !promptText.trim())
    return { ok: false, code: "E1", message: "과제문을 입력해 주세요." };

  // rubric은 선택 — 문자열이 아니면 무시(타입만 좁혀 안전하게).
  const rubricRaw = raw.rubric;
  const rubricText =
    typeof rubricRaw === "string" && rubricRaw.trim().length > 0 ? rubricRaw.trim() : undefined;

  const rawBody = submission.body;
  if (typeof rawBody !== "string") return { ok: false, code: "E1", message: "본문을 입력해 주세요." };

  const draft = normalizeBody(rawBody);
  const len = charCount(draft);
  if (len < COACH_BODY_MIN) return { ok: false, code: "E2", message: "본문을 10자 이상 입력해 주세요." };
  if (len > COACH_BODY_MAX) return { ok: false, code: "E3", message: "4,000자까지 코치할 수 있어요." };

  return {
    ok: true,
    value: {
      assignment: {
        school_level: school,
        subject,
        genre,
        target_char_count: null,
        prompt_text: promptText.trim(),
      },
      rubricText,
      draft,
    },
  };
}

// 가드 통과 출력에 prioritizeNudges 적용 후 200 응답.
function respondCoach(output: CoachOutput): Response {
  const nudges = prioritizeNudges(output.nudges, output.area_scores);
  return Response.json({ area_scores: output.area_scores, nudges }, { status: 200 });
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

  // [V1] 코치요청 검증 + 정규화
  const validated = validateCoachRequest(raw);
  if (!validated.ok) {
    return Response.json(errorEnvelope(validated.code, validated.message), {
      status: ERROR_HTTP[validated.code],
    });
  }
  const { assignment, rubricText, draft } = validated.value;

  // 문단 분해 + 연령/톤 프로필
  const paragraphs = splitParagraphs(draft);
  const profile = getCoachProfile(getAgeBand(assignment.school_level));

  // ── MOCK 폴백 ──────────────────────────────────────────────────────
  // 키 없거나 COACH_MOCK=1이면 결정적 휴리스틱으로. mock도 동일 가드를 통과해야 응답한다.
  const useMock = process.env.COACH_MOCK === "1" || !process.env.ANTHROPIC_API_KEY;
  if (useMock) {
    const mock = runCoachMock(draft);
    const schemaErrs = validateCoachOutput(mock);
    const guardErrs = runCoachGuards(mock);
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
    const guardErrs = runCoachGuards(parsed as CoachOutput);
    if (guardErrs.length > 0) {
      lastErrs = guardErrs;
      console.warn(`[/api/coach] 가드 위반(attempt ${attempt}): ${guardErrs.join("; ")}`);
      logMetric("guard_violation", { attempt, errs: guardErrs });
      continue; // 1회 재호출 — 통과 못 하면 아래 502
    }

    // [O1] 통과 → prioritizeNudges 정렬 후 200
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
