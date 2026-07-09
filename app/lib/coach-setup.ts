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

// phase: 개요/가이드의 참고 메모(plan) 단계를 아직 안 끝냈는지 — 새로고침 복원 시 plan/ready 구분(Codex #134).
//   부재/손상 값은 복원부(CoachSetupFlow)가 ready로 낙하(과거 동작 유지). parseSetup은 round-trip 보존 위해 미변형.
export type CoachSetup = { assignment: CoachAssignment; mode: WritingMode; phase?: "plan" | "ready" };

// 실제 동작하는 모드 화이트리스트. voice(말하기)는 실마이크 QA·미성년자 동의 정책 전까지 비활성("준비 중").
//   voice를 빼면 parseSetup이 저장된 voice 셋업도 거부하므로(미지원 브라우저 복원 데드엔드 방지) 가드가 일원화된다.
const ENABLED_MODES: readonly WritingMode[] = ["free", "guide", "outline"];
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
    // 규칙 위반 과제는 null로 떨어뜨려 /coach가 곧장 ready로 진입해 UI 가드를 우회하는 걸 막는다.
    const setup = o as CoachSetup;
    // title은 선택 필드 — 손상된 localStorage가 문자열 아닌 title(예: 숫자·객체)을 담고 있으면 버린다.
    //   나머지 과제는 보존하되, 완료 화면 formatStoryText의 oneLine(title).replace(...)가 TypeError로
    //   터지는 걸 방지(방어적 파싱).
    const rawTitle = (a as { title?: unknown }).title;
    if (rawTitle !== undefined && typeof rawTitle !== "string") {
      setup.assignment = { ...setup.assignment, title: undefined };
    }
    if (validateAssignment(setup.assignment).length > 0) return null;
    // phase는 그대로 통과시켜 serialize↔parse round-trip을 보존한다(Codex #134: 여기서 "ready"로 강제하면
    //   phase 없던 setup의 왕복 결과가 달라져 계약·테스트가 깨진다). 정규화는 소비부(CoachSetupFlow 복원)가
    //   `saved.phase === "plan" ? "plan" : "ready"`로 처리 — 손상/부재 값도 안전하게 ready로 낙하.
    // 비활성 모드(예: voice 준비 중)면 과제는 보존하고 모드만 기본 활성 모드로 다운그레이드 —
    //   저장된 voice 셋업이 통째로 null이 돼 과제 입력을 잃거나(마이그레이션 손실) 미지원 브라우저에서
    //   voice로 직행하는 데드엔드를 동시에 막는다.
    if (!isModeEnabled(setup.mode)) return { ...setup, mode: ENABLED_MODES[0] };
    return setup;
  } catch {
    return null;
  }
}
