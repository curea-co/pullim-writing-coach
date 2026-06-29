// /api/data helpers 단위 테스트 — jsonError가 grading 봉투/상태코드를 올바로 매핑하는지 검증.
//   실행: node --import ./scripts/register-ts.mjs --test scripts/data-route-helpers.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
const { jsonError } = await import("../app/api/data/helpers.ts");

test("jsonError — E-AUTH는 401 + 봉투", async () => {
  const res = jsonError("E-AUTH");
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.error.code, "E-AUTH");
});
test("jsonError — E1은 400", () => {
  assert.equal(jsonError("E1").status, 400);
});
