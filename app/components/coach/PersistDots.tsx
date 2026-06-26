"use client";

// PersistDots — 끈기 스트릭 (Task 2: 끝까지 해낸 글 N편 + 레몬 도트 행).
// count <= 0이면 null(마운트 안 됨). count > 10이면 도트 최대 10개로 캡.

export default function PersistDots({ count }: { count: number }) {
  if (count <= 0) return null;
  const dots = Math.min(count, 10);
  return (
    <div data-testid="persist-dots" className="mt-3 flex items-center gap-2 text-[12px] text-[var(--ink-3)]">
      <span className="font-semibold text-[var(--pullim-blue)]">끝까지 해낸 글 {count}편</span>
      <span className="flex gap-1" aria-hidden="true">
        {Array.from({ length: dots }).map((_, i) => (
          <i key={i} className="h-2 w-2 rounded-full bg-[var(--pullim-lemon)]" />
        ))}
      </span>
    </div>
  );
}
