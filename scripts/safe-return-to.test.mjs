import assert from "node:assert/strict";
import { test } from "node:test";
import { safeReturnTo } from "../app/lib/safe-return-to.ts";

test("safeReturnTo: same-origin 경로만 통과, 외부/비정상은 홈으로", () => {
  assert.equal(safeReturnTo("/coach"), "/coach");
  assert.equal(safeReturnTo("/results?id=1"), "/results?id=1");
  // open redirect 방지
  assert.equal(safeReturnTo("//evil.com"), "/");
  assert.equal(safeReturnTo("/\\evil.com"), "/");
  assert.equal(safeReturnTo("https://evil.com"), "/");
  assert.equal(safeReturnTo("evil"), "/");
  assert.equal(safeReturnTo(null), "/");
  assert.equal(safeReturnTo(undefined), "/");
});
