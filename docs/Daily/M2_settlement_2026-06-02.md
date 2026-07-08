# M2 정산 — 1page (2026-06-02 16:00)

> 5/29 6/1 평가 안전망 마감 이후 ~3일치 작업 정산. 17:30 마감 전 제출.

## 한 줄 요약
**M2 W1 paradigm v1(5건) + M3 즉시가능(5건) + Codex 누적정정(22건) + Track A 테스트(2건) 모두 머지 — 19 PR, prod 안정, ruleset 첫 실전 가드 작동 확인.**

## 머지 — 5/30 ~ 6/2 (총 19 PRs)

### M2 W1 — paradigm v1 빠른 시드 (5/30 ~ 5/31)
| # | PR | 효과 |
|---|---|---|
| #E | docs/18 설계 메모 (#33) | M2/M3 잠금 |
| #A | 입력 순서 swap (#34) | 글 먼저, 메타 나중 |
| #D | 진척 인디케이터 강화 (#35) | to-50자 미니바 |
| #B | 클립보드 자동 감지 (#36) | 1클릭 붙여넣기 |
| #C | DnD + TXT 업로드 (#37) | client only |

### M3 즉시가능 (Pro 의존 0) — 6/1
| # | PR | 효과 |
|---|---|---|
| ① | Step wizard 재설계 (#39) | 3-step conditional + MetaForm/TextPreviewCard 분리 |
| ② | DOCX 클라 파싱 (#40) | mammoth lazy load |
| ③ | Prefill LRU (#41) | 자주 쓴 메타 학습(LRU 5) |
| ④ | /results 폴리시 (#42) | 필터·정렬·삭제·검색 |
| ⑤ | 에러 폴백 + 토큰 안내 (#43) | 4채널 공통 |

### Codex 누적 정정 — 6/1 ~ 6/2 (22건)
- PR #38 (form id + disabled hint 구체화) — prod 보고 직후 hotfix
- PR #44 (P0+P1 16건 일괄) — 학생 영향·데이터 무결성·a11y·UX
- PR #45~#49 (defer 6/6) — ResultView server화·TXT 인코딩·Step2 진척·PDF 멀티페이지·docs 정합

### 트랙 A 테스트 — 6/2
- PR #50 (Vitest + RTL + 컴포넌트 4건 → 36 cases)
- PR #51 (Playwright + /try E2E 4 cases)

## 테스트 안전망 (현재)
| Tier | Tool | 케이스 |
|---|---|---|
| 순수 모듈 | node:test | **154** |
| 컴포넌트 | Vitest + RTL | **36** |
| E2E (/try wizard) | Playwright + chromium | **4** |
| **합계** | | **194** |

## 인프라
- **main branch ruleset 활성** (6/1) — Typecheck + Codex thread res + 비-deletion + 비-force-push + linear history
  - **첫 실전 작동**: PR #38에서 Codex가 disabled hint 양방향 분기 누락 지적 → 머지 차단 → 정정 후 통과
- /test-results, /playwright-report .gitignore 추가
- npm scripts: test:unit / test:components / test:e2e / test:all

## prod 안정 (`pullim-writing-coach-demo.vercel.app`)
- 자동 배포 ~15초 (main 머지 직후 vercel webhook)
- /results, /me, /try, /samples/* 5종 sweep 모두 200 (PR #28)
- ScoreForm 197 LoC 증가하고도 hydration 회귀 0 (ResultView server화 효과)

## 미해결·이월
- 외부 API 채널 3건 (HWP / 사진 OCR / 링크) — Vercel Pro 이관 후 (M3 W2+)
- 법적 재검토 — 이미지·파일 일시 처리 정책 (`docs/CEO/` hold 중)
- CI Node24 워크플로 (pending-followups 1건)
- /me TouchID·생체인증 — 미스코프

## 리스크
- Vercel Hobby 함수 4.5MB body limit — DOCX는 클라 처리로 우회, 사진 OCR 시 재고
- Codex review 봇 thread res 의무 (ruleset) — 실시 정정 강제. 통과 후 +10초 머지 사이클
- 단일 chromium E2E — firefox/safari 회귀 미커버

## 다음 액션 (M3 W2)
별 문서 `docs/Daily/M3_W2_plan_2026-06-02.md` 참조.

---
*총 19 PR · 22건 Codex 정정 · 194 테스트 · 0 prod 회귀.*
