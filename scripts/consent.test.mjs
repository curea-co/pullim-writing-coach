// 동의 상태 모델 테스트 (EPIC 6). 순수 모듈을 번들 없이 직접 import.
// 실행: node --import ./scripts/register-ts.mjs --test scripts/consent.test.mjs
// 회귀 고정: ★불변식 mayUseForAiTraining(옵트인 없으면 false), canUseService 보호자 분기, describeRequired.

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  canUseService,
  describeRequired,
  emptyConsent,
  mayUseForAiTraining,
} from "../app/lib/consent.ts";

const TS = "2026-06-09T00:00:00+09:00";

const state = (over = {}) => ({ ...emptyConsent(), ...over });

// ── ★불변식: AI 학습은 별도 옵트인 없으면 절대 false (스캐터랩 선례) ──

test("mayUseForAiTraining: 기본/빈 상태 = false", () => {
  assert.equal(mayUseForAiTraining(emptyConsent()), false);
});

test("mayUseForAiTraining: 서비스·보호자 동의가 있어도 옵트인 없으면 false", () => {
  assert.equal(
    mayUseForAiTraining(state({ serviceConsentAt: TS, guardianConsentAt: TS })),
    false,
  );
});

test("mayUseForAiTraining: 옵트인 타임스탬프가 있을 때만 true", () => {
  assert.equal(mayUseForAiTraining(state({ aiTrainingOptInAt: TS })), true);
});

test("mayUseForAiTraining: 빈 문자열 옵트인은 false(미설정 취급)", () => {
  assert.equal(mayUseForAiTraining(state({ aiTrainingOptInAt: "   " })), false);
});

// ── canUseService: 서비스 동의 + (보호자 트랙이면) 보호자 동의 ──

test("canUseService: 서비스 동의 없으면 false", () => {
  assert.equal(canUseService(emptyConsent(), "고3"), false);
});

test("canUseService: 만14+(중2)는 서비스 동의만으로 가능", () => {
  assert.equal(canUseService(state({ serviceConsentAt: TS }), "중2"), true);
  assert.equal(canUseService(state({ serviceConsentAt: TS }), "고3"), true);
});

test("canUseService: 중1(보호자 트랙)은 보호자 동의 없으면 false", () => {
  assert.equal(canUseService(state({ serviceConsentAt: TS }), "중1"), false);
});

test("canUseService: 중1은 서비스+보호자 동의 모두 있으면 true", () => {
  assert.equal(
    canUseService(state({ serviceConsentAt: TS, guardianConsentAt: TS }), "중1"),
    true,
  );
});

test("canUseService: 미지 학년(보수적 보호자 트랙)도 보호자 동의 필요", () => {
  assert.equal(canUseService(state({ serviceConsentAt: TS }), "초6"), false);
  assert.equal(
    canUseService(state({ serviceConsentAt: TS, guardianConsentAt: TS }), "초6"),
    true,
  );
});

// ── describeRequired: 아직 필요한 동의의 한국어 목록 ──

test("describeRequired: 빈 상태 고3 → 서비스 동의 1건", () => {
  const req = describeRequired(emptyConsent(), "고3");
  assert.equal(req.length, 1);
  assert.ok(req[0].includes("서비스"));
});

test("describeRequired: 빈 상태 중1 → 서비스 + 보호자 2건", () => {
  const req = describeRequired(emptyConsent(), "중1");
  assert.equal(req.length, 2);
  assert.ok(req.some((m) => m.includes("보호자")));
});

test("describeRequired: 중1 서비스만 받음 → 보호자 동의만 남음", () => {
  const req = describeRequired(state({ serviceConsentAt: TS }), "중1");
  assert.deepEqual(req, ["만 14세 미만은 법정대리인(보호자)의 동의가 필요해요."]);
});

test("describeRequired: 모든 필수 동의 완료 → 빈 배열", () => {
  const req = describeRequired(
    state({ serviceConsentAt: TS, guardianConsentAt: TS }),
    "중1",
  );
  assert.deepEqual(req, []);
});

test("describeRequired: AI 학습 옵트인은 필수 목록에 넣지 않는다(선택)", () => {
  const req = describeRequired(state({ serviceConsentAt: TS }), "고3");
  assert.deepEqual(req, []);
});
