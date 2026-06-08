// Pullim Writing Coach — quick-win 우선순위 순수 모듈 (구현계획 T1.4 / docs/25)
//
// 모듈 경계: 순수. 코치는 "한 호흡에 한 nudge"만 띄우므로(킥 UX), 여러 후보 중 무엇을 먼저 띄울지 정한다.
// ⚠️ DECISION NEEDED(docs/24 §3): "고치기 쉬움" 추정. MVP=내부 area 점수 휴리스틱(room) 1차 +
//    모델 quick_win_rank 힌트 동점 처리. 모델 기반 난이도 추정은 v2 후보.

import type { AreaName } from "../data/samples";
import type { CoachAreaScore, CoachNudge } from "./coach-schema";

// area 점수 조회. 없으면 20(=room 0)으로 취급해 후순위로 민다.
function scoreOf(area: AreaName, areaScores: CoachAreaScore[]): number {
  const hit = areaScores.find((s) => s.area === area);
  return hit ? hit.score : 20;
}

// 우선순위 정렬(새 배열). 1차: room 큰 순(=점수 낮은 순). 동점: quick_win_rank 낮은 순. 안정 정렬.
export function prioritizeNudges(
  nudges: CoachNudge[],
  areaScores: CoachAreaScore[],
): CoachNudge[] {
  return [...nudges].sort((a, b) => {
    const roomA = 20 - scoreOf(a.rubric_area, areaScores);
    const roomB = 20 - scoreOf(b.rubric_area, areaScores);
    if (roomA !== roomB) return roomB - roomA; // room 큰 것 먼저
    return a.quick_win_rank - b.quick_win_rank; // 동점 → 모델 힌트
  });
}

// 지금 띄울 1순위 하나. 없으면 null.
export function topNudge(
  nudges: CoachNudge[],
  areaScores: CoachAreaScore[],
): CoachNudge | null {
  return prioritizeNudges(nudges, areaScores)[0] ?? null;
}
