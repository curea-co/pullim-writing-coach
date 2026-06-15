// #2 인라인 첨삭 클릭 — 영역별 피드백 카드 anchor id 헬퍼.
//   AnnotatedBody(client) → 클릭 시 scrollIntoView 대상 id 계산.
//   ResultView·FeedbackDiff(server) → 같은 id 부여.
//   server·client 양쪽이 import 가능하도록 별 모듈로 분리 ("use client" 경계 위반 방지).

export const feedbackAreaId = (areaIndex: number): string => `result-feedback-area-${areaIndex}`;
