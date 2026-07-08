# 2026-05-29 일일 보고 / 최선혜


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
Writing Coach 리포 / 데모:
https://github.com/curea-co/pullim-writing-coach · https://pullim-writing-coach-demo.vercel.app/

Admissions Coach 리포 / 데모:
https://github.com/curea-co/pullim-admissions-coach
https://pullim-admissions-coach.vercel.app/
```


## 09:30 Work Contract

```text
2026-05-29
[09:30 Work Contract / 최선혜]

▶ 어제(05-28) 마감: ▣ M1 시연 / 디자인 PR #7 단일화·squash 머지(main 4cf6383) /
  Vercel ↔ curea-co 자동연결 정상화(머지=auto prod, PR=auto preview 동작 검증 완료) /
  **PR #10 머지** (A1 온보딩·A2 프로필·/me·/try·홈 통합) → main 1728b0d → 새 prod
  34초만에 Ready, demo 별칭에 라이브(/onboarding·/me 신규 라우트, /samples/e P1 회귀 없음) /
  CEO 6/1 스코프 잠금(B' tiered staging) / #1 수정 전/후 비교 design doc /
  단위 테스트 48 → 82건.
▶ 미해결 인계: AC 3종(정의 v0.3 검수·prompt_v0.1·미성년자 동의/보관/삭제 정책 v1) 미착수 누적 ·
  AI 검증 카운트 05-26·05-27·05-28 미집계.
▶ 오늘 = 6/1 평가 D-3 (실작업 4일: 5/29 금·5/30 토·5/31 일·6/1 월). 토·일 풀 가동(B' 결정).

0. 오늘 작업 순서
- (최우선) **브라우저 e2e 동선 확인** — / 환영 배너 → /onboarding 3-step → /me 수정·삭제 → /try 프리필.
  실제 사용자 시점에서 PR #10 통합 검증 + 신규/재방문 분기 동작 확인.
- 6/1 묶음 잔여 7건 진행 — 우선순위 추천: **#1 수정 전/후 비교(센터피스, design doc 잠금 → 구현)**
  → #2 인라인 첨삭 클릭(AnnotatedBody 확장) → #4 왜 이 점수(루브릭 토글) → 나머지는 5/30~5/31
- AC 병렬: 정의 v0.3·스키마 v0.1 EPO 검수 → prompt_v0.1.md 초안 → 미성년자 동의/보관/삭제 정책 v1
  (3일째 이월 — 오늘 적어도 정의 검수 + 정책 v1 초안까지)

1. 오늘 진행할 Writing Coach 산출물:
- 브라우저 e2e 동선 검증 (사용자 직접) + 발견 이슈 fast-follow PR
- **#1 수정 전/후 비교 컴포넌트 구현** — design doc(2026-05-28-kokho-main-design) 따라:
  · `app/lib/revision.ts` 순수 모듈(LRU + 델타 계산 + 카피 분기) + 단위 테스트
  · `<GrowthCard>` · `<RevisionToggle>` · `<FeedbackDiff>` 컴포넌트
  · ResultView에 `revisionMode` prop 통합 + growBar v1→v2 애니메이션 확장
  · /try?revise=1 prefill + "고쳐쓰기" CTA
- (당김 시) #2 인라인 첨삭 클릭 — 기존 AnnotatedBody에 클릭 핸들러 + 영역별 피드백 스크롤·하이라이트
- (당김 시) #4 왜 이 점수 — 루브릭 v.5 텍스트 영역별 토글

2. 오늘 병렬로 진행할 Admissions Coach 산출물:
- 별도 스레드 작성

정의 v0.3·`student_profile_schema_v0.1.json` EPO 검수 (3일 이월 — 오늘 닫기)
- `prompt_v0.1.md` (M2) 초안 — 정의 v0.3 §6 가드레일을 시스템 프롬프트 제약으로 이식
- 🔴 미성년자 동의 플로우 + 보관·삭제 정책 v1 (출시 blocker) — WC `app/components/ConsentNotice.tsx` 패턴 재사용

3. 오늘 만들 샘플 수:
- WC: 신규 글 샘플 0건(데모 5종 고정). #1 구현 후 e/d/c로 재제출→비교 시나리오 1건 캡처
- AC: 신규 샘플 0건. 스키마 v0.1 기준 입력 예시 1~2건 검토

4. AI에게 맡길 일:
- 트랙 A(WC): #1 수정 전/후 비교 풀구현(design doc 잠금된 스펙 그대로) + 단위 테스트 + PR
- 트랙 A 후속: #2 클릭 인라인 첨삭 + #4 왜 이 점수(루브릭 토글) — #1 PR 분리
- 트랙 B(AC): prompt_v0.1.md 초안(§6 가드레일 이식) · 미성년자 동의/보관/삭제 정책 v1 초안(WC ConsentNotice 재사용)

5. 내가 직접 검수/판단할 일:
- 브라우저 e2e 동선 발견 이슈 분류(blocker / nice-to-have)
- #1 수정 전/후 비교의 부정 케이스 카피 톤(점수 하락 시 격려) 최종 승인
- #1 PR 머지 승인 (CI 그린 확인 후)
- AC 정의 v0.3·스키마 v0.1 검수 (윤리·규제 정합)
- AC 미성년자 동의·보관/삭제 정책 v1 — 법규 판단 직접
- 어제 동의 텍스트 PM 초안 (ConsentNotice.tsx) EPO 최종 승인 (어제 대기 항목)
- 05-26·05-27·05-28 AI 검증 카운트 산정(또 이월하면 4일치 누적)

6. 예상 blocker:
- **#1 구현 중 부정 케이스 톤 결정**(점수 하락 시 카피) — 미성년자 좌절 방지 vs 정직 균형, PM 판단 필요
- **localStorage 이력 schema** — A2와 같은 어댑터 패턴 재사용은 가능하나 LRU 정책 첫 구현이라 엣지 케이스 (storage quota 도달, 다중 thread 격리) 주의
- AC 정책 v1 법규 검토 난도 (미성년자·개인정보) — 또 이월하면 출시 blocker 누적
- 주말 시작 전 컨디션 보전 (B' staging은 일요일 저녁 4h 휴식 PM 권고 — 5/29 금까지가 평일 풀가동, 5/30~5/31 추가 가동분이 진짜 budget)

7. 당김 후보:
- #9 본문 자동 저장 드래프트 (~2h) — localStorage 어댑터 그대로 재사용, 작아서 부담 없음
- #10 글자수·진척 인디케이터 (~2h) — ScoreForm 안 작은 추가
- 06 v.4 / rubric §5.1 ↔ samples.ts B 문구 동기화 (계속 이월)
- 임의 글 novel 일반화 스팟체크 (P2.4) — 1건만이라도
```


## 15:30 Evidence Check

```text
[15:30 Evidence Check / 최선혜]

1. 현재까지 나온 링크/파일:
[pullim-writing-coach]
- 오늘 main 머지 6건(전부 squash): `ac2dec0`(PR #11 #1 수정 전/후 비교) · `0ce378b`(PR #12 #2 인라인 클릭) · `a69b41d`(PR #13 #16 PDF/스크린샷) · `b879fbb`(PR #14 스크린샷 7장) · `45658b1`(PR #15 #19 신뢰 라벨 + intent § 비노출) · `eeb6a68`(PR #16 PR15 스크린샷)
- 머지 시각: 11:28 → 11:46 → 14:07 → 14:29 → 15:00 → 15:09 (KST). 6개 PR 약 3.5h 만에 일괄
- 6/1 묶음 10건 진척: **A1·A2(어제) + #1·#2·#16·#19·스크린샷(오늘) = 7건 닫힘 / 잔여 3건 #4·#9·#10**

[pullim-admissions-coach] (EPO 보강 반영)
- repo: https://github.com/curea-co/pullim-admissions-coach · Issue #1(Phase 0 트래커): https://github.com/curea-co/pullim-admissions-coach/issues/1 · 로컬 시연: http://localhost:3030
- 오늘 커밋 3건: `aa3b305`(Phase B) · `edd4b4d`(port 3030) · `ae2d52b`(잠금)
- 신규/수정 파일 8건:
  · `packages/shared/src/schemas.ts` (Zod, JSON Schema 1:1 동기)
  · `apps/web/lib/validation.ts` (Zod↔React 에러 헬퍼)
  · `apps/web/app/submit/page.tsx` (client + 검증)
  · `apps/web/app/consent/page.tsx` (차단 로직)
  · `apps/web/app/processing/page.tsx` 🆕 (24h SLA 상태머신)
  · `apps/web/components/step-indicator.tsx` (3→4단계)
  · `apps/web/components/error-state.tsx` 🆕
  · `apps/web/components/loading-skeleton.tsx` 🆕
- SSOT 7건 main push: 정의 v0.3 · WBS v0.3.2 · Personas v0.1.2 · 코딩 계획 v0.1 · 아키텍처 v0.1 · 보안 정책 v0.1 · `student_profile_schema_v0.1`
- 인프라 핸드오프 패키지 main push: `Dockerfile` · `.github/workflows/deploy-staging-web.yml` · `infra/README.md` · `infra/terraform/staging/main.tf`

2. 현재까지 나온 샘플:
[pullim-writing-coach]
- 신규 글 샘플 0건 (데모 5종 고정)
- PR #14·#16 본문용 **스크린샷 8장** (PR 첨부 증거)
- 브라우저 e2e 동선 스모크: EPO 직접 수행분 — 결과 보고 미확인(보강)

[pullim-admissions-coach]
- 박준호 페르소나 mock 1건 (공학·고3 2학기·일반고): 면접 질문 3건 × 답변 방향+근거+꼬리질문 / 평가기준 5항목 진단 / 보완 활동 3건 / 학부모 요약
- Zod 스키마 1건 (입력 5항목 + §6.3 마스킹 const + 미성년→guardian refine 강제)
- 폼 검증 데모 케이스 (정상=박준호 mock / 실패=마스킹 미체크·미성년 미동의·필수 미입력)
- 24h SLA 상태머신 데모 1건 (4단계 × 90초 사이클, 진척률·남은 시간)
- 회원 DB 설계 답변 1건 (5 엔티티: Student·Guardian·Household·Consent·AuthCredential + T1~T3 분류) — chat 응답, 파일 미저장

3. 화면 또는 문서 증거:
[pullim-writing-coach]
- PR #10 산출물 main 잔존 확인 ✓ (`app/onboarding/page.tsx`·`app/me/page.tsx`·`HomeWelcomeBanner.tsx`·`storage.ts`·`profile-validate.ts` 5/5)
- main 활성 브랜치 7개 모두 origin에 머지된 feature 브랜치(정리 가능)
- 스크린샷 8장 첨부(PR #14·#16)
- 오늘 닫힌 PR들 메시지에 "6/1 평가 묶음 2차"·"6/1 평가 안전망" 명시 — 평가 컨텍스트 일관

[pullim-admissions-coach]
- 로컬 6 routes HTTP 200 ✓: `/`(20.8KB) · `/submit`(19.6KB, 8.15+122KB FLJ) · `/consent`(13.4KB, 4.48+118KB FLJ) · `/processing`(14.5KB, 3.26+104KB FLJ) 🆕 · `/result`(15.4KB) · `/parent`(16.6KB)
- `pnpm -r typecheck` clean (shared + web)
- `next build` 7 static pages 통과
- GitHub Issue #1 reframe + 변경 사유 코멘트·작업순서 변경 코멘트 가시

4. 부족한 것:
- 🔴 **#4 왜 이 점수(루브릭 토글) 미진행** — 09:30 0번 우선순위 3순위였으나 미실행. 잔여 핵심
- ⏳ **#9 본문 자동 저장**·**#10 글자수 인디케이터** 미진행 (09:30 당김 후보, 5/30로 이월 위험)
- ※ pullim-admissions-coach 3종(09:30 계획)에 대한 EPO 보강 후 갱신:
  · 정의 v0.3 ✓ (SSOT main push 완료, Issue #1 reframe 코멘트로 검수 가시화)
  · 미성년자 동의·보관/삭제 정책 v1 — **부분 진행**: 보안 정책 v0.1 SSOT push + `/consent` 차단 로직 + Zod `미성년→guardian refine 강제` 구현. **정책 v1 별도 문서**(법조항 표·보관기간·삭제 절차)는 미확인
  · **`prompt_v0.1.md` (M2 산출물명)** — 박준호 mock 답변 결과물은 있으나 명시적 `prompt_v0.1.md` 파일은 미확인. M2 충족 검증을 위한 명시 산출 필요
- **Vercel prod 자동배포 검증 미실행** — 오늘 머지 6건이 prod에 자동 반영됐는지 라이브 확인 없음
- **브라우저 e2e 동선 결과 보고 미확인** — 09:30 0번 (최우선) 항목, EPO 직접 수행분 보고 보강
- ✅ AI 검증 카운트 4일치 산정 완료 (5/31 ledger `docs/16_ai_verification_count_2026-05-26_to_29.md`, EPO 23 / AI 11)
- 동의 텍스트 `ConsentNotice.tsx` EPO 최종 승인 (5/28 이월) 미확인
- 임의 글 novel 일반화 스팟체크 (P2.4): 미실행 (2주째 이월)

5. 17:30 전까지 보강할 것:
- (최우선) **#4 루브릭 토글** 마감 → 6/1 묶음 8/10 도달, 잔여 #9·#10만 5/30로
- 가능하면 **#9·#10** 작은 묶음(~2h씩) 추가 — 6/1 묶음 10/10 가능성
- pullim-admissions-coach 마감 라인 확인 — ① 정책 v1 별도 문서(법조항 표·보관/삭제 절차) 시작 또는 5/30 이월 명시 ② `prompt_v0.1.md` 산출물 명명·골격 잡기 (M2 추적용)
- **Vercel prod 라이브 1회 검증** — 신규 라우트(`/onboarding`·`/me`) + 오늘 머지 6건 회귀 확인
- 동의 텍스트 EPO 승인 — 오늘 안에 닫기

```

## 17:30 Daily Outcome

```text
[17:30 Daily Outcome / 최선혜]

1. 오늘 닫은 pullim-writing-coach 산출물:
- ★ **6/1 평가 묶음 10/10 전부 닫힘** — A1·A2(어제) + #1·#2·#4·#9·#10·#16·#19·스크린샷(오늘)
- 오늘 main 머지 **14건**(squash), 약 4.5h(11:28~15:58 KST) 만에 일괄:
  · `ac2dec0`(PR #11 #1 수정 전/후 비교 + UX 보정 3건) · `0ce378b`(PR #12 #2 인라인 첨삭 클릭)
  · `a69b41d`(PR #13 #16 PDF/스크린샷 — html2canvas-pro + jsPDF) · `b879fbb`(PR #14 스크린샷 7장)
  · `45658b1`(PR #15 #19 신뢰 라벨 + intent § 비노출) · `eeb6a68`(PR #16 PR15 스크린샷)
  · `c410671`(PR #17 docs 스크린샷 폴더 분리 — Daily→screenshot)
  · `c84344f`(PR #18 #4 왜 이 점수 토글) · `da1cbc3`(PR #19 PR18 스크린샷)
  · `6ed1a70`(PR #20 #9 본문 자동 저장 — `/try` draft + 복원 배너)
  · `dba3236`(PR #21 PR20 스크린샷) · `5399fc3`(PR #22 fix `isDraftSnapshot` enum 검증, Codex 리뷰 #20 반영)
  · `251669e`(PR #23 #10 글자수 진척 인디케이터 — 5밴드 + 목표 대비)
  · `f4eeb6c`(PR #24 PR23 스크린샷)
  · `a9f44e3`(docs 회원/DB 스키마 v1 — 8개 결정 잠금: 이메일+OAuth·학교 자유입력·학생-교사 무관·코드 공유·이력 영속·셀프 검증·만 14세 보호자 동의·동의 이력 / 8 테이블)
  · `9771c8e`(PR #25 **LNB 확장** — 둘러보기 섹션에 "내 정보"·"서비스 소개" 진입 추가 + **`/about` 정적 페이지 신규**: 무엇·어떻게·누구·데이터·한계 5섹션, 5영역 루브릭 명시, localStorage 단일 디바이스 정책 명시, #19 TrustLabel 톤 일치)
  · `be4876d`(PR #26 PR25 스크린샷 2장)
  · `0da8c9d`(PR #27 chore(fe): **`/about` 카피 정리 + product positioning rebrand** — '글쓰기 도구·실시간')
  · `7d62f0d`(PR #28 docs: **prod 라이브 회귀 스크린샷 5종** — Vercel 자동배포 동작 입증)
- 오늘 main 커밋 총 **19건** (PR-머지 18 + 직접 docs 1)

2. 오늘 닫은 pullim-admissions-coach 산출물:
- 커밋 **8건**:
  · `aa3b305`(Phase B + polish — Zod schemas·`/submit·/consent` gating·`/processing` 24h SLA UX)
  · `3a7646d`(Phase A+B 스크린 증거 — 데스크톱+모바일 12장)
  · `65651bd`(**Member DB doc v0.1 + 정의 v0.3.1 patch** — 5계열·4학교유형)
  · `4d1c7d4`(UX writing: '학종' → '학생부 종합 전형' 8 files + `/submit` weakAreas placeholder)
  · `dca9631`(UX copy: landing hero '보완안→보완·마침표 제거' + `/result` disclaimer 제거)
  · `f5b0a2a`(EmptyState 컴포넌트 — **Phase B 산출물 목록 마감**)
  · `330de6f`(**Vercel demo 배포** — preview 한정, prod 미연결)
  · `86dd676`(**PR template 추가** — PR workflow established 2026-05-29, #2)
- SSOT main push 상태: 정의 v0.3 · WBS v0.3.2 · Personas v0.1.2 · 코딩 계획 v0.1 · 아키텍처 v0.1 · `student_profile_schema_v0.1` + **`006_Admissions_Coach_data_security_policy_v0.1.md`(데이터 분류 4 Tier·KMS 봉투 암호화·미성년자 동의 P0, 5/26 확정·5/28 push)**
- 인프라 핸드오프 패키지 main push: `Dockerfile` · `.github/workflows/deploy-staging-web.yml` · `infra/README.md` · `infra/terraform/staging/main.tf`
- 신규/수정 파일 9건+(Phase B + 마감): `schemas.ts` · `validation.ts` · `/submit` · `/consent` · `/processing` 🆕 · `step-indicator` · `error-state` 🆕 · `loading-skeleton` 🆕 · **`EmptyState` 🆕**

3. 실제 링크/파일:
- pullim-writing-coach 리포: https://github.com/curea-co/pullim-writing-coach (오늘 main **19 커밋**, 마지막 `7d62f0d` 17:23 KST)
- pullim-admissions-coach 리포: https://github.com/curea-co/pullim-admissions-coach · Issue #1(Phase 0 트래커): https://github.com/curea-co/pullim-admissions-coach/issues/1 · 로컬 시연: http://localhost:3030 · **Vercel preview 데모**: https://pullim-admissions-coach.vercel.app/ (prod 미연결) · PR workflow established(`PR template` 추가, 86dd676)
- prod 데모: https://pullim-writing-coach-demo.vercel.app (오늘 머지 19건 자동 배포 — **prod 라이브 회귀 스크린샷 5종 캡처 완료**, PR #28)
- 정책 문서: `pullim-admissions-coach/docs/006_Admissions_Coach_data_security_policy_v0.1.md` (main 푸시, 데이터 분류 4 Tier·KMS 봉투 암호화·미성년자 동의 P0)
- 오픈 PR 0건 (전부 머지·정리)

4. 샘플:
- pullim-writing-coach: 신규 글 샘플 0건(데모 5종 고정). PR 본문 첨부 스크린샷 약 **15장**(PR #14·#16·#17·#19·#21·#24)
- pullim-admissions-coach: 박준호 페르소나 mock 1건 · Zod 스키마 1건 · 폼 검증 데모 케이스 · 24h SLA 상태머신 1건 · 회원 DB 설계 답변 1건(chat·미저장) · Phase A+B 스크린샷 **12장**(데스크톱+모바일)
- 임의 글 novel 일반화 스팟체크(P2.4): 미실행(2주 이월)

5. AI가 만든 것:
- pullim-writing-coach 트랙: **19개 main 커밋**(feature 7 + docs/스크린샷 8 + fix 1 + chore 2 + docs 1) — #1·#2·#4·#9·#10·#16·#19 모두 단위 테스트 + PR 본문 + 스크린샷 첨부 / **LNB 확장 + `/about` 정적 페이지**(PR #25) / **`/about` 카피 정리 + product positioning rebrand**(PR #27, "글쓰기 도구·실시간") / **회원/DB 스키마 v1**(8 결정·8 테이블, a9f44e3) / **Vercel prod 라이브 회귀 스크린샷 5종**(PR #28)
- pullim-admissions-coach 트랙: Phase B 풀구현(Zod·gating·SLA 페이지) + Phase A+B 스크린샷 12장 + **Member DB doc v0.1 + 정의 v0.3.1 patch** + UX 카피 polish 2회 + **EmptyState로 Phase B 산출물 목록 마감** + **Vercel preview 배포**(prod 미연결)
- (재사용 자산 후보) `app/lib/draft.ts` LRU+debounce 어댑터, `<RubricExplainToggle>`, 5밴드 진척 인디케이터, **`/about` IA 구조(무엇·어떻게·누구·데이터·한계 5섹션)**

6. 내가 수정/기각/채택한 것:
- 채택: 09:30 우선순위(#1→#2→#4)를 **#1→#2→#16→#19→#4→#9→#10**으로 재배열 — 큰 산출물(#16 PDF) 선처리 + 6/1 안전망(#19) 당김 합리적
- 채택: Codex 리뷰 #20 반영(PR #22 `isDraftSnapshot` enum 검증)
- 채택: `docs/Daily` ↔ `docs/screenshot` 폴더 분리(PR #17) — 메모리 [Screenshot folder convention] 룰 정립
- 채택: daily 풀네임 룰 (pullim-writing-coach/pullim-admissions-coach 약자 금지) — 메모리 [Daily 풀네임 룰] 정립
- 채택: **LNB 확장 방향** — 둘러보기 섹션에 "내 정보·서비스 소개" 진입 추가 / **`/about` IA 5섹션 구조**(무엇·어떻게·누구·데이터·한계, #19 톤 일치) / **product positioning rebrand**(PR #27, "글쓰기 도구·실시간")
- 채택: **회원/DB 스키마 v1 8개 결정 잠금** (인증=이메일+OAuth·학교 자유입력·학생-교사 무관·코드 공유·이력 영속·셀프 검증·만 14세 보호자 동의·동의 이력)
- 채택: pullim-admissions-coach UX 카피 정정 — '학종→학생부 종합 전형'·landing hero·`/result` disclaimer 제거
- 직접 결정: #4 루브릭 v.5 영역별 disclose 패턴 / #9 draft 명시적 복원 배너(자동 복원 X) / #10 5밴드 시각화

7. 검증 결과:
- 빌드·테스트: 각 PR Typecheck/Unit/Codex 그린(PR #22로 Codex 지적 반영 완료)
- 6/1 묶음: **10/10 닫힘** — 평가 묶음 산출 100% 달성
- pullim-admissions-coach: `pnpm -r typecheck` clean · `next build` 7 static pages 통과 · 로컬 6 routes HTTP 200 (`/`·`/submit`·`/consent`·`/processing`·`/result`·`/parent`)
- ✅ **AI 검증 카운트 4일치 산정 완료** (2026-05-31 D-1 일괄, ledger: [`docs/16_ai_verification_count_2026-05-26_to_29.md`](../16_ai_verification_count_2026-05-26_to_29.md)) — 합계 **EPO 23건 / AI 11건**(약 2.1:1). 일자별: 26=4/1, 27=4/4, 28=5/2, 29=10/4. 패턴: AI 인프라·계정 사실관계 자력 발견 어려움 / EPO 카피·톤·스코프 재조준 강세. 다음부턴 daily 17:30 7번에 day-of-day 기록 유지

8. 미완료/미검증:
- ※ (정정) 정책 문서 `006_Admissions_Coach_data_security_policy_v0.1.md`는 **5/26 확정·main 푸시 완료** — 이전 15:30·17:30 초안의 "정책 v1 별도 문서 미산출" 진단은 EPO 보강 후 취소
- 🔴 **pullim-admissions-coach `prompt_v0.1.md`(M2 산출물명)** — 박준호 mock 답변은 있으나 명시 파일 미생성. M2 추적용 산출 필요
- ✅ Vercel prod 자동배포 라이브 검증 — PR #28 prod 라이브 회귀 스크린샷 5종으로 입증·종료 (오늘 머지 19건 prod 반영)
- ⚠ 현재 prod 데모 `https://pullim-writing-coach-demo.vercel.app/`는 **개인 Vercel 계정·Hobby 플랜** — 실제 서비스 출시 전 **조직 계정·유료 플랜 배포 필요** (사유: 보안·수익 발생)
- ⏳ **통합 e2e 회귀** — 6/1 묶음 10건 한 번에 동선 검증 미실행(5/31 D-1 통합 리뷰로 이월)
- ⏳ **AI 검증 카운트 4일치 산정** — 5/30 첫 작업으로 묶음(누적 4일째)
- ✅ 동의 텍스트 `ConsentNotice.tsx` EPO 최종 승인 완료 (2026-05-31) — 본문 변경 시 재승인 필요로 파일 주석에 잠금
- 임의 글 novel 일반화 스팟체크 (P2.4) — 2주 이월

9. 내일(5/30 토 D-2) 첫 액션:
- (최우선) **pullim-admissions-coach `prompt_v0.1.md` 명시화**(M2 산출물명 추적) — 박준호 mock 답변 구조 추출·정리
- **AI 검증 카운트 4일치 산정** — Standing Rule 3, 더 이상 이월 불가
- 동의 텍스트 EPO 최종 승인 — 3일 이월분 닫기
- (당김 가능) 06_v.4 ↔ `samples.ts` B 문구 동기화 · novel 스팟체크 1건

10. 재사용 가능한 프롬프트 / 체크리스트 / 하네스:
- **`app/lib/draft.ts` LRU+debounce 어댑터 패턴**(PR #20) — A2 `storage.ts` 패턴 확장. 다른 폼·세션 입력 자동 저장 재사용 가능
- **`<RubricExplainToggle>`**(PR #18) — 평가 기준 disclose 컴포넌트, 다른 채점 영역 확장 가능
- **5밴드 진척 인디케이터**(PR #23) — 글자수 외 진도·완성도 시각화에 재사용
- **스크린샷 폴더 분리 룰**(PR #17) — `docs/screenshot/` PNG 전용, `docs/Daily/` md 전용
- **메모리 룰 2건 신규** — [Screenshot folder convention] · [Daily 풀네임 룰] (pullim-writing-coach/pullim-admissions-coach 약자 금지)

11. 오늘 추정 vs 실제 (시간):
- 09:30 계획 추정: #1·#2·#4 우선 3건 + #16·#19·#9·#10는 당김 후보/5-30 이월. AI 검증 카운트 산정 포함
- **실제(pullim-writing-coach)**: 6/1 묶음 10건 전부 + Codex 리뷰 반영 + 폴더 분리 + 풀네임 룰 정립 + **LNB 확장·`/about` 신규**(PR #25·#26) + **`/about` 카피 정리·rebrand**(PR #27) + **회원/DB 스키마 v1**(a9f44e3) + **prod 라이브 회귀 5종 캡처**(PR #28) = **19 main 커밋** 폭주
- **실제(pullim-admissions-coach)**: Phase B 풀구현 + 스크린샷 12장 + **Member DB doc v0.1 + 정의 v0.3.1 patch + UX 카피 2회 + EmptyState 마감 + Vercel preview 배포 + PR template 인프라** = 8 main 커밋
- 미진행: AI 검증 카운트(4일치 또 이월) · 통합 e2e(5/31로 이월) · `prompt_v0.1.md`(5/30로). 정책 v1 별도 문서는 5/26부터 main에 존재(보강 후 확인). prod 자동배포 검증은 PR #28로 종료
- 캘리브레이션: 09:30 추정이 실제의 **약 15%만 잡음** — 6/1 D-3 압력 + 작은 묶음 일괄 처리 효과 + LNB·DB 스키마·rebrand·prod 회귀 같은 09:30 외 산출까지. **단일 day capacity 재산정 필수**, 5/30·5/31 계획도 단순화 권고

```
