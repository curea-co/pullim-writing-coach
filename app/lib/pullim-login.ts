// 로그인/로그아웃 UI는 pullim-web(apex)이 서빙 — 로컬 SSO 런북(pullim-web docs/common/2026-06-22).
//   로그인 버튼 → `${WEB}/login?redirect=<복귀 URL>` (로그인 후 redirect 복귀는 web 측에서 처리).
//   WEB base: local = http://pullim.local:3001 · prod = https://pullim.ai (env로 주입, 미설정 시 prod).
const WEB_BASE = (process.env.NEXT_PUBLIC_WEB_URL ?? "https://pullim.ai").replace(/\/$/, "");

function withRedirect(path: string, returnTo: string | undefined, fallback: () => string): string {
  const redirect = returnTo ?? fallback();
  return `${WEB_BASE}${path}?redirect=${encodeURIComponent(redirect)}`;
}

// 로그인 페이지 URL. returnTo 미지정 시 현재 전체 URL(로그인 후 복귀).
export function loginUrl(returnTo?: string): string {
  return withRedirect("/login", returnTo, () => (typeof window !== "undefined" ? window.location.href : "/"));
}

// 회원가입 페이지 URL(pullim-web). 로그인과 동형.
export function signupUrl(returnTo?: string): string {
  return withRedirect("/signup", returnTo, () => (typeof window !== "undefined" ? window.location.href : "/"));
}

// 로그아웃 URL. 공유 세션 쿠키는 중앙(web/api)만 정리 가능하므로 중앙으로 보낸다.
export function logoutUrl(returnTo?: string): string {
  return withRedirect("/logout", returnTo, () => (typeof window !== "undefined" ? window.location.origin : "/"));
}

// 풀림 OS 허브 — 앱런처 목적지. local = http://os.pullim.local:3001 · prod = https://os.pullim.ai.
export function osHubUrl(): string {
  return (process.env.NEXT_PUBLIC_OS_URL ?? "https://os.pullim.ai").replace(/\/$/, "") + "/";
}
