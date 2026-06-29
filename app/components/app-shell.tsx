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
import { loginUrl, logoutUrl } from "@/app/lib/pullim-login";

function AuthActions() {
  const { status, user } = useAuth();
  // 로그인/로그아웃은 중앙 SSO(os 호스트)로 리다이렉트 — 공유 .pullim.ai 쿠키는 중앙만 발급·정리.
  // guest만 로그인 버튼. loading은 표시 없음(깜빡임 방지), error(인증서버 장애)는 미로그인처럼 안 보이게 중립 표시.
  if (status === "loading") return null;
  if (status === "error")
    return <span className="text-[var(--text-tertiary)] text-sm" title="인증 서버 연결 오류 — 잠시 후 다시 시도해 주세요">연결 오류</span>;
  if (status === "guest")
    return (
      <button
        type="button"
        onClick={() => { window.location.href = loginUrl(); }}
        className="text-sm font-semibold text-[var(--color-action-primary)]"
      >
        로그인
      </button>
    );
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-[var(--text-secondary)]">{user?.displayName ?? user?.email ?? user?.name}</span>
      <button
        type="button"
        onClick={() => { window.location.href = logoutUrl(); }}
        className="text-[var(--text-tertiary)] hover:underline"
      >
        로그아웃
      </button>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <AuthProvider>
      <DashboardShell
        brand={{ logo: <ServiceIcon name="writing" size={28} />, title: "풀림", sub: "라이팅 코치", href: "/" }}
        rail={<OsRail head="둘러보기" items={railItems(pathname)} linkComponent={Link} />}
        tabbar={<OsTabbar items={tabItems(pathname)} linkComponent={Link} />}
        actions={<AuthActions />}
        as="div"
        linkComponent={Link}
      >
        {children}
      </DashboardShell>
    </AuthProvider>
  );
}
