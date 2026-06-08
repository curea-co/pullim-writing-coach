// EPIC5 교사 무료 도구 — 커스텀 루브릭 순수 모듈 테스트.
//   채점 자동화가 아니라 "코칭 정렬"용 입력임을 계약으로 고정한다.
// 실행: node --import ./scripts/register-ts.mjs --test scripts/teacher-rubric.test.mjs

import assert from "node:assert/strict";
import { test } from "node:test";
import { AREAS } from "../app/lib/grading.ts";
import {
  emptyTeacherRubric,
  validateTeacherRubric,
  serializeRubricForPrompt,
} from "../app/lib/teacher-rubric.ts";

test("emptyTeacherRubric — AREAS 순서로 5영역 초기화, criterion 공백", () => {
  const r = emptyTeacherRubric();
  assert.equal(r.title, "");
  assert.equal(r.perArea.length, AREAS.length);
  r.perArea.forEach((row, i) => {
    assert.equal(row.area, AREAS[i]);
    assert.equal(row.criterion, "");
  });
});

test("validateTeacherRubric — 제목 비면 위반", () => {
  const r = emptyTeacherRubric();
  r.perArea[0].criterion = "핵심 질문에 답했는지";
  const errs = validateTeacherRubric(r);
  assert.ok(errs.some((e) => e.includes("제목")));
});

test("validateTeacherRubric — 5영역 순서·개수 어긋나면 위반", () => {
  const r = emptyTeacherRubric();
  r.title = "1학기 설명문";
  r.perArea[0].criterion = "x";
  // 순서 깨기
  const swapped = {
    title: r.title,
    perArea: [r.perArea[1], r.perArea[0], ...r.perArea.slice(2)],
  };
  assert.ok(validateTeacherRubric(swapped).some((e) => e.includes("순서")));

  // 개수 부족
  const short = { title: r.title, perArea: r.perArea.slice(0, 3) };
  assert.ok(validateTeacherRubric(short).some((e) => e.includes("영역")));
});

test("validateTeacherRubric — criterion 전부 비면 경고(부분 허용이라 위반 아님 메시지)", () => {
  const r = emptyTeacherRubric();
  r.title = "1학기 설명문";
  const errs = validateTeacherRubric(r);
  assert.ok(errs.some((e) => e.includes("기준을 한 곳 이상")));
});

test("validateTeacherRubric — 제목+기준 한 곳만 채워도 통과(부분 허용)", () => {
  const r = emptyTeacherRubric();
  r.title = "1학기 설명문";
  r.perArea[1].criterion = "근거가 2개 이상 구체적인지";
  assert.deepEqual(validateTeacherRubric(r), []);
});

test("serializeRubricForPrompt — 채운 기준만 직렬화, 점수/대필 금지 맥락 포함", () => {
  const r = emptyTeacherRubric();
  r.title = "1학기 설명문";
  r.perArea[0].criterion = "핵심 질문에 답했는지";
  r.perArea[3].criterion = "문장 길이에 변화가 있는지";
  const text = serializeRubricForPrompt(r);
  assert.ok(text.includes("1학기 설명문"));
  assert.ok(text.includes("과제 이해: 핵심 질문에 답했는지"));
  assert.ok(text.includes("표현·문장: 문장 길이에 변화가 있는지"));
  // 빈 영역은 미포함
  assert.ok(!text.includes("내용 충실도:"));
  // 채점 자동화 아님 — 점수/대필 금지 맥락
  assert.ok(text.includes("점수를 매기거나 문장을 대신 쓰지 마세요"));
});

test("serializeRubricForPrompt — 채운 기준 없으면 빈 문자열(기본 코칭으로 분기)", () => {
  const r = emptyTeacherRubric();
  r.title = "제목만 있음";
  assert.equal(serializeRubricForPrompt(r), "");
});
