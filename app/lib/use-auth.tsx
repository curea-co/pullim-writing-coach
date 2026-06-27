"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type User = { email?: string; displayName?: string; name?: string };
type Status = "loading" | "authed" | "guest";
type AuthCtx = { user: User | null; status: Status; login: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>; logout: () => Promise<void>; refreshMe: () => Promise<void> };

const Ctx = createContext<AuthCtx | null>(null);

async function csrfToken(): Promise<string | undefined> {
  try { const r = await fetch("/api/auth/csrf"); const j = await r.json(); return j?.csrfToken ?? j?.token; } catch { return undefined; }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  const refreshMe = useCallback(async () => {
    try {
      const r = await fetch("/api/auth/me");
      const j = await r.json();
      if (j && j.authenticated !== false && (j.email || j.displayName)) { setUser(j); setStatus("authed"); }
      else { setUser(null); setStatus("guest"); }
    } catch { setUser(null); setStatus("guest"); }
  }, []);

  useEffect(() => { void refreshMe(); }, [refreshMe]);

  const login = useCallback(async (email: string, password: string) => {
    const token = await csrfToken();
    const r = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json", ...(token ? { "x-csrf-token": token } : {}) },
      body: JSON.stringify({ email, password }),
    });
    if (r.ok) { await refreshMe(); return { ok: true }; }
    const j = await r.json().catch(() => ({}));
    return { ok: false, message: j?.message ?? "로그인에 실패했어요." };
  }, [refreshMe]);

  const logout = useCallback(async () => {
    const token = await csrfToken();
    await fetch("/api/auth/logout", { method: "POST", headers: token ? { "x-csrf-token": token } : {} });
    setUser(null); setStatus("guest");
  }, []);

  return <Ctx.Provider value={{ user, status, login, logout, refreshMe }}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
