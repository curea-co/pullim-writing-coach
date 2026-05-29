// #1 수정 전/후 비교 — 상단 성장 카드.
//   총점 v1→v2 델타 + 코칭 카피 + 영역별 v1↔v2 동시 비교 미니바.
//   서버 호환(상태 없음). design doc 2026-05-28 (office-hours).

import type { F3Output } from "../data/scoring";
import { areaCopy, computeDelta, totalCopy, totalToneColorHint } from "../lib/revision";
import { cn } from "../lib/utils";

const TONE_CLASSES = {
  good: {
    delta: "text-band-good-foreground",
    deltaBg: "bg-band-good-surface",
  },
  neutral: {
    delta: "text-muted-foreground",
    deltaBg: "bg-muted",
  },
  warn: {
    delta: "text-band-warn-foreground",
    deltaBg: "bg-band-warn-surface",
  },
} as const;

const AREA_TONE_BAR = {
  good: "bg-[#24D39E]",      // 상승 = 브랜드 초록
  neutral: "bg-primary",     // 동률 = 기본
  warn: "bg-band-warn",      // 하락 = 부드러운 경고
} as const;

export default function GrowthCard({
  v1,
  v2,
  className,
}: {
  v1: F3Output;
  v2: F3Output;
  className?: string;
}) {
  const delta = computeDelta(v1, v2);
  const tone = totalToneColorHint(
    delta.total >= 10 ? "up_big"
    : delta.total >= 1 ? "up_small"
    : delta.total === 0 ? "flat"
    : delta.total >= -5 ? "down_small"
    : "down_big"
  );
  const toneCls = TONE_CLASSES[tone];

  const deltaSign = delta.total > 0 ? "+" : delta.total < 0 ? "" : "±";
  const deltaText = delta.total === 0 ? "0" : `${deltaSign}${delta.total}`;

  return (
    <section
      aria-label="이전 글 대비 변화"
      className={cn(
        "border-border bg-surface space-y-5 rounded-2xl border p-5 md:p-6",
        className,
      )}
    >
      {/* 총점 헤더: v1 → v2 (+델타) */}
      <header>
        <div className="flex items-baseline flex-wrap gap-x-3 gap-y-1">
          <span className="text-subtle-foreground text-sm font-medium tabular-nums">
            {v1.total_score}
          </span>
          <span className="text-subtle-foreground text-base" aria-hidden>
            →
          </span>
          <span className="text-foreground text-4xl font-bold tracking-tight tabular-nums md:text-5xl">
            {v2.total_score}
          </span>
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums",
              toneCls.deltaBg,
              toneCls.delta,
            )}
          >
            {deltaText}
          </span>
        </div>
        <p className="text-muted-foreground break-keep mt-3 text-sm leading-relaxed">
          {totalCopy(delta.total)}
        </p>
      </header>

      {/* 영역별 미니바: area | v1 bar (연한) | v2 bar (진한) | 델타 */}
      <ul className="space-y-2.5">
        {delta.perArea.map((row) => {
          const aTone = row.delta > 0 ? "good" : row.delta === 0 ? "neutral" : "warn";
          const barCls = AREA_TONE_BAR[aTone];
          const widthV1 = (row.v1 / 20) * 100;
          const widthV2 = (row.v2 / 20) * 100;
          const deltaLabel = row.delta > 0 ? `+${row.delta}` : row.delta === 0 ? "=" : `${row.delta}`;
          return (
            <li key={row.area} aria-label={areaCopy(row.area, row.delta)} className="text-xs">
              <div className="mb-1 flex items-center justify-between">
                <span
                  className={cn(
                    "text-foreground font-medium",
                    aTone === "warn" && "text-band-warn-foreground",
                  )}
                >
                  {row.area}
                </span>
                <span
                  className={cn(
                    "tabular-nums",
                    aTone === "good" && "text-band-good-foreground font-semibold",
                    aTone === "neutral" && "text-muted-foreground",
                    aTone === "warn" && "text-band-warn-foreground font-semibold",
                  )}
                >
                  <span className="text-subtle-foreground mr-1.5">
                    {row.v1} → {row.v2}
                  </span>
                  {deltaLabel}
                </span>
              </div>
              {/* v1 (연한, 위 얇은 줄)·v2 (진한, 아래 두꺼운 줄) — 시각 비교 */}
              <div className="space-y-1">
                <div className="bg-muted h-1 w-full overflow-hidden rounded-full">
                  <div
                    className={cn("h-full opacity-40", barCls)}
                    style={{ width: `${widthV1}%` }}
                    aria-hidden
                  />
                </div>
                <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
                  <div
                    className={cn("h-full", barCls)}
                    style={{ width: `${widthV2}%` }}
                    aria-hidden
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="text-subtle-foreground text-[11px]">
        위 얇은 줄 = 이전 글 · 아래 진한 줄 = 이번 글
      </p>
    </section>
  );
}
