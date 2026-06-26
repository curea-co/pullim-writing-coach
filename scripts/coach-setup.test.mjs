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

test("isModeEnabled — free·guide·outline 활성, voice는 비활성(준비 중)", () => {
  assert.equal(isModeEnabled("free"), true);
  assert.equal(isModeEnabled("guide"), true);
  assert.equal(isModeEnabled("outline"), true);
  assert.equal(isModeEnabled("voice"), false); // 실마이크 QA·동의 정책 전까지 비활성
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

test("parseSetup — outline 모드 정상 과제 round-trip 복원 성공", () => {
  // outline은 활성화됐으므로 구조+내용이 맞으면 parseSetup이 값을 반환해야 함.
  const setup = { assignment: { school_level: "중2", subject: "과학", genre: "설명문", target_char_count: null, prompt_text: "화산의 형성을 설명하라" }, mode: "outline" };
  const round = parseSetup(JSON.stringify(setup));
  assert.deepEqual(round, setup);
});

test("parseSetup — voice 비활성: 과제 보존 + 모드만 기본(free)으로 다운그레이드", () => {
  // 저장된 voice 셋업을 복원하면 과제는 유지하되 voice→free로 떨어뜨린다(데이터 손실·미지원 데드엔드 동시 방지).
  const assignment = { school_level: "중2", subject: "과학", genre: "설명문", target_char_count: null, prompt_text: "화산의 형성을 설명하라" };
  const round = parseSetup(JSON.stringify({ assignment, mode: "voice" }));
  assert.deepEqual(round, { assignment, mode: "free" });
});

test("parseSetup — 알 수 없는 모드(rap)는 여전히 null(다운그레이드 아님)", () => {
  // 비활성-이지만-유효한 모드(voice)와 달리, WritingMode 자체가 아닌 값은 거부.
  const bad = JSON.stringify({ assignment: { school_level: "중2", subject: "과학", genre: "설명문", target_char_count: null, prompt_text: "화산의 형성을 설명하라" }, mode: "rap" });
  assert.equal(parseSetup(bad), null);
});

test("parseSetup — validateAssignment 위반 과제(짧은 prompt·enum 밖)는 null", () => {
  const shortPrompt = JSON.stringify({ assignment: { school_level: "중2", subject: "과학", genre: "설명문", target_char_count: null, prompt_text: "짧음" }, mode: "free" });
  assert.equal(parseSetup(shortPrompt), null);
  const badEnum = JSON.stringify({ assignment: { school_level: "대학원", subject: "과학", genre: "설명문", target_char_count: null, prompt_text: "화산의 형성을 설명하라" }, mode: "free" });
  assert.equal(parseSetup(badEnum), null);
});
