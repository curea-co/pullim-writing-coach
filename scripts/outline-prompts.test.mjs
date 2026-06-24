// 물결2 — 개요 모드 정적 질문 풀. 핵심: 대필 불변식 + 처방적 연결어 거부 게이트.
// 실행: node --import ./scripts/register-ts.mjs --test scripts/outline-prompts.test.mjs

import assert from "node:assert/strict";
import { test } from "node:test";
import { AREAS } from "../app/lib/grading.ts";
import { OUTLINE_QUESTIONS, outlinePromptsFor } from "../app/lib/outline-prompts.ts";
import { assertNoGeneration, assertQuestionsAreQuestions } from "../app/lib/static-text-guard.ts";

test("OUTLINE_QUESTIONS — 5영역 모두 1문항 이상", () => {
  for (const area of AREAS) {
    assert.ok(Array.isArray(OUTLINE_QUESTIONS[area]), `${area} 풀 없음`);
    assert.ok(OUTLINE_QUESTIONS[area].length >= 1, `${area} 비어 있음`);
  }
});

test("outlinePromptsFor — 영역당 1문항, AREAS 순서 일치", () => {
  const qs = outlinePromptsFor("설명문");
  assert.equal(qs.length, AREAS.length);
  qs.forEach((q, i) => assert.equal(q.area, AREAS[i]));
});

test("불변식 게이트 — 모든 질문이 assertNoGeneration 위반 0건", () => {
  const allQuestions = AREAS.flatMap((a) => OUTLINE_QUESTIONS[a]);
  // slice-2 헬퍼 재사용: 각 문자열을 diagnosis 슬롯으로 감싸 대필 신호 검사.
  assert.doesNotThrow(
    () => assertNoGeneration(allQuestions, "outline-prompts"),
    "대필 신호 위반 질문 존재"
  );
});

test("불변식 — 모든 질문이 assertQuestionsAreQuestions 통과(? 종결)", () => {
  const allQuestions = AREAS.flatMap((a) => OUTLINE_QUESTIONS[a]);
  assert.doesNotThrow(
    () => assertQuestionsAreQuestions(allQuestions, "outline-prompts"),
    "평서문 종결 질문 존재"
  );
});

test("처방적 연결어 거부 — 질문에 /먼저|그다음|그 다음|그래서|순서대로|차례로|단계로/ 포함 금지", () => {
  const prescriptiveRe = /먼저|그다음|그 다음|그래서|순서대로|차례로|단계로/;
  const allQuestions = AREAS.flatMap((a) => OUTLINE_QUESTIONS[a]);
  const violations = allQuestions.filter((q) => prescriptiveRe.test(q));
  assert.deepEqual(
    violations,
    [],
    `처방적 연결어 포함 질문 (${violations.length}건):\n${violations.map((q) => `  "${q}"`).join("\n")}`
  );
});
