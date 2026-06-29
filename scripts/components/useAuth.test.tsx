import { it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/app/lib/use-auth";

function Probe() { const { status, user } = useAuth(); return <div>{status}:{user?.displayName ?? "-"}</div>; }
beforeEach(() => { globalThis.fetch = vi.fn(); });

it("me 200 → authed + displayName", async () => {
  (globalThis.fetch as any).mockResolvedValue({ ok: true, status: 200, json: async () => ({ displayName: "민수" }) });
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(screen.getByText(/authed:민수/)).toBeInTheDocument());
});
it("me 200 + name만 있어도 authed", async () => {
  (globalThis.fetch as any).mockResolvedValue({ ok: true, status: 200, json: async () => ({ name: "홍길동" }) });
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(screen.getByText(/^authed:/)).toBeInTheDocument());
});
it("me 401 → guest (미로그인)", async () => {
  (globalThis.fetch as any).mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(screen.getByText(/guest:-/)).toBeInTheDocument());
});
it("me 5xx(인증서버 장애) → error (게스트로 단정 안 함)", async () => {
  (globalThis.fetch as any).mockResolvedValue({ ok: false, status: 502, json: async () => ({ error: true }) });
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(screen.getByText(/^error:-/)).toBeInTheDocument());
});

// ── ITEM 2: 토큰 회전 (me 401 → csrf → refresh → me 재시도) ──────────────
// URL/순서 기반 분기 — 단일 mockResolvedValue로는 표현 불가.
function routedFetch(handlers: { meSeq?: any[]; csrf?: any; refresh?: any }) {
  let meCall = 0;
  return vi.fn(async (url: any, _opts?: any) => {
    const u = String(url);
    if (u.includes("/auth/csrf")) return handlers.csrf;
    if (u.includes("/auth/refresh")) return handlers.refresh;
    if (u.includes("/me")) {
      const r = handlers.meSeq?.[meCall] ?? handlers.meSeq?.[handlers.meSeq.length - 1];
      meCall += 1;
      return r;
    }
    throw new Error(`unexpected url ${u}`);
  });
}

it("me401 → csrf200 → refresh200 → me재시도200 → authed (회전 성공)", async () => {
  globalThis.fetch = routedFetch({
    meSeq: [
      { ok: false, status: 401, json: async () => ({}) },
      { ok: true, status: 200, json: async () => ({ displayName: "회전성공" }) },
    ],
    csrf: { ok: true, status: 200, json: async () => ({ csrfToken: "csrf-abc" }) },
    refresh: { ok: true, status: 200, json: async () => ({}) },
  });
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(screen.getByText(/authed:회전성공/)).toBeInTheDocument());
  // x-csrf-token 헤더가 refresh 호출에 전달됐는지 검증
  const calls = (globalThis.fetch as any).mock.calls as any[];
  const refreshCall = calls.find((c) => String(c[0]).includes("/auth/refresh"));
  expect(refreshCall[1].method).toBe("POST");
  expect(refreshCall[1].headers["x-csrf-token"]).toBe("csrf-abc");
});

it("me401 → csrf200 → refresh401 → guest (회전 실패)", async () => {
  globalThis.fetch = routedFetch({
    meSeq: [{ ok: false, status: 401, json: async () => ({}) }],
    csrf: { ok: true, status: 200, json: async () => ({ csrfToken: "csrf-abc" }) },
    refresh: { ok: false, status: 401, json: async () => ({}) },
  });
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(screen.getByText(/guest:-/)).toBeInTheDocument());
});

it("me401 → csrf 토큰 없음 → 회전 안 함 → guest", async () => {
  const fetchMock = routedFetch({
    meSeq: [{ ok: false, status: 401, json: async () => ({}) }],
    csrf: { ok: true, status: 200, json: async () => ({}) }, // csrfToken 없음
    refresh: { ok: true, status: 200, json: async () => ({}) },
  });
  globalThis.fetch = fetchMock;
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(screen.getByText(/guest:-/)).toBeInTheDocument());
  // csrf 못 받으면 refresh 호출 안 함
  const calls = (fetchMock as any).mock.calls as any[];
  expect(calls.some((c) => String(c[0]).includes("/auth/refresh"))).toBe(false);
});

it("me401 → csrf200 → refresh5xx → error (인증서버 장애 은폐 안 함)", async () => {
  globalThis.fetch = routedFetch({
    meSeq: [{ ok: false, status: 401, json: async () => ({}) }],
    csrf: { ok: true, status: 200, json: async () => ({ csrfToken: "csrf-abc" }) },
    refresh: { ok: false, status: 503, json: async () => ({}) },
  });
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(screen.getByText(/^error:-/)).toBeInTheDocument());
});

it("me401 → csrf !ok → 회전 안 함 → guest", async () => {
  globalThis.fetch = routedFetch({
    meSeq: [{ ok: false, status: 401, json: async () => ({}) }],
    csrf: { ok: false, status: 500, json: async () => ({}) },
    refresh: { ok: true, status: 200, json: async () => ({}) },
  });
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(screen.getByText(/guest:-/)).toBeInTheDocument());
});
