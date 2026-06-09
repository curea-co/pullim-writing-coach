// 연령/동의 트랙 정책 테스트 (EPIC 6). 순수 모듈을 번들 없이 직접 import.
// 실행: node --import ./scripts/register-ts.mjs --test scripts/age-policy.test.mjs
// 회귀 고정: 학년→대략나이, 만14 경계(중1 보호자/under14, 중2·고3 self/14+), 미지→보수적 보호자.

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  approxAgeForSchoolLevel,
  consentTrackFor,
  needsGuardianConsent,
  SELF_CONSENT_AGE,
} from "../app/lib/age-policy.ts";

test("approxAgeForSchoolLevel: 학년→대략 만 나이(중1=13 … 고3=18)", () => {
  assert.equal(approxAgeForSchoolLevel("중1"), 13);
  assert.equal(approxAgeForSchoolLevel("중2"), 14);
  assert.equal(approxAgeForSchoolLevel("중3"), 15);
  assert.equal(approxAgeForSchoolLevel("고1"), 16);
  assert.equal(approxAgeForSchoolLevel("고2"), 17);
  assert.equal(approxAgeForSchoolLevel("고3"), 18);
});

test("approxAgeForSchoolLevel: 미지/비문자열 → null", () => {
  assert.equal(approxAgeForSchoolLevel("초6"), null);
  assert.equal(approxAgeForSchoolLevel("대학"), null);
  assert.equal(approxAgeForSchoolLevel(""), null);
  assert.equal(approxAgeForSchoolLevel(null), null);
  assert.equal(approxAgeForSchoolLevel(undefined), null);
  assert.equal(approxAgeForSchoolLevel(13), null);
});

test("SELF_CONSENT_AGE는 만 14(개인정보보호법 기준)", () => {
  assert.equal(SELF_CONSENT_AGE, 14);
});

test("needsGuardianConsent: 중1(만13)만 보호자 동의 필요", () => {
  assert.equal(needsGuardianConsent("중1"), true); // under 14
});

test("needsGuardianConsent: 중2 이상(만14+)은 보호자 불필요", () => {
  assert.equal(needsGuardianConsent("중2"), false);
  assert.equal(needsGuardianConsent("중3"), false);
  assert.equal(needsGuardianConsent("고1"), false);
  assert.equal(needsGuardianConsent("고2"), false);
  assert.equal(needsGuardianConsent("고3"), false);
});

test("needsGuardianConsent: 미지 학년 → 보수적으로 true(보호자)", () => {
  assert.equal(needsGuardianConsent("초6"), true);
  assert.equal(needsGuardianConsent(null), true);
  assert.equal(needsGuardianConsent(undefined), true);
  assert.equal(needsGuardianConsent("아무거나"), true);
});

test("consentTrackFor: 중1 → guardian", () => {
  assert.equal(consentTrackFor("중1"), "guardian");
});

test("consentTrackFor: 중2·고3 → self", () => {
  assert.equal(consentTrackFor("중2"), "self");
  assert.equal(consentTrackFor("고3"), "self");
});

test("consentTrackFor: 미지 → 보수적 guardian", () => {
  assert.equal(consentTrackFor("초6"), "guardian");
  assert.equal(consentTrackFor(null), "guardian");
});
