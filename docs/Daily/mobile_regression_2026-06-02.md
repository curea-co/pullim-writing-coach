# 모바일 반응형 정밀 검증 — 2026-06-02 prod

> **대상**: `https://pullim-writing-coach-demo.vercel.app/`
> **viewport**: iPhone 14 Pro (375×812) headless chromium
> **방법**: browse로 7 라우트 sweep + 시각 검증

## 한 줄 요약
**✅ 7/7 라우트 모바일 깨짐 0건.** 햄버거 LNB + 1열 카드 + break-keep + tabular-nums 모두 정상. 가로 스크롤·overflow·텍스트 잘림 없음.

## 라우트별 결과

| 라우트 | 결과 | 검증 포인트 | 스크린샷 |
|---|---|---|---|
| `/` (홈) | ✅ | 햄버거 LNB / 상단 CTA / 샘플 5종 1열 카드 / footer | `docs/screenshot/mobile-iphone-home.png` |
| `/onboarding` | ✅ | 1단계 진행 dots / 데모 결과 카드(67점) / "시작하기" full-width CTA | `mobile-iphone-onboarding.png` |
| `/try` (TokenGate) | ✅ | "프로필 만들기" + "데모 접근" 두 카드 / password input full-width / 작은 카피 readable | `mobile-iphone-try-gate.png` |
| `/about` | ✅ | 5섹션 readable / break-keep 정상 / CTA 2단(`[직접 채점받기] ← 홈으로`) | `mobile-iphone-about.png` |
| `/me` | ✅ | "아직 프로필이 없어요" 카드 + 온보딩 CTA | `mobile-iphone-me.png` |
| `/results` | ✅ | empty state + 자동저장 안내 + CtaBand 1열 | `mobile-iphone-results.png` |
| `/samples/e` | ✅ | breadcrumb + 결과 그리드 1열 (왼쪽 학생 글 → 오른쪽 결과 모두 세로) | `mobile-iphone-samples-e.png` |

## 발견된 강점 (출시 가능 수준)
- **lg:grid-cols-N 토큰 시스템 일관** — 모바일에서 자동 1열, 데스크톱에서만 다열
- **`break-keep` 광범위 적용** — 한글 줄바꿈 자연
- **`tabular-nums`** — 점수/자수 등 숫자 영역 깔끔
- **`text-xs` ~ `text-base` 적정 크기** — 작은 화면에서도 readable
- **Sticky 햄버거 nav** — 좌상단 고정, 햄버거 토글로 LNB 드로어
- **카드 padding 적정** — 좌우 여백 좁아도 콘텐츠 답답하지 않음

## 약점/관찰 사항 (출시 차단 아님, 후속 개선 가능)
1. **`/samples/e` 정보 밀도 ↑** — 5영역 점수 + 영역별 피드백 + 가이드 모두 한 화면에 — 작은 폰트지만 readable. M3+에서 "접힘 카드" UX 검토 가능.
2. **`/try` Step 1 textarea height=12rows** — 모바일에서 12행은 화면 절반 차지. 모바일 한정 `rows={8}` 검토 가능 (별 PR).
3. **`/me` empty state CTA 단일 색** — 데스크톱 동일. OK.
4. **`/results` empty CtaBand** — "직접 채점받기" 2번 중복 (헤더 + CtaBand). 모바일에서 더 두드러짐. M3+에서 CtaBand 조건부 노출 검토.

## 미테스트 (수동 + Playwright 미커버)
- 가로 모드 (landscape) — iOS Safari 회전 시 layout
- iOS Safari 실기기 — chromium headless ≠ Safari 엔진 (특히 `<details>` 토글 모션)
- Android 일부 OEM 키보드와 textarea 입력 충돌 (Samsung 키보드 등)
- 폰트 시스템 — Pretendard CDN 로드 실패 시 system fallback 검토

## 모바일 전용 후속 권고
| # | 항목 | 우선순위 |
|---|---|---|
| 1 | 모바일 `/try` textarea `rows={8}` | P2 |
| 2 | 모바일 CtaBand 중복 제거 (`/results` 헤더 CTA 있으면 CtaBand 숨김) | P3 |
| 3 | iOS Safari 실기기 회귀 — TestFlight/BrowserStack | P1 (출시 전) |
| 4 | Playwright `devices['iPhone 14 Pro']` E2E 추가 | P2 |
| 5 | 가로 모드 layout 검증 | P3 |

## 결론
**6/15 출시 차단 없음.** 모든 7 라우트 깨짐·overflow 0건. iOS Safari 실기기 검증만 출시 전 1회 권장(BrowserStack 또는 실 기기 dogfood).

---
*검증: chromium headless 375×812 / 7 라우트 / 6 screenshot 증빙 / 0 회귀.*
