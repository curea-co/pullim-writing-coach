"use client";
// Pullim Writing Coach — 인라인 첨삭 본문 (P1·#2 클릭).
//   학생 글에 피드백이 인용한 표현을 하이라이트(P1). 클릭 시 해당 영역 피드백으로 스크롤·flash(#2).
//   "use client" — 클릭 핸들러·scrollIntoView 필요. 매칭은 순수 모듈 app/lib/annotate.ts.
//   매치 0건이면 plain 본문(조용한 폴백).

import type { KeyboardEvent, MouseEvent } from "react";
import { cn } from "@/app/lib/utils";
import type { Score } from "../data/scoring";
import { computeSegments, extractQuotedPhrasesWithSource } from "../lib/annotate";
import { feedbackAreaId } from "../lib/feedback-anchors";

const FLASH_DURATION_MS = 1600;

function focusFeedbackArea(areaIndex: number): void {
  const el = document.getElementById(feedbackAreaId(areaIndex));
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "start" });
  // 임시 flash — CSS는 globals.css .feedback-flash + reduced-motion 가드
  el.classList.add("feedback-flash");
  window.setTimeout(() => el.classList.remove("feedback-flash"), FLASH_DURATION_MS);
}

export default function AnnotatedBody({
  body,
  scores,
  className,
}: {
  body: string;
  scores: readonly Score[];
  className?: string;
}) {
  const sources = extractQuotedPhrasesWithSource(scores);
  const segments = computeSegments(body, sources);
  const hasHighlight = segments.some((s) => s.highlight);
  const hasClickable = segments.some((s) => s.highlight && typeof s.areaIndex === "number");

  const handleClick = (areaIndex: number | undefined) => (e: MouseEvent) => {
    if (areaIndex == null) return;
    e.preventDefault();
    focusFeedbackArea(areaIndex);
  };
  const handleKey = (areaIndex: number | undefined) => (e: KeyboardEvent) => {
    if (areaIndex == null) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      focusFeedbackArea(areaIndex);
    }
  };

  return (
    <>
      <p
        className={cn(
          "text-foreground text-sm leading-relaxed whitespace-pre-wrap",
          className,
        )}
      >
        {segments.map((seg, i) => {
          if (!seg.highlight) {
            // biome-ignore lint/suspicious/noArrayIndexKey: 세그먼트는 위치 고정·재정렬 없음
            return <span key={i}>{seg.text}</span>;
          }
          const clickable = typeof seg.areaIndex === "number";
          // <mark>를 button-role로 — Enter/Space 키도 동작, focus ring 적용. 색맹 대비 밑줄 유지.
          return (
            <mark
              // biome-ignore lint/suspicious/noArrayIndexKey: 세그먼트는 위치 고정·재정렬 없음
              key={i}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              aria-label={
                clickable
                  ? `${seg.text} — 해당 영역 피드백 보기`
                  : undefined
              }
              onClick={clickable ? handleClick(seg.areaIndex) : undefined}
              onKeyDown={clickable ? handleKey(seg.areaIndex) : undefined}
              className={cn(
                "bg-band-normal-surface text-band-normal-foreground rounded-[3px] px-0.5 underline decoration-band-normal/60 underline-offset-2",
                clickable &&
                  "cursor-pointer hover:bg-band-normal hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#24D39E] focus-visible:ring-offset-1 transition-colors",
              )}
            >
              {seg.text}
            </mark>
          );
        })}
      </p>
      {hasHighlight && (
        <p className="text-subtle-foreground mt-2 text-[11px] leading-relaxed">
          <span className="bg-band-normal-surface text-band-normal-foreground rounded-[3px] px-1 underline decoration-band-normal/60 underline-offset-2">
            형광펜
          </span>{" "}
          표시는 피드백에서 언급한 부분이에요{hasClickable ? " — 눌러 보세요" : ""}.
        </p>
      )}
    </>
  );
}
