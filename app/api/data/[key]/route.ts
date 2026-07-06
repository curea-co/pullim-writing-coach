// GET/PUT/DELETE /api/data/[key] — per-user 계정 데이터 CRUD.
//   인가: getSessionSub(req) → sub 없으면 E-AUTH(401). data_key 화이트리스트 검증(E1).
//   row는 sub로만 스코프(타인 데이터 접근 불가). 자격증명·payload 로깅 금지.
import * as Sentry from "@sentry/nextjs";
import { getSessionSub } from "@/app/lib/server/pullim-session";
import { getUserData, setUserData, isDataKey } from "@/app/lib/server/db";
import { jsonError } from "../helpers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Ctx = { params: Promise<{ key: string }> };

async function resolve(req: Request, ctx: Ctx): Promise<{ sub: string; key: import("@/app/lib/server/db").DataKey } | Response> {
  const sub = await getSessionSub(req);
  if (!sub) return jsonError("E-AUTH");
  const { key } = await ctx.params;
  if (!isDataKey(key)) return jsonError("E1");
  return { sub, key };
}

export async function GET(req: Request, ctx: Ctx): Promise<Response> {
  const r = await resolve(req, ctx);
  if (r instanceof Response) return r;
  try {
    const payload = await getUserData(r.sub, r.key);
    return Response.json({ payload }, { status: 200 });
  } catch {
    // Constraint 7: 예외 객체(message·stack)를 Sentry로 보내지 않는다 — 사실(route·errorCode)만 tags로.
    Sentry.captureMessage("[/api/data/[key]] DB 작업 실패", {
      level: "error",
      tags: { route: "/api/data/[key]", errorCode: "E8" },
    });
    return jsonError("E8");
  }
}

export async function PUT(req: Request, ctx: Ctx): Promise<Response> {
  const r = await resolve(req, ctx);
  if (r instanceof Response) return r;
  let body: { payload?: unknown };
  try {
    body = (await req.json()) as { payload?: unknown };
  } catch {
    return jsonError("E-PARSE");
  }
  try {
    await setUserData(r.sub, r.key, body.payload ?? null);
    return Response.json({ ok: true }, { status: 200 });
  } catch {
    // Constraint 7: 예외 객체(message·stack)를 Sentry로 보내지 않는다 — 사실(route·errorCode)만 tags로.
    Sentry.captureMessage("[/api/data/[key]] DB 작업 실패", {
      level: "error",
      tags: { route: "/api/data/[key]", errorCode: "E8" },
    });
    return jsonError("E8");
  }
}

export async function DELETE(req: Request, ctx: Ctx): Promise<Response> {
  const r = await resolve(req, ctx);
  if (r instanceof Response) return r;
  try {
    await setUserData(r.sub, r.key, null); // 단일 키 비우기(전체 삭제는 /api/data DELETE)
    return Response.json({ ok: true }, { status: 200 });
  } catch {
    // Constraint 7: 예외 객체(message·stack)를 Sentry로 보내지 않는다 — 사실(route·errorCode)만 tags로.
    Sentry.captureMessage("[/api/data/[key]] DB 작업 실패", {
      level: "error",
      tags: { route: "/api/data/[key]", errorCode: "E8" },
    });
    return jsonError("E8");
  }
}
