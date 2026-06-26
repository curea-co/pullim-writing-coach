# pullim-writing-coach 작업 현황 보고 (2026-06-26)

> 작성: PM · 범위: **pullim-writing-coach 단일 서비스(포트 3006)**
> **완료 판정 원칙**: "2번(서버환경 구성 + 로그인 동작)이 0%면 개발 완료 0%." → 코드가 있어도 `dev-os.pullim.ai` 로그인 → writing-coach 인가 동작이 **서버환경에서 검증**돼야 '완료'.
> **역할 분담**: 1번 = 에이전트 작성(완료) · 2~4번 = 사람 검수(근거기반 초안 + ⚠검증필요).
> 라이브 상태 2026-06-26 curl 실측. 머지 PR 94건 / 오픈 PR #99(dev sync)뿐.
> ⚠ **SoT 주의(ADR-021)**: 본 문서는 **writing-coach 상태 스냅샷(비권위)**이다. 서비스별 구현·인가·갭의 권위는 `docs/design/services/<svc>/`·각 작업 카드에 있으며 본 문서는 **요약·링크만** 한다(사실 중복 금지). 드리프트 시 설계 SoT 우선. ※ 본 문서의 정위치는 writing-coach 레포이며, pullim-api에는 참조용으로만 존재.

---

## 0. 한눈에

| 항목 | 상태 |
|---|---|
| 제품(과정 코치) 기능 | ● 대부분 구현·main 반영 |
| 자체 운영 배포 | ✅ `writing.pullim.ai` 채점 라이브 200 (2026-06-25) |
| **dev-os.pullim.ai OS-SSO 로그인 연동** | ❌ **0%** — 자체 데모 토큰(x-demo-token)만, 중앙 로그인 미연동 |
| pullim-api `writing` 백엔드 모듈 | ❌ 없음(entitlement 키만) — 자체 Next.js `/api` 라우트 사용 |

> **핵심**: 제품·자체 배포는 성숙하나, **완료 판정 기준(dev-os 로그인→writing-coach 인가)으로는 0%.** writing-coach가 풀림 OS 통합 로그인에 아직 붙지 않았다.

---

## 1. AI로 작업 완료한 목록 *(에이전트 작성 — 코드·git 근거)*

### 1-1. 과정 코치 제품 (main 반영)
- **과정 코치 동선(`/coach`)**: TokenGate → 과제 입력(MetaForm) → 모드 선택(자유·가이드·개요 / 말하기 준비중) → 작성 캔버스(RichEditor) → 코칭(점수·넛지·성취막대·과정로그)
- **라이브 API 3종**(자체 Next.js, Claude Haiku 직접 호출): `POST /api/score`(5영역 채점) · `/api/extract`(안내서 추출) · `/api/coach`(코치 상호작용)
- **대필 가드**: 정적 텍스트 가드(#75) — 대필 0 불변식
- **RichEditor**(TipTap, #86) · **PUDS 대시보드 셸 + OS 스타일 홈**(#81~#85) · **안내서 추출 UI**(UniversalCapture·AssignmentCard·ConfidenceChip, #69·#70)
- **5영역 rubric 채점**(rubric v0.5) · 결과 뷰·본문 주석·수정 전후 비교·내보내기
- 인프라: 토큰 게이트·rate limit(2단 user10·IP60)·Sentry·테스트(unit·components·e2e CI 4잡)
- 데모: 5종 학생 글 anchor
- 누적: **머지 PR 94건**

### 1-2. 운영 배포 파이프라인 (2026-06-25, 이번 세션)
- **README 현행화**(#88) — 과정 코치 패러다임+라이브 API 정합, Codex 5라운드 13지적 반영
- **`dev` 브랜치 신설 + 기본 브랜치 main→dev 전환** (Vercel Production=main 핀 확인 후)
- **도메인 2종**: 운영 `writing.pullim.ai`(→main) · 스테이징 `dev-writing.pullim.ai`(→dev). Vercel DNS 자동+TLS
- **CI dev 트리거**(#89) · **dev 스모크/재배포**(#90)
- **env 주입 + 키 회전**: Production·Preview `ANTHROPIC_API_KEY`/`DEMO_ACCESS_TOKEN`
- **라이브 검증**: 운영·dev `/api/score` → **200**(실제 피드백)

---

## 2. 서버환경 로그인 완료 목록 *(⚠ 사람 검수 — 완료 0% 원칙 엄격 적용)*

> 기준: `dev-os.pullim.ai` 로그인(임시 데이터 = pullim-api `POST /auth/dev/seed-member`) → 발급 claim의 `writing` flag로 writing-coach 진입·인가가 **서버환경에서** 동작.

| 체크 | 상태 | 근거 |
|---|---|---|
| dev-os.pullim.ai 로그인 → writing-coach 진입 | ❌ **0%** | writing-coach는 OS-SSO 미연동. 인증이 자체 `x-demo-token`(DEMO_ACCESS_TOKEN)뿐 |
| `writing` entitlement flag 기반 인가 | ❌ | writing-coach에 EntitlementGuard·cookie SSO·CSRF 없음 |
| writing-coach 자체 접근(참고) | △ | `writing.pullim.ai` 200 — 단 **자체 토큰**이라 OS 로그인 데이터와 무관 |

**판정**: 완료 판정 기준(OS 로그인→서비스 인가)으로 **writing-coach = 0%.** 자체 토큰으로 standalone 동작은 하나, 풀림 OS 통합 로그인 동선이 없어 "로그인한 데이터로 서비스 체크"가 성립하지 않음.

> ⚠ **사람 검수/결정 필요**: ① writing-coach를 OS-SSO(쿠키 SSO + `EntitlementGuard('writing')` + CSRF)로 통합할지 ② 통합 시 자체 토큰 게이트 폐지/병행 여부 ③ pullim-api 발급 claim에 `writing` flag 부여 검증.

---

## 3. 현재 개발중 / 개발해야 하는 목록

### 3-1. API 갭 (pullim-api 미구현 → 여기 등록 · 참고: /Users/kokho/workspace/pullim-api)
- **pullim-api `writing` 모듈 부재** — `writing` entitlement 키만 존재(`entitlement-flags.constants.ts`), **백엔드 모듈·엔티티·엔드포인트 없음**(`docs/design/services/`에 writing 폴더 없음). 현재 채점/추출/코치는 writing-coach 자체 Next.js `/api` + Claude 직접 호출.
  - → 중앙 아키텍처가 pullim-api 경유를 요구하면 **writing BE 신설 필요**. standalone 유지면 불필요(아키텍처 결정 사항).
- **OS-SSO 인증 연동** — writing-coach에 cookie SSO + `/auth/csrf` + `EntitlementGuard('writing')` 미배선. dev-os 로그인 claim 수용 경로 없음.

### 3-2. writing-coach 자체 갭
- **중앙 로그인 랜딩 + 공통 헤더** — 로그인 클릭 → 중앙 로그인 랜딩 + 쿼리 리다이렉트, 상단 헤더 공통화. 현재 자체 TokenGate.
  - 랜딩 URL은 설계 SoT(`docs/design/_platform/plan.md`)가 이미 정리: apex `pullim.ai`도 로그인 UI 노출 가능 + 미인증 서비스 리다이렉트 **canonical 진입 = `os.pullim.ai/login?next=`**. writing-coach는 이 canonical 진입을 따르면 됨(본 문서는 SoT 인용만, 결정 아님).
- **사용자 크레딧·결제·계정**(Phase 2) — 유료(크레딧 구매) 모델. 현재 데모 토큰 게이트만. 인증·원장·결제 미구축.
- **잔여 PR**: #99(dev←main sync) 머지 후 dev/main 정합.
- 과정 코치 mock 구간 고도화(coach-mock 등 ⚪) · `/try` 레거시 정리.

---

## 4. 완료예정일 *(⚠ PM 제안 — 사람 확정)*

| 항목 | 예정일 | 근거 |
|---|---|---|
| writing-coach 자체 운영 배포(채점 라이브) | **완료 (2026-06-25)** | `writing.pullim.ai` 200 검증 |
| dev←main 동기화(#99) | 2026-06-26~29 | 오픈 PR |
| **OS-SSO 로그인 연동**(item2 완료 핵심) | ⚠ **미정** | 아키텍처 결정 선행(자체토큰 vs OS통합) |
| pullim-api `writing` BE 신설(필요 시) | ⚠ 미정 | 중앙 경유 여부 결정 후 |
| 중앙 로그인 랜딩 + 공통 헤더 | ⚠ 미정 | 요청 신규, 일정 미수립 |
| 크레딧·결제·계정(Phase 2) | ⚠ 미정 | 출시 후 별도 트랙 |

---

## 부록 — 검증 방법
- 라이브: `curl -s -o /dev/null -w "%{http_code}" https://writing.pullim.ai/`(200) · `https://dev-writing.pullim.ai/`(302 SSO 보호).
- 인증 방식 확인: `app/lib/server/anthropic.ts`·`middleware.ts` → `DEMO_ACCESS_TOKEN`/`x-demo-token`만(OS-SSO·EntitlementGuard 없음).
- OS 통합 검증(미연동): pullim-api `POST /auth/dev/seed-member`로 `writing` flag 계정 발급 → dev-os 로그인 → writing-coach 진입 — **현재 경로 없음**.
