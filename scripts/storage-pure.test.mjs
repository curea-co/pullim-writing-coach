// storage.ts 순수 헬퍼 보존 검증 — window 없는 노드 환경(어댑터는 SSR 가드로 빈/[] 반환).
//   실행: node --import ./scripts/register-ts.mjs --test scripts/storage-pure.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
const s = await import("../app/lib/storage.ts");

test("isProfile — 필수 필드 검증 유지", () => {
  assert.equal(
    s.isProfile({ nickname: "민수", school_level: "중1", primary_subject: "국어", consent_at: "2026-01-01T00:00:00+09:00" }),
    true,
  );
  assert.equal(s.isProfile({ nickname: "" }), false);
});
test("MAX_RESULTS·MAX_REVISIONS_PER_THREAD 상수 유지", () => {
  assert.equal(s.MAX_RESULTS, 20);
  assert.equal(s.MAX_REVISIONS_PER_THREAD, 3);
});
test("loadResults — window 없으면 [] (SSR/노드)", async () => {
  assert.deepEqual(await s.loadResults(), []);
});
test("consent payload 통로 export 존재(consent-store 위임 대상)", () => {
  assert.equal(typeof s.loadConsentData, "function");
  assert.equal(typeof s.saveConsentData, "function");
  assert.equal(typeof s.clearConsentData, "function");
  assert.equal(typeof s.clearAllLocalStorage, "function");
});
