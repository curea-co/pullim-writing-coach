// rate-limit 단위 테스트 — middleware의 pure 로직(app/lib/rate-limit.ts)만 검증.
//   middleware.ts 자체는 next/server 의존 + edge runtime — 통합 테스트는 별도(E2E)에서.
// 실행: node --import ./scripts/register-ts.mjs --test scripts/middleware.test.mjs

import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

const { checkRateLimit, cleanupExpired } = await import("../app/lib/rate-limit.ts");

const WINDOW_MS = 60_000;
const LIMIT = 10;
let buckets;
let now;

beforeEach(() => {
  buckets = new Map();
  now = 1_700_000_000_000; // 고정 시각 — Date.now() 비결정성 회피
});

test("같은 키 10회 통과, 11회째는 차단 + retryAfterSec 반환", () => {
  for (let i = 0; i < LIMIT; i++) {
    const r = checkRateLimit(buckets, "ip1", now, WINDOW_MS, LIMIT);
    assert.equal(r.allowed, true, `${i + 1}번째는 통과`);
  }
  const blocked = checkRateLimit(buckets, "ip1", now, WINDOW_MS, LIMIT);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSec > 0);
  assert.ok(blocked.retryAfterSec <= WINDOW_MS / 1000);
});

test("다른 키는 독립 카운터", () => {
  for (let i = 0; i < LIMIT; i++) checkRateLimit(buckets, "ip1", now, WINDOW_MS, LIMIT);
  const blockedA = checkRateLimit(buckets, "ip1", now, WINDOW_MS, LIMIT);
  assert.equal(blockedA.allowed, false);
  const okB = checkRateLimit(buckets, "ip2", now, WINDOW_MS, LIMIT);
  assert.equal(okB.allowed, true);
});

test("윈도우 만료 후 카운터 reset — 다시 LIMIT만큼 허용", () => {
  for (let i = 0; i < LIMIT; i++) checkRateLimit(buckets, "ip1", now, WINDOW_MS, LIMIT);
  assert.equal(checkRateLimit(buckets, "ip1", now, WINDOW_MS, LIMIT).allowed, false);
  // 윈도우 + 1ms 경과 — 새 윈도우 시작
  const later = now + WINDOW_MS + 1;
  assert.equal(checkRateLimit(buckets, "ip1", later, WINDOW_MS, LIMIT).allowed, true);
});

test("retryAfterSec — resetAt와 now의 차이를 초로 올림", () => {
  for (let i = 0; i < LIMIT; i++) checkRateLimit(buckets, "ip1", now, WINDOW_MS, LIMIT);
  // 30초 뒤 차단 시: retryAfterSec ≈ 30
  const blocked = checkRateLimit(buckets, "ip1", now + 30_000, WINDOW_MS, LIMIT);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSec, 30);
});

test("경계 시각 resetAt === now에 들어온 요청은 새 윈도우 첫 요청 (Codex PR #65)", () => {
  // 1차 진입에서 resetAt = now + WINDOW_MS 설정됨.
  for (let i = 0; i < LIMIT; i++) checkRateLimit(buckets, "ip1", now, WINDOW_MS, LIMIT);
  // 정확히 만료 시각에 들어온 요청 — 새 윈도우 시작이어야 함.
  const exactBoundary = checkRateLimit(buckets, "ip1", now + WINDOW_MS, WINDOW_MS, LIMIT);
  assert.equal(exactBoundary.allowed, true, "resetAt === now는 새 윈도우 첫 요청");
});

test("cleanupExpired — maxSize 초과 + 만료 엔트리 있을 때 1건 정리", () => {
  // 만료된 엔트리 1건 + 유효 엔트리 1건
  buckets.set("expired", { count: 5, resetAt: now - 1000 });
  buckets.set("valid", { count: 1, resetAt: now + 1000 });
  // maxSize=1이면 size=2 > 1이라 cleanup 발동
  cleanupExpired(buckets, now, 1);
  assert.equal(buckets.has("expired"), false);
  assert.equal(buckets.has("valid"), true);
});

test("cleanupExpired — size ≤ maxSize면 no-op (cleanup 비용 없음)", () => {
  buckets.set("expired", { count: 5, resetAt: now - 1000 });
  cleanupExpired(buckets, now, 10);
  assert.equal(buckets.has("expired"), true, "size=1 ≤ maxSize=10이면 정리 안 함");
});

test("cleanupExpired — 만료 없어도 size 초과 시 가장 오래된 키 강제 evict (Codex PR #65 IP rotation 방어)", () => {
  // 모두 유효(만료 없음), size=3, maxSize=2
  buckets.set("oldest", { count: 1, resetAt: now + 10_000 });
  buckets.set("mid", { count: 1, resetAt: now + 10_000 });
  buckets.set("newest", { count: 1, resetAt: now + 10_000 });
  cleanupExpired(buckets, now, 2);
  // 첫 삽입 키(Map 순서) 'oldest' evict
  assert.equal(buckets.has("oldest"), false, "Map 첫 키 evict");
  assert.equal(buckets.has("mid"), true);
  assert.equal(buckets.has("newest"), true);
  assert.equal(buckets.size, 2);
});

test("cleanupExpired — 만료 1건 + 유효 다수 시 만료 우선 evict", () => {
  buckets.set("valid1", { count: 1, resetAt: now + 10_000 });
  buckets.set("expired", { count: 5, resetAt: now - 1000 });
  buckets.set("valid2", { count: 1, resetAt: now + 10_000 });
  cleanupExpired(buckets, now, 2);
  assert.equal(buckets.has("expired"), false, "만료 우선");
  assert.equal(buckets.has("valid1"), true);
  assert.equal(buckets.has("valid2"), true);
});
