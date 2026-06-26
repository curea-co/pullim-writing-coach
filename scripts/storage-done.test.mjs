// localStorage done-count 헬퍼 테스트 (Task 2 — 끈기 스트릭, 2026-06-26).
// 실행: node --import ./scripts/register-ts.mjs --test scripts/storage-done.test.mjs
// 노드 환경엔 window 없음 — 최소 mock을 import 전에 주입(storage.test.mjs 패턴 답습).

import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

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
const { loadDoneCount, bumpDoneCount } = await import("../app/lib/storage.ts");

beforeEach(() => storageMock.clear());

test("bumpDoneCount 누적 + load 반영", () => {
  assert.equal(loadDoneCount(), 0);
  assert.equal(bumpDoneCount(), 1);
  assert.equal(bumpDoneCount(), 2);
  assert.equal(loadDoneCount(), 2);
});

test("loadDoneCount — 비어 있으면 0", () => {
  assert.equal(loadDoneCount(), 0);
});

test("bumpDoneCount — 여러 번 호출 시 순차 증가", () => {
  for (let i = 1; i <= 5; i++) {
    assert.equal(bumpDoneCount(), i);
  }
  assert.equal(loadDoneCount(), 5);
});

test("loadDoneCount — 손상된 값(비정수) 시 0 반환", () => {
  storageMock.setItem("pwc_done_count_v1", "abc");
  assert.equal(loadDoneCount(), 0);
});

test("loadDoneCount — 음수 값 시 0 반환", () => {
  storageMock.setItem("pwc_done_count_v1", "-3");
  assert.equal(loadDoneCount(), 0);
});
