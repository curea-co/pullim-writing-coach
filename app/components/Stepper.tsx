// Stepper — Step 1·2·3 시각 진척 (#M3 E paradigm v1).
//   ScoreForm 호스트가 step state(1|2|3)를 전달. Step 3은 결과/로딩 단계라 본 컴포넌트는
//   step≤2일 때만 노출되도록 호출자에서 가드(상단 conditional).
//   분리 이유: ScoreForm 분해 + 컴포넌트 단위 테스트(scripts/components/Stepper.test.tsx).

import { cn } from "@/app/lib/utils";

export type StepperProps = {
  current: 1 | 2 | 3;
};

export default function Stepper({ current }: StepperProps) {
  const items: { n: 1 | 2; label: string }[] = [
    { n: 1, label: "글 입력" },
    { n: 2, label: "과제 정보" },
  ];
  return (
    <nav aria-label="진행 단계" className="flex items-center gap-2">
      {items.map((it, i) => {
        const active = it.n === current;
        const done = it.n < current;
        return (
          <span key={it.n} className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
                active && "bg-primary text-primary-foreground",
                done && "bg-band-good text-white",
                !active && !done && "bg-muted text-muted-foreground",
              )}
              aria-current={active ? "step" : undefined}
            >
              {done ? "✓" : it.n}
            </span>
            <span
              className={cn(
                "text-xs",
                active ? "text-foreground font-semibold" : "text-muted-foreground",
              )}
            >
              {it.label}
            </span>
            {i < items.length - 1 && (
              <span aria-hidden className="bg-border mx-1 h-px w-6" />
            )}
          </span>
        );
      })}
    </nav>
  );
}
