// 물결1 — 코치 셋업(과제+모드) 순수 모듈 테스트.
// 실행: node --import ./scripts/register-ts.mjs --test scripts/coach-setup.test.mjs

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  emptyAssignment,
  validateAssignment,
  isModeEnabled,
  serializeSetup,
  parseSetup,
} from "../app/lib/coach-setup.ts";

test("emptyAssignment — 빈 과제, target null", () => {
  const a = emptyAssignment();
  assert.equal(a.school_level, "");
  assert.equal(a.subject, "");
  assert.equal(a.genre, "");
  assert.equal(a.prompt_text, "");
  assert.equal(a.target_char_count, null);
});

test("validateAssignment — 필수 미입력 시 위반", () => {
  const errs = validateAssignment(emptyAssignment());
  assert.ok(errs.length >= 1);
});

test("validateAssignment — enum 밖 학년/과목/장르 위반", () => {
  const a = { school_level: "대학", subject: "체육", genre: "랩", target_char_count: null, prompt_text: "화산을 설명하라" };
  const errs = validateAssignment(a);
  assert.ok(errs.some((e) => e.includes("학년")));
  assert.ok(errs.some((e) => e.includes("과목")));
  assert.ok(errs.some((e) => e.includes("장르")));
});

test("validateAssignment — prompt 길이 경계(10자 미만 위반)", () => {
  const a = { school_level: "중2", subject: "과학", genre: "설명문", target_char_count: null, prompt_text: "짧음" };
  const errs = validateAssignment(a);
  assert.ok(errs.some((e) => e.includes("과제")));
});

test("validateAssignment — target 범위 밖(49) 위반, null은 허용", () => {
  const base = { school_level: "중2", subject: "과학", genre: "설명문", prompt_text: "화산의 형성을 설명하라" };
  assert.ok(validateAssignment({ ...base, target_char_count: 49 }).some((e) => e.includes("목표")));
  assert.equal(validateAssignment({ ...base, target_char_count: null }).length, 0);
});

test("validateAssignment — 정상 과제 통과", () => {
  const a = { school_level: "중2", subject: "과학", genre: "설명문", target_char_count: 800, prompt_text: "화산의 형성 과정을 설명하라" };
  assert.equal(validateAssignment(a).length, 0);
});

test("isModeEnabled — free·guide 활성, outline·voice 비활성", () => {
  assert.equal(isModeEnabled("free"), true);
  assert.equal(isModeEnabled("guide"), true);
  assert.equal(isModeEnabled("outline"), false);
  assert.equal(isModeEnabled("voice"), false);
});

test("serializeSetup/parseSetup — 왕복", () => {
  const setup = { assignment: { school_level: "중2", subject: "과학", genre: "설명문", target_char_count: 800, prompt_text: "화산의 형성을 설명하라", title: "화산" }, mode: "guide" };
  const round = parseSetup(serializeSetup(setup));
  assert.deepEqual(round, setup);
});

test("parseSetup — null/손상 입력은 null", () => {
  assert.equal(parseSetup(null), null);
  assert.equal(parseSetup("{not json"), null);
  assert.equal(parseSetup(JSON.stringify({ assignment: null, mode: "free" })), null);
  assert.equal(parseSetup(JSON.stringify({ assignment: { school_level: "중2" }, mode: "rap" })), null);
});

test("parseSetup — 정수 아닌 target_char_count는 null", () => {
  const bad = JSON.stringify({ assignment: { school_level: "중2", subject: "과학", genre: "설명문", target_char_count: 3.7, prompt_text: "화산의 형성을 설명하라" }, mode: "free" });
  assert.equal(parseSetup(bad), null);
});
