// #4 왜 이 점수 — 5영역 루브릭 정의 + 구간표 (rubric v.5 §3 derived).
//   백엔드 응답에 영역별 채점 근거 데이터가 없어 "왜 이 점수?"의 답은
//   (a) 영역이 평가하는 것 + (b) 4구간 anchor + 현재 위치, 두 축으로 구성.
//   학생/교사가 절대 점수가 아닌 "어디쯤"의 frame을 잡도록 돕는다(#19와 짝).
//
//   순수 모듈 — "use client" 무관, 서버·클라 모두 import 가능, 단위 테스트 가능.

import type { AreaName } from "../data/scoring";

// 영역별 평가 의도 — rubric §3.1~§3.5 핵심 1~2문장으로 압축.
//   "학생이 읽고 다음 행동을 알 수 있는" 카피 톤 (PM 메모 § 표기 사용 X — #15 후속).
export const AREA_CRITERIA: Record<AreaName, { sectionRef: string; meaning: string }> = {
  "과제 이해": {
    sectionRef: "§3.1",
    meaning:
      "과제가 묻는 핵심에 답했는지, 분량·장르(설명문/논설문 등) 요건을 지켰는지를 봐요.",
  },
  "내용 충실도": {
    sectionRef: "§3.2",
    meaning:
      "근거·사례가 구체적이고 다양한지, 같은 말 반복 없이 새 정보가 이어지는지를 봐요.",
  },
  "구조·논리": {
    sectionRef: "§3.3",
    meaning:
      "도입·전개·결론 흐름이 자연스러운지, 단락 구분과 논리 연결이 또렷한지를 봐요.",
  },
  "표현·문장": {
    sectionRef: "§3.4",
    meaning:
      "(A) 맞춤법·문장 오류와 (B) 어휘 다양성·문장 성숙도를 함께 봐요.",
  },
  "성장 가능성": {
    sectionRef: "§3.5",
    meaning:
      "1~2회 수정으로 점수가 오를 만한 토대가 있는지, 약점이 한두 곳에 모여 있는지를 봐요.",
  },
};

// 영역 점수 4구간 — rubric §2 anchor (max=20 기준 5~20).
//   labels는 fe-styling 시맨틱 톤(주의/보통/양호/우수)으로 mapping.
export type ScoreBand = {
  min: number;
  max: number;
  label: string; // "미흡" | "보통" | "양호" | "우수"
  description: string; // 학생용 1줄 설명
};

export const SCORE_BANDS: ScoreBand[] = [
  { min: 18, max: 20, label: "우수", description: "이 영역만 보면 거의 완성." },
  { min: 15, max: 17, label: "양호", description: "약점 1~2곳만 짚으면 우수로." },
  { min: 10, max: 14, label: "보통", description: "토대는 있고 보강 여지가 큰 구간." },
  { min: 5, max: 9, label: "미흡", description: "한 곳보다 두세 곳을 함께 손봐야 해요." },
];

// 점수 → 구간 lookup. 0~4는 미흡으로 합산(rubric은 5~20 anchor만 정의).
export function getScoreBand(score: number): ScoreBand {
  for (const band of SCORE_BANDS) {
    if (score >= band.min && score <= band.max) return band;
  }
  // 0~4 폴백 — 미흡 구간으로 표시(데이터 이상치 방어).
  return SCORE_BANDS[SCORE_BANDS.length - 1];
}
