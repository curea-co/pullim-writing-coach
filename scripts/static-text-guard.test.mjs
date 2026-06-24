// 정적 텍스트 대필 가드 — 헬퍼 메타테스트 + 가이드 질문 풀 가드.
//   헬퍼는 app/lib/static-text-guard.ts. checkGenerationBlock에 위임(재구현 금지).
//   실행: node --import ./scripts/register-ts.mjs --test scripts/static-text-guard.test.mjs

import assert from "node:assert/strict";
import { test } from "node:test";
import { assertNoGeneration, assertQuestionsAreQuestions } from "../app/lib/static-text-guard.ts";
import { AREAS } from "../app/lib/grading.ts";
import { GUIDE_QUESTIONS, guideQuestionsFor } from "../app/lib/guide-prompts.ts";

// ════════════════════════════════════════════════════════════════════
// Task 1 메타테스트 — assertNoGeneration
// ════════════════════════════════════════════════════════════════════

test("메타테스트 (a): 알려진 대필 문자열은 반드시 throw", () => {
  // WRITE_DIRECTIVE 계열
  assert.throws(
    () => assertNoGeneration(["근거가 약해요. 이렇게 써: 화산은 위험하다."], "WRITE_DIRECTIVE"),
    /WRITE_DIRECTIVE|대필|위반/,
    "WRITE_DIRECTIVE — '이렇게 써' 패턴이 throw 안 함"
  );

  // 콜론+완성문장 계열 (WRITE_DIRECTIVE가 먼저 걸림)
  assert.throws(
    () => assertNoGeneration(["추천 문장: 화산은 위험하다"], "추천문장라벨"),
    Error,
    "추천 문장 라벨+콜론이 throw 안 함"
  );

  // 콜론 뒤 완성문장 계열
  assert.throws(
    () => assertNoGeneration(["정리하면: 화산은 위험하다."], "콜론완성문장"),
    Error,
    "콜론 뒤 완성문장이 throw 안 함"
  );
});

test("메타테스트 (b): 정당한 카드 카피·평서문은 통과(throw 없음)", () => {
  // 자유 쓰기 카드 body
  assert.doesNotThrow(() =>
    assertNoGeneration([
      "바로 캔버스에 써 내려가요. 다 쓰면 코치에게 봐달라고 해요.",
      "막막할 때, 질문 카드를 보며 네 생각을 한 줄씩 적어가요.",
      "글의 뼈대부터 잡고 살을 붙여요.",
      "말로 풀어낸 뒤 직접 글로 정리해요.",
    ], "ModeSelectStep 카드 카피")
  );

  // placeholder
  assert.doesNotThrow(() =>
    assertNoGeneration(["네 생각을 한 줄로…"], "GuidePanel placeholder")
  );

  // 순수 질문도 assertNoGeneration 통과(diagnosis 슬롯 = 평서문 허용)
  assert.doesNotThrow(() =>
    assertNoGeneration(["이 과제가 너한테 묻는 핵심은 한마디로 뭐야?"], "GUIDE_QUESTIONS[0]")
  );
});

test("메타테스트 (c): 빈 배열은 통과", () => {
  assert.doesNotThrow(() => assertNoGeneration([], "empty"));
});

// ════════════════════════════════════════════════════════════════════
// Task 2 메타테스트 — assertQuestionsAreQuestions
// ════════════════════════════════════════════════════════════════════

test("메타테스트: 평서문 단정형은 assertQuestionsAreQuestions가 throw", () => {
  assert.throws(
    () => assertQuestionsAreQuestions(["화산은 위험하다."], "평서문단정"),
    Error,
    "평서문 단정형이 throw 안 함"
  );
});

test("메타테스트: ?종결 질문은 통과", () => {
  assert.doesNotThrow(() =>
    assertQuestionsAreQuestions(["왜 그렇게 생각해?"], "물음표질문")
  );
});

test("메타테스트: SOFT_TAIL 요청형 꼬리는 통과", () => {
  assert.doesNotThrow(() =>
    assertQuestionsAreQuestions(["한 줄 더 떠올려 볼까"], "SOFT_TAIL볼까")
  );
});

// ════════════════════════════════════════════════════════════════════
// Task 3 — node:test 가드: GUIDE_QUESTIONS + guideQuestionsFor
// ════════════════════════════════════════════════════════════════════

test("GUIDE_QUESTIONS — 10개 질문 모두 assertNoGeneration 위반 0건", () => {
  const all = AREAS.flatMap((a) => GUIDE_QUESTIONS[a]);
  assert.doesNotThrow(
    () => assertNoGeneration(all, "GUIDE_QUESTIONS 전체"),
    "GUIDE_QUESTIONS 대필 신호 감지"
  );
});

test("GUIDE_QUESTIONS — 10개 질문 모두 assertQuestionsAreQuestions 통과", () => {
  const all = AREAS.flatMap((a) => GUIDE_QUESTIONS[a]);
  assert.doesNotThrow(
    () => assertQuestionsAreQuestions(all, "GUIDE_QUESTIONS 전체"),
    "GUIDE_QUESTIONS 평서문 의심"
  );
});

test("guideQuestionsFor('설명문') 출력 — assertNoGeneration 통과", () => {
  const qs = guideQuestionsFor("설명문").map((q) => q.question);
  assert.doesNotThrow(
    () => assertNoGeneration(qs, "guideQuestionsFor 설명문"),
    "guideQuestionsFor 대필 신호 감지"
  );
});

test("guideQuestionsFor('설명문') 출력 — assertQuestionsAreQuestions 통과", () => {
  const qs = guideQuestionsFor("설명문").map((q) => q.question);
  assert.doesNotThrow(
    () => assertQuestionsAreQuestions(qs, "guideQuestionsFor 설명문"),
    "guideQuestionsFor 평서문 의심"
  );
});
