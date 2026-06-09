// EPIC 4 — buildProcessLog 교사용 과정 증거 로그 테스트 (T4.2). 순수 모듈 직접 import.
// 실행: node --import ./scripts/register-ts.mjs --test scripts/process-log.test.mjs
// 회귀 고정: revisions/finalCharCount / perArea baseline·final·improved / stuckAreas(>=2회 & PASS 미만)
//   / 제품 불변식 coachWroteSentences===false · authorIsStudent===true.

import assert from "node:assert/strict";
import { test } from "node:test";
import { createSession, recordRevision } from "../app/lib/coach-session.ts";
import { buildProcessLog, PASS } from "../app/lib/process-log.ts";

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

test("buildProcessLog의 coachWroteSentences는 항상 false (제품 불변식)", () => {
  const s = createSession(assignment(), "초안", scores());
  assert.equal(buildProcessLog(s).coachWroteSentences, false);
});

test("buildProcessLog의 authorIsStudent는 항상 true (제품 불변식)", () => {
  const s = createSession(assignment(), "초안", scores());
  assert.equal(buildProcessLog(s).authorIsStudent, true);
});

test("revisions=0·finalCharCount=최초 draft 글자수 (고쳐쓰기 전)", () => {
  const s = createSession(assignment(), "초안입니다", scores());
  const log = buildProcessLog(s);
  assert.equal(log.revisions, 0);
  assert.equal(log.finalCharCount, Array.from("초안입니다").length);
});

test("revisions·finalCharCount는 최신 draft를 반영한다", () => {
  let s = createSession(assignment(), "짧은 초안", scores());
  s = recordRevision(s, "훨씬 더 길게 고쳐 쓴 최종 글입니다", scores(), "내용 충실도", 8, 9);
  const log = buildProcessLog(s);
  assert.equal(log.revisions, 1);
  assert.equal(log.finalCharCount, Array.from("훨씬 더 길게 고쳐 쓴 최종 글입니다").length);
});

test("perArea는 baseline 순서·5개·baseline/final/improved를 담는다", () => {
  let s = createSession(assignment(), "초안", scores());
  s = recordRevision(s, "v2", scores({ "내용 충실도": 15 }), "내용 충실도", 8, 15);
  const log = buildProcessLog(s);
  assert.equal(log.perArea.length, 5);
  assert.deepEqual(
    log.perArea.map((p) => p.area),
    ["과제 이해", "내용 충실도", "구조·논리", "표현·문장", "성장 가능성"],
  );
  const content = log.perArea.find((p) => p.area === "내용 충실도");
  assert.equal(content.baseline, 8);
  assert.equal(content.final, 15);
  assert.equal(content.improved, true);
});

test("improved는 final>baseline일 때만 true (동점·하락은 false)", () => {
  let s = createSession(assignment(), "초안", scores());
  // 표현·문장 동점 유지, 성장 가능성 하락
  s = recordRevision(s, "v2", scores({ "성장 가능성": 9 }), "표현·문장", 12, 12);
  const log = buildProcessLog(s);
  assert.equal(log.perArea.find((p) => p.area === "표현·문장").improved, false);
  assert.equal(log.perArea.find((p) => p.area === "성장 가능성").improved, false);
});

test("stuckAreas: 같은 영역 nudge >=2회인데 PASS 미만 → 막힘", () => {
  let s = createSession(assignment(), "초안", scores());
  // 내용 충실도를 두 번 손봤지만 최종 9점(PASS=14 미만)
  s = recordRevision(s, "v2", scores({ "내용 충실도": 9 }), "내용 충실도", 8, 9);
  s = recordRevision(s, "v3", scores({ "내용 충실도": 9 }), "내용 충실도", 9, 9);
  const log = buildProcessLog(s);
  assert.deepEqual(log.stuckAreas, ["내용 충실도"]);
});

test("stuckAreas: nudge >=2회라도 최종 PASS 도달이면 막힘 아님", () => {
  let s = createSession(assignment(), "초안", scores());
  s = recordRevision(s, "v2", scores({ "내용 충실도": 11 }), "내용 충실도", 8, 11);
  s = recordRevision(s, "v3", scores({ "내용 충실도": PASS }), "내용 충실도", 11, PASS);
  const log = buildProcessLog(s);
  assert.deepEqual(log.stuckAreas, []);
});

test("stuckAreas: nudge 1회뿐이면(PASS 미만이어도) 막힘 아님", () => {
  let s = createSession(assignment(), "초안", scores());
  s = recordRevision(s, "v2", scores({ "내용 충실도": 9 }), "내용 충실도", 8, 9);
  const log = buildProcessLog(s);
  assert.deepEqual(log.stuckAreas, []);
});

test("고쳐쓰기 전 세션은 stuckAreas가 비어 있다", () => {
  const s = createSession(assignment(), "초안", scores());
  assert.deepEqual(buildProcessLog(s).stuckAreas, []);
});
