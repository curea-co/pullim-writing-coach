"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { OsRail } from "@/components/ui/os-rail";
import { OsTabbar } from "@/components/ui/os-tabbar";
import { ServiceIcon } from "@/components/ui/service-icon";
import { railItems, tabItems } from "./nav-adapter";
import { AuthProvider, useAuth } from "@/app/lib/use-auth";
import { loginUrl, logoutUrl, signupUrl, osHubUrl } from "@/app/lib/pullim-login";

// os.pullim.ai 헤더 우측 정합(실측 스펙): 아이콘 38·radius11·#45555c · pill h42·radius12·#f4faff/#0362da · 앱런처 36 · 간격 6.
const ICON_BTN =
  "flex h-[38px] w-[38px] items-center justify-center rounded-[11px] text-[#45555c] transition-colors hover:bg-[var(--surface-sunken,#eef1f6)]";
// 미연결(준비 중) 아이콘 버튼 — 시각적으로 비활성 명시(클릭 가능한 컨트롤로 오인 방지).
//   모바일에선 숨김(hidden md:flex) — 기능 없는 컨트롤로 좁은 헤더를 차지하지 않게(UX 점검 ⑪).
const DISABLED_ICON_BTN =
  "hidden h-[38px] w-[38px] items-center justify-center rounded-[11px] text-[#45555c] opacity-40 cursor-not-allowed md:flex";
const PILL =
  "flex h-[42px] items-center rounded-[12px] bg-[#f4faff] px-3.5 text-[13px] font-semibold text-[#0362da] transition-colors hover:bg-[#e6f1ff]";

function HeaderActions() {
  const { status, user } = useAuth();
  const name = user?.displayName ?? user?.email ?? user?.name;
  // 로그인/회원가입/로그아웃은 중앙 SSO(pullim-web)로 리다이렉트 — 클릭 시점에 현재 URL을 redirect로.
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
        <>
          <span className="px-1.5 text-[13px] font-semibold text-[var(--text-secondary)]">{name}</span>
          <button type="button" onClick={() => { window.location.href = logoutUrl(); }} className="flex h-[42px] items-center rounded-[12px] px-3 text-[13px] font-semibold text-[var(--text-tertiary)] transition-colors hover:bg-[var(--surface-sunken,#eef1f6)]">로그아웃</button>
        </>
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
