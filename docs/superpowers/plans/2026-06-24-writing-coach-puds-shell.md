# writing-coach → PUDS Dashboard Shell — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace pullim-writing-coach's `Sidebar`/`layout` chrome with `@puds/DashboardShell` and migrate its tokens to the uniform PUDS pullim-os look.

**Architecture:** Consume the live `@puds` shadcn registry (install shell + tokens, no service-switcher). Set `data-theme="pullim-os"` statically and value-remap writing-coach's chrome tokens to PUDS values (palette already Pullim blue). A client `AppShell` composes `DashboardShell` with `OsRail`/`OsTabbar` fed by a nav adapter over the existing Sidebar links; the server `layout.tsx` renders it. Light/dark toggle removed.

**Tech Stack:** Next 16, React 19, Tailwind v4, shadcn 4.x, npm, vitest (components), Playwright (e2e).

## Global Constraints

- **Repo:** `pullim-writing-coach` (single app, npm). Branch `feat/puds-shell` (off `main`). Commands: `npm run <script>`, `npx shadcn`.
- **PUDS registry:** `https://pullim-design-system.vercel.app/r/{name}.json`, namespace `@puds`, shadcn ≥3.
- **Uniform pullim-os:** static `data-theme="pullim-os"` on `<html>`; remove the light/dark toggle + FOUC script (accepted dark-mode loss).
- **Token vocabulary:** PUDS CUDS tokens arrive via `@puds/theme-puds`. Remap writing-coach chrome tokens to them; KEEP domain tokens (`--band-*`, `--accent-gap/-mid`, additive brand block).
- **cn coexistence:** writing-coach cn is `@/app/lib/utils`; PUDS installs `lib/cn.ts` (consumed as `@/lib/cn` via `@/*`→`./*`). Both coexist.
- **No service-switcher** (single service) — avoids the known PUDS radix/cross-import bugs.
- **PUDS `_base.css` CDN font `@import` removal:** writing-coach loads fonts via `<head>` `<link>`; strip the CDN `@import url(...)` lines from the installed `_base.css` (Turbopack dev 500 otherwise).
- **Working tree hygiene:** an unrelated modified `package-lock.json` + untracked `.claude/`/`.mise.toml` exist — never `git add` them; commit only the files each task names.
- **Test-first** for the nav adapter.

---

## File Structure

```
components.json                       # NEW (minimal, + @puds registry)
app/globals.css                       # import PUDS tokens; remap chrome tokens
app/layout.tsx                        # server: data-theme=pullim-os, drop FOUC script + Sidebar; render <AppShell>
app/components/app-shell.tsx          # NEW client: composes @puds/DashboardShell
app/components/nav-adapter.ts         # NEW: Sidebar links → OsRail/OsTabbar items
app/components/nav-adapter.test.ts    # NEW (vitest)
app/tokens/_base.css, pullim-os.css   # NEW (installed; CDN @imports stripped from _base)
components/ui/<puds>.tsx, lib/cn.ts   # NEW (installed)
app/components/Sidebar.tsx            # removed if unused after layout rewrite
```

---

## Task 1: Consume PUDS — components.json + install

**Files:**
- Create: `components.json`

- [ ] **Step 1: Create `components.json`** at repo root:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": { "config": "", "css": "app/globals.css", "baseColor": "slate", "cssVariables": true },
  "iconLibrary": "lucide",
  "aliases": { "components": "@/components", "utils": "@/app/lib/utils", "ui": "@/components/ui", "lib": "@/lib", "hooks": "@/hooks" },
  "registries": { "@puds": "https://pullim-design-system.vercel.app/r/{name}.json" }
}
```

- [ ] **Step 2: Install the shell + tokens** (network; no service-switcher)

Run: `npx shadcn@latest add @puds/theme-puds @puds/dashboard-shell @puds/os-rail @puds/os-tabbar @puds/page-header @puds/service-hero @puds/section-head @puds/service-icon --yes`
Expected new: `app/tokens/{_base,pullim-os,pullim-jr}.css`, `components/ui/{dashboard-shell,os-rail,os-tabbar,page-header,service-hero,section-head,service-icon}.tsx`, `lib/cn.ts`. If shadcn offers to overwrite any EXISTING writing-coach file, DECLINE (it should only create new files). If it tries to write a `utils.ts`, decline (writing-coach keeps `app/lib/utils.ts`).

- [ ] **Step 3: Verify the imports resolve**

Run: `npm run typecheck`
Expected: no NEW errors from the installed `@puds` files (they import `@/lib/cn` → `./lib/cn.ts` via `@/*`; `dashboard-shell` imports `./os-tabbar`). Pre-existing writing-coach errors (if any) are not your regression — note them.

- [ ] **Step 4: Commit** (only the named files)

```bash
git add components.json components/ui lib/cn.ts app/tokens
git commit -m "feat: install @puds dashboard shell components + tokens"
```

## Task 2: Token migration — pullim-os, drop light/dark

**Files:**
- Modify: `app/globals.css`, `app/layout.tsx`, `app/tokens/_base.css`

- [ ] **Step 1: Strip CDN font `@import`s from the installed `_base.css`** — delete the two `@import url(...)` lines (Pretendard jsdelivr + Noto Serif KR googleapis) at the top of `app/tokens/_base.css` (writing-coach already loads fonts via `<head>` `<link>`; leaving them causes a Turbopack dev CSS 500).

- [ ] **Step 2: Import PUDS tokens** — in `app/globals.css`, immediately after `@import "tailwindcss";`, add:

```css
@import "./tokens/_base.css";
@import "./tokens/pullim-os.css";
```

- [ ] **Step 3: Remap chrome tokens** — in `app/globals.css`, replace the light `:root` chrome token VALUES (lines defining `--bg`/`--surface`/`--fg`/`--fg-muted`/`--fg-subtle`/`--border`/`--muted`/`--primary`/`--primary-fg`) with:

```css
  --bg: var(--surface-canvas);
  --surface: var(--surface-raised);
  --fg: var(--text-primary);
  --fg-muted: var(--text-secondary);
  --fg-subtle: var(--text-tertiary);
  --border: var(--border-default);
  --muted: var(--surface-sunken);
  --primary: var(--color-primary-600);
  --primary-fg: #ffffff;
```

(Leave the `@theme --color-*` mappings, the domain `--band-*`/`--accent-*` tokens, and the additive brand block unchanged. Leave the `[data-theme="dark"]` block in place but dormant — `data-theme="pullim-os"` won't match it.)

- [ ] **Step 4: Static theme + drop FOUC script** — in `app/layout.tsx`: set `<html lang="ko" data-theme="pullim-os" className="h-full antialiased">` (remove `suppressHydrationWarning`); delete the inline `<script dangerouslySetInnerHTML>` FOUC theme block (the `pwc_theme_v1` logic). Keep the font `<link>`s in `<head>`.

- [ ] **Step 5: Verify**

Run: `npm run typecheck` → clean.
Run: `npm run build` → succeeds (no CSS `@import`-order errors).

- [ ] **Step 6: Commit**

```bash
git add app/globals.css app/layout.tsx app/tokens/_base.css
git commit -m "feat: migrate writing-coach tokens to PUDS pullim-os (uniform, drop light/dark)"
```

## Task 3: Nav adapter (Sidebar links → OsRail/OsTabbar items)

**Files:**
- Create: `app/components/nav-adapter.ts`
- Test: `app/components/nav-adapter.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface NavLink { label: string; href: string }
  export interface RailItem { label: string; href: string; active?: boolean }
  export const NAV: NavLink[]
  export function railItems(pathname: string): RailItem[]
  export function tabItems(pathname: string): RailItem[]
  ```
  `NAV` mirrors the current Sidebar links (홈 `/`, 직접 채점받기 `/try`, 과정 코치 `/coach`, 채점 결과 조회 `/results`, 샘플 채점 결과 `/samples`, 내 정보 `/me`, 서비스 소개 `/about`). `railItems` = all NAV with active. `tabItems` = the first 4 (홈/직접 채점받기/과정 코치/채점 결과 조회) for the mobile bar. Active: exact match, plus prefix for `/results` and `/samples`. (Badges 실시간/베타 are dropped for v1 — OsRail items are label-only; flagged.)

- [ ] **Step 1: Write the failing test**

```ts
// app/components/nav-adapter.test.ts
import { describe, it, expect } from "vitest";
import { NAV, railItems, tabItems } from "./nav-adapter";

describe("nav-adapter", () => {
  it("NAV lists the writing-coach routes", () => {
    expect(NAV.map((n) => n.href)).toEqual(["/", "/try", "/coach", "/results", "/samples", "/me", "/about"]);
  });
  it("railItems marks home active only on exact /", () => {
    const items = railItems("/");
    expect(items.find((i) => i.href === "/")?.active).toBe(true);
    expect(items.find((i) => i.href === "/try")?.active).toBe(false);
  });
  it("railItems uses prefix match for /samples", () => {
    const items = railItems("/samples/a");
    expect(items.find((i) => i.href === "/samples")?.active).toBe(true);
    expect(items.find((i) => i.href === "/")?.active).toBe(false);
  });
  it("tabItems returns the first 4 routes", () => {
    expect(tabItems("/try").map((i) => i.href)).toEqual(["/", "/try", "/coach", "/results"]);
    expect(tabItems("/try").find((i) => i.href === "/try")?.active).toBe(true);
  });
});
```

- [ ] **Step 2: Run → FAIL**

Run: `npm run test:components -- nav-adapter`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `nav-adapter.ts`**

```ts
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
  return NAV.slice(0, 4).map((n) => ({ label: n.label, href: n.href, active: isActive(n.href, pathname) }));
}
```

- [ ] **Step 4: Run → PASS**

Run: `npm run test:components -- nav-adapter`
Expected: PASS (4).

- [ ] **Step 5: Commit**

```bash
git add app/components/nav-adapter.ts app/components/nav-adapter.test.ts
git commit -m "feat: writing-coach nav adapter (Sidebar links → OsRail/OsTabbar)"
```

## Task 4: AppShell client + layout rewrite

**Files:**
- Create: `app/components/app-shell.tsx`
- Modify: `app/layout.tsx`

**Interfaces:**
- Consumes: `DashboardShell` from `@/components/ui/dashboard-shell`, `OsRail` from `@/components/ui/os-rail`, `OsTabbar` from `@/components/ui/os-tabbar`; `railItems`/`tabItems` from `./nav-adapter`.

- [ ] **Step 1: Create `app/components/app-shell.tsx`**

```tsx
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
```

- [ ] **Step 2: Rewrite `app/layout.tsx` body** to render `<AppShell>` instead of the `Sidebar`+flex chrome. Replace the `import Sidebar from "./components/Sidebar";` with `import { AppShell } from "./components/app-shell";`, and replace the `<body>` content:

```tsx
      <body className="bg-background text-foreground min-h-full">
        <AppShell>{children}</AppShell>
      </body>
```

(Keep the `<head>` font `<link>`s and `metadata`. `layout.tsx` stays a server component; `AppShell` is the client boundary.)

- [ ] **Step 3: Remove the now-unused Sidebar** — grep `Sidebar` across the repo (`grep -rn "components/Sidebar" app --include=*.tsx`): if `app/layout.tsx` was its only importer, `git rm app/components/Sidebar.tsx`. If `ThemeToggle` is now unused too (grep `ThemeToggle`), `git rm app/components/ThemeToggle.tsx` and remove its test if any. If either is still referenced elsewhere, leave it.

- [ ] **Step 4: Verify**

Run: `npm run typecheck` → clean (no dangling `Sidebar`/`ThemeToggle` refs).
Run: `npm run test:components` → passes (nav-adapter + any existing component tests; remove/skip a Sidebar test if it existed and the component is gone).

- [ ] **Step 5: Commit**

```bash
git add app/components/app-shell.tsx app/layout.tsx app/components/Sidebar.tsx app/components/ThemeToggle.tsx
git commit -m "feat: writing-coach AppShell on @puds/DashboardShell; remove Sidebar + theme toggle"
```

## Task 5: Final verification

- [ ] **Step 1: Typecheck** — `npm run typecheck` → clean.
- [ ] **Step 2: Component tests** — `npm run test:components` → pass.
- [ ] **Step 3: Build** — `npm run build` → succeeds.
- [ ] **Step 4: Dev smoke** — `npm run dev` (default port), then confirm `/`, `/try`, `/coach`, `/samples` render on the PUDS DashboardShell (topbar brand "풀림 · 라이팅 코치", left OsRail "둘러보기" nav with the 7 links, mobile-width OsTabbar with 4 tabs) in the pullim-os look, with no CSS `@import`/console errors. Spot-check a domain page still shows its rubric band colors (domain tokens intact). Capture a screenshot. Stop the dev server.
- [ ] **Step 5: Commit** any visual fix; else nothing.

---

## Self-Review

**1. Spec coverage** (vs `2026-06-24-writing-coach-puds-shell-design.md`):
- §1 consume PUDS → Task 1. §2 token migration (import + strip CDN @imports + data-theme + drop FOUC/toggle + remap chrome, keep domain) → Task 2. §3 shell swap (DashboardShell + OsRail + OsTabbar mobile, remove Sidebar/ThemeToggle) → Tasks 3–4. §4 verification → Task 5.
- **Deviation:** nav badges (실시간/베타) dropped for v1 — `OsRail`/`OsTabbar` items are label-only (their `RailItem`/`TabbarItem` have no badge slot). Flagged; re-add via a future OsRail enhancement if wanted.
- **Decision:** `tabItems` = first 4 routes (홈/직접 채점받기/과정 코치/채점 결과 조회) for the mobile bar — a sensible primary set; the full 7 stay in the desktop rail.

**2. Placeholder scan:** components.json, token remap block, nav-adapter, app-shell, layout edit are all full code. The Sidebar/ThemeToggle removal is a precise grep-gated delete. No TBD.

**3. Type consistency:** `RailItem`/`NavLink` defined once in nav-adapter; `railItems`/`tabItems` shapes match `OsRail`'s `{head, items:[{label,href,active?}]}` and `OsTabbar`'s `TabbarItem[]`. `AppShell` brand object matches `DashboardShell`'s `BrandProp` ({title, sub, href}).

**Risk for executor:** `npx shadcn add @puds/*` needs network + shadcn ≥3 (writing-coach has shadcn? — it had NO components.json; `npx shadcn@latest` fetches the CLI, fine). If install writes an unexpected `utils.ts` or overwrites a file, decline. Keep the unrelated `package-lock.json`/`.claude` changes out of every commit.
