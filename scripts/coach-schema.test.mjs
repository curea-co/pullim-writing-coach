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

// ── 학생 자기 문장 echo 면제(2026-07-12 실사용 발견) ────────────────────
//   코치가 학생이 이미 쓴 문장을 그대로 인용해 되짚어 묻는 것은 정당한 코칭이다(대필 아님).
//   studentDraft를 넘기면 그 원고에 실제로 있는 인용만 (2) 긴 인용 가드에서 면제한다.

test("긴 인용이 studentDraft에 그대로 있으면(echo) → 위반 아님", () => {
  const o = validOutput();
  const sentence = "학생들이 자신의 개성을 표현할 수 있기 때문이다.";
  o.nudges[0].guiding_question = `네가 쓴 '${sentence}'에서, 왜 그런지 예를 들어볼까?`;
  const draft = `나는 교복 자율화에 찬성한다. ${sentence} 또한 편하다.`;
  assert.deepEqual(checkGenerationBlock(o, draft), []);
});

test("긴 인용이 studentDraft에 없으면(모델이 지어낸 문장) → 여전히 위반", () => {
  const o = validOutput();
  o.nudges[0].guiding_question = "예를 들어 '화산 폭발은 인명과 재산에 큰 피해를 준다.' 어때?";
  const draft = "화산은 위험한 자연 현상이다. 그래서 조심해야 한다.";
  assert.ok(checkGenerationBlock(o, draft).length > 0);
});

test("studentDraft 미전달 시 기존 동작과 동일(하위 호환) — 긴 인용은 여전히 위반", () => {
  const o = validOutput();
  o.nudges[0].guiding_question = "예를 들어 '화산 폭발은 인명과 재산에 큰 피해를 준다.' 어때?";
  assert.ok(checkGenerationBlock(o).length > 0);
});

test("echo 면제는 공백 차이를 무시한다(줄바꿈·띄어쓰기 달라도 동일 문장이면 면제)", () => {
  const o = validOutput();
  const sentence = "학생들이 자신의 개성을 표현할 수 있기 때문이다.";
  o.nudges[0].guiding_question = `네가 쓴 '${sentence}'에서, 왜 그런지 예를 들어볼까?`;
  // 문장 경계(\n)는 실제 문장 사이에만 — 문장 내부 줄바꿈은 현실적이지 않은 케이스라 순수 공백
  //   차이(스페이스 2~3개)만으로 오탐/누락 무시를 검증한다(Codex #155 6R: \n은 이제 문장 경계로도
  //   쓰이므로, 문장 내부에 \n을 넣으면 그 자체가 경계로 오인돼 echo 매칭이 끊긴다).
  const draft = "나는 교복 자율화에 찬성한다.\n학생들이  자신의   개성을   표현할 수 있기 때문이다. 또한 편하다.";
  assert.deepEqual(checkGenerationBlock(o, draft), []);
});

// Codex #155 — 부분 문자열 포함만으로는 두 문장에 걸친/문장 중간에서 잘라낸 조각도 통과하던 구멍.
test("echo 면제는 문장 경계에서만 인정 — 두 문장에 걸친 15자+ 조각은 여전히 차단", () => {
  const o = validOutput();
  // draft: "...하기 때문이다. 그리고 나는..." — 아래 인용은 앞문장 꼬리+뒷문장 머리를 가로지른다.
  const draft = "학생들이 자신의 개성을 표현할 수 있기 때문이다. 그리고 나는 편한 것도 좋아한다.";
  const crossSentenceFragment = "때문이다. 그리고 나는 편한 것도 좋아한다."; // 문장 중간(때문이다 앞)에서 시작 — 경계 아님
  o.nudges[0].guiding_question = `'${crossSentenceFragment}' 이 부분은 어때?`;
  assert.ok(checkGenerationBlock(o, draft).length > 0);
});

test("echo 면제는 문장 경계에서만 인정 — 문장 중간에서 잘라낸 조각(문두 아님)은 차단", () => {
  const o = validOutput();
  const draft = "나는 교복 자율화에 찬성한다. 학생들이 자신의 개성을 표현할 수 있기 때문이다.";
  const midSentenceFragment = "개성을 표현할 수 있기 때문이다."; // 문장 중간부터 시작 — 문두/마침표 직후 아님
  o.nudges[0].guiding_question = `'${midSentenceFragment}' 부분을 더 설명해볼까?`;
  assert.ok(checkGenerationBlock(o, draft).length > 0);
});

// Codex #155 2R — 시작 경계만 보면 문두에서 시작해 여러 문장을 통째로 이어 붙인 인용도 통과하던 구멍.
test("echo 면제는 정확히 한 문장만 — 문두에서 시작해도 두 문장을 이어 붙인 인용은 차단", () => {
  const o = validOutput();
  const draft = "나는 교복 자율화에 찬성한다. 학생들이 자신의 개성을 표현할 수 있기 때문이다. 또한 편하다.";
  // 문두에서 시작하지만 첫 문장 마침표를 넘어 두 번째 문장까지 통째로 인용 — 단일 문장 echo 아님.
  const twoSentences = "나는 교복 자율화에 찬성한다. 학생들이 자신의 개성을 표현할 수 있기 때문이다.";
  o.nudges[0].guiding_question = `'${twoSentences}' 이 부분 좋아. 더 확장해볼까?`;
  assert.ok(checkGenerationBlock(o, draft).length > 0);
});

// Codex #155 3R — "다"는 종결어미와 "다고"(인용격 조사) 양쪽에 다 나타난다. 시작 경계만 확인하면
//   "…위험하다고 생각한다"에서 "다"까지만 잘라 "위험하다"를 인용해도(SENTENCE_END는 "다"로 끝나면
//   통과) 문두/마침표 직후 조건만으로 echo로 오인된다 — 실제로는 문장 끝이 아니라 "다고"의 앞부분뿐.
test("echo 면제는 어미 종결도 실제 문장 끝인지 확인 — '다고'처럼 이어지는 접두 인용은 차단", () => {
  const o = validOutput();
  const draft = "나는 화산 폭발이 인간에게 정말로 위험하다고 항상 생각해왔다.";
  // draft에서 "다" 뒤에 "고"가 이어지므로 실제 문장 끝이 아니다(인용격 조사 "다고"의 일부).
  const prefixOnly = "화산 폭발이 인간에게 정말로 위험하다";
  o.nudges[0].guiding_question = `'${prefixOnly}'는 좋은 생각이야. 왜 그렇게 느꼈어?`;
  assert.ok(checkGenerationBlock(o, draft).length > 0);
});

test("echo 면제(어미 종결) 정상 케이스 — 인용 뒤 원고가 실제로 끝나면 면제", () => {
  const o = validOutput();
  const draft = "나는 화산 폭발이 인간에게 정말로 위험하다";
  o.nudges[0].guiding_question = `'${draft}'는 좋은 생각이야. 왜 그렇게 느꼈어?`;
  assert.deepEqual(checkGenerationBlock(o, draft), []);
});

// Codex #155 4R — echo 면제는 "되짚어 묻기"에만 한정돼야 한다. 검증된 verbatim echo라도 재작성
//   지시("다시 써 보자" 등)가 붙으면 기계적 복붙/재작성 유도라 면제하지 않는다.
test("echo 검증 통과해도 '다시 써 보자' 재작성 지시가 있으면 여전히 차단", () => {
  const o = validOutput();
  const sentence = "학생들이 자신의 개성을 표현할 수 있기 때문이다.";
  const draft = `나는 교복 자율화에 찬성한다. ${sentence} 또한 편하다.`;
  o.nudges[0].guiding_question = `네가 쓴 '${sentence}'를 첫 문단에 다시 써 보자.`;
  assert.ok(checkGenerationBlock(o, draft).length > 0);
});

test("echo 검증 통과해도 '그대로 옮겨' 재작성 지시가 있으면 여전히 차단", () => {
  const o = validOutput();
  const sentence = "학생들이 자신의 개성을 표현할 수 있기 때문이다.";
  const draft = `나는 교복 자율화에 찬성한다. ${sentence} 또한 편하다.`;
  o.nudges[0].diagnosis = `이 문장 '${sentence}'을 결론에 그대로 옮겨 적어보자.`;
  assert.ok(checkGenerationBlock(o, draft).length > 0);
});

// Codex #155 5R — 재작성 지시 판정을 인용 직후 지역 문맥으로 좁혀야 한다. text 전체에 걸면 인용과
//   무관한 다른 문장의 일반 코칭 표현("마지막 표현은 고쳐 보자")에도 걸려 정상 echo가 다시 막힌다.
test("재작성 지시가 인용과 무관한 다른 문장에 있으면 echo 면제 유지(오탐 아님)", () => {
  const o = validOutput();
  const sentence = "학생들이 자신의 개성을 표현할 수 있기 때문이다.";
  const draft = `나는 교복 자율화에 찬성한다. ${sentence} 또한 편하다.`;
  o.nudges[0].diagnosis = "마지막 표현은 고쳐 보자.";
  o.nudges[0].guiding_question = `네가 쓴 '${sentence}'에서, 왜 그런지 예를 들어볼까?`;
  assert.deepEqual(checkGenerationBlock(o, draft), []);
});

// Codex #155 6R (1/2) — 마침표 없이 줄바꿈만으로 문장을 구분하는 흔한 초안에서도 echo가 인정돼야 한다.
test("echo 면제 — 마침표 없이 줄바꿈으로만 구분된 원고에서도 문장 경계 인정", () => {
  const o = validOutput();
  const sentence = "학생들이 자신의 개성을 표현할 수 있기 때문이다";
  const draft = `나는 찬성한다\n${sentence}`;
  o.nudges[0].guiding_question = `네가 쓴 '${sentence}'에서, 왜 그런지 예를 들어볼까?`;
  assert.deepEqual(checkGenerationBlock(o, draft), []);
});

// Codex #155 6R (2/2) — 고정된 짧은 윈도우는 위치/설명 문구를 늘려 지시어를 창 밖으로 밀어내는
//   우회가 가능했다. 다음 인용(또는 text 끝)까지 전 구간을 봐야 실제로 막힌다.
test("echo 검증 통과해도 재작성 지시가 인용 뒤 멀리 있어도(같은 인용 구간) 여전히 차단", () => {
  const o = validOutput();
  const sentence = "학생들이 자신의 개성을 표현할 수 있기 때문이다.";
  const draft = `나는 교복 자율화에 찬성한다. ${sentence} 또한 편하다.`;
  o.nudges[0].guiding_question =
    `네가 쓴 '${sentence}' 이 문장을 마지막 문단의 핵심 근거 문장으로 한 번 더 자연스럽게 다시 써 보자.`;
  assert.ok(checkGenerationBlock(o, draft).length > 0);
});

// Codex #155 7R — 재작성 지시가 인용 뒤가 아니라 **앞**에 자연스러운 어순으로 올 수도 있다
//   ("결론에 다시 써 봐: '…'"). 뒤쪽만 보면 이런 어순은 놓친다 — 앞쪽도 같은 문장/절 범위로 검사해야 한다.
test("재작성 지시가 인용 앞(같은 절)에 있어도 여전히 차단", () => {
  const o = validOutput();
  const sentence = "학생들이 자신의 개성을 표현할 수 있기 때문이다.";
  const draft = `나는 교복 자율화에 찬성한다. ${sentence} 또한 편하다.`;
  o.nudges[0].guiding_question = `결론에 다시 써 봐: '${sentence}'`;
  assert.ok(checkGenerationBlock(o, draft).length > 0);
});

// 대칭 확인 — 인용 앞의 재작성 지시가 "다른 문장"(문장 경계 너머)에 있으면 무관하므로 면제 유지.
test("재작성 지시가 인용 앞의 다른 문장(문장 경계 너머)에 있으면 echo 면제 유지(오탐 아님)", () => {
  const o = validOutput();
  const sentence = "학생들이 자신의 개성을 표현할 수 있기 때문이다.";
  const draft = `나는 교복 자율화에 찬성한다. ${sentence} 또한 편하다.`;
  o.nudges[0].diagnosis = "이 부분은 나중에 다시 써 보자.";
  o.nudges[0].guiding_question = `네가 쓴 '${sentence}'에서, 왜 그런지 예를 들어볼까?`;
  assert.deepEqual(checkGenerationBlock(o, draft), []);
});

// Codex #155 8R — diagnosis+question을 합쳐 지역 윈도우를 계산하면, diagnosis가 문장부호 없이
//   끝나는 흔한 경우(마침표 생략) 필드 경계가 사라져 diagnosis의 무관한 "다시 써 보자"가 question의
//   정상 echo까지 재작성 지시로 오염시킬 수 있었다. 필드별 완전 격리로 문장부호 유무와 무관하게 안전.
test("diagnosis가 마침표 없이 끝나도(필드 경계 모호) question의 정상 echo는 면제 유지(8R 오탐 방지)", () => {
  const o = validOutput();
  const sentence = "학생들이 자신의 개성을 표현할 수 있기 때문이다.";
  const draft = `나는 교복 자율화에 찬성한다. ${sentence} 또한 편하다.`;
  o.nudges[0].diagnosis = "이 부분은 나중에 다시 써 보자"; // 마침표 없음 — 필드 경계 신호 없음
  o.nudges[0].guiding_question = `네가 쓴 '${sentence}'에서, 왜 그런지 예를 들어볼까?`;
  assert.deepEqual(checkGenerationBlock(o, draft), []);
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
