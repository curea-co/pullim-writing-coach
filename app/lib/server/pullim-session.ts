// Pullim Writing Coach — 서버 세션 인가 (Phase 3, ITEM 1)
//   데모토큰 게이트 → 중앙 SSO 세션 소비로 전환.
//   verifyWritingAccess(req): access 쿠키(dev-pullim-at)가 있으면 서버에서 {API}/me 를 호출(쿠키 relay)
//   → 200 이면 writing 권한 보유(회원) → true. (/me는 flags 미반환, 모든 회원 writing>=1이라 200=인가)
//
//   /me 200 아님 또는 access 쿠키 없음:
//     - NODE_ENV !== "production": 기존 데모토큰 fallback(x-demo-token vs DEMO_ACCESS_TOKEN, 상수시간).
//       로컬(pullim.local)은 access 쿠키가 host-only on api 호스트라 writing-coach 서버에 도달 안 함 →
//       데모토큰 경로로만 통과(클라가 x-demo-token 헤더 송신).
//     - production: false (fail-closed, 데모 fallback 없음).
//
// 모듈 경계: server 전용(부수효과: env·fetch·crypto). client 번들 유출 방지 위해 import 'server-only'.
//   자격증명/토큰/쿠키값은 어디서도 로깅하지 않는다.

import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";

// access 쿠키 이름 — dev/prod는 Domain=.pullim.ai 로 writing-coach 서버에 도달.
const ACCESS_COOKIE = "dev-pullim-at";

// 인증 API 호스트 — env로 주입. prod에서 미설정 시 dev로 fallback하면 서버 인증 검증이 dev-api로
//   새므로 빈 값(=상대요청 → 서버 fetch 실패 → verify catch에서 fail-closed). dev/local만 기본값.
function apiBase(): string {
  const v = process.env.NEXT_PUBLIC_API_URL;
  if (v) return v.replace(/\/$/, "");
  return process.env.NODE_ENV === "production" ? "" : "https://dev-api.pullim.ai";
}

// 길이 누설 방지: 양쪽을 고정 길이 해시로 비교(timingSafeEqual은 길이 다르면 throw).
function timingSafeEqualStr(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

// cookie 헤더 문자열에서 access 쿠키 존재 여부만 확인(값은 디코드/사용 안 함 — fetch에 원본 relay).
function hasAccessCookie(cookieHeader: string | null): boolean {
  if (!cookieHeader) return false;
  return cookieHeader.split(";").some((pair) => pair.trim().startsWith(`${ACCESS_COOKIE}=`));
}

// 로컬 전용 데모토큰 fallback — 기존 isAuthorized 로직 이식. fail-closed 보존.
function demoTokenAuthorized(req: Request): boolean {
  const expected = process.env.DEMO_ACCESS_TOKEN;
  if (!expected) {
    // 비밀 미설정이면 아무도 통과시키지 않는다(익명 인터넷 차단). 토큰값이 아닌 사실만 로깅.
    console.warn("[pullim-session] DEMO_ACCESS_TOKEN 미설정 — 데모 fallback 거부");
    return false;
  }
  const provided = req.headers.get("x-demo-token") ?? "";
  return timingSafeEqualStr(provided, expected);
}

/**
 * writing 권한(=회원 세션) 인가 여부.
 *  1) access 쿠키가 있으면 {API}/me 를 쿠키 relay로 호출 → 200 이면 true.
 *  2) /me 비200·fetch 실패·쿠키 없음:
 *     - 비production: 데모토큰 fallback.
 *     - production: false (fail-closed).
 */
export async function verifyWritingAccess(req: Request): Promise<boolean> {
  const cookieHeader = req.headers.get("cookie");

  // (1) access 쿠키 있으면 /me 세션 검증.
  if (hasAccessCookie(cookieHeader)) {
    try {
      const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_WEB_URL ?? "";
      const res = await fetch(`${apiBase()}/me`, {
        headers: {
          // cookieHeader는 위 hasAccessCookie 가드로 non-null.
          cookie: cookieHeader as string,
          ...(origin ? { origin } : {}),
        },
        cache: "no-store",
        redirect: "manual", // 302→200 페이지 추종으로 인한 인가 우회(false-positive) 방지 — 비200은 거부.
      });
      if (res.status === 200) return true;
      // 200 아님(401/403/5xx) → fallback/거부로 낙하.
    } catch {
      // 네트워크/CORS 실패 → fallback/거부로 낙하(자격증명 로깅 금지, error 미은폐 = 서버 게이트는 거부).
    }
  }

  // (2) fallback — 비production에서만 데모토큰. production은 fail-closed.
  if (process.env.NODE_ENV !== "production") {
    return demoTokenAuthorized(req);
  }
  return false;
}
