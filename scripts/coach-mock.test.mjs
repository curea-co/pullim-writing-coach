// 코치 MOCK 휴리스틱 테스트 (EPIC2 T2.2). docs/27 analyze + nudge 생성을 서버 순수함수로 재구현한 것.
// 실행: node --import ./scripts/register-ts.mjs --test scripts/coach-mock.test.mjs
// 고정: 5영역 순서·범위 / 약한 영역 nudge 생성 / 스키마·생성차단 가드 통과 / 결정성 / 빈약/충실 글 분기.

import assert from "node:assert/strict";
import { test } from "node:test";
import { analyzeBody, runCoachMock } from "../app/lib/coach-mock.ts";
import { runCoachGuards, validateCoachOutput } from "../app/lib/coach-schema.ts";

const AREAS = ["과제 이해", "내용 충실도", "구조·논리", "표현·문장", "성장 가능성"];

// 약한 초안: 짧고 근거·연결어 없는 단문 나열(docs/27 SEED 성격).
const WEAK = "화산은 마그마가 분출하여 만들어진 지형이다. 화산은 위험하다. 그래서 조심해야 한다.";

// 충실한 초안: 문단 구분 + 근거어 + 연결어 + 영향 어휘 + 긴/짧은 문장 혼합.
const RICH = `화산은 마그마가 분출하여 만들어진 지형이다. 형성 과정을 살펴보면, 먼저 땅속 깊은 곳의 마그마가 쌓여 압력이 높아진다. 그래서 약한 지각을 뚫고 분출하게 된다.

예를 들어 백두산은 실제로 폭발한 기록이 있다. 첫째, 화산은 온천과 토양을 주어 농사와 관광에 도움이 된다. 따라서 우리 삶에 미치는 영향은 피해와 이로움 두 가지 모두 있다. 결론적으로 화산은 위험하지만 동시에 혜택도 주는 지형이다.`;

test("analyzeBody: 5영역을 AREAS 순서대로, 각 0~20 정수로 반환", () => {
  const scores = analyzeBody(WEAK);
  assert.equal(scores.length, 5);
  scores.forEach((s, i) => {
    assert.equal(s.area, AREAS[i], `순서 [${i}]`);
    assert.ok(Number.isInteger(s.score), `정수 [${i}]`);
    assert.ok(s.score >= 0 && s.score <= 20, `범위 [${i}]`);
  });
});

test("analyzeBody: 충실한 글이 빈약한 글보다 내용·구조 점수가 높다", () => {
  const weak = analyzeBody(WEAK);
  const rich = analyzeBody(RICH);
  const get = (arr, area) => arr.find((s) => s.area === area).score;
  assert.ok(get(rich, "내용 충실도") > get(weak, "내용 충실도"), "내용 충실도");
  assert.ok(get(rich, "구조·논리") > get(weak, "구조·논리"), "구조·논리");
});

test("runCoachMock: 출력이 스키마 검증을 통과한다", () => {
  const out = runCoachMock(WEAK);
  assert.deepEqual(validateCoachOutput(out), []);
});

test("runCoachMock: 출력이 생성차단 가드를 통과한다(대필 누출 없음)", () => {
  const out = runCoachMock(WEAK);
  assert.deepEqual(runCoachGuards(out), []);
});

test("runCoachMock: 약한 글은 nudge를 1개 이상 만든다", () => {
  const out = runCoachMock(WEAK);
  assert.ok(out.nudges.length >= 1, "약점 nudge 존재");
  // nudge는 NUDGEABLE 4영역 중에서만(성장 가능성은 직접 nudge 안 함).
  out.nudges.forEach((n) => {
    assert.notEqual(n.rubric_area, "성장 가능성");
    assert.ok(AREAS.includes(n.rubric_area));
  });
});

test("runCoachMock: quick_win_rank가 점수 낮은 순(1=먼저)으로 부여된다", () => {
  const out = runCoachMock(WEAK);
  const ranks = out.nudges.map((n) => n.quick_win_rank);
  // 1..n 연속이며 오름차순.
  assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b));
  assert.equal(ranks[0], 1);
});

test("runCoachMock: 결정적이다(같은 입력 → 같은 출력)", () => {
  assert.deepEqual(runCoachMock(WEAK), runCoachMock(WEAK));
  assert.deepEqual(runCoachMock(RICH), runCoachMock(RICH));
});

test("runCoachMock: paragraph_index가 문단 범위 안", () => {
  const out = runCoachMock(RICH);
  const paraCount = RICH.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean).length;
  out.nudges.forEach((n) => {
    assert.ok(n.paragraph_index >= 0 && n.paragraph_index < paraCount, "문단 범위");
  });
});

test("runCoachMock: 빈/비문자 입력도 유효한 CoachOutput을 반환", () => {
  for (const bad of ["", "   ", null, undefined, 123]) {
    const out = runCoachMock(bad);
    assert.deepEqual(validateCoachOutput(out), [], `입력=${String(bad)}`);
    assert.deepEqual(runCoachGuards(out), []);
  }
});
