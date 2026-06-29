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
    // /me 응답을 상태로 매핑. authed 시 setUser. 401/403은 호출부가 회전 여부를 결정하므로 null 반환.
    const applyMe = async (r: Response): Promise<Status> => {
      const j = (await r.json().catch(() => null)) as { email?: string; displayName?: string; name?: string } | null;
      if (isUser(j)) { setUser(j); return "authed"; }
      return "guest";
    };
    try {
      // credentials:include — same-site 쿠키(host-only on api) 전송. 게스트는 api가 401/403.
      const r = await fetch(`${API_BASE}/me`, { credentials: "include", cache: "no-store" });

      // [ITEM 2] 활성 중 15분 만료(access 쿠키) 대비 — /me 401/403이면 1회 토큰 회전 후 /me 재시도.
      //   refresh 쿠키 dev-pullim-rt(Path=/auth on api)는 credentials:include로 api/auth/refresh로만 전송.
      if (r.status === 401 || r.status === 403) {
        // (a) CSRF 토큰 발급. 못 받으면(!ok 또는 토큰 falsy) 회전하지 않고 게스트.
        let csrf: string | undefined;
        try {
          const cr = await fetch(`${API_BASE}/auth/csrf`, { credentials: "include", cache: "no-store" });
          if (cr.ok) {
            const cj = (await cr.json().catch(() => null)) as { csrfToken?: string; token?: string } | null;
            csrf = cj?.csrfToken ?? cj?.token;
          }
        } catch {
          // csrf 발급 네트워크 실패 — 회전 불가. 아래 csrf falsy 분기로 게스트.
        }
        if (!csrf) { setUser(null); setStatus("guest"); return; }

        // (b) refresh — 성공(200)이면 /me 재시도, 401/403이면 게스트, 5xx면 error(장애 은폐 안 함).
        const rr = await fetch(`${API_BASE}/auth/refresh`, {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          headers: { "x-csrf-token": csrf },
        });
        if (rr.status === 200) {
          const r2 = await fetch(`${API_BASE}/me`, { credentials: "include", cache: "no-store" });
          if (r2.status === 401 || r2.status === 403) { setUser(null); setStatus("guest"); return; }
          if (!r2.ok) { setUser(null); setStatus("error"); return; }
          const s = await applyMe(r2);
          if (s === "authed") { setStatus("authed"); return; }
          setUser(null); setStatus("guest"); return;
        }
        if (rr.status === 401 || rr.status === 403) { setUser(null); setStatus("guest"); return; }
        // refresh 5xx — 인증서버 장애. 게스트로 단정하지 않는다(미로그인 은폐 방지).
        setUser(null); setStatus("error"); return;
      }

      if (!r.ok) { setUser(null); setStatus("error"); return; } // 5xx — 장애(게스트 단정 안 함)
      const s = await applyMe(r);
      if (s === "authed") { setStatus("authed"); return; }
      setUser(null); setStatus("guest");
    } catch {
      // 응답 자체를 못 받음(네트워크/CORS/미도달) — 가장 흔한 원인은 미구성이라 게스트(→로그인)로 둔다.
      // (서버가 응답한 5xx는 위 !r.ok 분기에서 error로 구분 — 진짜 장애 은폐 방지)
      setUser(null); setStatus("guest");
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
