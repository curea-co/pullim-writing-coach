// #9 본문 자동 저장 — DraftSnapshot 저장 어댑터 단위 테스트.
// 실행: node --import ./scripts/register-ts.mjs --test scripts/draft.test.mjs
//
// 브라우저 전용 모듈이라 window/localStorage를 mock으로 주입(globalThis.window).
// 기존 storage.test.mjs 패턴 동일.

import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

// 메모리 LS — 손상·quota 시나리오를 토글로 시뮬레이션.
let mode = "normal"; // "normal" | "quota" | "denied"
const mem = new Map();
const mockLS = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => {
    if (mode === "quota") {
      const err = new DOMException("Quota exceeded", "QuotaExceededError");
      throw err;
    }
    if (mode === "denied") throw new Error("denied");
    mem.set(k, v);
  },
  removeItem: (k) => mem.delete(k),
};
globalThis.window = { localStorage: mockLS };
globalThis.localStorage = mockLS;

const { isDraftSnapshot, loadDraft, saveDraft, clearDraft } = await import(
  "../app/lib/storage.ts"
);

beforeEach(() => {
  mem.clear();
  mode = "normal";
});

test("isDraftSnapshot: 최소 필드(body+saved_at)만 있어도 통과", () => {
  assert.ok(isDraftSnapshot({ body: "x", saved_at: "2026-05-29T15:00:00+09:00" }));
});

test("isDraftSnapshot: body 비어 있어도 string이면 통과 (저장은 ScoreForm 단에서 막음)", () => {
  assert.ok(isDraftSnapshot({ body: "", saved_at: "2026-05-29T15:00:00+09:00" }));
});

test("isDraftSnapshot: body 누락·잘못된 타입 거부", () => {
  assert.equal(isDraftSnapshot({ saved_at: "x" }), false);
  assert.equal(isDraftSnapshot({ body: 42, saved_at: "x" }), false);
  assert.equal(isDraftSnapshot(null), false);
  assert.equal(isDraftSnapshot(undefined), false);
});

test("isDraftSnapshot: 선택 필드는 string|undefined만 — number 들어오면 거부", () => {
  assert.equal(
    isDraftSnapshot({ body: "x", saved_at: "x", school_level: 42 }),
    false,
  );
});

test("save/load roundtrip — 모든 필드 보존 + saved_at 자동 주입", () => {
  const result = saveDraft({
    body: "안녕 친구야",
    school_level: "중2",
    subject: "국어",
    genre: "설명문",
    target_raw: "800",
    prompt_text: "교복 자율화에 대해 쓰시오",
  });
  assert.equal(result.ok, true);
  assert.match(result.saved_at, /\+09:00$/);

  const loaded = loadDraft();
  assert.ok(loaded);
  assert.equal(loaded.body, "안녕 친구야");
  assert.equal(loaded.school_level, "중2");
  assert.equal(loaded.subject, "국어");
  assert.equal(loaded.genre, "설명문");
  assert.equal(loaded.target_raw, "800");
  assert.equal(loaded.prompt_text, "교복 자율화에 대해 쓰시오");
  assert.equal(loaded.saved_at, result.saved_at);
});

test("save: 선택 필드 없어도 OK", () => {
  const result = saveDraft({ body: "혼자 본문만" });
  assert.equal(result.ok, true);
  const loaded = loadDraft();
  assert.ok(loaded);
  assert.equal(loaded.body, "혼자 본문만");
  assert.equal(loaded.school_level, undefined);
});

test("loadDraft: 손상된 JSON → null (가드 통과)", () => {
  mem.set("pwc_draft_v1", "{not-json");
  assert.equal(loadDraft(), null);
});

test("loadDraft: 스키마 위반 → null", () => {
  mem.set("pwc_draft_v1", JSON.stringify({ wrong: true }));
  assert.equal(loadDraft(), null);
});

test("clearDraft: 저장된 draft 제거", () => {
  saveDraft({ body: "x" });
  assert.ok(loadDraft());
  clearDraft();
  assert.equal(loadDraft(), null);
});

test("saveDraft: quota 초과 — quota reason", () => {
  mode = "quota";
  const result = saveDraft({ body: "x" });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "quota");
});

test("saveDraft: 일반 denied — denied reason", () => {
  mode = "denied";
  const result = saveDraft({ body: "x" });
  assert.equal(result.ok, false);
  assert.equal(result.reason, "denied");
});
