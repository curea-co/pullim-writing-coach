// #10 글자수 진척 인디케이터 — 목표 대비 현재 본문 자수의 5밴드 분류.
//   순수 모듈 — ScoreForm(client) + 단위 테스트가 동일 import. 백엔드 무관.
//
//   설계 의도:
//   - 목표 미입력(target=null) → 인디케이터 자체 비노출(null 반환).
//   - bullseye 구간(90~110%)으로 학생에게 "딱 좋은 분량"의 mental anchor 제공.
//   - BODY_MAX(2000자) 하드 캡 초과는 target 비율과 무관하게 way-over로 강제.

export type ProgressBand =
  | "warmup"        // < 50% — 시작 단계
  | "approaching"   // 50~89% — 거의 다 왔어요
  | "bullseye"      // 90~110% — 딱 좋은 분량
  | "over"          // 111~130% — 조금 길어요
  | "way-over";     // >130% 또는 BODY_MAX 초과 — 줄여야 함

export type ProgressState = {
  band: ProgressBand;
  pct: number;     // 시각 바 width(0~100, 100% 캡). raw 비율은 별도 보존.
  rawPct: number;  // 원시 비율(소수 1자리 반올림). 표시·테스트용.
  label: string;   // 학생용 마이크로카피
};

export function computeProgress(
  current: number,
  target: number | null,
  bodyMax: number,
): ProgressState | null {
  if (!target || target <= 0) return null;        // 목표 미입력 → 인디케이터 X
  const rawPct = Math.round((current / target) * 1000) / 10; // 소수 1자리
  const pct = Math.min(100, Math.max(0, rawPct));            // 시각 width 캡

  // 하드 캡 우선 — BODY_MAX 초과는 target 비율과 무관하게 줄여야 함.
  if (current >= bodyMax) {
    return {
      band: "way-over",
      pct: 100,
      rawPct,
      label: `${bodyMax}자까지만 첨삭할 수 있어요`,
    };
  }
  if (rawPct < 50) {
    return { band: "warmup", pct, rawPct, label: "시작 단계 — 조금 더 써 보세요" };
  }
  if (rawPct < 90) {
    return { band: "approaching", pct, rawPct, label: "거의 다 왔어요" };
  }
  if (rawPct <= 110) {
    return { band: "bullseye", pct, rawPct, label: "딱 좋은 분량이에요" };
  }
  if (rawPct <= 130) {
    return { band: "over", pct: 100, rawPct, label: "조금 길어요" };
  }
  return { band: "way-over", pct: 100, rawPct, label: "조금 줄여 보세요" };
}

// 시맨틱 토큰 매핑 — Tailwind 정적 클래스(JIT가 미리 추출 가능하도록 인라인 X).
//   fe-styling: band-* 토큰은 globals.css에서 oklch로 정의됨.
export function getProgressBarClass(band: ProgressBand): string {
  switch (band) {
    case "warmup":
      return "bg-muted-foreground/40";
    case "approaching":
      return "bg-band-normal";
    case "bullseye":
      return "bg-band-good";
    case "over":
    case "way-over":
      return "bg-band-warn";
  }
}

export function getProgressTextClass(band: ProgressBand): string {
  switch (band) {
    case "warmup":
      return "text-subtle-foreground";
    case "approaching":
      return "text-band-normal-foreground";
    case "bullseye":
      return "text-band-good-foreground";
    case "over":
    case "way-over":
      return "text-band-warn-foreground";
  }
}
