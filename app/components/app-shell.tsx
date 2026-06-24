"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { OsRail } from "@/components/ui/os-rail";
import { OsTabbar } from "@/components/ui/os-tabbar";
import { ServiceIcon } from "@/components/ui/service-icon";
import { railItems, tabItems } from "./nav-adapter";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    setCollapsed(localStorage.getItem("puds-rail-collapsed") === "1");
  }, []);
  const toggleCollapsed = () =>
    setCollapsed((v) => {
      localStorage.setItem("puds-rail-collapsed", v ? "0" : "1");
      return !v;
    });
  return (
    <DashboardShell
      brand={{ logo: <ServiceIcon name="writing" size={28} />, title: "풀림", sub: "라이팅 코치", href: "/" }}
      rail={<OsRail head="둘러보기" items={railItems(pathname)} collapsed={collapsed} linkComponent={Link} />}
      tabbar={<OsTabbar items={tabItems(pathname)} linkComponent={Link} />}
      as="div"
      linkComponent={Link}
      collapsed={collapsed}
      onToggleCollapsed={toggleCollapsed}
    >
      {children}
    </DashboardShell>
  );
}
