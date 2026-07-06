// pullim-api(통합 IdP) 쿠키/CSRF 전송 계층.
//
// pullim-planner `packages/api-client/src/{cookie-http,errors,url}.ts` 이식(자체 포함판).
// writing-coach는 monorepo 패키지가 없어 한 파일에 합쳤다. 동작 동형:
// - 인증: HttpOnly 쿠키(access/refresh) — 모든 요청 `credentials:"include"` 자동 첨부(ADR-010)
// - CSRF: 상태변경 요청은 double-submit — `GET /auth/csrf` 토큰을 `X-CSRF-Token`로 동봉(GET 면제)
// - 응답: pullim-api DTO 본문 그대로 / 에러: NestJS `{ message, error, statusCode }`

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** pullim-api 에러를 감싼 공통 예외 — `code`/`statusCode`로 분기. */
export class ApiError extends Error {
  readonly code: string;
  readonly statusCode: number;
  constructor(error: { code: string; message: string; statusCode: number }) {
    super(error.message);
    this.name = "ApiError";
    this.code = error.code;
    this.statusCode = error.statusCode;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export interface CookieHttpConfig {
  /** pullim-api origin. 예: http://api.pullim.local:3000 / https://api.pullim.ai */
  baseUrl: string;
  /** 테스트·SSR fetch 주입(기본 전역 fetch). */
  fetchImpl?: typeof fetch;
  /** non-HttpOnly CSRF 쿠키 이름(env별). 미주입 토큰은 이 쿠키에서 자동 회수. */
  csrfCookieName?: string;
}

export interface CookieRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  csrfToken?: string;
  query?: Record<string, string | undefined>;
  headers?: Record<string, string>;
}

interface PullimApiErrorBody {
  code?: string;
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

const STATUS_TO_CODE: Record<number, string> = {
  400: "COMMON_BAD_REQUEST",
  401: "AUTH_UNAUTHORIZED",
  403: "AUTH_FORBIDDEN",
  404: "COMMON_NOT_FOUND",
  409: "COMMON_CONFLICT",
  422: "COMMON_VALIDATION_FAILED",
};

function toApiError(body: unknown, status: number): ApiError {
  const e = (body ?? {}) as PullimApiErrorBody;
  const isValidation = Array.isArray(e.message);
  const message = Array.isArray(e.message)
    ? e.message.join(", ")
    : (e.message ?? `요청에 실패했어요 (${status})`);
  const code =
    e.code ??
    (isValidation
      ? "COMMON_VALIDATION_FAILED"
      : (STATUS_TO_CODE[status] ?? "COMMON_UNKNOWN_ERROR"));
  return new ApiError({ code, message, statusCode: e.statusCode ?? status });
}

/** `baseUrl + path(+query)` → 절대 URL. (`new URL(path, base)`는 base 경로를 버려 쓰지 않음.) */
function buildUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, string | undefined>,
): URL {
  const base = baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${base}${normalizedPath}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, value);
    }
  }
  return url;
}

/** 브라우저 `document.cookie`에서 non-HttpOnly CSRF 쿠키 값 읽기(SSR/테스트는 null). */
export function readCsrfCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  for (const part of document.cookie.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }
  return null;
}

/** pullim-api 호출 — 쿠키 자동 첨부 + (옵션) CSRF 헤더. 비 2xx → ApiError. */
export async function cookieRequest<T>(
  config: CookieHttpConfig,
  path: string,
  opts: CookieRequestOptions = {},
): Promise<T> {
  const fetchImpl = config.fetchImpl ?? fetch;
  const method = opts.method ?? "GET";
  const url = buildUrl(config.baseUrl, path, opts.query);

  const headers: Record<string, string> = { ...opts.headers };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  const csrfToken = SAFE_METHODS.has(method)
    ? undefined
    : (opts.csrfToken ??
      (config.csrfCookieName
        ? (readCsrfCookie(config.csrfCookieName) ?? undefined)
        : undefined));
  if (csrfToken) headers["X-CSRF-Token"] = csrfToken;

  let response: Response;
  let text: string;
  try {
    response = await fetchImpl(url.toString(), {
      method,
      headers,
      // 쿠키(access/refresh/csrf) 자동 첨부. cross-origin은 CORS가 Allow-Credentials:true + 명시 Origin 필요.
      credentials: "include",
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
    text = await response.text();
  } catch (error) {
    throw new ApiError({
      code: "network_error",
      message:
        error instanceof Error
          ? error.message
          : "네트워크 오류가 발생했어요. 연결을 확인해주세요.",
      statusCode: 0,
    });
  }

  let payload: unknown = undefined;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = undefined;
    }
  }

  if (!response.ok) throw toApiError(payload, response.status);
  return payload as T;
}

/** CSRF 부트스트랩 — `GET /auth/csrf` 토큰 수신(+ non-HttpOnly CSRF 쿠키 설정). */
export async function bootstrapCsrf(config: CookieHttpConfig): Promise<string> {
  const { csrfToken } = await cookieRequest<{ csrfToken: string }>(
    config,
    "/auth/csrf",
  );
  return csrfToken;
}
