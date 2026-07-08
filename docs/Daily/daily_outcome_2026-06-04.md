# 2026-06-04 일일 보고 / 최선혜 — 수습 종료 D-19


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
pullim-writing-coach 리포 / 데모:
https://github.com/curea-co/pullim-writing-coach · https://pullim-writing-coach-demo.vercel.app/

pullim-admissions-coach 리포 / 데모:
https://github.com/curea-co/pullim-admissions-coach · https://pullim-admissions-coach.vercel.app/
```


## 09:30 Work Contract

```text
2026-06-04 (목) — 휴일 회복 후 복귀 · 수습 종료 D-19
[09:30 Work Contract / 최선혜]

▶ 어제(6/3 수) 휴일 — 작업 없음 (회의록 (01:06:20)·(01:07:23) "self-investment"에 회복 사이클 포함, 수습 D-20 압력 하 무리 시 quality 하락 손실이 더 큼)

▶ 그저께(6/2 화) 마감 요약:
  ① ★ v2 시각 프로토타입 신축 — 새 workspace `C:\workspace\pullim-writing-coach_v2` + 새 GitHub repo + Vercel prod 일괄 (CEO doc §3 재설계 5건 적용)
  ② ★ pullim-writing-coach main에 3 PR squash 머지 — #58(PDF 멀티페이지) · #57(ScoreForm 통합 테스트 9건) · #56(/me LRU 시각화 카드). Codex 정정 4건 동반
  ③ daily 작성 4건 — `daily_outcome_2026-06-02.md` 09:30·15:30·17:30 + `_over.md` 분기(§12 Overnight 위임 풀세트 5 트랙)
  ④ 6/2 미실시: M2 16:00 정산 1page · M3 W2 plan 1page · v2 E2E user 회귀 · v1 `/try` E2E 회귀(5/31부터)

▶ 미해결 인계 (오늘 또는 이후):
  - 🔴 **6/2 over.md §12 Overnight 위임 5 트랙 — 휴일로 1일 이월. 오늘 09:30 검수 + 실행 진입**
  - 🔴 **M2 closure 1page + M3 W2 plan 1page — 6/2에 미작성, 7일째 부채. 오늘 우선순위 톱**
  - ⚠ Vercel Hobby → 조직·Pro 이관 (memory `vercel-hobby-to-org-migration` 8단계) — M3 후반·pullim-admissions-coach 8/1 D-58 전 필수
  - ⚠ pullim-admissions-coach `prompt_v0.1.md` M2 산출물 — 5/30 이월 9일째 누적. 8/1 D-58
  - ⚠ 회의록 §능동성 피드백 — pullim-admissions-coach 능동 제안 별도 세션 합류 시점 미정
  - ⚠ v2 E2E + v1 `/try` E2E user 직접 회귀 둘 다 미실시 (헤드리스 한계)
  - 수습 종료 6/23 D-19 — 패턴(D-day 압력 + 회복 사이클) 유지 시 정량 80→90 가능성

▶ 오늘 위치: **휴일 회복 후 복귀 day. 6/2 부채 청산 + 6/2 over.md Overnight 위임 5 트랙 실행 + v2/v1 E2E user 회귀 → 누적 7건 통합 contract**.

0. 오늘 작업 순서
- (09:30~09:40) Overnight 위임 산출 검수 — 6/2 over.md §12 5 트랙 산출물 확인 + 채택/반려/보강 결정 (Standing Rule 6)
- (오전) M2 closure 1page (`docs/20_m2_closure_2026-06-02.md`) 확정 — 어제 12 PR + 6/2 3 PR 머지 후 명목 완성 항목·잔여 부채·정량 80→90 자기평가
- (오전) M3 W2 plan 1page (`docs/21_m3_w2_plan_2026-06-04.md`) 확정 — 링크 본문 추출·테스트 커버리지·로깅 + Pro 이관 진입 시점
- (낮) v2 E2E user 직접 회귀 — TokenGate 없는 v2이므로 곧장 동선 1회 + 캡처 3~5장 (안내서 → mock 파싱 → 모드 선택 → /evaluate 글 던지기 → mock 채점)
- (낮) v1 `/try` E2E user 회귀 — TokenGate 토큰 입력 후 ScoreForm 4요소(DnD·TXT·클립보드·진척바) + Step wizard 3-step + DOCX 클라 + prefill LRU + /me MetaUsageCard 노출 1회 + 캡처
- (오후) v1 컴포넌트 단위 테스트 +N건 PR — MetaUsageCard·MetaForm·TextPreviewCard·DOCX 파서·LRU prefill·필터 (Vitest mock 원복 패턴 체크리스트 적용, 6/2 자산)
- (오후) v2 컴포넌트 단위 테스트 시드 1~2건 — UniversalCapture 6채널 라우팅·AssignmentCard 컨피던스 칩 분기 (단위 테스트 0건 상태 해소)
- (저녁) 잔여 가능 시 — Vercel `git connect` curea-co GitHub App 재승인 + Hobby → Pro 이관 1차 점검

1. 오늘 진행할 pullim-writing-coach 산출물:
- **M2 closure 1page + M3 W2 plan 1page** (6/2 부채 청산, 9일째 미작성)
- v2 E2E 회귀 보고서 + 캡처 3~5장 (시연 자료)
- v1 `/try` E2E 회귀 보고서 + 캡처 3~5장 (5/31부터 이월)
- v1 컴포넌트 단위 테스트 +N건 PR (어제 추가분 5~6 컴포넌트)
- v2 컴포넌트 단위 테스트 시드 1~2건 (출시 단계 진입 준비)

2. 오늘 병렬로 진행할 pullim-admissions-coach 산출물:
- 🔴 별도 세션 산출물 합류 시점 결정 — 회의록 §능동 제안·시장 분석 트랙 본 daily와 day-end 정합
- (이월 9일째) `prompt_v0.1.md` M2 산출물 — 박준호 mock 답변 구조 추출 + §6 가드레일. 8/1 D-58, 임계점 임박

3. 오늘 만들 샘플 수:
- 신규 글 샘플 0건 (v1/v2 모두 anchor 5종 그대로)
- v2 E2E 회귀 캡처 3~5장
- v1 `/try` E2E 회귀 캡처 3~5장
- M2 closure·M3 W2 plan 표·그림 (산출 항목·정량 평가 매트릭스)

4. AI에게 맡길 일:
- 트랙 A(v1 회귀·테스트): `/try` E2E 자동 회귀(헤드리스 가능 범위) + 컴포넌트 단위 테스트 PR (Vitest mock 원복 패턴 적용)
- 트랙 B(v2 보강): 컴포넌트 단위 테스트 시드 + mock 파싱 카탈로그 1page + `/about` 카피 보강
- 트랙 C(M2 closure + M3 W2 plan): 두 1page 초안 → EPO 검수 → 본문 확정
- 트랙 D(pullim-admissions-coach 합류점): 별도 세션 산출물 인덱스 + day-end 정합 메모
- 트랙 E(자동 배포 + Pro 이관): `vercel git connect` UI 단계 정리 + Hobby → Pro 이관 memory 8단계 ①~③ 1차 점검

5. 내가 직접 검수/판단할 일:
- Overnight 위임 5 트랙 산출 채택/반려 (Standing Rule 6, 09:30~09:40)
- v2 E2E·v1 `/try` E2E — user 시점에서 매끄러운가, 캡처 시연용으로 쓸 만한가
- M2 정량 자기평가 (기능 80% → 90% 근거 충분한가, 정책 30%는 어디서 멈췄나)
- M3 W2 plan: 링크 본문 추출 진입 시점 vs 테스트 커버리지 vs Pro 이관 우선순위
- pullim-admissions-coach 별도 세션 산출물 합류 — 본 daily 트랙과 어떤 형태로 정합 (한 문서·교차 인용·별도 트랙 유지)

6. 예상 blocker:
- **부채 7건 통합 contract** — M2 closure·M3 plan·v2 E2E·v1 E2E·v1 단위 테스트·v2 단위 테스트·Pro 이관 모두 동시 진행 시 quality 분산. 우선순위 강제(M2/M3 plan → E2E → 단위 테스트 → Pro 이관) 필수
- 휴일 다음 day의 가속 부담 — 회복 후 첫 day는 cold start 비용 ~30m, 09:30~09:40 검수가 그 역할
- pullim-admissions-coach 별도 세션 산출물의 정합 형태 미정 — 두 트랙 동시 sprint 결과를 어떻게 EPO/대표님께 보여드릴지 결정 부담
- v2 E2E는 headless 한계가 6/2 그대로 — UniversalCapture 6채널 일부(사진·말)는 user 직접 입력 필요
- 수습 D-19 — 매 daily 능동성·자기 증명 가시화 필요. 휴일 day는 음전 신호 아니나 6/4 무행동은 위험

7. 당김 후보 (Standing Rule 5):
- 링크 본문 추출(D 채널) — 4채널 중 마지막 1건. Hobby 가능 (server fetch + readability). M3 W2 plan 확정 후 즉시 진입 가능
- HWP 파싱 prototype (hwp.js 품질 시험 — Hobby 가능 영역)
- pullim-admissions-coach Member DB doc v0.1 EPO 검수 (8개 결정 잠금 후속)
- /api/score 라우트 fetch 다이버전스 (memory `score-route-fetch-divergence` — SDK 계약 §6 정정, EPO 리뷰 항목)
- CI Node 24 테스트 워크플로 (memory `pending-followups` 미착수 1건)
```


## 15:30 Evidence Check

```text
[15:30 Evidence Check / 최선혜]

▶ 오늘 09:30 contract 7건(M2 closure·M3 W2 plan·v2 E2E·v1 /try E2E·v1 단위 테스트·v2 단위 테스트·Pro 이관)에서 큰 pivot: **출시 P0/P1/P2 13건 자체 진척 분석 → 자력 해소 가능 4건 즉시 sprint** (P1-#9 CI gate / P2-firefox·webkit / P2-PDF는 어제 완료 / P0-#5 Sentry). 6/2 출시 계획(`pending-followups`)·6/15 D-day·수습 D-19 압력 정합.

1. 현재까지 나온 링크/파일:
- 09:30 daily 작성 — 휴일 다음 day, 부채 7건 통합 contract 헤더 + 7번 당김 후보 5건 박힘
- ★ **P0/P1/P2 13건 자체 진척 분석 출력** — 완료 3건(P1-#9·P1-#10 부분·P2-PDF), 부분/후퇴 2건(P1-#7 HWP·P0-#6 dogfood), 미완 8건. 자력 해소 4건 우선순위 + 의존 차단 5건 분리
- ★ **PR #59 머지** (0392851) — Playwright 3브라우저(chromium·firefox·webkit) 매트릭스 + CI 캐시 키 `-cfw` suffix fix. **6/2 stash WIP 청산** + P2-firefox/webkit 닫힘
- ★ **PR #60 머지** (f954350) — Sentry 에러 모니터링 통합. Next.js 16 instrumentation 패턴(`instrumentation.ts`·`instrumentation-client.ts`) + `withSentryConfig` wrap + `app/global-error.tsx`·`app/error.tsx` + `/api/score` 명시적 capture. **P0-#5 출시 차단 1건 자력 해소**
- ★ **PR #61 머지** (1077686, CLEAN) — `.env.example` 6개 placeholder + `.gitignore` `!.env.example` 예외. follow-up
- main HEAD: 1077686. 오늘 3 PR 추가 입수(누적 6/2+6/4 = 6 PR)

2. 현재까지 나온 샘플:
- 신규 글 샘플 **0건** (v1/v2 anchor 5종 그대로)
- 시각 검증 캡처 추가 0장 (오늘은 코드/인프라 PR만)
- v2 E2E·v1 `/try` E2E user 직접 회귀는 미실시(이월)
- M2 closure·M3 W2 plan 표·그림 작성 안 함(미실시)

3. 화면 또는 문서 증거:
- **PR #59**: typecheck 0 · `npx playwright test --project=chromium` 9/9 (20.9s) · CI 5/5 그린 후 admin squash. Codex Review 1라운드 APPROVED("일관되게 반영")
- **PR #60**: typecheck 0 · `npm run build` 14 routes prerender + Sentry 통합 성공 · unit 0 fail · component 45/45 · CI 6/6 그린. **Codex Review 3 라운드** — 1차 COMMENTED(환경 태깅·global-error 미흡) → 2차 COMMENTED(error.tsx·route catch·문구 사실 불일치) → 3차 **APPROVED**("기능적 문제·회귀 위험 없음"). admin squash
- **PR #61**: typecheck 0 + build pass · CI 6/6 그린 + `mergeStateStatus: CLEAN` (admin 우회 없이 정상 머지)
- ✅ **deploy-on-merge memory 동작 검증**: 3 PR 모두 main 머지 → Vercel auto-deploy ready
- `.env.example` 추적: `git check-ignore` 결과 "ignore 해제 OK"(`.gitignore:38:!.env.example`)

4. 부족한 것:
- ⚠ **09:30 contract 7건 중 4건 미실행** (자력 해소 4건 sprint로 대체):
  · **M2 closure 1page** — 9일째 부채 그대로
  · **M3 W2 plan 1page** — 미수립
  · **v2 E2E user 회귀** — 6/2부터 이월, 미실시
  · **v1 `/try` E2E user 회귀** — 5/31부터 이월, 미실시
- ※ v1 컴포넌트 단위 테스트 +N건 PR — 미실시 (자력 4건 sprint에 시간 소진)
- ※ v2 컴포넌트 단위 테스트 시드 — 미실시 (위 동일)
- v2 자체 잔여 6/2 그대로:
  · GitHub 자동 배포(`vercel git connect` curea-co GitHub App 재승인) — 미시도
  · Vercel Hobby → Pro 이관 ①~③ 자료 정리 — 미시도
- pullim-admissions-coach 별도 세션 합류점 결정 — 미시도 (별도 트랙 진행 중)
- pullim-admissions-coach `prompt_v0.1.md` M2 산출물 — 5/30부터 9일째 이월
- ★ **Codex 리뷰 라운드 비용 학습**: PR #60에서 3 라운드 = 정정 5건. 1라운드는 분류·범위 오류, 2라운드는 세부 누락. PR #59는 1라운드만에 APPROVED. **인프라/관측성 PR이 UX PR보다 Codex 리뷰 라운드 평균 2~3배 더 깊은 경향** (Sentry 같은 cross-cutting 통합은 coverage map 검수가 길어짐)

5. 17:30 전까지 보강할 것:
- (최우선) **M2 closure 1page + M3 W2 plan 1page** — 어제 부채 + 오늘 3 PR 머지(누적 6 PR)로 M2 명목 산출 완성 → closure 가능. 작성 미루지 말 것
- **Codex 봇 리뷰 라운드 패턴 → 재사용 자산 11번에 박기**: 인프라 PR(관측성·CI·배포) ≠ UX PR. 코드 작성 전에 "전역 에러 수집 경로 4 layer(server thrown · onRequestError · error.tsx · global-error.tsx · API catch 명시) 모두 박았는가" 체크리스트화. 다음 인프라 PR(Pro 이관·도메인 alias·부모 인증)에 그대로 적용
- (선택) v2 E2E user 회귀 + 캡처 3~5장 — 17:30 전 빈 시간 있으면 진입
- (선택) **EPO 후속 Sentry 가입 가이드 1page** — Vercel project env에 `SENTRY_DSN`·`NEXT_PUBLIC_SENTRY_DSN` 등록하면 즉시 활성화. PR #60 머지 후 evidence 캡처용
- 회의록 §능동성 피드백 응답 평가 — pullim-admissions-coach 별도 세션 산출물 합류 시점 결정(본 daily는 자력 해소 4건 sprint로 응답)
```


## 17:30 Daily Outcome

```text
[17:30 Daily Outcome / 최선혜]

▶ 오늘 핵심: 09:30 contract 7건(M2 closure·M3 W2 plan·v2 E2E·v1 /try E2E·v1 단위 테스트·v2 단위 테스트·Pro 이관) → 15:30에 P0/P1/P2 13건 자체 진척 분석 후 **자력 해소 4건 sprint pivot** → **v1 3 PR 머지 + 문서 6건 + ★ 재사용 자산 3건 박힘 + v2 E2E 캡처 5장 + 대표님 보고서 1page**. 6/15 출시 D-11 시점에 P0 1건 자력 해소 완료.

1. 오늘 닫은 pullim-writing-coach 산출물:
- ★ **v1 3 PR main 머지** — #59(firefox/webkit E2E 3브라우저 매트릭스 + cfw 캐시 키 fix) · #60(Sentry P0-#5 출시 차단 자력 해소, Next.js 16 instrumentation 4 layer) · #61(.env.example 템플릿 + .gitignore 예외, CLEAN 머지)
- ★ **M2 closure 1page** (`docs/20_m2_closure_2026-06-04.md`) — 누적 22 PR(v1 15 + v2 7) 명목 산출 표 + 잔여 부채 분리 + 정량 자기평가(기능 80→90 근거 7차원 표) + M3 이관 항목
- ★ **M3 W2 plan 1page** (`docs/21_m3_w2_plan_2026-06-04.md`) — 남은 P2 자력 3건 진입 순서 + Pro 이관 ①~③ 자력 부분 + 외부 의존 P0 5건 모니터링 4 룰 + W2 day별 ★ 산출 가이드
- ★ **인프라 PR 4 layer 체크리스트** (`docs/22_infra_pr_checklist.md`) — PR #60 Codex 3 라운드 학습 자산화 + Layer 1~5(server thrown·error.tsx·global-error·API catch·client) + 인증·결제·배포 전용 추가 layer + 다음 5건 인프라 PR 적용 우선순위. **재사용 자산 ① (Rule 2 충족)**
- ★ **v2 E2E 자동 회귀 보고서** (`docs/23_v2_e2e_regression_2026-06-04.md`) — 데스크탑+모바일 5장 캡처(라이트/다크/입력 800자/about/모바일) + ✅ 정상 5건 + ⚠ 헤드리스 미검증 3건 + user 직접 회귀 후속 액션. **재사용 자산 ②**
- ★ **EPO Sentry 가입 가이드 1page** (`docs/24_sentry_setup_guide.md`) — 가입 10m·env 등록 5m·source map 10m·활성화 검증·운영 룰(Alert·Quota·PII)·트러블슈팅 표 + 후속 evidence 캡처 자리. **재사용 자산 ③**
- ★ **대표님 보고서 1page** (`docs/Daily/2026-06-05-report.md`) — v1·v2 양 트랙 10 PR 통합 + v1↔v2 두 화면 비교 표(13 차원) + 의사결정 요청 4건(Sentry 가입·Pro 이관·부모 시스템·v1↔v2 통합 전략)
- daily 09:30·15:30·17:30 세 섹션 작성

2. 오늘 닫은 pullim-admissions-coach 산출물:
- 본 daily 범위 밖 — 별도 세션 진행. v2 트랙(`pullim-writing-coach_v2`)이 7 PR 머지된 정보는 인지(대표님 보고서 §2·§3에 통합), pullim-admissions-coach 별도 세션 산출물 합류 시점은 미결정

3. 실제 링크/파일:
- main commits 3건: `1077686`(#61) · `f954350`(#60) · `0392851`(#59)
- 신규 docs 5건: `docs/20_m2_closure_2026-06-04.md` · `docs/21_m3_w2_plan_2026-06-04.md` · `docs/22_infra_pr_checklist.md` · `docs/23_v2_e2e_regression_2026-06-04.md` · `docs/24_sentry_setup_guide.md`
- 신규 보고서 1건: `docs/Daily/2026-06-05-report.md` (CEO 폴더 → Daily 폴더로 이동, 파일명 `2026-06-05-report.md`로 정리)
- 신규 screenshot 5장: `docs/screenshot/v2-e2e-2026-06-04-{01-home-desktop·02-home-dark·03-home-input-filled·04-about·05-home-mobile}.png`
- daily_outcome_2026-06-04.md 09:30·15:30·17:30 세 섹션 + daily_outcome_2026-06-03.md(휴일 표기) + daily_outcome_2026-06-02_over.md(어제 overnight 위임 5트랙) 갱신

4. 샘플:
- 신규 글 샘플 **0건** (v1/v2 anchor 5종 그대로)
- v2 E2E 검증 캡처 5장 (시연·보고서 evidence)
- 추정 vs 실제 캘리브레이션 데이터 1셋(11번 참조 — 인프라 PR Codex 라운드 비용 학습)
- M2 closure 정량 자기평가 표 1건 (회의록 80% → 90% 7 차원 근거)

5. AI가 만든 것 (트랙 A·B·C·D·E):
- 트랙 A(v1 PR 3건 일괄): #59 commit message + ci.yml `-cfw` 패치 + #60 instrumentation·error/global-error.tsx·route catch 5건 정정 + #61 .env.example 6 placeholder + .gitignore 예외
- 트랙 B(문서 6건): M2 closure·M3 W2 plan·인프라 체크리스트·v2 E2E 보고서·Sentry 가이드·대표님 보고서 전체 본문
- 트랙 C(daily): 09:30·15:30·17:30·v1↔v2 비교 표 + 보고서 통합
- 트랙 D(v2 자동 회귀): Playwright headless 5장 캡처 + alert dialog 정상 동작 확인 + 동선 한계 분석
- 트랙 E(분석): 출시 P0/P1/P2 13건 자체 진척 분석 + 자력 4건 우선순위 결정

6. 내가 수정/기각/채택한 것:
- 채택: **자력 해소 4건 sprint pivot** — 09:30 contract 7건 중 외부 의존 차단된 항목 제외하고 자력 가능 4건만 우선
- 수정: PR #59 1차 push 직후 CI 18 fail (캐시 hit 시 webkit 바이너리 누락) → 직접 ci.yml 캐시 키 `-cfw` suffix fix, 30분 안에 그린
- 수정: PR #60 Codex 3 라운드 정정 5건 — 1라운드(환경 태깅 fallback·global-error 추가) → 2라운드(error.tsx·api/score 명시적 capture·문구 false advertising 제거) → 3라운드 APPROVED
- 채택: **v1↔v2 통합 전략 3 옵션(A·B·C)** 명시 → 대표님 의사결정 입력 (옵션 A=안정 출시 후 M4 통합 / B=6/15 통합 출시 / C=별 도메인 동시 출시)
- 수정: 대표님 보고서 1차(v1만 3 PR) → 2차(v2 트랙 7 PR + v1↔v2 비교 표 13차원 + 의사결정 4번째 항목 추가) 갱신
- 채택: 인프라 PR 4 layer 체크리스트 **재사용 자산화** (PR #60 학습 → 다음 5건에 적용, Codex 라운드 1~2로 단축 목표)
- 채택: 보고서 파일 위치를 `docs/CEO/` → `docs/Daily/`로 이동 + 파일명 정리

7. 검증 결과 / AI 검증 카운트:
- v1 3 PR 모두 그린 머지: Component(45/45 RTL·Vitest) · E2E(9×3=27건 Playwright) · Typecheck 0 · Review(Codex) · Vercel
- vitest 로컬: 45/45 pass, build 14 routes 정상
- v2 prod 5장 캡처 정상 (라이트/다크/입력/about/모바일)
- **AI 검증 카운트**: 
  · AI(Codex 봇)가 잡은 곳 **5건** (PR #60 환경 태깅 fallback·global-error 미흡·error.tsx 누락·route catch 누락·문구 false advertising)
  · 본인이 잡은 곳 **3건** (#59 CI fail 캐시 키 누락 직접 발견 + ci.yml fix, v2 회귀에서 채널 클릭이 capture event 미 emit 패턴 발견, 보고서 1차에 v2 트랙 누락 → 2차에 양 트랙 통합)
- 누적 6/2~6/4 AI 검증 카운트: AI 잡 **9건** / 본인 잡 **5건** (AI:본인 비율 9:5, AI 의존도 64% — 학습 데이터 누적)

8. 미완료/미검증:
- 🟡 **v1·v2 E2E user 직접 회귀** — 자동 회귀(헤드리스)는 끝났으나 user 시점 동선 미실시. v1은 5/31부터, v2는 6/2부터 이월. 특히 v2 라이브 추출 동선(데모 토큰 모달 → /api/extract Claude Haiku 실호출)이 헤드리스에서 발동 안 됨(채널 클릭이 capture event 미 emit) — user 직접 회귀로 확정 필요
- 🟡 v1 컴포넌트 단위 테스트 +N건 PR — 미실시 (자력 4건 sprint에 시간 소진, M3 W1 6/6~6/7로 이월)
- 🟡 v2 컴포넌트 단위 테스트 시드 — 미실시 (M3 W1로 이월)
- 🟡 Vercel Pro 이관 ①~③ 자료 정리 — 미시도 (M3 W1 6/4~6/7 분산 진입, 오늘 저녁 시간 없어 6/5로)
- 🟡 GitHub 자동 배포 연결(`vercel git connect` curea-co GitHub App 재승인) — 미시도
- pullim-admissions-coach 별도 세션 산출 합류 시점 결정 — 별도 세션 진척 따라 의사결정 입력 대기
- pullim-admissions-coach `prompt_v0.1.md` M2 산출 — 9일째 이월(8/1 D-58, 본 daily 범위 밖)
- 외부 의존 P0 5건(도메인·인증·billing·dogfood 모집) — 대표님 6/5 10:30 보고로 의사결정 입력

9. 내일 첫 액션 (6/5 금 — 대표님 보고 day):
- (09:30~10:25) Daily 09:30 Work Contract + 보고 자료 최종 점검 + v2 E2E 캡처 + Sentry 가이드 출력
- **(10:30~) 대표님 보고** (`docs/Daily/2026-06-05-report.md` 기반): 의사결정 4건 요청 (Sentry 가입·Pro 이관·부모 시스템 진척·v1↔v2 통합 전략)
- (보고 후) 외부 의존 P0 진척 daily 룰 가동 시작 (M3 W2 plan §3 룰 A·B·C·D 적용)
- (오후) **링크 본문 추출(D 채널) PR 진입** — Hobby 가능, server fetch + readability. M3 W1 day 1 메인 산출
- (오후) **Vercel Pro 이관 ①현황 점검 1page** — 자력 부분 시작
- (선택, 17:30 전 빈 시간) v2 컴포넌트 단위 테스트 시드 1~2건 또는 v1 단위 테스트 +1~2건

10. 재사용 가능한 프롬프트 / 체크리스트 / 하네스:
- ★★★ **인프라 PR 4 layer 체크리스트** (`docs/22_infra_pr_checklist.md`) — Codex PR #60 3 라운드 학습으로 도출. 다음 인프라 PR(Pro 이관·도메인 alias·부모 인증·부모 billing·OCR) 5건에 적용 → 라운드 1~2로 단축 목표. **본 자산은 출시 6/15 전 최소 1건(Pro 이관) 또는 2건(Pro 이관 + 도메인 alias)에서 효과 측정 → M3 W2 closure 시 누적 라운드 수치 비교**
- ★★ **v2 E2E 자동 회귀 패턴** (`docs/23_v2_e2e_regression_2026-06-04.md`) — Playwright headless로 시각 검증 5장 + 헤드리스 한계 명시(클립보드·sessionStorage·라이브 토글) → user 직접 회귀와 분리. 6/5 user 회귀 후속 액션 형식으로 정합
- ★★ **EPO Sentry 가입 가이드** (`docs/24_sentry_setup_guide.md`) — PR #60 머지 후 evidence 캡처 자리(§8) 미리 마련. 다음 P0 자력 해소 PR(예: 도메인 alias, 부모 인증)에 동일 "EPO 후속 가이드" 패턴 적용 가능
- (보조) M2 closure 정량 자기평가 7 차원 표 (`docs/20_m2_closure_2026-06-04.md` §3) — 회의록 평가 80% → 90% 근거 패턴, M3·M4 closure에도 동일 차원 적용
- (보조) M3 W2 plan의 외부 의존 P0 진척 모니터링 4 룰(A·B·C·D, `docs/21_m3_w2_plan_2026-06-04.md` §3) — 매 daily 09:30 1줄 + 진척 시 next day 액션 + D-7 sweep + backup 발동 룰

11. 오늘 추정 vs 실제 (시간):
- 09:30·15:30·17:30 daily 작성: 추정 30m vs 실제 ~50m (+67%, 양 트랙 통합 분량 + 15:30·17:30 풀세트)
- 출시 P0/P1/P2 13건 자체 진척 분석: 추정 30m vs 실제 ~40m (+33%)
- PR #59 firefox/webkit + 캐시 키 fix + 그린 폴링: 추정 30m vs 실제 ~1h (+100%, 18 fail 사고 + cfw fix)
- PR #60 Sentry + Codex 3 라운드 정정: 추정 1h vs 실제 ~2.5h (+150%, 5건 정정 push 2회)
- PR #61 .env.example: 추정 10m vs 실제 ~15m
- 대표님 보고서 1차(v1) + 2차(v2 통합 + 비교 표): 추정 30m vs 실제 ~45m (+50%)
- M2 closure 1page + M3 W2 plan 1page: 추정 1h vs 실제 ~1.2h (+20%)
- v2 E2E 자동 회귀 + 보고서: 추정 30m vs 실제 ~30m (정합)
- Sentry 가이드 1page: 추정 30m vs 실제 ~25m (-17%)
- 인프라 PR 체크리스트: 추정 20m vs 실제 ~25m (+25%)
- **총 추정 ~5h 40m vs 실제 ~8h 10m (+44%, 인프라 PR Codex 라운드 비용이 캘리브레이션 가장 큰 편차 — 다음 인프라 PR 추정 시 라운드당 +30m 버퍼 박기)**

▶ 보고 끝. M2 closure 시점 22 PR 누적, P0 자력 해소 1건 완료, 자산 ★ 3건 신축. 6/5 대표님 보고로 외부 의존 P0 5건 의사결정 입력 + M3 W1 진입.

```
