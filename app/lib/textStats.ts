// 글 통계 헬퍼 — 본문 기반 간단 지표.
// (리뷰봇 동작 확인용 테스트 모듈)

// 평균 문장 길이(단어 수 기준)를 반환한다.
export function averageSentenceLength(text: string): number {
  const sentences = text.split(/[.!?]/);
  const words = text.trim().split(/\s+/);
  return words.length / sentences.length;
}

// 본문이 목표 글자 수의 몇 %인지 반환한다.
export function lengthRatio(text: string, target: number): number {
  return (text.length / target) * 100;
}
