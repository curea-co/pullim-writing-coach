"use client";
import type { AreaName } from "@/app/data/scoring";

export default function BreakthroughBadge({ areas }: { areas: AreaName[] }) {
  if (areas.length === 0) return null;
  return (
    <div data-testid="breakthrough" className="mt-[18px] rounded-[var(--r-lg)] border border-[var(--line)] bg-white p-[18px] shadow-[var(--sh-1)]">
      <div className="mb-2.5 text-[11px] font-bold tracking-[0.08em] text-[var(--pullim-blue)]">🔓 막혔다 뚫은 순간</div>
      <div className="flex flex-wrap gap-2">
        {areas.map((a) => (
          <span key={a} className="inline-flex items-center gap-1.5 rounded-[var(--r-pill)] bg-[var(--pullim-lemon)] px-3 py-1.5 text-[12.5px] font-bold text-[var(--pullim-ink)]">
            {a} 돌파
          </span>
        ))}
      </div>
    </div>
  );
}
