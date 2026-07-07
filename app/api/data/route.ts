// DELETE /api/data — 계정 전체 데이터 삭제. "데이터 삭제" 서버 연동.
//   저장소 = pullim-api KV 표면 relay(db.ts). 인가는 relay가 판정(401 = E-AUTH) — 2026-07-07 RDS 전환.
import * as Sentry from "@sentry/nextjs";
import { deleteAllUserData, PullimDataAuthError } from "@/app/lib/server/db";
import { jsonError } from "./helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function DELETE(req: Request): Promise<Response> {
  try {
    await deleteAllUserData(req);
    return Response.json({ ok: true }, { status: 200 });
  } catch (e) {
    if (e instanceof PullimDataAuthError) return jsonError("E-AUTH");
    // Constraint 7: 예외 객체(message·stack)를 Sentry로 보내지 않는다 — 사실(route·errorCode)만 tags로.
    Sentry.captureMessage("[/api/data] 데이터 relay 실패", {
      level: "error",
      tags: { route: "/api/data", errorCode: "E8" },
    });
    return jsonError("E8");
  }
}
