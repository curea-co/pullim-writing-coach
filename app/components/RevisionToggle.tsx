"use client";
// #1 수정 전/후 비교 — 본문 영역 v2↔v1 토글.
//   기본 v2(방금 쓴 글). 키보드: 좌우 화살표·Tab. ARIA tablist 패턴.

import { useId } from "react";
import { cn } from "../lib/utils";

export type RevisionView = "v1" | "v2";

export default function RevisionToggle({
  active,
  onChange,
  v1Label = "이전 글",
  v2Label = "방금 쓴 글",
  className,
}: {
  active: RevisionView;
  onChange: (v: RevisionView) => void;
  v1Label?: string;
  v2Label?: string;
  className?: string;
}) {
  const id = useId();
  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      onChange(active === "v2" ? "v1" : "v2");
    }
  };

  return (
    <div
      role="tablist"
      aria-label="이전 글 / 방금 쓴 글 전환"
      onKeyDown={handleKey}
      className={cn(
        "border-border bg-muted/40 inline-flex gap-1 rounded-lg border p-1",
        className,
      )}
    >
      <button
        type="button"
        role="tab"
        aria-selected={active === "v2"}
        aria-controls={`${id}-panel`}
        tabIndex={active === "v2" ? 0 : -1}
        onClick={() => onChange("v2")}
        className={cn(
          "inline-flex h-9 items-center rounded-md px-4 text-xs font-medium transition",
          active === "v2"
            ? "bg-primary text-primary-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        {v2Label}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={active === "v1"}
        aria-controls={`${id}-panel`}
        tabIndex={active === "v1" ? 0 : -1}
        onClick={() => onChange("v1")}
        className={cn(
          "inline-flex h-9 items-center rounded-md px-4 text-xs font-medium transition",
          active === "v1"
            ? "bg-surface text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        {v1Label}
      </button>
    </div>
  );
}
