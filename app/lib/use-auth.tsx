"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type User = { email?: string; displayName?: string; name?: string };
// error = /me가 5xx/네트워크 실패 — 게스트로 단정하지 않음(인증서버 장애를 로그아웃으로 은폐하지 않기 위함).
type Status = "loading" | "authed" | "guest" | "error";
type AuthCtx = { user: User | null; status: Status; login: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>; logout: () => Promise<void>; refreshMe: () => Promise<void> };

const Ctx = createContext<AuthCtx | null>(null);

async function csrfToken(): Promise<string | undefined> {
  // no-store — 매 시도 fresh CSRF(캐시된 응답 재사용 시 403 재시도가 같은 stale 토큰을 보내 영구 실패).
  try { const r = await fetch("/api/auth/csrf", { cache: "no-store" }); const j = await r.json(); return j?.csrfToken ?? j?.token; } catch { return undefined; }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  const refreshMe = useCallback(async () => {
    // name만 내려오는 정상 응답({authenticated:true, name})도 사용자로 인정(설계상 /me는 email·displayName·name).
    const isUser = (j: { authenticated?: boolean; email?: string; displayName?: string; name?: string } | null) =>
      !!j && j.authenticated !== false && !!(j.email || j.displayName || j.name);
    // me 라우트: 200(사용자|authenticated:false) · 5xx는 그대로 전달. r.ok로 게스트(논리적)와 장애(5xx)를 구분.
    //   no-store — 로그인/로그아웃 직후 stale 응답에 상태가 묶이지 않게.
    const fetchMe = async () => {
      try { const r = await fetch("/api/auth/me", { cache: "no-store" }); return { ok: r.ok, j: (await r.json().catch(() => null)) as { authenticated?: boolean; email?: string; displayName?: string; name?: string } | null }; }
      catch { return { ok: false, j: null }; }
    };
    const first = await fetchMe();
    if (first.ok && isUser(first.j)) { setUser(first.j); setStatus("authed"); return; }
    if (!first.ok) { setUser(null); setStatus("error"); return; } // 5xx/네트워크 — 게스트로 단정·은폐하지 않음
    // 200 + 게스트 body(논리적 미인증) → access 만료 가능 → refresh 회전 후 1회 재시도.
    //   refresh가 401/403이면 진짜 로그아웃(→guest), 5xx/네트워크면 장애(→error, 게스트 단정·은폐 안 함).
    try {
      const token = await csrfToken();
      const rr = await fetch("/api/auth/refresh", { method: "POST", headers: token ? { "x-csrf-token": token } : {} });
      if (rr.ok) {
        const retry = await fetchMe();
        if (retry.ok && isUser(retry.j)) { setUser(retry.j); setStatus("authed"); return; }
        if (!retry.ok) { setUser(null); setStatus("error"); return; } // 재조회 장애
        // retry 200 + 게스트 → 진짜 로그아웃 → 아래 guest
      } else if (rr.status !== 401 && rr.status !== 403) {
        setUser(null); setStatus("error"); return; // refresh 5xx 등 → 장애
      }
      // rr 401/403 → 진짜 로그아웃 → 아래 guest
    } catch { setUser(null); setStatus("error"); return; } // 네트워크 → 장애
    setUser(null); setStatus("guest");
  }, []);

  useEffect(() => { void refreshMe(); }, [refreshMe]);

  const login = useCallback(async (email: string, password: string) => {
    // 매 시도마다 fresh CSRF 부트스트랩 — 403(토큰 만료/회전) 시 csrf 재부트스트랩 후 1회 재시도(설계 §에러처리).
    const attempt = async () => {
      const token = await csrfToken();
      return fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json", ...(token ? { "x-csrf-token": token } : {}) },
        body: JSON.stringify({ email, password }),
      });
    };
    // 네트워크 reject를 잡아 항상 {ok,message} 반환 — 호출부 버튼이 영구 disabled로 남지 않게.
    try {
      let r = await attempt();
      if (r.status === 403) r = await attempt(); // CSRF 일시 실패 — 재부트스트랩 후 1회 재시도
      if (r.ok) { await refreshMe(); return { ok: true }; }
      const j = await r.json().catch(() => ({}));
      return { ok: false, message: j?.message ?? "로그인에 실패했어요." };
    } catch {
      return { ok: false, message: "네트워크 오류로 로그인하지 못했어요. 잠시 후 다시 시도해 주세요." };
    }
  }, [refreshMe]);

  const logout = useCallback(async () => {
    // 네트워크 실패해도 reject하지 않고 로컬 세션 상태는 항상 정리(자주 누르는 액션).
    try {
      const token = await csrfToken();
      await fetch("/api/auth/logout", { method: "POST", headers: token ? { "x-csrf-token": token } : {} });
    } catch { /* noop — 아래에서 상태 정리 */ }
    setUser(null); setStatus("guest");
  }, []);

  return <Ctx.Provider value={{ user, status, login, logout, refreshMe }}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
