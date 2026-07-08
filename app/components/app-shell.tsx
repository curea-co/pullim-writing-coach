"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { OsRail } from "@/components/ui/os-rail";
import { OsTabbar } from "@/components/ui/os-tabbar";
import { ServiceIcon } from "@/components/ui/service-icon";
import { railItems, tabItems } from "./nav-adapter";
import { AuthProvider, useAuth } from "@/app/lib/use-auth";
import { loginUrl, signupUrl, osHubUrl } from "@/app/lib/pullim-login";

// os.pullim.ai 헤더 우측 정합(실측 스펙): 아이콘 38·radius11·#45555c · pill h42·radius12·#f4faff/#0362da · 앱런처 36 · 간격 6.
const ICON_BTN =
  "flex h-[38px] w-[38px] items-center justify-center rounded-[11px] text-[#45555c] transition-colors hover:bg-[var(--surface-sunken,#eef1f6)]";
// 미연결(준비 중) 아이콘 버튼 — 시각적으로 비활성 명시(클릭 가능한 컨트롤로 오인 방지).
//   모바일에선 숨김(hidden md:flex) — 기능 없는 컨트롤로 좁은 헤더를 차지하지 않게(UX 점검 ⑪).
const DISABLED_ICON_BTN =
  "hidden h-[38px] w-[38px] items-center justify-center rounded-[11px] text-[#45555c] opacity-40 cursor-not-allowed md:flex";
const PILL =
  "flex h-[42px] items-center rounded-[12px] bg-[#f4faff] px-3.5 text-[13px] font-semibold text-[#0362da] transition-colors hover:bg-[#e6f1ff]";
// os.pullim.ai 사용자 배지 정합(os-tokens.css .avatar): 36원형·화이트 700/14 이니셜·파랑 그라디언트(#1F89F5→#004BB9)·sh-1.
const AVATAR =
  "flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(135deg,#1F89F5,#004BB9)] text-[14px] font-bold text-white shadow-[0_1px_2px_rgba(13,26,31,.04),0_1px_3px_rgba(13,26,31,.06)] cursor-pointer";

// 이름 첫 글자(이모지/한글 안전 — Array.from). 이름 없으면 브랜드 폴백 '풀'.
function initialOf(name: string): string {
  const t = (name ?? "").trim();
  return t ? Array.from(t)[0] : "풀";
}

function HeaderActions() {
  const { status, user, logout } = useAuth();
  const name = user?.displayName ?? user?.email ?? user?.name ?? "";
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 외부 클릭·Escape로 메뉴 닫기(OsTopbar 동형).
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [menuOpen]);

  // 로그인/회원가입은 중앙 SSO(pullim-web)로 리다이렉트. 로그아웃은 아바타 메뉴 안에서 POST /auth/logout(useAuth).
  return (
    <div className="flex items-center gap-1.5">
      {/* 검색·알림: 아직 기능 미연결 — disabled "준비 중"(클릭해도 무동작인 컨트롤로 오인 방지). */}
      <button type="button" aria-label="검색 (준비 중)" title="검색 — 준비 중" disabled className={DISABLED_ICON_BTN}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></svg>
      </button>
      <button type="button" aria-label="알림 (준비 중)" title="알림 — 준비 중" disabled className={DISABLED_ICON_BTN}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>
      </button>
      {status === "loading" ? null : status === "error" ? (
        // 인증 서버가 응답한 5xx(장애) — 미로그인으로 위장하지 않고 중립 표시(로그인 버튼 X).
        <span className="px-1.5 text-[13px] font-medium text-[var(--text-tertiary)]" title="인증 서버 연결 오류 — 잠시 후 다시 시도해 주세요">연결 오류</span>
      ) : status === "authed" ? (
        // os.pullim.ai 사용자 배지 — 아바타(이니셜) + 드롭다운(신원·로그아웃). OsTopbar 패턴 정합.
        <div ref={menuRef} className="relative ml-0.5">
          <button type="button" aria-haspopup="menu" aria-expanded={menuOpen} aria-label={`${name || "사용자"} 메뉴`} onClick={() => setMenuOpen((o) => !o)} className={AVATAR}>
            {initialOf(name)}
          </button>
          {menuOpen && (
            <div role="menu" aria-label="사용자 메뉴" className="absolute right-0 top-[calc(100%+8px)] z-[120] w-[min(260px,92vw)] overflow-hidden rounded-[14px] border border-[var(--line,#e6eaf0)] bg-[var(--surface,#fff)] shadow-[0_8px_28px_rgba(13,26,31,.14)]">
              <div className="border-b border-[var(--line,#e6eaf0)] px-4 py-3.5">
                <span className="block truncate text-[14px] font-bold text-[var(--text-primary,#1a1f27)]">{name || "회원"}</span>
                <span className="mt-0.5 block text-[12px] text-[var(--text-tertiary,#8a94a3)]">로그인됨</span>
              </div>
              <div className="p-1.5">
                <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); void logout(); }} className="block w-full rounded-[8px] px-3 py-2.5 text-left text-[14px] font-medium text-[var(--text-secondary,#45555c)] transition-colors hover:bg-[var(--surface-sunken,#eef1f6)]">로그아웃</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <button type="button" onClick={() => { window.location.href = loginUrl(); }} className={PILL}>로그인</button>
          <button type="button" onClick={() => { window.location.href = signupUrl(); }} className={PILL}>회원가입</button>
        </>
      )}
      <a href={osHubUrl()} aria-label="풀림 OS" title="풀림 OS" className="ml-0.5 flex h-9 w-9 items-center justify-center rounded-[11px] bg-[var(--color-action-primary)] text-white no-underline">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>
      </a>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <AuthProvider>
      <DashboardShell
        brand={{ logo: <ServiceIcon name="writing" size={32} />, title: "풀림", sub: "라이팅 코치", href: "/" }}
        rail={<OsRail head="둘러보기" items={railItems(pathname)} linkComponent={Link} />}
        tabbar={<OsTabbar items={tabItems(pathname)} linkComponent={Link} />}
        actions={<HeaderActions />}
        as="div"
        linkComponent={Link}
      >
        {children}
      </DashboardShell>
    </AuthProvider>
  );
}
