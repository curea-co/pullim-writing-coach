import { it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/app/lib/use-auth";
import * as storageMod from "@/app/lib/storage";

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

// ── accountMode 주입 (계정 store 라우팅) ──────────────────────────────
it("authed 전환 시 setAccountMode({authed:true, local:false}) 주입", async () => {
  const spy = vi.spyOn(storageMod, "setAccountMode");
  (globalThis.fetch as any).mockResolvedValue({ ok: true, status: 200, json: async () => ({ displayName: "민수" }) });
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(screen.getByText(/authed:민수/)).toBeInTheDocument());
  const lastCall = spy.mock.calls.at(-1)?.[0];
  expect(lastCall?.authed).toBe(true);
  expect(lastCall?.local).toBe(false); // 기본 API_BASE는 dev — pullim.local 아님
});

it("onAuthExpired — refresh가 guest로 끝나면 false 반환(재시도 없이 auth 실패 낙하)", async () => {
  const spy = vi.spyOn(storageMod, "setAccountMode");
  // me 401 → csrf 토큰 없음 → 회전 안 함 → guest 로 refresh가 끝난다.
  globalThis.fetch = routedFetch({
    meSeq: [{ ok: false, status: 401, json: async () => ({}) }],
    csrf: { ok: true, status: 200, json: async () => ({}) },
    refresh: { ok: true, status: 200, json: async () => ({}) },
  });
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(screen.getByText(/guest:-/)).toBeInTheDocument());
  // 주입된 onAuthExpired 직접 호출 → refresh가 다시 guest로 끝나므로 false.
  const onAuthExpired = spy.mock.calls.at(-1)?.[0]?.onAuthExpired;
  expect(onAuthExpired).toBeTypeOf("function");
  expect(await onAuthExpired!()).toBe(false);
});

// ── logout (Codex #130): 서버 정리 확인 시에만 게스트 전환, 실패 시 재동기화+안내 ──
function logoutFetch(h: { meSeq?: any[]; csrf?: any; logout?: any }) {
  let meCall = 0;
  return vi.fn(async (url: any) => {
    const u = String(url);
    if (u.includes("/auth/csrf")) return h.csrf;
    if (u.includes("/auth/logout")) return h.logout;
    if (u.includes("/me")) { const r = h.meSeq?.[meCall] ?? h.meSeq?.[h.meSeq!.length - 1]; meCall += 1; return r; }
    throw new Error(`unexpected url ${u}`);
  });
}
function LogoutProbe() {
  const { status, logout } = useAuth();
  return <><div>st:{status}</div><button onClick={() => { void logout(); }}>do-logout</button></>;
}

it("logout 성공(2xx) → 게스트 전환 + 홈 이동 + POST에 x-csrf-token", async () => {
  const loc = { href: "" };
  Object.defineProperty(window, "location", { configurable: true, writable: true, value: loc });
  globalThis.fetch = logoutFetch({
    meSeq: [{ ok: true, status: 200, json: async () => ({ displayName: "민수" }) }],
    csrf: { ok: true, status: 200, json: async () => ({ csrfToken: "csrf-xyz" }) },
    logout: { ok: true, status: 200, json: async () => ({}) },
  });
  render(<AuthProvider><LogoutProbe /></AuthProvider>);
  await waitFor(() => expect(screen.getByText(/st:authed/)).toBeInTheDocument());
  fireEvent.click(screen.getByText("do-logout"));
  await waitFor(() => expect(loc.href).toBe("/"));
  const calls = (globalThis.fetch as any).mock.calls as any[];
  const lo = calls.find((c) => String(c[0]).includes("/auth/logout"));
  expect(lo[1].method).toBe("POST");
  expect(lo[1].headers["x-csrf-token"]).toBe("csrf-xyz");
});

it("NEXT_PUBLIC_API_URL 미설정(prod build) → error 노출 + /me 미호출 (조용한 게스트 방지)", async () => {
  // API_BASE 는 모듈 로드시 env 로 확정 → resetModules + stubEnv 후 동적 import 로 "" 케이스 재현.
  vi.resetModules();
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("NEXT_PUBLIC_API_URL", "");
  const fetchSpy = vi.fn();
  globalThis.fetch = fetchSpy;
  const { AuthProvider: AP, useAuth: uA } = await import("@/app/lib/use-auth");
  function P() { const { status } = uA(); return <div>st:{status}</div>; }
  render(<AP><P /></AP>);
  await waitFor(() => expect(screen.getByText("st:error")).toBeInTheDocument());
  expect(fetchSpy).not.toHaveBeenCalled(); // API_BASE="" → /me 조차 호출 안 함(즉시 error)
  vi.unstubAllEnvs();
  vi.resetModules();
});

it("logout 실패(비2xx) → 게스트 위장 안 함 + 재동기화(authed 유지) + 경고", async () => {
  const loc = { href: "" };
  Object.defineProperty(window, "location", { configurable: true, writable: true, value: loc });
  const alertSpy = vi.fn();
  window.alert = alertSpy;
  globalThis.fetch = logoutFetch({
    meSeq: [
      { ok: true, status: 200, json: async () => ({ displayName: "민수" }) },
      { ok: true, status: 200, json: async () => ({ displayName: "민수" }) }, // 실패 후 refresh 재동기화
    ],
    csrf: { ok: true, status: 200, json: async () => ({ csrfToken: "csrf-xyz" }) },
    logout: { ok: false, status: 500, json: async () => ({}) },
  });
  render(<AuthProvider><LogoutProbe /></AuthProvider>);
  await waitFor(() => expect(screen.getByText(/st:authed/)).toBeInTheDocument());
  fireEvent.click(screen.getByText("do-logout"));
  await waitFor(() => expect(alertSpy).toHaveBeenCalled());
  expect(loc.href).toBe(""); // 홈 이동 안 함
  expect(screen.getByText(/st:authed/)).toBeInTheDocument(); // 게스트 위장 안 함
});
