# 27 — 새 UX flow Phase 4 분리 + PR 묶음 plan (2026-06-08)

## Sprint 개요

- **기간**: 2026-06-08 ~ 06-15 (7.5 day)
- **목표**: v2 패러다임(안내서 입력 → 분기 → 쓰기/평가)을 v1 prod에 완전 통합
- **결정 사항 (09:30 사용자 입력 — 2026-06-08)**:
  - v1↔v2 관계 = **완전 교체** (`/try` ScoreForm·MetaForm 폐기)
  - 진입점 = **홈 Hero CTA 교체** (`[직접 채점받기]` → `[내 글 채점받기]`)
  - 4단계 콘텐츠 = **v2 mock 그대로 재사용** (출시 후 EPO 고도화)
  - 출시 범위 = **Phase 1+2+3+4 전체** (4단계는 mock으로 fill)

## 새 사용자 동선

```
홈 [내 글 채점받기]
  ↓
1. 데모 비밀번호 (TokenGate — 기존 v1 컴포넌트 유지)
  ↓
2. 수행평가 안내서 입력 (UniversalCapture 6채널)
  ↓
3. AI 추출 → AssignmentCard (신뢰도 칩 + 인라인 수정)
  ↓
4. 분기: [이미 글 있어요] / [아직 안 썼어요]
  ├─ A) [이미] → UniversalCapture (학생 글) → /api/score → 결과
  └─ B) [아직] → /prepare 4단계 wizard → 완성 글 → /api/score → 결과
```

## Phase 1 — 안내서 입력 + 추출 + 카드 (6/8~6/9, 2 day)

### 산출물
- `app/lib/extract.ts` (안내서 추출 프롬프트·검증·정규화)
- `app/lib/anthropic.ts` (모델 호출 단일 모듈)
- `app/lib/extract-client.ts` (FE → /api/extract 래퍼)
- `app/api/extract/route.ts` (라이브 추출 + x-demo-token 게이트)
- `app/components/UniversalCapture.tsx` (6채널 캡처)
- `app/components/AssignmentCard.tsx` + `ConfidenceChip.tsx` (추출 결과 카드)
- 단위 테스트 — `scripts/extract.test.mjs` (validateExtractRequest/Output, finalizeExtraction)

### PR 분리 (3 PR)
| PR | 변경 | 의존 | 회귀 영향 |
|---|---|---|---|
| **A** lib 수평 이식 | extract.ts + anthropic.ts + extract-client.ts | grading.ts (이미 존재) | 0 (신규 파일만) |
| **B** /api/extract 신설 | route.ts + 단위 테스트 | A 머지 후 | 0 (신규 라우트) |
| **C** UI 컴포넌트 | UniversalCapture + AssignmentCard + ConfidenceChip | B + ScoreForm 무관 | 0 (홈에 아직 안 붙임) |

### 결정 잠금
- `extract.ts` TARGET_MIN/MAX: 10~5000 (memory `score-route-fetch-divergence` 사전 결정 — "교사 값 그대로 표시" 정책 채택)
- `/api/extract` 에러 envelope: `errorEnvelope("E-CAP")` 통일 (rate limit 적용 시 PR #65와 일관)

## Phase 2 — 분기 화면 + 홈 진입점 (6/10, 1 day)

### 산출물
- `app/components/ModeSelector.tsx` ("이미 글 있어요" / "아직 안 썼어요" 두 카드)
- `app/coach/page.tsx` 신설 — 안내서 입력 + 분기 흐름 전체 호스트
- 홈 `page.tsx` Hero CTA 텍스트 + href 교체 (`/try` → `/coach`)
- 홈 floating CtaBand 동일 교체
- sessionStorage 키 정의 (`pwc_coach_assignment`, `pwc_coach_mode`)

### PR 분리 (2 PR)
| PR | 변경 | 의존 | 회귀 영향 |
|---|---|---|---|
| **D** /coach 페이지 + ModeSelector | Phase 1 컴포넌트 결합 | Phase 1 머지 후 | 0 (신규 라우트) |
| **E** 홈 CTA 교체 + 기존 /try deprecation 안내 | `app/page.tsx` 변경 + `/try` 페이지에 "이 경로는 곧 닫혀요" 안내 배너 | D 머지 후 | 기존 사용자 동선 — /try 직접 진입자에게 안내 노출 |

### `/try` 처리 결정
- **완전 교체 정책**에 따라 `/try`는 deprecation 단계로:
  - 6/10 PR E: `/try` 상단에 "곧 새 흐름으로 통합돼요" 배너 + `[새 흐름으로 이동]` 링크
  - 6/13 Phase 4 PR: `/try` 제거 + redirect to `/coach`
- ScoreForm 통합 테스트 9건(PR #57) — `/coach` 동선의 채점 부분에 재활용 가능. 회귀는 Phase 4에서 보장.

## Phase 3 — 쓰기 과정 4단계 wizard (6/11~6/12, 2 day)

### 산출물 (v2 mock 그대로)
- `app/coach/prepare/page.tsx` 신설 (v2 `/prepare/page.tsx` 그대로 이식)
- `app/components/AssistantBubble.tsx` (코치 메시지 버블)
- 4단계 콘텐츠 = v2 mock 메시지 (1=과제 해석 / 2=개요 / 3=조건 체크 / 4=초안 피드백)
- 단계별 navigation (Next/Prev, sessionStorage 진행 상태 보존)
- 마지막 단계 "글 완성하기" → Phase 4로 넘김 (학생이 작성한 글이 sessionStorage에 저장)

### PR 분리 (2 PR)
| PR | 변경 | 의존 | 회귀 영향 |
|---|---|---|---|
| **F** AssistantBubble + 4-step wizard 골격 | 컴포넌트 + 페이지 | Phase 2 머지 후 | 0 (신규) |
| **G** mock 콘텐츠 + 완성 트리거 | wizard 내부 메시지 + sessionStorage commit | F 머지 후 | 0 |

### 출시 후 후속
- 4단계 콘텐츠 EPO 원본 작성 → 별도 PR (출시 후)
- `/api/coach` 라이브 코칭 (단계별 AI 메시지) → 별도 PR (출시 후)

## Phase 4 — 채점 결과 연결 + /try deprecation (6/13, 0.5 day)

### 산출물
- `app/lib/score-client.ts` (FE → /api/score 래퍼, v2 그대로 이식)
- `/api/score` 입력 계약 확장 — assignment에 prompt_text·target_char_count·conditions 등 포함
- `app/coach/evaluate/page.tsx` 신설 (학생 글 UniversalCapture + score-client 호출 + 결과 표시)
- 결과 화면은 기존 `app/components/ResultView.tsx` 재사용
- `/try` 제거 + `/coach`로 redirect (`app/try/page.tsx` → `<Redirect to="/coach" />`)

### PR 분리 (1 PR)
| PR | 변경 | 의존 | 회귀 영향 |
|---|---|---|---|
| **H** score-client + evaluate 페이지 + /try redirect | 기존 ResultView 재사용 | Phase 3 머지 후 | /try 직접 진입자 → /coach redirect |

### 회귀 검증
- 기존 `/api/score` 통합 테스트(PR #57의 9건) — score-client.ts 경유로 통과 보장
- 5종 샘플 채점 결과 (`/samples/[id]`) 영향 없음 (별도 경로)

## Phase 5 — 회귀 + dogfood (6/14~6/15, 1.5 day)

### 산출물
- E2E 시나리오 추가 — `/coach` 전체 흐름 (안내서 → 분기 → 4단계 또는 즉시 채점 → 결과) chromium + firefox + webkit
- Lighthouse 점수 회귀 체크 (홈·/coach·/coach/prepare)
- 다크모드 시각 회귀 (UniversalCapture·AssignmentCard·ModeSelector 신규)
- prod dogfood (대표님 + EPO 2회 이상)
- /try → /coach redirect 작동 검증

### PR 분리 (1~2 PR)
| PR | 변경 | 의존 | 회귀 영향 |
|---|---|---|---|
| **I** E2E + Lighthouse + 다크 회귀 픽스 | 테스트 + UI 정정 | H 머지 후 | 회귀 0 |
| **J** (선택) dogfood 피드백 반영 | UX 미세 조정 | I 머지 후 | dogfood 발견 사항 |

## 누적 표

| Phase | Day | 누적 day | 누적 PR | 출시 차단 여부 |
|---|---|---|---|---|
| 1 안내서+추출+카드 | 6/8~6/9 | 2 | 3 (A·B·C) | ✓ 필수 |
| 2 분기 화면+진입점 | 6/10 | 3 | 5 (D·E) | ✓ 필수 |
| 3 4단계 wizard (mock) | 6/11~6/12 | 5 | 7 (F·G) | ✓ 필수 (mock으로) |
| 4 채점 결과+/try 제거 | 6/13 | 5.5 | 8 (H) | ✓ 필수 |
| 5 회귀+dogfood | 6/14~6/15 | 7 | 9~10 (I·J) | 검증만 |

## 회귀 영향 (기존 v1 기능 유지)

| 영역 | 영향 |
|---|---|
| `/samples/[id]` (5종 샘플) | 0 — 별도 경로, /api/score 입력 계약 확장은 호환 (기존 필드 그대로 + 신규 옵셔널) |
| `/results` (LRU 결과 조회) | 0 — addResult 호출 위치만 evaluate 페이지로 이동 |
| `/me` (프로필) | 0 — 사용 안 함 (v2는 sessionStorage 기반이지만 v1 storage 어댑터는 그대로 작동) |
| `/about` | 0 |
| LNB Sidebar | "직접 채점받기" 라벨 → "내 글 채점받기" 교체 + href `/try` → `/coach` |
| 단위 테스트 (169) | 0 — 모든 기존 lib 유지 |
| 컴포넌트 테스트 (45) | ScoreForm 9건은 Phase 4에서 evaluate 흐름으로 재활용 |
| E2E (9) | /try 시나리오 → /coach 시나리오로 재작성 |

## 외부 의존 P0 (출시 차단 요인 — 본 sprint 외)

- Vercel Pro 이관 (대표님 6/5 결정 입력 필요)
- 도메인 alias
- 부모 인증·billing 통합
- Sentry prod 활성화
- Anthropic 월 예산 알람

→ 본 sprint 완료(6/15)와 무관하게 진행. 외부 의존 미해소 시 출시 형태가 데모 토큰 보호 상태로 제한.

## 다음 단계

오늘(6/8) 오전 3 — M3 W2 plan 재작성(`docs/28_m3_w2_plan_revised_2026-06-08.md`)에서 본 plan을 메인 sprint로 박고, 기존 W2 plan(`docs/21`)의 링크 추출·테스트 커버리지·로깅 항목을 W3 또는 출시 후로 이관.
