import { it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";

const clearAllLocalStorage = vi.fn();
vi.mock("@/app/lib/storage", () => ({
  loadProfile: vi.fn().mockResolvedValue(null),
  saveProfile: vi.fn(),
  clearProfile: vi.fn().mockResolvedValue(undefined),
  clearDraft: vi.fn().mockResolvedValue(undefined),
  clearAllRevisions: vi.fn().mockResolvedValue(undefined),
  clearAllResults: vi.fn().mockResolvedValue(undefined),
  clearMetaUsage: vi.fn().mockResolvedValue(undefined),
  clearAllLocalStorage,
  consentNow: () => "2026-01-01T00:00:00+09:00",
}));
const clearConsent = vi.fn().mockResolvedValue(undefined);
vi.mock("@/app/lib/consent-store", () => ({ clearConsent }));

// MetaUsageCard는 storage를 추가로 호출 — 단순 stub로 격리.
vi.mock("@/app/components/MetaUsageCard", () => ({ default: () => null }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

let authStatus: "authed" | "guest" = "authed";
vi.mock("@/app/lib/use-auth", () => ({
  useAuth: () => ({ status: authStatus, user: { displayName: "민수" }, refresh: vi.fn() }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  globalThis.fetch = vi.fn().mockResolvedValue({ status: 200, json: async () => ({ ok: true }) });
});

async function clickDeleteFlow() {
  fireEvent.click(await screen.findByRole("button", { name: "데이터 삭제하기" }));
  fireEvent.click(await screen.findByRole("button", { name: "네, 삭제할게요" }));
}

it("authed 삭제 — DELETE /api/data(전체) 1회 호출, 개별 /api/data/[key] 미호출", async () => {
  authStatus = "authed";
  const Page = (await import("@/app/me/page")).default;
  render(<Page />);
  await clickDeleteFlow();
  await waitFor(() =>
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/data",
      expect.objectContaining({ method: "DELETE", credentials: "include" }),
    ),
  );
  const calls = (globalThis.fetch as any).mock.calls.map((c: any[]) => c[0]);
  expect(calls.filter((u: string) => u === "/api/data").length).toBe(1);
  expect(calls.some((u: string) => /^\/api\/data\/[^/]+$/.test(u))).toBe(false);
});

it("authed 삭제 — 로컬 흔적 정리(clearAllLocalStorage), 개별 clear*는 미호출", async () => {
  authStatus = "authed";
  const storage = await import("@/app/lib/storage");
  const Page = (await import("@/app/me/page")).default;
  render(<Page />);
  await clickDeleteFlow();
  await waitFor(() => expect(clearAllLocalStorage).toHaveBeenCalled());
  expect(storage.clearProfile).not.toHaveBeenCalled();
});

it("guest 삭제 — clear* 5종 + clearConsent 호출, DELETE /api/data 미호출", async () => {
  authStatus = "guest";
  const storage = await import("@/app/lib/storage");
  const Page = (await import("@/app/me/page")).default;
  render(<Page />);
  await clickDeleteFlow();
  await waitFor(() => expect(clearConsent).toHaveBeenCalled());
  expect(storage.clearProfile).toHaveBeenCalled();
  expect(storage.clearDraft).toHaveBeenCalled();
  expect(storage.clearAllRevisions).toHaveBeenCalled();
  expect(storage.clearAllResults).toHaveBeenCalled();
  expect(storage.clearMetaUsage).toHaveBeenCalled();
  const calls = (globalThis.fetch as any).mock.calls.map((c: any[]) => c[0]);
  expect(calls.includes("/api/data")).toBe(false);
});
