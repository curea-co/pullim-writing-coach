// db.ts 단위 테스트 — pullim-api KV 표면 relay(fetch 모킹) 검증 (2026-07-07 RDS 전환).
//   검증 축: URL·메서드, 쿠키 relay, mutation CSRF(double-submit) 헤더, 상태코드 매핑(401→AuthError·404→null).
//   실행: node --import ./scripts/register-ts.mjs --test scripts/db.test.mjs
import assert from "node:assert/strict";
import { test, beforeEach, afterEach } from "node:test";

const db = await import("../app/lib/server/db.ts");

const realFetch = globalThis.fetch;
let calls;

function mockFetch(status = 200, json = { payload: { ok: true } }) {
  calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init: init ?? {} });
    return { ok: status >= 200 && status < 300, status, json: async () => json };
  };
}

beforeEach(() => mockFetch());
afterEach(() => {
  globalThis.fetch = realFetch;
});

function makeReq(headers = {}) {
  return new Request("https://w/api/data/results", { method: "POST", headers });
}

test("isDataKey — 화이트리스트만 true", () => {
  assert.equal(db.isDataKey("results"), true);
  assert.equal(db.isDataKey("profile"), true);
  assert.equal(db.isDataKey("hack"), false);
  assert.equal(db.isDataKey(123), false);
});

// ── getUserData ──────────────────────────────────────────────────────
test("getUserData — GET /writing/data/:key + 쿠키 relay + payload 반환", async () => {
  const req = makeReq({ cookie: "pullim-at=tok; pullim-csrf=c1" });
  const out = await db.getUserData(req, "results");
  assert.deepEqual(out, { ok: true });
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /\/writing\/data\/results$/);
  assert.equal(calls[0].init.method, "GET");
  assert.equal(calls[0].init.headers.cookie, "pullim-at=tok; pullim-csrf=c1");
  assert.equal(calls[0].init.redirect, "manual"); // 302 추종 인가 우회 방지
  assert.equal(calls[0].init.headers["x-csrf-token"], undefined); // GET엔 CSRF 불필요
});

test("getUserData — 404 → throw (표면 부재/오라우팅을 빈 데이터로 위장 금지, Codex #129 2차)", async () => {
  // 우리 표면은 미존재 키에 200 {payload:null} 을 준다 — 404 는 표면 부재/경로 오류이므로 라우트 E8.
  mockFetch(404, {});
  await assert.rejects(
    () => db.getUserData(makeReq({ cookie: "pullim-at=t" }), "results"),
    (e) => e instanceof db.RelayStatusError && e.status === 404,
  );
});

test("getUserData — 미존재 키는 200 {payload:null} → null (빈 데이터 정상 경로)", async () => {
  mockFetch(200, { payload: null });
  assert.equal(await db.getUserData(makeReq({ cookie: "pullim-at=t" }), "results"), null);
});

test("getUserData — payload 필드 부재(200 {}) → throw (shape 불일치=읽기 실패, Codex #129 3차)", async () => {
  // 표면 계약은 항상 {payload:X}. payload 키가 없는 200 은 깨진 응답 → 빈 데이터로 위장 금지(E8).
  mockFetch(200, {});
  await assert.rejects(
    () => db.getUserData(makeReq({ cookie: "pullim-at=t" }), "results"),
    (e) => e instanceof db.RelayBodyError,
  );
});

test("getUserData — 본문 JSON 파싱 실패(200) → throw (읽기 실패=E8, Codex #129 3차)", async () => {
  calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init: init ?? {} });
    return { ok: true, status: 200, json: async () => { throw new SyntaxError("broken"); } };
  };
  await assert.rejects(
    () => db.getUserData(makeReq({ cookie: "pullim-at=t" }), "results"),
    (e) => e instanceof db.RelayBodyError,
  );
});

// ── setUserData (mutation: CSRF relay) ───────────────────────────────
test("setUserData — PUT + payload 봉투 + CSRF double-submit(prod 쿠키명)", async () => {
  const req = makeReq({ cookie: "pwc-rl-id=x; pullim-at=tok; pullim-csrf=csrf-v1" });
  await db.setUserData(req, "profile", { nickname: "민수" });
  assert.match(calls[0].url, /\/writing\/data\/profile$/);
  assert.equal(calls[0].init.method, "PUT");
  assert.equal(calls[0].init.headers["x-csrf-token"], "csrf-v1"); // csrf 쿠키값 → 헤더 재전송
  assert.equal(calls[0].init.headers["content-type"], "application/json");
  assert.deepEqual(JSON.parse(calls[0].init.body), { payload: { nickname: "민수" } });
});

test("setUserData — dev 쿠키명(dev-pullim-csrf)도 인식", async () => {
  const req = makeReq({ cookie: "dev-pullim-at=tok; dev-pullim-csrf=csrf-dev" });
  await db.setUserData(req, "drafts", "x");
  assert.equal(calls[0].init.headers["x-csrf-token"], "csrf-dev");
});

test("setUserData — payload undefined → null로 정규화", async () => {
  await db.setUserData(makeReq({ cookie: "pullim-at=t" }), "drafts", undefined);
  assert.deepEqual(JSON.parse(calls[0].init.body), { payload: null });
});

// ── 삭제 ─────────────────────────────────────────────────────────────
test("deleteUserData — DELETE /writing/data/:key", async () => {
  await db.deleteUserData(makeReq({ cookie: "pullim-at=t; pullim-csrf=c" }), "drafts");
  assert.match(calls[0].url, /\/writing\/data\/drafts$/);
  assert.equal(calls[0].init.method, "DELETE");
  assert.equal(calls[0].init.headers["x-csrf-token"], "c");
});

test("deleteAllUserData — DELETE /writing/data (전체)", async () => {
  await db.deleteAllUserData(makeReq({ cookie: "pullim-at=t; pullim-csrf=c" }));
  assert.match(calls[0].url, /\/writing\/data$/);
  assert.equal(calls[0].init.method, "DELETE");
});

// ── 상태코드 매핑 ────────────────────────────────────────────────────
test("relay 401 → PullimDataAuthError (라우트 E-AUTH 매핑용)", async () => {
  mockFetch(401, {});
  await assert.rejects(
    () => db.getUserData(makeReq({ cookie: "pullim-at=expired" }), "results"),
    (e) => e instanceof db.PullimDataAuthError && e.status === 401,
  );
});

test("relay 403 → PullimDataAuthError (CSRF·flags 실패도 E-AUTH — E8 오분류 금지, Codex #129)", async () => {
  mockFetch(403, {});
  await assert.rejects(
    () => db.setUserData(makeReq({ cookie: "pullim-at=t; pullim-csrf=c" }), "results", { a: 1 }),
    (e) => e instanceof db.PullimDataAuthError && e.status === 403,
  );
});

test("relay 5xx → 일반 Error(상태코드만 포함 — 본문·자격증명 비포함)", async () => {
  mockFetch(503, {});
  await assert.rejects(
    () => db.setUserData(makeReq({ cookie: "pullim-at=t" }), "results", {}),
    (e) => e instanceof Error && !(e instanceof db.PullimDataAuthError) && /503/.test(e.message),
  );
});

test("mutation 404 → throw (성공 위장 금지 — 표면 미배포 시 조용한 유실 방지)", async () => {
  // 회귀 배경: 표면 미배포 dev-api 에 PUT 이 404 를 받고도 {ok:true} 로 위장 성공(2026-07-07 로컬 종단 검증 실사고).
  mockFetch(404, {});
  await assert.rejects(
    () => db.setUserData(makeReq({ cookie: "pullim-at=t" }), "drafts", { a: 1 }),
    (e) => e instanceof db.RelayStatusError && e.status === 404,
  );
  await assert.rejects(
    () => db.deleteUserData(makeReq({ cookie: "pullim-at=t" }), "drafts"),
    (e) => e instanceof db.RelayStatusError && e.status === 404,
  );
  await assert.rejects(
    () => db.deleteAllUserData(makeReq({ cookie: "pullim-at=t" })),
    (e) => e instanceof db.RelayStatusError && e.status === 404,
  );
});
