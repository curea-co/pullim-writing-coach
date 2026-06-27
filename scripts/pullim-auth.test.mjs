import assert from "node:assert/strict";
import { test } from "node:test";
import { rewriteSetCookie, mapLoginError, filterCookies } from "../app/lib/server/pullim-auth.ts";

test("rewriteSetCookie: Domain 제거 + refresh Path /auth→/api/auth + httpOnly 보존", () => {
  const at = rewriteSetCookie("dev-pullim-at=abc; Path=/; Domain=dev-api.pullim.ai; HttpOnly; Secure; SameSite=Lax");
  assert.equal(/Domain=/i.test(at), false);          // Domain 제거(우리 origin host-only)
  assert.ok(/HttpOnly/i.test(at) && /Secure/i.test(at)); // 보안 속성 보존
  assert.ok(/dev-pullim-at=abc/.test(at));
  const rt = rewriteSetCookie("dev-pullim-rt=xyz; Path=/auth; Domain=dev-api.pullim.ai; HttpOnly");
  assert.ok(/Path=\/api\/auth/.test(rt));             // refresh Path 매핑
});
test("mapLoginError: 401→자격불일치, 403→CSRF, 그외→일반", () => {
  assert.match(mapLoginError(401), /일치하지/);
  assert.match(mapLoginError(403), /보안|다시/);
  assert.match(mapLoginError(500), /실패|잠시/);
});
test("filterCookies: dev-pullim-* 세션·CSRF만 통과, 임의 쿠키 제거", () => {
  const out = filterCookies("dev-pullim-at=a; analytics=zzz; dev-pullim-rt=b; pwc-demo-token=t; dev-pullim-csrf=c");
  assert.ok(/dev-pullim-at=a/.test(out) && /dev-pullim-rt=b/.test(out) && /dev-pullim-csrf=c/.test(out));
  assert.equal(/analytics|pwc-demo-token/.test(out), false); // 외부 백엔드로 유출 안 됨
  assert.equal(filterCookies(null), "");
});
