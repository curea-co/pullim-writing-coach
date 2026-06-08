// /api/extract route helper 단위 테스트 (Codex PR #69).
//   route POST handler 통합 테스트(callAnthropic mock + DI 리팩토링)는 별도 PR.
//   본 테스트는 export된 helper(timingSafeEqualStr·isAuthorized·EXTRACT_MESSAGE·jsonError)만.
// 실행: node --import ./scripts/register-ts.mjs --test scripts/extract-route-helpers.test.mjs

import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

const { timingSafeEqualStr, isAuthorized, EXTRACT_MESSAGE, jsonError } = await import(
  "../app/api/extract/helpers.ts"
);

beforeEach(() => {
  delete process.env.DEMO_ACCESS_TOKEN;
});

// ── timingSafeEqualStr ────────────────────────────────────────────
test("timingSafeEqualStr — 동일 문자열 true", () => {
  assert.equal(timingSafeEqualStr("secret-token-abc", "secret-token-abc"), true);
});

test("timingSafeEqualStr — 다른 문자열 false", () => {
  assert.equal(timingSafeEqualStr("secret-token-abc", "secret-token-xyz"), false);
});

test("timingSafeEqualStr — 길이가 달라도 throw 없이 false (해시 비교)", () => {
  // 일반 timingSafeEqual은 길이 다르면 throw — 해시 고정 길이로 누설·throw 모두 방어.
  assert.equal(timingSafeEqualStr("short", "much-longer-string-value"), false);
});

test("timingSafeEqualStr — 빈 문자열 vs 빈 문자열은 true", () => {
  assert.equal(timingSafeEqualStr("", ""), true);
});

// ── isAuthorized ──────────────────────────────────────────────────
function makeReq(headers = {}) {
  return new Request("https://example.com/api/extract", { method: "POST", headers });
}

test("isAuthorized — DEMO_ACCESS_TOKEN 미설정 시 모든 요청 false (fail-closed)", () => {
  const req = makeReq({ "x-demo-token": "anything" });
  assert.equal(isAuthorized(req), false);
});

test("isAuthorized — DEMO_ACCESS_TOKEN 설정 + 일치 토큰 true", () => {
  process.env.DEMO_ACCESS_TOKEN = "test-secret";
  const req = makeReq({ "x-demo-token": "test-secret" });
  assert.equal(isAuthorized(req), true);
});

test("isAuthorized — DEMO_ACCESS_TOKEN 설정 + 불일치 토큰 false", () => {
  process.env.DEMO_ACCESS_TOKEN = "test-secret";
  const req = makeReq({ "x-demo-token": "wrong-token" });
  assert.equal(isAuthorized(req), false);
});

test("isAuthorized — x-demo-token 헤더 누락 시 false", () => {
  process.env.DEMO_ACCESS_TOKEN = "test-secret";
  const req = makeReq();
  assert.equal(isAuthorized(req), false);
});

// ── EXTRACT_MESSAGE ───────────────────────────────────────────────
test("EXTRACT_MESSAGE — 추출 컨텍스트 카피 (채점 grading.ts 기본값과 분리)", () => {
  // E4: 추출 컨텍스트
  assert.match(EXTRACT_MESSAGE.E4, /추출이 지연/);
  // E5: 추출 컨텍스트
  assert.match(EXTRACT_MESSAGE.E5, /추출 결과를 다시 만들어야/);
  // E-PARSE: 추출 컨텍스트
  assert.match(EXTRACT_MESSAGE["E-PARSE"], /추출 결과 형식/);
  // E2: 안내서 짧음 (채점의 "본문 50자 이상"과 구분)
  assert.match(EXTRACT_MESSAGE.E2, /안내서 내용이 너무 짧/);
  // E3: 안내서 길이
  assert.match(EXTRACT_MESSAGE.E3, /8,000자 이내/);
});

test("EXTRACT_MESSAGE — 모든 ErrorCode 키 카피 정의 (typing 보장)", () => {
  const expectedKeys = [
    "E-PARSE",
    "E-AUTH",
    "E-CAP",
    "E1",
    "E2",
    "E3",
    "E4",
    "E5",
    "E6",
    "E8",
    "E10",
    "E11",
  ];
  for (const k of expectedKeys) {
    assert.equal(typeof EXTRACT_MESSAGE[k], "string", `${k} 카피 누락`);
    assert.ok(EXTRACT_MESSAGE[k].length > 0, `${k} 빈 문자열`);
  }
});

// ── jsonError ─────────────────────────────────────────────────────
test("jsonError — E-AUTH 401 + 추출 envelope", async () => {
  const res = jsonError("E-AUTH");
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.error.code, "E-AUTH");
  assert.match(body.error.message, /데모 비밀번호/);
});

test("jsonError — E-PARSE 400 + 추출 envelope", async () => {
  const res = jsonError("E-PARSE");
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error.code, "E-PARSE");
  assert.match(body.error.message, /추출 결과 형식/);
});

test("jsonError — E5 502 + 추출 envelope (재호출 실패 시 사용)", async () => {
  const res = jsonError("E5");
  assert.equal(res.status, 502);
  const body = await res.json();
  assert.equal(body.error.code, "E5");
  assert.match(body.error.message, /추출 결과를 다시 만들어야/);
});

test("jsonError — E-CAP 429 + 추출 envelope (rate limit 동선)", async () => {
  const res = jsonError("E-CAP");
  assert.equal(res.status, 429);
  const body = await res.json();
  assert.equal(body.error.code, "E-CAP");
  assert.match(body.error.message, /요청이 너무 많/);
});
