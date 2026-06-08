// 성장 막대 매핑 테스트 (T1.5). 0~20 점수를 막대 fill로 — 화면엔 수치 숨기고 막대만(락 UX).
// 실행: node --import ./scripts/register-ts.mjs --test scripts/growth-bar.test.mjs

import assert from "node:assert/strict";
import { test } from "node:test";
import { growthBar, toBarFill, toBarSegments } from "../app/lib/revision.ts";

test("toBarFill: 점수/최대 비율(0~1)", () => {
  assert.equal(toBarFill(10, 20), 0.5);
  assert.equal(toBarFill(5), 0.25); // 기본 max 20
});

test("toBarFill: 0~1로 클램프", () => {
  assert.equal(toBarFill(25, 20), 1);
  assert.equal(toBarFill(-3, 20), 0);
});

test("toBarSegments: 이산 칸 수(기본 5칸)", () => {
  assert.equal(toBarSegments(8, 20, 5), 2); // 40% → 2칸 (전 ▰▰▱▱▱)
  assert.equal(toBarSegments(16, 20, 5), 4); // 80% → 4칸 (후 ▰▰▰▰▱)
  assert.equal(toBarSegments(20, 20, 5), 5);
  assert.equal(toBarSegments(0, 20, 5), 0);
});

test("growthBar: 전/후 fill + improved", () => {
  const g = growthBar(8, 16);
  assert.equal(g.beforeFill, 0.4);
  assert.equal(g.afterFill, 0.8);
  assert.equal(g.improved, true);
});

test("growthBar: 변화 없으면 improved=false", () => {
  assert.equal(growthBar(12, 12).improved, false);
});

test("growthBar: 원점수를 노출하지 않는다(수치 숨김 계약)", () => {
  const g = growthBar(8, 16);
  assert.deepEqual(Object.keys(g).sort(), ["afterFill", "beforeFill", "improved"]);
});
