// #1 수정 전/후 비교 — 순수 모듈 + storage LRU 테스트 (2026-05-29).
// 실행: node --import ./scripts/register-ts.mjs --test scripts/revision.test.mjs

import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

// window mock — storage.ts SSR 가드 통과용
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
globalThis.window = { localStorage: storageMock };

const {
  addRevision,
  clearAllRevisions,
  getThread,
  loadRevisions,
  MAX_REVISIONS_PER_THREAD,
} = await import("../app/lib/storage.ts");
const {
  computeDelta,
  totalTone,
  totalCopy,
  areaTone,
  areaCopy,
  totalToneColorHint,
  areaToneColorHint,
} = await import("../app/lib/revision.ts");

beforeEach(() => {
  storageMock.clear();
});

// ── totalTone / totalCopy 5-band 경계 ────────────────────────────────
test("totalTone: +10 = up_big", () => {
  assert.equal(totalTone(10), "up_big");
  assert.equal(totalTone(50), "up_big");
});
test("totalTone: +1~9 = up_small", () => {
  assert.equal(totalTone(1), "up_small");
  assert.equal(totalTone(9), "up_small");
});
test("totalTone: 0 = flat", () => {
  assert.equal(totalTone(0), "flat");
});
test("totalTone: -1~-5 = down_small", () => {
  assert.equal(totalTone(-1), "down_small");
  assert.equal(totalTone(-5), "down_small");
});
test("totalTone: -6 이하 = down_big", () => {
  assert.equal(totalTone(-6), "down_big");
  assert.equal(totalTone(-50), "down_big");
});

test("totalCopy: 각 band 메시지", () => {
  assert.match(totalCopy(15), /크게 좋아졌어요/);
  assert.match(totalCopy(3), /조금씩 좋아지고/);
  assert.match(totalCopy(0), /총점은 같지만/);
  assert.match(totalCopy(-3), /일부 영역이 한 걸음 더 필요/);
  assert.match(totalCopy(-10), /방향을 다시 잡아 볼 시점/);
});

// ── areaTone / areaCopy 3-band ──────────────────────────────────────
test("areaTone: 양수 / 0 / 음수", () => {
  assert.equal(areaTone(2), "up");
  assert.equal(areaTone(0), "flat");
  assert.equal(areaTone(-1), "down");
});

test("areaCopy: 양수는 +N 좋아졌어요, 동률은 같은 수준, 음수는 N 한 걸음 더", () => {
  assert.equal(areaCopy("과제 이해", 3), "과제 이해 +3 — 좋아졌어요");
  assert.equal(areaCopy("내용 충실도", 0), "내용 충실도 = 같은 수준 유지");
  assert.equal(areaCopy("표현·문장", -2), "표현·문장 -2 — 한 걸음 더");
});

// ── 색 hint ─────────────────────────────────────────────────────────
test("totalToneColorHint: up_big/up_small=good, flat=neutral, down=warn", () => {
  assert.equal(totalToneColorHint("up_big"), "good");
  assert.equal(totalToneColorHint("up_small"), "good");
  assert.equal(totalToneColorHint("flat"), "neutral");
  assert.equal(totalToneColorHint("down_small"), "warn");
  assert.equal(totalToneColorHint("down_big"), "warn");
});

test("areaToneColorHint: up=good, flat=neutral, down=warn", () => {
  assert.equal(areaToneColorHint("up"), "good");
  assert.equal(areaToneColorHint("flat"), "neutral");
  assert.equal(areaToneColorHint("down"), "warn");
});

// ── computeDelta ────────────────────────────────────────────────────
const sampleScores = (totals) => ({
  total_score: totals.reduce((a, b) => a + b, 0),
  scores: [
    { area: "과제 이해", score: totals[0], max: 20, feedback_good: "g", feedback_fix: "f" },
    { area: "내용 충실도", score: totals[1], max: 20, feedback_good: "g", feedback_fix: "f" },
    { area: "구조·논리", score: totals[2], max: 20, feedback_good: "g", feedback_fix: "f" },
    { area: "표현·문장", score: totals[3], max: 20, feedback_good: "g", feedback_fix: "f" },
    { area: "성장 가능성", score: totals[4], max: 20, feedback_good: "g", feedback_fix: "f" },
  ],
  revision_guides: [],
  meta: {
    model_version: "writing-coach-prompt-v0.2",
    generated_at: "2026-05-29T10:00:00+09:00",
    is_verified: false,
    disclaimer: "x",
  },
});

test("computeDelta: 총점·영역별 모두 계산", () => {
  const v1 = sampleScores([10, 11, 12, 13, 14]);
  const v2 = sampleScores([14, 13, 12, 13, 15]);
  const d = computeDelta(v1, v2);
  assert.equal(d.total, 7); // (14+13+12+13+15) - (10+11+12+13+14) = 67-60
  assert.equal(d.perArea.length, 5);
  assert.deepEqual(
    d.perArea.map((a) => a.delta),
    [4, 2, 0, 0, 1],
  );
  assert.equal(d.perArea[0].area, "과제 이해");
  assert.equal(d.perArea[0].v1, 10);
  assert.equal(d.perArea[0].v2, 14);
});

// ── storage: addRevision LRU ────────────────────────────────────────
const sampleEntry = (body = "본문") => ({
  assignment: { school_level: "중2", subject: "국어", genre: "설명문", target_char_count: null, prompt_text: "x" },
  submission: { body, char_count: body.length },
  output: sampleScores([10, 10, 10, 10, 10]),
});

test("addRevision: 새 thread 생성 + version 1", () => {
  const res = addRevision(null, sampleEntry("초안"));
  assert.equal(res.ok, true);
  assert.ok(res.thread_id);
  const t = getThread(res.thread_id);
  assert.equal(t.revisions.length, 1);
  assert.equal(t.revisions[0].version, 1);
  assert.equal(t.revisions[0].submission.body, "초안");
});

test("addRevision: 동일 thread에 추가 → version 증가", () => {
  const r1 = addRevision(null, sampleEntry("v1"));
  const r2 = addRevision(r1.thread_id, sampleEntry("v2"));
  const r3 = addRevision(r1.thread_id, sampleEntry("v3"));
  assert.equal(r2.thread_id, r1.thread_id);
  assert.equal(r3.thread_id, r1.thread_id);
  const t = getThread(r1.thread_id);
  assert.deepEqual(
    t.revisions.map((r) => r.version),
    [1, 2, 3],
  );
});

test("addRevision: thread 4번째 → 가장 오래된 drop (dropped_oldest_in_thread)", () => {
  const r1 = addRevision(null, sampleEntry("v1"));
  addRevision(r1.thread_id, sampleEntry("v2"));
  addRevision(r1.thread_id, sampleEntry("v3"));
  const r4 = addRevision(r1.thread_id, sampleEntry("v4"));
  assert.equal(r4.dropped_oldest_in_thread, true);
  const t = getThread(r1.thread_id);
  assert.equal(t.revisions.length, MAX_REVISIONS_PER_THREAD);
  // 가장 오래된(v1) drop → v2/v3/v4 남음
  assert.deepEqual(
    t.revisions.map((r) => r.submission.body),
    ["v2", "v3", "v4"],
  );
});

test("addRevision: 다른 thread 식별·격리", () => {
  const t1 = addRevision(null, sampleEntry("글A v1"));
  const t2 = addRevision(null, sampleEntry("글B v1"));
  assert.notEqual(t1.thread_id, t2.thread_id);
  const threads = loadRevisions();
  assert.equal(threads.length, 2);
});

test("clearAllRevisions: 전부 삭제", () => {
  addRevision(null, sampleEntry("x"));
  assert.equal(loadRevisions().length, 1);
  clearAllRevisions();
  assert.equal(loadRevisions().length, 0);
});

test("loadRevisions: JSON 손상 시 빈 배열 (조용한 폴백)", () => {
  storageMock.setItem("pwc_revisions_v1", "{not json");
  assert.deepEqual(loadRevisions(), []);
});

test("loadRevisions: schema 불일치 entry 자동 필터", () => {
  storageMock.setItem(
    "pwc_revisions_v1",
    JSON.stringify([{ thread_id: "x", revisions: [] }, { random: "bad" }]),
  );
  const threads = loadRevisions();
  assert.equal(threads.length, 1); // 손상된 두 번째는 isRevisionThread에 걸려 빠짐
});
