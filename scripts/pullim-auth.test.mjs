import assert from "node:assert/strict";
import { test } from "node:test";
import { filterCookies, COOKIE_AT } from "../app/lib/server/pullim-auth.ts";

test("filterCookies: 기본은 access(dev-pullim-at)만 통과, 임의 쿠키 제거", () => {
  const header = "dev-pullim-at=a; analytics=zzz; dev-pullim-rt=b; pwc-demo-token=t; dev-pullim-csrf=c";
  const out = filterCookies(header);
  assert.equal(out, `${COOKIE_AT}=a`);                 // /me는 access만 — rt/csrf/임의 쿠키 미전달
  assert.equal(/analytics|pwc-demo-token/.test(out), false); // 외부 백엔드로 유출 안 됨
  assert.equal(filterCookies(null), "");
});
test("filterCookies: names 지정 시 해당 쿠키만 통과", () => {
  const out = filterCookies("dev-pullim-at=a; dev-pullim-rt=b", ["dev-pullim-rt"]);
  assert.equal(out, "dev-pullim-rt=b");
});
