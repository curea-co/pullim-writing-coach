"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type User = { email?: string; displayName?: string; name?: string };
// 중앙 SSO 세션의 소비자 — 로그인/로그아웃/refresh는 중앙(web/api)이 담당.
//   로컬 SSO 런북: 모든 표면이 api 호스트를 브라우저에서 직접 호출(credentials include) + host-only same-site 쿠키.
//   여기서는 GET ${API}/me 를 직접 호출해 현재 사용자만 읽는다(BFF 아님 — host-only 쿠키는 api 호스트로만 전송됨).
//   error = /me가 5xx/네트워크 실패 — 게스트로 단정하지 않음(인증서버 장애를 미로그인으로 은폐 안 함).
type Status = "loading" | "authed" | "guest" | "error";
type AuthCtx = { user: User | null; status: Status; refresh: () => Promise<void> };

const Ctx = createContext<AuthCtx | null>(null);

// 인증 API 호스트 — local=http://api.pullim.local:3000 · dev=https://dev-api.pullim.ai · prod=https://api.pullim.ai.
const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "https://dev-api.pullim.ai").replace(/\/$/, "");

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  const refresh = useCallback(async () => {
    const isUser = (j: { email?: string; displayName?: string; name?: string } | null) =>
      !!j && !!(j.email || j.displayName || j.name);
    try {
      // credentials:include — same-site 쿠키(host-only on api) 전송. 게스트는 api가 401/403.
      const r = await fetch(`${API_BASE}/me`, { credentials: "include", cache: "no-store" });
      if (r.status === 401 || r.status === 403) { setUser(null); setStatus("guest"); return; }
      if (!r.ok) { setUser(null); setStatus("error"); return; } // 5xx — 장애(게스트 단정 안 함)
      const j = (await r.json().catch(() => null)) as { email?: string; displayName?: string; name?: string } | null;
      if (isUser(j)) { setUser(j); setStatus("authed"); return; }
      setUser(null); setStatus("guest");
    } catch {
      // 응답 자체를 못 받음(네트워크/CORS/미도달) — error로 둔다(미로그인 위장 안 함, "장애를 로그아웃으로 은폐하지 않음" 계약).
      //   헤더는 error를 중립 "연결 오류"로 표시(로그인 버튼 X). 올바른 로컬 env(writing.pullim.local+로컬 api)면 이 catch는 안 탄다.
      setUser(null); setStatus("error");
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  return <Ctx.Provider value={{ user, status, refresh }}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
