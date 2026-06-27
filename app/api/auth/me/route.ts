import { NextResponse, type NextRequest } from "next/server";
import { forwardToPullim } from "@/app/lib/server/pullim-auth";

// 현재 사용자 — access-cookie를 dev-api로 forward. 401/403이면 그대로 전달(클라가 게스트 처리).
export async function GET(req: NextRequest) {
  const { status, body } = await forwardToPullim("/me", { method: "GET", cookie: req.headers.get("cookie") });
  return NextResponse.json(status === 200 ? (body ?? {}) : { authenticated: false }, { status: status === 200 ? 200 : 200 });
}
