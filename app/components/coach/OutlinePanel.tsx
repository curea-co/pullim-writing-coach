"use client";

// 개요 모드 — write 단계 직교 패널. 개요 골격 정적 질문 카드 + 참조용 메모(scratchpad).
//   불변식: 메모→캔버스 자동삽입 경로 없음('넣기'/복사 버튼 0). 메모는 pwc-outline-v1에만 저장.
//   CoachSession·process-log에 미합류(대필 증거 오염 방지).

import { useEffect, useState } from "react";
import { outlinePromptsFor } from "@/app/lib/outline-prompts";

const MEMOS_KEY = "pwc-outline-v1";

function loadMemos(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(MEMOS_KEY);
    const o = raw ? (JSON.parse(raw) as unknown) : {};
    return o && typeof o === "object" && !Array.isArray(o) ? (o as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function saveMemos(m: Record<string, string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MEMOS_KEY, JSON.stringify(m));
  } catch {
    /* swallow */
  }
}

export default function OutlinePanel({ genre, onStartBody }: { genre: string; onStartBody?: () => void }) {
  const questions = outlinePromptsFor(genre);
  const [memos, setMemos] = useState<Record<string, string>>({});

  useEffect(() => {
    setMemos(loadMemos());
  }, []);

  function setMemo(area: string, value: string) {
    const next = { ...memos, [area]: value };
    setMemos(next);
    saveMemos(next);
  }

  return (
    <section aria-label="개요 질문" className="border-border bg-surface rounded-xl border p-4">
      <p className="text-subtle-foreground mb-3 text-[11px] font-semibold tracking-wide">
        글의 뼈대를 잡기 전 — 아래 질문에 네 말로 메모해 봐 (참고용, 본문은 캔버스에 직접 써요)
      </p>
      <ul className="space-y-3">
        {questions.map((q) => (
          <li key={q.area}>
            <p className="text-foreground text-sm font-medium">{q.question}</p>
            <textarea
              aria-label={`${q.area} 메모`}
              value={memos[q.area] ?? ""}
              onChange={(e) => setMemo(q.area, e.target.value)}
              placeholder="네 생각을 한 줄로…"
              rows={2}
              className="border-border bg-background text-foreground mt-1.5 w-full resize-y rounded-lg border px-2.5 py-1.5 text-sm"
            />
          </li>
        ))}
      </ul>
      {onStartBody && (
        <button
          type="button"
          onClick={onStartBody}
          className="border-border bg-surface text-foreground hover:bg-muted mt-3 w-full rounded-lg border px-3 py-2 text-sm font-medium"
        >
          이제 본문 쓰기 →
        </button>
      )}
    </section>
  );
}
