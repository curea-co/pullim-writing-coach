// Pullim Writing Coach — 연령/톤 분기 config (구현계획 T1.6 / docs/25)
//
// 모듈 경계: 순수 config. 코칭 로직(coach-schema·coach-prompt·nudge-priority)은 연령에 무관하게 공유하고,
//   연령차(톤·마스코트·읽기 수준·질문 난이도)는 오직 이 config로만 분기한다 → 주니어(초등) 엔진 공유 seam.
//   결정: 중·고=담백 코치 톤(푸리 없음), 초등=주니어 마스코트 푸리(별 메모리 puri-ip-junior-icons).

export type AgeBand = "middle_high" | "junior";

export type CoachProfile = {
  ageBand: AgeBand;
  toneDirective: string; // 프롬프트에 주입할 톤 지시
  usesMascot: boolean; // 주니어=푸리, 중고=없음
  readingLevel: "middle_high" | "elementary";
};

// 학년 문자열 → 연령대. "초"=주니어, "중"/"고"=중고, 그 외는 이 제품의 기본 대상(중고).
export function getAgeBand(schoolLevel: unknown): AgeBand {
  if (typeof schoolLevel === "string" && schoolLevel.startsWith("초")) return "junior";
  return "middle_high";
}

const PROFILES: Record<AgeBand, CoachProfile> = {
  middle_high: {
    ageBand: "middle_high",
    toneDirective:
      "담백하고 존중하는 코치 톤. 과장·유아틱 표현 금지. 격려는 하되 한 번에 한 가지만 짚는다.",
    usesMascot: false,
    readingLevel: "middle_high",
  },
  junior: {
    ageBand: "junior",
    toneDirective:
      "푸리(주니어 마스코트)의 다정하고 쉬운 말투. 짧은 문장·쉬운 어휘. 한 번에 한 가지만, 칭찬 먼저.",
    usesMascot: true,
    readingLevel: "elementary",
  },
};

export function getCoachProfile(ageBand: AgeBand): CoachProfile {
  return PROFILES[ageBand];
}
