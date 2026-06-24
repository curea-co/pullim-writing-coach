# writing-coach Home → OS-style Dashboard Redesign — Design

> 2026-06-24 · 승인됨(brainstorming) · branch `feat/puds-home-redesign` (off `feat/puds-shell`)
> 전제: PUDS shell 마이그레이션(PR #80) 위에서 동작 — `data-theme="pullim-os"`, DashboardShell, ServiceHero/SectionHead/ServiceIcon 설치됨.

## 목표
writing-coach 홈(`app/page.tsx`)을 마케팅 랜딩(hero/bento/stats/CTA)에서 **OS/classbot 스타일 대시보드 홈**으로 전면 개편한다. PUDS 컴포넌트(ServiceHero · SectionHead · ServiceTile · StatCard · Card · Badge · ServiceIcon)로 재구성, pullim-os 토큰 통일.

## 확정 PUDS API (탐색)
- `ServiceHero({ icon?, title, tagline?, badges?, cta? })`
- `SectionHead({ title, aside? })`
- `ServiceTile({ title, description, href, glyph?, cta?, soon? })` (`@puds/service-tile`)
- `StatCard({ label, value, delta?, trend? })` + `Card`/`CardTitle`/`CardDescription` (`@puds/card`)
- `Badge({ intent?, ... })` (`@puds/badge`)
- `ServiceIcon({ name, size? })` (설치됨) — name `"writing"` 존재.

## 추가 설치
`npx shadcn@latest add @puds/card @puds/badge @puds/service-tile --yes` (service-hero/section-head/service-icon 는 shell 단계에서 설치됨).

## 홈 레이아웃 (재구성, `app/page.tsx`)
1. **ServiceHero** — `icon={<ServiceIcon name="writing" size={56} />}`, `title="라이팅 코치"`, `tagline`=기존 hero 부제("학생이 쓴 글을 1분 안에 5영역으로 채점하고, 잘한 점·고칠 점·수정 가이드를 코칭 말투로 보여줘요."), `badges={<Badge>데모 · Week 1</Badge>}`, `cta`=직접 채점받기 `<Link href="/try">`(기존 primary CTA 스타일 유지).
2. **`<HomeWelcomeBanner />`** — 유지(프로필 인지 기능 보존, storage 로직 무수정). pullim-os 토큰으로 자동 리스킨.
3. **SectionHead "바로 시작"** + **ServiceTile 그리드**(2-up/4-up): 
   - `직접 채점받기` desc "글 붙여넣고 1분 안에 5영역 채점·첨삭" href `/try` cta "실시간"
   - `과정 코치` desc "개요→본문 단계별 코칭" href `/coach` cta "베타"
   - `샘플 채점 결과` desc "점수대 5케이스 미리보기" href `/samples`
   - `채점 결과 조회` desc "저장된 채점 결과 다시 보기" href `/results`
   - glyph는 ServiceIcon 또는 lucide 라인 아이콘(소비자 자유).
4. **SectionHead "한눈에"** + **StatCard 행**(4): 기존 STATS → `StatCard label value`(value는 ReactNode로 단위 포함, 예 `value={<>5<span className="…">영역</span></>}`). delta/trend는 데모라 생략.
5. **SectionHead "어떻게 채점하나요"** + **Card 그리드**(4): 기존 FEATURES → 각 `<Card>` 안 `CardTitle`+`CardDescription`+기존 `FeatureVisual` 미니뷰 유지. AI 자동채점 disclaimer 노트 유지.
6. **닫는 CTA** — `<Card>`(또는 ServiceHero 변형)로 기존 closing 카피 + 직접 채점받기/서비스 소개 링크.
7. **`<CtaBand />`** — 플로팅 유지(동작·spacer 보존).

## 보존(기능/콘텐츠)
- `HomeWelcomeBanner`(프로필 분기), `CtaBand`(플로팅+spacer+safe-area), `FeatureVisual`(도메인 band/accent 색 유지), AI 채점 disclaimer, 모든 nav 타깃(/try,/coach,/samples,/results,/about,/onboarding,/me).
- 도메인 토큰(`--band-*`/`--accent-*`)은 FeatureVisual에서 그대로.

## 검증
- `npm run typecheck` 클린, `npm run build` 성공(18+ routes), `npm run test:components` 통과, `/try` e2e 영향 없음.
- dev 스모크: `/`가 ServiceHero + ServiceTile 그리드 + StatCard 행 + Card 그리드로 렌더, pullim-os 룩, 콘솔/CSS 에러 없음.

## 범위
- 홈(`app/page.tsx`)만. + `@puds/card`,`badge`,`service-tile` 설치.

## 비범위
- `/try`,`/coach`,`/samples` 딥 리빌드(각각 별도 사이클) · `/results`,`/me`,`/about`,`/onboarding` · HomeWelcomeBanner/storage 로직 변경 · CtaBand 하드코딩 `bg-zinc-700`(추후 토큰화) · 채점/코치 엔진.

## 위험
- ServiceTile/StatCard 실제 props는 구현 시 설치본 재확인(위 시그니처 기준). · 홈 컴포넌트 테스트가 있으면 갱신. · feat/puds-shell 스택 브랜치 — PR은 base `feat/puds-shell`(또는 #80 머지 후 main으로 rebase).
