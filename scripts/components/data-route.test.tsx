import { it, expect, vi, beforeEach } from "vitest";

// 2026-07-07 RDS 전환: 라우트는 pullim-api KV 표면 relay(db.ts)만 호출 — 인가도 relay가 판정.
//   getSessionSub 사전 조회는 제거됨(호출 2회→1회). 401은 PullimDataAuthError로 표현.
//   (vi.mock은 파일 최상단으로 호이스팅 — 클래스는 팩토리 안에서 정의해야 TDZ를 피함.)
vi.mock("@/app/lib/server/db", () => {
  class PullimDataAuthError extends Error {}
  return {
    getUserData: vi.fn(),
    setUserData: vi.fn(),
    deleteUserData: vi.fn(),
    deleteAllUserData: vi.fn(),
    isDataKey: (k: string) => ["profile", "results", "revisions", "drafts", "meta_usage", "consent"].includes(k),
    PullimDataAuthError,
  };
});

import { getUserData, setUserData, deleteUserData, deleteAllUserData, PullimDataAuthError } from "@/app/lib/server/db";
import { GET, PUT, DELETE as DELETE_KEY } from "@/app/api/data/[key]/route";
import { DELETE as DELETE_ALL } from "@/app/api/data/route";

const ctx = (key: string) => ({ params: Promise.resolve({ key }) });
const req = (body?: unknown) =>
  new Request("https://w/api/data/results", { method: "POST", body: body ? JSON.stringify(body) : undefined });

beforeEach(() => vi.clearAllMocks());

it("GET — relay가 세션 거부(PullimDataAuthError) → 401", async () => {
  (getUserData as any).mockRejectedValue(new PullimDataAuthError());
  const res = await GET(req(), ctx("results"));
  expect(res.status).toBe(401);
});

it("GET — 화이트리스트 외 key → 400 (relay 미호출)", async () => {
  const res = await GET(req(), ctx("hack"));
  expect(res.status).toBe(400);
  expect(getUserData).not.toHaveBeenCalled();
});

it("GET — payload 반환 (relay에 원본 Request 전달)", async () => {
  (getUserData as any).mockResolvedValue([{ id: "r1" }]);
  const r = req();
  const res = await GET(r, ctx("results"));
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ payload: [{ id: "r1" }] });
  expect(getUserData).toHaveBeenCalledWith(r, "results");
});

it("GET — relay 일반 실패 → 503(E8)", async () => {
  (getUserData as any).mockRejectedValue(new Error("[db] relay 502"));
  const res = await GET(req(), ctx("results"));
  expect(res.status).toBe(503);
});

it("PUT — payload 봉투를 relay로 전달", async () => {
  (setUserData as any).mockResolvedValue(undefined);
  const r = req({ payload: [{ id: "r1" }] });
  const res = await PUT(r, ctx("results"));
  expect(res.status).toBe(200);
  expect(setUserData).toHaveBeenCalledWith(r, "results", [{ id: "r1" }]);
});

it("PUT — relay 세션 거부 → 401", async () => {
  (setUserData as any).mockRejectedValue(new PullimDataAuthError());
  const res = await PUT(req({ payload: 1 }), ctx("results"));
  expect(res.status).toBe(401);
});

it("DELETE(단일 키) — deleteUserData 호출", async () => {
  (deleteUserData as any).mockResolvedValue(undefined);
  const r = req();
  const res = await DELETE_KEY(r, ctx("drafts"));
  expect(res.status).toBe(200);
  expect(deleteUserData).toHaveBeenCalledWith(r, "drafts");
});

it("DELETE(전체) — relay 세션 거부 → 401", async () => {
  (deleteAllUserData as any).mockRejectedValue(new PullimDataAuthError());
  expect((await DELETE_ALL(new Request("https://w/api/data", { method: "DELETE" }))).status).toBe(401);
});

it("DELETE(전체) — deleteAllUserData(req) 호출", async () => {
  (deleteAllUserData as any).mockResolvedValue(undefined);
  const r = new Request("https://w/api/data", { method: "DELETE" });
  const res = await DELETE_ALL(r);
  expect(res.status).toBe(200);
  expect(deleteAllUserData).toHaveBeenCalledWith(r);
});
