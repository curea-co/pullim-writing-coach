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

const BUCKETS = new Map<string, RateLimitBucket>();
const WINDOW_MS = 60_000;
const LIMIT = 10;

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip") || "unknown";
}

export function middleware(req: NextRequest) {
  const ip = getClientIp(req);
  const now = Date.now();
  cleanupExpired(BUCKETS, now, 1000);
  const result = checkRateLimit(BUCKETS, ip, now, WINDOW_MS, LIMIT);
  if (result.allowed) return NextResponse.next();
  return new NextResponse(
    JSON.stringify({
      error: "E-RATELIMIT",
      message: "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.",
      retry_after_sec: result.retryAfterSec,
    }),
    {
      status: 429,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "retry-after": String(result.retryAfterSec),
      },
    },
  );
}

export const config = {
  matcher: ["/api/score"],
};
