# 26 — v2 → v1 이식 인벤토리 (2026-06-08)

## 목적

새 UX flow sprint(6/8~6/15) Phase plan과 PR 분리의 기반 자료. v2(`C:\workspace\pullim-writing-coach_v2`)의 5 컴포넌트 + 4 페이지 + lib 7파일 중 v1 prod에 이식할 항목을 파일별 난이도와 함께 정리.

## 1. v2 컴포넌트 인벤토리

| 컴포넌트 | 책임 | 의존 | use client | LOC | 난이도 |
|---|---|---|---|---|---|
| `UniversalCapture.tsx` | 6채널 캡처 UI (사진·파일·붙여넣기·링크·음성·타이핑) | utils | ✓ | ~150 | 2 |
| `AssignmentCard.tsx` | 추출 과제 카드 표시·인라인 수정 | ConfidenceChip, grading | ✓ | ~200 | 2 |
| `ConfidenceChip.tsx` | 신뢰도 칩 (확정/추정, 점선/실선) | utils | ✓ | ~40 | 1 |
| `ModeSelector.tsx` | 준비/평가 분기 버튼 (🟦/🟥) | Link | ✓ | ~50 | 1 |
| `AssistantBubble.tsx` | 코치 메시지 버블 | utils | ✓ | ~60 | 1 |
| `DemoTokenModal.tsx` | 데모 비밀번호 모달 | demo-token | ✓ | ~80 | 2 |
| `GlobalNav.tsx` | 우측 상단 햄버거 메뉴 | Link, refs | ✓ | ~100 | 2 (v1 Sidebar와 다른 패턴) |
| `ThemeToggle.tsx` | 다크/라이트 토글 | localStorage | ✓ | ~50 | — (v1 동일 컴포넌트 이미 있음) |

## 2. v2 페이지 인벤토리

| 페이지 | 책임 | 호출 | 상태 | 난이도 |
|---|---|---|---|---|
| `page.tsx` (홈) | 안내서 capture → extract → ModeSelector 분기 | UniversalCapture, AssignmentCard, ModeSelector, DemoTokenModal, extract-client | useState(stage, captured, extracted) + sessionStorage | 3 |
| `/prepare/page.tsx` | 4단계 준비 코칭 (mock 메시지) | AssignmentCard, AssistantBubble | useState(step, outline, draft) + sessionStorage | 3 |
| `/evaluate/page.tsx` | 학생 글 capture → score → 결과 | UniversalCapture, AssignmentCard, score-client | useState(stage, writingText, output) + sessionStorage | 3 |
| `/about/page.tsx` | v1→v2 변경점 설명 | — | — | (이식 불필요 — v1 /about 이미 존재) |

**sessionStorage 키**: `pwc_v2_assignment`, `pwc_v2_assignment_raw`, `pwc_v2_demo_token`, `pwc_v2_theme`

## 3. v2 API Routes

| 라우트 | 입력 | 출력 | 외부의존 | timeout | 난이도 |
|---|---|---|---|---|---|
| `POST /api/extract` | `{raw_text, channel}` + `x-demo-token` | `ExtractedAssignment` (신뢰도 포함) | Claude Haiku | 55s | 4 |
| `POST /api/score` | `{assignment, submission}` + `x-demo-token` | `F3Output` (5영역) | Claude Haiku | 55s | 2 (v1 이미 존재, 입력 계약 확장) |

**공통**: x-demo-token 상수시간 비교(SHA256) · E1~E11/E-PARSE/E-AUTH/E4/E8/E-CAP 에러 모델 · JSON 파싱 실패 1회 재호출

## 4. v2 lib 인벤토리

| 파일 | 책임 | v1 존재? | 차이 | 난이도 |
|---|---|---|---|---|
| `extract.ts` | 안내서 추출 프롬프트·검증·정규화 | ✗ | 신규 (RAW_MIN=5, RAW_MAX=8000, TARGET_MIN=10, TARGET_MAX=5000) | 3 |
| `extract-client.ts` | FE → /api/extract 래퍼 | ✗ | 신규 | 3 |
| `score-client.ts` | FE → /api/score 래퍼 (`normalizeTarget` 50~2000 cap → null) | ✗ | 신규 | 3 |
| `anthropic.ts` | 서버 전용 모델 호출 (fetch+AbortController) | ✗ | 신규 (재사용성 ↑) | 3 |
| `demo-token.ts` | 세션 토큰 헬퍼 | ✗ | 신규 (v1은 TokenGate 자체 처리) | 1 |
| `grading.ts` | 5영역 채점 검증·에러 모델 | ✓ | **동일** (BODY_MAX=2000, TARGET 50~2000) | 1 (copy) |
| `prompt.ts` | 채점 프롬프트 (rubric) | ✓ v0.4 | v2 = v0.5 상향 (오타 저비중·on-task 강화·few-shot anchor 추가) | 3 (텍스트 diff) |
| `model-version.ts` | 모델 버전 상수 | ✓ v0.4 | v2 = v0.5 | 1 |
| `utils.ts` | cn() | ✓ | 동일 | — |

## 5. v2 핵심 새 패러다임 매핑

| 기능 | 구현 위치 |
|---|---|
| Universal Capture 6채널 | `components/UniversalCapture.tsx` |
| 안내서 자동 추출 | `api/extract/route.ts` + `lib/extract.ts` (Claude Haiku) |
| 과제 카드 + 신뢰도 칩 | `AssignmentCard.tsx` + `ConfidenceChip.tsx` (확정/추정, 인라인 수정) |
| 모드 분기 (이미 글 있음 / 아직 안 씀) | `ModeSelector.tsx` + 홈 `page.tsx` 3단계 |
| 준비 모드 4단계 코칭 | `app/prepare/page.tsx` (현재 mock 메시지) |
| 평가 모드 (학생 글 → 채점) | `app/evaluate/page.tsx` + `api/score` |
| 모드 간 상태 공유 | sessionStorage `pwc_v2_assignment` |

## 6. v1 ↔ v2 차이 핵심

| 항목 | v1 prod | v2 |
|---|---|---|
| 메인 flow | `/try` 단일 화면 wizard (Step 1·2·3) | 홈→안내서 capture→분기(준비/평가) |
| 안내서 입력 | 없음 (사용자가 MetaForm에 직접) | Universal Capture 6채널 → Claude 추출 → AssignmentCard |
| 분기 화면 | 없음 | `ModeSelector` (이미/아직) |
| 쓰기 코칭 | 없음 | `/prepare` 4-step wizard (현재 mock) |
| 채점 입력 | ScoreForm Step 2-3 (본문 + 메타 직접 입력) | `/evaluate` Universal Capture로 학생 글 캡처 |
| 상태 | localStorage(프로필 LRU·revision·result·meta·draft) | sessionStorage만 (프로필 없음) |
| 데모 토큰 | TokenGate 자체 처리 + `NEXT_PUBLIC_DEMO_TOKEN` 자동입장 | DemoTokenModal + `demo-token.ts` 헬퍼 |

## 7. 이식 전략 (의존 순서)

1. **lib 수평 이식** (extract.ts, anthropic.ts, extract-client.ts, score-client.ts, demo-token.ts) — Phase 1 commit 1
2. **API 라우트 추가** (`/api/extract` 신설, `/api/score` 입력 계약 확장) — Phase 1 commit 2
3. **컴포넌트 추가** (UniversalCapture, AssignmentCard, ConfidenceChip, ModeSelector, AssistantBubble, DemoTokenModal) — Phase 1 commit 3 + Phase 2 commit 1
4. **페이지 재구조화** (홈 흐름 또는 `/try` 흐름 진입점에 신설) — Phase 1 commit 4, Phase 2 commit 2
5. **prepare wizard** — Phase 3
6. **evaluate + 기존 채점 연결** — Phase 4
7. **회귀·dogfood** — 6/14~6/15

## 8. v1 기존 컴포넌트와의 충돌

| v1 컴포넌트 | 충돌 시나리오 | 처리 옵션 |
|---|---|---|
| `TokenGate` | 자체 비밀번호 입력 + `NEXT_PUBLIC_DEMO_TOKEN` 자동입장 — v2 DemoTokenModal과 책임 중복 | A) DemoTokenModal로 교체 / B) TokenGate에 모달 모드 추가 / C) v1 TokenGate 유지, v2 흐름은 그 안에서 시작 |
| `ScoreForm` | 단일 화면 wizard (Step 1·2·3) — v2 흐름의 안내서 입력·분기·캡처 책임과 중복 | A) ScoreForm 폐기 / B) ScoreForm은 "직접 입력" 빠른 경로로 유지 / C) ScoreForm 내부에 v2 단계 삽입 |
| `MetaForm` | 학년·과목·장르·분량 입력 폼 — v2 AssignmentCard 신뢰도 칩 + 인라인 수정으로 대체 가능 | A) MetaForm 폐기 / B) AssignmentCard 내부에 MetaForm 재사용 / C) 두 입력 동선 병존 |
| `Sidebar`(LNB) | "샘플 채점 결과" 등 v1 IA — v2엔 우측 GlobalNav. 두 IA 패턴 충돌 | A) Sidebar 유지, GlobalNav 미이식 / B) GlobalNav로 교체 / C) 두 패턴 병존 |
| `storage.ts`(localStorage 어댑터) | v1은 프로필·LRU·revision·result 보유. v2는 sessionStorage만 → 데이터 손실 | A) v2 흐름 진입 시 storage 그대로 / B) v2 캐시도 localStorage로 / C) 흐름별 분리 |

## 9. 환경변수

| 변수 | v1 현재 | v2 필요 | 비고 |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | ✓ | 그대로 | 추출·채점 공용 |
| `ANTHROPIC_MODEL` | ✓ | 그대로 | claude-haiku-4-5-20251001 |
| `DEMO_ACCESS_TOKEN` | ✓ (서버) | 그대로 | x-demo-token 검증 |
| `NEXT_PUBLIC_DEMO_TOKEN` | (prod 제거됨, 2026-06-04) | 선택 | 자동 입장 부활 시 재등록 |
| `NEXT_PUBLIC_USE_LIVE_SCORING` | ✓ | 그대로 | mock fallback toggle |
| `NEXT_PUBLIC_USE_LIVE_EXTRACTION` | ✗ | **추가** | 추출 mock toggle |

## 10. 누적 작업 추정

| Phase | 작업 | 누적 day | 누적 PR | 핵심 의존 |
|---|---|---|---|---|
| 1 | 안내서 + 6채널 + 추출 | 2 | 3~4 | extract.ts 신설 |
| 2 | 분기 화면 | 3 | 5 | sessionStorage 정합 |
| 3 | 쓰기 1~4단계 wizard | 5 | 8 | 콘텐츠 결정 필요 |
| 4 | 채점 결과 연결 | 5.5 | 9 | 기존 `/api/score` 재사용 |
| 회귀·dogfood | 6/14~6/15 | 7.5 | 11 | |

★ 외부 의존(Pro 이관·도메인·billing) 미해소 시 D-7(6/15) 완성돼도 출시 형태 제한.
