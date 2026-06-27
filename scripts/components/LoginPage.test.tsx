import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

// next/navigation은 jsdom 환경에서 동작하지 않으므로 stub.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/login",
  useSearchParams: () => new URLSearchParams(),
}));

import LoginPage from "@/app/login/page";
import { AuthProvider } from "@/app/lib/use-auth";

it("제출 시 /api/auth/login 호출, 실패 메시지 노출", async () => {
  // URL-based mock: AuthProvider 마운트 시 /api/auth/me 먼저 호출됨 → guest 응답
  const fetchMock = vi.fn().mockImplementation((url: string) => {
    if (url.includes("/api/auth/me")) {
      return Promise.resolve({ ok: true, json: async () => ({ authenticated: false }) });
    }
    if (url.includes("/api/auth/csrf")) {
      return Promise.resolve({ ok: true, json: async () => ({ token: "t" }) });
    }
    if (url.includes("/api/auth/login")) {
      return Promise.resolve({
        ok: false,
        json: async () => ({ message: "이메일 또는 비밀번호가 일치하지 않아요." }),
      });
    }
    return Promise.resolve({ ok: true, json: async () => ({}) });
  });
  globalThis.fetch = fetchMock as any;
  render(<AuthProvider><LoginPage /></AuthProvider>);
  // wait for me-call to settle so AuthProvider is no longer loading
  await waitFor(() => expect(screen.getByLabelText(/이메일/)).toBeInTheDocument());
  fireEvent.change(screen.getByLabelText(/이메일/), { target: { value: "a@b.com" } });
  fireEvent.change(screen.getByLabelText(/비밀번호/), { target: { value: "pw" } });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: /로그인/ })); });
  await waitFor(() => expect(screen.getByText(/일치하지 않아요/)).toBeInTheDocument());
});
