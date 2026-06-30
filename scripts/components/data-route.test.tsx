import { it, expect, vi, beforeEach } from "vitest";

vi.mock("@/app/lib/server/pullim-session", () => ({ getSessionSub: vi.fn() }));
vi.mock("@/app/lib/server/db", () => ({
  getUserData: vi.fn(),
  setUserData: vi.fn(),
  deleteAllUserData: vi.fn(),
  isDataKey: (k: string) => ["profile", "results", "revisions", "drafts", "meta_usage", "consent"].includes(k),
}));

import { getSessionSub } from "@/app/lib/server/pullim-session";
import { getUserData, setUserData, deleteAllUserData } from "@/app/lib/server/db";
import { GET, PUT } from "@/app/api/data/[key]/route";
import { DELETE as DELETE_ALL } from "@/app/api/data/route";

const ctx = (key: string) => ({ params: Promise.resolve({ key }) });
const req = (body?: unknown) =>
  new Request("https://w/api/data/results", { method: "POST", body: body ? JSON.stringify(body) : undefined });

beforeEach(() => vi.clearAllMocks());

it("GET — sub 없으면 401", async () => {
  (getSessionSub as any).mockResolvedValue(null);
  const res = await GET(req(), ctx("results"));
  expect(res.status).toBe(401);
});

it("GET — 화이트리스트 외 key → 400", async () => {
  (getSessionSub as any).mockResolvedValue("user-a");
  const res = await GET(req(), ctx("hack"));
  expect(res.status).toBe(400);
});

it("GET — sub 스코프로 payload 반환", async () => {
  (getSessionSub as any).mockResolvedValue("user-a");
  (getUserData as any).mockResolvedValue([{ id: "r1" }]);
  const res = await GET(req(), ctx("results"));
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ payload: [{ id: "r1" }] });
  expect(getUserData).toHaveBeenCalledWith("user-a", "results");
});

it("PUT — payload upsert(sub 스코프)", async () => {
  (getSessionSub as any).mockResolvedValue("user-a");
  (setUserData as any).mockResolvedValue(undefined);
  const res = await PUT(req({ payload: [{ id: "r1" }] }), ctx("results"));
  expect(res.status).toBe(200);
  expect(setUserData).toHaveBeenCalledWith("user-a", "results", [{ id: "r1" }]);
});

it("DELETE(전체) — sub 없으면 401", async () => {
  (getSessionSub as any).mockResolvedValue(null);
  expect((await DELETE_ALL(new Request("https://w/api/data", { method: "DELETE" }))).status).toBe(401);
});

it("DELETE(전체) — deleteAllUserData(sub) 호출", async () => {
  (getSessionSub as any).mockResolvedValue("user-a");
  (deleteAllUserData as any).mockResolvedValue(undefined);
  const res = await DELETE_ALL(new Request("https://w/api/data", { method: "DELETE" }));
  expect(res.status).toBe(200);
  expect(deleteAllUserData).toHaveBeenCalledWith("user-a");
});
