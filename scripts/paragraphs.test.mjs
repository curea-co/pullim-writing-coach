// 문단 분리 테스트 (T1.3). 코치는 문단 단위로 진단한다 — \n\n 문단 규칙(normalizeBody와 동일).
// 실행: node --import ./scripts/register-ts.mjs --test scripts/paragraphs.test.mjs

import assert from "node:assert/strict";
import { test } from "node:test";
import { splitParagraphs } from "../app/lib/paragraphs.ts";

test("단일 문단 → index 0 하나", () => {
  assert.deepEqual(splitParagraphs("화산은 마그마가 분출한 지형이다."), [
    { index: 0, text: "화산은 마그마가 분출한 지형이다." },
  ]);
});

test("\\n\\n로 나뉜 두 문단 → index 0,1", () => {
  const got = splitParagraphs("첫 문단이다.\n\n둘째 문단이다.");
  assert.deepEqual(got, [
    { index: 0, text: "첫 문단이다." },
    { index: 1, text: "둘째 문단이다." },
  ]);
});

test("문단별 앞뒤 공백 trim", () => {
  const got = splitParagraphs("  앞 공백 문단  \n\n  뒤 문단  ");
  assert.deepEqual(got, [
    { index: 0, text: "앞 공백 문단" },
    { index: 1, text: "뒤 문단" },
  ]);
});

test("빈 문단은 버리고 index를 다시 매김(연속)", () => {
  const got = splitParagraphs("A\n\n\n\nB\n\n   \n\nC");
  assert.deepEqual(got, [
    { index: 0, text: "A" },
    { index: 1, text: "B" },
    { index: 2, text: "C" },
  ]);
});

test("문단 안 단일 줄바꿈은 같은 문단으로 유지", () => {
  const got = splitParagraphs("한 줄\n같은 문단\n\n다른 문단");
  assert.equal(got.length, 2);
  assert.equal(got[0].text, "한 줄\n같은 문단");
  assert.equal(got[1].text, "다른 문단");
});

test("문자열이 아니면 빈 배열", () => {
  assert.deepEqual(splitParagraphs(null), []);
  assert.deepEqual(splitParagraphs(42), []);
});

test("빈/공백 문자열은 빈 배열", () => {
  assert.deepEqual(splitParagraphs(""), []);
  assert.deepEqual(splitParagraphs("   \n\n  "), []);
});
