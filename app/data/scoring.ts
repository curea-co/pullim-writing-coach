// Pullim Writing Coach — 채점 결과 타입 + 표시 헬퍼 (SAMPLES 데이터와 분리)
//
// 이 모듈은 **무거운 SAMPLES(본문·피드백) 상수를 포함하지 않는다.** 그래서 클라이언트 컴포넌트
// (ResultView·ScoreForm)가 여기서 타입·색상/구간 헬퍼만 가져와도 전역 번들에 샘플 본문이 실리지
// 않는다(curea-review-ai 지적). 데이터(SAMPLES·getSample)는 data/samples.ts(서버 전용 소비)에 둔다.

export type AreaName =
  | "과제 이해"
  | "내용 충실도"
  | "구조·논리"
  | "표현·문장"
  | "성장 가능성";

export type Score = {
  area: AreaName;
  score: number;
  max: 20;
  feedback_good: string;
  feedback_fix: string;
};

export type RevisionGuide = {
  priority: number;
  action: string;
  reason: string;
};

export type Assignment = {
  school_level: string;
  subject: string;
  genre: string;
  target_char_count: number | null;
  prompt_text: string;
};

export type Submission = {
  body: string;
  char_count: number;
};

export type F3Output = {
  total_score: number;
  scores: Score[];
  revision_guides: RevisionGuide[];
  meta: {
    model_version: string;
    generated_at: string;
    is_verified: boolean;
    disclaimer: string;
  };
};

export type Category = "상" | "중상" | "중" | "중하" | "하";

export type Sample = {
  id: string;
  label: string; // A, B, C, D, E
  category: Category;
  title: string;
  // 내부 PM/루브릭 메모(§ 표기 등) — 학생/교사 화면에는 노출하지 않음.
  //   2026-05-29 학생용 카피에서 § 인용을 제거(샘플 E 시작) → 옵셔널로 격하.
  intent?: string;
  assignment: Assignment;
  submission: Submission;
  output: F3Output;
};

// 총점 해석 구간 (rubric v.5 §4). textClass는 시맨틱 토큰 기반(fe-styling).
export function getTotalScoreBand(total: number): {
  label: string;
  message: string;
  textClass: string;
} {
  if (total >= 90)
    return {
      label: "완성 단계",
      message: "마무리 다듬기만 하면 제출할 수 있어요.",
      textClass: "text-band-good-foreground",
    };
  if (total >= 75)
    return {
      label: "보완하면 좋은 글",
      message: "한두 영역만 손보면 확실히 좋아져요.",
      textClass: "text-band-good-foreground",
    };
  if (total >= 55)
    return {
      label: "기본 토대는 있음",
      message: "2~3개 영역을 함께 보완해 보세요.",
      textClass: "text-band-normal-foreground",
    };
  if (total >= 35)
    return {
      label: "토대 보강 필요",
      message: "과제 이해·내용부터 다시 살펴보세요.",
      textClass: "text-band-warn-foreground",
    };
  return {
    label: "다시 쓰기 권장",
    message: "과제 조건을 확인하고 새로 시작해 보세요.",
    textClass: "text-band-warn-foreground",
  };
}

// 영역별 색상 가이드 (rubric v.5 §2.2). 시맨틱 밴드 토큰 사용(fe-styling).
export function getScoreColor(score: number): {
  bar: string;
  text: string;
  band: "주의" | "보통" | "양호";
} {
  if (score >= 15)
    return {
      bar: "bg-band-good",
      text: "text-band-good-foreground",
      band: "양호",
    };
  if (score >= 10)
    return {
      bar: "bg-band-normal",
      text: "text-band-normal-foreground",
      band: "보통",
    };
  return {
    bar: "bg-band-warn",
    text: "text-band-warn-foreground",
    band: "주의",
  };
}

// 영역 편차 6점 이상 검사 (functional_spec v0.3 §3 F4)
export function hasLargeAreaGap(scores: { score: number }[]): boolean {
  const values = scores.map((s) => s.score);
  return Math.max(...values) - Math.min(...values) >= 6;
}
