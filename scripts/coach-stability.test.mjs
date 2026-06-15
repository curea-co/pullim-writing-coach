// 점수 안정화 순수 모듈 테스트 — 성장 막대 정직성(가짜 등락·가짜 후퇴 방지).
// 실행: node --import ./scripts/register-ts.mjs --test scripts/coach-stability.test.mjs
// 회귀 고정: 첫 호출 passthrough / 손 안 댄 영역 jitter 억제 / 진짜 상승 통과 /
//   손댄 영역 floor(가짜 후퇴 없음) / 손댄 영역 진짜 상승 통과 / AREAS 전 영역 커버.

import assert from "node:assert/strict";
import { test } from "node:test";
import { NOISE_THRESHOLD, stabilizeScores } from "../app/lib/coach-stability.ts";
import { AREAS } from "../app/lib/grading.ts";

// 5영역 baseline 헬퍼.
const base = (overrides = {}) => ({
  "과제 이해": 10,
  "내용 충실도": 10,
  "구조·논리": 10,
  "표현·문장": 10,
  "성장 가능성": 10,
  ...overrides,
});

test("NOISE_THRESHOLD는 0~20 스케일의 양의 상수", () => {
  assert.equal(typeof NOISE_THRESHOLD, "number");
  assert.ok(NOISE_THRESHOLD > 0 && NOISE_THRESHOLD <= 20);
});

test("첫 호출(prev=null) → next를 그대로 통과시킨다", () => {
  const next = base({ "내용 충실도": 13 });
  const out = stabilizeScores(null, next, "내용 충실도");
  assert.deepEqual(out, next);
});

test("첫 호출은 새 객체를 반환한다(next를 변형하지 않음)", () => {
  const next = base();
  const out = stabilizeScores(null, next, null);
  assert.notEqual(out, next); // 얕은 복제
  assert.deepEqual(out, next);
});

test("손 안 댄 영역: 임계값 미만 소음(jitter)은 억제 — prev 유지", () => {
  const prev = base();
  // 손댄 곳은 표현·문장, 나머지는 ±2(임계값 3 미만) 흔들림.
  const next = base({
    "과제 이해": 12, // +2 소음
    "내용 충실도": 8, // -2 소음
    "구조·논리": 11, // +1 소음
    "표현·문장": 15, // 손댄 영역(상승)
  });
  const out = stabilizeScores(prev, next, "표현·문장");
  assert.equal(out["과제 이해"], 10, "손 안 댄 영역 +2는 무시");
  assert.equal(out["내용 충실도"], 10, "손 안 댄 영역 -2는 무시");
  assert.equal(out["구조·논리"], 10, "손 안 댄 영역 +1은 무시");
});

test("손 안 댄 영역: 임계값 이상 진짜 상승은 반영(next 채택)", () => {
  const prev = base();
  const next = base({
    "과제 이해": 14, // +4 (>= 3) 진짜 상승
    "표현·문장": 16, // 손댄 영역
  });
  const out = stabilizeScores(prev, next, "표현·문장");
  assert.equal(out["과제 이해"], 14, "손 안 댄 영역의 진짜 상승은 통과");
});

test("손 안 댄 영역: 큰 하락도 반영하지 않는다(절대 후퇴 없음)", () => {
  const prev = base();
  const next = base({
    "구조·논리": 4, // -6 (>= 임계값) 큰 하락이지만 손 안 댐
    "표현·문장": 15,
  });
  const out = stabilizeScores(prev, next, "표현·문장");
  assert.equal(out["구조·논리"], 10, "손 안 댄 영역은 큰 하락도 floor — 막대가 거짓 후퇴하면 안 됨");
});

test("손댄 영역: 모델-노이즈 하락은 floor — 가짜 후퇴를 보여주지 않는다", () => {
  const prev = base({ "내용 충실도": 12 });
  const next = base({ "내용 충실도": 9 }); // 방금 고쳤는데 -3 (노이즈)
  const out = stabilizeScores(prev, next, "내용 충실도");
  assert.equal(out["내용 충실도"], 12, "손댄 영역은 prev에서 floor(후퇴 차단)");
});

test("손댄 영역: 진짜 상승은 그대로 반영", () => {
  const prev = base({ "구조·논리": 8 });
  const next = base({ "구조·논리": 15 }); // 고쳐서 +7
  const out = stabilizeScores(prev, next, "구조·논리");
  assert.equal(out["구조·논리"], 15, "손댄 영역의 진짜 성장은 통과");
});

test("손댄 영역: 동결(같은 점수)은 그대로", () => {
  const prev = base({ "표현·문장": 11 });
  const next = base({ "표현·문장": 11 });
  const out = stabilizeScores(prev, next, "표현·문장");
  assert.equal(out["표현·문장"], 11);
});

test("workedArea=null이면 모든 영역을 손 안 댄 규칙으로 처리", () => {
  const prev = base();
  const next = base({
    "과제 이해": 12, // +2 소음 → 무시
    "내용 충실도": 14, // +4 진짜 상승 → 반영
    "구조·논리": 5, // 큰 하락 → 무시(floor)
  });
  const out = stabilizeScores(prev, next, null);
  assert.equal(out["과제 이해"], 10);
  assert.equal(out["내용 충실도"], 14);
  assert.equal(out["구조·논리"], 10);
});

test("AREAS 전 영역을 빠짐없이 안정화한다", () => {
  const prev = base();
  const next = base();
  const out = stabilizeScores(prev, next, "내용 충실도");
  for (const a of AREAS) {
    assert.ok(a in out, `${a} 결과 누락`);
    assert.equal(typeof out[a], "number");
  }
  assert.equal(Object.keys(out).length, AREAS.length);
});

test("경계: 정확히 임계값(=NOISE_THRESHOLD)인 상승은 반영", () => {
  const prev = base({ "과제 이해": 10 });
  const next = base({ "과제 이해": 10 + NOISE_THRESHOLD });
  const out = stabilizeScores(prev, next, null);
  assert.equal(out["과제 이해"], 10 + NOISE_THRESHOLD, "delta == 임계값은 통과(>=)");
});

test("경계: 임계값 바로 아래(threshold-1) 상승은 억제", () => {
  const prev = base({ "과제 이해": 10 });
  const next = base({ "과제 이해": 10 + NOISE_THRESHOLD - 1 });
  const out = stabilizeScores(prev, next, null);
  assert.equal(out["과제 이해"], 10, "delta == 임계값-1은 소음으로 억제");
});

test("순수성: 입력 prev/next 객체를 변형하지 않는다", () => {
  const prev = base();
  const next = base({ "과제 이해": 2, "내용 충실도": 18 });
  const prevSnap = { ...prev };
  const nextSnap = { ...next };
  stabilizeScores(prev, next, "내용 충실도");
  assert.deepEqual(prev, prevSnap, "prev 불변");
  assert.deepEqual(next, nextSnap, "next 불변");
});
