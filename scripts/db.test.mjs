// db.ts 단위 테스트 — Neon sql 태그드 템플릿을 모킹(__setSqlForTest)해 쿼리 형태·스코프 검증.
//   실행: node --import ./scripts/register-ts.mjs --test scripts/db.test.mjs
import assert from "node:assert/strict";
import { test, beforeEach, afterEach } from "node:test";

const db = await import("../app/lib/server/db.ts");

let calls;
beforeEach(() => {
  calls = [];
  db.__setSqlForTest(async (strings, ...values) => {
    calls.push({ text: strings.join("?"), values });
    // getUserData가 기대하는 row 형태를 기본 반환(setUserData/delete는 무시).
    return [{ payload: { ok: true } }];
  });
});
afterEach(() => db.__setSqlForTest(null));

test("isDataKey — 화이트리스트만 true", () => {
  assert.equal(db.isDataKey("results"), true);
  assert.equal(db.isDataKey("profile"), true);
  assert.equal(db.isDataKey("hack"), false);
  assert.equal(db.isDataKey(123), false);
});

test("getUserData — sub·key 바인딩 + payload 반환", async () => {
  const out = await db.getUserData("user-abc", "results");
  assert.deepEqual(out, { ok: true });
  assert.deepEqual(calls[0].values, ["user-abc", "results"]);
  assert.match(calls[0].text, /select payload/i);
});

test("getUserData — row 없으면 null", async () => {
  db.__setSqlForTest(async () => []);
  assert.equal(await db.getUserData("u", "results"), null);
});

test("setUserData — upsert에 sub·key·payload 바인딩", async () => {
  await db.setUserData("user-abc", "profile", { nickname: "민수" });
  assert.match(calls[0].text, /insert into writing_user_data/i);
  assert.match(calls[0].text, /on conflict/i);
  assert.deepEqual(calls[0].values, ["user-abc", "profile", { nickname: "민수" }]);
});

test("deleteAllUserData — sub만 바인딩", async () => {
  await db.deleteAllUserData("user-abc");
  assert.match(calls[0].text, /delete from writing_user_data/i);
  assert.deepEqual(calls[0].values, ["user-abc"]);
});
