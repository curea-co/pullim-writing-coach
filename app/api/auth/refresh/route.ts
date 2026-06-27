import { NextResponse, type NextRequest } from "next/server";
import { forwardToPullim, rewriteSetCookie, CSRF_HEADER, isInsecureRequest } from "@/app/lib/server/pullim-auth";

export async function POST(req: NextRequest) {
  const { status, setCookies } = await forwardToPullim("/auth/refresh", {
    method: "POST", cookie: req.headers.get("cookie"), csrf: req.headers.get(CSRF_HEADER),
  });
  const res = NextResponse.json({ ok: status === 200 }, { status });
  const insecure = isInsecureRequest(req);
  for (const c of setCookies) res.headers.append("set-cookie", rewriteSetCookie(c, { insecure }));
  return res;
}
