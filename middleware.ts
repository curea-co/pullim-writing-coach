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

// Codex PR #65 ②: 응답 envelope을 /api/score 기존 계약(grading.ts errorEnvelope)과 동일하게.
//   ScoreForm은 비-200 응답에서 `env.error.code` 읽음. 새 코드 만들지 않고 E-CAP 재사용
//   (이미 429 매핑 + "사용량 많아요" 카피). 사용자에게 일관된 메시지 + retry-after 헤더 유지.
function rateLimitResponse(retryAfterSec: number): NextResponse {
  return new NextResponse(
    JSON.stringify({
      error: {
        code: "E-CAP",
        message: "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.",
      },
    }),
    {
      status: 429,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "retry-after": String(retryAfterSec),
      },
    },
  );
}

export function middleware(req: NextRequest) {
  const ip = getClientIp(req);
  if (ip === null) return NextResponse.next(); // 식별 불가 — bypass
  const now = Date.now();
  cleanupExpired(BUCKETS, now, 1000);
  const result = checkRateLimit(BUCKETS, ip, now, WINDOW_MS, LIMIT);
  if (result.allowed) return NextResponse.next();
  return rateLimitResponse(result.retryAfterSec);
}

export const config = {
  matcher: ["/api/score"],
};
