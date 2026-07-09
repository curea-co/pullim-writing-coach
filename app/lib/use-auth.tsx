"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { setAccountMode } from "./storage";

// /me 신원 필드 — name = KCB 실명(한글, AES 복호 PII, 본인조회 한정) · displayName = 표시이름 · email.
//   배지는 한글 실명(name) 우선 표시(app-shell). 자격증명·PII 로깅 금지.
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

const isLocalApi = API_BASE.includes("pullim.local");

// 현재 API 환경(API_BASE)에 대응하는 csrf 쿠키 이름 하나 — dev-api=dev-pullim-csrf · api(prod)=pullim-csrf ·
//   local=local-pullim-csrf. 세 이름 전부를 보면(Codex #130) dev 브라우저에 남은 prod `pullim-csrf` 때문에
//   부트스트랩을 건너뛰어 정작 dev-api 가 요구하는 `dev-pullim-csrf` 는 계속 부재 → 저장 401 지속. 환경 이름만 검사.
function envCsrfCookieName(): string {
  if (isLocalApi) return "local-pullim-csrf";
  if (API_BASE.includes("dev-")) return "dev-pullim-csrf"; // dev-api.pullim.ai
  return "pullim-csrf"; // api.pullim.ai(prod) · 상대경로("")
}

// double-submit CSRF 쿠키(현재 환경 이름) 존재 여부(비-httpOnly라 JS 가독). 값은 읽지 않는다 — 존재만 확인.
function hasCsrfCookie(): boolean {
  if (typeof document === "undefined") return false;
  const name = envCsrfCookieName();
  return document.cookie.split(";").some((c) => c.trim().startsWith(`${name}=`));
}

// authed 사용자에 CSRF 쿠키를 **부재 시에만** 부트스트랩한다(GET /auth/csrf → Set-Cookie dev-pullim-csrf,
//   Domain=.pullim.ai). 왜 필요한가: 데이터 mutation 은 BFF(/api/data)가 브라우저의 csrf 쿠키를 relay 로
//   echo 하는데(db.ts), /me 가 200(유효세션)이면 refresh 경로를 안 타 이 쿠키가 세팅될 계기가 없다 —
//   결과적으로 첫 저장이 CsrfGuard 403(→ BFF 401)로 막힌다(2026-07-08 KCB 계정 dev 종단검증 실사고).
//   존재하면 skip — 불필요한 토큰 회전(타 앱 캐시 무효화)을 피한다. local(host-only 쿠키)은 relay 미사용이라 skip.
async function ensureCsrfCookie(): Promise<void> {
  if (isLocalApi || hasCsrfCookie()) return;
  try {
    await fetch(`${API_BASE}/auth/csrf`, { credentials: "include", cache: "no-store" });
  } catch {
    // 부트스트랩 실패 — 다음 mutation 이 401→onAuthExpired→refresh 재시도로 또 시도(치명 아님).
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  const refresh = useCallback(async (): Promise<Status> => {
    // 운영 안전장치 — 프로덕션 빌드에서 NEXT_PUBLIC_API_URL 미설정이면 API_BASE="" 라, `/me` 가 same-origin
    //   (=우리 앱의 /me 페이지 HTML)로 나가 파싱 실패 → 조용히 guest 로 떨어진다. 그러면 사용자는 "로그인해도
    //   계속 게스트"인 무한루프에 빠진다(무해한 척하는 치명 오류). 브라우저 런타임에서 즉시 error 로 노출해
    //   배포 검증 단계에서 바로 잡히게 한다(사용자 도달 전). SSR/빌드(window undefined)엔 미발동 → 프리뷰 빌드 안전.
    if (!API_BASE && typeof window !== "undefined") {
      console.error("[use-auth] NEXT_PUBLIC_API_URL 미설정 — 인증 API 호스트 불명. 운영 Vercel env 확인 필요.");
      setUser(null); setStatus("error");
      return "error";
    }
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
          if (s === "authed") { await ensureCsrfCookie(); setStatus("authed"); return "authed"; }
          setUser(null); setStatus("guest"); return "guest";
        }
        if (rr.status === 401 || rr.status === 403) { setUser(null); setStatus("guest"); return "guest"; }
        // refresh 5xx — 인증서버 장애. 게스트로 단정하지 않는다(미로그인 은폐 방지).
        setUser(null); setStatus("error"); return "error";
      }

      if (!r.ok) { setUser(null); setStatus("error"); return "error"; } // 5xx — 장애(게스트 단정 안 함)
      const s = await applyMe(r);
      if (s === "authed") { await ensureCsrfCookie(); setStatus("authed"); return "authed"; }
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
  //   ★ 서버 정리가 **확인(2xx, 무세션도 멱등 2xx)** 된 경우에만 게스트로 전환·이동한다(Codex #130):
  //   실패(5xx·네트워크·CSRF)에도 게스트로 위장하면 중앙 쿠키가 살아 있어 다음 /me 에서 authed 로 복귀 →
  //   "로그아웃했는데 실제 세션 유지" 착시. 미확인 시 상태를 refresh()로 재동기화하고 사용자에게 알린다.
  const logout = useCallback(async (): Promise<void> => {
    let confirmed = false;
    try {
      const cr = await fetch(`${API_BASE}/auth/csrf`, { credentials: "include", cache: "no-store" });
      if (cr.ok) {
        const cj = (await cr.json().catch(() => null)) as { csrfToken?: string; token?: string } | null;
        const csrf = cj?.csrfToken ?? cj?.token;
        if (csrf) {
          const lr = await fetch(`${API_BASE}/auth/logout`, {
            method: "POST",
            credentials: "include",
            cache: "no-store",
            headers: { "x-csrf-token": csrf },
          });
          confirmed = lr.ok; // 2xx = 세션 정리 확인(무세션도 2xx)
        }
      }
    } catch {
      // 네트워크/CORS 실패 — confirmed=false 로 낙하(게스트 위장 금지).
    }
    if (confirmed) {
      setUser(null);
      setStatus("guest");
      if (typeof window !== "undefined") window.location.href = "/";
      return;
    }
    // 미확인 — 실제 세션 상태로 재동기화(authed 유지 가능) 후 사용자 안내. UI 가 잘못 게스트로 갇히지 않게.
    await refresh();
    if (typeof window !== "undefined") window.alert("로그아웃에 실패했어요. 잠시 후 다시 시도해 주세요.");
  }, [refresh]);

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
