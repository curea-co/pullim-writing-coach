// 물결1·2 — 가이드 모드 정적 질문 풀. 핵심: 대필 불변식 게이트(checkGenerationBlock 위반 0건).
// 물결2 Slice 5: 장르별 분기 계약 락 + GENRE_QUESTIONS 대필 가드.
// 실행: node --import ./scripts/register-ts.mjs --test scripts/guide-prompts.test.mjs

import assert from "node:assert/strict";
import { test } from "node:test";
import { AREAS, GENRES } from "../app/lib/grading.ts";
import { checkGenerationBlock } from "../app/lib/coach-schema.ts";
import { GUIDE_QUESTIONS, GENRE_QUESTIONS, guideQuestionsFor } from "../app/lib/guide-prompts.ts";
import { assertNoGeneration, assertQuestionsAreQuestions } from "../app/lib/static-text-guard.ts";

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

// ─── Task 1: 출력 계약 회귀 락 + 미지 genre 폴백 테스트 ──────────────────────

test("Task1 계약 락 — GENRES 전수: 길이=AREAS.length, AREAS 순서, question 비지 않음", () => {
  for (const genre of GENRES) {
    const qs = guideQuestionsFor(genre);
    assert.equal(qs.length, AREAS.length, `${genre}: 길이 불일치`);
    qs.forEach((q, i) => {
      assert.equal(q.area, AREAS[i], `${genre}[${i}] area 순서 불일치`);
      assert.ok(q.question.trim().length > 0, `${genre}[${i}] question 비어 있음`);
    });
  }
});

test("Task1 미지 genre 폴백 — 미지/빈/기타 → throw 없이 AREAS.length, default 풀 동일", () => {
  for (const unknownGenre of ["존재안함", "", "기타"]) {
    let qs;
    assert.doesNotThrow(() => {
      qs = guideQuestionsFor(unknownGenre);
    }, `${JSON.stringify(unknownGenre)}: throw 발생`);
    assert.equal(qs.length, AREAS.length, `${JSON.stringify(unknownGenre)}: 길이 불일치`);
    qs.forEach((q, i) => {
      assert.equal(
        q.question,
        GUIDE_QUESTIONS[AREAS[i]][0],
        `${JSON.stringify(unknownGenre)}[${AREAS[i]}]: default 폴백 아님`
      );
    });
  }
});

// ─── Task 3: 분기 실동작 회귀 가드 ────────────────────────────────────────────

test("Task3 분기 실동작 — override 선언한 모든 genre가 최소 1영역에서 default와 다른 question 반환", () => {
  // 한 genre만 확인하면 나머지 override가 전부 default로 회귀해도 통과하므로, GENRE_QUESTIONS에
  // 선언된 각 genre를 전수로 락(분기가 실제로 동작함을 genre별로 보장).
  const overriddenGenres = Object.keys(GENRE_QUESTIONS);
  assert.ok(overriddenGenres.length >= 1, "GENRE_QUESTIONS가 비어 있음 — 장르 분기 없음");
  for (const g of overriddenGenres) {
    const genreQs = guideQuestionsFor(g);
    const diffCount = genreQs.filter(
      (q, i) => q.question !== GUIDE_QUESTIONS[AREAS[i]][0]
    ).length;
    assert.ok(
      diffCount >= 1,
      `${g} 분기가 동작하지 않음 — 모든 question이 default와 동일`
    );
  }
});

// ─── Task 4: GENRE_QUESTIONS 전수 대필 가드 (slice-2 헬퍼 재사용) ────────────

test("Task4 GENRE_QUESTIONS 대필 가드 — assertNoGeneration 위반 0건 + assertQuestionsAreQuestions 통과", () => {
  const allOverrides = Object.values(GENRE_QUESTIONS).flatMap((areaMap) =>
    Object.values(areaMap).flatMap((qs) => qs)
  );
  // 오버라이드가 없으면 테스트는 패스(빈 배열은 assertNoGeneration에서 early return)
  assertNoGeneration(allOverrides, "GENRE_QUESTIONS");
  assertQuestionsAreQuestions(allOverrides, "GENRE_QUESTIONS");
});
