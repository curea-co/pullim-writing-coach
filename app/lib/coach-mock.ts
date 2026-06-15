// Pullim Writing Coach — 코치 MOCK 휴리스틱 (EPIC2 T2.2 / docs/27 결정적 코치)
//
// 목적: ANTHROPIC_API_KEY가 없거나 COACH_MOCK=1일 때, 모델 호출 없이도 /api/coach가 유효한
//   CoachOutput을 반환하도록 docs/27_coach_prototype.html의 결정적 휴리스틱(analyze + nudge 생성)을
//   **서버에서 순수 함수로 재구현**한다. 데모·로컬·테스트에서 키 없이 코치 UX 전체가 작동한다.
//
// 모듈 경계(09 §4.2 / S4): 이 파일은 **순수**다. @anthropic-ai/sdk·server-only·fetch·next/* 미import.
//   → route.ts(부수효과)가 이 함수를 호출하고, 단위 테스트(scripts/coach-mock.test.mjs)가 직접 import.
//
// 불변식: mock 출력도 진단·유도질문만 — 학생 문장을 대신 쓰지 않는다. (NUDGES 카피는 docs/27 원본 그대로,
//   대필 어구·완성문장 인용 없음 → checkGenerationBlock 통과.) route는 mock 경로에도 동일 가드를 건다.

import type { AreaName } from "../data/scoring";
import { AREAS } from "./grading";
import type { CoachAreaScore, CoachNudge, CoachOutput } from "./coach-schema";
import { splitParagraphs } from "./paragraphs";

// docs/27: PASS 미만 + nudge 가능 영역만 코칭. '성장 가능성'은 메타 영역이라 직접 nudge하지 않는다.
const PASS = 14;
const NUDGEABLE: readonly AreaName[] = ["과제 이해", "내용 충실도", "구조·논리", "표현·문장"];

const clampScore = (x: number): number => Math.max(0, Math.min(20, Math.round(x)));
const cc = (s: string): number => Array.from(s).length;

// 영역별 nudge 카피 — docs/27 NUDGES 원본(진단 + 끌어내는 질문). 대필 신호 없음.
//   guiding_question의 <b> 태그는 제거하고 평문으로 둔다(API 응답은 마크업 비포함).
const NUDGES: Record<AreaName, { diagnosis: string; guiding_question: string }> = {
  "과제 이해": {
    diagnosis: "과제가 요구한 조건 중 아직 약하게 다룬 부분이 있어요.",
    guiding_question: "과제가 묻는 것 중 지금 약한 쪽을 한 문장이라도 더 넣어 볼까요?",
  },
  "내용 충실도": {
    diagnosis: "주장은 있는데 그것을 받쳐 줄 근거가 부족해요.",
    guiding_question: "왜 그런지, 네가 아는 사실이나 예를 하나만 떠올려 볼까요?",
  },
  "구조·논리": {
    diagnosis: "문장이 뚝뚝 끊겨 매끄럽게 이어지지 않아요.",
    guiding_question: "'먼저 ~, 그래서 ~, 따라서 ~'처럼 이어 주는 말을 넣어 볼까요?",
  },
  "표현·문장": {
    diagnosis: "비슷하게 짧은 문장만 반복돼요.",
    guiding_question: "한 문장은 길게, 한 문장은 짧게 — 문장 호흡을 바꿔 볼까요?",
  },
  "성장 가능성": {
    diagnosis: "약점이 한두 곳에 모여 있어 다음 수정 지점을 잡기 좋아요.",
    guiding_question: "가장 먼저 고치고 싶은 한 곳을 골라 볼까요?",
  },
};

// ════════════════════════════════════════════════════════════════════
// analyze — docs/27 analyze() 결정적 이식. body 전체를 보고 5영역 0~20 산출.
//   장르·과제문은 신호로 활용하지 않고(프로토타입과 동일) 본문 표면 특징만 본다(MVP).
//   AREAS 순서를 고정 반환 → validateCoachOutput의 순서 검증 통과.
// ════════════════════════════════════════════════════════════════════
export function analyzeBody(body: string): CoachAreaScore[] {
  const t = (typeof body === "string" ? body : "").trim();
  const len = cc(t);
  const paras = t
    .split(/\n{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
  const sents = t
    .split(/[.!?。…\n]+/)
    .map((s) => s.trim())
    .filter((s) => cc(s) > 1);
  const count = (re: RegExp): number => (t.match(re) || []).length;

  const evidence = count(/예를 들어|예컨대|실제로|왜냐하면|때문|통계|첫째|둘째|가령|[0-9]{2,}/g);
  const connect = count(/그러나|하지만|따라서|그래서|먼저|또한|결론적으로|반면|마지막으로|예를 들어/g);
  const hasProcess = /형성|만들어|분출|생겨|마그마|쌓여|과정|단계|이루어/.test(t);
  const hasImpact = /영향|피해|도움|이로움|혜택|삶|생활|이용|관광|온천|농사|토양|에너지|재산|인명/.test(t);
  const lens = sents.map(cc);
  const variety =
    lens.length >= 3 && Math.max(...lens) - Math.min(...lens) >= 12 ? 7 : lens.length >= 3 ? 3 : 1;

  const scoreByArea: Record<AreaName, number> = {
    "과제 이해": clampScore(6 + (hasProcess ? 4 : 0) + (hasImpact ? 6 : 0) + (len > 150 ? 4 : 0)),
    "내용 충실도": clampScore(5 + Math.min(evidence * 4, 11) + (len > 170 ? 4 : 0)),
    "구조·논리": clampScore(5 + Math.min(paras.length * 3, 6) + Math.min(connect * 2, 9)),
    "표현·문장": clampScore(8 + variety + (sents.length >= 4 ? 2 : 0)),
    "성장 가능성": clampScore(8 + (len > 200 ? 3 : 0) + (evidence > 0 && connect > 0 ? 3 : 0)),
  };

  // AREAS 순서 고정 (스키마 검증의 권위 기준).
  return AREAS.map((area) => ({ area, score: scoreByArea[area] }));
}

// nudge가 가리킬 문단 추정: 본문을 문단으로 쪼개고, 영역별로 "가장 관련 있어 보이는" 문단을 고른다.
//   - 내용 충실도: 근거 신호가 가장 적은(=빈약한) 문단. 구조·논리: 이어 주는 말이 없는 첫 문단.
//   - 그 외/단일 문단: 0. 결정적(동률은 앞 문단 우선).
function pickParagraphIndex(area: AreaName, paras: { index: number; text: string }[]): number {
  if (paras.length <= 1) return 0;
  if (area === "내용 충실도") {
    const ev = (s: string) =>
      (s.match(/예를 들어|예컨대|실제로|왜냐하면|때문|통계|첫째|둘째|가령|[0-9]{2,}/g) || []).length;
    let best = paras[0];
    for (const p of paras) if (ev(p.text) < ev(best.text)) best = p;
    return best.index;
  }
  if (area === "구조·논리") {
    const conn = /그러나|하지만|따라서|그래서|먼저|또한|결론적으로|반면|마지막으로/;
    const hit = paras.find((p) => !conn.test(p.text));
    return hit ? hit.index : paras[0].index;
  }
  return 0;
}

// ════════════════════════════════════════════════════════════════════
// runCoachMock — analyze + nudge 생성으로 유효한 CoachOutput을 결정적으로 만든다.
//   PASS(14) 미만 NUDGEABLE 영역마다 nudge 1개. quick_win_rank=점수 낮은 순(1=먼저).
//   약점이 하나도 없으면(전 영역 통과) 빈 nudges로 반환 — 코치가 "더 손댈 곳 없음"을 표현.
// ════════════════════════════════════════════════════════════════════
export function runCoachMock(body: string): CoachOutput {
  const area_scores = analyzeBody(body);
  const paras = splitParagraphs(body);

  const weak = NUDGEABLE.map((area) => {
    const hit = area_scores.find((s) => s.area === area);
    return { area, score: hit ? hit.score : 20 };
  })
    .filter((w) => w.score < PASS)
    .sort((a, b) => a.score - b.score); // 점수 낮은 순 = 향상 폭 큰 순

  const nudges: CoachNudge[] = weak.map((w, rank) => {
    const copy = NUDGES[w.area];
    return {
      paragraph_index: pickParagraphIndex(w.area, paras),
      rubric_area: w.area,
      diagnosis: copy.diagnosis,
      guiding_question: copy.guiding_question,
      quick_win_rank: rank + 1, // 1=먼저
    };
  });

  return { area_scores, nudges };
}
