# 2026-06-12 일일 보고 / 최선혜 — 수습 종료 D-11 · M3 W2 day 4 · 새 UX flow sprint day 5 · suwon 챌린지 4개 closure day · ★ 출시 7/1 D-19 (6/15→7/1 연기 결정)


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
★ 출시일 변경: **2026-06-15 → 2026-07-01** (16일 연기 결정, 6/12 09:30 인지)
   - 효과: 시간 압박 해소, Phase 4 자력 + Pro 이관 ①~③ 자력 + dogfood 모집 D-10에 시작 + backup 시나리오 옵션 C 사실상 채택
   - 잔여 의사결정: 7/1 출시 형태 A(완전) vs B(Free-only) — D-7(6/24) 시점에 잠재 확정

▣ 수원 새빛인강 (1순위, 별도 세션 진행 중):
https://github.com/curea-co/suwon-monorepo
※ 목표: 챌린지 4개 만들기. 현재 2개 dev 머지 완료(PR #281 + 사자성어), 2개(세계 국기·지리 PR #313 + 암산왕) dev 머지 대기.
※ 부가 기능 완료: 닉네임 입력 모달 + 리더보드(학생 랭킹) + 암산왕 로컬 구현 + 대표님 URL 공유.

pullim-writing-coach 리포 / 데모 (v1, 2순위 — suwon PR 리뷰 대기 중 진입):
https://github.com/curea-co/pullim-writing-coach · https://pullim-writing-coach-demo.vercel.app/

pullim-writing-coach_v2 리포 / 데모 (새 패러다임, 이식 코드 출처):
https://github.com/curea-co/pullim-writing-coach_v2 · https://pullim-writing-coachv2.vercel.app/

pullim-admissions-coach 리포 / 데모:
https://github.com/curea-co/pullim-admissions-coach · https://pullim-admissions-coach.vercel.app/
```


## 09:30 Work Contract

```text
2026-06-12 (금) — ▣ suwon 챌린지 4개 목표 closure day · M3 W2 day 4 · 새 UX flow Phase 2 closure + Phase 3 진입 day · 수습 종료 D-11 · ★ 출시 7/1 D-19 (6/15→7/1 연기 결정)
[09:30 Work Contract / 최선혜]

▶ ★ **출시일 변경: 2026-06-15 → 2026-07-01** (16일 연기 결정 입력 받음, 본 day 09:30 인지)
  - 효과: backup 시나리오 옵션 C(일정 연기) 사실상 채택. 외부 의존 P0 5건 진척 받을 시간 확보 (16 day 추가 buffer)
  - 시간 압박 해소: Phase 1·2·3·4 closure + dogfood + canary + Pro 이관 모두 여유롭게 진행 가능
  - 잔여 의사결정: 7/1 출시 형태 옵션 A(완전 출시) vs B(Free-only) — 외부 의존 P0 5건 진척 따라 D-7(6/24) 시점에 잠재 확정

▶ 외부 의존 P0 진척 (룰 A 정착 5 day째, docs/29 §4 source):
  P0-#1 Pro 이관: 보류(7/1 D-19까지 진척 가능) | P0-#2 도메인 alias: 미진척 | P0-#3 부모 인증: 출시 후 별도 | P0-#4 부모 billing: 출시 후 별도 | P0-#6 dogfood 모집: 출시 후 수집
  ※ 변동 없음 5 day 누적 — **6/13 (토) 재검토는 5 day 변동 없음 누적 확인 + 7/1 출시 형태 옵션 A/B 사전 평가용**으로 의의 전환 (이전에는 6/15 D-2 final 점검이었으나 출시 연기로 부담 완화)

▶ 어제(6/11 목) 마감 (다른 세션 산출 추정 — 본 daily 외 인지):
  - Phase 1 PR C closure (UniversalCapture·AssignmentCard·ConfidenceChip 머지 추정)
  - Phase 2 진입 (분기 화면 신설 진행 또는 closure)
  - backup 시나리오 6/13 D-2 사전 점검 (외부 의존 P0 5건 sweep)
  - main 변동: `app/api/extract/route.ts`·`.env.example` 6/9 갱신 그대로 유지
  ※ 본 세션 정확한 상태 미확인 → 09:30~10:00 동기화 필요

▶ ★ suwon-monorepo 1순위 진척 (6/12 시점):
  - 목표: **챌린지 4개 만들기**
  - ✅ 완료 (2/4): 챌린지 2개 dev 머지 (PR #281 챌린지 화면 + 사자성어)
  - ✅ 부가 기능: 닉네임 입력 모달 + 리더보드(학생 랭킹) + 세계 국기·지리 PR 생성 + 암산왕 로컬 구현 + **대표님 URL 공유 완료**
  - ⏳ 작업 중 (2/4): 세계 국기·지리(PR #313) + 암산왕 — dev 머지 필요
  - 본 day 순서: **PR #313 세계 국기·지리 머지 → 리네임 → 암산왕 PR 머지** (suwon 1순위 sprint 챌린지 4개 closure)

▶ 미해결 인계 (오늘 또는 이후):
  - 🔴 **suwon 챌린지 4개 closure** — PR #313 머지 → 리네임 → 암산왕 PR 머지 (1순위 day 메인 목표)
  - 🔴 **Phase 1 closure 상태 확인 + Phase 2 closure + Phase 3 진입** — 분기 화면 머지 후 쓰기 과정 1~4단계 wizard 이식 시작
  - 🟡 **backup 시나리오 6/13 sweep** — 외부 의존 P0 5건 변동 없음 5 day 누적 + **7/1 출시 형태 옵션 A(완전) vs B(Free-only) 사전 평가**. final 결정은 D-7(6/24) 시점으로 이월 (출시 연기로 결정 부담 완화)
  - 🟡 **출시 7/1 D-19 사전 readiness** — Phase 1·2 머지 후 prod 회귀 확인 + dogfood 채널 결정 + canary 룰. 시간 여유 있어 본 day 점검만 1줄, 본격 readiness 1page는 D-7 시점에
  - ⚠ docs/22 인프라 체크리스트 갱신 — `@sentry/nextjs` ESM 해석 한계 + helper 분리 패턴
  - ⚠ docs/25_secret_leak_response_checklist.md 신설 (선택)
  - ⚠ pullim-admissions-coach `prompt_v0.1.md` M2 산출물 — 5/30 이월 17일째, 8/1 D-50
  - 수습 종료 6/23 D-11 — 양 트랙 동시 sprint 능동성 가시화 누적 강조

▶ 오늘 위치: **suwon 챌린지 4개 closure day + writing-coach Phase 2 closure + Phase 3 진입 day**. **출시 7/1 연기 결정으로 시간 압박 해소 → Phase 3·4 여유롭게 진행 가능 + Phase 4 자력 진행 가능 + Pro 이관 ①~③ 자력 진행 시간 확보**. 6/13 sweep과 7/1 D-19 readiness는 사전 점검 수준만, final 결정은 D-7(6/24) 시점으로 이월.

0. 오늘 작업 순서 (1순위 suwon → 2순위 writing-coach + 6/13·6/15 사전 점검)
- (09:30~10:00) **양 트랙 1순위 동기화** — Phase 1·2 closure 상태 + suwon 챌린지 4개 진척 (PR #313·암산왕)
- (10:00~12:00) **★ suwon 챌린지 4개 closure** (별도 세션 진행 동기화):
  - PR #313 세계 국기·지리 머지
  - 리네임 (챌린지 명명·라우팅 정합)
  - 암산왕 PR 머지
- (10:00~12:00 병행) writing-coach 트랙: **Phase 1·2 closure 확정 + Phase 3 진입 사전 분석** (쓰기 과정 1~4단계 wizard v2 → v1 이식 plan 1page)
- (점심 후 13:30~16:00) **★ Phase 3 진입** — v2 `/prepare` 4-step wizard 이식:
  - (13:30~14:00) wizard 상태 머신·단계 콘텐츠 추출 분석
  - (14:00~15:30) 4-step wizard 컴포넌트 이식 + 단계 콘텐츠 (mock 유지·출시 후 EPO 원본 작성) + Vitest 단위 테스트 시드
  - (15:30~16:00) tsc·build·test·E2E 회귀
- (16:00~16:30) **외부 의존 P0 5 day 누적 sweep** — 6/13 재검토 입력용 1page (출시 7/1 연기로 D-1 final 부담은 해소, 5 day 누적 확인 + 옵션 A/B 사전 평가 수준)
- (16:30~17:30) **★ 본 day 확보 시간 활용**: 옵션 1) Phase 4 채점 결과 조회 PR 진입 (당김, 0.5 day) / 옵션 2) Vercel Pro 이관 ①현황 점검 1page (자력 자료) / 옵션 3) Phase 3 PR push + CI 폴링
- (저녁) 17:30 Daily Outcome + over.md (Overnight 위임: Phase 4 또는 Pro 이관 ②플랜 비교)

1. 오늘 진행할 pullim-writing-coach 산출물:
- ★ **Phase 2 closure + Phase 3 진입 PR** — 분기 화면 머지 (6/11에서 이월된 경우) + 쓰기 과정 4-step wizard 이식 + Vitest 단위 테스트 시드
- ★ **외부 의존 P0 5 day 누적 sweep 1page** — 6/13 재검토 입력용 (출시 7/1 연기로 부담 완화, 옵션 A/B 사전 평가)
- (확보 시간 활용) **Phase 4 채점 결과 조회 PR** 또는 **Vercel Pro 이관 ①현황 점검 1page**
- (선택) docs/22 갱신 / docs/25 신설
- daily 09:30·17:30 + over.md

2. 오늘 병렬로 진행할 pullim-admissions-coach 산출물:
- 본 daily 범위 밖 — 별도 세션 진행. 출시 D-3 + suwon closure + writing-coach Phase 3로 합류 미진척
- (이월 17일째) `prompt_v0.1.md` M2 산출물 — 8/1 D-50, M3 closure 후 1순위 합류 검토

2-1. 1순위 suwon-monorepo 진행 (참고 — 별도 세션 트랙, day 메인 목표):
- **챌린지 4개 만들기 closure** — 2/4 완료, 2/4 작업 중. 본 day 마감 시 4/4 closure 가능
- 순서: **PR #313 세계 국기·지리 머지 → 리네임 → 암산왕 PR 머지**
- 부가 산출 완료: 닉네임 입력 모달 + 리더보드(학생 랭킹) + 암산왕 로컬 구현 + 대표님 URL 공유
- 양 트랙 동시 sprint = 회의록 §능동성 피드백(주도적·차별화) 정합. 6/12 suwon closure는 1순위 sprint의 첫 마일스톤

3. 오늘 만들 샘플 수:
- 신규 글 샘플 0건 (anchor 5종 유지)
- 4-step wizard 단계 콘텐츠 mock 시나리오 1건 (Phase 3 PR 산출 — 주제·개요·본문·검토)
- 외부 의존 P0 5 day 누적 진척 sweep 1건 (docs/29 §4 + 6/13 재검토 입력, 7/1 출시 형태 옵션 A/B 사전 평가)

4. AI에게 맡길 일:
- 트랙 A(양 트랙 1순위 동기화 + suwon 진척 인테이크): Phase 1·2 closure 상태 + suwon PR #313·암산왕 본 daily 17:30 인테이크
- 트랙 B(Phase 3 진입): v2 `/prepare` 4-step wizard 이식 + 단계 콘텐츠 mock + Vitest 단위 테스트 시드 + PR 본문 + Codex 라운드 대응
- 트랙 C(외부 의존 P0 5 day sweep): 6/13 재검토 입력 1page + 7/1 출시 형태 옵션 A/B 사전 평가
- 트랙 D(확보 시간): Phase 4 PR 또는 Vercel Pro 이관 ①현황 점검 — 본 day 의사결정 후 진입
- 트랙 E(daily): 09:30·17:30 + over.md
- ❌ 트랙 F(슬랙 봇 통합) — 6/10 drop 그대로

5. 내가 직접 검수/판단할 일:
- **Phase 3 쓰기 과정 1~4단계 콘텐츠 결정** — mock 유지(출시 후 EPO 원본 작성) vs 사전 작성. 출시 7/1 D-19로 시간 여유 있어 mock 유지 후 W3에 EPO 원본 작성 옵션 추가
- **suwon 챌린지 4개 closure 확정 시점** — 본 day 마감 또는 6/13까지 분산. 1순위 sprint 첫 마일스톤 closure 의의
- **확보 시간 활용 옵션 선택** — Phase 4 PR 진입 (당김, Phase 1·2·3·4 closure 본 day 가능) vs Vercel Pro 이관 ①현황 점검 (자력 자료 시작, 7/1 출시 전 필수)
- **7/1 출시 형태 옵션 A vs B 사전 평가 시점** — D-7(6/24)에 본격 평가 입력, 본 day는 5 day 누적 sweep만
- **출시 7/1 D-19 dogfood 모집 채널 결정 시점** — 시간 여유로 D-10(6/21) 시점에 시작 가능, 본 day 결정 부담 없음

6. 예상 blocker:
- **양 트랙 동시 closure 부담** — suwon 챌린지 4개 + writing-coach Phase 1·2·3. 7/1 연기로 6/15 D-3 압박은 해소됐으나 컨텍스트 스위칭은 잔존
- **Phase 3 4-step wizard 분량** — v2 `/prepare` 4-step + 단계 콘텐츠 mock + Vitest. Codex 인프라 PR 평균 2~3 라운드 → 본 day 머지 가능성 80%
- **suwon PR #313 머지 리뷰 라운드 지연** — 다른 세션 의존, writing-coach Phase 3 시간 분배 영향
- ✅ **6/13 backup 결정 부담 해소** — 출시 7/1 연기로 옵션 C 사실상 채택, 6/13은 sweep 수준만
- ✅ **출시 D-3 dogfood 시간 부족 해소** — 7/1 D-19라 D-10(6/21) 시점에 모집 시작 가능
- ✅ **Pro 이관 ①~③ 자력 자료 진행 시간 확보** — 7/1 D-19라 본 day 또는 6/13에 자력 자료 정리 가능 → 결제 결정 입력 충분

7. 당김 후보 (Standing Rule 5) — ★ 출시 7/1 연기로 당김 폭 확대:
- ★ **Phase 4 채점 결과 조회 PR** (기존 v1 `/api/score`·`/results/[id]` 활용) — Phase 3 완성 후 본 day 진입 가능 (0.5 day)
- ★ **Vercel Pro 이관 ①현황 점검 1page** — 자력 자료 시작, 7/1 D-19까지 ①~③ 모두 정리 가능
- 링크 본문 추출(D 채널) PR — 출시 후 W3 → 출시 전으로 당김 가능 (Hobby 가능, 1-2 day)
- pullim-admissions-coach Member DB doc v0.1 EPO 검수 (8개 결정 잠금 후속) — 출시 부담 완화로 합류 시점 당김 가능
- Vercel `git connect` curea-co GitHub App 재승인 시도 (5분 안에 가능 여부 시험)
- 출시 7/1 D-10(6/21) dogfood 모집 채널 결정 사전 plan
```


## 17:30 Daily Outcome

```text
[17:30 Daily Outcome / 최선혜]

▶ 오늘 핵심: **외부 의존 P0-#1 Pro 이관 해결 day** — Vercel 개인 계정(shc-6088 Hobby) → **contact-4267s Team(curea·Pro)** 이관 완료. 6/13 (토) D-1 재검토 D-day까지 변동 없음 5 day 누적이었던 외부 의존 P0 5건 중 **1건 해결**, 누적 깨짐. backup 시나리오 옵션 A(원래 출시 형태) 가능성 ↑·옵션 B(Free-only)/C(1주 연기) 잠재 확정 필요성 ↓. 병행 산출: **PR #70(Phase 1 PR C)·#71(과정 코치 전환) Codex 라운드 누적 정정 후 머지 + 데모 prod 회귀(200 OK) + 옛 shc-6088 프로젝트 GitHub disconnect**. Phase 2/3 진입과 suwon 챌린지 4개 closure는 다른 세션 진행 (본 daily 외 인지).

1. 오늘 닫은 pullim-writing-coach 산출물:
- ★ **Vercel 개인 → contact-4267s Team Pro 이관 완료** — `shc-6088s-projects/pullim-writing-coach` → `contact-4267s-projects/pullim-writing-coach`(projectId `prj_e1jrwaut5zKfuZPAPTioc7wFXLoc` / orgId `team_OUbx9UxIoqNlvX6R7pDaCSsk`). 환경변수 ANTHROPIC_API_KEY·DEMO_ACCESS_TOKEN prod+preview 이관, `vercel git connect` curea-co GitHub App 재승인, `vercel --prod` 첫 빌드 53s Ready. **prod alias `https://pullim-writing-coach.vercel.app/` 200 OK 확인** (게이트키퍼 결정 새 URL). 옛 shc-6088 프로젝트는 Dashboard에서 GitHub Disconnect — 이중 자동 배포 차단.
- ★ **PR #70 (Phase 1 PR C — UniversalCapture·AssignmentCard·ConfidenceChip 이식) 머지 완료** (`5452d2f`) — Codex 라운드 12 누적 정정 (장르 GENRES whitelist 검증·photo/link 채널 "준비중" alert 통일·savePrompt PROMPT_MIN/MAX 검증·handleFile 미지원 형식 분기를 size 가드 앞에·빈 텍스트 파일 trim 검증). 자기모순 패턴 1건(photo 채널 enable↔disable round 3·4·5) 즉시 보고 후 사용자 결정 "alert 패턴" 일관 적용.
- ★ **PR #71 (평가기 → 과정 코치 전환 — 전략 v2 + EPIC 1~6 + 라이브 배선) 머지 완료** (`48b1a51`) — 본 세션 fix 9건: testid 5종 추가(coach-canvas·ask·next·done·growth·growth-gain) + 빈 캔버스 가드(`body: SEED` → `""`) + happy path strict-mode 위반 fix(`coach-growth` 6개 매칭 → `.first()` 좁힘) + webkit React 19 controlled textarea onChange 회귀 fix(`fill()`→ `selectText`+`keyboard.insertText`) + middleware `/api/extract` rate limit 우회 fix(resolvePath 누락) + RECHECK_START revisions++ 제거 + 본문 미변경 recordRevision 가드 + REVISION_TRACKED 동기화 + NEXT 흐름 lastNudges로 다음 focus 직접 진입. local E2E (chromium·firefox·webkit) 6/6 통과.
- ★ **데모 prod 회귀** — `https://pullim-writing-coach.vercel.app/coach` 200 OK + "풀림"·"라이팅 코치"·"RECHECK"·"체험" 카피 정상 노출 (30,933 bytes). main → contact Vercel 자동 배포 webhook 정상 작동.
- review thread 일괄 resolve — PR #70 unresolved 9개 + PR #71 unresolved 15개 GraphQL `resolveReviewThread` mutation 일괄 처리 (repository ruleset `required_review_thread_resolution=true` 머지 게이트 충족).

2. 오늘 닫은 pullim-admissions-coach 산출물:
- 본 daily 범위 밖 — 별도 세션 진행. **Vercel Pro 이관 절차 안내 전달**(8/1 출시 D-50 사전 준비, 본 세션의 writing-coach 이관 8 단계 그대로 재사용 가능, 같은 contact 계정 로그인 상태라 Phase 1 스킵).
- (이월 17일째) `prompt_v0.1.md` M2 산출물 — 8/1 D-50, M3 closure 후 1순위 합류 검토 그대로

2-1. 1순위 suwon-monorepo 진행 (참고 — 별도 세션 트랙, 17:30 시점 동기화 결과):
- 09:30 시점: 챌린지 2/4 완료(PR #281 + 사자성어), 2/4 작업 중(PR #313 세계 국기·지리 + 암산왕)
- 17:30 시점 본 daily 직접 인지 산출 없음 — 별도 세션 진행 결과는 6/13 09:30 동기화에서 박힘 예정

3. 실제 링크/파일:
- main commits: `48b1a51` (PR #71 과정 코치 전환) · `5452d2f` (PR #70 Phase 1 PR C)
- 데모 prod URL 변경: 기존 `pullim-demo.vercel.app` / `pullim-writing-coach-demo.vercel.app` (shc-6088 Hobby) → **`pullim-writing-coach.vercel.app`** (contact-4267s Pro Team)
- 새 Vercel 프로젝트 link 정보: `.vercel/project.json` (projectId `prj_e1jrwa...` / orgId `team_OUbx...`). 옛 link `vercel-shc-backup.json`로 백업
- 옛 shc-6088 프로젝트 GitHub disconnect 완료 (Dashboard Settings → Git → "Connected Git Repository" 비어있음 확인)

4. 샘플:
- 신규 글 샘플 0건 (anchor 5종 유지)
- Vercel CLI 이관 실행 검증 1건 (memory `vercel-hobby-to-org-migration.md` 8단계 체크리스트 실제 적용 + 완료 검증)
- pullim-admissions-coach 이관 사전 가이드 1건 (writing-coach Phase 2~7 절차 복붙 템플릿)

5. AI가 만든 것 (트랙 A·B·C·D·E):
- 트랙 A(daily 작성): 09:30 Work Contract + 17:30 Daily Outcome (외부 의존 P0-#1 해결 1건 반영)
- 트랙 B(PR #70 round 12 정정): GENRES whitelist 검증 import·savePrompt 길이 가드·handleFile 미지원 형식 분기 재배치·빈 텍스트 trim 가드·link 채널 alert 통일
- 트랙 C(PR #71 round 2 정정): middleware resolvePath `/api/extract` 추가·State에 `lastNudges` 캐시·RECHECK_OK에 `wasRevised` flag·REVISION_TRACKED action·NEXT 흐름 reducer 재설계·runCheck/runRecheck revisionTracked 분기
- 트랙 D(E2E webkit 회귀 fix): `fillCanvas` helper(`selectText` + `keyboard.insertText`로 React 19 controlled component 호환), Canvas/CoachClient/GrowthBars testid 5종 추가, spec growth `.first()` 좁힘
- 트랙 E(Vercel 이관): Phase 1~7 단계별 명령 가이드(PowerShell 문법 보정) + smoke 검증 curl + alias 401 진단 + Disconnect 검증 절차 + admissions-coach 사전 가이드

6. 내가 수정/기각/채택한 것:
- 채택: **Vercel 이관 방식 — 공용 contact 계정 새 import** (게이트키퍼가 "transfer" 아닌 "공용 계정에서 새 프로젝트 import" 결정 → CLI 흐름 그에 맞춰 재설계)
- 채택: **데모 URL `pullim-writing-coach.vercel.app` 새 주소로 변경** (기존 `pullim-demo.vercel.app` 폐기, race 회피)
- 채택: **옛 shc-6088 프로젝트는 GitHub 연동만 disconnect (프로젝트 보존)** — 과거 deployment 이력 유지, M3 종료 후 정리
- 채택: **ANTHROPIC_API_KEY 기존 키 그대로 contact 계정에 동일 값 입력** — 새 발급 X, 비용 attribution은 후속 재발급으로 처리
- 채택: **자기모순 발견 시 즉시 보고 후 중지 룰 적용** — PR #70 photo 채널 round 3·4·5 일관성 부재 사용자에게 보고 → 결정 "alert 패턴" 일관 적용
- 채택: **Codex 무한 cycle 끊는 시점 결정** — PR #70 round 13·PR #71 round 3 신규 회귀 발견 시점에 "데모 차단 X" 판단 → 머지 우선 (잔여는 별도 PR 권장 알림)
- 수정: middleware matcher `/api/score + /api/extract + /api/coach` 셋 다 통합 (PR #71 rebase 시 PR #69 conflict 해결 — 비용 방어선 셋 다 포함)
- 기각: `vercel --prod` deployment-specific URL 401 → "Standard Protection → Public" 변경. 데모는 alias URL로 충분 (보안 강화 유지 결정)

7. AI 검증 카운트 (Standing Rule 3):
- AI(Claude)가 잡은 곳: **5건**
  · middleware `/api/extract` rate limit 우회 (matcher만 추가하고 `resolvePath()` 누락 → matched=null로 빠져 limit 미적용)
  · webkit React 19 controlled textarea onChange 회귀 (`fill()`/`evaluate`+input dispatch가 한국어/IME 환경에서 React onChange 미트리거 → state.body 빈 채로 남는 회귀)
  · `coach-growth` testid strict-mode 위반 (CompletionView always-mounted라 SheetBody 1개 + 완료 화면 5개 = 6개 매칭)
  · RECHECK_START에서 revisions++ 부풀림 (API 실패·401·본문 미변경 모두 카운트되어 교사 process log와 학생 화면 불일치)
  · 옛 alias `pullim-writing-coach-demo.vercel.app` 변경 시 race window 사전 인지 → 게이트키퍼 결정으로 회피
- 본인이 잡은 곳: **3건**
  · PowerShell `rm -rf` 안 됨 보고 → `Remove-Item -Recurse -Force` 보정
  · `vercel whoami` Not authorized 보고 → `teams ls` 작동으로 로그인 정상 판정 (캐시 이슈 진단)
  · `Get-Content .vercel\project.json` 결과로 projectId/orgId 변경 확인 보고 → 사용자가 직접 link 검증
- ★ 학습: **Vercel CLI 인터랙티브 prompt 환경(scope·existing 선택 등)은 AI가 직접 못 함** — 사용자 직접 입력 단계 명확히 분리 + 응답 응답표를 미리 제시하면 1회에 통과. 외부 시스템 권한 단계 추정 캘리브레이션은 6/9 슬랙 통합 "4배 가산" 룰과 정합.

8. 재사용 자산 (Standing Rule 2) — 오늘 1건 박힘:
- ★ **Vercel Hobby(개인) → Pro Team(공용) 이관 7-Phase 실행 체크리스트** (본 daily §8에 박힘, 향후 `docs/26_vercel_team_migration_playbook.md`로 정착 후보):
  1. **사전 점검**: `Get-Content .vercel\project.json` (옛 projectId/orgId 백업) · `vercel env ls production` `... preview` (이관할 변수 이름 목록 추출, 값은 Encrypted라 출처에서 따로 확보)
  2. **계정 전환**: `vercel logout` → `vercel login` → 공용 계정 이메일 → 인증 메일 클릭 → `vercel teams ls`로 새 scope slug 확인 (`whoami` Not authorized 떠도 `teams ls` 작동하면 OK)
  3. **새 프로젝트 link**: `Copy-Item .vercel\project.json .vercel-<old-slug>-backup.json` → `Remove-Item .vercel -Recurse -Force` → `vercel link` → scope 선택·existing=N·project name 입력·directory=./
  4. **환경변수**: `vercel env add <NAME>` 반복 — value 직접 입력 + Production·Preview 둘 다 체크 (Development는 `.env.local`로 분리). Encrypted 값은 출처(Anthropic 콘솔·LastPass 등)에서 새로 확보 필수
  5. **GitHub 연결**: `vercel git connect` → 자동 감지 git remote URL 확인 → Y (옛 프로젝트에 연결돼 있다는 경고도 Y, Phase 7에서 정리)
  6. **첫 배포**: `vercel --prod` → 빌드 ~1m → deployment URL 확보. **단축 alias `<project>.vercel.app`이 우선 점유 가능한지 확인** (이미 다른 계정이 점유 중이면 hash 붙은 deployment URL만 받음). Deployment-specific URL은 Team 기본 Deployment Protection으로 401 — alias URL로 우회 OK
  7. **옛 프로젝트 정리**: Dashboard `<old-team>/<project>/settings/git` → "Connected Git Repository" → **Disconnect** (이중 자동 배포 차단). 프로젝트 자체는 보존 권장 (과거 deployment 이력)
  - 부수: GitHub Actions Secrets `VERCEL_PROJECT_ID` / `VERCEL_ORG_ID` 사용 여부 사전 `grep` 검사 → 사용 안 하면 교체 작업 0 (Vercel Git Integration이 webhook 처리)

9. 미완료/미검증:
- 🟡 **pullim-admissions-coach Vercel 이관** — 별도 세션 진행 위임, 본 daily 직접 산출 없음. §8 체크리스트 복붙 가능, Phase 1(로그인) 스킵·Phase 2부터 동일 절차
- 🟡 **PR #70 round 13 잔여 회귀 2건** — link 채널 `linkOpen` dead-code 제거 + textarea 직접 paste 이벤트 채널 구분 (`type` vs `paste`). 별도 PR 권장 (데모 차단 X)
- 🟡 **PR #71 round 3 잔여 회귀 3건** — onboarding `saveConsent` 반환값 무시(localStorage 실패 시 step 3 갇힘) + 동의 체크박스 onChange no-op + `/api/coach` 4xx envelope 메시지 무시(E1/E2/E3 사용자 수정 가능 오류를 일시 장애로 처리). 별도 PR 권장
- 🟡 **suwon 챌린지 4개 closure 17:30 인지** — 별도 세션 진행 결과 본 daily 직접 박힘 없음, 6/13 09:30 동기화 인테이크
- 🟡 **Phase 2 closure 확정 + Phase 3 진입(4-step wizard 이식)** — 별도 세션 진행 추정, 본 daily 직접 산출 없음
- 🟡 **6/13 D-1 backup 시나리오 final 점검** — P0-#1 Pro 이관 해결로 누적 깨짐 반영해 옵션 A(원래 출시 형태) 잠재 확정 입력 미진행
- 🟡 **출시 6/15 D-3 readiness 미니 체크리스트** — canary·dogfood·prod 회귀 가능 시간 1줄 점검 미진행
- ✅ **외부 의존 P0-#1 Pro 이관 — 해결** (6/13 D-1 재검토 1일 앞서 해결, 5 day 누적 변동 없음 룰 A 깨짐)
- 🟡 docs/22 인프라 체크리스트 갱신 + docs/25 신설 — 미진행 그대로

10. 내일 첫 액션 (6/13 토 — M3 W2 day 5 · 새 UX flow sprint day 6 · backup 시나리오 D-day):
- (09:30 work contract) `▶ 외부 의존 P0 진척` 1줄 박기 — **P0-#1 해결 표기 + 5건 중 4건 변동 없음으로 누적 룰 A 재출발**. 6/13이 P0 재검토 D-day인데 1건 해결 = 변동 누적 깨짐, 출시 형태 옵션 A 잠재 확정 잠재성 ↑
- (09:30 work contract) **backup 시나리오 D-day final 입력** — 옵션 A(원래 출시 형태, P0-#1 해결로 가능) vs 옵션 B(Free-only, P0-#3·#4 출시 후 별도 분기 유지) vs 옵션 C(1주 연기) 중 잠재 확정. P0-#1 해결 효과로 옵션 A 우선 가능성 ↑, 대표님 의사결정 1page 입력
- **pullim-admissions-coach Vercel 이관 실행** — 별도 세션, 본 daily §8 체크리스트 복붙. Phase 1 스킵·Phase 2부터 8/1 D-49 사전 준비 정합
- **PR #70 round 13 + PR #71 round 3 잔여 회귀 별도 PR** — link dead-code 제거 / textarea paste 채널 / saveConsent / 체크박스 / 4xx envelope 메시지 분류 (5건 합쳐 1~2개 PR)
- **출시 6/15 D-2 dogfood 모집 채널 결정 + 메시지 템플릿** — 학원·SNS·지인 중 1~2개 채널 선택, 모집 메시지 1page (학생 5+ / 교사 2+ 회수 목표)
- **suwon 챌린지 4개 closure 최종 확인** — 6/12 마감 결과 인테이크 (별도 세션) + 미완료분 6/13 closure
- (선택) §8 체크리스트를 `docs/26_vercel_team_migration_playbook.md`로 정착

11. 시간 추정 vs 실제 (Standing Rule 4):
- daily 09:30 작성: 추정 20m vs 실제 ~25m (+25%, P0·suwon·writing-coach 동시 트랙 정합)
- PR #70 round 12 정정 + 머지: 추정 30m vs 실제 ~40m (+33%, GENRES import + 미지원 형식 분기 재배치 + typecheck stale `.next` 캐시 정리 포함)
- PR #71 round 2 정정 + 머지: 추정 1h vs 실제 ~1h 20m (+33%, reducer State 확장 + RECHECK_OK action signature 변경 + runCheck/runRecheck revisionTracked 동기화 + E2E webkit fill 회귀 진단 + main rebase + middleware conflict 해결)
- Vercel CLI 이관 (Phase 1~7 인터랙티브 가이드): 추정 30m vs 실제 ~1h (+100%, 사용자 인터랙티브 입력 대기 + PowerShell 문법 보정 + Disconnect 검증 사이클)
- daily 17:30 작성: 추정 30m vs 실제 ~35m
- **총 추정 ~2h 30m vs 실제 ~3h 40m (+47%)** — 6/9 슬랙 4배 가산보다 작지만, Codex 무한 cycle + webkit React 19 회귀 + Vercel CLI 인터랙티브 합산 +47%. **외부 시스템 권한 + 사용자 입력 단계가 섞이는 트랙은 추정 1.5배 가산 권장** (슬랙 4배·Vercel 1.5배 차이는 권한 분기 갯수에서 옴)

12. Overnight 위임 후보 (Standing Rule 6):
- (저녁 18:50 위임 가능) **PR #70 round 13 + PR #71 round 3 잔여 회귀 fix PR** — link `linkOpen` dead-code 제거 + textarea paste 채널 분리 + `saveConsent` 반환값 처리 + 체크박스 onChange 복구 + `/api/coach` 4xx envelope 분기. 5건 합쳐 1~2개 PR + Codex 라운드 대응 시드. 다음 day 09:30~09:40 검수 + 머지
- (대안) **Phase 3 4-step wizard 이식 사전 분석** — v2 `/prepare` 4-step 상태 머신 + 단계 콘텐츠 추출 + 컴포넌트 의존 분석 1page. 다음 day 본 작업 진입 시간 단축
- (대안) **`docs/26_vercel_team_migration_playbook.md` 신설** — 본 daily §8 체크리스트 정착 + admissions-coach 이관 사전 가이드 + 향후 v2/v3 repo 이관에도 재사용 1page 자산
```
