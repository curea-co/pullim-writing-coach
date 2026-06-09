// Pullim Writing Coach — EPIC5 교사 무료 도구: 커스텀 루브릭 (순수 모듈)
//
// 분배 쐐기(distribution wedge): 교사가 "내 채점 기준"을 등록하면, 코치가 그 기준에 맞춰
//   질문·코칭을 정렬한다. **채점 자동화가 아니다** — 점수를 매기는 도구가 아니라, 학생이
//   직접 고쳐 쓰도록 끌어내는 코치를 교사 기준에 맞추는 입력일 뿐이다.
//
// 모듈 경계(grading.ts §9 S4와 동일): 이 파일은 **순수**다. server-only·fetch·next/*·React를
//   import하지 않는다. 5영역 권위 순서는 grading.ts의 AREAS를 단일 소스로 재사용한다.
//   → 교사 화면(클라)·노드 테스트가 번들 없이 그대로 import한다. 저장(localStorage)은 화면이 전담.

import type { AreaName } from "../data/scoring";
import { AREAS } from "./grading";

// 교사가 등록하는 루브릭. perArea는 5영역(AREAS 순서) 각각에 대한 교사의 채점 기준 문장.
//   점수·배점이 아니라 "이 영역에서 내가 무엇을 본다"의 서술(코치가 질문으로 번역).
export type TeacherRubric = {
  title: string;
  perArea: { area: AreaName; criterion: string }[];
};

// 빈 루브릭 — AREAS 순서로 초기화(criterion 공백). 교사 화면의 초기 상태.
export function emptyTeacherRubric(): TeacherRubric {
  return {
    title: "",
    perArea: AREAS.map((area) => ({ area, criterion: "" })),
  };
}

// 검증 — 위반/경고 메시지 목록 반환(빈 배열 = 통과). 부분 허용(criterion 일부 비어도 저장 가능).
//   불변식:
//     1) title 비면 위반(필수) — 어느 과제·반의 기준인지 식별해야 코치 프롬프트가 맥락을 잡는다.
//     2) perArea는 5영역을 AREAS 순서대로 정확히 1개씩 가져야 함(순서·누락 위반).
//   권장(경고):
//     3) criterion이 하나도 안 채워졌으면 "코치가 정렬할 기준이 없다"는 경고(저장은 허용).
export function validateTeacherRubric(r: TeacherRubric): string[] {
  const errs: string[] = [];

  if (typeof r?.title !== "string" || !r.title.trim()) {
    errs.push("제목을 입력해 주세요. (어느 과제·반의 기준인지 알려 주세요)");
  }

  const per = Array.isArray(r?.perArea) ? r.perArea : [];
  if (per.length !== AREAS.length) {
    errs.push(`평가 영역은 ${AREAS.length}개여야 해요. (현재 ${per.length}개)`);
  } else {
    AREAS.forEach((area, i) => {
      const row = per[i];
      if (!row || row.area !== area) {
        errs.push(`영역 순서가 올바르지 않아요. [${i}] ${String(row?.area)} (기대: ${area})`);
      }
    });
  }

  // 부분 허용: criterion 비공백은 "권장"이되, 전부 비면 경고(코치가 정렬할 기준 없음).
  const filled = per.filter((row) => typeof row?.criterion === "string" && row.criterion.trim());
  if (per.length > 0 && filled.length === 0) {
    errs.push("영역별 기준을 한 곳 이상 채우면 코치가 그 기준에 맞춰 질문해요.");
  }

  return errs;
}

// 코치 프롬프트에 주입 가능한 텍스트로 직렬화.
//   채점 자동화가 아니라 "코칭 정렬"이므로, 점수 지시가 아니라 '교사 기준에 맞춰 질문하라'는 맥락을
//   준다. criterion이 빈 영역은 건너뛴다(교사가 채운 것만 기준으로 삼는다).
export function serializeRubricForPrompt(r: TeacherRubric): string {
  const title = typeof r?.title === "string" ? r.title.trim() : "";
  const per = Array.isArray(r?.perArea) ? r.perArea : [];
  const lines = per
    .filter((row) => typeof row?.criterion === "string" && row.criterion.trim())
    .map((row) => `- ${row.area}: ${row.criterion.trim()}`);

  if (lines.length === 0) {
    // 채운 기준이 없으면 주입할 게 없다 — 호출부가 빈 문자열로 분기(기본 코칭).
    return "";
  }

  const header = title
    ? `교사가 등록한 채점 기준("${title}")에 맞춰 코칭하세요.`
    : "교사가 등록한 채점 기준에 맞춰 코칭하세요.";

  return [
    header,
    "각 영역에서 아래 기준을 학생이 스스로 충족하도록 유도질문으로 끌어내세요. 점수를 매기거나 문장을 대신 쓰지 마세요.",
    ...lines,
  ].join("\n");
}
