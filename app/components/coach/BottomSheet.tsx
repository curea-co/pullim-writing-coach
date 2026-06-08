"use client";

// Pullim Writing Coach — U5 바텀시트 (docs/27 .sheet 포팅)
//
// 상태: "peek"(접힘 — grip+CTA만 보임) / "open"(펼침 — 전체 본문) / "hidden"(완전히 내림, 완료화면 전환).
//   프로토타입은 offsetHeight를 측정해 translateY(h-56px)로 접었지만, SSR/하이드레이션·리사이즈
//   안정성을 위해 measured height(ResizeObserver)로 동일 효과를 낸다. grip 클릭/키보드로 peek↔open 토글.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import styles from "@/app/coach/coach.module.css";

export type SheetPosition = "peek" | "open" | "hidden";

// SSR에서 useLayoutEffect 경고 방지.
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// peek 시 화면에 남기는 손잡이+CTA 영역 높이(px).
const PEEK_VISIBLE = 56;

export default function BottomSheet({
  position,
  onToggle,
  children,
  label = "코치 패널",
}: {
  position: SheetPosition;
  onToggle?: () => void; // grip 클릭 — peek↔open 토글 (코칭 중에만 의미)
  children: React.ReactNode;
  label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  // 시트 높이 측정 → peek translate 계산. 내용 바뀔 때마다 갱신.
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setHeight(el.offsetHeight);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [children]);

  let transform = "translateY(0)";
  if (position === "hidden") transform = "translateY(101%)";
  else if (position === "peek") transform = `translateY(${Math.max(height - PEEK_VISIBLE, 0)}px)`;

  return (
    <div
      ref={ref}
      className={`${styles.sheet} absolute inset-x-0 bottom-0`}
      style={{ transform }}
      role="region"
      aria-label={label}
      aria-hidden={position === "hidden"}
    >
      <button
        type="button"
        className="mx-auto mb-0.5 mt-[11px] block cursor-pointer border-0 bg-transparent p-1"
        onClick={onToggle}
        aria-label={position === "open" ? "코치 패널 접기" : "코치 패널 펼치기"}
        disabled={!onToggle}
      >
        <span className={`${styles.grip} block`} />
      </button>
      <div className="px-[18px] pb-5 pt-1.5">{children}</div>
    </div>
  );
}
