// GET/PUT/DELETE /api/data/[key] — per-user 계정 데이터 CRUD.
//   저장소 = pullim-api KV 표면 relay(db.ts). 인가는 relay가 판정(쿠키 릴레이 → 401 = E-AUTH) —
//   getSessionSub 사전 조회를 없애 pullim-api 호출을 op당 2회→1회로 줄임(2026-07-07 RDS 전환).
//   data_key 화이트리스트 검증(E1). 데이터는 pullim-api가 sub(토큰)로만 스코프. 자격증명·payload 로깅 금지.
import * as Sentry from "@sentry/nextjs";
import { getUserData, setUserData, deleteUserData, isDataKey, PullimDataAuthError } from "@/app/lib/server/db";
import { withServerQuota } from "@/app/lib/quota-core";
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
    let payload = body.payload ?? null;
    if (key === "meta_usage") {
      // 서버 권위 _quota 머지(Codex #143 3R) — 클라 stale 스냅샷/위조 payload가 무료 1일 카운터를
      //   되돌리지 못하게, 쓰기 직전 서버 현재값의 _quota를 강제한다. 읽기 실패는 fail-open(클라
      //   payload 그대로 — 쿼터 인프라 장애가 메타 저장 실패로 번지지 않게, quota.ts와 동일 원칙).
      try {
        payload = (withServerQuota(payload, await getUserData(req, key)) ?? null) as typeof payload;
      } catch {
        console.warn("[/api/data] meta_usage _quota 권위 머지 실패 — fail-open(클라 payload 통과)");
      }
    }
    await setUserData(req, key, payload);
    return Response.json({ ok: true }, { status: 200 });
  } catch (e) {
    return mapRelayError(e);
  }
}

export async function DELETE(req: Request, ctx: Ctx): Promise<Response> {
  const key = await keyOf(ctx);
  if (key instanceof Response) return key;
  try {
    if (key === "meta_usage") {
      // 삭제도 서버 권위 _quota 보존(Codex #143 4R) — 통삭제를 허용하면 인증된 사용자가
      //   DELETE 한 번으로 당일 무료 카운터를 초기화한다. 메타 내용만 비우고 _quota는 유지
      //   (withServerQuota(null, 현재값)). _quota가 없으면 일반 삭제. 읽기 실패는 fail-open(일반 삭제 —
      //   쿼터 인프라 장애가 사용자 데이터 삭제 요청을 막지 않게).
      let current: unknown = null;
      try {
        current = await getUserData(req, key);
      } catch {
        current = null;
      }
      const preserved = withServerQuota(null, current);
      if (preserved !== null) {
        await setUserData(req, key, preserved);
        return Response.json({ ok: true }, { status: 200 });
      }
    }
    await deleteUserData(req, key); // 단일 키 삭제(전체 삭제는 /api/data DELETE)
    return Response.json({ ok: true }, { status: 200 });
  } catch (e) {
    return mapRelayError(e);
  }
}
