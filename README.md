# Pullim Writing Coach

학생이 **수행평가 안내서와 자기 글**을 입력하면, AI가 **글쓰기 과정을 코치**하는 교육 서비스입니다.<br/>
개요/본문 작성부터 채점, 그리고 수정까지, **결과가 아니라 과정**을 돕습니다.<br/>
AI는 글을 대신 써주지 않고, 학생이 직접 쓰도록 안내합니다.

> 🔗 **운영**: https://writing.pullim.ai/
>
> 과정 코치(`/coach`)는 접속 비밀번호 입력 후 체험할 수 있고, 5종 학생 글 샘플(`/samples`)의 채점 결과는 비밀번호 없이 공개로 볼 수 있습니다.
>
> 이 리포는 Vercel과 연결돼 `main` 브랜치에 push하면 자동으로 프로덕션 배포됩니다.

---

## 사용자 동선 (과정 코치 — `/coach`)

```
홈 [내 글 코치받기]
  ↓
1. 데모 비밀번호 (TokenGate)
  ↓
2. 과제 입력 (MetaForm — 학년·과목·장르·과제 안내. 목표 분량은 코치에서 미사용 → 숨김)
  ↓
3. 모드 선택 (자유 쓰기 · 가이드 · 개요 먼저 활성 / 말하기는 준비 중)
   ├─ 자유 쓰기
   ├─ 가이드 (질문 따라)  → 장르별 가이드 질문
   └─ 개요 먼저           → 개요 패널 → 개요→본문 전환
  ↓
4. 작성 캔버스(RichEditor)에서 본문 작성 → 코치 점검 (/api/coach)
  ↓
5. 코칭 — 영역 점수 · 우선순위 넛지 · 성취 막대(GrowthBars) · 고쳐쓰기 과정 로그
```

> 안내서 6채널 캡처(`UniversalCapture`)·라이브 추출(`/api/extract`)·`AssignmentCard`, 그리고 5영역 채점 결과 뷰(`/results`·`/samples`)는 컴포넌트·API로 구현돼 있으나 **현재 `/coach` 동선에는 직접 배선되지 않았습니다**(별도 화면/후속 통합 대상).

---

## 채점 5영역 (rubric v0.5)

| 영역 | 평가 |
|---|---|
| 과제 이해 | 과제 조건·질문에 정확히 답했는가 |
| 내용 충실도 | 근거·예시·배경지식이 충분한가 |
| 구조·논리 | 서론-본론-결론·문단 연결·전개가 자연스러운가 |
| 표현·문장 | 문장 호흡·어휘·맞춤법·표현 다양성이 적절한가 |
| 성장 가능성 | 한 번의 수정으로 완성도가 오를 수 있는 상태인가 |

각 영역 0~20점, 총 100점. 색상 가이드: 0~9 주의 / 10~14 보통 / 15~20 양호.

## 데모에 담긴 5종 샘플 (anchor)

| 샘플 | 학년·과목·장르 | 총점 | 구간 |
|---|---|---:|---|
| D | 중1 도덕 논설문 (자율) | 40 | 토대 보강 필요 |
| C | 고3 국어 설명문 (시계) | 61 | 기본 토대 (영역 편차 8점) |
| A | 중2 국어 설명문 (화산) | 74 | 기본 토대 |
| E | 고1 국어 감상문 (광야) | 85 | 보완하면 좋은 글 |
| B | 고3 사회 설명문 (영해·EEZ) | 86 | 보완하면 좋은 글 |

> `/samples`의 5종 결과는 채점 분포를 보여주는 **고정 anchor**입니다. 실제 사용자 입력은 아래 라이브 채점 API로 처리됩니다.

---

## API 엔드포인트 (라이브)

| 메서드·경로 | 기능 | 모델 |
|---|---|---|
| `POST /api/extract` | 수행평가 안내서 라이브 추출(구조화) | Claude Haiku 4.5 |
| `POST /api/score` | 라이브 채점 — 5영역 0~100점 + 수정 가이드 | Claude Haiku 4.5 |
| `POST /api/coach` | 과정 코치 상호작용 응답 | Claude Haiku 4.5 |

- 모든 라우트는 `x-demo-token` 게이트(상수시간 비교)로 보호됩니다.
- rate limit(`middleware.ts`, user/IP 2단, 분당): `/api/score`·`/api/extract` = user 10·IP 60 · `/api/coach` = user 20·IP 120.

### 환경변수 (`.env.example` 참고)

| 변수 | 용도 |
|---|---|
| `ANTHROPIC_API_KEY` | 추출·채점 모델 호출에 필요. 선택 — 미설정 시 `/api/coach`는 mock으로 동작, 추출·채점만 비활성 |
| `DEMO_ACCESS_TOKEN` | 데모 접근 비밀번호(서버 검증). 비어 있으면 API가 401 fail-closed → 사실상 필수 |
| `NEXT_PUBLIC_DEMO_TOKEN` | 설정 시 TokenGate 자동 입력(비번 0회 입장). ⚠ 번들 노출 → rate limit·예산 알람 필수 |
| `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` | 에러 모니터링 (미설정 시 no-op) |
| ~~`DATABASE_URL`~~ | **(2026-07-07 폐기 — RDS 전환)** per-user 계정 데이터 store는 Supabase 직결에서 **pullim-api KV 표면(`/writing/data`) relay**로 전환됨. 저장소는 pullim-api RDS `writing` 스키마, 접속 호스트는 `NEXT_PUBLIC_API_URL` 규칙을 따름. 런타임에서 더는 읽지 않음 — Vercel에 남아 있으면 제거 |
| ~~`DEMO_SESSION_SUB`~~ | **(2026-07-07 폐기 — RDS 전환)** 구 `getSessionSub` 데모 fallback용 sub. per-user store가 pullim-api KV relay로 전환되며 `getSessionSub` 제거 → 소비처 없음. (제품 API 데모 게이트는 `DEMO_ACCESS_TOKEN`이 담당 — 별개) |

---

## 계정 데이터 store (per-user)

로그인 회원의 6종 데이터(프로필·결과·수정이력·임시저장·메타·동의)는 localStorage가 아니라 **계정 귀속 서버 저장**으로 전환됩니다. 로그인하면 다른 기기/브라우저에서도 같은 데이터가 보입니다. 게스트·로컬은 기존 localStorage 동작을 그대로 유지합니다.

- 동선: writing-coach 자체 Next API `/api/data/*`(BFF) → **pullim-api KV 표면 `/writing/data`**(세션 쿠키 + CSRF relay) → **pullim-api RDS `writing` 스키마**. 어댑터 = `app/lib/server/db.ts`.
- **저장소·마이그레이션은 pullim-api 소유**(ADR-068 — `writing.writing_user_data`). writing-coach 레포에는 더 이상 자체 DB 접속·마이그레이션이 없습니다(구 Supabase 직결 `DATABASE_URL`·`scripts/db-migrate.mjs`·`db/migrations/` 경로는 폐기 — RDS 전환).
- 접속 호스트는 `NEXT_PUBLIC_API_URL`(=`pullim-session.apiBase`)를 공유. Vercel Production에 남은 구 `DATABASE_URL`은 제거.

### 로컬 검증 한계 (host-only)

로컬에서는 access 쿠키가 api 호스트 전용(host-only)이라 writing-coach 서버에 도달하지 않습니다 → 계정 store path가 동작하지 않고 **localStorage 폴백**으로 떨어집니다. 따라서 로컬에서는 단위/컴포넌트 테스트(fetch·db·localStorage mock)로만 검증하며, 계정 store end-to-end는 **`dev-writing.pullim.ai`(+ `.pullim.ai` 쿠키)에서만 실증**합니다.

### Dev e2e 수용 절차

1. `dev-writing.pullim.ai` 로그인 → 채점.
2. **다른 브라우저/기기**로 로그인 시 동일 결과가 조회됨.
3. 게스트(미로그인)는 로컬(localStorage)만 사용.
4. `/me` "데이터 삭제"가 서버 계정 데이터(동의 포함 6종)까지 삭제됨.

> **선행**: 로그인 `#111` · Phase3 게이팅/refresh `#112` 머지 필요. `/me`가 안정 키 `sub`를 반환해야 합니다.

---

## 기술 스택

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** — 시맨틱 토큰(`@theme`) 기반, `cn()`(clsx + tailwind-merge) 유틸
- **TipTap** 리치 에디터 (작성 캔버스)
- **PUDS** dashboard shell — OS 스타일 홈·셸·네비게이션
- **Claude** (Haiku 4.5) — 추출·채점·코치. Messages API를 raw `fetch`로 호출(`app/lib/server/anthropic.ts`, `@anthropic-ai/sdk` 미사용)
- **Sentry** 에러 모니터링 (env 설정 시)
- 테스트: **Vitest**(컴포넌트) · Node `--test`(unit) · **Playwright**(e2e)
- 배포: **Vercel** (`main` push → 자동 프로덕션 배포)

> ⚠ 본 리포는 학습된 표준 Next.js와 다른 버전입니다 — 코드 작성 전 `node_modules/next/dist/docs/`의 관련 가이드와 `AGENTS.md`를 확인하세요.

## 로컬 실행

```bash
npm install
cp .env.example .env   # 키 입력 (아래 참고)
npm run dev            # http://localhost:3000
npm run build          # 프로덕션 빌드
```

> **최소 실행 조건**: `DEMO_ACCESS_TOKEN`을 설정하세요. `TokenGate`는 클라이언트 게이트라 화면 진입은 가능하지만, 비어 있으면 첫 API 호출이 401 fail-closed로 실패해 코치를 실제로 쓸 수 없습니다. 자동 입장하려면 `NEXT_PUBLIC_DEMO_TOKEN`도 같은 값으로 설정. `ANTHROPIC_API_KEY`는 선택 — 없으면 `/api/coach`는 mock으로 동작하고 추출·채점만 비활성됩니다.

### 테스트

```bash
npm run test:unit        # normalizeBody·validate·guards
npm run test:components  # Vitest + RTL
npm run test:e2e         # Playwright (/coach happy path + /try 위저드·채널 회귀)
npm run typecheck
```

## 디렉터리

```
app/
├── page.tsx                 # 홈 (PUDS OS 스타일)
├── coach/page.tsx           # ★ 과정 코치 메인 동선
├── try/page.tsx             # 레거시 채점 위저드 (과정 코치로 대체, 병행 유지)
├── samples/[id]/page.tsx    # 5종 샘플 채점 결과 anchor
├── results/[id]/page.tsx    # 채점 결과 뷰
├── me/page.tsx              # 프로필·사용 현황
├── teacher/                 # 교사 도구 (루브릭·과정 로그)
├── api/
│   ├── extract/route.ts     # 안내서 추출
│   ├── score/route.ts       # 채점
│   └── coach/route.ts       # 코치 상호작용
├── components/
│   ├── coach/               # 과정 코치 UI (셋업·모드선택·캔버스·가이드·개요·넛지)
│   ├── editor/              # TipTap 리치 에디터
│   └── app-shell.tsx        # PUDS 셸
├── lib/                     # 추출·채점·코치·가드·프로필·동의 순수 모듈
├── data/samples.ts          # 5종 샘플 입력·출력 데이터
└── tokens/                  # 디자인 토큰
docs/                        # 기획·전략·설계 산출물 (01~29 + Daily/)
```

## 기획·전략 문서 (docs/)

초기 기획(01~13)부터 전략 전환(20~29)까지. 전체는 `docs/` 참고.

| # | 문서 | 내용 |
|---|---|---|
| 02 | [functional_spec v0.3](docs/02_functional_spec_v.3_2026-05-19.md) | 입력/출력 스키마·화면 명세 |
| 04 | [rubric v0.5](docs/04_rubric_v.5_2026-05-19.md) | 5영역×5구간 채점 기준 |
| 08 | [ai_prompt v0.2](docs/08_ai_prompt_v.2_2026-05-22.md) | 채점 프롬프트 + 강제 룰 |
| 12 | [api_contract score v0.1](docs/12_api_contract_score_v.1_2026-05-22.md) | `POST /api/score` 계약 |
| 13 | [scoring_philosophy](docs/13_scoring_philosophy_decision_2026-05-22.md) | EPO 분포 상향 채점 철학 |
| 21 | [revamp_strategy](docs/21_revamp_strategy_2026-06-08.md) | 평가기 → 과정 코치 전환 전략 |
| 23 | [product_strategy v2](docs/23_product_strategy_v2_process_coach_2026-06-08.md) | 과정 코치 제품 전략 v2 |
| 25 | [implementation_plan](docs/25_implementation_plan_process_coach_2026-06-08.md) | 과정 코치 구현 계획 |
| 27 | [new_ux_flow_phase_plan](docs/27_new_ux_flow_phase_plan.md) | 새 UX flow Phase·PR 묶음 |

---

## 샘플 출처 · 윤리 표기

데모의 학생 글 본문 중 **샘플 A·B·C**는 아래 연구에 수록된 중·고등학생의 정보 전달 글(설명문)을
**인용·발췌**한 것입니다. 학년·과목·과제 맥락 등 메타데이터는 채점 시연을 위해 부여한 것으로
원 연구의 분류와 다를 수 있습니다. **샘플 D·E**는 시연용으로 새로 작성한 글입니다.

> 김은태 & 정혜린. (2024). 설명문 쓰기 수업에 대한 국어 교사의 실천적 지식 탐구 - 3년간의 설명하는 글쓰기 수업 및 평가를 중심으로. 국어교육학연구, 59(3), 5-38.
>
> 김경환. (2021). 중ㆍ고등학생 글에 나타난 작문 능력 - 정보 전달 글을 중심으로. 한국어문교육, 37, 89-129.

> ※ 채점 결과는 AI 자동 채점입니다. 학교 교사의 실제 채점과 다를 수 있습니다.
