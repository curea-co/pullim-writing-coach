"use client";

import { useState } from "react";
import { cn } from "@/app/lib/utils";

export default function CopyButton({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function handleClick() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
      setTimeout(() => setState("idle"), 1500);
    } catch {
      setState("failed");
      setTimeout(() => setState("idle"), 2500);
    }
  }

  const label =
    state === "copied"
      ? "복사됨 ✓"
      : state === "failed"
        ? "복사 실패 — 직접 선택해 주세요"
        : "결과 복사하기";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={state !== "idle"}
      className={cn(
        "bg-primary text-primary-foreground inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition hover:opacity-90",
        state !== "idle" && "opacity-60"
      )}
    >
      {label}
    </button>
  );
}
