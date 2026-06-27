import { NextResponse } from "next/server";
import { forwardToPullim, rewriteSetCookie } from "@/app/lib/server/pullim-auth";

// dev-api CSRF 부트스트랩 프록시 — CSRF 쿠키를 우리 origin으로 relay + 토큰 body 통과.
export async function GET() {
  const { status, body, setCookies } = await forwardToPullim("/auth/csrf", { method: "GET" });
  const res = NextResponse.json(body ?? {}, { status });
  for (const c of setCookies) res.headers.append("set-cookie", rewriteSetCookie(c));
  return res;
}
