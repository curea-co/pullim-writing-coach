// Pullim Writing Coach — 개요 모드 정적 질문 풀 (물결2, 순수 모듈).
//   불변식: 질문은 '개요 골격을 끌어내는 물음'만 — 답·예시·완성문장·처방적 연결어 템플릿 금지.
//   ('먼저 X 그다음 Y 순서대로' 같은 떠먹이기 금지. 끌어내기만.)
//   scripts/outline-prompts.test.mjs 가드 테스트가 머지 게이트.
//   동적 서버 질문 생성은 별도 슬라이스 예정. genre 인자는 후속 장르별 분기 seam(v1은 동일 풀).

import type { AreaName } from "../data/samples";
import { AREAS } from "./grading";

export const OUTLINE_QUESTIONS: Record<AreaName, readonly string[]> = {
  "과제 이해": [
    "이 글에서 꼭 다뤄야 하는 핵심 내용이 뭐라고 생각해?",
    "과제가 너한테 진짜로 묻는 게 뭔지 한 문장으로 말할 수 있어?",
  ],
  "내용 충실도": [
    "네가 제일 자신 있는 부분은 어디에 둘래?",
    "이 글에서 꼭 넣고 싶은 생각이나 사실이 있어?",
  ],
  "구조·논리": [
    "이 글에서 핵심 기둥이 될 내용은 뭐야?",
    "글의 뼈대를 크게 몇 덩어리로 나눌 수 있을 것 같아?",
  ],
  "표현·문장": [
    "글의 첫 문장에서 독자에게 어떤 느낌을 주고 싶어?",
    "이 글에서 네 목소리가 가장 잘 드러나야 할 부분은 어디야?",
  ],
  "성장 가능성": [
    "이번 글에서 지난번보다 더 잘 해보고 싶은 게 있어?",
    "글을 다 쓴 뒤에 스스로 꼭 확인하고 싶은 게 뭐야?",
  ],
};

// 영역별 첫 질문 1개씩, AREAS 권위 순서로. genre는 후속 확장용(현재 미사용).
export function outlinePromptsFor(_genre: string): { area: AreaName; question: string }[] {
  return AREAS.map((area) => ({ area, question: OUTLINE_QUESTIONS[area][0] }));
}
