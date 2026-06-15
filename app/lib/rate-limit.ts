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
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }
  if (bucket.count >= limit) {
    return { allowed: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count += 1;
  return { allowed: true };
}

// Map 크기 cap — 무한 증가 방지. Codex PR #65: 1건만 evict하면 churn 환경에서 직후 새 키
//   진입으로 size가 영구 maxSize 초과 → cap 무효. size <= maxSize 될 때까지 반복 evict.
//   순서: 만료 엔트리 전부 → 그래도 초과면 Map 첫 키(삽입 순서 = LRU 근사) 강제 evict.
export function cleanupExpired(
  buckets: Map<string, RateLimitBucket>,
  now: number,
  maxSize: number,
): void {
  if (buckets.size <= maxSize) return;
  // 만료 엔트리 전부 evict (iteration 중 delete는 Map에서 안전).
  for (const [key, bucket] of buckets) {
    if (buckets.size <= maxSize) return;
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  // 그래도 cap 초과면 가장 오래된 키부터 강제 evict.
  while (buckets.size > maxSize) {
    const firstKey = buckets.keys().next().value;
    if (firstKey === undefined) break;
    buckets.delete(firstKey);
  }
}
