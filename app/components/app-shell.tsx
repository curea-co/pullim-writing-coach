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

function AuthActions() {
  const { status, user, logout } = useAuth();
  if (status !== "authed")
    return (
      <Link href="/login" className="text-sm font-semibold text-[var(--color-action-primary)]">
        로그인
      </Link>
    );
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-[var(--text-secondary)]">{user?.displayName ?? user?.email}</span>
      <button
        type="button"
        onClick={() => void logout()}
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
