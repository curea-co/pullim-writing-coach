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

// Codex PR #65: IP 식별 실패 시 "unknown" 단일 bucket로 묶으면 dev/proxy 환경 모든
//   사용자가 같은 카운터 공유 → 정상 사용자도 글로벌 차단 오탐. 식별 불가는 bypass —
//   prod Vercel은 항상 x-forwarded-for 제공하므로 비용 보호 99%는 유지, dev/edge 케이스는
//   안전하게 통과.
function getClientIp(req: NextRequest): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip") || null;
}

export function middleware(req: NextRequest) {
  const ip = getClientIp(req);
  if (ip === null) return NextResponse.next(); // 식별 불가 — bypass
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
