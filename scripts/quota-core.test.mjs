// 무료 1일 사용 한도(쿼터) 순수 코어 테스트 — QA WRITING-ACCESS-002 계약.
// 실행: node --import ./scripts/register-ts.mjs --test scripts/quota-core.test.mjs

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FREE_DAILY_LIMITS,
  QUOTA_FIELD,
  kstDateOf,
  usedToday,
  isQuotaExceeded,
  applyQuotaConsume,
} from "../app/lib/quota-core.ts";

test("kstDateOf: UTC 자정 직전은 KST 다음날 — 롤오버 경계는 한국 자정", () => {
  // 2026-07-09 16:30 UTC = 2026-07-10 01:30 KST
  assert.equal(kstDateOf(new Date("2026-07-09T16:30:00Z")), "2026-07-10");
  // 2026-07-09 14:59 UTC = 2026-07-09 23:59 KST
  assert.equal(kstDateOf(new Date("2026-07-09T14:59:00Z")), "2026-07-09");
});

test("한도 상수: score 1회(1일 1회) · coach 3회(1세션=첫 봐줘+수정 2회 — MAX_CHECKS=3 정합)", () => {
  assert.equal(FREE_DAILY_LIMITS.score, 1);
  assert.equal(FREE_DAILY_LIMITS.coach, 3);
});

test("usedToday: 미존재·손상 payload는 0(사용자를 잘못 잠그지 않음)", () => {
  const today = "2026-07-09";
  assert.equal(usedToday(null, "score", today), 0);
  assert.equal(usedToday("garbage", "score", today), 0);
  assert.equal(usedToday({ [QUOTA_FIELD]: "broken" }, "score", today), 0);
  assert.equal(usedToday({ [QUOTA_FIELD]: { score: { d: today, n: "NaN" } } }, "score", today), 0);
});

test("usedToday: 다른 날짜 엔트리는 0 — 날짜 롤오버", () => {
  const raw = { [QUOTA_FIELD]: { score: { d: "2026-07-08", n: 1 } } };
  assert.equal(usedToday(raw, "score", "2026-07-09"), 0);
  assert.equal(isQuotaExceeded(raw, "score", "2026-07-09"), false);
});

test("isQuotaExceeded: score는 오늘 1회면 초과, coach는 3회부터 초과", () => {
  const today = "2026-07-09";
  assert.equal(isQuotaExceeded({ [QUOTA_FIELD]: { score: { d: today, n: 1 } } }, "score", today), true);
  assert.equal(isQuotaExceeded({ [QUOTA_FIELD]: { coach: { d: today, n: 2 } } }, "coach", today), false);
  assert.equal(isQuotaExceeded({ [QUOTA_FIELD]: { coach: { d: today, n: 3 } } }, "coach", today), true);
});

test("applyQuotaConsume: 기존 필드(학습 LRU)·타 기능 쿼터 보존 + 해당 기능 +1", () => {
  const today = "2026-07-09";
  const raw = {
    school_level: [{ value: "중2", count: 3, last_used_at: "2026-07-08T10:00:00+09:00" }],
    [QUOTA_FIELD]: { coach: { d: today, n: 2 } },
  };
  const next = applyQuotaConsume(raw, "score", today);
  // 학습 LRU 보존
  assert.deepEqual(next.school_level, raw.school_level);
  // 타 기능(coach) 쿼터 보존
  assert.deepEqual(next[QUOTA_FIELD].coach, { d: today, n: 2 });
  // score +1
  assert.deepEqual(next[QUOTA_FIELD].score, { d: today, n: 1 });
  // 원본 불변(순수)
  assert.equal(raw[QUOTA_FIELD].score, undefined);
});

test("applyQuotaConsume: 어제 엔트리는 오늘 1로 리셋", () => {
  const raw = { [QUOTA_FIELD]: { score: { d: "2026-07-08", n: 1 } } };
  const next = applyQuotaConsume(raw, "score", "2026-07-09");
  assert.deepEqual(next[QUOTA_FIELD].score, { d: "2026-07-09", n: 1 });
});

test("applyQuotaConsume: raw 미존재(null)여도 유효 payload 생성", () => {
  const next = applyQuotaConsume(null, "coach", "2026-07-09");
  assert.deepEqual(next[QUOTA_FIELD].coach, { d: "2026-07-09", n: 1 });
});
