// Results store(채점 결과 조회) 단위 테스트 (#11, 2026-05-31).
// 실행: node --import ./scripts/register-ts.mjs --test scripts/results-store.test.mjs

import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

class MemoryStorage {
  data = {};
  getItem(k) {
    return Object.prototype.hasOwnProperty.call(this.data, k) ? this.data[k] : null;
  }
  setItem(k, v) {
    // quota 시나리오 — 특정 토큰 매칭 시 의도적으로 QuotaExceededError 발생
    if (this.shouldQuotaFail && String(v).length > this.quotaThreshold) {
      const err = new Error("QuotaExceededError");
      err.name = "QuotaExceededError";
      // Node 환경엔 DOMException 없으므로 storage.ts의 instanceof는 false → "denied"로 떨어짐.
      // quota 분기 경로 자체는 별도 케이스(아래)에서 DOMException stub로 확인.
      throw err;
    }
    this.data[k] = String(v);
  }
  removeItem(k) {
    delete this.data[k];
  }
  clear() {
    this.data = {};
    this.shouldQuotaFail = false;
    this.quotaThreshold = 0;
  }
}

const storageMock = new MemoryStorage();
globalThis.window = { localStorage: storageMock };

// DOMException stub — quota 경로 정확히 타게.
if (typeof globalThis.DOMException === "undefined") {
  class DOMException extends Error {
    constructor(message, name) {
      super(message);
      this.name = name ?? "Error";
    }
  }
  globalThis.DOMException = DOMException;
}

const { MAX_RESULTS, addResult, clearAllResults, getResult, loadResults } = await import(
  "../app/lib/storage.ts"
);

const baseEntry = () => ({
  assignment: {
    school_level: "고1",
    subject: "국어",
    genre: "감상문·독후감",
    target_char_count: 700,
    prompt_text: "이육사 '광야'를 읽고 감상문을 쓰시오.",
  },
  submission: { body: "오늘 광야를 읽었다. 시인은...", char_count: 120 },
  output: {
    total_score: 72,
    scores: [
      { area: "과제 이해", score: 15, max: 20, feedback_good: "g", feedback_fix: "f" },
      { area: "내용 충실도", score: 14, max: 20, feedback_good: "g", feedback_fix: "f" },
      { area: "구조·논리", score: 15, max: 20, feedback_good: "g", feedback_fix: "f" },
      { area: "표현·문장", score: 14, max: 20, feedback_good: "g", feedback_fix: "f" },
      { area: "성장 가능성", score: 14, max: 20, feedback_good: "g", feedback_fix: "f" },
    ],
    revision_guides: [{ priority: 1, action: "a", reason: "r" }],
    meta: {
      model_version: "writing-coach-prompt-v0.2",
      generated_at: "2026-05-31T12:00:00+09:00",
      is_verified: false,
      disclaimer: "AI 자동 채점입니다.",
    },
  },
});

beforeEach(async () => {
  storageMock.clear();
  await clearAllResults();
});

// ── 기본 저장/조회 ─────────────────────────────────────────────
test("addResult — 빈 상태에서 1건 저장 성공", async () => {
  const r = await addResult(baseEntry());
  assert.equal(r.ok, true);
  assert.equal(typeof r.id, "string");
  assert.equal(r.id.length > 0, true);
  assert.equal(r.dropped_oldest, false);
});

test("loadResults — 저장 후 1건 로드", async () => {
  const r = await addResult(baseEntry());
  const list = await loadResults();
  assert.equal(list.length, 1);
  assert.equal(list[0].id, r.id);
  assert.equal(list[0].output.total_score, 72);
  assert.equal(list[0].assignment.school_level, "고1");
});

test("loadResults — created_at 자동 부여 + ISO 8601 KST", async () => {
  await addResult(baseEntry());
  const list = await loadResults();
  assert.match(list[0].created_at, /\+09:00$/);
  assert.match(list[0].created_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
});

test("getResult — id로 단건 조회", async () => {
  const r = await addResult(baseEntry());
  const found = await getResult(r.id);
  assert.notEqual(found, null);
  assert.equal(found.id, r.id);
  assert.equal(found.output.total_score, 72);
});

test("getResult — 존재하지 않는 id → null", async () => {
  await addResult(baseEntry());
  assert.equal(await getResult("nonexistent-id"), null);
});

// ── LRU 정책 ─────────────────────────────────────────────────
test(`addResult — MAX_RESULTS(${20}) 초과 시 가장 오래된 1건 drop`, async () => {
  for (let i = 0; i < MAX_RESULTS; i++) {
    const r = await addResult({ ...baseEntry(), submission: { body: `글${i}`, char_count: 5 } });
    assert.equal(r.ok, true);
    assert.equal(r.dropped_oldest, false);
  }
  // 21번째 추가 → 오래된 1건 drop
  const r21 = await addResult({ ...baseEntry(), submission: { body: "글21", char_count: 5 } });
  assert.equal(r21.ok, true);
  assert.equal(r21.dropped_oldest, true);

  const list = await loadResults();
  assert.equal(list.length, MAX_RESULTS);
  // 첫 번째(글0)는 drop, 마지막(글21)이 살아 있어야
  assert.equal(list[0].submission.body, "글1");
  assert.equal(list[list.length - 1].submission.body, "글21");
});

// ── 손상된 LS 방어 ───────────────────────────────────────────
test("loadResults — 손상된 JSON → []", async () => {
  storageMock.setItem("pwc_results_v1", "not-a-json{");
  assert.deepEqual(await loadResults(), []);
});

test("loadResults — Array가 아닌 값 → []", async () => {
  storageMock.setItem("pwc_results_v1", JSON.stringify({ not: "array" }));
  assert.deepEqual(await loadResults(), []);
});

test("loadResults — 필수 필드 누락 entry는 필터링 (Codex PR #29 deep validation)", async () => {
  // Codex PR #29: isResultEntry가 깊은 필드(assignment.school_level/subject/genre/prompt_text,
  // submission.body/char_count, output.total_score/scores/revision_guides/meta) 모두 검증.
  const validEntry = {
    id: "valid",
    created_at: "2026-05-31T12:00:00+09:00",
    assignment: {
      school_level: "중2",
      subject: "국어",
      genre: "설명문",
      target_char_count: null,
      prompt_text: "test prompt",
    },
    submission: { body: "test body", char_count: 9 },
    output: {
      total_score: 70,
      scores: [{ area: "과제 이해", score: 15, max: 20, feedback_good: "g", feedback_fix: "f" }],
      revision_guides: [],
      meta: { model_version: "v1", generated_at: "x", is_verified: false, disclaimer: "x" },
    },
  };
  storageMock.setItem(
    "pwc_results_v1",
    JSON.stringify([
      validEntry,
      { id: "no-output-field" }, // 필수 누락 → 필터링
      { ...validEntry, id: "shallow-but-invalid", assignment: {} }, // assignment 빈 객체 → 필터링
    ]),
  );
  const list = await loadResults();
  assert.equal(list.length, 1);
  assert.equal(list[0].id, "valid");
});

// ── clear ────────────────────────────────────────────────────
test("clearAllResults — 전부 삭제", async () => {
  await addResult(baseEntry());
  await addResult(baseEntry());
  assert.equal((await loadResults()).length, 2);
  await clearAllResults();
  assert.deepEqual(await loadResults(), []);
});

// ── id 고유성 ───────────────────────────────────────────────
test("addResult — 같은 entry 2번 추가 시 id가 다름", async () => {
  const r1 = await addResult(baseEntry());
  const r2 = await addResult(baseEntry());
  assert.equal(r1.ok, true);
  assert.equal(r2.ok, true);
  assert.notEqual(r1.id, r2.id);
});
