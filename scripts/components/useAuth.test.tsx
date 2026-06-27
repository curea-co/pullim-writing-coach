import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/app/lib/use-auth";

function Probe() { const { status, user } = useAuth(); return <div>{status}:{user?.displayName ?? "-"}</div>; }
beforeEach(() => { globalThis.fetch = vi.fn(); });

it("me 200(authenticated) → authed + displayName", async () => {
  (globalThis.fetch as any).mockResolvedValue({ ok: true, json: async () => ({ authenticated: true, displayName: "민수" }) });
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(screen.getByText(/authed:민수/)).toBeInTheDocument());
});
it("me authenticated=false → guest", async () => {
  (globalThis.fetch as any).mockResolvedValue({ ok: true, json: async () => ({ authenticated: false }) });
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(screen.getByText(/guest:-/)).toBeInTheDocument());
});
it("me 게스트(200) → refresh 성공 → 재시도 me authed (세션 복구)", async () => {
  let meCall = 0;
  (globalThis.fetch as any).mockImplementation((url: string) => {
    if (String(url).includes("/api/auth/me")) {
      meCall++; // 둘 다 ok:true (라우트가 401→200 정규화). 1차 게스트, 2차 authed.
      return Promise.resolve({ ok: true, json: async () => (meCall > 1 ? { authenticated: true, displayName: "복구됨" } : { authenticated: false }) });
    }
    if (String(url).includes("/api/auth/csrf")) return Promise.resolve({ ok: true, json: async () => ({ csrfToken: "t" }) });
    if (String(url).includes("/api/auth/refresh")) return Promise.resolve({ ok: true, json: async () => ({ ok: true }) });
    return Promise.resolve({ ok: true, json: async () => ({}) });
  });
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(screen.getByText(/authed:복구됨/)).toBeInTheDocument());
});
it("me 5xx(인증서버 장애) → error 상태(게스트로 단정 안 함)", async () => {
  (globalThis.fetch as any).mockResolvedValue({ ok: false, status: 502, json: async () => ({ error: true }) });
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(screen.getByText(/^error:-/)).toBeInTheDocument());
});
