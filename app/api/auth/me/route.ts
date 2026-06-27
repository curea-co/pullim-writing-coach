import { NextResponse, type NextRequest } from "next/server";
import { forwardToPullim, COOKIE_AT } from "@/app/lib/server/pullim-auth";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// 현재 사용자 — access-cookie를 dev-api로 forward.
//   200 → 사용자. 401/403만 게스트로 정규화(200 + authenticated:false). 그 외(5xx 등)는 마스킹하지 않고
//   상태를 그대로 전달 — 인증서버 장애를 단순 로그아웃으로 오인·은폐하지 않는다.
export async function GET(req: NextRequest) {
  const { status, body } = await forwardToPullim("/me", { method: "GET", cookie: req.headers.get("cookie"), cookieNames: [COOKIE_AT] });
  if (status === 200) return NextResponse.json(body ?? {}, { status: 200 });
  if (status === 401 || status === 403) return NextResponse.json({ authenticated: false }, { status: 200 });
  return NextResponse.json({ error: true }, { status });
}
