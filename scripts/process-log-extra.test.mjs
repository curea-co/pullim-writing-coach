import assert from "node:assert/strict";
import { test } from "node:test";
import { selectBreakthroughs, buildTimeline } from "../app/lib/process-log.ts";

const log = (stuck, perArea) => ({ revisions: 1, finalCharCount: 100, coachWroteSentences: false, authorIsStudent: true, perArea, stuckAreas: stuck });

test("돌파 = 막혔던 영역(stuck) 중 개선된(improved) 영역", () => {
  const r = selectBreakthroughs(log(["내용 충실도", "구조·논리"], [
    { area: "내용 충실도", baseline: 8, final: 15, improved: true },
    { area: "구조·논리", baseline: 9, final: 9, improved: false },
  ]));
  assert.deepEqual(r, ["내용 충실도"]); // 막혔지만 개선된 것만
});
test("막힌 영역 없거나 개선 없으면 빈 배열", () => {
  assert.deepEqual(selectBreakthroughs(log([], [])), []);
  assert.deepEqual(selectBreakthroughs(log(["표현·문장"], [{ area: "표현·문장", baseline: 5, final: 5, improved: false }])), []);
});

test("buildTimeline: draftHistory → n·charCount·delta (본문 절대 미포함)", () => {
  const session = { assignment: {}, baseline: [], areaScores: [], nudgeHistory: [],
    draftHistory: [ { n: 1, body: "비밀 초고 본문", charCount: 7 }, { n: 2, body: "더 긴 고친 본문 텍스트", charCount: 12 } ] };
  const t = buildTimeline(session);
  assert.deepEqual(t, [ { n: 1, charCount: 7, delta: 0 }, { n: 2, charCount: 12, delta: 5 } ]);
  // 각 노드의 키가 정확히 {n,charCount,delta}만 — body 키 자체가 존재하면 안 됨(강한 누출 가드).
  for (const node of t) {
    assert.deepEqual(Object.keys(node).sort(), ["charCount", "delta", "n"]);
    assert.equal("body" in node, false);
  }
  assert.equal(JSON.stringify(t).includes("본문"), false);
});

test("buildTimeline: 분량이 줄면 음수 delta", () => {
  const session = { assignment: {}, baseline: [], areaScores: [], nudgeHistory: [],
    draftHistory: [ { n: 1, body: "긴 초고", charCount: 200 }, { n: 2, body: "줄인 글", charCount: 150 } ] };
  assert.deepEqual(buildTimeline(session), [ { n: 1, charCount: 200, delta: 0 }, { n: 2, charCount: 150, delta: -50 } ]);
});
