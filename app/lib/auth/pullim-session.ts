// pullim-api(통합 IdP) 세션/auth 클라이언트 — `pullim-http` 위의 얇은 래퍼.
//
// pullim-planner `packages/api-client/src/pullim-session.ts` 이식. 차이: planner는 세션/엔타이틀먼트를
// `/planner/me`(planner EntitlementGuard)로 확인하나, writing-coach는 `writing` 서비스 모듈이 없으므로
// **서비스 무관 `GET /me/entitlements`**(account 모듈)로 flags를 받아 `flags.writing`로 게이팅한다.
// 토큰은 HttpOnly 쿠키(브라우저 자동 첨부) — 클라이언트는 CSRF 토큰 수명만 관리(double-submit).

import {
  ApiError,
  bootstrapCsrf,
  cookieRequest,
  type CookieHttpConfig,
} from "./pullim-http";

/** 로그인 요청 (`POST /auth/login`). */
export interface PullimLoginRequest {
  email: string;
  password: string;
}

/** 세션 발급 응답 (`POST /auth/login` = SessionResponseDto). 토큰은 Set-Cookie로 내려옴. */
export interface PullimSessionResponse {
  sub: string;
  accessExpiresAt: number;
  selfConsentPending: boolean;
}

/** `GET /me/entitlements` 응답(MeEntitlementsResponseDto) — 서비스별 등급 flags(max 병합). */
export interface PullimEntitlements {
  /** 서비스키 → 정수 등급(≥1 = 보유). 예: { writing: 2, store: 1 } */
  flags: Record<string, number>;
  /** entitlement epoch(즉시무효화 권위, ADR-016). */
  entEpoch: number;
}

export interface PullimSessionClient {
  /** CSRF 부트스트랩(`GET /auth/csrf`) — 토큰 수신 + 메모리 캐시. */
  ensureCsrf(): Promise<string>;
  /** 로그인 — CSRF 동봉 POST. 성공 시 세션 쿠키 설정 + CSRF 회전(캐시 무효화). */
  login(input: PullimLoginRequest): Promise<PullimSessionResponse>;
  /** 로그아웃 — CSRF 동봉 POST. 쿠키 무효화는 서버 수행. */
  logout(): Promise<void>;
  /** 엔타이틀먼트 확인(`GET /me/entitlements`) — 200 flags / 401 미인증. 세션 + writing 보유 판정. */
  entitlements(): Promise<PullimEntitlements>;
}

/**
 * CSRF 거부(토큰 회전·만료) 판정 — 403 전체가 아니라 `CSRF:` 마커로 한정(비-CSRF 403 오인 방지).
 */
function isCsrfRejection(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.statusCode === 403 &&
    /^csrf/i.test(error.message)
  );
}

export function createPullimSessionClient(
  config: CookieHttpConfig,
): PullimSessionClient {
  let csrfToken: string | null = null;
  let csrfInFlight: Promise<string> | null = null;

  async function ensureCsrf(): Promise<string> {
    if (csrfToken) return csrfToken;
    if (!csrfInFlight) {
      csrfInFlight = bootstrapCsrf(config)
        .then((token) => {
          csrfToken = token;
          return token;
        })
        .finally(() => {
          csrfInFlight = null;
        });
    }
    return csrfInFlight;
  }

  /** 상태변경 요청을 CSRF 동봉으로. 403(토큰 무효)이면 1회 재부트스트랩 후 재시도. */
  async function mutate<T>(
    path: string,
    body?: unknown,
    method: "POST" | "PATCH" = "POST",
  ): Promise<T> {
    const token = await ensureCsrf();
    try {
      return await cookieRequest<T>(config, path, {
        method,
        body,
        csrfToken: token,
      });
    } catch (error) {
      if (!isCsrfRejection(error)) throw error;
      csrfToken = null;
      const fresh = await ensureCsrf();
      return await cookieRequest<T>(config, path, {
        method,
        body,
        csrfToken: fresh,
      });
    }
  }

  return {
    ensureCsrf,

    async login(input) {
      const res = await mutate<PullimSessionResponse>("/auth/login", input);
      // login은 서버가 CSRF 토큰을 회전시킨다 — 캐시 무효화(다음 mutation이 stale 403 회귀 없게).
      csrfToken = null;
      return res;
    },

    async logout() {
      try {
        await mutate<void>("/auth/logout");
      } finally {
        csrfToken = null;
      }
    },

    entitlements() {
      // GET — CSRF 면제. 쿠키(access)로 인증. 401 → ApiError(statusCode 401) = 미인증(게스트).
      return cookieRequest<PullimEntitlements>(config, "/me/entitlements");
    },
  };
}

const PULLIM_API_URL =
  process.env.NEXT_PUBLIC_PULLIM_API_URL ?? "http://api.pullim.local:3000";
const CSRF_COOKIE_NAME =
  process.env.NEXT_PUBLIC_PULLIM_CSRF_COOKIE ?? "local-pullim-csrf";

/** writing-coach 전역 pullim 세션 클라이언트 싱글톤. */
export const pullimSession: PullimSessionClient = createPullimSessionClient({
  baseUrl: PULLIM_API_URL,
  csrfCookieName: CSRF_COOKIE_NAME,
});

/** writing-coach 서비스 entitlement 키. */
export const WRITING_FLAG = "writing";

/** flags에 writing 보유(등급 ≥1) 여부. */
export function hasWritingEntitlement(flags: Record<string, number>): boolean {
  return (flags[WRITING_FLAG] ?? 0) >= 1;
}
