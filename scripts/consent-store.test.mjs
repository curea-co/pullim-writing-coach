// 동의 LS 어댑터 테스트 (EPIC 6 배선, 유닛 B).
// 실행: node --import ./scripts/register-ts.mjs --test scripts/consent-store.test.mjs
// 노드 환경엔 window 없음 — 최소 mock을 import 전에 주입(storage.test.mjs 패턴).
// 회귀 고정: 라운드트립, 주입 타임스탬프, 손상 폴백, ★ AI 옵트인 기본 OFF·철회 불변식.

import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

class MemoryStorage {
  data = {};
  getItem(k) {
    return Object.prototype.hasOwnProperty.call(this.data, k) ? this.data[k] : null;
  }
  setItem(k, v) {
    this.data[k] = String(v);
  }
  removeItem(k) {
    delete this.data[k];
  }
  clear() {
    this.data = {};
  }
}

const storageMock = new MemoryStorage();
globalThis.window = { localStorage: storageMock };

const {
  clearConsent,
  isConsentState,
  loadConsent,
  saveConsent,
  setAiTrainingOptIn,
  setGuardianConsent,
  setServiceConsent,
} = await import("../app/lib/consent-store.ts");
const { emptyConsent, mayUseForAiTraining } = await import("../app/lib/consent.ts");

const TS = "2026-06-09T00:00:00+09:00";
const TS2 = "2026-06-10T00:00:00+09:00";

beforeEach(() => storageMock.clear());

// ── isConsentState ───────────────────────────────────────────
test("isConsentState — happy(빈 상태)", () => {
  assert.equal(isConsentState(emptyConsent()), true);
});

test("isConsentState — string 타임스탬프 허용", () => {
  assert.equal(
    isConsentState({ serviceConsentAt: TS, aiTrainingOptInAt: null, guardianConsentAt: TS }),
    true,
  );
});

test("isConsentState — 숫자/객체 필드 거부", () => {
  assert.equal(isConsentState({ serviceConsentAt: 123, aiTrainingOptInAt: null, guardianConsentAt: null }), false);
  assert.equal(isConsentState(null), false);
  assert.equal(isConsentState("nope"), false);
});

// ── 라운드트립 ────────────────────────────────────────────────
test("미존재 키 → emptyConsent 폴백", async () => {
  assert.deepEqual(await loadConsent(), emptyConsent());
});

test("save → load 라운드트립", async () => {
  const state = { serviceConsentAt: TS, aiTrainingOptInAt: null, guardianConsentAt: TS };
  assert.deepEqual(await saveConsent(state), { ok: true });
  assert.deepEqual(await loadConsent(), state);
});

test("키 = 'pwc-consent-v1' (공유 계약)", async () => {
  await saveConsent(emptyConsent());
  assert.ok(storageMock.getItem("pwc-consent-v1") !== null);
});

test("손상 JSON → emptyConsent 폴백", async () => {
  storageMock.setItem("pwc-consent-v1", "{ broken");
  assert.deepEqual(await loadConsent(), emptyConsent());
});

test("schema 손상(숫자 필드) → emptyConsent 폴백", async () => {
  storageMock.setItem("pwc-consent-v1", JSON.stringify({ serviceConsentAt: 1 }));
  assert.deepEqual(await loadConsent(), emptyConsent());
});

test("clearConsent → 다시 emptyConsent", async () => {
  await saveConsent({ serviceConsentAt: TS, aiTrainingOptInAt: TS, guardianConsentAt: null });
  await clearConsent();
  assert.deepEqual(await loadConsent(), emptyConsent());
});

// ── 필드 토글 헬퍼: 타임스탬프 주입(시각 직접 생성 금지) ──────────────
test("setServiceConsent: accept=true는 주입 타임스탬프, false는 null", () => {
  const a = setServiceConsent(emptyConsent(), true, TS);
  assert.equal(a.serviceConsentAt, TS);
  const b = setServiceConsent(a, false, TS2);
  assert.equal(b.serviceConsentAt, null);
});

test("setGuardianConsent: 다른 필드 보존(가산적)", () => {
  const base = setServiceConsent(emptyConsent(), true, TS);
  const out = setGuardianConsent(base, true, TS2);
  assert.equal(out.serviceConsentAt, TS); // 보존
  assert.equal(out.guardianConsentAt, TS2);
});

// ── ★ AI 학습 옵트인 불변식: 기본 OFF, 명시 동의 시만 ON, 철회=null ──────
test("AI 옵트인 기본 OFF — emptyConsent는 mayUseForAiTraining false", async () => {
  assert.equal(mayUseForAiTraining(await loadConsent()), false);
});

test("setAiTrainingOptIn(true) → mayUseForAiTraining true (영속 후에도)", async () => {
  const on = setAiTrainingOptIn(emptyConsent(), true, TS);
  await saveConsent(on);
  assert.equal(mayUseForAiTraining(await loadConsent()), true);
});

test("setAiTrainingOptIn(false) 철회 → null → mayUseForAiTraining 다시 false", async () => {
  let s = setAiTrainingOptIn(emptyConsent(), true, TS);
  s = setAiTrainingOptIn(s, false, TS2);
  assert.equal(s.aiTrainingOptInAt, null);
  await saveConsent(s);
  assert.equal(mayUseForAiTraining(await loadConsent()), false);
});

test("AI 옵트인은 서비스/보호자 동의와 독립(분리)", () => {
  let s = setServiceConsent(emptyConsent(), true, TS);
  s = setGuardianConsent(s, true, TS);
  // 서비스·보호자 동의가 있어도 옵트인 없으면 false.
  assert.equal(mayUseForAiTraining(s), false);
});
