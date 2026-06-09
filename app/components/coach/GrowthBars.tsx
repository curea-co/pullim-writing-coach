"use client";

// Pullim Writing Coach — U5 성장 막대 (docs/27 .grow/.bar/.seg 포팅)
//
// 수치 숨김 계약(revision.ts): 원점수·delta 숫자는 노출하지 않고 막대(칸)만 보여준다.
//   색 어법(브랜드 락): 전(was)=연블루, 후 중 유지칸=블루(cur), 새로 자란 칸=레몬(gain).
//   toBarSegments/growthBar(revision.ts)로 계산 — UI는 칸 수만 받는다.

import { growthBar, toBarSegments } from "@/app/lib/revision";
import type { AreaName } from "@/app/data/scoring";
import styles from "@/app/coach/coach.module.css";

const SEGMENTS = 5;

type RowKind = "before" | "after";

// 막대 한 줄. before: 채운 칸=연블루(was). after: keepUntil까지=진블루(cur), 그 위 filled까지=레몬(gain).
function BarRow({
  kind,
  filled,
  keepUntil,
  animateGain,
}: {
  kind: RowKind;
  filled: number; // 채워진 총 칸 수
  keepUntil: number; // after 막대에서 "유지칸"의 경계(before 칸 수). 이 이상은 새로 자란 칸.
  animateGain: boolean;
}) {
  const label = kind === "before" ? "전" : "후";
  return (
    <div className="mt-1.5 flex items-center gap-[5px]">
      <span className={`${styles.monoFont} w-[18px] text-[10px] text-[var(--ink-4)]`}>{label}</span>
      {Array.from({ length: SEGMENTS }, (_, i) => {
        let cls = styles.seg; // 빈 칸
        let isGain = false;
        if (i < filled) {
          if (kind === "before") {
            cls = `${styles.seg} ${styles.segWas}`;
          } else if (i < keepUntil) {
            cls = `${styles.seg} ${styles.segCur}`; // 유지칸(블루)
          } else {
            // 새 칸(레몬). animateGain일 때만 pop 애니메이션 클래스 부여.
            cls = animateGain
              ? `${styles.seg} ${styles.segGain}`
              : `${styles.seg} ${styles.segGainStatic}`;
            isGain = true;
          }
        }
        return (
          <i
            key={i}
            className={cls}
            {...(isGain ? { "data-testid": "coach-growth-gain" } : {})}
          />
        );
      })}
    </div>
  );
}

// 한 영역의 전/후 성장 막대.
export function GrowthRow({
  area,
  before,
  after,
  max = 20,
  animate = true,
}: {
  area: AreaName;
  before: number;
  after: number;
  max?: number;
  animate?: boolean;
}) {
  const { improved } = growthBar(before, after, max);
  const beforeSeg = toBarSegments(before, max, SEGMENTS);
  const afterSeg = toBarSegments(after, max, SEGMENTS);

  return (
    <div data-testid="coach-growth" data-area={area} className="my-[11px]">
      <div className="flex items-center justify-between text-[12.5px] font-semibold">
        <span>{area}</span>
        <span
          className={`${styles.monoFont} text-[11px] ${
            improved ? "text-[var(--pullim-blue)]" : "text-[var(--ink-5)]"
          }`}
        >
          {improved ? "▲ 자람" : "= 유지"}
        </span>
      </div>
      {/* 전: was 칸(연블루)만 */}
      <BarRow kind="before" filled={beforeSeg} keepUntil={beforeSeg} animateGain={false} />
      {/* 후: beforeSeg까지 cur(블루), 그 위 afterSeg까지 gain(레몬) */}
      <BarRow kind="after" filled={afterSeg} keepUntil={beforeSeg} animateGain={animate} />
    </div>
  );
}

// 여러 영역 묶음(완료 화면 baseline→final).
export default function GrowthBars({
  rows,
  max = 20,
  animate = true,
}: {
  rows: Array<{ area: AreaName; before: number; after: number }>;
  max?: number;
  animate?: boolean;
}) {
  return (
    <div>
      {rows.map((r) => (
        <GrowthRow
          key={r.area}
          area={r.area}
          before={r.before}
          after={r.after}
          max={max}
          animate={animate}
        />
      ))}
    </div>
  );
}
