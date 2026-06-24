// Pullim Writing Coach — 가이드 모드 정적 질문 풀 (물결1·2, 순수 모듈).
//   불변식: 질문은 '끌어내는 물음'만 — 답·예시·완성문장·연결어 템플릿 금지.
//   coach-schema.checkGenerationBlock 단위 테스트(scripts/guide-prompts.test.mjs)가 머지 게이트.
//   동적 서버 질문 생성은 다음 슬라이스(범위 외). 장르별 분기 활성(동적 서버 생성은 다음 슬라이스).

import type { AreaName } from "../data/samples";
import { AREAS, GENRES } from "./grading";

// Genre 타입: grading.ts GENRES 권위 기반(자체 enum 신설 금지).
type Genre = (typeof GENRES)[number];

export const GUIDE_QUESTIONS: Record<AreaName, readonly string[]> = {
  "과제 이해": [
    "이 과제가 너한테 묻는 핵심은 한마디로 뭐야?",
    "과제가 요구한 것 중에 아직 안 다룬 게 있을까?",
  ],
  "내용 충실도": [
    "그렇게 생각하는 이유를 하나만 더 댈 수 있어?",
    "읽는 사람이 '왜?'라고 물으면 뭐라고 답할래?",
  ],
  "구조·논리": [
    "이 문단과 다음 문단은 어떻게 이어진다고 보면 될까?",
    "가장 먼저 말하고 싶은 건 무엇이고, 마지막에 남길 건 뭐야?",
  ],
  "표현·문장": [
    "이 문장을 소리 내어 읽으면 어디서 숨이 막혀?",
    "같은 말을 네 식대로 다르게 표현하면 어떻게 될까?",
  ],
  "성장 가능성": [
    "딱 한 군데만 고친다면 어디를 손보고 싶어?",
    "지금 글에서 네가 제일 마음에 드는 부분은 어디야?",
  ],
};

// 장르별 오버라이드 맵. 빈 칸은 GUIDE_QUESTIONS default로 폴백(전 영역·전 장르 채울 필요 없음).
//   끌어내는 물음만 — 답·예시·완성문장·연결어 템플릿('먼저~그래서~') 금지, ? 종결.
export const GENRE_QUESTIONS: Partial<Record<Genre, Partial<Record<AreaName, readonly string[]>>>> =
  {
    "논설문·주장하는 글": {
      "과제 이해": ["이 글에서 네가 설득하려는 독자는 누구야?"],
      "내용 충실도": ["이 주장에 누군가 반대한다면 뭐라고 할 것 같아?"],
      "구조·논리": ["주장과 근거가 한 쌍을 이루는 곳은 어디야?"],
      "표현·문장": ["이 문장이 설득력 있게 들리려면 뭐가 더 있어야 할까?"],
      "성장 가능성": ["반론을 한 줄 더 넣는다면 어디에 넣을 것 같아?"],
    },
    "감상문·독후감": {
      "과제 이해": ["이 글에서 네가 가장 전하고 싶은 감정은 뭐야?"],
      "내용 충실도": ["어느 장면에서 마음이 제일 크게 움직였어?"],
      "구조·논리": ["감상의 흐름이 시간 순서야, 아니면 감정 순서야?"],
      "표현·문장": ["네 느낌을 설명하지 말고 보여줄 수 있는 장면이 있어?"],
      "성장 가능성": ["다시 읽었을 때 달라 보이는 부분이 있어?"],
    },
    보고서: {
      "과제 이해": ["이 보고서가 답하려는 질문은 딱 하나로 뭐야?"],
      "내용 충실도": ["이 내용 중 직접 확인한 사실과 네 의견은 어떻게 나뉘어?"],
      "구조·논리": ["출처를 밝혀야 할 문장이 있어?"],
      "표현·문장": ["숫자나 용어를 처음 보는 사람도 이해할 수 있어?"],
      "성장 가능성": ["더 찾아봐야 할 정보가 남아 있어?"],
    },
    요약문: {
      "과제 이해": ["원문에서 꼭 남겨야 할 핵심 문장은 뭐야?"],
      "내용 충실도": ["꼭 남겨야 할 한 문장과 빼도 되는 건 뭐야?"],
      "구조·논리": ["요약이 원문의 순서를 따랐어, 아니면 중요도 순서야?"],
      "표현·문장": ["원문 표현을 그대로 옮긴 곳이 있어?"],
      "성장 가능성": ["이 요약만 읽은 사람이 원문 핵심을 알 수 있을까?"],
    },
  };

// ──── 내부 헬퍼 ────────────────────────────────────────────────────────────────

const GENRE_SET: ReadonlySet<string> = new Set(GENRES);

/**
 * genre가 GENRES에 포함된 유효한 장르인지 판별.
 * 미지/빈문자열/"기타" → false → default 폴백.
 */
function isKnownGenre(genre: string): genre is Genre {
  return GENRE_SET.has(genre) && genre !== "기타";
}

/**
 * 영역별 첫 질문을 반환한다. genre 오버라이드 우선, 없으면 default 폴백.
 * 절대 throw 금지 — 미지/빈/기타 genre는 default 풀로 안전하게 폴백.
 */
function pick(genre: string, area: AreaName): string {
  if (isKnownGenre(genre)) {
    const override = GENRE_QUESTIONS[genre]?.[area]?.[0];
    if (override) return override;
  }
  return GUIDE_QUESTIONS[area][0];
}

// ──── 공개 API ─────────────────────────────────────────────────────────────────

/**
 * 영역당 1문항씩, AREAS 권위 순서로 반환.
 * 출력 계약 byte-stable: 항상 AREAS.length개, { area, question } 모양.
 * GuidePanel이 임의 문자열을 넘겨도 빈 패널·예외 없음.
 */
export function guideQuestionsFor(genre: string): { area: AreaName; question: string }[] {
  return AREAS.map((area) => ({ area, question: pick(genre, area) }));
}
