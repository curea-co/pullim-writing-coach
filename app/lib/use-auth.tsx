"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type User = { email?: string; displayName?: string; name?: string };
// 중앙 SSO 세션의 소비자 — 로그인/로그아웃/refresh는 중앙 os 호스트가 담당(공유 .pullim.ai 쿠키).
//   여기서는 /api/auth/me(공유 access 쿠키 forward)로 현재 사용자만 읽는다.
//   error = /me가 5xx/네트워크 실패 — 게스트로 단정하지 않음(인증서버 장애를 미로그인으로 은폐 안 함).
type Status = "loading" | "authed" | "guest" | "error";
type AuthCtx = { user: User | null; status: Status; refresh: () => Promise<void> };

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  const refresh = useCallback(async () => {
    // /me 라우트: 200(사용자|authenticated:false) · 5xx는 그대로 전달. name만 있어도 사용자로 인정.
    const isUser = (j: { authenticated?: boolean; email?: string; displayName?: string; name?: string } | null) =>
      !!j && j.authenticated !== false && !!(j.email || j.displayName || j.name);
    try {
      const r = await fetch("/api/auth/me", { cache: "no-store" });
      const j = (await r.json().catch(() => null)) as { authenticated?: boolean; email?: string; displayName?: string; name?: string } | null;
      if (!r.ok) { setUser(null); setStatus("error"); return; } // 5xx/네트워크 — 게스트 단정 안 함
      if (isUser(j)) { setUser(j); setStatus("authed"); return; }
      setUser(null); setStatus("guest"); // 200 + 미인증(401/403 정규화 포함)
    } catch { setUser(null); setStatus("error"); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  return <Ctx.Provider value={{ user, status, refresh }}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
