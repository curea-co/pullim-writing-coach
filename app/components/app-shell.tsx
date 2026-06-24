"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { OsRail } from "@/components/ui/os-rail";
import { OsTabbar } from "@/components/ui/os-tabbar";
import { railItems, tabItems } from "./nav-adapter";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <DashboardShell
      brand={{ title: "풀림", sub: "라이팅 코치", href: "/" }}
      rail={<OsRail head="둘러보기" items={railItems(pathname)} />}
      tabbar={<OsTabbar items={tabItems(pathname)} />}
    >
      {children}
    </DashboardShell>
  );
}
