"use client";

// Pullim Writing Coach — 결과 뷰 sticky 번호 섹션 내비 (scroll-spy)
//   레퍼런스(curea.co/platform/layers)의 "번호 매긴 섹션 + sticky 내비 + 스크롤 활성 표시" 패턴 차용.
//   색·폰트는 기존 토큰 그대로. items의 각 id는 ResultView의 섹션 id와 1:1 대응한다.
//   브라우저 API(IntersectionObserver·scrollIntoView)만 사용 — Next 버전 비의존.

import { useEffect, useState } from "react";
import { cn } from "@/app/lib/utils";

export type SectionNavItem = { id: string; num: string; label: string };

export default function SectionNav({ items }: { items: SectionNavItem[] }) {
  const [active, setActive] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const els = items
      .map((it) => document.getElementById(it.id))
      .filter((el): el is HTMLElement => el !== null);
    if (els.length === 0) return;

    // 화면 상단 1/3 지점을 지나는 섹션을 활성으로 — 위에서부터 가장 마지막으로 진입한 것.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) setActive(visible[0].target.id);
      },
      { rootMargin: "-12% 0px -70% 0px", threshold: 0 }
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [items]);

  const handleJump = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    setActive(id);
  };

  return (
    <nav
      aria-label="결과 섹션 내비게이션"
      className="border-border bg-surface/90 sticky top-0 z-10 -mx-1 mb-1 flex gap-1 overflow-x-auto rounded-lg border px-1.5 py-1.5 backdrop-blur md:top-2"
    >
      {items.map((it) => {
        const isActive = active === it.id;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => handleJump(it.id)}
            aria-current={isActive ? "true" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <span
              className={cn(
                "tabular-nums",
                isActive ? "opacity-80" : "text-subtle-foreground"
              )}
            >
              {it.num}
            </span>
            {it.label}
          </button>
        );
      })}
    </nav>
  );
}
