import { NextResponse, type NextRequest } from "next/server";
import { forwardToPullim, rewriteSetCookie, CSRF_HEADER, COOKIE_AT, COOKIE_RT, isInsecureRequest } from "@/app/lib/server/pullim-auth";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) {
  const { setCookies } = await forwardToPullim("/auth/logout", {
    method: "POST", cookie: req.headers.get("cookie"), csrf: req.headers.get(CSRF_HEADER),
  });
  const res = NextResponse.json({ ok: true }, { status: 200 });
  const insecure = isInsecureRequest(req);
  const sec = insecure ? "" : " Secure;"; // 비프로덕션 HTTP에서는 만료 쿠키도 Secure 제거(브라우저가 적용하도록)
  // dev-api가 만료 쿠키를 보내면 relay, 아니면 우리 쪽에서도 즉시 만료.
  for (const c of setCookies) res.headers.append("set-cookie", rewriteSetCookie(c, { insecure }));
  res.headers.append("set-cookie", `${COOKIE_AT}=; Path=/; Max-Age=0; HttpOnly;${sec} SameSite=Lax`);
  res.headers.append("set-cookie", `${COOKIE_RT}=; Path=/api/auth; Max-Age=0; HttpOnly;${sec} SameSite=Lax`);
  return res;
}
