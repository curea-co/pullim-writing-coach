// Pullim Writing Coach — 가이드 모드 정적 질문 풀 (물결1, 순수 모듈).
//   불변식: 질문은 '끌어내는 물음'만 — 답·예시·완성문장·연결어 템플릿 금지.
//   coach-schema.checkGenerationBlock 단위 테스트(scripts/guide-prompts.test.mjs)가 머지 게이트.
//   동적 서버 질문 생성은 물결2(범위 외). genre 인자는 후속 장르별 분기 seam(v1은 동일 풀).

import type { AreaName } from "../data/samples";
import { AREAS } from "./grading";

export const GUIDE_QUESTIONS: Record<AreaName, readonly string[]> = {
  "과제 이해": [
    "이 과제가 너한테 묻는 핵심은 한마디로 뭐야?",
    "과제가 요구한 것 중에 아직 안 다룬 게 있을까?",
  ],
  "내용 충실도": [
    "그렇게 생각하는 이유를 하나만 더 댈 수 있어?",
    "읽는 사람이 '왜?'라고 물으면 뭐라고 답할래?",
  ],
  "구조·논리": [
    "이 문단과 다음 문단은 어떻게 이어진다고 보면 될까?",
    "가장 먼저 말하고 싶은 건 무엇이고, 마지막에 남길 건 뭐야?",
  ],
  "표현·문장": [
    "이 문장을 소리 내어 읽으면 어디서 숨이 막혀?",
    "같은 말을 네 식대로 다르게 표현하면 어떻게 될까?",
  ],
  "성장 가능성": [
    "딱 한 군데만 고친다면 어디를 손보고 싶어?",
    "지금 글에서 네가 제일 마음에 드는 부분은 어디야?",
  ],
};

// 영역별 첫 질문 1개씩, AREAS 권위 순서로. genre는 후속 확장용(현재 미사용).
export function guideQuestionsFor(_genre: string): { area: AreaName; question: string }[] {
  return AREAS.map((area) => ({ area, question: GUIDE_QUESTIONS[area][0] }));
}
