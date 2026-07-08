# 2026-06-10 일일 보고 / 최선혜 — 수습 종료 D-13 · M3 W2 day 2 · 새 UX flow sprint day 3


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
https://github.com/curea-co/suwon-monorepo · PR #310 (사자성어 챌린지 풀스택, 리뷰 대기)
※ PR #281 챌린지 화면 머지 완료 (6/9). 암산왕 챌린지 작업 plan 수립 중.

pullim-writing-coach 리포 / 데모 (v1, 2순위 — suwon PR 리뷰 대기 중 진입):
https://github.com/curea-co/pullim-writing-coach · https://pullim-writing-coach-demo.vercel.app/

pullim-writing-coach_v2 리포 / 데모 (새 패러다임, 이식 코드 출처):
https://github.com/curea-co/pullim-writing-coach_v2 · https://pullim-writing-coachv2.vercel.app/

pullim-admissions-coach 리포 / 데모:
https://github.com/curea-co/pullim-admissions-coach · https://pullim-admissions-coach.vercel.app/
```


## 09:30 Work Contract

```text
2026-06-10 (수) — ▣ M3 W2 day 2 · 새 UX flow Phase 1 PR C 진입 day · 수습 종료 D-13
[09:30 Work Contract / 최선혜]

▶ 외부 의존 P0 진척 (룰 A 정착 3 day째, docs/29 §4 source):
  P0-#1 Pro 이관: 보류(6/13 재검토) | P0-#2 도메인 alias: 미진척 | P0-#3 부모 인증: 출시 후 별도 | P0-#4 부모 billing: 출시 후 별도 | P0-#6 dogfood 모집: 출시 후 수집
  ※ 변동 없음 — 6/13 (토) 재검토 D-3

▶ 어제(6/9 화) 마감:
  ① ★ **양 트랙 동시 진척 day** — 1순위 suwon 3건(PR #281 머지·PR #310 사자성어 풀스택 생성·암산왕 plan 수립) + 2순위 writing-coach (다른 세션 main 변동 흡수 + 본 세션 daily·슬랙 통합)
  ② ★ **다른 세션 main 변동 흡수** (PR #69 머지 추정):
     · `app/lib/server/anthropic.ts` 신설 — T2.3 `callModel`·`isAuthorized` 공유 헬퍼 분리
     · `app/api/extract/helpers.ts` 신설 — 토큰 게이트·EXTRACT_MESSAGE·jsonError·logMetric Node 테스트 가능 단위로
     · `/api/extract` route Codex 정정 — E-PARSE → E1 매핑 변경 (입력 본문 invalid는 E1, E-PARSE는 모델 응답 파싱 실패용)
     · `.env.example` `NEXT_PUBLIC_DEMO_TOKEN` 항목 추가 — 자동 입장 + Vercel rate limit + Anthropic 월 예산 알람 주석 정착
  ③ daily 09:30·17:30 작성
  ④ ★ **재사용 자산 1건**: 슬랙 봇 토큰 보안 인시던트 대응 체크리스트 7단계 (docs/Daily/daily_outcome_2026-06-09.md §8) → 다음 day docs/25로 정착 후보
  ⑤ 슬랙 봇 통합 진행 중 — revoke·새 토큰·워크스페이스 정책 진단·SecureString 트러블슈팅 → not_authed 응답 1회 + Get-Clipboard 우회 안내까지

▶ 미해결 인계 (오늘 또는 이후):
  - 🔴 **Phase 1 PR C 진입** — UniversalCapture·AssignmentCard·ConfidenceChip 컴포넌트 v2 → v1 이식 (6/9에서 이월)
  - 🔴 **suwon 1순위 진척 동기화** — PR #310 사자성어 풀스택 리뷰·머지 점검 + 암산왕 챌린지 plan 검수 + W2 plan 영향 평가
  - ❌ **슬랙 봇 통합 작업 DROP** — 본 day 결정 (drop 이유: 워크스페이스 owner 권한 의존·SecureString 환경 트러블슈팅 비용·임성호 요청 추가 의존 등 합산 ROI 낮음). 6/9 학습은 docs/25로 정착 가능(선택), GitHub Actions daily-worklog.yml PR도 함께 drop
  - ⚠ docs/22 인프라 체크리스트 갱신 — `@sentry/nextjs` ESM 해석 한계 + helper 분리 패턴 정착 (PR #69 학습)
  - ⚠ docs/25_secret_leak_response_checklist.md 신설 — 슬랙 drop 후에도 일반 외부 통합(Vercel Pro·OAuth·결제·도메인) 사전 적용 가치 있음. 우선순위 낮음(선택)
  - ⚠ pullim-admissions-coach `prompt_v0.1.md` M2 산출물 — 5/30 이월 15일째 누적
  - 수습 종료 6/23 D-13 — 매 daily 능동성·자기 증명 가시화

▶ 오늘 위치: **M3 W2 day 2 · 새 UX flow Phase 1 PR C 진입 day (2회차 시도)**. 6/9 시간 분배가 슬랙 보안 인시던트로 소진돼 Phase 1 PR C 이월 → 본 day는 **슬랙 작업 drop 후 Phase 1 closure 단일 집중**.

0. 오늘 작업 순서 (1순위 suwon → 2순위 writing-coach 분배, 슬랙 drop으로 Phase 1 PR C 시간 확보)
- (09:30~10:00) **suwon 1순위 진척 동기화** — PR #310 리뷰 라운드·머지 여부 + 암산왕 plan 검수 결과 + W2 시간 분배 영향 평가
- (10:00~11:30) **★ Phase 1 PR C 사전 분석 + plan 1page** — v2 코드(`C:\workspace\pullim-writing-coach_v2\app\components`) UniversalCapture·AssignmentCard·ConfidenceChip + Tailwind 토큰 + "use client" 경계 + sessionStorage 의존 분석 → 이식 PR 분리 plan (단일 PR vs 컴포넌트별 PR vs lib 우선)
- (11:30~12:00) (선택) **docs/22 인프라 체크리스트 갱신** — `@sentry/nextjs` ESM 해석 한계 + helper 분리 패턴 정착 (PR #69 학습)
- (점심 후 13:30~16:30) **★ Phase 1 PR C 진입** — UniversalCapture·AssignmentCard·ConfidenceChip 3 컴포넌트 v2 → v1 이식:
  - (13:30~14:30) Tailwind 토큰 호환 + "use client" 경계 정리 (사전 분석 결과 적용)
  - (14:30~16:00) 3 컴포넌트 이식 작성 + Vitest mock 원복 패턴 적용 단위 테스트 시드 1~2건
  - (16:00~16:30) tsc·build·component test·E2E 회귀
- (16:30~17:00) commit → push → PR #70 (또는 다음 번호) 생성 + CI 폴링 시작
- (17:00~17:30) Codex 라운드 대응 시작 (그린·Approved 시 머지, 안 되면 Overnight 위임)
- (저녁) 17:30 Daily Outcome + over.md (Overnight 위임 후보 박기)
- (선택, 시간 여유 시) docs/25_secret_leak_response_checklist.md 신설

1. 오늘 진행할 pullim-writing-coach 산출물:
- ★ **Phase 1 PR C 신설** — UniversalCapture·AssignmentCard·ConfidenceChip + Vitest 단위 테스트 시드 1~2건 (Phase 1 closure)
- ★ **Phase 1 PR C 사전 분석 plan 1page** — v2 → v1 컴포넌트 이식 plan (단일 PR vs 분리 결정)
- (선택) docs/22 인프라 체크리스트 갱신 — ESM 한계 + helper 분리 패턴
- (선택) docs/25_secret_leak_response_checklist.md 신설 — 슬랙 drop 후에도 일반 외부 통합 대응 가치
- daily 09:30·17:30 + over.md

2. 오늘 병렬로 진행할 pullim-admissions-coach 산출물:
- 본 daily 범위 밖 — 별도 세션 진행. Phase 1 closure 집중 day라 합류 미진척
- (이월 15일째) `prompt_v0.1.md` M2 산출물 — 별도 세션 진척 따라

2-1. 1순위 suwon-monorepo 진행 (참고 — 별도 세션 트랙):
- **PR #310 사자성어 챌린지 풀스택** — 리뷰·머지 점검 (어제 17:30 시점 리뷰 대기)
- **암산왕 챌린지 작업 plan** — 검수 후 implementation 진입 여부 점검
- 양 트랙 동시 sprint = 회의록 §능동성 피드백(주도적·차별화) 정합

3. 오늘 만들 샘플 수:
- 신규 글 샘플 0건 (anchor 5종 유지)
- v2 → v1 이식 매트릭스 갱신 (UniversalCapture·AssignmentCard·ConfidenceChip 3건 이식 결과, docs/26 §2 갱신)
- Vitest 단위 테스트 시드 1~2건 (PR #70 산출)
- (slack ok 시) 슬랙 메시지 1건 — GitHub Actions PR 동작 검증용 시드

4. AI에게 맡길 일:
- 트랙 A(suwon 1순위 동기화): PR #310 리뷰 진척 확인 + 암산왕 plan 검수 결과 본 daily 17:30 인테이크
- 트랙 B(Phase 1 PR C 사전 분석): v2 → v1 컴포넌트 이식 plan 1page (Tailwind 토큰·"use client"·sessionStorage 의존 분석)
- 트랙 C(Phase 1 PR C 진입): UniversalCapture·AssignmentCard·ConfidenceChip 이식 + Vitest 단위 테스트 시드 + PR 본문 + Codex 라운드 대응
- 트랙 D(선택, docs 정착): docs/22 ESM 한계 + helper 분리 패턴 또는 docs/25 보안 인시던트 체크리스트
- 트랙 E(daily): 09:30·17:30 + over.md
- ❌ 트랙 F(슬랙 봇 통합) — drop

5. 내가 직접 검수/판단할 일:
- **Phase 1 PR C 사전 분석 plan 결정** — 단일 PR vs 컴포넌트별 분리 vs lib 우선 (이식 PR 분리 단위 결정)
- **Phase 1 PR C 컴포넌트 이식 충돌 처리** — v1 기존 컴포넌트(ScoreForm·TokenGate·MetaForm)와 충돌, 새 UX flow는 `/try` 완전 교체이므로 기존은 Phase 2 이후 단계적
- **suwon 1순위 시간 분배 영향** — PR #310 머지 시 다음 항목(암산왕)이 plan 단계인지 implementation 단계인지에 따라 writing-coach 시간 압축 여부 결정
- (선택) **docs/25 정책 차원** — 슬랙 drop 후에도 일반 외부 통합 PR(Vercel Pro·도메인·OAuth·결제) 사전 적용 가치 평가

6. 예상 blocker:
- **Phase 1 PR C 분량** — 3 컴포넌트 + Vitest 단위 테스트 시드. v2 Tailwind 토큰 ↔ v1 차이 + "use client" 경계 + sessionStorage 의존 분석. Codex 인프라 PR 평균 2~3 라운드 예상 (docs/22 4 layer 체크리스트 적용 첫 컴포넌트 PR — 효과 측정 첫 case)
- **suwon PR #310 리뷰 라운드 지연** — 다른 세션 의존이라 writing-coach W2 시간 분배 영향 미정
- (선택) **새 docs PR Codex 라운드 비용** — 6/8 #68에서 9라운드 학습 + 6/9 #69에서 helper 분리 정정 → docs PR 신설 시 사전 체크리스트(요일·표현·일관성) 적용해 라운드 1~2로 단축 시도
- ✅ 슬랙 봇 통합 작업은 drop으로 blocker 1건 제거 (시간 분배 안정화)

7. 당김 후보 (Standing Rule 5):
- 링크 본문 추출(D 채널) PR — Phase 1 closure 후 빈 시간 진입 가능 (M3 W2 plan 원래 항목)
- Vercel `git connect` curea-co GitHub App 재승인 시도 (5분 안에 가능 여부 시험)
- v2 컴포넌트 단위 테스트 시드 +N건 (Phase 1 PR C 이식 동시에 가능)
- /api/score 라우트 fetch 다이버전스 정정 (memory `score-route-fetch-divergence` — main에 T2.3 callModel·isAuthorized 공유 헬퍼 분리되면서 일부 정합 진행 중, 잔여 정정 측정)
- pullim-admissions-coach Member DB doc v0.1 EPO 검수 (8개 결정 잠금 후속)
```
