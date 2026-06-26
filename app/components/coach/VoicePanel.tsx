"use client";
import { useState } from "react";
import { useSpeechRecognition } from "@/app/lib/use-speech";

export default function VoicePanel({ onInsert, disabled = false }: { onInsert: (text: string) => void; disabled?: boolean }) {
  const [lines, setLines] = useState<string[]>([]);
  const { supported, listening, interim, error, start, stop } = useSpeechRecognition({
    onResult: (t) => setLines((prev) => [...prev, t]),
  });

  // 판정 전(null): 중립 표시 — '미지원' 안내도 마이크도 그리지 않아 SSR/CSR 첫 렌더 일치 + 깜빡임 방지.
  if (supported === null) {
    return (
      <div className="border-border bg-surface text-subtle-foreground rounded-lg border p-3 text-sm" role="note" data-testid="voice-checking">
        음성 입력 준비 중…
      </div>
    );
  }
  if (supported === false) {
    return (
      <div className="border-border bg-surface text-muted-foreground rounded-lg border p-3 text-sm" role="note">
        이 브라우저는 음성 입력을 지원하지 않아요 — 직접 타이핑하거나 다른 모드를 써 주세요.
      </div>
    );
  }
  return (
    <div className="border-border bg-surface rounded-lg border p-3 text-sm">
      <p className="text-subtle-foreground mb-2 text-xs leading-relaxed">
        음성 인식은 브라우저 기능을 쓰며, 일부 브라우저는 음성을 외부(클라우드)로 보낼 수 있어요. 마이크는 직접 켤 때만 작동해요.
      </p>
      <button
        type="button"
        data-testid="voice-mic"
        aria-pressed={listening}
        onClick={listening ? stop : start}
        disabled={disabled}
        className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold"
      >
        {listening ? "■ 멈추기" : "🎤 말하기 시작"}
      </button>
      {listening && interim ? (
        <p data-testid="voice-interim" className="text-subtle-foreground mt-2 italic">
          {interim}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-destructive mt-2 text-xs">
          마이크를 쓸 수 없어요 ({error}). 권한을 확인해 주세요.
        </p>
      ) : null}
      {lines.length > 0 && (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-subtle-foreground text-xs">인식된 텍스트</span>
            <button
              type="button"
              data-testid="voice-clear"
              onClick={() => setLines([])}
              className="text-destructive text-xs underline underline-offset-2"
            >
              지우기
            </button>
          </div>
          <ul className="space-y-2">
            {lines.map((line, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-foreground flex-1">{line}</span>
                <button
                  type="button"
                  data-testid={`voice-insert-${i}`}
                  onClick={() => onInsert(line)}
                  disabled={disabled}
                  className="text-primary shrink-0 text-xs font-medium underline underline-offset-2"
                >
                  본문에 넣기 →
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
