"use client";
// Pullim Writing Coach — 동의 상태 localStorage 어댑터 (EPIC 6 배선, 유닛 B)
//
// 모듈 경계: 브라우저 전용(typeof window 가드). consent.ts(순수 모델)를 LS에 영속화하는
//   얇은 래퍼다. ★ 타임스탬프는 직접 생성하지 않는다 — 호출부("use client" 컴포넌트)가
//   consentNow()로 만들어 주입한다(순수성·재현성 규약, consent.ts·age-policy.ts와 동일).
//
// 키 = 'pwc-consent-v1' (공유 계약). 값 = ConsentState 그대로(serviceConsentAt·
//   aiTrainingOptInAt·guardianConsentAt, 각 ISO 문자열 또는 null).
//
// 불변식 보존: AI 학습 옵트인은 서비스 동의와 분리·기본 OFF. setAiTrainingOptIn(false)는
//   aiTrainingOptInAt을 null로 되돌려(철회) mayUseForAiTraining이 다시 false가 되게 한다.

import {
  emptyConsent,
  type ConsentState,
} from "./consent";

const CONSENT_KEY = "pwc-consent-v1";

// 런타임 type guard — 다른 탭 손상·schema 변경에도 안전(storage.ts isProfile 패턴).
//   각 필드는 string|null만 허용. 누락/타입 불일치 시 false → load가 emptyConsent로 폴백.
export function isConsentState(v: unknown): v is ConsentState {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  for (const k of ["serviceConsentAt", "aiTrainingOptInAt", "guardianConsentAt"] as const) {
    const val = o[k];
    if (val !== null && typeof val !== "string") return false;
  }
  return true;
}

// LS에서 로드. 미존재·손상·SSR → emptyConsent()(기본 OFF 상태).
export function loadConsent(): ConsentState {
  if (typeof window === "undefined") return emptyConsent();
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return emptyConsent();
    const parsed = JSON.parse(raw);
    return isConsentState(parsed) ? parsed : emptyConsent();
  } catch {
    return emptyConsent();
  }
}

export function saveConsent(
  state: ConsentState,
): { ok: true } | { ok: false; reason: "quota" | "denied" | "invalid" } {
  if (typeof window === "undefined") return { ok: false, reason: "denied" };
  if (!isConsentState(state)) return { ok: false, reason: "invalid" };
  try {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(state));
    return { ok: true };
  } catch (e) {
    const reason = e instanceof DOMException && e.name === "QuotaExceededError" ? "quota" : "denied";
    return { ok: false, reason };
  }
}

export function clearConsent(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CONSENT_KEY);
  } catch {
    /* swallow — clear 실패는 사용자에게 의미 없음 */
  }
}

// ── 필드 단위 토글 헬퍼 — 타임스탬프는 반드시 호출부가 주입(now 인자) ──────────
//   accepted=true → now 기록, accepted=false → null로 철회. (불변식: 기본/철회 = null)

export function setServiceConsent(
  prev: ConsentState,
  accepted: boolean,
  now: string,
): ConsentState {
  return { ...prev, serviceConsentAt: accepted ? now : null };
}

export function setGuardianConsent(
  prev: ConsentState,
  accepted: boolean,
  now: string,
): ConsentState {
  return { ...prev, guardianConsentAt: accepted ? now : null };
}

// ★ AI 학습 별도 옵트인. accepted=false면 철회(null) → mayUseForAiTraining 다시 false.
export function setAiTrainingOptIn(
  prev: ConsentState,
  accepted: boolean,
  now: string,
): ConsentState {
  return { ...prev, aiTrainingOptInAt: accepted ? now : null };
}
