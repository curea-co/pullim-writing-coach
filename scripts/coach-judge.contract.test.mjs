// 생성차단 LLM-judge 백스톱 — DECISION 와이어링 계약 테스트 (라이브 모델 미사용).
//   판정 로직만 검증한다: judge가 대필 지목 → 차단 / judge 에러 → fail-open(차단 안 함) /
//   env OFF → judge 미소집. 모델은 주입된 fake callFn으로 대체한다(실호출 0, 결정적).
// 실행: node --import ./scripts/register-ts.mjs --test scripts/coach-judge.contract.test.mjs
//
// ⚠ coach-judge.ts는 server-only다(node 환경엔 그 패키지가 없음). 이 테스트 파일이
//   자체 ESM resolve 훅을 등록해 'server-only'를 빈 모듈로 스텁한 뒤 실 모듈을 import한다.
//   (공유 로더 register-ts.mjs는 건드리지 않는다 — 소유 범위 밖.)

import { register } from "node:module";
import { pathToFileURL } from "node:url";

// 'server-only' import를 무해한 빈 모듈로 단락(short-circuit)시킨다.
register(
  "data:text/javascript," +
    encodeURIComponent(
      "export async function resolve(s,c,n){" +
        "if(s==='server-only'){return{url:'data:text/javascript,export default {};',shortCircuit:true};}" +
        "return n(s,c);}",
    ),
  pathToFileURL("./scripts/"),
);

import assert from "node:assert/strict";
import { test } from "node:test";

// ⚠ 정적 import 선언은 위 register() 호출보다 먼저 평가(호이스팅)되므로 server-only 스텁이
//   안 먹는다. register() 이후 동적 import로 실 모듈을 로드한다(top-level await).
const { isJudgeEnabled, judgeNoGhostwriting, judgeResultToGuardErrs } = await import(
  "../app/lib/server/coach-judge.ts"
);

// ── 픽스처 ───────────────────────────────────────────────────────────
const nudges = [
  {
    paragraph_index: 0,
    rubric_area: "내용 충실도",
    diagnosis: "근거가 부족해요.",
    guiding_question: "왜 그렇게 생각했는지 떠올려볼까?",
    quick_win_rank: 1,
  },
];

// 프리필 "{" 복원 모사: callModel은 본문 앞에 "{"를 prepend해 반환한다. jsonBody는 "{" 이후 본문.
//   → 완성 JSON이 되도록 호출자가 닫는 "}"까지 포함해 넘긴다.
const fakeReturning = (jsonBody) => async () => `{${jsonBody}`;
// 항상 throw하는 fake callFn(호출/타임아웃 실패 모사).
const fakeThrowing = (msg = "boom") =>
  async () => {
    throw new Error(msg);
  };

// route 와이어링 동치 미러: env 게이트 + judge 결과 → 차단 여부.
//   (실제 route.ts와 동일한 결정 로직. server-only route는 직접 import 불가하므로 동치 미러를 검증.)
async function decideBlock({ env, nudges: ns, callFn }) {
  if (!isJudgeEnabled(env)) return { consulted: false, blocked: false, errs: [] };
  const verdict = await judgeNoGhostwriting(ns, callFn);
  const errs = judgeResultToGuardErrs(verdict);
  return { consulted: true, blocked: errs.length > 0, errs };
}

// ── isJudgeEnabled ───────────────────────────────────────────────────
test("isJudgeEnabled: COACH_GENBLOCK_JUDGE==='1' 만 true (기본 OFF)", () => {
  assert.equal(isJudgeEnabled({ COACH_GENBLOCK_JUDGE: "1" }), true);
  assert.equal(isJudgeEnabled({ COACH_GENBLOCK_JUDGE: "0" }), false);
  assert.equal(isJudgeEnabled({ COACH_GENBLOCK_JUDGE: "true" }), false);
  assert.equal(isJudgeEnabled({}), false);
});

// ── judgeResultToGuardErrs ───────────────────────────────────────────
test("judgeResultToGuardErrs: ghostwrote=false → 빈 배열(통과)", () => {
  assert.deepEqual(judgeResultToGuardErrs({ ghostwrote: false, indices: [] }), []);
});

test("judgeResultToGuardErrs: ghostwrote=true → 위반 1건, 대필 문장 미포함(인덱스만)", () => {
  const errs = judgeResultToGuardErrs({ ghostwrote: true, indices: [0, 2] });
  assert.equal(errs.length, 1);
  assert.match(errs[0], /judge/);
  assert.match(errs[0], /0,2/); // 인덱스만 노출
});

// ── judgeNoGhostwriting (fake callFn 주입) ───────────────────────────
test("judge ghostwrote=true 응답 → ghostwrote=true, indices 보존", async () => {
  const r = await judgeNoGhostwriting(nudges, fakeReturning('"ghostwrote":true,"which":[0]}'));
  assert.equal(r.ghostwrote, true);
  assert.deepEqual(r.indices, [0]);
});

test("judge ghostwrote=false 응답 → ghostwrote=false, 빈 indices", async () => {
  const r = await judgeNoGhostwriting(nudges, fakeReturning('"ghostwrote":false,"which":[]}'));
  assert.equal(r.ghostwrote, false);
  assert.deepEqual(r.indices, []);
});

test("nudges 비어있으면 callFn 미호출 + ghostwrote=false (비용 0)", async () => {
  let called = false;
  const spy = async () => {
    called = true;
    return '{"ghostwrote":true,"which":[0]}';
  };
  const r = await judgeNoGhostwriting([], spy);
  assert.equal(called, false);
  assert.equal(r.ghostwrote, false);
});

test("fail-OPEN: callFn throw → ghostwrote=false (차단 안 함)", async () => {
  const r = await judgeNoGhostwriting(nudges, fakeThrowing("timeout"));
  assert.equal(r.ghostwrote, false);
  assert.deepEqual(r.indices, []);
});

test("fail-OPEN: 깨진 JSON 응답 → ghostwrote=false (차단 안 함)", async () => {
  const r = await judgeNoGhostwriting(nudges, async () => "{not json");
  assert.equal(r.ghostwrote, false);
});

test("fail-OPEN: ghostwrote 키 누락/비불리언 → ghostwrote=false", async () => {
  const r = await judgeNoGhostwriting(nudges, fakeReturning('"which":[0]}'));
  assert.equal(r.ghostwrote, false);
});

// ── route 와이어링 동치(decideBlock) ─────────────────────────────────
test("env OFF → judge 미소집(consulted=false), callFn 호출 안 됨", async () => {
  let called = false;
  const spy = async () => {
    called = true;
    return '{"ghostwrote":true,"which":[0]}';
  };
  const d = await decideBlock({ env: {}, nudges, callFn: spy });
  assert.equal(d.consulted, false);
  assert.equal(d.blocked, false);
  assert.equal(called, false); // env OFF이면 judge 자체를 부르지 않는다
});

test("env ON + judge ghostwrote=true → 차단(blocked=true)", async () => {
  const d = await decideBlock({
    env: { COACH_GENBLOCK_JUDGE: "1" },
    nudges,
    callFn: fakeReturning('"ghostwrote":true,"which":[0]}'),
  });
  assert.equal(d.consulted, true);
  assert.equal(d.blocked, true);
  assert.equal(d.errs.length, 1);
});

test("env ON + judge ghostwrote=false → 통과(blocked=false)", async () => {
  const d = await decideBlock({
    env: { COACH_GENBLOCK_JUDGE: "1" },
    nudges,
    callFn: fakeReturning('"ghostwrote":false,"which":[]}'),
  });
  assert.equal(d.consulted, true);
  assert.equal(d.blocked, false);
});

test("env ON + judge 에러 → fail-open으로 통과(blocked=false)", async () => {
  const d = await decideBlock({
    env: { COACH_GENBLOCK_JUDGE: "1" },
    nudges,
    callFn: fakeThrowing("upstream 503"),
  });
  assert.equal(d.consulted, true);
  assert.equal(d.blocked, false); // judge 실패가 정당한 코칭을 막지 않는다
});
