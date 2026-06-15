// Pullim Writing Coach — 점수 안정화 순수 모듈 (성장 막대 정직성).
//
// 문제: /api/coach는 재점검(recheck)마다 글 전체를 0~20으로 다시 채점한다. 모델 채점은
//   결정적이지 않아, 학생이 건드리지 않은 영역도 회차마다 ±몇 점씩 출렁이고(jitter),
//   방금 고친 영역이 노이즈로 오히려 떨어지기도 한다. 이대로 막대(revision.growthBar)에
//   쓰면 "성장 막대"가 손대지도 않은 곳의 가짜 등락·가짜 후퇴를 보여준다 — 막대가 거짓말한다.
//
// 해결: 회차 사이에 점수를 안정화한다. 손댄 영역은 진짜 성장을 반영하되 후퇴는 막고(floor),
//   손 안 댄 영역은 소음을 억제하고 절대 노이즈로 떨어뜨리지 않는다.
//
// 모듈 경계: grading.ts·coach-schema.ts와 동일하게 **순수**다. Date·DOM·fetch·next/* 미사용.
//   FE(CoachClient) import + node:test(scripts/coach-stability.test.mjs) 직접 import.

import type { AreaName } from "../data/scoring";

// 노이즈 임계값(0~20 스케일). next가 prev에서 이 값 미만으로 바뀌면 손 안 댄 영역의
//   변동은 "소음"으로 보고 무시한다(prev 유지). 이 값 이상이면 진짜 변화로 보고 반영(상승만).
//   3/20 = 15% — 모델 재채점의 통상 흔들림 폭을 덮으면서, 한 칸(보통 2~4점)짜리 진짜
//   개선은 통과시키도록 보수적으로 고정.
export const NOISE_THRESHOLD = 3;

// 안정화 규칙(회차 사이 1회 적용):
//   • 첫 호출(prev=null): 기준선이 없으므로 next 그대로 반환(이후 회차의 비교 기준이 된다).
//   • 손댄 영역(workedArea): 진짜 변화는 반영하되 prev에서 floor한다.
//       - next >= prev → next 채택(상승·동결 그대로 — 진짜 성장 반영).
//       - next <  prev → prev 유지(방금 고친 곳의 모델-노이즈 하락을 가짜 후퇴로 보여주지 않음).
//     ⇒ 손댄 영역은 단조 비감소가 보장된다(막대가 뒤로 가지 않는다).
//   • 손 안 댄 영역: 학생이 건드리지 않았다.
//       - |next - prev| < NOISE_THRESHOLD → 소음 → prev 유지(jitter 억제).
//       - next - prev >= NOISE_THRESHOLD → 진짜 상승 → next 채택(다른 곳을 고치다 같이 좋아짐 허용).
//       - prev - next >= NOISE_THRESHOLD(큰 하락) → 그래도 손 안 댄 곳은 떨어뜨리지 않는다 →
//         prev 유지(floor). 학생이 안 만진 영역이 후퇴로 보이면 안 되므로, 소음이든 큰 폭이든
//         하락은 일절 반영하지 않는다.
//     ⇒ 손 안 댄 영역은 상승만 가능하고 절대 내려가지 않는다.
//
// 입력에 있는 영역만 결과에 담는다(AREAS 가정 없이 next 키 집합 기준). prev에만 있고 next에
//   없는 영역은 이번 회차에 채점되지 않은 것으로 보고 결과에 포함하지 않는다.
export function stabilizeScores(
  prev: Record<AreaName, number> | null,
  next: Record<AreaName, number>,
  workedArea: AreaName | null,
): Record<AreaName, number> {
  // 첫 호출 — 비교 기준이 없으니 next를 그대로(얕은 복제) 반환.
  if (prev === null) {
    return { ...next };
  }

  const out = {} as Record<AreaName, number>;
  for (const key of Object.keys(next) as AreaName[]) {
    const nextVal = next[key];
    const prevVal = prev[key];

    // prev에 없던 영역(신규 키) → 비교 불가, next 그대로.
    if (typeof prevVal !== "number") {
      out[key] = nextVal;
      continue;
    }

    if (key === workedArea) {
      // 손댄 영역: prev에서 floor(상승·동결만 반영, 하락은 막음).
      out[key] = nextVal >= prevVal ? nextVal : prevVal;
      continue;
    }

    // 손 안 댄 영역: 임계값 이상 상승만 반영, 그 외(소음·하락)는 prev 유지.
    const delta = nextVal - prevVal;
    out[key] = delta >= NOISE_THRESHOLD ? nextVal : prevVal;
  }

  return out;
}
