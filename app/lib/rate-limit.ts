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

// Map 크기 cap — 무한 증가 방지(Codex PR #65: IP rotation 공격 시 만료 엔트리 없어도
//   evict 보장 필요). size > maxSize면 만료 우선, 없으면 가장 오래 들어온 키(Map 삽입
//   순서 = LRU 근사) 1건 강제 evict. 활성 키도 가끔 evict될 수 있으나 다음 요청에서
//   새 윈도우로 재진입 — 비용 보호는 약간 약화되지만 메모리 OOM보다 안전.
export function cleanupExpired(
  buckets: Map<string, RateLimitBucket>,
  now: number,
  maxSize: number,
): void {
  if (buckets.size <= maxSize) return;
  // 만료 우선 evict
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
      return;
    }
  }
  // 만료 없으면 첫 엔트리(Map 삽입 순서) 강제 evict — 메모리 cap 보장.
  const firstKey = buckets.keys().next().value;
  if (firstKey !== undefined) buckets.delete(firstKey);
}
