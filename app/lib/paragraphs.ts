// Pullim Writing Coach — 문단 분리 순수 모듈 (구현계획 T1.3 / docs/25)
//
// 모듈 경계: 순수(부수효과·외부 import 없음). 코치가 "문단 단위로 진단"하기 위한 최소 유틸.
// 문단 규칙: grading.normalizeBody가 보존하는 \n\n(빈 줄) 구분과 동일. 문단 내 단일 줄바꿈은 보존.

export type Paragraph = { index: number; text: string };

// 본문을 문단 배열로. 빈 문단은 버리고 index를 0부터 연속 재부여.
export function splitParagraphs(body: unknown): Paragraph[] {
  if (typeof body !== "string") return [];
  return body
    .split(/\n{2,}/) // 빈 줄(2개 이상 개행) = 문단 경계
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((text, index) => ({ index, text }));
}
