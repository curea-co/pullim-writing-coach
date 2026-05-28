// Pullim Writing Coach — 인라인 첨삭 본문 (P1). 학생 글에 피드백이 인용한 표현을 하이라이트.
//   "use client" 없음 = 서버·클라 양쪽 렌더(정적 samples 페이지에서 그대로 쓰임).
//   매칭은 순수 모듈 app/lib/annotate.ts. 매치 0건이면 plain 본문(조용한 폴백).

import { cn } from "@/app/lib/utils";
import type { Score } from "../data/scoring";
import { computeSegments, extractQuotedPhrases } from "../lib/annotate";

export default function AnnotatedBody({
  body,
  scores,
  className,
}: {
  body: string;
  scores: readonly Score[];
  className?: string;
}) {
  const phrases = extractQuotedPhrases(
    scores.flatMap((s) => [s.feedback_good, s.feedback_fix]),
  );
  const segments = computeSegments(body, phrases);
  const hasHighlight = segments.some((s) => s.highlight);

  return (
    <>
      <p
        className={cn(
          "text-foreground text-sm leading-relaxed whitespace-pre-wrap",
          className,
        )}
      >
        {segments.map((seg, i) =>
          seg.highlight ? (
            // 색만으로 구분 금지(색맹 대비) → 밑줄 동반. "고칠 점"과 동일 band-normal 토큰.
            <mark
              // biome-ignore lint/suspicious/noArrayIndexKey: 세그먼트는 위치 고정·재정렬 없음
              key={i}
              className="bg-band-normal-surface text-band-normal-foreground rounded-[3px] px-0.5 underline decoration-band-normal/60 underline-offset-2"
            >
              {seg.text}
            </mark>
          ) : (
            // biome-ignore lint/suspicious/noArrayIndexKey: 위와 동일
            <span key={i}>{seg.text}</span>
          ),
        )}
      </p>
      {hasHighlight && (
        <p className="text-subtle-foreground mt-2 text-[11px] leading-relaxed">
          <span className="bg-band-normal-surface text-band-normal-foreground rounded-[3px] px-1 underline decoration-band-normal/60 underline-offset-2">
            형광펜
          </span>{" "}
          표시는 오른쪽 피드백에서 언급한 부분이에요.
        </p>
      )}
    </>
  );
}
