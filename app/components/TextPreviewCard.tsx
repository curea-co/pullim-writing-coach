"use client";
// TextPreviewCard — Step 2에서 학생 글을 접힘 형태로 보여줌. 클릭으로 펼침, [수정] → Step 1.
//   paradigm v1 #M3 E (docs/18). 무게감 ↓ — 글이 화면 윗부분을 잡아먹지 않도록.
//   native <details>/<summary>로 a11y 무료(Enter/Space 키보드 토글).

import { cn } from "@/app/lib/utils";
import { charCount, normalizeBody } from "@/app/lib/grading";

export type TextPreviewCardProps = {
  body: string;
  onEdit: () => void;     // [수정] 클릭 시 호출 — 상위에서 setStep(1).
  className?: string;
};

export default function TextPreviewCard({ body, onEdit, className }: TextPreviewCardProps) {
  const trimmed = body.trim();
  const count = charCount(normalizeBody(body));
  // 3줄 요약 — 첫 약 120자, "…" 처리(원본 손실 X, 펼치면 전체 보임).
  const summary = trimmed.length > 120 ? `${trimmed.slice(0, 120)}…` : trimmed;

  return (
    <details
      className={cn(
        "group border-border bg-surface rounded-xl border p-4 transition-colors hover:bg-muted/30",
        className,
      )}
    >
      <summary className="flex cursor-pointer list-none items-start gap-3 select-none">
        <span
          aria-hidden
          className="text-muted-foreground mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center text-xs"
        >
          {/* chevron — group-open 시 90도 회전 */}
          <svg
            className="h-3 w-3 transition-transform group-open:rotate-90 motion-reduce:transition-none"
            viewBox="0 0 12 12"
            fill="none"
          >
            <path
              d="M4 3l3 3-3 3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <h3 className="text-foreground text-sm font-semibold">내 글 미리보기</h3>
            <span className="text-subtle-foreground shrink-0 text-xs tabular-nums">
              {count}자
            </span>
          </div>
          <p className="text-muted-foreground break-keep line-clamp-2 text-xs leading-relaxed group-open:hidden">
            {summary || "(빈 글)"}
          </p>
        </div>
      </summary>

      {/* 펼친 상태: 전체 본문 + [수정] 버튼 */}
      <div className="border-border mt-3 border-t pt-3">
        <p className="text-foreground break-keep mb-3 text-sm leading-relaxed whitespace-pre-wrap">
          {trimmed || "(빈 글)"}
        </p>
        <button
          type="button"
          onClick={onEdit}
          className="border-border bg-surface text-foreground hover:bg-muted inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium"
        >
          ✏ 수정
        </button>
      </div>
    </details>
  );
}
