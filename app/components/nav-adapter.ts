export interface NavLink {
  label: string;
  href: string;
}
export interface RailItem {
  label: string;
  href: string;
  active?: boolean;
}

export const NAV: NavLink[] = [
  { label: "홈", href: "/" },
  { label: "직접 채점받기", href: "/try" },
  { label: "과정 코치", href: "/coach" },
  { label: "채점 결과 조회", href: "/results" },
  { label: "샘플 채점 결과", href: "/samples" },
  { label: "내 정보", href: "/me" },
  { label: "서비스 소개", href: "/about" },
];

const PREFIX_MATCH = new Set(["/results", "/samples"]);

function isActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  if (PREFIX_MATCH.has(href)) return pathname === href || pathname.startsWith(href + "/");
  return pathname === href;
}

export function railItems(pathname: string): RailItem[] {
  return NAV.map((n) => ({ label: n.label, href: n.href, active: isActive(n.href, pathname) }));
}

export function tabItems(pathname: string): RailItem[] {
  // Mobile bottom bar: the 5 primary content routes (홈/직접 채점/과정 코치/채점 결과/샘플).
  // 내 정보·서비스 소개 stay rail-only (reachable on mobile via the home banner/closing CTA).
  return NAV.slice(0, 5).map((n) => ({ label: n.label, href: n.href, active: isActive(n.href, pathname) }));
}
