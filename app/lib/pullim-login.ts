// 중앙 로그인(SSO) 진입 URL — pullim SoT(api.md §1·config-catalog §2).
//   미인증 진입은 LOGIN_HOST + `?next=<돌아올 URL>` 로 리다이렉트한다. apex `pullim.ai` 는 인증쿠키
//   미발급 호스트(ADR-010)라 제외 — 반드시 os 호스트를 쓴다:
//     local = http://os.pullim.local:<os-port> · dev = https://dev-os.pullim.ai · prod = https://os.pullim.ai
//   base 는 환경마다 다르므로 빌드타임 public env 로 주입(미설정 시 dev 호스트 기본).
const LOGIN_BASE = (process.env.NEXT_PUBLIC_LOGIN_BASE ?? "https://dev-os.pullim.ai").replace(/\/$/, "");

function withNext(path: string, returnTo: string | undefined, fallback: () => string): string {
  const next = returnTo ?? fallback();
  return `${LOGIN_BASE}${path}?next=${encodeURIComponent(next)}`;
}

// 로그인 페이지 URL. returnTo 미지정 시 현재 전체 URL(로그인 후 복귀).
export function loginUrl(returnTo?: string): string {
  return withNext("/login", returnTo, () => (typeof window !== "undefined" ? window.location.href : "/"));
}

// 로그아웃 URL. 공유 `.pullim.ai` 쿠키는 중앙 호스트만 정리 가능하므로 중앙으로 보낸다.
export function logoutUrl(returnTo?: string): string {
  return withNext("/logout", returnTo, () => (typeof window !== "undefined" ? window.location.origin : "/"));
}
