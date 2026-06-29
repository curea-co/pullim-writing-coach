import "server-only";

// 중앙 SSO 세션 읽기 전용 BFF — 로그인/refresh/logout은 중앙 os·api 호스트가 담당(공유 .pullim.ai 쿠키).
//   writing-coach는 브라우저가 보유한 공유 access 쿠키(dev-pullim-at, Path=/)를 dev-api `/me`로 forward해 프로필만 읽는다.
//   (refresh 쿠키 dev-pullim-rt는 Path=/auth라 우리 /api/* 로 전송되지 않음 → 토큰 회전은 중앙 책임.)
// env 해석 — 프로덕션에서 미설정 시 dev 기본값으로 조용히 fallback 금지(실자격증명이 dev-api로 가는 위험).
//   prod는 명시 설정 강제(미설정이면 throw → fail-loud). dev/test는 기본값 허용.
function resolveEnv(name: "PULLIM_API_URL" | "PULLIM_ORIGIN", devDefault: string): string {
  const v = process.env[name];
  if (v) return v;
  if (process.env.NODE_ENV === "production") throw new Error(`[pullim-auth] ${name} 미설정 — 프로덕션에서 dev 기본값 fallback 금지`);
  return devDefault;
}
export function pullimApiUrl(): string { return resolveEnv("PULLIM_API_URL", "https://dev-api.pullim.ai"); }
export function pullimOrigin(): string { return resolveEnv("PULLIM_ORIGIN", "https://dev.pullim.ai"); }
export const COOKIE_AT = "dev-pullim-at";

// dev-api로 전달할 쿠키 허용목록 — 우리 origin의 임의 쿠키가 외부 백엔드로 유출되지 않게. /me는 access만 필요.
export function filterCookies(cookieHeader: string | null | undefined, names: readonly string[] = [COOKIE_AT]): string {
  if (!cookieHeader) return "";
  return cookieHeader
    .split(/;\s*/)
    .filter((c) => names.some((n) => c.startsWith(n + "=")))
    .join("; ");
}

// 서버→dev-api 프록시(GET 읽기). 브라우저 공유 쿠키를 허용목록만 forward.
export async function forwardToPullim(
  path: string,
  opts: { method?: string; cookie?: string | null; cookieNames?: readonly string[] } = {},
): Promise<{ status: number; body: unknown }> {
  const headers: Record<string, string> = { accept: "application/json" };
  const cookie = filterCookies(opts.cookie, opts.cookieNames); // 엔드포인트별 필요한 쿠키만 전달
  if (cookie) headers["cookie"] = cookie;
  headers["origin"] = pullimOrigin(); // dev-api Origin 검증 대비(서버 발 요청)
  const res = await fetch(`${pullimApiUrl()}${path}`, {
    method: opts.method ?? "GET",
    headers,
    redirect: "manual",
    cache: "no-store", // 인증 프록시 — Next fetch 캐시에 타 사용자 /me 응답이 남지 않게.
  });
  let body: unknown = null;
  const text = await res.text();
  if (text) { try { body = JSON.parse(text); } catch { body = text; } }
  return { status: res.status, body };
}
