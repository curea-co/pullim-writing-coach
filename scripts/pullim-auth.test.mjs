import assert from "node:assert/strict";
import { test } from "node:test";
import { rewriteSetCookie, mapLoginError, filterCookies, isInsecureRequest } from "../app/lib/server/pullim-auth.ts";

test("rewriteSetCookie: Domain 제거 + refresh Path /auth→/api/auth + httpOnly 보존", () => {
  const at = rewriteSetCookie("dev-pullim-at=abc; Path=/; Domain=dev-api.pullim.ai; HttpOnly; Secure; SameSite=Lax");
  assert.equal(/Domain=/i.test(at), false);          // Domain 제거(우리 origin host-only)
  assert.ok(/HttpOnly/i.test(at) && /Secure/i.test(at)); // 보안 속성 보존
  assert.ok(/dev-pullim-at=abc/.test(at));
  const rt = rewriteSetCookie("dev-pullim-rt=xyz; Path=/auth; Domain=dev-api.pullim.ai; HttpOnly");
  assert.ok(/Path=\/api\/auth/.test(rt));             // refresh Path 매핑
});
test("rewriteSetCookie: insecure 시 Secure 제거(비프로덕션 HTTP origin 쿠키 저장)", () => {
  const sec = rewriteSetCookie("dev-pullim-at=a; Path=/; HttpOnly; Secure; SameSite=Lax");
  assert.ok(/Secure/.test(sec));                       // 기본은 Secure 보존
  const insec = rewriteSetCookie("dev-pullim-at=a; Path=/; HttpOnly; Secure; SameSite=Lax", { insecure: true });
  assert.equal(/Secure/i.test(insec), false);          // insecure면 Secure 제거
  assert.ok(/HttpOnly/.test(insec));                   // HttpOnly는 유지
});
test("mapLoginError: 401→자격불일치, 403→CSRF, 그외→일반", () => {
  assert.match(mapLoginError(401), /일치하지/);
  assert.match(mapLoginError(403), /보안|다시/);
  assert.match(mapLoginError(500), /실패|잠시/);
});
test("filterCookies: dev-pullim-* 세션·CSRF만 통과, 임의 쿠키 제거 + 엔드포인트별 좁히기", () => {
  const header = "dev-pullim-at=a; analytics=zzz; dev-pullim-rt=b; pwc-demo-token=t; dev-pullim-csrf=c";
  const all = filterCookies(header);
  assert.ok(/dev-pullim-at=a/.test(all) && /dev-pullim-rt=b/.test(all) && /dev-pullim-csrf=c/.test(all));
  assert.equal(/analytics|pwc-demo-token/.test(all), false); // 외부 백엔드로 유출 안 됨
  // 엔드포인트별 scope: 로그인은 CSRF만
  const onlyCsrf = filterCookies(header, ["dev-pullim-csrf"]);
  assert.equal(onlyCsrf, "dev-pullim-csrf=c");
  assert.equal(filterCookies(null), "");
});
test("isInsecureRequest: xfp 권위 + 프록시 뒤 https 다운그레이드 방지", () => {
  const req = (url, xfp) => ({ url, headers: { get: (n) => (n === "x-forwarded-proto" ? xfp : null) } });
  assert.equal(isInsecureRequest(req("http://x/", "https")), false); // xfp=https → secure 유지(프록시 뒤 https)
  assert.equal(isInsecureRequest(req("https://x/", "http")), true);  // xfp=http → insecure
  assert.equal(isInsecureRequest(req("http://localhost:3000/", null)), true);   // xfp 없음 + localhost http → insecure
  assert.equal(isInsecureRequest(req("http://192.168.0.5/", null)), false);     // xfp 없음 + 비localhost → secure 유지(다운그레이드 방지)
});
