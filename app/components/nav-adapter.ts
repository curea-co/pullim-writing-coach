import type { ReactNode } from "react";
import { NAV_ICONS } from "./nav-icons";

export interface NavLink {
  label: string;
  href: string;
}
export interface RailItem {
  label: string;
  href: string;
  icon?: ReactNode;
  active?: boolean;
}

export const NAV = [
  { label: "홈", href: "/" },
  { label: "글 바로 채점", href: "/try" },
  { label: "쓰기 과정 코칭", href: "/coach" },
  { label: "채점 결과 조회", href: "/results" },
  { label: "샘플 채점 결과", href: "/samples" },
  { label: "내 정보", href: "/me" },
  { label: "서비스 소개", href: "/about" },
] as const satisfies readonly NavLink[];

// NAV href 유니온 — NAV_ICONS가 이 유니온으로 exhaustive해야 하므로(아이콘 누락 시 빌드 깨짐).
export type NavHref = (typeof NAV)[number]["href"];

const PREFIX_MATCH = new Set(["/results", "/samples"]);

function isActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  if (PREFIX_MATCH.has(href)) return pathname === href || pathname.startsWith(href + "/");
  return pathname === href;
}

export function railItems(pathname: string): RailItem[] {
  // icon 필수 — 사이드바 collapsed 시 라벨이 숨고 아이콘만 남는다(아이콘 없으면 빈 칸).
  return NAV.map((n) => ({ label: n.label, href: n.href, icon: NAV_ICONS[n.href], active: isActive(n.href, pathname) }));
}

// 모바일 탭바 축약 라벨 — 풀 라벨 5개는 375px를 넘쳐 마지막 탭이 잘림(UX 점검 ⑦).
const TAB_LABELS: Partial<Record<NavHref, string>> = {
  "/try": "채점받기",
  "/coach": "코치",
  "/results": "결과",
  "/samples": "샘플",
};

// 모바일 탭바 순서 — 홈을 중앙(3번째)에 배치(2026-07-10 소유자 확정): [채점받기, 코치, 홈, 결과, 샘플].
//   NAV 순서(사이드바 rail은 홈이 첫 번째)와 의도적으로 다름 — 탭바는 엄지 중심 UX라 홈이 가운데.
const TAB_ORDER = ["/try", "/coach", "/", "/results", "/samples"] as const satisfies readonly NavHref[];

export function tabItems(pathname: string): RailItem[] {
  // Mobile bottom bar: the 5 primary content routes. 내 정보·서비스 소개 stay rail-only
  // (reachable on mobile via the home banner/closing CTA).
  return TAB_ORDER.map((href) => {
    const n = NAV.find((x) => x.href === href) as (typeof NAV)[number]; // TAB_ORDER ⊂ NAV(타입 보증)
    return {
      label: TAB_LABELS[href] ?? n.label,
      href,
      icon: NAV_ICONS[href],
      active: isActive(href, pathname),
    };
  });
}
