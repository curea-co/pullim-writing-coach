import * as React from "react";
import { cn } from "@/lib/cn";

export interface SectionHeadProps {
  title: string;
  aside?: React.ReactNode;
  className?: string;
}

export function SectionHead({ title, aside, className }: SectionHeadProps) {
  return (
    <div className={cn("mb-4 mt-8 flex items-baseline justify-between gap-4", className)}>
      <h2 className="text-[19px] font-extrabold tracking-[-.03em] text-[var(--text-primary)]">{title}</h2>
      {aside && (
        <span className="font-[var(--font-mono)] text-[11px] tracking-[.04em] text-[var(--text-tertiary)]">
          {aside}
        </span>
      )}
    </div>
  );
}
