// #1 수정 전/후 비교 — 영역별 피드백 변화 카드.
//   각 영역: 점수 변화 배지 + 코칭 카피 + 이전 피드백(접힘 details/summary) + 새 피드백(펼침).
//   부정 케이스(점수 하락)도 정직히 표시 + 격려 톤(design doc).
//   서버 호환(상태 없음).

import type { F3Output } from "../data/scoring";
import { areaCopy, areaTone, areaToneColorHint, computeDelta } from "../lib/revision";
import { cn } from "../lib/utils";

const TONE_BADGE = {
  good: "bg-band-good-surface text-band-good-foreground",
  neutral: "bg-muted text-muted-foreground",
  warn: "bg-band-warn-surface text-band-warn-foreground",
} as const;

export default function FeedbackDiff({
  v1,
  v2,
  className,
}: {
  v1: F3Output;
  v2: F3Output;
  className?: string;
}) {
  const delta = computeDelta(v1, v2);

  return (
    <div className={cn("space-y-4", className)}>
      {delta.perArea.map((row, i) => {
        const tone = areaTone(row.delta);
        const colorHint = areaToneColorHint(tone);
        const v1Score = v1.scores[i];
        const v2Score = v2.scores[i];
        return (
          <article
            key={row.area}
            className={cn(
              "border-l-2 pl-3",
              colorHint === "warn" ? "border-band-warn" : "border-border",
            )}
          >
            <header className="mb-2 flex items-center flex-wrap gap-2">
              <span className="text-foreground text-sm font-semibold">▸ {row.area}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums",
                  TONE_BADGE[colorHint],
                )}
              >
                {row.v1} → {row.v2}
                {" · "}
                {row.delta > 0 ? `+${row.delta}` : row.delta === 0 ? "=" : row.delta}
              </span>
              <span className="text-subtle-foreground text-[11px]">
                {areaCopy(row.area, row.delta)}
              </span>
            </header>

            {/* 새 피드백(펼침) — 학생 눈높이 코칭 톤 유지 */}
            <div className="space-y-1.5">
              <p className="text-foreground text-sm leading-relaxed">
                <span className="bg-band-good-surface text-band-good-foreground mr-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold">
                  잘한 점
                </span>
                {v2Score.feedback_good}
              </p>
              <p className="text-foreground text-sm leading-relaxed">
                <span className="bg-band-normal-surface text-band-normal-foreground mr-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold">
                  고칠 점
                </span>
                {v2Score.feedback_fix}
              </p>
            </div>

            {/* 이전 피드백(접힘 details) */}
            <details className="border-border mt-2 rounded-md border bg-muted/30 text-xs">
              <summary className="text-muted-foreground hover:text-foreground cursor-pointer select-none px-3 py-2">
                이전 피드백 보기
              </summary>
              <div className="space-y-1.5 px-3 pb-3 pt-1 opacity-90">
                <p className="text-muted-foreground text-xs leading-relaxed">
                  <span className="mr-1 text-[10px] font-semibold uppercase">잘한 점</span>
                  {v1Score.feedback_good}
                </p>
                <p className="text-muted-foreground text-xs leading-relaxed">
                  <span className="mr-1 text-[10px] font-semibold uppercase">고칠 점</span>
                  {v1Score.feedback_fix}
                </p>
              </div>
            </details>
          </article>
        );
      })}
    </div>
  );
}
