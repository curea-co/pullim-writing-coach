// Pullim Writing Coach — 코치 셋업(과제 + 작성 모드) 순수 모듈 (물결1).
//   grading.ts와 동일하게 순수: @anthropic-ai/sdk·server-only·fetch·next/* 미import.
//   부수효과(localStorage)는 CoachSetupFlow("use client")가 전담. 여기는 타입·검증·직렬화만.

import {
  SCHOOL_LEVELS,
  SUBJECTS,
  GENRES,
  PROMPT_MIN,
  PROMPT_MAX,
  TARGET_MIN,
  TARGET_MAX,
} from "./grading";

export type WritingMode = "free" | "guide" | "outline" | "voice";

export type CoachAssignment = {
  school_level: string;
  subject: string;
  genre: string;
  target_char_count: number | null;
  prompt_text: string;
  title?: string;
};

export type CoachSetup = { assignment: CoachAssignment; mode: WritingMode };

// 이번 물결에 실제 동작하는 모드 화이트리스트. outline/voice는 카드 '준비 중'(비활성).
const ENABLED_MODES: readonly WritingMode[] = ["free", "guide"];
/** 형태 가드용 전체 모드 화이트리스트 — 활성화 여부가 아님(활성화는 isModeEnabled/ENABLED_MODES). */
export const ALL_MODES: readonly WritingMode[] = ["free", "guide", "outline", "voice"];

export function emptyAssignment(): CoachAssignment {
  return { school_level: "", subject: "", genre: "", target_char_count: null, prompt_text: "" };
}

export function isModeEnabled(mode: WritingMode): boolean {
  return ENABLED_MODES.includes(mode);
}

// 위반 목록 반환(빈 배열 = 통과). 검증 규칙은 grading.ts 단일 소스 재사용.
export function validateAssignment(a: CoachAssignment): string[] {
  const v: string[] = [];
  if (!(SCHOOL_LEVELS as readonly string[]).includes(a.school_level)) v.push("학년을 선택해 주세요");
  if (!(SUBJECTS as readonly string[]).includes(a.subject)) v.push("과목을 선택해 주세요");
  if (!(GENRES as readonly string[]).includes(a.genre)) v.push("장르를 선택해 주세요");
  const prompt = (a.prompt_text ?? "").trim();
  if (prompt.length < PROMPT_MIN || prompt.length > PROMPT_MAX) {
    v.push(`과제 내용을 ${PROMPT_MIN}~${PROMPT_MAX}자로 입력해 주세요`);
  }
  if (a.target_char_count !== null) {
    const t = a.target_char_count;
    if (!Number.isInteger(t) || t < TARGET_MIN || t > TARGET_MAX) {
      v.push(`목표 글자 수는 ${TARGET_MIN}~${TARGET_MAX} 사이여야 해요`);
    }
  }
  return v;
}

export function serializeSetup(s: CoachSetup): string {
  return JSON.stringify(s);
}

// 방어적 파싱 — 모양이 안 맞으면 null(손상·schema 변화 대비).
export function parseSetup(raw: string | null): CoachSetup | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Partial<CoachSetup>;
    if (typeof o !== "object" || o === null) return null;
    if (typeof o.mode !== "string" || !ALL_MODES.includes(o.mode as WritingMode)) return null;
    const a = o.assignment;
    if (typeof a !== "object" || a === null) return null;
    if (typeof a.school_level !== "string" || typeof a.subject !== "string") return null;
    if (typeof a.genre !== "string" || typeof a.prompt_text !== "string") return null;
    if (!(a.target_char_count === null || (typeof a.target_char_count === "number" && Number.isInteger(a.target_char_count)))) return null;
    // 구조뿐 아니라 의미까지 검증(curea-review-ai 지적): 비활성 모드(outline/voice)나 규칙을 어긴
    // 과제가 저장돼 있으면 null로 떨어뜨려 /coach가 곧장 ready로 진입해 UI 가드를 우회하는 걸 막는다.
    const setup = o as CoachSetup;
    if (!isModeEnabled(setup.mode)) return null;
    if (validateAssignment(setup.assignment).length > 0) return null;
    return setup;
  } catch {
    return null;
  }
}
