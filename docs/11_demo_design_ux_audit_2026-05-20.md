# Pullim Writing Coach 데모 — 디자인·UX writing audit

> 작성일: 2026-05-20
> 작성자: 최선혜 (Education Product Owner)
> 대상: `pullim-writing-coach-demo` (https://pullim-demo.vercel.app)
> 기준: `.claude/pullim-agent-docs` — fe-stack / fe-styling / fe-components / fe-patterns / fe-i18n
> 목적: 데모를 pullim 프로덕션 프런트(`apps/web`) 기준에 맞춰 점검하고, standalone에서 가능한 수정을 적용

---

## 0. 범위·전제

- 본 데모는 **standalone Vercel 프로젝트**(throwaway 프로토타입)다. pullim 모노레포(`apps/web`)가 아니다.
- 따라서 일부 기준(`@pullim/design-system` 컴포넌트, next-intl i18n 인프라, Container/Presenter, 모노레포 경로)은 **standalone에선 충족 불가**다 — 이관 시 필수로 분류한다.
- standalone에서도 충족 가능한 기준(시맨틱 토큰, `cn()`, mobile-first, 인라인 style, 톤·카피)은 **즉시 수정** 대상이다.
- 판정: ✅ 통과 / ⚠️ 부분 / ❌ 위반 / 🔒 standalone 제약(이관 시 필수)

---

## 1. 디자인 audit (fe-styling · fe-components · fe-stack · fe-patterns)

| # | 기준 | 판정 | 현재 상태 | 조치 |
|---|---|---|---|---|
| D1 | **하드코딩 컬러 금지 → 시맨틱 토큰** (fe-styling) | ❌→✅ | `bg-slate-50`, `text-slate-900`, `bg-emerald-500`, `bg-rose-50` 등 전 파일 하드코딩. `getScoreColor()`도 `bg-emerald-500` 반환 | **수정 적용** — globals.css `@theme`에 시맨틱 토큰 정의 후 전 파일 치환 |
| D2 | **조건부 클래스 `cn()` 사용** (fe-styling) | ❌→✅ | 템플릿 문자열로 조합(CATEGORY_STYLES, isMax/isMin, BAND_TEXT_CLASS) | **수정 적용** — `lib/utils.ts`(clsx+twMerge) 추가 후 `cn()`로 전환 |
| D3 | **인라인 style 금지** (fe-styling) | ⚠️ | 점수 막대 `style={{ width: ... }}` 1곳 | **조건부 유지** — 데이터 기반 동적 width는 Tailwind로 표현 불가한 정당 예외. CSS 변수+주석으로 명시 |
| D4 | **`@pullim/design-system` 컴포넌트 1순위** (fe-components) | 🔒 | raw `<button>`/`<div>`/`<h1>` 사용 | **이관 시 필수** — DS는 비공개 GitHub 패키지라 standalone 설치 불가. apps/web 이관 시 Button·Heading·Text·Separator로 교체 |
| D5 | **Container/Presenter 패턴** (fe-patterns) | 🔒 | page가 직접 렌더 | **이관 시 적용** — 데모 규모상 과함. 이관 시 분리 |
| D6 | **mobile-first base→md:→lg:** (fe-styling) | ⚠️→✅ | `sm:` 사용(기준 표엔 md:가 태블릿) | **수정 적용** — `sm:` → `md:` 정렬 |
| D7 | **아이콘 `@pullim/design-system/icons`(lucide)** (fe-components) | ⚠️ | 이모지(⚠) 사용 | **경미** — standalone은 lucide-react 직접 허용. 이관 시 DS icons로 |
| D8 | **폰트 — DS 토큰/next/font** | ⚠️ | globals.css 외부 CDN `@import`(Pretendard) | **경미** — 데모 허용. 이관 시 제거(DS 폰트 토큰 사용) |
| D9 | **Tailwind v4 + `@theme` 토큰** (fe-stack) | ✅ | Tailwind v4 사용, `@theme` 블록 존재 | 통과 (D1로 토큰 보강) |
| D10 | **Next.js 16 App Router** (fe-stack) | ✅ | Next.js 16.2 App Router, 정적 생성 | 통과 |

---

## 2. UX writing audit (fe-i18n + 톤·마이크로카피 기준)

> 톤 기준: functional_spec §3 F5(학생 대상 존댓말·1문장 60자 권장·코칭 톤) + wireframe v.3 §7 마이크로카피

| # | 기준 | 판정 | 현재 상태 | 조치 |
|---|---|---|---|---|
| U1 | **모든 사용자 대면 텍스트 i18n 처리** (fe-i18n) | 🔒 | 전 텍스트 하드코딩. next-intl·ko.json/en.json 없음 | **이관 시 필수** — 한국어 전용 데모라 i18n 인프라는 과함. 이관 시 `messages/ko.json`+`en.json`으로 추출, `t()` 적용 |
| U2 | **존댓말·코칭·비지적 톤** (F5) | ✅ | 전 feedback·UI 카피 존댓말 유지(06 v.4 검수 통과) | 통과 |
| U3 | **1문장 60자 권장** (F5) | ⚠️ | 일부 feedback_fix 2~3문장·100자 초과(데모는 06 v.4 데이터 상속) | **알려진 의제** — functional_spec §3 F5 룰 성격 확정(박승훈 freeze 의제). 데모는 데이터 원본을 따름 |
| U4 | **면책 문구 노출·일치** (spec §4.2) | ✅ | "이 채점은 AI 자동 채점입니다…" 홈·상세 노출, disclaimer 문자열 일치 | 통과 |
| U5 | **영역 편차 안내 카피** (wireframe §7) | ✅ | "⚠ 영역 편차가 큽니다 — 총점보다 영역별 피드백을 먼저 보세요" — wireframe 문구와 일치 | 통과 |
| U6 | **영역명 일관성('성장 가능성')** | ✅ | '개선 가능성' 잔재 없음, 전면 '성장 가능성' | 통과 |
| U7 | **샘플 출처 윤리 표기** | ✅ | A·B·C 논문 인용·발췌 / D·E 작성 — 홈 푸터·상세 주석 노출 | 통과 |
| U8 | **버튼·내비 카피 명료성** | ✅ | "결과 복사하기"/"다른 샘플 보기"/"샘플 목록으로"/"복사됨 ✓" — 동작 명확·존댓말 | 통과 |

---

## 3. standalone 한계 — apps/web 이관 시 필수 (🔒)

| 항목 | 이관 시 작업 |
|---|---|
| D4 DS 컴포넌트 | raw 태그 → `Button`/`Heading`/`Text`/`Separator`/`Skeleton` 등 `@pullim/design-system` |
| D5 Container/Presenter | `app/{route}/page.tsx`(Suspense+Container) / `containers/` / `presenters/` 분리 |
| D7 아이콘 | 이모지 → `@pullim/design-system/icons` |
| U1 i18n | 텍스트 → `messages/ko.json`+`en.json`, `useTranslations`/`getTranslations`, toast 포함 |
| 경로/Export | `@/*` alias, named default export, 상대경로 금지 |
| 검증 | `pnpm typecheck && format:check && lint` + Jest/RTL 테스트 |

> 데모의 화면 구성·카피·점수 시각화 로직은 이관 시 그대로 재사용 가능하다. 본 audit의 D1·D2·D6 수정으로 토큰·유틸·반응형은 미리 기준에 맞춰 둔다.

---

## 4. 적용한 수정 / 보류

**즉시 수정 적용 (standalone 가능):**
- D1 시맨틱 토큰 — globals.css `@theme`에 `--color-background/foreground/muted-foreground/primary/border/destructive` + 점수 밴드 토큰(`--color-band-good/normal/warn`) 정의, 전 파일·`getScoreColor()` 치환
- D2 `cn()` — `lib/utils.ts`(clsx+tailwind-merge) 추가, 조건부 클래스 전환
- D3 인라인 style — 점수 막대 동적 width만 정당 예외로 유지(주석)
- D6 mobile-first — `sm:` → `md:`

**보류 (이관 시):** D4·D5·D7·D8·U1 (§3)

**알려진 의제(데이터 원본):** U3 60자 룰 — 박승훈 freeze 의제

---

## 5. 종합

| 영역 | 통과 | 부분/경미 | 위반→수정 | standalone 제약 |
|---|---:|---:|---:|---:|
| 디자인 | 2 (D9·D10) | 3 (D3·D7·D8) | 3→✅ (D1·D2·D6) | 2 (D4·D5) |
| UX writing | 5 (U2·U4~U8) | 1 (U3) | 0 | 1 (U1) |

**결론**: standalone에서 충족 가능한 디자인 기준(시맨틱 토큰·cn()·mobile-first) 위반 3건을 즉시 수정. UX writing은 톤·면책·용어·출처 모두 통과, i18n 인프라만 이관 시 과제. DS 컴포넌트화·Container/Presenter·i18n은 apps/web 이관 시 필수 작업으로 명시.

### 다음 작업
- [x] 디자인 audit ✅
- [x] UX writing audit ✅
- [ ] D1·D2·D6 수정 적용 + 재배포
- [ ] (이관 시) §3 6항목 — apps/web 이식 작업으로 별도 등록
