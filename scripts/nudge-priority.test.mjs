// quick-win 우선순위 테스트 (T1.4). 여러 nudge 중 "향상 폭 크고(=점수 낮아 room 큼) 쉬운 것" 먼저.
// MVP 휴리스틱: 1차=내부 area 점수 낮은 순(room), 동점 시 모델 quick_win_rank 힌트. (DECISION NEEDED 유지)
// 실행: node --import ./scripts/register-ts.mjs --test scripts/nudge-priority.test.mjs

import assert from "node:assert/strict";
import { test } from "node:test";
import { prioritizeNudges, topNudge } from "../app/lib/nudge-priority.ts";

const areaScores = [
  { area: "과제 이해", score: 16 },
  { area: "내용 충실도", score: 8 },
  { area: "구조·논리", score: 12 },
  { area: "표현·문장", score: 15 },
  { area: "성장 가능성", score: 12 },
];

const nudge = (rubric_area, quick_win_rank, paragraph_index = 0) => ({
  paragraph_index,
  rubric_area,
  diagnosis: "d",
  guiding_question: "q?",
  quick_win_rank,
});

test("점수 낮은 영역(room 큼)을 먼저", () => {
  const got = prioritizeNudges([nudge("표현·문장", 1), nudge("내용 충실도", 1)], areaScores);
  assert.equal(got[0].rubric_area, "내용 충실도"); // 8점 < 15점 → room 큼
  assert.equal(got[1].rubric_area, "표현·문장");
});

test("같은 영역 점수면 quick_win_rank 낮은 것 먼저", () => {
  const got = prioritizeNudges([nudge("구조·논리", 3), nudge("구조·논리", 1)], areaScores);
  assert.equal(got[0].quick_win_rank, 1);
  assert.equal(got[1].quick_win_rank, 3);
});

test("모든 nudge를 보존(개수 동일)", () => {
  const got = prioritizeNudges([nudge("과제 이해", 1), nudge("내용 충실도", 2), nudge("구조·논리", 1)], areaScores);
  assert.equal(got.length, 3);
});

test("빈 입력 → 빈 배열", () => {
  assert.deepEqual(prioritizeNudges([], areaScores), []);
});

test("area 점수가 없으면 후순위로", () => {
  const got = prioritizeNudges([nudge("성장 가능성", 1), nudge("맞춤법", 1)], areaScores);
  assert.equal(got[0].rubric_area, "성장 가능성"); // 점수 있음(12) → room 8
  assert.equal(got[1].rubric_area, "맞춤법"); // 점수 없음 → room 0, 후순위
});

test("입력 배열을 변형하지 않음", () => {
  const input = [nudge("표현·문장", 1), nudge("내용 충실도", 1)];
  const snapshot = input.map((n) => n.rubric_area);
  prioritizeNudges(input, areaScores);
  assert.deepEqual(input.map((n) => n.rubric_area), snapshot);
});

test("topNudge는 1순위 하나, 빈 입력은 null", () => {
  const top = topNudge([nudge("표현·문장", 1), nudge("내용 충실도", 1)], areaScores);
  assert.equal(top.rubric_area, "내용 충실도");
  assert.equal(topNudge([], areaScores), null);
});
