"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { setAccountMode } from "./storage";

type User = { email?: string; displayName?: string; name?: string };
// 중앙 SSO 세션의 소비자 — 로그인/로그아웃/refresh는 중앙(web/api)이 담당.
//   로컬 SSO 런북: 모든 표면이 api 호스트를 브라우저에서 직접 호출(credentials include) + host-only same-site 쿠키.
//   여기서는 GET ${API}/me 를 직접 호출해 현재 사용자만 읽는다(BFF 아님 — host-only 쿠키는 api 호스트로만 전송됨).
//   error = /me가 5xx/네트워크 실패 — 게스트로 단정하지 않음(인증서버 장애를 미로그인으로 은폐 안 함).
export type Status = "loading" | "authed" | "guest" | "error";
// refresh는 최종 Status를 반환한다 — storage.onAuthExpired가 refresh 결과로 재요청 여부를 판단(Constraint 10).
//   logout은 중앙 세션(api)을 POST /auth/logout(CSRF)으로 정리 — pullim-web /logout 페이지는 없다(404).
type AuthCtx = { user: User | null; status: Status; refresh: () => Promise<Status>; logout: () => Promise<void> };

const Ctx = createContext<AuthCtx | null>(null);

// 인증 API 호스트 — local=http://api.pullim.local:3000 · dev=https://dev-api.pullim.ai · prod=https://api.pullim.ai.
// 인증 API 호스트. 프로덕션에서 NEXT_PUBLIC_API_URL 미설정 시 dev로 fallback하면 운영 트래픽이
//   dev-api로 샌다 → 빈 값으로 둔다(=`/me` same-origin 상대요청 → dev 미접속, 404로 무해 실패).
//   (throw는 Vercel 프리뷰 빌드[NODE_ENV=production·env 미설정]를 깨므로 지양.) dev/local만 기본값 허용.
const API_BASE = ((): string => {
  const v = process.env.NEXT_PUBLIC_API_URL;
  if (v) return v.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") return ""; // dev fallback 금지(유출 방지) — same-origin 상대요청
  return "https://dev-api.pullim.ai";
})();

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  const refresh = useCallback(async (): Promise<Status> => {
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
        if (!csrf) { setUser(null); setStatus("guest"); return "guest"; }

        // (b) refresh — 성공(200)이면 /me 재시도, 401/403이면 게스트, 5xx면 error(장애 은폐 안 함).
        const rr = await fetch(`${API_BASE}/auth/refresh`, {
          method: "POST",
          credentials: "include",
          cache: "no-store",
          headers: { "x-csrf-token": csrf },
        });
        if (rr.status === 200) {
          const r2 = await fetch(`${API_BASE}/me`, { credentials: "include", cache: "no-store" });
          if (r2.status === 401 || r2.status === 403) { setUser(null); setStatus("guest"); return "guest"; }
          if (!r2.ok) { setUser(null); setStatus("error"); return "error"; }
          const s = await applyMe(r2);
          if (s === "authed") { setStatus("authed"); return "authed"; }
          setUser(null); setStatus("guest"); return "guest";
        }
        if (rr.status === 401 || rr.status === 403) { setUser(null); setStatus("guest"); return "guest"; }
        // refresh 5xx — 인증서버 장애. 게스트로 단정하지 않는다(미로그인 은폐 방지).
        setUser(null); setStatus("error"); return "error";
      }

      if (!r.ok) { setUser(null); setStatus("error"); return "error"; } // 5xx — 장애(게스트 단정 안 함)
      const s = await applyMe(r);
      if (s === "authed") { setStatus("authed"); return "authed"; }
      setUser(null); setStatus("guest"); return "guest";
    } catch {
      // 응답 자체를 못 받음(네트워크/CORS/미도달) — error(미로그인 위장 안 함, "장애를 로그아웃으로 은폐하지 않음" 계약).
      //   헤더는 error를 중립 "연결 오류"로 표시(로그인 버튼 X). 올바른 로컬 env(writing.pullim.local+로컬 api)면 이 catch는 안 탄다.
      setUser(null); setStatus("error"); return "error";
    }
  }, []);

  // 로그아웃 — 공유 세션 쿠키는 중앙(api)만 정리 가능. pullim-web에는 GET /logout 페이지가 없어(404)
  //   리다이렉트가 아니라 POST ${API}/auth/logout 을 직접 호출한다(pullim-web session.ts logout 패턴 동형).
  //   /auth/logout 은 CsrfGuard 대상 → GET /auth/csrf 로 토큰 부트스트랩 후 x-csrf-token echo.
  //   서버 정리 성공·실패와 무관하게 클라 상태를 게스트로 두고 홈으로 이동(멱등 — 무세션도 2xx).
  const logout = useCallback(async (): Promise<void> => {
    try {
      const cr = await fetch(`${API_BASE}/auth/csrf`, { credentials: "include", cache: "no-store" });
      if (cr.ok) {
        const cj = (await cr.json().catch(() => null)) as { csrfToken?: string; token?: string } | null;
        const csrf = cj?.csrfToken ?? cj?.token;
        if (csrf) {
          await fetch(`${API_BASE}/auth/logout`, {
            method: "POST",
            credentials: "include",
            cache: "no-store",
            headers: { "x-csrf-token": csrf },
          });
        }
      }
    } catch {
      // 네트워크/CORS 실패 — 서버 세션이 남을 수 있으나 클라는 게스트로 낙하(장애로 UI가 로그인 상태에 갇히지 않게).
    }
    setUser(null);
    setStatus("guest");
    if (typeof window !== "undefined") window.location.href = "/";
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  // 계정 store 어댑터에 모드 주입 — authed && !local이면 /api/data path. local(host-only 쿠키)은 localStorage 폴백.
  //   onAuthExpired는 refresh 결과를 그대로 반환 — authed면 true(재요청), guest/error면 false(재시도 없이 auth 실패 낙하).
  //
  // ★ PR #115 결함 1: 렌더 중 동기 주입(useEffect 금지).
  //   React effect 실행 순서는 자식 → 부모다. 주입을 useEffect로 두면 소비자(자식)의
  //   load effect가 부모의 setAccountMode effect보다 먼저 돌아, 첫 load가 stale accountMode
  //   (기본 guest=localStorage)로 서버 데이터를 못 읽는다(로그인 유저 데이터 누락).
  //   부모 렌더는 자식 effect보다 항상 먼저 실행되므로, 렌더 중 호출하면 첫 load 시점에
  //   accountMode가 최신이다. setAccountMode는 모듈 전역 변수 대입이라 idempotent — 매 렌더
  //   호출해도 부수효과·렌더 트리거 없음(React state 아님).
  const isLocal = API_BASE.includes("pullim.local");
  setAccountMode({
    authed: status === "authed",
    local: isLocal,
    onAuthExpired: async () => (await refresh()) === "authed",
  });

  return <Ctx.Provider value={{ user, status, refresh, logout }}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
