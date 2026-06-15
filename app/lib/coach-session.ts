// EPIC 4 (세션/과정로그) — 한 번의 코칭 세션을 담는 **순수** 모델 (구현계획 T4.1).
//
// 모듈 경계: grading.ts·coach-schema.ts·revision.ts와 동일하게 **순수**다.
//   @anthropic-ai/sdk·server-only·fetch·next/*·DOM 미import. → FE·노드 테스트가 번들 없이 직접 import.
//   영속화(storage.ts 와이어링)는 후속 관심사 — 여기서는 in-memory 불변 모델만 다룬다.
//
// 채점(grading)이 "다 쓴 글 → 5영역 점수", 코치(coach-schema)가 "쓰는 중 → 문단별 nudge"라면,
// 세션은 "한 과제를 두고 학생이 고쳐쓰기 루프를 돈 전체 궤적"이다 → process-log.ts가 교사용 증거로 환원.
//
// 핵심 계약(전략 §4 불변식): 코치는 학생 문장을 대신 쓰지 않는다. 이 모델은 학생이 직접 쓴
//   draft 본문만 기록한다(draftHistory = 학생 저작 증거). 점수는 성장 막대용 내부 수치다.

import type { AreaName } from "../data/scoring";

// 한 과제의 메타(scoring.Assignment 의 코칭 세션용 부분집합 — target_char_count 미포함).
export type SessionAssignment = {
  school_level: string;
  subject: string;
  genre: string;
  prompt_text: string;
};

// 학생이 직접 쓴 draft 1회. n=1-based 회차, charCount=본문 글자 수(grading.charCount 동일 의미).
export type DraftEntry = {
  n: number;
  body: string;
  charCount: number;
};

// 한 영역을 손본 고쳐쓰기 1회의 흔적. before/after=해당 영역 성장 막대용 내부 점수.
export type NudgeEntry = {
  area: AreaName;
  paragraph_index: number;
  before: number;
  after: number;
};

export type AreaScore = { area: AreaName; score: number };

export type CoachSession = {
  assignment: SessionAssignment;
  rubricText?: string;
  draftHistory: DraftEntry[]; // [0]=최초 draft, 이후 고쳐쓰기마다 append
  nudgeHistory: NudgeEntry[]; // 영역별 손본 흔적(고쳐쓰기마다 append)
  areaScores: AreaScore[]; // 현재(최신) 5영역 점수
  baseline: AreaScore[]; // 최초 draft 시점 5영역 점수(불변 기준선)
};

// 본문 글자 수 — grading.charCount 와 동일 의미(코드포인트 단위). 순수 유지를 위해 grading 미import.
function countChars(s: string): number {
  return Array.from(s).length;
}

// 점수 배열 깊은 복제(불변 업데이트용).
function cloneScores(scores: AreaScore[]): AreaScore[] {
  return scores.map((s) => ({ area: s.area, score: s.score }));
}

// ── 세션 생성 ────────────────────────────────────────────────────────
//   최초 draft + 그 시점 5영역 점수로 세션을 연다. baseline 과 areaScores 는 같은 값에서 출발하되
//   서로 독립 배열(이후 areaScores 만 갱신, baseline 은 고정).
export function createSession(
  assignment: SessionAssignment,
  firstDraft: string,
  firstScores: AreaScore[],
  rubricText?: string,
): CoachSession {
  return {
    assignment: { ...assignment },
    ...(rubricText !== undefined ? { rubricText } : {}),
    draftHistory: [{ n: 1, body: firstDraft, charCount: countChars(firstDraft) }],
    nudgeHistory: [],
    baseline: cloneScores(firstScores),
    areaScores: cloneScores(firstScores),
  };
}

// ── 고쳐쓰기 기록 ─────────────────────────────────────────────────────
//   새 draft 본문 + 갱신된 5영역 점수 + 이번에 손본 영역(before/after)을 받아 **새 세션을 반환**한다.
//   원본 세션은 변형하지 않는다(불변). draftHistory·nudgeHistory 에 append, areaScores 교체.
export function recordRevision(
  session: CoachSession,
  newBody: string,
  newScores: AreaScore[],
  workedArea: AreaName,
  before: number,
  after: number,
): CoachSession {
  const nextN = session.draftHistory.length + 1;
  return {
    assignment: { ...session.assignment },
    ...(session.rubricText !== undefined ? { rubricText: session.rubricText } : {}),
    draftHistory: [
      ...session.draftHistory.map((d) => ({ ...d })),
      { n: nextN, body: newBody, charCount: countChars(newBody) },
    ],
    nudgeHistory: [
      // paragraph_index 는 recordRevision 시그니처에 없어 안정적 기본값 0. (문단 위치는 nudge 발생 시
      //   coach-schema 가 가진 정보 — 후속 와이어링에서 인자로 받도록 확장 가능. process-log 는 영역 빈도만 쓴다.)
      ...session.nudgeHistory.map((nu) => ({ ...nu })),
      { area: workedArea, paragraph_index: 0, before, after },
    ],
    baseline: cloneScores(session.baseline),
    areaScores: cloneScores(newScores),
  };
}

// ── 회차 카운트 ──────────────────────────────────────────────────────
//   고쳐쓰기 횟수 = 최초 draft 이후 추가된 draft 수 (draftHistory.length - 1). 최초만 있으면 0.
export function revisionCount(session: CoachSession): number {
  return Math.max(0, session.draftHistory.length - 1);
}
