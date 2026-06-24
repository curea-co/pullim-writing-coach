"use client";

// 코치 진입 — 작성 모드 선택. 자유/가이드 활성, 개요/말하기 '준비 중'(isModeEnabled=false).

import { type WritingMode, isModeEnabled } from "@/app/lib/coach-setup";

type Card = { mode: WritingMode; title: string; body: string };

const CARDS: readonly Card[] = [
  { mode: "free", title: "자유 쓰기", body: "바로 캔버스에 써 내려가요. 다 쓰면 코치에게 봐달라고 해요." },
  { mode: "guide", title: "가이드 (질문 따라)", body: "막막할 때, 질문 카드를 보며 네 생각을 한 줄씩 적어가요." },
  { mode: "outline", title: "개요 먼저", body: "글의 뼈대부터 잡고 살을 붙여요." },
  { mode: "voice", title: "말하기", body: "말로 풀어낸 뒤 직접 글로 정리해요." },
];

export default function ModeSelectStep({
  onSelect,
  onBack,
}: {
  onSelect: (mode: WritingMode) => void;
  onBack: () => void;
}) {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-8 md:py-12">
      <button type="button" onClick={onBack} className="text-muted-foreground hover:text-foreground mb-6 text-sm">
        ← 과제 다시 입력
      </button>
      <header className="mb-6">
        <h1 className="text-foreground text-2xl font-bold tracking-tight md:text-3xl">어떻게 써볼까요?</h1>
        <p className="text-muted-foreground mt-3 text-sm">나에게 맞는 방식을 골라요. 코치는 어느 방식이든 답을 주지 않고 질문으로 도와요.</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        {CARDS.map((c) => {
          const enabled = isModeEnabled(c.mode);
          return (
            <button
              key={c.mode}
              type="button"
              data-testid={`mode-${c.mode}`}
              disabled={!enabled}
              onClick={() => enabled && onSelect(c.mode)}
              className="border-border bg-surface relative flex flex-col rounded-2xl border p-5 text-left transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="text-foreground text-base font-semibold">{c.title}</span>
              <span className="text-muted-foreground mt-1.5 text-sm leading-relaxed">{c.body}</span>
              {!enabled && (
                <span className="bg-muted text-subtle-foreground absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-semibold">
                  준비 중
                </span>
              )}
            </button>
          );
        })}
      </div>
    </main>
  );
}
