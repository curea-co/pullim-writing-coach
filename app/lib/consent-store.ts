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
// consent도 계정 귀속(스펙 PII (1)) — storage 어댑터가 account/local 라우팅 담당.
//   storage는 raw payload만 read/write/clear 하고, 검증·폴백·토글은 여기서 적용(관심사 분리).
import { loadConsentData, saveConsentData, clearConsentData } from "./storage";

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

// 로드. account면 GET /api/data/consent, 아니면 LS. 미존재·손상·SSR → emptyConsent()(기본 OFF).
export async function loadConsent(): Promise<ConsentState> {
  const parsed = await loadConsentData();
  return isConsentState(parsed) ? parsed : emptyConsent();
}

export async function saveConsent(
  state: ConsentState,
): Promise<{ ok: true } | { ok: false; reason: "quota" | "denied" | "invalid" | "auth" }> {
  if (!isConsentState(state)) return { ok: false, reason: "invalid" };
  const r = await saveConsentData(state);
  return r.ok ? { ok: true } : { ok: false, reason: r.reason ?? "denied" };
}

export async function clearConsent(): Promise<void> {
  await clearConsentData();
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
