// Pullim Writing Coach — 과정 코치 출력 순수 모듈 (구현계획 T1.1·T1.2 / docs/25)
//
// 모듈 경계: grading.ts와 동일하게 **순수**다. @anthropic-ai/sdk·server-only·fetch·next/* 미import.
//   → FE·노드 테스트(scripts/coach-schema.test.mjs)가 번들 없이 직접 import. 모델 호출은
//     app/api/coach/route.ts(예정)가 전담한다. 주니어(초등) 글쓰기 모드가 이 검증을 공유한다.
//
// 채점(grading.ts)이 "다 쓴 글 → 5영역 점수"라면, 코치는 "쓰는 중 → 문단별 nudge(진단+유도질문)".
// 핵심 불변식: 코치 출력은 진단·질문·발판만 — 학생 문장을 대신 쓰지 않는다(checkGenerationBlock).

import type { AreaName } from "../data/samples";
import { AREAS } from "./grading";

// 재점검 1회의 코치 출력. area_scores=성장 막대용(내부 수치, 화면엔 막대만), nudges=후보 nudge들.
export type CoachAreaScore = { area: AreaName; score: number };

export type CoachNudge = {
  paragraph_index: number; // 0-based, nudge가 가리키는 문단
  rubric_area: AreaName; // 5영역 중 하나
  diagnosis: string; // 무엇이 약한지 (대안 문장 X)
  guiding_question: string; // 끌어내는 질문 (대필 X)
  quick_win_rank: number; // 모델이 매긴 우선순위 힌트 (1=먼저)
};

export type CoachOutput = {
  area_scores: CoachAreaScore[];
  nudges: CoachNudge[];
};

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isNonEmptyString(v: unknown): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

// ════════════════════════════════════════════════════════════════════
// 스키마 검증 (grading.validateOutput 패턴) — 위반 목록 반환(빈 배열 = 통과).
// ════════════════════════════════════════════════════════════════════
export function validateCoachOutput(o: unknown): string[] {
  const errs: string[] = [];
  if (!isObject(o)) return ["출력이 객체가 아님"];

  const scores = o.area_scores;
  if (!Array.isArray(scores) || scores.length !== 5) {
    errs.push("area_scores 5개 아님");
  } else {
    scores.forEach((s: unknown, i: number) => {
      if (!isObject(s)) {
        errs.push(`area_scores[${i}] 객체 아님`);
        return;
      }
      if (s.area !== AREAS[i]) errs.push(`area 순서 오류 [${i}] ${String(s.area)}`);
      if (typeof s.score !== "number" || s.score < 0 || s.score > 20)
        errs.push(`score 범위 [${i}]`);
    });
  }

  const nudges = o.nudges;
  if (!Array.isArray(nudges)) {
    errs.push("nudges 배열 아님");
  } else {
    nudges.forEach((n: unknown, i: number) => {
      if (!isObject(n)) {
        errs.push(`nudges[${i}] 객체 아님`);
        return;
      }
      if (
        typeof n.paragraph_index !== "number" ||
        !Number.isInteger(n.paragraph_index) ||
        n.paragraph_index < 0
      )
        errs.push(`paragraph_index 비정수/음수 [${i}]`);
      if (!(AREAS as readonly string[]).includes(n.rubric_area as string))
        errs.push(`rubric_area 5영역 아님 [${i}]`);
      if (!isNonEmptyString(n.diagnosis)) errs.push(`diagnosis 빈값 [${i}]`);
      if (!isNonEmptyString(n.guiding_question)) errs.push(`guiding_question 빈값 [${i}]`);
      if (typeof n.quick_win_rank !== "number") errs.push(`quick_win_rank 비숫자 [${i}]`);
    });
  }

  return errs;
}

// ════════════════════════════════════════════════════════════════════
// 생성 차단 가드 (T1.2) — 코치가 "학생 문장을 대신 써주는" 출력을 결정적으로 잡아낸다.
//   불변식(전략 §4): 코치 출력은 진단·질문·발판만. 무너지면 ChatGPT와 동일 → 교사 인정·자유 사용 붕괴.
//   호출부(/api/coach)는 위반 시 채점 가드와 달리 **권위적으로** 처리한다(재호출→그래도 위반이면 에러,
//   생성 문장 누출 금지). 텍스트 분석만 하는 순수 함수 — 주니어 공유·단위테스트 직접 import.
// ════════════════════════════════════════════════════════════════════

// 대필 지시 어구 + 예시 제공 라벨(내용을 떠먹여주는 신호). R1 eval로 보강.
//   "이렇게 써 / 다음과 같이 작성 / …라고 쓰면 / 예시문장 / 예문 / 추천 문장·표현 / 모범 답안·문장·글 /
//    이런 식으로 써 / 대신 써". (단순 "고쳐 써"·"써 볼래" 같은 발판은 내용을 안 주므로 제외 — 오차단 방지.)
const WRITE_DIRECTIVE =
  /이렇게\s*(써|쓰|적|작성)|다음과\s*같이\s*(써|쓰|적|작성)|라고\s*(써|쓰|적)|예시\s*문장|예문|추천\s*(문장|표현)|모범\s*(답안|문장|글)|이런\s*식으로\s*(써|적)|대신\s*(써|작성)/;

// 인용부호 종류(ASCII·스마트·낫표·겹낫표)
const QUOTE_CHARS = "'\"‘’“”「」『』";
// 붙여넣기용 완성문장 신호: 인용 안 내용이 15자 이상이고 문장부호 또는 한국어 종결어미로 끝남.
//   짧은 학생 단어 인용(<15자)은 영향 없음. (다/요/죠/까/라/자/네/군/음 = 흔한 종결)
const LONG_QUOTE = new RegExp(`[${QUOTE_CHARS}]([^${QUOTE_CHARS}]{15,})[${QUOTE_CHARS}]`, "g");
const SENTENCE_END = /([.!?。…]|[다요죠까라자네군음])$/;

// 한 nudge(진단+유도질문)에 대필 신호가 있으면 위반. 위반 메시지는 nudge 인덱스를 포함.
export function checkGenerationBlock(o: CoachOutput): string[] {
  const v: string[] = [];
  const nudges = isObject(o as unknown) ? (o.nudges ?? []) : [];
  (Array.isArray(nudges) ? nudges : []).forEach((n, i) => {
    if (!isObject(n as unknown)) return;
    const text = `${typeof n.diagnosis === "string" ? n.diagnosis : ""} ${
      typeof n.guiding_question === "string" ? n.guiding_question : ""
    }`;
    if (WRITE_DIRECTIVE.test(text)) {
      v.push(`[${i}] 대필 지시 감지`);
      return;
    }
    for (const m of text.matchAll(LONG_QUOTE)) {
      if (SENTENCE_END.test(m[1].trim())) {
        v.push(`[${i}] 완성문장 인용(대필) 감지`);
        break;
      }
    }
  });
  return v;
}

// 코치 출력 후처리 가드 집계. 현재는 생성 차단 단일 — 확장 지점.
export function runCoachGuards(o: CoachOutput): string[] {
  return checkGenerationBlock(o);
}
