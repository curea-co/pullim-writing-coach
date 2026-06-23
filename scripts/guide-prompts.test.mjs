// 물결1 — 가이드 모드 정적 질문 풀. 핵심: 대필 불변식 게이트(checkGenerationBlock 위반 0건).
// 실행: node --import ./scripts/register-ts.mjs --test scripts/guide-prompts.test.mjs

import assert from "node:assert/strict";
import { test } from "node:test";
import { AREAS } from "../app/lib/grading.ts";
import { checkGenerationBlock } from "../app/lib/coach-schema.ts";
import { GUIDE_QUESTIONS, guideQuestionsFor } from "../app/lib/guide-prompts.ts";

test("GUIDE_QUESTIONS — 5영역 모두 1문항 이상", () => {
  for (const area of AREAS) {
    assert.ok(Array.isArray(GUIDE_QUESTIONS[area]), `${area} 풀 없음`);
    assert.ok(GUIDE_QUESTIONS[area].length >= 1, `${area} 비어 있음`);
  }
});

test("guideQuestionsFor — 영역당 1문항, AREAS 순서", () => {
  const qs = guideQuestionsFor("설명문");
  assert.equal(qs.length, AREAS.length);
  qs.forEach((q, i) => assert.equal(q.area, AREAS[i]));
});

test("불변식 게이트 — 모든 질문이 checkGenerationBlock 위반 0건", () => {
  // 각 질문을 nudge.guiding_question으로 감싸 코치 출력 가드에 그대로 통과시킨다.
  const allQuestions = AREAS.flatMap((a) => GUIDE_QUESTIONS[a]);
  const fakeOutput = {
    area_scores: [],
    nudges: allQuestions.map((q, i) => ({
      paragraph_index: 0,
      rubric_area: AREAS[0],
      diagnosis: "",
      guiding_question: q,
      quick_win_rank: i + 1,
    })),
  };
  const violations = checkGenerationBlock(fakeOutput);
  assert.deepEqual(violations, [], `대필 의심 질문: ${violations.join(", ")}`);
});

test("불변식 — 모든 질문은 물음표로 끝남(질문칸 평서문 금지)", () => {
  for (const area of AREAS) {
    for (const q of GUIDE_QUESTIONS[area]) {
      assert.ok(q.trim().endsWith("?"), `평서문 의심: ${q}`);
    }
  }
});
