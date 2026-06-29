// DELETE /api/data — 계정 전체 데이터 삭제(deleteAllUserData). "데이터 삭제" 서버 연동.
import * as Sentry from "@sentry/nextjs";
import { getSessionSub } from "@/app/lib/server/pullim-session";
import { deleteAllUserData } from "@/app/lib/server/db";
import { jsonError } from "./helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function DELETE(req: Request): Promise<Response> {
  const sub = await getSessionSub(req);
  if (!sub) return jsonError("E-AUTH");
  try {
    await deleteAllUserData(sub);
    return Response.json({ ok: true }, { status: 200 });
  } catch (e) {
    Sentry.captureException(e, { tags: { route: "/api/data", errorCode: "E8" } });
    return jsonError("E8");
  }
}
