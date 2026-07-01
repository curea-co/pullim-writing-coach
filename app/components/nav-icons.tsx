import type { ReactNode } from "react";

// 사이드바(OsRail)·탭바 아이콘 — 라우트 href → 라인 아이콘(currentColor, 24 viewBox).
//   OsRail이 [&_svg]로 19px 크기를 강제하므로 여기선 viewBox·stroke만 지정한다.
//   collapsed(사이드바 접힘) 시 라벨이 숨고 이 아이콘만 보인다.
const svgProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export const NAV_ICONS: Record<string, ReactNode> = {
  // 홈
  "/": (
    <svg {...svgProps}>
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10h5v-6h4v6h5V10" />
    </svg>
  ),
  // 직접 채점받기 — 펜(글쓰기)
  "/try": (
    <svg {...svgProps}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  ),
  // 과정 코치 — 대화(코칭)
  "/coach": (
    <svg {...svgProps}>
      <path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 21l2.1-5.4A8.5 8.5 0 1 1 21 11.5Z" />
    </svg>
  ),
  // 채점 결과 조회 — 리스트
  "/results": (
    <svg {...svgProps}>
      <path d="M8 6h12" />
      <path d="M8 12h12" />
      <path d="M8 18h12" />
      <path d="M4 6h.01M4 12h.01M4 18h.01" />
    </svg>
  ),
  // 샘플 채점 결과 — 문서 겹침(copy)
  "/samples": (
    <svg {...svgProps}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h8" />
    </svg>
  ),
  // 내 정보 — 유저
  "/me": (
    <svg {...svgProps}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
    </svg>
  ),
  // 서비스 소개 — 정보
  "/about": (
    <svg {...svgProps}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 7.6h.01" />
    </svg>
  ),
};
