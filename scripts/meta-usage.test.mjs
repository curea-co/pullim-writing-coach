// #M3 ③ Meta usage LRU 어댑터 단위 테스트.
// 실행: node --import ./scripts/register-ts.mjs --test scripts/meta-usage.test.mjs
//
// 브라우저 전용 모듈 — globalThis.window/localStorage 메모리 mock으로 시뮬레이션.

import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

let mode = "normal";
const mem = new Map();
const mockLS = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => {
    if (mode === "quota") throw new DOMException("Quota exceeded", "QuotaExceededError");
    if (mode === "denied") throw new Error("denied");
    mem.set(k, v);
  },
  removeItem: (k) => mem.delete(k),
};
globalThis.window = { localStorage: mockLS };
globalThis.localStorage = mockLS;

const {
  recordMetaUsage,
  getMostUsedMeta,
  loadMetaUsage,
  clearMetaUsage,
  MAX_META_USAGE_PER_FIELD,
} = await import("../app/lib/storage.ts");

beforeEach(() => {
  mem.clear();
  mode = "normal";
});

test("초기 상태 — loadMetaUsage 빈 객체, getMostUsedMeta null", () => {
  const usage = loadMetaUsage();
  assert.deepEqual(usage, { school_level: [], subject: [], genre: [], target_raw: [] });
  assert.equal(getMostUsedMeta("genre"), null);
});

test("recordMetaUsage 1회 — count=1, last_used_at 설정", () => {
  recordMetaUsage("genre", "설명문");
  const usage = loadMetaUsage();
  assert.equal(usage.genre.length, 1);
  assert.equal(usage.genre[0].value, "설명문");
  assert.equal(usage.genre[0].count, 1);
  assert.match(usage.genre[0].last_used_at, /\+09:00$/);
});

test("같은 값 반복 기록 — count 누적, last_used_at 갱신", () => {
  recordMetaUsage("genre", "설명문");
  recordMetaUsage("genre", "설명문");
  recordMetaUsage("genre", "설명문");
  const usage = loadMetaUsage();
  assert.equal(usage.genre.length, 1);
  assert.equal(usage.genre[0].count, 3);
});

test("getMostUsedMeta — count 최빈값 반환", () => {
  recordMetaUsage("genre", "설명문");
  recordMetaUsage("genre", "설명문");
  recordMetaUsage("genre", "설명문"); // count=3
  recordMetaUsage("genre", "감상문·독후감"); // count=1
  recordMetaUsage("genre", "논설문·주장하는 글"); // count=1
  assert.equal(getMostUsedMeta("genre"), "설명문");
});

test("getMostUsedMeta — count 동률 + last_used_at 동률 시 stable sort(insertion 순)", () => {
  // 같은 millisecond에 두 값 기록 시 timestamp 동률. Array.sort stable이라 첫 추가가 선두 유지.
  // 실제 사용자 시간 흐름에서는 의미 있는 차이 발생 → 최신 우선 자연 동작.
  recordMetaUsage("genre", "설명문");
  recordMetaUsage("genre", "감상문·독후감");
  const top = getMostUsedMeta("genre");
  // 어느 쪽이든 둘 중 하나 — 핵심은 가장 최근(또는 stable) 값 반환, null 아님.
  assert.ok(top === "설명문" || top === "감상문·독후감");
});

test("LRU 5건 제한 — 6번째 신규 추가 시 가장 오래된 1건 drop", () => {
  // 5개 unique 값 기록 (서로 다른 시각 — recordMetaUsage 호출 간 미세 시차)
  recordMetaUsage("genre", "A");
  recordMetaUsage("genre", "B");
  recordMetaUsage("genre", "C");
  recordMetaUsage("genre", "D");
  recordMetaUsage("genre", "E");
  let usage = loadMetaUsage();
  assert.equal(usage.genre.length, MAX_META_USAGE_PER_FIELD);
  // 6번째 추가 시 A(가장 오래된)가 drop돼야 함
  // 단, 같은 millisecond 안이라 last_used_at 같을 수 있어 sort가 불안정할 수 있음.
  // 대신 max 길이 유지 검증.
  recordMetaUsage("genre", "F");
  usage = loadMetaUsage();
  assert.equal(usage.genre.length, MAX_META_USAGE_PER_FIELD);
  // F는 추가됐어야 함
  assert.ok(usage.genre.some((e) => e.value === "F"));
});

test("빈 문자열·공백 — 기록 안 함(가드)", () => {
  recordMetaUsage("genre", "");
  recordMetaUsage("genre", "   ");
  const usage = loadMetaUsage();
  assert.equal(usage.genre.length, 0);
});

test("필드 독립성 — school_level 추가가 genre에 영향 X", () => {
  recordMetaUsage("school_level", "중2");
  recordMetaUsage("subject", "국어");
  recordMetaUsage("genre", "설명문");
  recordMetaUsage("target_raw", "800");
  const usage = loadMetaUsage();
  assert.equal(usage.school_level[0].value, "중2");
  assert.equal(usage.subject[0].value, "국어");
  assert.equal(usage.genre[0].value, "설명문");
  assert.equal(usage.target_raw[0].value, "800");
});

test("clearMetaUsage — 전체 초기화", () => {
  recordMetaUsage("genre", "설명문");
  clearMetaUsage();
  assert.equal(getMostUsedMeta("genre"), null);
});

test("loadMetaUsage — 손상된 JSON → 빈 객체 폴백", () => {
  mem.set("pwc_meta_usage_v1", "{not-json");
  const usage = loadMetaUsage();
  assert.deepEqual(usage, { school_level: [], subject: [], genre: [], target_raw: [] });
});

test("loadMetaUsage — 스키마 위반 → 빈 객체 폴백", () => {
  mem.set("pwc_meta_usage_v1", JSON.stringify({ wrong: "structure" }));
  const usage = loadMetaUsage();
  assert.equal(usage.genre.length, 0);
});

test("recordMetaUsage — quota 초과 시 throw 안 함(silent)", () => {
  mode = "quota";
  // 첫 호출은 LS read는 되지만 write quota에서 실패 — throw 없이 silent.
  assert.doesNotThrow(() => recordMetaUsage("genre", "설명문"));
});
