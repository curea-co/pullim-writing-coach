// 온보딩 단계 표시 — 시각(점) + 텍스트("1단계 / 3단계") 동반 (a11y).
//   각 dot은 aria-current로 현재 단계를 명시. 서버 호환(상태 없음).

import { cn } from "@/app/lib/utils";

export default function ProgressDots({
  total,
  current,
  className,
}: {
  total: number;        // 총 단계 수
  current: number;      // 1-based 현재 단계
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <ol className="flex items-center gap-1.5" aria-label={`온보딩 진행: ${current}단계 중 ${total}단계`}>
        {Array.from({ length: total }, (_, i) => {
          const step = i + 1;
          const isActive = step === current;
          const isPast = step < current;
          return (
            <li
              key={step}
              aria-current={isActive ? "step" : undefined}
              className={cn(
                "h-2 rounded-full transition-all",
                isActive ? "bg-primary w-6" : isPast ? "bg-primary/40 w-2" : "bg-border w-2",
              )}
            />
          );
        })}
      </ol>
      <span className="text-subtle-foreground text-xs tabular-nums">
        {current}단계 / {total}단계
      </span>
    </div>
  );
}
