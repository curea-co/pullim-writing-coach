import { it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/app/lib/use-auth";

function Probe() { const { status, user } = useAuth(); return <div>{status}:{user?.displayName ?? "-"}</div>; }
beforeEach(() => { globalThis.fetch = vi.fn(); });

it("me 200(authenticated) → authed + displayName", async () => {
  (globalThis.fetch as any).mockResolvedValue({ ok: true, json: async () => ({ authenticated: true, displayName: "민수" }) });
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(screen.getByText(/authed:민수/)).toBeInTheDocument());
});
it("me name만 있어도 authed (email·displayName 없음)", async () => {
  (globalThis.fetch as any).mockResolvedValue({ ok: true, json: async () => ({ authenticated: true, name: "홍길동" }) });
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(screen.getByText(/^authed:/)).toBeInTheDocument());
});
it("me 200 + authenticated=false → guest (미로그인)", async () => {
  (globalThis.fetch as any).mockResolvedValue({ ok: true, json: async () => ({ authenticated: false }) });
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(screen.getByText(/guest:-/)).toBeInTheDocument());
});
it("me 5xx(인증서버 장애) → error (게스트로 단정 안 함)", async () => {
  (globalThis.fetch as any).mockResolvedValue({ ok: false, status: 502, json: async () => ({ error: true }) });
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(screen.getByText(/^error:-/)).toBeInTheDocument());
});
