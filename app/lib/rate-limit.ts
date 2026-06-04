// Pure 함수 rate limit 카운터 — middleware/edge에서 사용. next/server 의존 없음(단위 테스트 가능).
//   WINDOW_MS 안에 LIMIT을 넘으면 { allowed: false, retryAfterSec } 반환.
//   인스턴스 메모리 BUCKETS는 호출자가 가져야 함(테스트 격리 + edge runtime 인스턴스 격리).

export type RateLimitBucket = { count: number; resetAt: number };

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSec: number };

export function checkRateLimit(
  buckets: Map<string, RateLimitBucket>,
  key: string,
  now: number,
  windowMs: number,
  limit: number,
): RateLimitResult {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }
  if (bucket.count >= limit) {
    return { allowed: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count += 1;
  return { allowed: true };
}

// 만료된 엔트리 1개 lazy cleanup — Map 크기가 IP 폭주 시 무한 증가하지 않도록.
//   요청마다 1개만 정리(O(1) amortized). 대규모 트래픽엔 별도 스케줄러 필요.
export function cleanupExpired(
  buckets: Map<string, RateLimitBucket>,
  now: number,
  maxSize: number,
): void {
  if (buckets.size <= maxSize) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) {
      buckets.delete(key);
      return;
    }
  }
}
