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
it("me 게스트 → refresh 성공 → 재시도 me authed (세션 복구)", async () => {
  let meCall = 0;
  (globalThis.fetch as any).mockImplementation((url: string) => {
    if (String(url).includes("/api/auth/me")) {
      meCall++;
      return Promise.resolve({ ok: meCall > 1, json: async () => (meCall > 1 ? { authenticated: true, displayName: "복구됨" } : { authenticated: false }) });
    }
    if (String(url).includes("/api/auth/csrf")) return Promise.resolve({ ok: true, json: async () => ({ csrfToken: "t" }) });
    if (String(url).includes("/api/auth/refresh")) return Promise.resolve({ ok: true, json: async () => ({ ok: true }) });
    return Promise.resolve({ ok: true, json: async () => ({}) });
  });
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(screen.getByText(/authed:복구됨/)).toBeInTheDocument());
});
