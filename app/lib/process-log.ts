// EPIC 4 (세션/과정로그) — CoachSession → 교사용 "과정 증거 로그" 환원 (구현계획 T4.2).
//
// 모듈 경계: **순수**다(@anthropic-ai/sdk·server-only·fetch·next/*·DOM 미import). FE·노드 테스트 직접 import.
//
// 목적(전략 §4): "학생이 직접 썼다"를 교사에게 증명한다. 코치는 진단·질문·발판만 주고 문장을 대신
//   쓰지 않으므로(coach-schema.checkGenerationBlock 불변식), 이 로그의 coachWroteSentences 는
//   **언제나 false**·authorIsStudent 는 **언제나 true** 다 — 제품 불변식. (런타임 분기로 바꾸지 말 것.)
//
// 막대 개념(revision.growthBar)과 일관: 화면엔 원점수 대신 baseline→final 개선 여부(improved)만 노출.

import type { AreaName } from "../data/scoring";
import type { CoachSession } from "./coach-session";
import { revisionCount } from "./coach-session";

// PASS 임계 — 한 영역이 이 점수(0~20)에 도달하면 "넘었다"로 본다. (grading 의 통과선과 동일 의미.)
export const PASS = 14;

// 같은 영역의 nudge 가 이 횟수 이상 반복됐는데도 PASS 를 못 넘으면 "막힌 영역"으로 표시.
export const STUCK_NUDGE_THRESHOLD = 2;

export type PerAreaLog = {
  area: AreaName;
  baseline: number;
  final: number;
  improved: boolean; // final > baseline (revision.growthBar.improved 와 동일 규칙)
};

export type ProcessLog = {
  revisions: number;
  finalCharCount: number;
  coachWroteSentences: false; // 제품 불변식: 코치는 문장을 대신 쓰지 않는다 → 항상 false
  authorIsStudent: true; // 제품 불변식: 저자는 학생 → 항상 true
  perArea: PerAreaLog[];
  stuckAreas: AreaName[]; // nudge 가 >=2회 떴는데도 PASS(14) 를 못 넘은 영역
};

// 영역명 → 점수 맵(없으면 0). baseline·areaScores 둘 다에 사용.
function scoreMap(scores: { area: AreaName; score: number }[]): Map<AreaName, number> {
  const m = new Map<AreaName, number>();
  for (const s of scores) m.set(s.area, s.score);
  return m;
}

// 영역별 nudge 발생 횟수.
function nudgeCounts(session: CoachSession): Map<AreaName, number> {
  const m = new Map<AreaName, number>();
  for (const n of session.nudgeHistory) {
    m.set(n.area, (m.get(n.area) ?? 0) + 1);
  }
  return m;
}

// ── 과정 로그 환원 ───────────────────────────────────────────────────
//   세션의 baseline(최초) 과 areaScores(최신) 를 영역 기준선·최종으로 묶고, 개선 여부·막힌 영역을 산출.
//   perArea 순서는 baseline 순서(= 서버가 보장한 AREAS 순서)를 따른다.
export function buildProcessLog(session: CoachSession): ProcessLog {
  const baseMap = scoreMap(session.baseline);
  const finalMap = scoreMap(session.areaScores);
  const counts = nudgeCounts(session);

  const perArea: PerAreaLog[] = session.baseline.map((b) => {
    const baseline = b.score;
    const final = finalMap.get(b.area) ?? baseline;
    return { area: b.area, baseline, final, improved: final > baseline };
  });

  // 막힌 영역: nudge 가 임계 이상 반복됐는데도 최종 점수가 PASS 미만.
  const stuckAreas: AreaName[] = [];
  for (const [area, count] of counts) {
    if (count < STUCK_NUDGE_THRESHOLD) continue;
    const final = finalMap.get(area) ?? baseMap.get(area) ?? 0;
    if (final < PASS) stuckAreas.push(area);
  }

  const lastDraft = session.draftHistory[session.draftHistory.length - 1];

  return {
    revisions: revisionCount(session),
    finalCharCount: lastDraft ? lastDraft.charCount : 0,
    coachWroteSentences: false,
    authorIsStudent: true,
    perArea,
    stuckAreas,
  };
}
