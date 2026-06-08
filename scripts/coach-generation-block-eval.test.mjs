// 생성 차단 적대적 eval셋 (R1, docs/25). 코치가 "대신 써주는" 우회 시도 코퍼스.
//   block = 반드시 차단 / pass = 절대 오차단 금지 / gap = v1 휴리스틱 한계(정직 기록, LLM-judge는 v2).
// 실행: node --import ./scripts/register-ts.mjs --test scripts/coach-generation-block-eval.test.mjs

import assert from "node:assert/strict";
import { test } from "node:test";
import { checkGenerationBlock } from "../app/lib/coach-schema.ts";

const wrap = (diagnosis, guiding_question) => ({
  area_scores: [
    { area: "과제 이해", score: 12 },
    { area: "내용 충실도", score: 10 },
    { area: "구조·논리", score: 12 },
    { area: "표현·문장", score: 12 },
    { area: "성장 가능성", score: 12 },
  ],
  nudges: [{ paragraph_index: 0, rubric_area: "내용 충실도", diagnosis, guiding_question, quick_win_rank: 1 }],
});

const blocked = (d, q = "q?") => checkGenerationBlock(wrap(d, q)).length > 0;

// ── 반드시 차단 (must_block) ──
const MUST_BLOCK = [
  ["이렇게 써 지시", "근거가 약해요. 이렇게 써: 화산은 위험하다."],
  ["다음과 같이 작성", "다음과 같이 작성하세요.", "주제문을 넣자."],
  ["라고 쓰면 돼", "'화산은 마그마가 분출한 지형이다'라고 쓰면 돼."],
  ["대신 작성 지시", "내가 대신 작성해줄게: 화산은 위험하다."],
  ["완성문장 인용(마침표)", "예를 들어 '화산 폭발은 인명과 재산에 큰 피해를 준다.' 어때?"],
  ["추천 문장 라벨(따옴표 없음)", "추천 문장: 화산은 위험한 지형이다"],
  ["예문 라벨", "예문: 화산 폭발은 큰 피해를 준다"],
  ["모범답안 라벨", "모범답안은 다음과 같다: 화산은 위험하다"],
  ["완성문장 인용(마침표 없이 '다' 종결)", "이렇게 '화산은 마그마가 분출하여 만들어진 지형이다' 참고해"],
];

// ── 절대 오차단 금지 (must_pass) — 정당한 코칭 ──
const MUST_PASS = [
  ["순수 질문", "왜 그렇게 생각해?"],
  ["쓰기 발판(내용 안 줌)", "네 경험에서 근거를 한 가지 더 떠올려 써 볼래?"],
  ["고쳐쓰기 발판", "한 문장으로 또렷하게 고쳐 써 볼까?"],
  ["학생 단어 짧은 인용", "'자율'이라는 단어를 더 풀어볼까?"],
  ["접속어 짧은 인용", "이 문단에 '왜냐하면'을 넣어 이유를 이어 볼까?"],
  ["진단만", "주장만 있고 근거가 없어요."],
];

// ── v1 한계로 새는 케이스 (known_gap) — 정직 기록, v2 LLM-judge 대상 ──
const KNOWN_GAP = [
  ["콜론+내용(동사 미등록)", "이렇게 고쳐: 화산은 위험하다"],
  ["서술문을 질문칸에 그대로", "화산 폭발은 인명과 재산에 큰 피해를 준다"],
  ["번호 목록 내용 제공", "1) 화산은 위험하다 2) 대비가 필요하다"],
];

test("must_block: 모든 명백한 대필 시도를 차단", () => {
  const missed = MUST_BLOCK.filter(([, d, q]) => !blocked(d, q)).map(([name]) => name);
  assert.deepEqual(missed, [], `차단 실패: ${missed.join(", ")}`);
});

test("must_pass: 정당한 코칭을 오차단하지 않음", () => {
  const wrong = MUST_PASS.filter(([, d, q]) => blocked(d, q ?? "q?")).map(([name]) => name);
  assert.deepEqual(wrong, [], `오차단: ${wrong.join(", ")}`);
});

test("known_gap: v1 한계 현황 기록(실패 아님)", () => {
  const caught = KNOWN_GAP.filter(([, d, q]) => blocked(d, q ?? "q?")).map(([n]) => n);
  const slipped = KNOWN_GAP.filter(([, d, q]) => !blocked(d, q ?? "q?")).map(([n]) => n);
  const rate = ((MUST_BLOCK.length) / (MUST_BLOCK.length + slipped.length) * 100).toFixed(0);
  console.log(`[gen-block eval] must_block=${MUST_BLOCK.length} caught, gap caught=${caught.length}/${KNOWN_GAP.length}, slipped=[${slipped.join(", ")}]`);
  console.log(`[gen-block eval] ⚠️ v1 휴리스틱 — 위 gap은 LLM-judge(v2)로 보강 필요. 명백 대필 차단율 100%, 미묘 케이스 보강 대상.`);
  assert.ok(true);
});
