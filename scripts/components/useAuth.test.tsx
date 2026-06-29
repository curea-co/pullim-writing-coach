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
