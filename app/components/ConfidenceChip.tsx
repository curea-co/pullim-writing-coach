"use client";
// ConfidenceChip — 추출 결과 신뢰도 칩.
//   확정(실선) / 추정(점선 + "확인" 뱃지). 탭하면 부모가 인라인 편집 모드로 전환.
//
// 2026-06-08 v2 이식 (Phase 1 PR C).

import { cn } from "@/app/lib/utils";

export default function ConfidenceChip({
  label,
  value,
  confidence,
  onEdit,
}: {
  label: string;
  value: string;
  confidence: "confirmed" | "inferred";
  onEdit?: () => void;
}) {
  const isInferred = confidence === "inferred";
  return (
    <button
      type="button"
      onClick={onEdit}
      className={cn(
        "bg-surface text-foreground inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition hover:shadow-sm",
        isInferred
          ? "border-accent-mid border-2 border-dashed"
          : "border-border border",
      )}
    >
      <span className="text-subtle-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
      {isInferred && (
        <span className="bg-accent-mid-surface text-accent-mid rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
          확인
        </span>
      )}
    </button>
  );
}
