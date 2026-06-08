# 28 — M3 W2 plan 재작성 (2026-06-08)

> **작성자**: 최선혜
> **작성일**: 2026-06-08 (월) — 09:30 work contract 후
> **M3 W2 기간**: 2026-06-09 (월) ~ 2026-06-15 (일, 출시 D-day)
> **선행 작성**: `docs/21_m3_w2_plan_2026-06-04.md` (대체) · `docs/26_v1v2_integration_inventory.md` · `docs/27_new_ux_flow_phase_plan.md`

## 1. 재작성 이유

`docs/21`은 링크 본문 추출·테스트 커버리지·로깅을 메인 sprint로 잡았으나, 6/5 대표님 보고에서 **새 UX flow 결정 입력**을 받음(안내서 → 분기 → 쓰기/평가). 이게 출시 차별화의 핵심이 됨에 따라 W2 메인 sprint를 새 UX flow로 교체. 기존 W2 항목은 W3 또는 출시 후로 이관.

## 2. W2 메인 sprint — 새 UX flow Phase 1~5

→ 상세 plan: `docs/27_new_ux_flow_phase_plan.md`

| 날짜 | Phase | 산출 | PR |
|---|---|---|---|
| 6/8~6/9 (월화) | Phase 1 안내서+추출+카드 | extract.ts·anthropic.ts·extract-client.ts·/api/extract·UniversalCapture·AssignmentCard·ConfidenceChip | A·B·C |
| 6/10 (수) | Phase 2 분기+진입점 | ModeSelector·/coach 페이지·홈 Hero CTA 교체 | D·E |
| 6/11~6/12 (목금) | Phase 3 4단계 wizard | AssistantBubble·/coach/prepare(v2 mock 그대로) | F·G |
| 6/13 (토) | Phase 4 채점+/try deprecation | score-client.ts·/coach/evaluate·/try → /coach redirect | H |
| 6/14~6/15 (일출시D-day) | Phase 5 회귀+dogfood | E2E·Lighthouse·다크 시각·prod dogfood | I·J |

**결정 잠금 (6/8 09:30)**:
- v1↔v2 = 완전 교체
- 진입점 = 홈 Hero CTA 교체
- 4단계 = v2 mock 그대로
- 출시 범위 = Phase 1+2+3+4 전체

## 3. 기존 W2 항목 이관 결정

| 항목 (docs/21) | 재배치 | 사유 |
|---|---|---|
| ① 링크 본문 추출 (D 채널) | **W3 또는 출시 후** | UniversalCapture 6채널 중 1개. Phase 1에서 5채널은 이식되지만 링크는 server fetch + readability 별도 작업. 데모는 5채널로 충분 |
| ② 컴포넌트·E2E 테스트 커버리지 확장 | **Phase 5에 흡수** (회귀 검증으로 일부) | 새 UX flow의 신규 컴포넌트 단위 테스트는 Phase 1~3 PR에 포함. 기존 v1 컴포넌트 커버리지 확장은 W3 |
| ③ 로깅 | **출시 후 별도 sprint** | Sentry는 이미 활성. breadcrumb·구조화 로그는 운영 데이터 수집 단계에서 도입 |
| Pro 이관 ①~③ 자력 단계 | **본 sprint 외 병렬** | 6/5 대표님 결정 따라 진행. 본 sprint 완료와 무관 |

## 4. W2 day별 산출 목표

| 날 | 메인 | 부가 | 검증 |
|---|---|---|---|
| 6/8 (월) | Phase 1 lib + API (PR A·B 진입) | docs/26·27·28 작성 ✓ | tsc + unit |
| 6/9 (화) | Phase 1 UI 컴포넌트 (PR C) + 단위 테스트 | extract.ts 회귀 5건 이상 | tsc + unit + components |
| 6/10 (수) | Phase 2 ModeSelector + /coach 페이지 + 홈 CTA 교체 (PR D·E) | /try deprecation 안내 배너 | tsc + unit + components |
| 6/11 (목) | Phase 3 AssistantBubble + 4-step 골격 (PR F) | sessionStorage 상태 머신 | tsc + unit |
| 6/12 (금) | Phase 3 mock 콘텐츠 + 완성 트리거 (PR G) | E2E /coach 시나리오 초안 | tsc + unit + components |
| 6/13 (토) | Phase 4 score-client + evaluate + /try redirect (PR H) | ResultView 재사용 검증 | tsc + unit + components + E2E |
| 6/14 (일) | Phase 5 E2E 3브라우저 + Lighthouse + 다크 시각 회귀 (PR I) | dogfood 1회 | 전체 회귀 |
| 6/15 (월 D-day) | dogfood 피드백 반영 + 미세 조정 (PR J 옵션) + prod 배포 | 출시 공지 안 (외부 의존 P0 따라) | prod 전수 검증 |

## 5. 외부 의존 P0 — 본 sprint와 병렬

본 sprint(코드)와 무관하게 진행:

- Vercel Pro 이관 (대표님 결정 6/5)
- 도메인 alias
- 부모 시스템 인증·billing 통합
- Sentry prod 알람
- Anthropic 월 예산 + auto-disable

→ 코드 sprint 6/15 완료돼도 외부 의존 미해소 시 출시 형태가 **NEXT_PUBLIC_DEMO_TOKEN 보호 데모** 상태로 제한. 완전 출시는 외부 의존 해소 후.

## 6. 회귀 보장 — 기존 169 unit + 45 components + 9 E2E

| 기존 자산 | 본 sprint 영향 | 보장 방법 |
|---|---|---|
| 169 unit (storage·grading·rate-limit·meta-usage 등) | 0 | 모든 lib 유지 |
| 45 components (ScoreForm·MetaForm·TextPreviewCard·Stepper·WhyScoreToggle) | ScoreForm 9건 — Phase 4에서 evaluate 흐름으로 재활용 | Phase 4 PR H에서 회귀 테스트 |
| 9 E2E (/try wizard chromium) | /try 시나리오 → /coach 시나리오 재작성 | Phase 5 PR I에서 3브라우저 매트릭스 |
| 5종 샘플 (`/samples/[id]`) | 0 — 별도 경로 | 시각 회귀만 |

## 7. 위험과 완화

| 위험 | 영향 | 완화 |
|---|---|---|
| Phase 1 lib·API 분량 과대 (난이도 4) | day 1~2 지연 | extract.ts 단위 테스트로 정합 빠르게 잡고, anthropic.ts는 v2 그대로 copy |
| 4단계 mock 콘텐츠가 dogfood에서 어색 | UX 불만 | 출시 후 EPO 원본 작성 PR을 별도로 약속 (PR 본문에 명시) |
| /try deprecation으로 기존 사용자 혼선 | 데모 사용자 0~10명 | 6/10~6/13 사이 안내 배너 + /coach redirect |
| 외부 의존 P0 미해소로 출시 형태 제한 | 데모만 노출 | 본 sprint와 별개로 진행, sprint 완료 자체는 보장 |
| E2E 3브라우저 매트릭스 webkit 불안정 | CI 빨간 | 로컬 검증 우선, CI는 chromium만 필수 |

## 8. 산출 문서 인덱스

- `docs/26_v1v2_integration_inventory.md` — 이식 인벤토리
- `docs/27_new_ux_flow_phase_plan.md` — Phase 분리 plan
- `docs/28_m3_w2_plan_revised_2026-06-08.md` — 본 문서 (W2 plan 재작성)
- (예정) `docs/29_phase1_extract_design.md` — Phase 1 진입 시 작성 (extract.ts 프롬프트 결정)
- (예정) `docs/30_coach_e2e_scenarios.md` — Phase 5 진입 시 작성 (3브라우저 시나리오)

## 9. 다음 step

오후 1 — Phase 1 첫 commit 진입. lib 수평 이식 PR A부터:

1. v2 `app/lib/extract.ts` → v1으로 copy (이미 v2 확인 완료, TARGET 정책 10~5000 보존)
2. v2 `app/lib/anthropic.ts` → v1으로 copy
3. v2 `app/lib/extract-client.ts` → v1으로 copy
4. 단위 테스트 (`scripts/extract.test.mjs`) 작성 — validateExtractRequest/Output, finalizeExtraction 5건 이상
5. tsc + 169 unit + 45 components 회귀 확인
6. PR A 생성 → Codex 정정 → 머지
