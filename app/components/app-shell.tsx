"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/ui/dashboard-shell";
import { OsRail } from "@/components/ui/os-rail";
import { OsTabbar } from "@/components/ui/os-tabbar";
import { ServiceIcon } from "@/components/ui/service-icon";
import { railItems, tabItems } from "./nav-adapter";
import { SsoAuthButton } from "./SsoAuthButton";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <DashboardShell
      brand={{ logo: <ServiceIcon name="writing" size={28} />, title: "풀림", sub: "라이팅 코치", href: "/" }}
      actions={<SsoAuthButton />}
      rail={<OsRail head="둘러보기" items={railItems(pathname)} linkComponent={Link} />}
      tabbar={<OsTabbar items={tabItems(pathname)} linkComponent={Link} />}
      as="div"
      linkComponent={Link}
    >
      {children}
    </DashboardShell>
  );
}
