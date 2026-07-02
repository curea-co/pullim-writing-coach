"use client";
import * as React from "react";
import { cn } from "@/lib/cn";
import { OsTabbar, type TabbarItem } from "./os-tabbar";
import { RailCollapseProvider } from "./rail-collapse-context";

export type BrandProp =
  | React.ReactNode
  | { logo?: React.ReactNode; title: string; sub?: string; href?: string };

export interface DashboardShellProps {
  brand: BrandProp;
  switcher?: React.ReactNode;
  actions?: React.ReactNode;
  rail?: React.ReactNode;
  tabbar?: TabbarItem[] | React.ReactNode;
  /** Controlled collapsed state. Omit (with onToggleCollapsed) to let the shell self-manage + persist. */
  collapsed?: boolean;
  /** Controlled toggle handler. If omitted, the shell self-manages collapse internally. */
  onToggleCollapsed?: () => void;
  as?: "main" | "div";
  linkComponent?: React.ElementType;
  children: React.ReactNode;
  className?: string;
}

function isBrandObject(
  b: BrandProp,
): b is { logo?: React.ReactNode; title: string; sub?: string; href?: string } {
  return typeof b === "object" && b !== null && "title" in b;
}

function Brand({ brand, linkComponent }: { brand: BrandProp; linkComponent: React.ElementType }) {
  if (!isBrandObject(brand)) return <>{brand}</>;
  const { logo, title, sub, href = "/" } = brand;
  const Link = linkComponent;
  return (
    <Link href={href} className="flex items-center gap-2 text-[var(--text-primary)] no-underline">
      {logo}
      {/* os.pullim.ai 정합: 풀림 17px extrabold + 서비스명을 중립 pill 배지로 */}
      <span className="text-[17px] font-extrabold tracking-[-.02em]">{title}</span>
      {/* whitespace-nowrap — 모바일에서 "라이팅 코치"가 2줄로 꺾이던 것 방지(UX 점검 ⑨). */}
      {sub && (
        <span className="whitespace-nowrap rounded-md bg-[var(--surface-sunken,#eef1f6)] px-2 py-0.5 text-[12px] font-semibold text-[var(--text-secondary)]">
          {sub}
        </span>
      )}
    </Link>
  );
}

export function DashboardShell({
  brand,
  switcher,
  actions,
  rail,
  tabbar,
  collapsed: collapsedProp,
  onToggleCollapsed,
  as = "main",
  linkComponent = "a",
  children,
  className,
}: DashboardShellProps) {
  // Controlled when `collapsed` is provided (standard value-driven control); the handler is optional.
  const controlled = collapsedProp !== undefined;
  const [internal, setInternal] = React.useState(false);
  React.useEffect(() => {
    if (controlled) return;
    try {
      setInternal(localStorage.getItem("puds-rail-collapsed") === "1");
    } catch {
      /* ignore */
    }
  }, [controlled]);
  const collapsed = controlled ? !!collapsedProp : internal;
  const toggle = controlled
    ? (onToggleCollapsed ?? (() => {}))
    : () =>
        setInternal((v) => {
          try {
            localStorage.setItem("puds-rail-collapsed", v ? "0" : "1");
          } catch {
            /* ignore */
          }
          return !v;
        });
  const tabbarNode = Array.isArray(tabbar) ? <OsTabbar items={tabbar} linkComponent={linkComponent} /> : tabbar;
  const Content = as;
  return (
    <RailCollapseProvider collapsed={collapsed}>
      <div className={cn("min-h-screen bg-[var(--surface-canvas)] text-[var(--text-primary)]", className)}>
        <header className="sticky top-0 z-40 flex h-[60px] items-center gap-4 border-b border-[var(--border-default)] bg-[var(--surface-raised)] px-4">
          <Brand brand={brand} linkComponent={linkComponent} />
          {switcher}
          <div className="flex-1" />
          {actions}
        </header>
        <div className="flex w-full">{/* full-width: 사이드바는 좌측 고정, 중앙 정렬 안 함(os.pullim.ai 정합) */}
          {rail && (
            <aside className="sticky top-[60px] hidden h-[calc(100vh-60px)] shrink-0 border-r border-[var(--border-subtle)] md:block">
              <div className="relative h-full w-max">
                <div className="h-full overflow-y-auto">{rail}</div>
                <button
                  type="button"
                  onClick={toggle}
                  aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
                  aria-expanded={!collapsed}
                  className="absolute right-0 top-5 z-30 hidden h-7 w-7 translate-x-1/2 items-center justify-center rounded-full border border-[var(--border-default)] bg-[var(--surface-raised)] text-[var(--text-tertiary)] shadow-[var(--shadow-md)] transition-colors duration-200 hover:border-[var(--color-action-primary)] hover:text-[var(--color-action-primary)] md:flex"
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="15"
                    height="15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className={cn("transition-transform duration-200", collapsed && "rotate-180")}
                  >
                    <path d="m15 6-6 6 6 6" />
                  </svg>
                </button>
              </div>
            </aside>
          )}
          <Content className="min-w-0 max-w-[1180px] flex-1 px-6 py-8 pb-24 md:pb-8">{children}</Content>
        </div>
        {tabbarNode}
      </div>
    </RailCollapseProvider>
  );
}
