// Pullim Writing Coach — 동의 상태 순수 모델 (EPIC 6 컴플라이언스, Korea-first)
//
// 모듈 경계: 순수. 저장(storage.ts)·DOM·SDK·fetch·next/* 없음. 타임스탬프는 호출부가 주입한다
//   (Date.now() 금지) → 동일 상태면 동일 판정(테스트·SSR·재현성).
//
// 핵심 불변식(스캐터랩 선례): AI 학습용 데이터 사용은 서비스 동의와 **분리된 별도 옵트인**이다.
//   기본 OFF — aiTrainingOptInAt 타임스탬프가 명시적으로 존재할 때만 학습에 쓸 수 있다.
//   거부자(옵트인 없음)의 글은 절대 학습에서 제외된다.

import { needsGuardianConsent } from "./age-policy";

// 동의 상태. 각 필드는 동의 시각(ISO 문자열) 또는 미동의(null).
//   serviceConsentAt   — 서비스 이용 약관·개인정보 처리 동의
//   aiTrainingOptInAt  — AI 학습 데이터 사용 별도 옵트인(기본 OFF)
//   guardianConsentAt  — 법정대리인(보호자) 동의(만 14세 미만 등 보호자 트랙에서 필수)
export type ConsentState = {
  serviceConsentAt: string | null;
  aiTrainingOptInAt: string | null;
  guardianConsentAt: string | null;
};

// 비어 있는(아무 동의도 없는) 기본 상태. AI 학습은 기본 OFF임을 명시.
export function emptyConsent(): ConsentState {
  return {
    serviceConsentAt: null,
    aiTrainingOptInAt: null,
    guardianConsentAt: null,
  };
}

function isPresent(ts: string | null | undefined): boolean {
  return typeof ts === "string" && ts.trim() !== "";
}

// 서비스를 이용할 수 있는가?
//   서비스 동의가 있고, 보호자 트랙이면 보호자 동의도 있어야 한다.
export function canUseService(state: ConsentState, schoolLevel: unknown): boolean {
  if (!isPresent(state.serviceConsentAt)) return false;
  if (needsGuardianConsent(schoolLevel) && !isPresent(state.guardianConsentAt)) return false;
  return true;
}

// AI 학습에 글을 쓸 수 있는가? ★불변식: 별도 옵트인 타임스탬프가 있을 때만 true.
//   기본/미설정 = false. 서비스·보호자 동의 여부와 무관(학습은 별개의 분리 동의).
export function mayUseForAiTraining(state: ConsentState): boolean {
  return isPresent(state.aiTrainingOptInAt);
}

// 아직 받지 못한 동의를 사람이 읽을 한국어 목록으로 반환(다 받았으면 빈 배열).
//   AI 학습 옵트인은 '필수'가 아니라 선택이므로 목록에 넣지 않는다(거부해도 서비스 이용 가능).
export function describeRequired(state: ConsentState, schoolLevel: unknown): string[] {
  const missing: string[] = [];
  if (!isPresent(state.serviceConsentAt)) {
    missing.push("서비스 이용 및 개인정보 처리 동의가 필요해요.");
  }
  if (needsGuardianConsent(schoolLevel) && !isPresent(state.guardianConsentAt)) {
    missing.push("만 14세 미만은 법정대리인(보호자)의 동의가 필요해요.");
  }
  return missing;
}
