"use client";
import { useState } from "react";

export default function ShareStory({ text }: { text: string }) {
  // idle | copied | failed — 실패 시 무반응 대신 '직접 선택' 안내(아래 텍스트는 항상 보여 수동 복사 가능).
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
      setTimeout(() => setState("idle"), 1500);
    } catch {
      setState("failed"); // clipboard 미지원/권한 거부 — 실패 노출 후 아래 텍스트 수동 선택 유도
      setTimeout(() => setState("idle"), 3000);
    }
  };
  const label = state === "copied" ? "복사됨 ✓" : state === "failed" ? "복사 실패 — 아래 글을 직접 선택해 복사하세요" : "복사하기";
  return (
    <div data-testid="share-story" className="mt-[18px] rounded-[var(--r-lg)] border border-[var(--line)] bg-white p-[18px] shadow-[var(--sh-1)]">
      <div className="mb-2.5 text-[11px] font-bold tracking-[0.08em] text-[var(--pullim-blue)]">📤 성장 스토리</div>
      <pre data-testid="share-text" className="mb-3 select-text whitespace-pre-wrap text-[12.5px] text-[var(--ink-3)]">{text}</pre>
      <button
        type="button"
        data-testid="share-copy"
        onClick={onCopy}
        aria-live="polite"
        className={`rounded-lg px-4 py-2 text-[13px] font-semibold ${state === "failed" ? "bg-[var(--pullim-lemon)] text-[var(--pullim-ink)]" : "bg-[var(--pullim-blue)] text-white"}`}
      >
        {label}
      </button>
    </div>
  );
}
