// /api/coach request 검증 단위 테스트 (Wave2 Slice 1).
//   node --import ./scripts/register-ts.mjs --test scripts/coach-request.test.mjs
//   선례: scripts/extract-route-helpers.test.mjs (동일 패턴)

import assert from "node:assert/strict";
import { test } from "node:test";

const { validateCoachRequest } = await import("../app/api/coach/request.ts");

// 유효한 최소 요청 팩토리.
function makeRaw({ mode, bodyOverride, schoolOverride } = {}) {
  const body = {
    assignment: {
      school_level: schoolOverride ?? "중2",
      subject: "국어",
      genre: "논설문·주장하는 글",
      prompt_text: "학교 급식에 대해 의견을 써 보세요.",
    },
    submission: { body: bodyOverride ?? "학교 급식은 매우 중요합니다. 왜냐하면 학생들의 건강과 성장에 직접적인 영향을 미치기 때문입니다." },
  };
  if (mode !== undefined) body.mode = mode;
  return body;
}

// ── case 1: mode 미전송 → value.mode === "free" (하위호환 폴백) ──────────────
test("mode 미전송 → value.mode === 'free' (폴백 기본값)", () => {
  const result = validateCoachRequest(makeRaw());
  assert.equal(result.ok, true);
  assert.equal(result.value.mode, "free");
});

test("mode 미전송 → assignment/rubricText/draft 형태 회귀 가드", () => {
  const raw = makeRaw();
  const result = validateCoachRequest(raw);
  assert.equal(result.ok, true);
  // assignment 필드들
  assert.equal(result.value.assignment.school_level, "중2");
  assert.equal(result.value.assignment.subject, "국어");
  assert.equal(result.value.assignment.genre, "논설문·주장하는 글");
  assert.equal(result.value.assignment.target_char_count, null); // 코치는 분량 미사용
  assert.equal(result.value.assignment.prompt_text, "학교 급식에 대해 의견을 써 보세요.");
  // draft 존재
  assert.equal(typeof result.value.draft, "string");
  assert.ok(result.value.draft.length > 0);
  // rubricText 없으면 undefined
  assert.equal(result.value.rubricText, undefined);
});

// ── case 2: 유효한 mode 전송 → 그대로 수용 ────────────────────────────────
test("mode='guide' 전송 → value.mode === 'guide'", () => {
  const result = validateCoachRequest(makeRaw({ mode: "guide" }));
  assert.equal(result.ok, true);
  assert.equal(result.value.mode, "guide");
});

test("mode='outline' 전송 → value.mode === 'outline' (ALL_MODES 화이트리스트)", () => {
  const result = validateCoachRequest(makeRaw({ mode: "outline" }));
  assert.equal(result.ok, true);
  assert.equal(result.value.mode, "outline");
});

test("mode='voice' 전송 → value.mode === 'voice' (ALL_MODES 화이트리스트)", () => {
  const result = validateCoachRequest(makeRaw({ mode: "voice" }));
  assert.equal(result.ok, true);
  assert.equal(result.value.mode, "voice");
});

test("mode='free' 명시 전송 → value.mode === 'free'", () => {
  const result = validateCoachRequest(makeRaw({ mode: "free" }));
  assert.equal(result.ok, true);
  assert.equal(result.value.mode, "free");
});

// ── case 3: 잘못된 mode → 'free' 폴백 (거부 아님, 하위호환) ─────────────────
test("mode=42(숫자) → 'free' 폴백 (거부 아님)", () => {
  const result = validateCoachRequest(makeRaw({ mode: 42 }));
  assert.equal(result.ok, true);
  assert.equal(result.value.mode, "free");
});

test("mode=null → 'free' 폴백", () => {
  const result = validateCoachRequest(makeRaw({ mode: null }));
  assert.equal(result.ok, true);
  assert.equal(result.value.mode, "free");
});

test("mode=true(boolean) → 'free' 폴백", () => {
  const result = validateCoachRequest(makeRaw({ mode: true }));
  assert.equal(result.ok, true);
  assert.equal(result.value.mode, "free");
});

test("mode='rap'(임의 문자열) → 'free' 폴백 (거부 아님)", () => {
  const result = validateCoachRequest(makeRaw({ mode: "rap" }));
  assert.equal(result.ok, true);
  assert.equal(result.value.mode, "free");
});

// ── case 4: 기존 검증 불변 (mode 추가가 E1/E2/E3 순서·결과를 바꾸지 않음) ──
test("잘못된 school_level → E1 (mode와 무관)", () => {
  const result = validateCoachRequest(makeRaw({ mode: "guide", schoolOverride: "잘못된학년" }));
  assert.equal(result.ok, false);
  assert.equal(result.code, "E1");
});

test("본문 너무 짧음(<10자) → E2 (mode와 무관)", () => {
  const result = validateCoachRequest(makeRaw({ mode: "outline", bodyOverride: "짧다" }));
  assert.equal(result.ok, false);
  assert.equal(result.code, "E2");
});

test("본문 너무 긺(>4000자) → E3 (mode와 무관)", () => {
  const longBody = "가".repeat(4001);
  const result = validateCoachRequest(makeRaw({ mode: "free", bodyOverride: longBody }));
  assert.equal(result.ok, false);
  assert.equal(result.code, "E3");
});

test("잘못된 mode + 잘못된 school_level → E1 (폴백하되 검증은 그대로)", () => {
  const result = validateCoachRequest(makeRaw({ mode: "unknown", schoolOverride: "없는학년" }));
  assert.equal(result.ok, false);
  assert.equal(result.code, "E1");
});
