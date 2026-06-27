import { NextResponse, type NextRequest } from "next/server";
import { forwardToPullim, rewriteSetCookie, mapLoginError, CSRF_HEADER, isInsecureRequest } from "@/app/lib/server/pullim-auth";

// email/pw 로그인 프록시. 브라우저 쿠키(CSRF 쿠키 포함)+CSRF 헤더를 dev-api로 forward, 세션 쿠키 relay.
//   자격증명은 로깅하지 않는다.
export async function POST(req: NextRequest) {
  let payload: { email?: unknown; password?: unknown };
  try { payload = await req.json(); } catch { return NextResponse.json({ message: "입력 형식을 확인해 주세요." }, { status: 400 }); }
  const email = typeof payload.email === "string" ? payload.email : "";
  const password = typeof payload.password === "string" ? payload.password : "";
  if (!email || !password) return NextResponse.json({ message: "이메일과 비밀번호를 입력해 주세요." }, { status: 400 });

  const { status, setCookies } = await forwardToPullim("/auth/login", {
    method: "POST",
    jsonBody: { email, password },
    cookie: req.headers.get("cookie"),
    csrf: req.headers.get(CSRF_HEADER),
  });
  if (status >= 400) return NextResponse.json({ message: mapLoginError(status) }, { status });
  const res = NextResponse.json({ ok: true }, { status: 200 });
  const insecure = isInsecureRequest(req);
  for (const c of setCookies) res.headers.append("set-cookie", rewriteSetCookie(c, { insecure }));
  return res;
}
