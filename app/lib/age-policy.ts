// Pullim Writing Coach — 연령/동의 정책 순수 모듈 (EPIC 6 컴플라이언스, Korea-first)
//
// 모듈 경계(grading.ts §9 S4와 동일): 이 파일은 **순수**다. next/*·@anthropic-ai/sdk·
//   server-only·fetch·DOM을 import하지 않는다. FE·서버·node 테스트가 그대로 import한다.
//
// 한국 기준(이미 결정): 개인정보보호법 만 14세.
//   중1≈만13 → 법정대리인(보호자) 동의 필요. 중2 이상≈만14+ → 본인 동의 가능.
//   학년-나이 매핑은 '대략'이며(생일 미수집) 보수적으로 운영한다 — 알 수 없으면 보호자 트랙.

import { SCHOOL_LEVELS } from "./grading";

// 학년 → 대략 만 나이. 한국 학제 통상값(중1=13 … 고3=18). 알 수 없으면 null.
const APPROX_AGE: Record<string, number> = {
  중1: 13,
  중2: 14,
  중3: 15,
  고1: 16,
  고2: 17,
  고3: 18,
};

// 만 14세 — 개인정보보호법상 본인 동의 가능 하한.
export const SELF_CONSENT_AGE = 14;

export type ConsentTrack = "self" | "guardian";

// 학년 문자열 → 대략 만 나이. 미정의/비문자열/미지의 학년 → null.
export function approxAgeForSchoolLevel(schoolLevel: unknown): number | null {
  if (typeof schoolLevel !== "string") return null;
  if (!(SCHOOL_LEVELS as readonly string[]).includes(schoolLevel)) return null;
  return APPROX_AGE[schoolLevel] ?? null;
}

// 법정대리인(보호자) 동의가 필요한가? 대략 만 14세 미만이면 true.
//   알 수 없으면(null) 보수적으로 true — 검증 없이 본인 동의를 허용하지 않는다.
export function needsGuardianConsent(schoolLevel: unknown): boolean {
  const age = approxAgeForSchoolLevel(schoolLevel);
  if (age === null) return true; // 보수적: 미지의 학년은 보호자 트랙
  return age < SELF_CONSENT_AGE;
}

// 적용할 동의 트랙. 만 14+ 본인(self), 그 외(만14 미만·미지)는 보호자(guardian).
export function consentTrackFor(schoolLevel: unknown): ConsentTrack {
  return needsGuardianConsent(schoolLevel) ? "guardian" : "self";
}
