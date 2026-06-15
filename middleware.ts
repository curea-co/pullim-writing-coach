// Edge Middleware — /api/score · /api/coach IP당 분당 N회 rate limit.
//   목적: NEXT_PUBLIC_DEMO_TOKEN(클라 번들 inline)이 외부에 노출돼도 무한 호출 차단.
//        Anthropic Haiku 호출당 과금이라 비용 폭주 1차 방어선.
//   pure 로직(checkRateLimit)은 app/lib/rate-limit.ts — next/server 의존 없이 단위 테스트.
//
// 한계 (운영자 인지):
//   - Edge runtime instance마다 별도 메모리 — 멀티 instance면 IP당 실효 limit이 곱해짐.
//   - 진짜 강한 보호: Vercel KV / Upstash Redis 분산 카운터. 1차는 in-memory.
//   - prod 출시 시 KV 도입 + IP뿐 아니라 토큰 단위·일일 cap·Anthropic 월 예산 알람 함께.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  checkRateLimit,
  cleanupExpired,
  type RateLimitBucket,
} from "@/app/lib/rate-limit";
import { errorEnvelope } from "@/app/lib/grading";

const BUCKETS = new Map<string, RateLimitBucket>();
const WINDOW_MS = 60_000;
// Codex PR #65: 2-tier 제한 — cookie 무시 봇이 매 요청 새 anonId로 user 카운터 reset 시켜도
//   IP 카운터에 잡힘. 정상 학교 환경(30명 공유 IP)도 IP_LIMIT 60이면 여유.
//
// EPIC2 T2.4: /api/coach 추가. 코치는 과정 첨삭이라 한 학생이 단락별·재시도로 호출이 잦다
//   → /api/score보다 여유로운 분당 한도. score 한도는 기존 검증값 그대로 보존.
//   per-path 한도를 lookup으로 분기, 엔드포인트별 카운터는 path-prefix 키로 분리.
// Codex PR #71 round 2: /api/extract도 Anthropic 호출 — score와 동일 한도 적용. matcher에는
//   포함했는데 resolvePath에서 누락되면 matched=null 분기로 빠져 rate limit이 전혀 안 걸림.
type PathLimits = { user: number; ip: number };
const SCORE_LIMITS: PathLimits = { user: 10, ip: 60 }; // 기존 /api/score 값 — 변경 금지
const COACH_LIMITS: PathLimits = { user: 20, ip: 120 }; // 코치는 호출 잦음 → 2배 여유
const EXTRACT_LIMITS: PathLimits = { user: 10, ip: 60 }; // 안내서 추출 — score와 동일 한도

// 요청 경로 → 적용 한도 + 카운터 키 prefix(엔드포인트별 버킷 격리).
//   matcher가 세 경로만 통과시키므로 매칭 실패는 정상적으로 발생하지 않음(방어적 null).
function resolvePath(pathname: string): { prefix: string; limits: PathLimits } | null {
  if (pathname.startsWith("/api/coach")) return { prefix: "coach", limits: COACH_LIMITS };
  if (pathname.startsWith("/api/extract")) return { prefix: "extract", limits: EXTRACT_LIMITS };
  if (pathname.startsWith("/api/score")) return { prefix: "score", limits: SCORE_LIMITS };
  return null;
}

const COOKIE_KEY = "pwc-rl-id";
const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 30; // 30일

// Codex PR #65 ①: 일반 x-forwarded-for는 공격자가 매 요청마다 다른 값 넣어 우회 가능.
//   Vercel은 자체 검증한 IP를 x-vercel-forwarded-for / x-real-ip에 설정(사용자 입력 헤더
//   덮어쓰기). 신뢰 가능한 헤더만 사용. dev/non-Vercel은 둘 다 없을 가능성 → null bypass.
function getClientIp(req: NextRequest): string | null {
  const vercelXff = req.headers.get("x-vercel-forwarded-for");
  if (vercelXff) {
    const first = vercelXff.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return null;
}

// Codex PR #65: 응답 envelope을 /api/score 기존 계약(grading.ts errorEnvelope)과 단일 소스
//   공유 — 메시지 카피·코드·HTTP status 일관성 보장. retry-after 헤더는 별도 유지(spec 외).
function rateLimitResponse(retryAfterSec: number): NextResponse {
  return new NextResponse(JSON.stringify(errorEnvelope("E-CAP")), {
    status: 429,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "retry-after": String(retryAfterSec),
    },
  });
}

// 익명 ID 생성/조회. cookie가 없으면 발급(setCookie=true) + 응답에 attach.
//   crypto.randomUUID는 Edge runtime 지원.
function getOrIssueAnonId(req: NextRequest): { id: string; isNew: boolean } {
  const existing = req.cookies.get(COOKIE_KEY)?.value;
  if (existing) return { id: existing, isNew: false };
  return { id: crypto.randomUUID(), isNew: true };
}

export function middleware(req: NextRequest) {
  const matched = resolvePath(req.nextUrl.pathname);
  if (matched === null) return NextResponse.next(); // matcher 외 경로 — bypass(방어적)
  const { prefix, limits } = matched;

  const ip = getClientIp(req);
  if (ip === null) return NextResponse.next(); // 식별 불가 — bypass
  const now = Date.now();
  const { id: anonId, isNew } = getOrIssueAnonId(req);
  cleanupExpired(BUCKETS, now, 1000);

  // 2-tier 검사. 두 키 모두 카운터 증가 — 봇이 cookie reset해도 IP 카운터는 누적.
  // 둘 중 어느 하나라도 차단이면 429. retry-after는 더 큰 retryAfterSec(보수적).
  // 키에 path prefix 포함 → /api/score 와 /api/coach 카운터가 서로 간섭하지 않음.
  const ipResult = checkRateLimit(BUCKETS, `ip:${prefix}:${ip}`, now, WINDOW_MS, limits.ip);
  const userResult = checkRateLimit(BUCKETS, `usr:${prefix}:${ip}:${anonId}`, now, WINDOW_MS, limits.user);

  let res: NextResponse;
  if (!ipResult.allowed || !userResult.allowed) {
    const retry = Math.max(
      ipResult.allowed ? 0 : ipResult.retryAfterSec,
      userResult.allowed ? 0 : userResult.retryAfterSec,
    );
    res = rateLimitResponse(retry);
  } else {
    res = NextResponse.next();
  }
  if (isNew) {
    res.cookies.set(COOKIE_KEY, anonId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE_SEC,
      secure: process.env.NODE_ENV === "production",
    });
  }
  return res;
}

export const config = {
  // Codex PR #69/#71: Anthropic 호출 모든 라우트에 동일한 인증·rate limit·CORS 적용.
  //   NEXT_PUBLIC_DEMO_TOKEN 노출 환경에서 어느 라우트도 우회 가능하면 비용 폭주 위험 → 셋 다 포함.
  matcher: ["/api/score", "/api/extract", "/api/coach"],
};
