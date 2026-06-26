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
const { countedSessionCount, hasCountedSession, markCountedSession, loadSessionId, newSessionId, clearSessionId } = await import("../app/lib/storage.ts");

beforeEach(() => storageMock.clear());

test("countedSessionCount — 집계 세션 수(집합 크기)에서 파생, 비면 0", () => {
  assert.equal(countedSessionCount(), 0);
  markCountedSession("a");
  markCountedSession("b");
  assert.equal(countedSessionCount(), 2);
});

test("멱등 집계 — 같은 세션 id 중복 마킹(다중 탭/재통과)은 카운트를 올리지 않음", () => {
  markCountedSession("same");
  markCountedSession("same"); // 다른 탭/새로고침 재통과 시뮬
  markCountedSession("same");
  assert.equal(countedSessionCount(), 1); // 중복 증가 없음 — race/desync 불가
});

test("countedSessionCount — 손상된 값이면 0(방어)", () => {
  storageMock.setItem("pwc_done_ids_v1", "not-json");
  assert.equal(countedSessionCount(), 0);
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
