// Edge Middleware — /api/score IP당 분당 N회 rate limit.
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
const LIMIT = 10;
// Codex PR #65 ②: 학교/학원 같은 공유 IP 환경에서 IP만 키로 쓰면 30명이 동시 사용 시
//   1명이 10번 채우면 나머지 모두 429. cookie 익명 ID(첫 진입 시 발급)와 조합해
//   같은 IP 안에서도 사용자별 카운터 분리. cookie도 회전 가능하나 IP+cookie 조합이면
//   단순 IP 회전보다 우회 비용 ↑.
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
  const ip = getClientIp(req);
  if (ip === null) return NextResponse.next(); // 식별 불가 — bypass
  const now = Date.now();
  const { id: anonId, isNew } = getOrIssueAnonId(req);
  const key = `${ip}:${anonId}`;
  cleanupExpired(BUCKETS, now, 1000);
  const result = checkRateLimit(BUCKETS, key, now, WINDOW_MS, LIMIT);
  const res = result.allowed ? NextResponse.next() : rateLimitResponse(result.retryAfterSec);
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
  matcher: ["/api/score"],
};
