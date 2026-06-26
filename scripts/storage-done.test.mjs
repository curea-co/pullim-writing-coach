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
const { loadDoneCount, bumpDoneCount, hasCountedSession, markCountedSession, loadSessionId, newSessionId, clearSessionId } = await import("../app/lib/storage.ts");

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

test("세션 id — 발급마다 고유, 복원은 동일값, 충돌 없음(완료 집계 식별값)", () => {
  assert.equal(loadSessionId(), ""); // 초기엔 없음
  const a = newSessionId();
  assert.ok(a.length > 0);
  assert.equal(loadSessionId(), a); // 새로고침 복원과 동일
  const b = newSessionId(); // 새 세션 발급
  assert.notEqual(a, b); // 길이/회차와 무관하게 고유 — 충돌 없음
  assert.equal(loadSessionId(), b);
  clearSessionId();
  assert.equal(loadSessionId(), "");
  // 자유입력(과제문/본문)은 저장하지 않음 — id는 불투명 비내용 값
  assert.equal(/[가-힣]/.test(b), false);
});

test("집계 세션 집합 — 세션별 1회, 과제 전환 후 이전 세션 재통과도 재집계 안 함", () => {
  const a = "id-A", b = "id-B";
  assert.equal(hasCountedSession(a), false);
  markCountedSession(a); // A 완료 집계
  markCountedSession(b); // B 완료 집계
  // A·B 둘 다 집계 기록에 남아 있어야 함(마지막 1개만 보관하던 허점 제거)
  assert.equal(hasCountedSession(a), true);
  assert.equal(hasCountedSession(b), true);
  // A 새로고침 재통과 → 이미 집계됨 → 재집계 안 함(host가 hasCountedSession으로 가드)
  markCountedSession(a); // 멱등 — 중복 추가 없음
  assert.equal(hasCountedSession("id-C"), false); // 미집계 세션은 false
  assert.equal(hasCountedSession(""), false); // 빈 id 방어
});

test("집계 세션 집합 — 최근 N개로 상한(무한 증가 방지)", () => {
  for (let i = 0; i < 250; i++) markCountedSession(`s${i}`);
  // 가장 오래된 것은 밀려나고(상한 200), 최신은 남는다
  assert.equal(hasCountedSession("s249"), true);
  assert.equal(hasCountedSession("s0"), false);
});
