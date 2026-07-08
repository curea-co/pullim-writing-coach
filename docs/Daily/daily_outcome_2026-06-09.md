# 2026-06-09 일일 보고 / 최선혜 — 수습 종료 D-14 · M3 W2 day 1 · 새 UX flow sprint day 2


## 운영 룰 (Standing Rules)

daily_outcome 작성 시 적용하는 6개 룰. 다음 daily_outcome 파일에도 복사해 유지.

1. **2중 안전망 등록 룰** — 영향이 큰 사실 변화(예: 자기소개서 폐지)나 발견은 plan(개별 문서) + 주간 계획(상위 문서) **두 위치에 등록**. 한 곳만 박으면 잊혀짐.
2. **재사용 자산 일일 산출** — 17:30 Daily Outcome 10번에 매일 1개 이상 박기 (체크리스트·룰·프롬프트·하네스). 1일 1작업 → 1영속 자산.
3. **AI 검증 카운트** — 17:30 Daily Outcome 7번에 "AI가 틀린 곳 N건 / 본인이 잡은 곳 N건" 매일 기록.
4. **시간 추정 vs 실제** — 17:30 Daily Outcome 11번에 추정 vs 실제 한 줄. 캘리브레이션 데이터 누적.
5. **이월·당김 양방향** — 09:30 Work Contract 7번에 "당김 후보 (조건부)" 1줄. 작업 일찍 끝나거나 대기 시 주간 plan에서 1건 당겨옴.
6. **Overnight 위임** — 일과 끝나기 전 18:50 전후 AI에게 풀세트 작업 위임, 다음 날 09:30~09:40에 산출 확인 + PM 검수 1건씩.


## 작업 환경
```text
▣ 수원 새빛인강 (1순위, 별도 세션 진행 중):
https://github.com/curea-co/suwon-monorepo · PR #281 (챌린지 화면)

pullim-writing-coach 리포 / 데모 (v1, 2순위 — suwon PR 리뷰 대기 중 진입):
https://github.com/curea-co/pullim-writing-coach · https://pullim-writing-coach-demo.vercel.app/

pullim-writing-coach_v2 리포 / 데모 (새 패러다임, 이식 코드 출처):
https://github.com/curea-co/pullim-writing-coach_v2 · https://pullim-writing-coachv2.vercel.app/

pullim-admissions-coach 리포 / 데모:
https://github.com/curea-co/pullim-admissions-coach · https://pullim-admissions-coach.vercel.app/
```


## 09:30 Work Contract

```text
2026-06-09 (화) — ▣ M3 W2 day 1 · 새 UX flow sprint day 2 · 수습 종료 D-14
[09:30 Work Contract / 최선혜]

▶ 외부 의존 P0 진척 (룰 A 정착 2 day째, docs/29 §4 source):
  P0-#1 Pro 이관: 보류(6/13 재검토) | P0-#2 도메인 alias: 미진척 | P0-#3 부모 인증: 출시 후 별도 | P0-#4 부모 billing: 출시 후 별도 | P0-#6 dogfood 모집: 출시 후 수집
  ※ 변동 없으면 그대로 복사 (룰 A 형식)

▶ 어제(6/8 월) 마감:
  ① ★ **v1 PR 2건 머지**: #67(Phase 1 PR A — extract/anthropic/extract-client lib 수평 이식 + 27 unit, Codex 6라운드 + 7라운드 자기모순 → admin override) · #68(의사결정 인테이크 docs/29 + P0 첫 entry, Codex 9라운드 → CLEAN 머지)
  ② ★ **문서 4건 신설**: `docs/26_v1v2_integration_inventory.md` · `docs/27_new_ux_flow_phase_plan.md` · `docs/28_m3_w2_plan_revised_2026-06-08.md` · `docs/29_decisions_intake_2026-06-08.md`
  ③ ★ **재사용 자산 3건**: v2 → v1 이식 매트릭스 / 룰 A~D 정의 main 정착 / backup 시나리오 사전 코드 표 (출시 형태 6/13 재검토 입력)
  ④ ★ **Overnight 위임 PR #69 신설**: Phase 1 PR B — `/api/extract` route 신설 (Claude Haiku 라이브 추출 + Sentry 4 layer 정합 + lib 27 unit으로 회귀). 본 day 09:30~09:40 검수 대상
  ⑤ 단위 테스트 169 → 196 (extract lib 27 unit 추가)

▶ 미해결 인계 (오늘 또는 이후):
  - 🔴 **PR #69 (Overnight 위임) 09:30~09:40 검수 + 머지** — Codex 라운드 + main 변동(아래 ⚠) 대비 rebase 필요 여부 점검
  - 🔴 **main 변동 인지**: 다른 세션이 **T2.3 callModel·isAuthorized 공유 헬퍼 분리** + **`app/lib/server/anthropic.ts` 신설** + **`/api/coach` 신설(?)** 진행. score route가 헬퍼로 import 정합 갱신됨 → PR #69(`/api/extract`)도 같은 패턴(`callModel(systemPrompt·prefill·...)`)으로 rebase 정정 필요
  - 🔴 **Phase 1 PR C 진입** — UniversalCapture·AssignmentCard·ConfidenceChip 컴포넌트 v2 → v1 이식 (Tailwind 토큰 호환·라우팅 무관)
  - ⚠ **suwon-monorepo PR #281 1순위 진척 확인** — 별도 세션 상황 동기화. 머지 여부·리뷰 라운드 수·writing-coach W2 영향 점검
  - ⚠ M3 W2 day 1 plan (`docs/28` §4 룰 A~D 가동) — 오늘이 W2 day 1 시작, day별 산출 목표 가시화
  - ⚠ pullim-admissions-coach `prompt_v0.1.md` M2 산출물 — 5/30 이월 14일째 누적
  - 수습 종료 6/23 D-14 — 매 daily 능동성·자기 증명 가시화

▶ 오늘 위치: **M3 W2 day 1 · 새 UX flow Phase 1 PR C 진입 day**. PR #69(Overnight 위임 산출) 검수+main 정합+머지 → Phase 1 PR C 컴포넌트 이식 진입.

0. 오늘 작업 순서 (1순위 suwon → 2순위 writing-coach 분배)
- (09:30~09:50) **★ Overnight 위임 PR #69 검수 + main 변동 정합 분석** — main의 callModel 공유 헬퍼 패턴 인지 + PR #69 rebase 필요 여부 결정
- (09:50~11:00) **PR #69 rebase + callModel 정합 정정** — `app/lib/server/anthropic.ts`의 `callModel(systemPrompt·prefill·...)` + `isAuthorized` 공유 헬퍼 사용으로 재작성 → 그린 → 머지 (Codex 라운드 추정 1~2, 인프라 PR 4 layer 체크리스트 적용)
- (11:00~12:00) **suwon-monorepo PR #281 1순위 진척 확인** — 별도 세션 동기화 + 리뷰 라운드 점검
- (점심 후 13:30~) PR #69 머지 후 **Phase 1 PR C 진입**:
  - (13:30~14:30) UniversalCapture 컴포넌트 v2 → v1 이식 분석 (Tailwind 토큰·"use client"·sessionStorage 의존 분석)
  - (14:30~16:00) UniversalCapture + AssignmentCard + ConfidenceChip 이식 작성 + Vitest mock 원복 패턴 적용 단위 테스트 시드
  - (16:00~17:00) tsc·build·test·E2E 회귀 → commit → push → PR #70
- (17:00~17:30) PR #70 CI 폴링 + Codex 라운드 대응 시작 (그린·Approved 시 머지, 안 되면 Overnight 위임)
- (저녁) 17:30 Daily Outcome + over.md (Overnight 위임 후보 박기)

1. 오늘 진행할 pullim-writing-coach 산출물:
- ★ **PR #69 (Phase 1 PR B `/api/extract`) 머지** — main rebase 후 그린·Codex Approved → 머지
- ★ **PR #70 (Phase 1 PR C 컴포넌트 이식) 신설·머지** — UniversalCapture + AssignmentCard + ConfidenceChip + Vitest 단위 테스트 시드 1~2건
- (선택) Phase 1 완성 후 docs/27 §1 갱신 (Phase 1 closure 1줄)
- daily 09:30·17:30 + over.md

2. 오늘 병렬로 진행할 pullim-admissions-coach 산출물:
- 본 daily 범위 밖 — 별도 세션 진행. 본 daily는 Phase 1 PR B·C 완성 집중

2-1. 1순위 suwon-monorepo 진행 (참고 — 별도 세션 트랙):
- **suwon-monorepo PR #281** (수원 새빛인강 챌린지 화면) — 별도 세션 진행, 11:00~12:00에 진척 동기화
- 본 daily의 writing-coach 산출은 PR #281 리뷰·CI 대기 시간 활용
- 양 트랙 동시 sprint = 회의록 §능동성 피드백(주도적·차별화) 정합

3. 오늘 만들 샘플 수:
- 신규 글 샘플 0건 (anchor 5종 유지)
- v2 → v1 이식 매트릭스 갱신 (UniversalCapture·AssignmentCard·ConfidenceChip 3건 이식 결과 박기, docs/26 §2 갱신)
- Vitest 단위 테스트 시드 1~2건 (PR #70 산출)

4. AI에게 맡길 일:
- 트랙 A(PR #69 rebase): main의 callModel·isAuthorized 공유 헬퍼 패턴 적용 + Codex 4 layer 체크리스트 사전 점검 + 그린 폴링·Codex 응답
- 트랙 B(Phase 1 PR C): UniversalCapture·AssignmentCard·ConfidenceChip 이식 + Vitest 단위 테스트 시드
- 트랙 C(daily): 09:30·17:30 + over.md
- 트랙 D(docs 갱신): docs/27 §1 Phase 1 closure 1줄 + docs/26 §2 이식 결과 박기

5. 내가 직접 검수/판단할 일:
- **PR #69 main 변동 정합 정정** — callModel·isAuthorized 공유 헬퍼 사용 방식, /api/extract 시그니처 결정 (score route와 동일 패턴 유지)
- **PR #70 컴포넌트 이식 시 v1 기존 컴포넌트와 충돌 처리** — `/try` 라우트가 새 UX flow로 완전 교체이므로 기존 ScoreForm·TokenGate·MetaForm은 Phase 2 이후 단계적으로
- **suwon 1순위 sprint 진척 동기화 결과** — 머지 완료 시 W2 plan 자력 진행 시간 확보, 미머지 시 본 day Phase 1 PR C 완성 후 합류 합의
- **Phase 1 closure 기준** — UniversalCapture·AssignmentCard만 이식이 closure? `/try` 진입 화면 교체까지 closure? Phase 2와 어떻게 분기?

6. 예상 blocker:
- **PR #69 main 변동 정합 rebase 비용** — callModel·isAuthorized 공유 헬퍼 도입으로 `/api/extract`도 같은 패턴 적용 시 코드 변경 폭 ~30~50줄. Codex 인프라 PR 평균 2~3 라운드 예상 (docs/22 4 layer 체크리스트 적용 효과 측정 첫 PR)
- **PR #70 컴포넌트 이식 분량** — UniversalCapture(6채널 권한·클립보드·DnD·STT·OCR 5종 헬퍼) + AssignmentCard + ConfidenceChip 3건. v2 Tailwind 토큰 → v1 정합. PR 1건에 묶을지 분리할지 점검
- **suwon 1순위 진행 속도 미정** — suwon이 6/9 안에 머지되면 6/10~6/15 6 day로 Phase 2·3·4 가능. 6/10·6/11까지 끌리면 Phase 3·4 M4 이관 옵션 가동
- **새 docs PR Codex 라운드 비용** — 6/8 #68에서 9라운드 학습 (요일 오기·표현 일관성 반복). docs PR 사전 체크리스트(docs/22 문서 버전) 정착이 다음 docs PR 라운드 감소 입력

7. 당김 후보 (Standing Rule 5):
- 링크 본문 추출(D 채널) PR — Phase 1 완성 후 빈 시간 진입 가능 (Hobby 가능, 4채널 중 마지막 1건)
- Vercel `git connect` curea-co GitHub App 재승인 시도 (5분 안에 가능 여부 시험)
- /api/score 라우트 fetch 다이버전스 정정 (memory `score-route-fetch-divergence` — main이 이미 callModel 공유 헬퍼로 정합 진행 중이므로 본 PR 정정 효과 측정)
- v2 컴포넌트 단위 테스트 시드 +N건 (UniversalCapture·AssignmentCard 이식 동시에)
- pullim-admissions-coach Member DB doc v0.1 EPO 검수 (8개 결정 잠금 후속)
```


## 17:30 Daily Outcome

```text
[17:30 Daily Outcome / 최선혜]

▶ 오늘 핵심: **양 트랙 동시 진척 day** — 1순위 suwon-monorepo는 별도 세션에서 **PR #281(챌린지 화면) 머지 + PR #310 사자성어 챌린지 풀스택 생성 + 암산왕 챌린지 작업 plan 수립** 3건 진행. 본 daily의 2순위 writing-coach는 09:30 contract 5트랙(PR #69 검수·main 정합 rebase·suwon 동기화·Phase 1 PR C·17:30) → **다른 세션에서 main 변동 흡수 (T2.3 callModel·isAuthorized 공유 헬퍼 + `app/lib/server/anthropic.ts` 신설 + `/api/extract` 의 `./helpers.ts` 분리)** + **본 세션은 슬랙 봇 통합 시도(보안 인시던트 발생·대응 사이클 1회) + daily 09:30·17:30 작성**. Phase 1 PR C 진입은 다음 day 이월.

1. 오늘 닫은 pullim-writing-coach 산출물:
- ★ **daily_outcome_2026-06-09.md 09:30 + 17:30 작성** — M3 W2 day 1 정착 (외부 의존 P0 진척 1줄 룰 A 2 day째 박힘)
- (다른 세션 산출 — 본 daily 외 인지) **PR #69 (`/api/extract` route)** main 변동 정합 — Codex PR #69 정정 (`./helpers.ts` 분리 + E-PARSE→E1 매핑 변경) 흡수해 머지 또는 진행 중
- (다른 세션 산출) **T2.3 공유 헬퍼 분리** — `app/lib/server/anthropic.ts` 신설 + `/api/score`·`/api/extract` 양쪽이 같은 `callModel`·`isAuthorized` 사용
- (다른 세션 산출) `.env.example` 갱신 — `NEXT_PUBLIC_DEMO_TOKEN` 항목 추가 (자동 입장 + Vercel rate limit + Anthropic 월 예산 알람 운영 주석)

2. 오늘 닫은 pullim-admissions-coach 산출물:
- 본 daily 범위 밖 — 별도 세션. M3 W2 day 1 본 daily는 슬랙 통합 + main 변동 흡수에 집중

2-1. 1순위 suwon-monorepo 진행 (참고 — 별도 세션 트랙, 17:30 시점 동기화 결과):
- ★ **PR #281 (챌린지 화면) 머지 완료** — 1순위 메인 작업 닫힘. 양 트랙 동시 sprint 첫 1순위 PR closure
- ★ **PR #310 사자성어 챌린지 풀스택 생성** — 1순위 후속 진척, 리뷰·머지 대기 중
- ★ **암산왕 챌린지 작업 plan 수립 중** — 1순위 next 항목 사전 설계 단계
- 본 day suwon 트랙 산출: **머지 1건 + PR 생성 1건 + plan 수립 1건 = 3건** (writing-coach 2순위와 병행 정합)
- 양 트랙 day-end 합계: **suwon 3건 (1순위) + writing-coach (다른 세션 main 변동 흡수 + 본 세션 daily·슬랙 통합) (2순위)**

3. 실제 링크/파일:
- main commits (다른 세션 산출, 본 세션 외 인지): T2.3 공유 헬퍼 분리 + `/api/extract` route 정정 + `.env.example` `NEXT_PUBLIC_DEMO_TOKEN` 추가
- 신규 docs: 본 daily 외 0건 (M3 W2 day 1은 작성 + 통합 시도 위주)
- 신규 daily: `docs/Daily/daily_outcome_2026-06-09.md` (09:30 + 17:30)
- 신규 helper: `app/api/extract/helpers.ts` (다른 세션 산출 — 토큰 게이트·EXTRACT_MESSAGE·jsonError·logMetric 분리, Node 테스트 가능 단위)

4. 샘플:
- 신규 글 샘플 **0건** (anchor 5종 유지)
- 슬랙 봇 토큰 보안 인시던트 대응 사이클 1건 (revoke → 새 토큰 → 워크스페이스 정책 진단 → SecureString 트러블슈팅) — 학습 자산화 후보

5. AI가 만든 것 (트랙 A·B·C·D):
- 트랙 A(daily 작성): 09:30 Work Contract (작업 환경에 v2 + suwon 추가) + 17:30 Daily Outcome (다른 세션 산출 흡수 포함)
- 트랙 B(슬랙 봇 통합 시도): 토큰 revoke 절차·api.slack.com/apps 진단·Marketplace 동작 분석·Incoming Webhook 대안·`chat.postMessage` 직접 호출 패턴·SecureString 입력 트러블슈팅·Get-Clipboard 우회 안내
- (다른 세션) 트랙 C(main 변동): T2.3 공유 헬퍼 분리·`./helpers.ts` 추출·E-PARSE→E1 매핑 정정·`.env.example` `NEXT_PUBLIC_DEMO_TOKEN` 추가
- (다른 세션) 트랙 D(PR #69 머지·정정): Codex 라운드 대응 + main rebase + 정합 정정

6. 내가 수정/기각/채택한 것:
- 채택: **슬랙 봇 토큰 채팅 평문 노출 즉시 revoke** (`auth.revoke` API 2회 호출로 무효화·검증) — 보안 인시던트 1차 대응 정합
- 채택: **gate keeper(임성호)에게 알림 의무** — 자동화 침묵 사망 방지 + 신뢰 관계 + 재발 방지 학습 입력
- 채택: **Slack 봇 owner ≠ EPO인 상황의 우회 전략** — Incoming Webhook / Workflow Builder / Email-to-Channel 3 옵션 (워크스페이스 admin 권한 없이 가는 경로)
- 채택: **GitHub Secrets에 토큰·채널 ID 등록 + 평문 흔적 정리** — 노출 매체(DM·메모장·텍스트 파일) 사후 정리 룰 정착
- 채택: **본 day Phase 1 PR C 진입 보류** — 슬랙 통합 + main 변동 흡수에 시간 분배 소진, 다음 day 1순위로 이월
- 수정: 09:30 Work Contract 작업 환경에 v2 (`pullim-writing-coach_v2`) repo·prod URL 추가 (양 트랙 동시 sprint 정합)
- 수정: 6/8 over.md §12 Overnight 위임 PR #69 → 6/9 09:30~09:40 검수 + main 변동 정합 rebase 결정 (실제 정정은 다른 세션에서 진행)

7. AI 검증 카운트 (Standing Rule 3):
- AI(Claude)가 잡은 곳: **2건**
  · 토큰 채팅 노출 즉시 보안 경고 + revoke 절차 안내 (사용자가 토큰 그대로 진행 못 하게 차단)
  · SecureString 입력 0자 → PowerShell 환경에서 paste 거부 패턴 진단 → Get-Clipboard 우회 안내
- 본인이 잡은 곳: **2건**
  · `not_authed` 응답을 정확히 읽고 명시 (`invalid_auth`와 구분) → AI가 정확 진단 가능
  · 워크스페이스 owner 권한 부재 인지 (시나리오 분기 자체 재조정 — "다른 사람 설치하는데 장애물 있어?" 질문으로 흐름 전환)
- ★ 학습: **보안 인시던트 대응 사이클**의 1차 step(noise → 즉시 차단)이 매우 중요. 토큰 노출 → 1분 안에 revoke → 검증 → gate keeper 알림 → 새 토큰 받기까지 30분 안에 가능

8. 재사용 자산 (Standing Rule 2) — 오늘 1건 박힘:
- ★ **슬랙 봇 토큰 보안 인시던트 대응 체크리스트** (본 daily §8에 박힘, 향후 별도 `docs/25_secret_leak_response_checklist.md`로 정착 후보):
  1. 평문 노출 즉시 `auth.revoke` API 호출 (1줄, 토큰 자체로 자기 무효화 가능)
  2. 검증 — 같은 명령 한 번 더 → `invalid_auth` 떨어지면 무효 확정
  3. gate keeper(토큰 발급자)에게 알림 — 자동화 침묵 사망 방지 + 보안 책임 공유
  4. 새 토큰 받기 시 secure share(1Password·Bitwarden 등) 채널 명시 (DM·이메일·채팅 금지)
  5. 받은 토큰은 GitHub Secrets 또는 vault에 곧장 등록, 평문 흔적 즉시 정리
  6. 슬랙 봇 owner ≠ 본인이고 OAuth 인증 미설정 워크스페이스 전용 앱이면 → Incoming Webhook 또는 chat.postMessage 직접 호출 우회 전략
  7. PowerShell SecureString 입력 거부 환경(VSCode·Windows Terminal 일부)에서는 `Get-Clipboard`로 우회

9. 미완료/미검증:
- 🟡 **슬랙 봇 메시지 전송 검증** — `Get-Clipboard` 우회 시도 → 토큰 길이 0자 입력 (Read-Host SecureString 환경 문제) → 다음 day Get-Clipboard 다시 시도. `not_authed` 직접 응답 1회 확인까지만 진행
- 🟡 **임성호(앱 owner)에게 봇 채널 추가 또는 OAuth 인증 추가 요청 미발송** — 사용자가 요청 메시지 발송 결정 단계
- 🟡 **GitHub Actions `daily-worklog.yml` 워크플로 PR 미작성** — Step 4 슬랙 동작 확정 후 진행
- 🟡 **Phase 1 PR C** (UniversalCapture·AssignmentCard·ConfidenceChip 이식) — 미진입, 다음 day 1순위
- ✅ **suwon-monorepo 1순위 동기화** — 17:30 시점 진척 확인 완료 (PR #281 머지·PR #310 생성·암산왕 plan 수립). §2-1에 박힘
- 🟡 docs/22 인프라 체크리스트의 "`@sentry/nextjs` ESM 해석 한계" 항목 박기 — PR #69 학습 기반 정착 미진행
- pullim-admissions-coach 별도 세션 합류 시점 결정 — 14일째 이월
- 외부 의존 P0 5건 — 모두 보류·미진척 그대로 (6/13 재검토까지 변동 없을 전망)

10. 내일 첫 액션 (6/10 수 — M3 W2 day 2):
- (09:30 work contract) `▶ 외부 의존 P0 진척` 1줄 박기 (룰 A 3 day째) — 변동 없으면 그대로 복사
- (09:30 work contract) **suwon-monorepo 1순위 진척 확인** — PR #310 사자성어 챌린지 풀스택 리뷰·머지 점검 + 암산왕 챌린지 작업 plan 검수 + W2 plan 영향 (1순위 다음 항목이 plan 단계인지 implementation 단계인지에 따라 writing-coach 시간 분배 조정)
- **슬랙 봇 통합 마무리** — Get-Clipboard 우회로 토큰 입력 → `chat.postMessage` 결과 확인 → `not_in_channel` 시 임성호에게 채널 추가 요청 메시지 발송 → 동작 확정 후 GitHub Actions PR 작성
- **Phase 1 PR C 진입** — UniversalCapture·AssignmentCard·ConfidenceChip 컴포넌트 v2 → v1 이식 (Tailwind 토큰 호환·"use client" 경계·sessionStorage 의존 분석 + Vitest mock 원복 패턴 적용 단위 테스트 시드)
- (선택) docs/22 인프라 체크리스트에 "node:test 환경 `@sentry/nextjs` ESM 해석 한계" 항목 + helper 분리 패턴 자산 박기
- (선택) 본 daily §8 체크리스트를 `docs/25_secret_leak_response_checklist.md`로 정착

11. 시간 추정 vs 실제 (Standing Rule 4):
- daily 09:30 작성: 추정 20m vs 실제 ~25m (+25%, main 변동 인지 + 우선순위 재조정 반영)
- 슬랙 봇 통합 시도: 추정 30m vs 실제 **~2.5h+ (+400%)** — 토큰 노출 → revoke 사이클 1회 + 워크스페이스 정책 진단 + Marketplace 동작 분석 + Incoming Webhook 옵션 안내 + SecureString 트러블슈팅 + Get-Clipboard 우회 안내. **3rd-party 통합 첫 시도는 추정 4배 가산 권장 (외부 시스템 권한 정책 + 환경별 입력 방식 트러블슈팅 합산)**
- daily 17:30 작성: 추정 25m vs 실제 ~30m
- **총 추정 ~1h 15m vs 실제 ~3h 15m (+160%)** — 슬랙 보안 인시던트가 캘리브레이션 가장 큰 편차. 다음 외부 통합 시도(Vercel Pro·도메인·OAuth·결제) 추정 시 4배 가산 룰 적용

12. Overnight 위임 후보 (Standing Rule 6):
- (저녁 18:50 위임 가능) **Phase 1 PR C 사전 코드 작성** — UniversalCapture·AssignmentCard·ConfidenceChip 컴포넌트 v2 → v1 이식 + Tailwind 토큰 호환 + Vitest mock 원복 패턴 단위 테스트 시드 1~2건. 다음 day 09:30~09:40 검수 + PR 본문 + Codex 라운드 대응
- (대안) **docs/25_secret_leak_response_checklist.md 신설** — 본 daily §8 체크리스트 정착 + 향후 보안 인시던트 대응 1page 자산
```

