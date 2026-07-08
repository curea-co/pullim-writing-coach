// pullim-session 단위 테스트 (Phase 3 — 로그인/entitlement 게이팅).
//   verifyWritingAccess(req): access 쿠키(pullim-at·dev-pullim-at) → {API}/me 200=인가.
//   /me 비200 또는 쿠키 없음: 비prod이면 데모토큰 fallback / prod이면 false(fail-closed).
// 실행: node --import ./scripts/register-ts.mjs --test scripts/pullim-session.test.mjs
//   (ts-ext-hooks.mjs가 server-only를 no-op로 단락 → server-only import 통과)

import assert from "node:assert/strict";
import { test, beforeEach, afterEach } from "node:test";

const { verifyWritingAccess } = await import("../app/lib/server/pullim-session.ts");

const realFetch = globalThis.fetch;
const realNodeEnv = process.env.NODE_ENV;

beforeEach(() => {
  delete process.env.DEMO_ACCESS_TOKEN;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  // NODE_ENV 원복 (테스트 러너 기본은 'test' 또는 undefined)
  if (realNodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = realNodeEnv;
});

function makeReq(headers = {}) {
  return new Request("https://writing.pullim.ai/api/score", { method: "POST", headers });
}

// ── 세션 경로 (/me 200) ────────────────────────────────────────────
test("세션 200 → true (NODE_ENV 무관)", async () => {
  globalThis.fetch = async () => ({ status: 200 });
  const req = makeReq({ cookie: "dev-pullim-at=abc" });
  assert.equal(await verifyWritingAccess(req), true);
});

test("로컬에서도 /me 200이면 데모 없이 true (cookie 경로가 fallback보다 우선)", async () => {
  process.env.NODE_ENV = "test";
  globalThis.fetch = async () => ({ status: 200 });
  const req = makeReq({ cookie: "dev-pullim-at=abc" });
  assert.equal(await verifyWritingAccess(req), true);
});

// ── prod fail-closed ────────────────────────────────────────────────
test("게스트(access 쿠키 있으나 /me 401, prod) → false (데모 fallback 없음)", async () => {
  process.env.NODE_ENV = "production";
  process.env.DEMO_ACCESS_TOKEN = "secret"; // 설정돼 있어도 prod fallback 금지
  globalThis.fetch = async () => ({ status: 401 });
  const req = makeReq({ cookie: "dev-pullim-at=abc", "x-demo-token": "secret" });
  assert.equal(await verifyWritingAccess(req), false);
});

test("게스트(쿠키 없음, prod) → false + /me fetch 미호출", async () => {
  process.env.NODE_ENV = "production";
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    return { status: 200 };
  };
  const req = makeReq(); // cookie 헤더 없음
  assert.equal(await verifyWritingAccess(req), false);
  assert.equal(called, false, "쿠키 없으면 /me 호출 안 함");
});

test("access 쿠키 있으나 fetch throw(네트워크) + prod → false (fail-closed)", async () => {
  process.env.NODE_ENV = "production";
  globalThis.fetch = async () => {
    throw new Error("network down");
  };
  const req = makeReq({ cookie: "dev-pullim-at=abc" });
  assert.equal(await verifyWritingAccess(req), false);
});

// ── 로컬 데모 fallback ──────────────────────────────────────────────
test("로컬 + 데모일치 → true (access 쿠키 없음 → fallback)", async () => {
  process.env.NODE_ENV = "test";
  process.env.DEMO_ACCESS_TOKEN = "secret";
  const req = makeReq({ "x-demo-token": "secret" });
  assert.equal(await verifyWritingAccess(req), true);
});

test("로컬 + 데모불일치 → false", async () => {
  process.env.NODE_ENV = "test";
  process.env.DEMO_ACCESS_TOKEN = "secret";
  const req = makeReq({ "x-demo-token": "wrong" });
  assert.equal(await verifyWritingAccess(req), false);
});

test("로컬 + DEMO_ACCESS_TOKEN 미설정 → false (fail-closed 보존)", async () => {
  process.env.NODE_ENV = "test";
  // DEMO_ACCESS_TOKEN 미설정 (beforeEach delete)
  const req = makeReq({ "x-demo-token": "x" });
  assert.equal(await verifyWritingAccess(req), false);
});

test("로컬 + access 쿠키 있으나 /me 401 → 데모 fallback 진입 (일치 시 true)", async () => {
  process.env.NODE_ENV = "test";
  process.env.DEMO_ACCESS_TOKEN = "secret";
  globalThis.fetch = async () => ({ status: 401 });
  const req = makeReq({ cookie: "dev-pullim-at=abc", "x-demo-token": "secret" });
  assert.equal(await verifyWritingAccess(req), true);
});








// ── prod 쿠키명(pullim-at) 회귀 — 2026-07-06 prod 종단검증 사고 ────────────
//   prod api 는 `pullim-at`, dev-api 는 `dev-pullim-at` 을 발급한다. dev 이름만 보던 게이트가
//   prod 쿠키를 못 찾아 전 서버 인가가 fail-closed 401 → 두 이름 모두 인식해야 한다.
test("prod 쿠키명 pullim-at + /me 200 → true (2026-07-06 회귀)", async () => {
  process.env.NODE_ENV = "production";
  globalThis.fetch = async () => ({ status: 200 });
  const req = makeReq({ cookie: "pwc-rl-id=x; pullim-at=abc; pullim-csrf=y" });
  assert.equal(await verifyWritingAccess(req), true);
});

test("prod 쿠키명 pullim-at → /me relay 호출됨 (게이트 통과 확인)", async () => {
  process.env.NODE_ENV = "production";
  let called = false;
  globalThis.fetch = async () => { called = true; return { status: 200 }; };
  await verifyWritingAccess(makeReq({ cookie: "pullim-at=abc" }));
  assert.equal(called, true);
});


test("유사 이름 쿠키(pullim-atx=, xpullim-at=)만 있으면 게이트 미통과 → /me 미호출", async () => {
  process.env.NODE_ENV = "production";
  let called = false;
  globalThis.fetch = async () => { called = true; return { status: 200 }; };
  assert.equal(await verifyWritingAccess(makeReq({ cookie: "pullim-atx=a; xpullim-at=b" })), false);
  assert.equal(called, false);
});
