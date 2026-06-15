// 과정 코치 출력 스키마 검증 테스트 (T1.1). 순수 모듈을 번들 없이 직접 import.
// 실행: node --import ./scripts/register-ts.mjs --test scripts/coach-schema.test.mjs
// 회귀 고정: area_scores 5영역·범위·순서 / nudge 필드 검증 / 빈 진단·질문 거부 / paragraph_index·rank.

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  checkGenerationBlock,
  runCoachGuards,
  validateCoachOutput,
} from "../app/lib/coach-schema.ts";

const validOutput = () => ({
  area_scores: [
    { area: "과제 이해", score: 14 },
    { area: "내용 충실도", score: 10 },
    { area: "구조·논리", score: 12 },
    { area: "표현·문장", score: 13 },
    { area: "성장 가능성", score: 11 },
  ],
  nudges: [
    {
      paragraph_index: 1,
      rubric_area: "내용 충실도",
      diagnosis: "주장만 있고 근거가 없어요.",
      guiding_question: "네 경험에서 왜 그런지 하나 떠올려볼까?",
      quick_win_rank: 1,
    },
  ],
});

test("정상 출력 → 위반 없음(빈 배열)", () => {
  assert.deepEqual(validateCoachOutput(validOutput()), []);
});

test("객체가 아니면 위반", () => {
  assert.ok(validateCoachOutput(null).length > 0);
  assert.ok(validateCoachOutput("nope").length > 0);
});

test("area_scores가 5개가 아니면 위반", () => {
  const o = validOutput();
  o.area_scores = o.area_scores.slice(0, 4);
  assert.ok(validateCoachOutput(o).some((e) => e.includes("area_scores")));
});

test("area 순서가 틀리면 위반", () => {
  const o = validOutput();
  o.area_scores[0].area = "내용 충실도"; // 0번은 '과제 이해'여야 함
  assert.ok(validateCoachOutput(o).some((e) => e.includes("area")));
});

test("score가 0~20 범위를 벗어나면 위반", () => {
  const o = validOutput();
  o.area_scores[2].score = 21;
  assert.ok(validateCoachOutput(o).some((e) => e.includes("score")));
  const o2 = validOutput();
  o2.area_scores[2].score = -1;
  assert.ok(validateCoachOutput(o2).some((e) => e.includes("score")));
});

test("nudges가 배열이 아니면 위반", () => {
  const o = validOutput();
  o.nudges = "x";
  assert.ok(validateCoachOutput(o).some((e) => e.includes("nudges")));
});

test("nudge.diagnosis가 빈 문자열이면 위반", () => {
  const o = validOutput();
  o.nudges[0].diagnosis = "   ";
  assert.ok(validateCoachOutput(o).some((e) => e.includes("diagnosis")));
});

test("nudge.guiding_question이 비면 위반", () => {
  const o = validOutput();
  o.nudges[0].guiding_question = "";
  assert.ok(validateCoachOutput(o).some((e) => e.includes("guiding_question")));
});

test("nudge.rubric_area가 5영역이 아니면 위반", () => {
  const o = validOutput();
  o.nudges[0].rubric_area = "맞춤법";
  assert.ok(validateCoachOutput(o).some((e) => e.includes("rubric_area")));
});

test("nudge.paragraph_index가 음수/비정수면 위반", () => {
  const o = validOutput();
  o.nudges[0].paragraph_index = -1;
  assert.ok(validateCoachOutput(o).some((e) => e.includes("paragraph_index")));
  const o2 = validOutput();
  o2.nudges[0].paragraph_index = 1.5;
  assert.ok(validateCoachOutput(o2).some((e) => e.includes("paragraph_index")));
});

test("nudge.quick_win_rank가 숫자가 아니면 위반", () => {
  const o = validOutput();
  o.nudges[0].quick_win_rank = "1";
  assert.ok(validateCoachOutput(o).some((e) => e.includes("quick_win_rank")));
});

// ── 생성 차단 가드 (T1.2) — 코치가 "대신 문장을 써주는" 출력을 잡아낸다 ──
// 이 불변식이 무너지면 ChatGPT와 같아지고 교사 인정·자유 사용이 동시에 깨진다(전략 §4).

test("진단·질문만 있는 깨끗한 nudge → 생성 차단 위반 없음", () => {
  assert.deepEqual(checkGenerationBlock(validOutput()), []);
});

test("진단에 '이렇게 써:' 같은 대필 지시 → 위반", () => {
  const o = validOutput();
  o.nudges[0].diagnosis = "근거가 약해요. 이렇게 써: 화산은 위험하다.";
  assert.ok(checkGenerationBlock(o).length > 0);
});

test("질문에 '다음과 같이 작성하세요' 대필 지시 → 위반", () => {
  const o = validOutput();
  o.nudges[0].guiding_question = "다음과 같이 작성하세요.";
  assert.ok(checkGenerationBlock(o).length > 0);
});

test("'라고 쓰면 돼' 대필 지시 → 위반", () => {
  const o = validOutput();
  o.nudges[0].diagnosis = "'화산은 마그마가 분출한 지형이다'라고 쓰면 돼.";
  assert.ok(checkGenerationBlock(o).length > 0);
});

test("문장부호로 끝나는 긴 인용(붙여넣기용 완성문장) → 위반", () => {
  const o = validOutput();
  o.nudges[0].guiding_question = "예를 들어 '화산 폭발은 인명과 재산에 큰 피해를 준다.' 어때?";
  assert.ok(checkGenerationBlock(o).length > 0);
});

test("학생 단어 짧은 인용('자율')은 위반 아님", () => {
  const o = validOutput();
  o.nudges[0].guiding_question = "'자율'이라는 말을 네 경험으로 더 풀어볼까?";
  assert.deepEqual(checkGenerationBlock(o), []);
});

test("위반 메시지는 어느 nudge인지(index) 가리킨다", () => {
  const o = validOutput();
  o.nudges = [
    o.nudges[0],
    {
      paragraph_index: 2,
      rubric_area: "표현·문장",
      diagnosis: "이렇게 써: 끝.",
      guiding_question: "괜찮아?",
      quick_win_rank: 2,
    },
  ];
  const v = checkGenerationBlock(o);
  assert.ok(v.some((e) => e.includes("[1]")));
});

test("runCoachGuards는 생성 차단 위반을 집계한다", () => {
  const o = validOutput();
  o.nudges[0].diagnosis = "이렇게 써: 화산은 위험하다.";
  assert.ok(runCoachGuards(o).length > 0);
  assert.deepEqual(runCoachGuards(validOutput()), []);
});

// ── 인용 면제 (A1 라이브 eval 버그 수정) — 코치가 '학생 본인 문장'을 인용하는 정당한 코칭이
//    LONG_QUOTE 오탐으로 502 나가던 것을 draft 전달로 면제 ──
test("학생 초안에 있는 문장 인용은 draft 면제로 통과", () => {
  const draft = "화산은 마그마가 분출하여 만들어진 지형이다. 화산은 위험하다.";
  const o = validOutput();
  o.nudges[0].guiding_question =
    "네가 쓴 '화산은 마그마가 분출하여 만들어진 지형이다.'에서 어떻게 만들어지는지 더 풀어 볼까?";
  assert.ok(checkGenerationBlock(o).length > 0); // draft 없으면 오탐(기존 동작)
  assert.deepEqual(checkGenerationBlock(o, draft), []); // draft 면제 → 통과
  assert.deepEqual(runCoachGuards(o, draft), []); // runCoachGuards도 전달
});

test("초안에 없는 완성문장은 draft 줘도 차단(대필)", () => {
  const draft = "화산은 위험하다.";
  const o = validOutput();
  o.nudges[0].guiding_question = "예를 들어 '화산 폭발은 인명과 재산에 큰 피해를 준다.' 어때?";
  assert.ok(checkGenerationBlock(o, draft).length > 0);
});
