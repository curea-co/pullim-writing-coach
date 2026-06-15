// #4 왜 이 점수 — rubric-criteria 헬퍼 단위 테스트.
// 실행: node --import ./scripts/register-ts.mjs --test scripts/rubric-criteria.test.mjs

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AREA_CRITERIA,
  SCORE_BANDS,
  getScoreBand,
} from "../app/lib/rubric-criteria.ts";

test("5영역 모두 criteria 정의됨 + § 표기는 sectionRef만(meaning은 학생용)", () => {
  const expected = ["과제 이해", "내용 충실도", "구조·논리", "표현·문장", "성장 가능성"];
  for (const area of expected) {
    const c = AREA_CRITERIA[area];
    assert.ok(c, `${area} criteria 누락`);
    assert.match(c.sectionRef, /^§3\.[1-5]$/);
    assert.ok(c.meaning.length > 10);
    assert.ok(!c.meaning.includes("§"), `${area} meaning에 § 표기 노출 금지 (#15 컨벤션)`);
  }
});

test("SCORE_BANDS 4구간 — rubric §2 anchor 정합 (5~9 / 10~14 / 15~17 / 18~20)", () => {
  assert.equal(SCORE_BANDS.length, 4);
  const ranges = SCORE_BANDS.map((b) => [b.min, b.max]);
  assert.deepEqual(ranges, [[18, 20], [15, 17], [10, 14], [5, 9]]);
});

test("getScoreBand: 각 anchor 경계값", () => {
  assert.equal(getScoreBand(20).label, "우수");
  assert.equal(getScoreBand(18).label, "우수");
  assert.equal(getScoreBand(17).label, "양호");
  assert.equal(getScoreBand(15).label, "양호");
  assert.equal(getScoreBand(14).label, "보통");
  assert.equal(getScoreBand(10).label, "보통");
  assert.equal(getScoreBand(9).label, "미흡");
  assert.equal(getScoreBand(5).label, "미흡");
});

test("getScoreBand: 0~4 폴백 — 미흡으로 표시 (이상치 방어)", () => {
  assert.equal(getScoreBand(0).label, "미흡");
  assert.equal(getScoreBand(4).label, "미흡");
});
