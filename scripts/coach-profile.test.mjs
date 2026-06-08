// 연령/톤 분기 config 테스트 (T1.6). 코칭 로직은 순수·공유, 분기는 이 config로만(주니어 엔진 공유 seam).
// 실행: node --import ./scripts/register-ts.mjs --test scripts/coach-profile.test.mjs

import assert from "node:assert/strict";
import { test } from "node:test";
import { getAgeBand, getCoachProfile } from "../app/lib/coach-profile.ts";

test("중·고 학년 → middle_high", () => {
  assert.equal(getAgeBand("중1"), "middle_high");
  assert.equal(getAgeBand("중3"), "middle_high");
  assert.equal(getAgeBand("고3"), "middle_high");
});

test("초등 학년 → junior", () => {
  assert.equal(getAgeBand("초3"), "junior");
  assert.equal(getAgeBand("초6"), "junior");
});

test("알 수 없는 값 → middle_high(이 제품의 기본 대상)", () => {
  assert.equal(getAgeBand(""), "middle_high");
  assert.equal(getAgeBand("xyz"), "middle_high");
});

test("중·고 프로필 = 담백 코치 톤, 마스코트 없음", () => {
  const p = getCoachProfile("middle_high");
  assert.equal(p.ageBand, "middle_high");
  assert.equal(p.usesMascot, false);
  assert.equal(p.readingLevel, "middle_high");
  assert.ok(typeof p.toneDirective === "string" && p.toneDirective.length > 0);
});

test("주니어 프로필 = 푸리 마스코트, 초등 읽기 수준", () => {
  const p = getCoachProfile("junior");
  assert.equal(p.ageBand, "junior");
  assert.equal(p.usesMascot, true);
  assert.equal(p.readingLevel, "elementary");
});
