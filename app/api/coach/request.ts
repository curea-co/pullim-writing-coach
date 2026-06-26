// /api/coach request 검증 순수 모듈 (Wave2 Slice 1).
//   node:test가 직접 import 가능하도록 순수 경계 유지:
//   @sentry/nextjs·server-only·@anthropic-ai/sdk·fetch·next/* 미import.
//   relative import만 사용 (node test runner는 @/app alias 미지원).
//   선례: app/api/extract/helpers.ts
//
//   route.ts:141-209 인라인 → 이 파일로 이동 (byte-for-byte + mode 필드 추가).

import {
  type ErrorCode,
  GENRES,
  SCHOOL_LEVELS,
  SUBJECTS,
  charCount,
  normalizeBody,
} from "../../lib/grading";
import { type WritingMode, isModeEnabled } from "../../lib/coach-setup";

// ── 본문 길이 정책 (route:54-55에서 이동 — validateCoachRequest에서만 사용) ──
export const COACH_BODY_MIN = 10; // 막 시작한 초안도 코치 가능. 빈 글만 막는다.
export const COACH_BODY_MAX = 4000; // 채점(2000)보다 여유 — 코치는 더 긴 초안도 본다.

// ── 코치 요청 검증 타입 ─────────────────────────────────────────────
// 채점과 달리 target_char_count는 없고, rubric(선택)이 있으며, 본문 하한이 낮다(쓰는 중).
export type ValidatedCoachRequest = {
  assignment: {
    school_level: string;
    subject: string;
    genre: string;
    target_char_count: null; // 코치는 분량 미사용 — 프롬프트 타입 정합용 null 고정
    prompt_text: string;
  };
  rubricText?: string;
  draft: string; // 정규화 후 본문
  mode: WritingMode; // Wave2 Slice 1 추가 — 후속 슬라이스가 분기에 사용
};

export type CoachValidation =
  | { ok: true; value: ValidatedCoachRequest }
  | { ok: false; code: ErrorCode; message?: string };

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function validateCoachRequest(raw: unknown): CoachValidation {
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

  // mode 파싱: 활성 모드이면 그대로, 아니면 "free" 폴백. 비활성 모드(예: voice 준비 중)도 "free"로
  //   떨어뜨려 가드를 일원화 — parseSetup뿐 아니라 API 경계에서도 비활성 모드를 수용하지 않는다.
  const m = raw.mode;
  const mode: WritingMode =
    typeof m === "string" && isModeEnabled(m as WritingMode) ? (m as WritingMode) : "free";

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
      mode,
    },
  };
}
