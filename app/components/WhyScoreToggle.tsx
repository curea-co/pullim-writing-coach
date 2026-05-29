// #4 왜 이 점수 토글 — 영역별 점수 disclose.
//   백엔드 응답에 채점 근거 데이터 없음 → 정적 루브릭 메타(영역 의미 + 4구간)로
//   "왜 이 점수?"의 frame을 잡아준다. #19 TrustLabel과 짝(절대 점수 아님 강조).
//
//   native <details>/<summary> 사용 — SSR-safe, 키보드 a11y(Enter/Space) 무료,
//   reduced-motion 자동 존중, "use client" 불필요. JS 0바이트.

import { cn } from "@/app/lib/utils";
import type { AreaName } from "../data/scoring";
import { AREA_CRITERIA, SCORE_BANDS, getScoreBand } from "../lib/rubric-criteria";

export default function WhyScoreToggle({
  area,
  score,
  className,
}: {
  area: AreaName;
  score: number;
  className?: string;
}) {
  const criteria = AREA_CRITERIA[area];
  const currentBand = getScoreBand(score);

  return (
    <details
      className={cn(
        "why-score group border-border bg-muted/40 hover:bg-muted/60 rounded-md border text-xs transition-colors",
        className,
      )}
    >
      <summary
        className="text-muted-foreground hover:text-foreground flex cursor-pointer list-none items-center gap-1.5 px-2.5 py-1.5 font-medium select-none"
        aria-label={`${area} 영역 점수 ${score}/20 근거 보기`}
      >
        {/* 시각 chevron — group-open으로 회전. reduced-motion 시 transition 자동 비활성. */}
        <svg
          aria-hidden
          className="h-3 w-3 shrink-0 transition-transform group-open:rotate-90 motion-reduce:transition-none"
          viewBox="0 0 12 12"
          fill="none"
        >
          <path d="M4 3l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        왜 이 점수예요?
      </summary>

      <div className="border-border border-t px-3 py-2.5">
        {/* (1) 영역 의미 — 학생/평가관이 "무엇을 보는지" frame */}
        <p className="text-foreground break-keep leading-relaxed">
          <span className="text-subtle-foreground mr-1">[{criteria.sectionRef}]</span>
          {criteria.meaning}
        </p>

        {/* (2) 4구간 표 + 현재 위치 강조 */}
        <ul className="mt-2 space-y-1" aria-label="영역 점수 4구간">
          {SCORE_BANDS.map((band) => {
            const isCurrent = band.label === currentBand.label;
            return (
              <li
                key={band.label}
                className={cn(
                  "flex items-baseline gap-2 rounded px-1.5 py-0.5",
                  isCurrent
                    ? "bg-accent-mid-surface text-foreground font-semibold"
                    : "text-muted-foreground",
                )}
                aria-current={isCurrent ? "true" : undefined}
              >
                <span className="w-12 shrink-0 tabular-nums">
                  {band.min}~{band.max}
                </span>
                <span className="w-8 shrink-0">{band.label}</span>
                <span className="break-keep">{band.description}</span>
              </li>
            );
          })}
        </ul>

        {/* (3) 면책 — AI 자동 채점 한계 명시 (#19 TrustLabel과 톤 일치) */}
        <p className="text-subtle-foreground mt-2 leading-relaxed">
          ※ AI가 본 한 시선이에요. 실제 점수의 세밀한 근거는 담임·교과 선생님과 함께 확인해 주세요.
        </p>
      </div>
    </details>
  );
}
