import { NextResponse, type NextRequest } from "next/server";
import { forwardToPullim } from "@/app/lib/server/pullim-auth";


export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// dev 전용 테스트 회원 시드(KCB 우회). prod는 라우트 자체를 404로 미노출(dev-api 동형).
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") return new NextResponse("Not Found", { status: 404 });
  let body: { email?: unknown; password?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ message: "형식 오류" }, { status: 400 }); }
  const { status, body: out } = await forwardToPullim("/auth/dev/seed-member", {
    method: "POST", jsonBody: { email: body.email, password: body.password },
  });
  return NextResponse.json(out ?? {}, { status });
}
