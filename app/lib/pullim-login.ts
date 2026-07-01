// 로그인/로그아웃 UI는 pullim-web(apex)이 서빙 — 로컬 SSO 런북(pullim-web docs/common/2026-06-22).
//   로그인 버튼 → `${WEB}/login?next=<복귀 URL>` (로그인 후 next 복귀는 pullim-web이 처리).
//   WEB base: local = http://pullim.local:3001 · prod = https://pullim.ai (env로 주입, 미설정 시 prod).
const WEB_BASE = (process.env.NEXT_PUBLIC_WEB_URL ?? "https://pullim.ai").replace(/\/$/, "");

// next 값을 same-origin으로 제한 — open redirect 방지(util이 export라 외부 입력이 흘러들 수 있음).
//   same-origin 절대 URL 또는 상대경로(/…, // 제외)만 허용, 그 외(외부)는 현재 origin 루트로.
function safeNext(returnTo: string | undefined, fallback: () => string): string {
  const raw = returnTo ?? fallback();
  const origin = typeof window !== "undefined" ? window.location.origin : (process.env.NEXT_PUBLIC_WEB_URL ?? "");
  if (raw.startsWith("/") && !raw.startsWith("//") && !raw.startsWith("/\\")) return raw; // 상대 경로
  try {
    const u = new URL(raw);
    if (origin && u.origin === origin) return u.href; // same-origin 절대 URL만
  } catch { /* 파싱 불가 → 폴백 */ }
  return origin || "/";
}

// 복귀 경로는 `next` 쿼리로 전달 — pullim 지침·api.md SoT·pullim-web /login(LoginClient: get('next')) 정합.
function withNext(path: string, returnTo: string | undefined, fallback: () => string): string {
  return `${WEB_BASE}${path}?next=${encodeURIComponent(safeNext(returnTo, fallback))}`;
}

// 로그인 페이지 URL. returnTo 미지정 시 현재 전체 URL(로그인 후 복귀).
export function loginUrl(returnTo?: string): string {
  return withNext("/login", returnTo, () => (typeof window !== "undefined" ? window.location.href : "/"));
}

// 회원가입 페이지 URL(pullim-web). 로그인과 동형.
export function signupUrl(returnTo?: string): string {
  return withNext("/signup", returnTo, () => (typeof window !== "undefined" ? window.location.href : "/"));
}

// 로그아웃 URL. 공유 세션 쿠키는 중앙(web/api)만 정리 가능하므로 중앙으로 보낸다.
export function logoutUrl(returnTo?: string): string {
  return withNext("/logout", returnTo, () => (typeof window !== "undefined" ? window.location.origin : "/"));
}

// 풀림 OS 허브 — 앱런처 목적지. OS 진입은 `/os` 경로(통합로그인 배포 문서 정본).
//   local = http://os.pullim.local:3001/os · dev = https://dev-os.pullim.ai/os · prod = https://os.pullim.ai/os.
export function osHubUrl(): string {
  return (process.env.NEXT_PUBLIC_OS_URL ?? "https://os.pullim.ai/os").replace(/\/$/, "");
}
