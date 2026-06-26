"use client";
import { useState } from "react";

export default function ShareStory({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* 권한 거부 — 조용히 폴백 */ }
  };
  return (
    <div data-testid="share-story" className="mt-[18px] rounded-[var(--r-lg)] border border-[var(--line)] bg-white p-[18px] shadow-[var(--sh-1)]">
      <div className="mb-2.5 text-[11px] font-bold tracking-[0.08em] text-[var(--pullim-blue)]">📤 성장 스토리</div>
      <pre className="mb-3 whitespace-pre-wrap text-[12.5px] text-[var(--ink-3)]">{text}</pre>
      <button type="button" data-testid="share-copy" onClick={onCopy} className="rounded-lg bg-[var(--pullim-blue)] px-4 py-2 text-[13px] font-semibold text-white">
        {copied ? "복사됨 ✓" : "복사하기"}
      </button>
    </div>
  );
}
