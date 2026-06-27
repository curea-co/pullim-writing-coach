import { NextResponse, type NextRequest } from "next/server";
import { forwardToPullim, rewriteSetCookie, isInsecureRequest } from "@/app/lib/server/pullim-auth";

// dev-api CSRF 부트스트랩 프록시 — CSRF 쿠키를 우리 origin으로 relay + 토큰 body 통과.
export async function GET(req: NextRequest) {
  const { status, body, setCookies } = await forwardToPullim("/auth/csrf", { method: "GET" });
  const res = NextResponse.json(body ?? {}, { status });
  const insecure = isInsecureRequest(req);
  for (const c of setCookies) res.headers.append("set-cookie", rewriteSetCookie(c, { insecure }));
  return res;
}
