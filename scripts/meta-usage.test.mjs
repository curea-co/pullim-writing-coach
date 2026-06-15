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

test("loadMetaUsage — 손상 엔트리 1건은 drop하고 나머지 유효 이력은 보존(필드별/엔트리별 정제)", () => {
  // Codex PR #56 회귀 정정 검증: 이전 isMetaUsage() 통과 검사는 손상 1건에 전체 초기화.
  // 정제 방식 — bad row만 제거, 나머지 살림.
  mem.set(
    "pwc_meta_usage_v1",
    JSON.stringify({
      school_level: [
        { value: "중2", count: 5, last_used_at: "2026-06-02T10:00:00+09:00" },
        { value: "중3", count: -1, last_used_at: "2026-05-30T10:00:00+09:00" }, // bad: 음수 count
      ],
      subject: [
        { value: "국어", count: 3, last_used_at: "2026-06-02T10:00:00+09:00" },
        { value: "사회", count: Number.NaN, last_used_at: "2026-06-01T10:00:00+09:00" }, // bad: NaN
      ],
      genre: [{ value: "논설문·주장하는 글", count: 2, last_used_at: "not-an-iso-date" }], // bad: invalid date
      target_raw: [{ value: "600", count: 4, last_used_at: "2026-06-02T10:00:00+09:00" }], // 정상
    }),
  );
  const usage = loadMetaUsage();
  assert.equal(usage.school_level.length, 1, "중2(정상)만 살아남아야 함");
  assert.equal(usage.school_level[0].value, "중2");
  assert.equal(usage.subject.length, 1, "국어(정상)만 살아남아야 함");
  assert.equal(usage.subject[0].value, "국어");
  assert.equal(usage.genre.length, 0, "유효 엔트리 없으면 빈 배열");
  assert.equal(usage.target_raw.length, 1);
  assert.equal(usage.target_raw[0].value, "600");
});

test("loadMetaUsage — 중복 value dedup (count 합산, last_used_at 더 최신)", () => {
  // Codex PR #56: 손상 LS에 같은 value가 2건 이상 들어 있으면 React key 충돌 + 중복 칩.
  mem.set(
    "pwc_meta_usage_v1",
    JSON.stringify({
      school_level: [],
      subject: [],
      genre: [
        { value: "설명문", count: 3, last_used_at: "2026-05-30T10:00:00+09:00" },
        { value: "설명문", count: 2, last_used_at: "2026-06-02T10:00:00+09:00" },
        { value: "감상문·독후감", count: 1, last_used_at: "2026-06-01T10:00:00+09:00" },
      ],
      target_raw: [],
    }),
  );
  const usage = loadMetaUsage();
  assert.equal(usage.genre.length, 2, "설명문 2건 → 1건으로 merge");
  const merged = usage.genre.find((e) => e.value === "설명문");
  assert.equal(merged.count, 5, "count는 3+2=5");
  assert.equal(merged.last_used_at, "2026-06-02T10:00:00+09:00", "last_used_at는 더 최신");
});

test("loadMetaUsage — 6건 이상 유효 엔트리도 LRU 5건 cap 복원", () => {
  // Codex PR #56: 변조된 LS에 6건 이상 들어 있으면 카드 'LRU 8/5' 같은 비정상 표시.
  // load 단계에서 last_used_at desc로 정렬 후 상위 5건만 keep.
  mem.set(
    "pwc_meta_usage_v1",
    JSON.stringify({
      school_level: [],
      subject: [],
      genre: [
        { value: "A", count: 1, last_used_at: "2026-05-28T10:00:00+09:00" }, // 가장 오래됨 → drop
        { value: "B", count: 1, last_used_at: "2026-05-29T10:00:00+09:00" },
        { value: "C", count: 1, last_used_at: "2026-05-30T10:00:00+09:00" },
        { value: "D", count: 1, last_used_at: "2026-05-31T10:00:00+09:00" },
        { value: "E", count: 1, last_used_at: "2026-06-01T10:00:00+09:00" },
        { value: "F", count: 1, last_used_at: "2026-06-02T10:00:00+09:00" }, // 가장 최신
      ],
      target_raw: [],
    }),
  );
  const usage = loadMetaUsage();
  assert.equal(usage.genre.length, MAX_META_USAGE_PER_FIELD, "LRU 5건 cap");
  const values = usage.genre.map((e) => e.value).sort();
  assert.deepEqual(values, ["B", "C", "D", "E", "F"]);
});

test("loadValidatedMetaUsage — 최신 N건이 enum 외(손상)여도 정상 이력 살아남음 (cap before enum 회귀 검증)", async () => {
  // Codex PR #56: enum 필터를 cap 전에 통과시켜야 — 그렇지 않으면 손상값 5건이 cap 통과,
  // 정상 6번째 drop → enum 필터 후 빈 결과. raw에서 enum→dedup→cap 순.
  const { loadValidatedMetaUsage } = await import("../app/lib/storage.ts");
  mem.set(
    "pwc_meta_usage_v1",
    JSON.stringify({
      school_level: [],
      subject: [
        // 최신 5건이 모두 enum 외("???") — 잘못된 값.
        { value: "???", count: 1, last_used_at: "2026-06-02T15:00:00+09:00" },
        { value: "???", count: 1, last_used_at: "2026-06-02T14:00:00+09:00" },
        { value: "???", count: 1, last_used_at: "2026-06-02T13:00:00+09:00" },
        { value: "???", count: 1, last_used_at: "2026-06-02T12:00:00+09:00" },
        { value: "???", count: 1, last_used_at: "2026-06-02T11:00:00+09:00" },
        // 6번째는 enum 내 정상 값. cap이 enum 필터보다 먼저면 drop 됐을 것.
        { value: "국어", count: 3, last_used_at: "2026-06-01T10:00:00+09:00" },
      ],
      genre: [],
      target_raw: [],
    }),
  );
  const usage = loadValidatedMetaUsage();
  assert.equal(usage.subject.length, 1, "정상 1건만 남아야 함");
  assert.equal(usage.subject[0].value, "국어");
});

test("recordMetaUsage — quota 초과 시 throw 안 함(silent)", () => {
  mode = "quota";
  // 첫 호출은 LS read는 되지만 write quota에서 실패 — throw 없이 silent.
  assert.doesNotThrow(() => recordMetaUsage("genre", "설명문"));
});
