# Pullim Writing Coach

학생이 **수행평가 안내서와 자기 글**을 입력하면, AI가 **글쓰기 과정을 코치**하는 교육 서비스입니다.<br/>
안내서 해석 → 개요/본문 작성 보조 → 5영역 채점 → 수정 가이드까지, **결과가 아니라 과정**을 돕습니다.<br/>
핵심 불변식 = **대필 0** — AI는 글을 대신 써주지 않고, 학생이 직접 쓰도록 안내합니다.

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
