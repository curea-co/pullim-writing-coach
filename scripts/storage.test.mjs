// localStorage 어댑터 + Profile 타입가드 테스트 (A2, 2026-05-28).
// 실행: node --import ./scripts/register-ts.mjs --test scripts/storage.test.mjs
// 노드 환경엔 window 없음 — 최소 mock을 import 전에 주입.

import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

class MemoryStorage {
  data = {};
  getItem(k) {
    return Object.prototype.hasOwnProperty.call(this.data, k) ? this.data[k] : null;
  }
  setItem(k, v) {
    this.data[k] = String(v);
  }
  removeItem(k) {
    delete this.data[k];
  }
  clear() {
    this.data = {};
  }
}

const storageMock = new MemoryStorage();
// window는 storage.ts가 `typeof window === "undefined"` 가드로 SSR 체크.
// globalThis.window 객체로 localStorage 노출 → 어댑터가 정상 동작.
globalThis.window = { localStorage: storageMock };

// 동적 import — window 주입 후라야 storage.ts가 SSR 가드를 통과.
const { clearProfile, consentNow, isProfile, loadProfile, saveProfile } = await import(
  "../app/lib/storage.ts"
);

beforeEach(() => storageMock.clear());

// ── isProfile ────────────────────────────────────────────────
test("isProfile — happy path (필수만)", () => {
  assert.equal(
    isProfile({
      nickname: "선혜",
      school_level: "중2",
      primary_subject: "국어",
      consent_at: "2026-05-28T20:00:00+09:00",
    }),
    true,
  );
});

test("isProfile — 모든 필드 포함", () => {
  assert.equal(
    isProfile({
      nickname: "선혜",
      school_name: "○○중학교",
      school_level: "고1",
      primary_subject: "기타",
      primary_subject_other: "정보",
      frequent_genre: "논설문·주장하는 글",
      consent_at: "2026-05-28T20:00:00+09:00",
    }),
    true,
  );
});

test("isProfile — null·primitives 거부", () => {
  assert.equal(isProfile(null), false);
  assert.equal(isProfile(undefined), false);
  assert.equal(isProfile("string"), false);
  assert.equal(isProfile(42), false);
  assert.equal(isProfile([]), false);
});

test("isProfile — nickname 누락·공백·초과 거부", () => {
  const base = { school_level: "중2", primary_subject: "국어", consent_at: "x" };
  assert.equal(isProfile({ ...base }), false); // nickname 없음
  assert.equal(isProfile({ ...base, nickname: "" }), false); // 빈문자
  assert.equal(isProfile({ ...base, nickname: "   " }), false); // 공백만
  assert.equal(isProfile({ ...base, nickname: "가나다라마바사아자차카타파" }), false); // 13자
});

test("isProfile — school_level enum 위반 거부", () => {
  assert.equal(
    isProfile({
      nickname: "선혜",
      school_level: "대1",
      primary_subject: "국어",
      consent_at: "x",
    }),
    false,
  );
});

test("isProfile — primary_subject enum 위반 거부", () => {
  assert.equal(
    isProfile({
      nickname: "선혜",
      school_level: "중2",
      primary_subject: "체육",
      consent_at: "x",
    }),
    false,
  );
});

test("isProfile — primary_subject_other 길이 초과 거부", () => {
  assert.equal(
    isProfile({
      nickname: "선혜",
      school_level: "중2",
      primary_subject: "기타",
      primary_subject_other: "가나다라마바사아자차카타파하갸냐댜랴먀뱌샤", // 21자
      consent_at: "x",
    }),
    false,
  );
});

test("isProfile — school_name 초과 거부", () => {
  assert.equal(
    isProfile({
      nickname: "선혜",
      school_name: "ㄱ".repeat(31),
      school_level: "중2",
      primary_subject: "국어",
      consent_at: "x",
    }),
    false,
  );
});

test("isProfile — frequent_genre enum 위반 거부", () => {
  assert.equal(
    isProfile({
      nickname: "선혜",
      school_level: "중2",
      primary_subject: "국어",
      frequent_genre: "소설",
      consent_at: "x",
    }),
    false,
  );
});

// ── consentNow ───────────────────────────────────────────────
test("consentNow — ISO 8601 + KST(+09:00)", () => {
  const s = consentNow();
  assert.match(s, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+09:00$/);
});

// ── save·load·clear round trip ───────────────────────────────
test("loadProfile — 비어 있으면 null", () => {
  assert.equal(loadProfile(), null);
});

test("save → load round trip", () => {
  const profile = {
    nickname: "선혜",
    school_level: "중2",
    primary_subject: "국어",
    consent_at: "2026-05-28T20:00:00+09:00",
  };
  const result = saveProfile(profile);
  assert.deepEqual(result, { ok: true });
  assert.deepEqual(loadProfile(), profile);
});

test("save — invalid Profile 거부", () => {
  // @ts-expect-error — 런타임 검증을 위해 일부러 잘못된 타입 주입
  const result = saveProfile({ nickname: "선혜" });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "invalid");
});

test("clear → load = null", () => {
  saveProfile({
    nickname: "선혜",
    school_level: "중2",
    primary_subject: "국어",
    consent_at: "x",
  });
  assert.notEqual(loadProfile(), null);
  clearProfile();
  assert.equal(loadProfile(), null);
});

test("saveProfile — 메타 LRU 보존 (자동 초기화 X — 익명 사용자 학습 이력 보호)", () => {
  // Codex PR #56 검토 결과 — 자동 메타 초기화는 동일 사용자가 익명으로 사용하다 나중에
  // 온보딩하는 정상 경로에서 본인 학습 이력을 지움(target_raw는 복구 불가). 공용 기기
  // 위험은 /me 명시 삭제 동선으로 처리. saveProfile은 LRU에 손대지 않는다.
  storageMock.setItem(
    "pwc_meta_usage_v1",
    JSON.stringify({
      school_level: [{ value: "중2", count: 5, last_used_at: "2026-06-02T11:00:00+09:00" }],
      subject: [],
      genre: [],
      target_raw: [{ value: "800", count: 3, last_used_at: "2026-06-02T11:00:00+09:00" }],
    }),
  );
  saveProfile({
    nickname: "준호",
    school_level: "중2",
    primary_subject: "국어",
    consent_at: "2026-06-02T10:00:00+09:00",
  });
  const meta = JSON.parse(storageMock.getItem("pwc_meta_usage_v1"));
  assert.equal(meta.school_level[0].value, "중2");
  assert.equal(meta.target_raw[0].value, "800");
});

test("loadProfile — JSON 손상 시 null (조용한 폴백)", () => {
  storageMock.setItem("pwc_profile_v1", "{not json");
  assert.equal(loadProfile(), null);
});

test("loadProfile — JSON OK이나 schema 불일치 시 null", () => {
  storageMock.setItem("pwc_profile_v1", JSON.stringify({ random: "data" }));
  assert.equal(loadProfile(), null);
});
