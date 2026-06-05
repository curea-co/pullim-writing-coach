"use client";
// Pullim Writing Coach — 닫는 CTA 밴드 (2026-06-05: floating bottom + 실측 spacer + safe-area)
//   스크롤 내려도 viewport 하단에 항상 고정. spacer는 ResizeObserver로 실측 높이 반영
//   → 텍스트 줄바꿈·폰트 확대 시에도 spacer가 bar 가림 방지 (Codex PR #66).
//   iOS safe-area-inset-bottom 처리 — 홈 인디케이터 영역 회피.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

export default function CtaBand({
  title = "직접 쓴 글로 채점받아 보세요",
  description = "과제 정보와 글을 넣으면 AI Coach가 5영역으로 첨삭해 드려요.",
  href = "/try",
  cta = "직접 채점받기",
}: {
  title?: string;
  description?: string;
  href?: string;
  cta?: string;
}) {
  const barRef = useRef<HTMLElement>(null);
  // SSR fallback — 실제 bar 높이 측정 전 임시값(데스크톱 ~80px, 모바일 ~120px 여유).
  //   클라 mount 후 ResizeObserver가 실측 height로 override.
  const [barHeight, setBarHeight] = useState(128);

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setBarHeight(Math.ceil(entry.contentRect.height));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* 실측 spacer — 페이지 흐름 끝에서 fixed bar 높이만큼 자리 확보. */}
      <div aria-hidden style={{ height: barHeight }} />
      <section
        ref={barRef}
        // bg-zinc-700 + 화이트 — 다크/라이트 양쪽 가독성 충분.
        // pb는 모바일에서 max(기본, env(safe-area-inset-bottom)) — iOS 홈 인디케이터 회피.
        className="border-border bg-zinc-700 fixed right-0 bottom-0 left-0 z-30 flex flex-col items-start gap-3 border-t px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-white shadow-2xl md:left-60 md:flex-row md:items-center md:justify-between md:gap-4 md:px-8 md:pt-5 md:pb-5"
        role="complementary"
        aria-label="채점 받기 안내"
      >
        <div>
          <h2 className="text-base font-bold tracking-tight md:text-lg">{title}</h2>
          <p className="mt-0.5 text-xs opacity-90 md:text-sm">{description}</p>
        </div>
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:opacity-90"
        >
          {cta}
          <span aria-hidden>→</span>
        </Link>
      </section>
    </>
  );
}
