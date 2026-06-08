// Pullim Writing Coach — U5 코치 블록형 아이콘 (docs/27 ICON 세트 포팅)
//
// 어법: 블루 라운드 컨테이너(rect rx) + 화이트 도형 + 레몬 액센트(#E6FF4C).
//   순수 표현 컴포넌트 — 부수효과 없음. AreaName→아이콘 매핑은 AREA_ICON.
//   (lib가 아니라 components라 React import 허용. lib 순수성 규칙과 무관.)

import type { ReactNode } from "react";
import type { AreaName } from "@/app/data/scoring";

const BLUE = "#0362DA";
const WHITE = "#fff";
const LEMON = "#E6FF4C";

type IconName = "pen" | "decode" | "ask" | "loop" | "seal" | "grow" | "mark";

// 92x92 라운드 블루 배경 + inner 도형. r=컨테이너 모서리.
function Frame({ children, r = 20 }: { children: ReactNode; r?: number }) {
  return (
    <svg viewBox="0 0 100 100" width="100%" height="100%" aria-hidden="true">
      <rect x="4" y="4" width="92" height="92" rx={r} fill={BLUE} />
      {children}
    </svg>
  );
}

const SHAPES: Record<IconName, ReactNode> = {
  pen: (
    <>
      <g transform="rotate(45 50 50)">
        <rect x="45" y="22" width="10" height="40" fill={WHITE} />
        <rect x="45" y="62" width="10" height="10" fill={LEMON} />
      </g>
      <rect x="26" y="74" width="48" height="6" rx="3" fill={WHITE} />
    </>
  ),
  decode: (
    <>
      <rect x="30" y="32" width="11" height="11" rx="2" fill={WHITE} />
      <rect x="47" y="35" width="24" height="5" rx="2.5" fill={WHITE} />
      <rect x="30" y="50" width="11" height="11" rx="2" fill={LEMON} />
      <rect x="47" y="53" width="24" height="5" rx="2.5" fill={WHITE} />
      <rect x="30" y="68" width="11" height="11" rx="2" fill={WHITE} />
      <rect x="47" y="71" width="18" height="5" rx="2.5" fill={WHITE} />
    </>
  ),
  ask: (
    <>
      <rect x="24" y="26" width="52" height="36" rx="9" fill={WHITE} />
      <rect x="33" y="62" width="12" height="11" fill={WHITE} />
      <rect x="36" y="42" width="7" height="7" rx="1" fill={BLUE} />
      <rect x="47" y="42" width="7" height="7" rx="1" fill={BLUE} />
      <rect x="58" y="22" width="11" height="11" rx="2" fill={LEMON} />
    </>
  ),
  loop: (
    <>
      <path
        d="M70 40 A22 22 0 1 0 73 58"
        fill="none"
        stroke={WHITE}
        strokeWidth="7"
        strokeLinecap="round"
      />
      <path d="M60 28 L75 33 L66 45 Z" fill={LEMON} />
    </>
  ),
  seal: (
    <>
      <circle cx="50" cy="51" r="23" fill={WHITE} />
      <path
        d="M40 52 l7 8 14 -17"
        fill="none"
        stroke={BLUE}
        strokeWidth="7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="46" y="14" width="8" height="8" rx="2" fill={LEMON} />
    </>
  ),
  grow: (
    <>
      <rect x="26" y="58" width="13" height="18" rx="2" fill={WHITE} />
      <rect x="44" y="46" width="13" height="30" rx="2" fill={WHITE} />
      <rect x="62" y="32" width="13" height="44" rx="2" fill={LEMON} />
    </>
  ),
  mark: (
    <>
      <rect x="28" y="28" width="44" height="30" rx="8" fill={WHITE} />
      <rect x="38" y="58" width="10" height="9" fill={WHITE} />
      <rect x="40" y="40" width="20" height="5" rx="2.5" fill={BLUE} />
      <rect x="64" y="24" width="9" height="9" rx="2" fill={LEMON} />
    </>
  ),
};

// 모서리 r: pen/mark는 9, 나머지는 20 (프로토타입과 동일).
const RADIUS: Partial<Record<IconName, number>> = { pen: 9, mark: 9 };

export function BlockIcon({
  name,
  size = 30,
  className,
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={className}
      style={{ width: size, height: size, display: "inline-block", flex: "0 0 auto" }}
    >
      <Frame r={RADIUS[name]}>{SHAPES[name]}</Frame>
    </span>
  );
}

// 5영역 → 아이콘 이름. "성장 가능성"=grow.
export const AREA_ICON_NAME: Record<AreaName, IconName> = {
  "과제 이해": "decode",
  "내용 충실도": "ask",
  "구조·논리": "loop",
  "표현·문장": "pen",
  "성장 가능성": "grow",
};

// 풀림 OS 마스트헤드 글리프(원형 화이트 + 레몬 사각). 토픽바용.
export function MastGlyph({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
      <circle cx="50" cy="50" r="30" fill={WHITE} />
      <rect x="42" y="22" width="16" height="16" rx="4" fill={LEMON} />
    </svg>
  );
}
