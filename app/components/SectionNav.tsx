"use client";

// Pullim Writing Coach — 결과 뷰 sticky 번호 섹션 내비 (scroll-spy)
//   레퍼런스(curea.co/platform/layers)의 "번호 매긴 섹션 + sticky 내비 + 스크롤 활성 표시" 패턴 차용.
//   색·폰트는 기존 토큰 그대로. items의 각 id는 ResultView의 섹션 id와 1:1 대응한다.
//   브라우저 API(scroll·resize 리스너 + scrollIntoView)만 사용 — Next 버전 비의존.

import { useEffect, useState } from "react";
import { cn } from "@/app/lib/utils";

export type SectionNavItem = { id: string; num: string; label: string };

export default function SectionNav({ items }: { items: SectionNavItem[] }) {
  const [active, setActive] = useState(items[0]?.id ?? "");

  // scroll 위치로 활성 섹션을 결정론적으로 계산한다.
  //   IntersectionObserver 밴드 방식은 콜백 entries에 "이번에 바뀐" 섹션만 와서 위로 스크롤 시
  //   활성이 어긋나고(curea-review-ai 지적), 2단 레이아웃에선 좁은 밴드에 아무 섹션도 안 걸려
  //   고착됐다. 대신 매 스크롤마다 "상단 임계선을 이미 지난 마지막 섹션"을 활성으로 잡으면
  //   위·아래가 대칭이고 섹션이 길어도 안정적이다.
  useEffect(() => {
    const THRESHOLD = 140; // sticky 내비 높이 + 여유 (px). 이 선을 지난 섹션이 '현재'.
    const compute = () => {
      // 바닥 도달 시 마지막 섹션 활성 — 짧은 끝 섹션은 끝까지 스크롤해도 top이 임계선을 못 넘어
      // 활성이 안 되는 문제를 막는다.
      const atBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4;
      if (atBottom && items.length > 0) {
        setActive(items[items.length - 1].id);
        return;
      }
      let current = items[0]?.id ?? "";
      for (const it of items) {
        const el = document.getElementById(it.id);
        if (el && el.getBoundingClientRect().top - THRESHOLD <= 0) current = it.id;
      }
      setActive(current);
    };
    compute();
    window.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute);
    return () => {
      window.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
    };
  }, [items]);

  const handleJump = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const el = document.getElementById(id);
    if (!el) return; // el 없으면 앵커 기본 동작에 맡김
    e.preventDefault();
    // prefers-reduced-motion 사용자는 애니메이션 없이 즉시 이동(curea-review-ai 지적, a11y).
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    // URL 해시 갱신 — 직접 링크·새로고침 복원·뒤로/앞으로 가능(curea-review-ai 지적).
    // 부드러운 스크롤을 유지하려 기본 점프는 막고 pushState로 해시만 반영.
    history.pushState(null, "", `#${id}`);
    setActive(id);
  };

  return (
    <nav
      aria-label="결과 섹션 내비게이션"
      // 모바일: 전역 상단바(Sidebar md:hidden 헤더, sticky top-0 z-30) 아래로 내려 가려지지 않게 top-14.
      //   데스크톱(md+): 모바일 헤더 없으므로 top-2 (curea-review-ai 지적).
      className="border-border bg-surface/90 sticky top-14 z-10 -mx-1 mb-1 flex gap-1 overflow-x-auto rounded-lg border px-1.5 py-1.5 backdrop-blur md:top-2"
    >
      {items.map((it) => {
        const isActive = active === it.id;
        return (
          <a
            key={it.id}
            href={`#${it.id}`}
            onClick={(e) => handleJump(e, it.id)}
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
          </a>
        );
      })}
    </nav>
  );
}
