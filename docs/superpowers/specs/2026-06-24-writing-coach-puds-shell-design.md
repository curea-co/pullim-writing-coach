# writing-coach → PUDS Dashboard Shell Migration — Design

> 2026-06-24 · 상태: 승인됨(brainstorming) → 구현계획 대기
> repo: `pullim-writing-coach` (단일 Next 16 + React 19 + Tailwind v4 앱, npm). 브랜치 `feat/puds-shell` (off `main`).
> 의존: PUDS 레지스트리(`https://pullim-design-system.vercel.app/r/{name}.json`, 67 아이템, shadcn v4)

## 목표
풀림 라이팅 코치의 셸 크롬(`Sidebar` + `app/layout.tsx`)을 PUDS `@puds/DashboardShell`로 교체하고 토큰을 PUDS **pullim-os**로 통일하여 풀림 디자인 시스템과 일관된 룩을 갖게 한다. 단일 표면(역할 분기 없음).

## 결정 (brainstorming 합의, 2026-06-24)
1. **통일 pullim-os, 라이트/다크 토글 제거.** `data-theme="pullim-os"` 정적 지정, 기존 인라인 FOUC 테마 스크립트 + `ThemeToggle` + `pwc_theme_v1` 로직 제거(다크모드 손실 수용 — classbot과 동일 결정).
2. **service-switcher 미설치.** 단일 서비스 → 서비스 스위처 불필요. (덤으로 알려진 PUDS radix/cross-import 버그 회피.)
3. **모바일 내비 = OsTabbar.** 기존 햄버거 드로어를 `OsTabbar`로 대체(모바일 내비 보존).
4. **도메인 토큰 유지.** 루브릭 점수 밴드 `--band-*`, `--accent-gap/-mid` 등 콘텐츠 시맨틱은 그대로. 크롬 토큰만 PUDS로 리매핑.

## 현황 사실 (탐색)
- 단일 Next 앱(app/ 루트), npm(package-lock.json), Tailwind v4. **shadcn 미설정**(components.json 없음).
- `app/layout.tsx`: `<html data-theme=...>`(인라인 스크립트가 light/dark 적용, localStorage `pwc_theme_v1`), `<body class="bg-background text-foreground">`, `<div md:flex>` `<Sidebar/>` + content. 폰트는 `<head>`의 CDN `<link>`(Pretendard + Bai Jamjuree + JetBrains Mono) — next/font 미사용.
- `app/components/Sidebar.tsx`: `"use client"`, 커스텀 nav(`NavLinks`: 홈 `/`, 직접 채점받기 `/try`[실시간], 과정 코치 `/coach`[베타], 채점 결과 조회 …), `cn` from `@/app/lib/utils`, `ThemeToggle`. 데스크톱 좌측 사이드바 + 모바일 상단바+드로어.
- 토큰: 자체 어휘 — `@theme`에서 `--color-background: var(--bg)`, `--color-foreground: var(--fg)`, `--color-surface/--muted/--border/--primary` 등 + 도메인 `--band-*`/`--accent-*` + additive "Pullim 브랜드(blue+lemon)" 블록. globals.css 주석: "apps/web 이관 시 @pullim/design-system 토큰으로 대체" — 이행 의도 명시.
- `cn`은 `app/lib/utils.ts`(tailwind-merge).
- 워킹트리에 무관한 `package-lock.json` 수정 + untracked `.claude/`,`.mise.toml` 존재 — 커밋에 포함 금지.

## 1. PUDS 소비 설정
- 최소 `components.json` 생성(Tailwind v4, cssVariables, aliases: `utils` → `@/app/lib/utils` 유지) + `registries: { "@puds": "https://pullim-design-system.vercel.app/r/{name}.json" }`.
- `npx shadcn@latest add @puds/theme-puds @puds/dashboard-shell @puds/os-rail @puds/os-tabbar @puds/page-header @puds/service-hero @puds/section-head @puds/service-icon` → `app/tokens/*`, `components/ui/*`, `lib/cn.ts` 설치. (service-switcher 제외.)
- PUDS 컴포넌트는 `@/lib/cn` import → `lib/cn.ts` 설치 + tsconfig `@/*` 매핑 확인. writing-coach 자체 컴포넌트는 `@/app/lib/utils` 유지(공존).

## 2. 토큰 이행 (통일 pullim-os)
- `app/tokens/_base.css` + `pullim-os.css`를 `globals.css`에서 `@import`(맨 위 `@import "tailwindcss"` 다음). **PUDS `_base.css`의 CDN 폰트 `@import url(...)` 라인 제거**(writing-coach가 이미 `<link>`로 폰트 로드 — classbot과 동일한 dev-500 회피).
- `app/layout.tsx`: `<html ... data-theme="pullim-os">` 정적 지정. 인라인 FOUC 테마 스크립트, `suppressHydrationWarning`(테마 mismatch 사유 해소 시), `ThemeToggle` 제거.
- writing-coach 크롬 토큰을 PUDS 값으로 리매핑: `--bg → var(--surface-canvas)`, `--surface → var(--surface-raised)`, `--fg → var(--text-primary)`, `--fg-muted → var(--text-secondary)`, `--fg-subtle → var(--text-tertiary)`, `--border → var(--border-default)`, `--muted → var(--surface-sunken)`, `--primary → var(--color-primary-600)`, `--primary-fg → #ffffff`. (이로써 기존 `bg-background`/`text-foreground`/`bg-muted` 등 유틸이 자동 pullim-os 리스킨.)
- 도메인 토큰(`--band-good/normal/warn` + surface/fg, `--accent-gap/-mid` + surface) 및 additive 브랜드 블록은 유지.
- 다크 관련 토큰/블록은 제거 또는 휴면(정적 pullim-os가 라이트 강제).

## 3. 셸 교체
- `app/layout.tsx`를 `@puds/DashboardShell` 합성으로 재작성: `brand`({title:"풀림", sub:"라이팅 코치"} 또는 기존 로고 노드), `rail`=`<OsRail head="둘러보기" items=...>`, `tabbar`=`<OsTabbar items=...>`(모바일), children=content. `Sidebar`/`ThemeToggle`는 더 이상 layout에서 사용 안 함.
- 내비 데이터: 기존 `Sidebar`의 링크 목록을 prop 데이터로 추출(`NAV` 배열: {label, href, icon?, active(pathname)} — 홈/직접 채점받기/과정 코치/채점 결과 …). active는 `usePathname`(layout이 client가 되거나, nav를 감싸는 client 컴포넌트로 분리). 뱃지("실시간"/"베타")는 OsRail item의 label 노드에 포함하거나 생략(YAGNI — v1은 라벨만, 뱃지는 후속).
- `Sidebar.tsx`는 제거하거나 미사용으로 둠(layout이 더 이상 import 안 하면 dead). grep로 다른 사용처 확인 후 제거.

## 4. 테스트 · 검증
- `npm run typecheck`(또는 `tsc --noEmit`) 클린.
- `npx vitest run`(writing-coach는 vitest 사용) — 기존 테스트 통과(셸 관련 테스트 있으면 갱신).
- `npm run build` 통과.
- dev 스모크: `/`, `/try`, `/coach`가 PUDS 셸 + pullim-os로 렌더, CSS 에러 없음(특히 @import 순서).

## 5. 범위
- PUDS 소비 설정 + 통일 pullim-os 토큰 이행 + `app/layout.tsx`/`Sidebar` 셸을 `@puds/DashboardShell`로 교체 + 모바일 OsTabbar + 빌드/검증.

## 6. 비범위
- 다크모드(제거, 수용) · 모바일 드로어(OsTabbar로 대체) · 루브릭/채점 콘텐츠 UI(무관) · PUDS 업스트림 버그 수정(별도) · 라이팅 코치 도메인 로직.

## 7. 위험 / 유의
- **다크모드 손실(수용).** ThemeToggle 제거 후 참조하던 컴포넌트가 깨지지 않도록 정리.
- **data-theme 충돌 해소:** 기존 light/dark 값 대신 정적 `pullim-os`. 인라인 스크립트/`suppressHydrationWarning` 제거로 hydration mismatch 사유도 제거.
- **PUDS _base.css CDN 폰트 @import → dev 500** (Turbopack): 설치본에서 해당 라인 제거(로컬 픽스, classbot과 동일). 업스트림 버그로 별도 기록됨.
- **워킹트리 오염 주의:** 무관한 `package-lock.json` 수정/`.claude/`를 커밋에 넣지 말 것.
- **프로덕션 앱:** `main` 기반 feature 브랜치 + PR + CI 통과 후 머지. 배포 전 시각 점검.
