// 생성 차단 적대적 eval셋 (R1 → v2, docs/25). 코치가 "대신 써주는" 우회 시도 코퍼스.
//   block = 반드시 차단 / pass = 절대 오차단 금지 / gap = 휴리스틱 한계(정직 기록, 잔여는 LLM-judge).
// 실행: node --import ./scripts/register-ts.mjs --test scripts/coach-generation-block-eval.test.mjs
//
// v2: 기존 KNOWN_GAP 3건(콜론+내용 / 서술문을 질문칸에 그대로 / 번호목록 내용제공)을 휴리스틱 정교화로
//   잡아 must_block으로 승격했다. 콜론 뒤 완성문장·질문칸 평서문·목록 단정형 항목을 추가로 탐지하되
//   정당한 코칭(순수질문·발판·서술형 진단·짧은 학생단어 인용)은 오차단하지 않는다(오차단 0 유지).

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

  // ── v2 승격: 이전 KNOWN_GAP 3건을 휴리스틱 정교화로 차단 ──
  ["콜론+완성문장 떠먹임", "이렇게 고쳐: 화산은 위험하다", "어때?"],
  ["서술문을 질문칸에 그대로", "근거가 약해요.", "화산 폭발은 인명과 재산에 큰 피해를 준다"],
  ["번호목록 내용 제공", "1) 화산은 위험하다 2) 대비가 필요하다", "어때?"],

  // ── v2 추가 코퍼스(+5) — 견고화 ──
  ["불릿 목록 내용 제공", "- 화산은 위험하다\n- 대비가 필요하다", "어때?"],
  ["콜론 뒤 단정형(이다)", "주제문은 이렇게: 화산은 마그마가 분출한 지형이다", "?"],
  ["질문칸 단정형(필요하다)", "구조가 약해요.", "재난 대비 교육이 학교마다 반드시 필요하다"],
  ["가나다 목록 내용 제공", "가) 화산은 위험하다 나) 지진도 위험하다", "어때?"],
  ["콜론 뒤 한다 종결", "마무리 문장 제안: 우리는 재난에 미리 대비해야 한다", "?"],
];

// ── 절대 오차단 금지 (must_pass) — 정당한 코칭 ──
const MUST_PASS = [
  ["순수 질문", "왜 그렇게 생각해?"],
  ["쓰기 발판(내용 안 줌)", "네 경험에서 근거를 한 가지 더 떠올려 써 볼래?"],
  ["고쳐쓰기 발판", "한 문장으로 또렷하게 고쳐 써 볼까?"],
  ["학생 단어 짧은 인용", "'자율'이라는 단어를 더 풀어볼까?"],
  ["접속어 짧은 인용", "이 문단에 '왜냐하면'을 넣어 이유를 이어 볼까?"],
  ["진단만", "주장만 있고 근거가 없어요."],

  // ── v2 추가: 정교해진 휴리스틱이 코칭을 오차단하지 않는지 방어 ──
  ["서술형 진단(평서문)", "이 문단은 주장만 있고 근거가 부족합니다.", "왜 그렇게 생각하는지 한 가지 써 볼까?"],
  ["콜론 뒤 질문(코칭)", "이 부분을 다시 볼까: 왜 그게 중요할까?", "어떤 근거가 떠올라?"],
  ["발판형 질문칸(볼까)", "근거가 약해요.", "네 경험에서 이유를 한 가지 떠올려 써 볼까"],
  ["콜론 뒤 짧은 라벨", "확인할 점: 근거", "이유가 무엇일까?"],
  ["번호 질문 목록(코칭)", "두 가지를 점검해 볼까? 1) 주장이 분명한지 2) 근거가 있는지", "어때?"],
  ["요청형 단정 꼬리(보자)", "흐름이 끊겨요.", "두 문단을 한 문장으로 이어 보자"],
];

// ── 휴리스틱 잔여 한계 기록 (known_gap) — 정직 기록, 잔여는 LLM-judge(후속) 대상 ──
//   v2에서 핵심 3건을 승격해 현재 코퍼스상 잔여 gap 없음. 미묘 케이스 발견 시 여기에 추가해 추적한다.
const KNOWN_GAP = [];

test("must_block: 모든 명백한 대필 시도를 차단", () => {
  const missed = MUST_BLOCK.filter(([, d, q]) => !blocked(d, q)).map(([name]) => name);
  assert.deepEqual(missed, [], `차단 실패: ${missed.join(", ")}`);
});

test("must_pass: 정당한 코칭을 오차단하지 않음 (오차단 0)", () => {
  const wrong = MUST_PASS.filter(([, d, q]) => blocked(d, q ?? "q?")).map(([name]) => name);
  assert.deepEqual(wrong, [], `오차단: ${wrong.join(", ")}`);
});

test("known_gap: 휴리스틱 잔여 한계 현황 기록(실패 아님)", () => {
  const caught = KNOWN_GAP.filter(([, d, q]) => blocked(d, q ?? "q?")).map(([n]) => n);
  const slipped = KNOWN_GAP.filter(([, d, q]) => !blocked(d, q ?? "q?")).map(([n]) => n);
  const rate = ((MUST_BLOCK.length) / (MUST_BLOCK.length + slipped.length) * 100).toFixed(0);
  console.log(`[gen-block eval] must_block=${MUST_BLOCK.length} caught, must_pass=${MUST_PASS.length} clean, gap=${KNOWN_GAP.length} (caught=${caught.length}, slipped=[${slipped.join(", ")}])`);
  console.log(`[gen-block eval] v2 휴리스틱 — 콜론/질문칸 평서문/목록 단정형 승격. 명백+미묘 대필 차단율 ${rate}%, 오차단 0.`);
  assert.ok(true);
});
