// EPIC 4 — CoachSession 순수 모델 테스트 (T4.1). 순수 모듈을 번들 없이 직접 import.
// 실행: node --import ./scripts/register-ts.mjs --test scripts/coach-session.test.mjs
// 회귀 고정: createSession 초기값 / recordRevision 불변성·append / revisionCount / baseline 고정.

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createSession,
  recordRevision,
  revisionCount,
} from "../app/lib/coach-session.ts";

const assignment = () => ({
  school_level: "중2",
  subject: "국어",
  genre: "주장하는 글",
  prompt_text: "교복 자율화에 대한 의견을 쓰시오.",
});

const scores = (over = {}) => [
  { area: "과제 이해", score: 14 },
  { area: "내용 충실도", score: 8 },
  { area: "구조·논리", score: 10 },
  { area: "표현·문장", score: 12 },
  { area: "성장 가능성", score: 11 },
].map((s) => ({ ...s, ...(over[s.area] !== undefined ? { score: over[s.area] } : {}) }));

test("createSession은 최초 draft·baseline·areaScores를 채운다", () => {
  const s = createSession(assignment(), "안녕하세요 제 글입니다", scores());
  assert.equal(s.draftHistory.length, 1);
  assert.equal(s.draftHistory[0].n, 1);
  assert.equal(s.draftHistory[0].body, "안녕하세요 제 글입니다");
  assert.equal(s.draftHistory[0].charCount, Array.from("안녕하세요 제 글입니다").length);
  assert.equal(s.nudgeHistory.length, 0);
  assert.deepEqual(s.baseline, scores());
  assert.deepEqual(s.areaScores, scores());
});

test("createSession의 baseline과 areaScores는 독립 배열이다(별칭 아님)", () => {
  const s = createSession(assignment(), "초안", scores());
  assert.notEqual(s.baseline, s.areaScores);
  assert.notEqual(s.baseline[0], s.areaScores[0]);
});

test("createSession은 rubricText가 있으면 보존, 없으면 미설정", () => {
  const withRubric = createSession(assignment(), "초안", scores(), "루브릭 내용");
  assert.equal(withRubric.rubricText, "루브릭 내용");
  const noRubric = createSession(assignment(), "초안", scores());
  assert.equal("rubricText" in noRubric, false);
});

test("createSession은 입력 assignment를 별칭으로 잡지 않는다", () => {
  const a = assignment();
  const s = createSession(a, "초안", scores());
  a.subject = "사회"; // 외부 변형
  assert.equal(s.assignment.subject, "국어");
});

test("revisionCount는 최초 draft만 있으면 0", () => {
  const s = createSession(assignment(), "초안", scores());
  assert.equal(revisionCount(s), 0);
});

test("recordRevision은 새 세션을 반환하고 원본을 변형하지 않는다(불변)", () => {
  const s0 = createSession(assignment(), "초안", scores());
  const s1 = recordRevision(
    s0,
    "고쳐 쓴 글입니다",
    scores({ "내용 충실도": 15 }),
    "내용 충실도",
    8,
    15,
  );
  // 원본 불변
  assert.equal(s0.draftHistory.length, 1);
  assert.equal(s0.nudgeHistory.length, 0);
  assert.deepEqual(s0.areaScores, scores());
  // 새 세션
  assert.notEqual(s0, s1);
  assert.equal(s1.draftHistory.length, 2);
  assert.equal(s1.draftHistory[1].n, 2);
  assert.equal(s1.draftHistory[1].body, "고쳐 쓴 글입니다");
  assert.equal(s1.draftHistory[1].charCount, Array.from("고쳐 쓴 글입니다").length);
  assert.equal(s1.nudgeHistory.length, 1);
  assert.deepEqual(s1.nudgeHistory[0], {
    area: "내용 충실도",
    paragraph_index: 0,
    before: 8,
    after: 15,
  });
  assert.equal(revisionCount(s1), 1);
});

test("recordRevision은 areaScores를 교체하되 baseline은 고정한다", () => {
  const s0 = createSession(assignment(), "초안", scores());
  const s1 = recordRevision(s0, "v2", scores({ "내용 충실도": 15 }), "내용 충실도", 8, 15);
  assert.deepEqual(s1.baseline, scores()); // baseline 불변
  assert.equal(s1.areaScores.find((a) => a.area === "내용 충실도").score, 15);
});

test("recordRevision을 여러 번 하면 회차·histories가 누적된다", () => {
  let s = createSession(assignment(), "초안", scores());
  s = recordRevision(s, "v2", scores({ "내용 충실도": 11 }), "내용 충실도", 8, 11);
  s = recordRevision(s, "v3", scores({ "구조·논리": 14 }), "구조·논리", 10, 14);
  assert.equal(revisionCount(s), 2);
  assert.equal(s.draftHistory.length, 3);
  assert.deepEqual(s.draftHistory.map((d) => d.n), [1, 2, 3]);
  assert.equal(s.nudgeHistory.length, 2);
});

test("recordRevision은 rubricText를 새 세션에 보존한다", () => {
  const s0 = createSession(assignment(), "초안", scores(), "루브릭");
  const s1 = recordRevision(s0, "v2", scores(), "표현·문장", 12, 13);
  assert.equal(s1.rubricText, "루브릭");
});
