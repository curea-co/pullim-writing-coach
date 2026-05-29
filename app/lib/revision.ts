// #1 수정 전/후 비교 — 순수 모듈 (델타 계산 + 코칭 톤 카피 분기).
//   design doc(2026-05-28 office-hours)에 잠긴 5-band 카피와 영역별 3-band 동기화.
//   React 없음 → 단위 테스트(scripts/revision.test.mjs)가 직접 import.

import type { AreaName, F3Output } from "../data/scoring";

export type ScoreDelta = {
  total: number;                                     // v2.total_score - v1.total_score
  perArea: Array<{ area: AreaName; v1: number; v2: number; delta: number }>;
};

export type GrowthTone = "up_big" | "up_small" | "flat" | "down_small" | "down_big";
export type AreaTone = "up" | "flat" | "down";

// ── 델타 계산 ────────────────────────────────────────────────────────
// 5영역 순서·길이는 서버가 보장(grading.ts AREAS). 길이 mismatch 시 짧은 쪽 기준.
export function computeDelta(v1: F3Output, v2: F3Output): ScoreDelta {
  const len = Math.min(v1.scores.length, v2.scores.length);
  const perArea: ScoreDelta["perArea"] = [];
  for (let i = 0; i < len; i++) {
    const a1 = v1.scores[i];
    const a2 = v2.scores[i];
    perArea.push({
      area: a2.area,                                 // v2 기준 area name
      v1: a1.score,
      v2: a2.score,
      delta: a2.score - a1.score,
    });
  }
  return {
    total: v2.total_score - v1.total_score,
    perArea,
  };
}

// ── 총점 카피 (design doc 5-band) ───────────────────────────────────
export function totalTone(total_delta: number): GrowthTone {
  if (total_delta >= 10) return "up_big";
  if (total_delta >= 1) return "up_small";
  if (total_delta === 0) return "flat";
  if (total_delta >= -5) return "down_small";
  return "down_big";
}

export function totalCopy(total_delta: number): string {
  switch (totalTone(total_delta)) {
    case "up_big":
      return "크게 좋아졌어요! 어떤 부분이 달라졌는지 아래에서 확인해 보세요.";
    case "up_small":
      return "조금씩 좋아지고 있어요. 한 걸음 더 가 봐요.";
    case "flat":
      return "총점은 같지만 영역별 변화는 있어요. 무엇이 바뀌었는지 보세요.";
    case "down_small":
      return "이번엔 일부 영역이 한 걸음 더 필요해요. 함께 봅시다.";
    case "down_big":
      return "방향을 다시 잡아 볼 시점이에요. 영역별 피드백을 천천히 읽어 보세요.";
  }
}

// ── 영역별 카피 (3-band) ────────────────────────────────────────────
//   positive/flat/negative — 부정 케이스는 격려 톤(미성년자 좌절 방지).
export function areaTone(delta: number): AreaTone {
  if (delta > 0) return "up";
  if (delta === 0) return "flat";
  return "down";
}

export function areaCopy(area: AreaName, delta: number): string {
  switch (areaTone(delta)) {
    case "up":
      return `${area} +${delta} — 좋아졌어요`;
    case "flat":
      return `${area} = 같은 수준 유지`;
    case "down":
      return `${area} ${delta} — 한 걸음 더`;
  }
}

// ── 토큰 매핑 (UI가 시각 결정 시 참조) ─────────────────────────────
//   total tone → 색 hint (band-good / band-normal / band-warn). 컴포넌트는 이걸 받아 className 결정.
export function totalToneColorHint(tone: GrowthTone): "good" | "neutral" | "warn" {
  if (tone === "up_big" || tone === "up_small") return "good";
  if (tone === "flat") return "neutral";
  return "warn";                                     // down_small / down_big — 부드러운 경고색
}

export function areaToneColorHint(tone: AreaTone): "good" | "neutral" | "warn" {
  if (tone === "up") return "good";
  if (tone === "flat") return "neutral";
  return "warn";
}
