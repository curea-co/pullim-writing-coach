// GET/PUT/DELETE /api/data/[key] — per-user 계정 데이터 CRUD.
//   저장소 = pullim-api KV 표면 relay(db.ts). 인가는 relay가 판정(쿠키 릴레이 → 401 = E-AUTH) —
//   getSessionSub 사전 조회를 없애 pullim-api 호출을 op당 2회→1회로 줄임(2026-07-07 RDS 전환).
//   data_key 화이트리스트 검증(E1). 데이터는 pullim-api가 sub(토큰)로만 스코프. 자격증명·payload 로깅 금지.
import * as Sentry from "@sentry/nextjs";
import { getUserData, setUserData, deleteUserData, isDataKey, PullimDataAuthError } from "@/app/lib/server/db";
import { jsonError } from "../helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Ctx = { params: Promise<{ key: string }> };

async function keyOf(ctx: Ctx): Promise<import("@/app/lib/server/db").DataKey | Response> {
  const { key } = await ctx.params;
  if (!isDataKey(key)) return jsonError("E1");
  return key;
}

// relay 실패 공통 매핑: 세션 거부(401) = E-AUTH, 그 외 = E8.
//   Constraint 7: 예외 객체(message·stack)를 Sentry로 보내지 않는다 — 사실(route·errorCode)만 tags로.
function mapRelayError(e: unknown): Response {
  if (e instanceof PullimDataAuthError) return jsonError("E-AUTH");
  Sentry.captureMessage("[/api/data/[key]] 데이터 relay 실패", {
    level: "error",
    tags: { route: "/api/data/[key]", errorCode: "E8" },
  });
  return jsonError("E8");
}

export async function GET(req: Request, ctx: Ctx): Promise<Response> {
  const key = await keyOf(ctx);
  if (key instanceof Response) return key;
  try {
    const payload = await getUserData(req, key);
    return Response.json({ payload }, { status: 200 });
  } catch (e) {
    return mapRelayError(e);
  }
}

export async function PUT(req: Request, ctx: Ctx): Promise<Response> {
  const key = await keyOf(ctx);
  if (key instanceof Response) return key;
  let body: { payload?: unknown };
  try {
    body = (await req.json()) as { payload?: unknown };
  } catch {
    return jsonError("E-PARSE");
  }
  try {
    await setUserData(req, key, body.payload ?? null);
    return Response.json({ ok: true }, { status: 200 });
  } catch (e) {
    return mapRelayError(e);
  }
}

export async function DELETE(req: Request, ctx: Ctx): Promise<Response> {
  const key = await keyOf(ctx);
  if (key instanceof Response) return key;
  try {
    await deleteUserData(req, key); // 단일 키 삭제(전체 삭제는 /api/data DELETE)
    return Response.json({ ok: true }, { status: 200 });
  } catch (e) {
    return mapRelayError(e);
  }
}
