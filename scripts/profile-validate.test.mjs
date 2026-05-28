// ProfileForm 검증 로직 단위 테스트 (A2 디자인 결정 2026-05-28).
// 실행: node --import ./scripts/register-ts.mjs --test scripts/profile-validate.test.mjs

import assert from "node:assert/strict";
import { test } from "node:test";
import { validateProfileDraft } from "../app/lib/profile-validate.ts";

const VALID = {
  nickname: "선혜",
  school_level: "중2",
  primary_subject: "국어",
};

// ── nickname (필수) ─────────────────────────────────────
test("nickname 누락 → 에러", () => {
  const errs = validateProfileDraft({ school_level: "중2", primary_subject: "국어" }, "onboarding", true);
  assert.equal(errs.nickname, "닉네임을 입력해 주세요");
});

test("nickname 공백만 → 에러", () => {
  const errs = validateProfileDraft({ ...VALID, nickname: "   " }, "onboarding", true);
  assert.equal(errs.nickname, "닉네임을 입력해 주세요");
});

test("nickname 12자 초과 → 에러", () => {
  const errs = validateProfileDraft(
    { ...VALID, nickname: "가나다라마바사아자차카타파" }, // 13자
    "onboarding",
    true,
  );
  assert.equal(errs.nickname, "12자까지 입력할 수 있어요");
});

test("nickname 12자 OK", () => {
  const errs = validateProfileDraft(
    { ...VALID, nickname: "가나다라마바사아자차카타" }, // 12자
    "onboarding",
    true,
  );
  assert.equal(errs.nickname, undefined);
});

// ── school_level / primary_subject (필수) ───────────────
test("school_level 누락 → 에러", () => {
  const errs = validateProfileDraft({ nickname: "선혜", primary_subject: "국어" }, "onboarding", true);
  assert.equal(errs.school_level, "학년을 골라주세요");
});

test("primary_subject 누락 → 에러", () => {
  const errs = validateProfileDraft({ nickname: "선혜", school_level: "중2" }, "onboarding", true);
  assert.equal(errs.primary_subject, "과목을 골라주세요");
});

// ── 기타 자유 입력 ──────────────────────────────────────
test('primary_subject = "기타" + other 누락 → 에러', () => {
  const errs = validateProfileDraft(
    { ...VALID, primary_subject: "기타" },
    "onboarding",
    true,
  );
  assert.equal(errs.primary_subject_other, "과목을 직접 적어 주세요");
});

test('primary_subject = "기타" + other 공백만 → 에러', () => {
  const errs = validateProfileDraft(
    { ...VALID, primary_subject: "기타", primary_subject_other: "   " },
    "onboarding",
    true,
  );
  assert.equal(errs.primary_subject_other, "과목을 직접 적어 주세요");
});

test('primary_subject = "기타" + other 20자 초과 → 에러', () => {
  const errs = validateProfileDraft(
    {
      ...VALID,
      primary_subject: "기타",
      primary_subject_other: "가나다라마바사아자차카타파하갸냐댜랴먀뱌샤", // 21자
    },
    "onboarding",
    true,
  );
  assert.equal(errs.primary_subject_other, "20자까지 입력할 수 있어요");
});

test('primary_subject = "기타" + other 정상 OK', () => {
  const errs = validateProfileDraft(
    { ...VALID, primary_subject: "기타", primary_subject_other: "정보" },
    "onboarding",
    true,
  );
  assert.equal(errs.primary_subject_other, undefined);
});

test('primary_subject ≠ "기타"이면 other 검증 안 함', () => {
  const errs = validateProfileDraft(
    { ...VALID, primary_subject: "국어", primary_subject_other: "남아있는 값" },
    "onboarding",
    true,
  );
  assert.equal(errs.primary_subject_other, undefined);
});

// ── school_name (선택, 입력 시 길이만) ─────────────────
test("school_name 비어있으면 검증 안 함", () => {
  const errs = validateProfileDraft(VALID, "onboarding", true);
  assert.equal(errs.school_name, undefined);
});

test("school_name 30자 초과 → 에러", () => {
  const errs = validateProfileDraft(
    { ...VALID, school_name: "ㄱ".repeat(31) },
    "onboarding",
    true,
  );
  assert.equal(errs.school_name, "30자까지 입력할 수 있어요");
});

// ── consent ─────────────────────────────────────────────
test("onboarding + consent 안 함 → 에러", () => {
  const errs = validateProfileDraft(VALID, "onboarding", false);
  assert.equal(errs.consent, "내용을 확인하고 동의해 주세요");
});

test("onboarding + consent OK → consent 에러 없음", () => {
  const errs = validateProfileDraft(VALID, "onboarding", true);
  assert.equal(errs.consent, undefined);
});

test("edit 모드 + consent false여도 에러 없음 (이미 동의됨)", () => {
  const errs = validateProfileDraft(VALID, "edit", false);
  assert.equal(errs.consent, undefined);
});

// ── happy path ──────────────────────────────────────────
test("필수 모두 + consent → 에러 0개", () => {
  const errs = validateProfileDraft(VALID, "onboarding", true);
  assert.deepEqual(errs, {});
});

test("필수 + 선택 + 기타 → 에러 0개", () => {
  const errs = validateProfileDraft(
    {
      nickname: "선혜",
      school_name: "○○고등학교",
      school_level: "고2",
      primary_subject: "기타",
      primary_subject_other: "정보",
      frequent_genre: "보고서",
    },
    "onboarding",
    true,
  );
  assert.deepEqual(errs, {});
});
