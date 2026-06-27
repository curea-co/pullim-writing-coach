import "server-only";

// dev-api 계약(라이브 실측 확정, 2026-06-27).
// CSRF 쿠키 = dev-pullim-csrf (NOT httpOnly, Domain=.pullim.ai, SameSite=Lax) — double-submit.
// 세션 쿠키 = dev-pullim-at(access, Max-Age 900) · dev-pullim-rt(refresh, Path=/auth).
// CSRF 헤더 = x-csrf-token (확정). CSRF Origin 검증 = dev-api 허용 origin(dev: https://dev.pullim.ai)만 통과 — 확정.
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
export const COOKIE_RT = "dev-pullim-rt";
export const COOKIE_CSRF = "dev-pullim-csrf";
export const CSRF_HEADER = "x-csrf-token"; // 라이브 실측 확정

// dev-api로 전달할 쿠키 허용목록(기본) — 우리 origin의 임의 쿠키가 외부 백엔드로 유출되지 않게.
//   엔드포인트별로 필요한 쿠키만 좁혀 전달(login=CSRF만, /me=access만 …)해 세션 쿠키 혼입을 막는다.
const ALLOWED_COOKIES = [COOKIE_AT, COOKIE_RT, COOKIE_CSRF];
export function filterCookies(cookieHeader: string | null | undefined, names: readonly string[] = ALLOWED_COOKIES): string {
  if (!cookieHeader) return "";
  return cookieHeader
    .split(/;\s*/)
    .filter((c) => names.some((n) => c.startsWith(n + "=")))
    .join("; ");
}

// dev-api Set-Cookie를 우리 origin용으로 재기록: Domain 제거(host-only), refresh Path /auth→/api/auth,
//   HttpOnly·Secure·SameSite 보존(토큰 httpOnly 유지).
export function rewriteSetCookie(line: string, opts: { insecure?: boolean } = {}): string {
  let out = line.replace(/;\s*Domain=[^;]*/i, "");
  out = out.replace(/;\s*Path=\/auth\b/i, "; Path=/api/auth");
  // 비프로덕션 HTTP origin(localhost 외 HTTP dev 포함)에서는 Secure를 제거해 쿠키가 저장되게.
  if (opts.insecure) out = out.replace(/;\s*Secure\b/i, "");
  return out;
}

// 현재 요청이 비프로덕션 + HTTP origin인지 — 그렇다면 relay 쿠키에서 Secure를 떼야 브라우저가 저장한다.
//   TLS 종료 프록시(Vercel 등) 뒤에서는 내부 req.url이 http여도 외부는 https일 수 있다 → x-forwarded-proto를
//   권위로 신뢰하고, 그게 없을 때만 localhost http에 한해 insecure로 본다(프록시 뒤 HTTPS Secure 다운그레이드 방지).
export function isInsecureRequest(req: { url: string; headers: { get(name: string): string | null } }): boolean {
  if (process.env.NODE_ENV === "production") return false;
  const xfp = req.headers.get("x-forwarded-proto");
  if (xfp) return xfp.split(",")[0]!.trim() === "http";
  const url = new URL(req.url);
  return url.protocol === "http:" && (url.hostname === "localhost" || url.hostname === "127.0.0.1");
}

export function mapLoginError(status: number): string {
  if (status === 401) return "이메일 또는 비밀번호가 일치하지 않아요.";
  if (status === 403) return "보안 확인에 실패했어요. 잠시 후 다시 시도해 주세요.";
  if (status === 400) return "입력 형식을 확인해 주세요.";
  return "로그인에 실패했어요. 잠시 후 다시 시도해 주세요.";
}

// 서버→dev-api 프록시. 브라우저 쿠키를 forward, dev-api Set-Cookie 회수. credentials는 수동 Cookie 헤더.
export async function forwardToPullim(
  path: string,
  opts: { method?: string; jsonBody?: unknown; cookie?: string | null; csrf?: string | null; cookieNames?: readonly string[] } = {},
): Promise<{ status: number; body: unknown; setCookies: string[] }> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (opts.jsonBody !== undefined) headers["content-type"] = "application/json";
  const cookie = filterCookies(opts.cookie, opts.cookieNames); // 엔드포인트별 필요한 쿠키만 전달
  if (cookie) headers["cookie"] = cookie;
  if (opts.csrf) headers[CSRF_HEADER] = opts.csrf;
  // dev-api CSRF Origin 검증 통과 — BFF 서버 발 요청이라 허용 origin을 명시(실측 확정값).
  headers["origin"] = pullimOrigin();
  const res = await fetch(`${pullimApiUrl()}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.jsonBody !== undefined ? JSON.stringify(opts.jsonBody) : undefined,
    redirect: "manual",
    cache: "no-store", // 인증 프록시 — Next fetch 캐시에 CSRF 토큰·타 사용자 /me 응답이 남지 않게.
  });
  // Next/undici: 다중 Set-Cookie는 getSetCookie()로 수집.
  const setCookies = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  let body: unknown = null;
  const text = await res.text();
  if (text) { try { body = JSON.parse(text); } catch { body = text; } }
  return { status: res.status, body, setCookies };
}
