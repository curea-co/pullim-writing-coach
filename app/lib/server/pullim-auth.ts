import "server-only";

// dev-api 계약(§dev-api 계약). 실측으로 확정 — 미상 항목은 보수적 기본값 + 라이브 검증.
// CSRF 쿠키 = dev-pullim-csrf (NOT httpOnly, Domain=.pullim.ai, SameSite=Lax) — double-submit.
// 세션 쿠키 = dev-pullim-at(access) · dev-pullim-rt(refresh, Path=/auth).
// CSRF 헤더 = x-csrf-token (csrf-csrf 기본값 가정 — login 403 없으면 확정).
export const PULLIM_API_URL = process.env.PULLIM_API_URL ?? "https://dev-api.pullim.ai";
export const COOKIE_AT = "dev-pullim-at";
export const COOKIE_RT = "dev-pullim-rt";
export const CSRF_HEADER = "x-csrf-token"; // T1 실측으로 확정

// dev-api Set-Cookie를 우리 origin용으로 재기록: Domain 제거(host-only), refresh Path /auth→/api/auth,
//   HttpOnly·Secure·SameSite 보존(토큰 httpOnly 유지).
export function rewriteSetCookie(line: string): string {
  let out = line.replace(/;\s*Domain=[^;]*/i, "");
  out = out.replace(/;\s*Path=\/auth\b/i, "; Path=/api/auth");
  return out;
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
  opts: { method?: string; jsonBody?: unknown; cookie?: string | null; csrf?: string | null } = {},
): Promise<{ status: number; body: unknown; setCookies: string[] }> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (opts.jsonBody !== undefined) headers["content-type"] = "application/json";
  if (opts.cookie) headers["cookie"] = opts.cookie;
  if (opts.csrf) headers[CSRF_HEADER] = opts.csrf;
  // dev-api CSRF Origin 검증 통과용 — 서버 발 요청이라 Origin을 명시(허용값은 T1 실측으로 확정).
  headers["origin"] = PULLIM_API_URL;
  const res = await fetch(`${PULLIM_API_URL}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.jsonBody !== undefined ? JSON.stringify(opts.jsonBody) : undefined,
    redirect: "manual",
  });
  // Next/undici: 다중 Set-Cookie는 getSetCookie()로 수집.
  const setCookies = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  let body: unknown = null;
  const text = await res.text();
  if (text) { try { body = JSON.parse(text); } catch { body = text; } }
  return { status: res.status, body, setCookies };
}
