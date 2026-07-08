# 2026-05-26 일일 보고 / 최선혜 


## 운영 룰 (Standing Rules)

오늘부터 daily_outcome 작성 시 적용하는 6개 룰. 다음 daily_outcome 파일에도 복사해 유지.

1. **2중 안전망 등록 룰** — 영향이 큰 사실 변화(예: 자기소개서 폐지)나 발견은 plan(개별 문서) + 주간 계획(상위 문서) **두 위치에 등록**. 한 곳만 박으면 잊혀짐.
   - 적용 사례: `definition_pivot_memo_v0.1` + `personas_v0.1.1` + (예정) 정의 v0.2 + WBS v0.3.1 — cascade 4개 문서 분산.
   - 다음 발견 시: plan + 주간 계획 두 위치 등록을 룰로 실행.

2. **재사용 자산 일일 산출** — 17:30 Daily Outcome 9번에 매일 1개 이상 박기 (체크리스트·룰·프롬프트·하네스). 1일 1작업 → 1영속 자산.

3. **AI 검증 카운트** — 17:30 Daily Outcome 7번에 "AI가 틀린 곳 N건 / 본인이 잡은 곳 N건" 매일 기록.

4. **시간 추정 vs 실제** — 17:30 Daily Outcome 10번에 추정 vs 실제 한 줄. 캘리브레이션 데이터 누적.

5. **이월·당김 양방향** — 09:30 Work Contract 7번에 "당김 후보 (조건부)" 1줄. 작업 일찍 끝나거나 대기 시 주간 plan에서 1건 당겨옴.

6. **Overnight 위임** — 일과 끝나기 전 18:50 전후 AI에게 풀세트 작업 위임, 다음 날 09:30~09:40에 산출 확인 + PM 검수 1건씩.


## 작업 환경
```text

Writing Coach 리포 / 데모:
https://github.com/curea-co/pullim-writing-coach · https://pullim-writing-coach-demo.vercel.app/
```


## 09:30 Work Contract

```text
2026-05-26
[09:30 Work Contract / 최선혜]

0. 오늘 작업 순서
- (오전·빠르게) P0.1 1장 계획 `PLAN_pwc_1pager.md` 확정 — 유일하게 빠진 P0 산출물
-  P2.1 `/api/score` route 골격 — `scripts/verify.mjs` 코어 이식 (신규 구축 아님)
- P2.2 후처리 가드 + P2.3 `normalizeBody`·에러처리 — **타임아웃/429(critical gap) 우선**
- P2.4 BE 자체 테스트 → **엔드투엔드 200 1건 = M1 인수기준 선확보**
- 병렬 트랙 B: FE 입력화면 와이어 + AC 정의 v0.2 초안

1. 오늘 진행할 Writing Coach 산출물:
- `PLAN_pwc_1pager.md` (1장 계획·BE/FE 분리·일정)
- `app/lib/prompt.ts` — 프롬프트 단일 소스 (08 v.2 / prompts.mjs 이식)
- `app/lib/grading.ts` — 순수 모듈 (가드·스키마검증·정규화, SDK import 금지)
- `app/api/score/route.ts` — POST 파이프라인 (토큰게이트→파싱→검증→정규화→Haiku→가드→스키마검증→**[무효 시 1회 재호출 = E 1/5 스키마 비결정성 서버측 흡수, 05-22 미완료 #4]**→meta 주입)
  · 스키마 재호출은 타임아웃 예산 내 **1회만**, 재호출도 무효면 E11 에러 응답. SDK `maxRetries=0`(429/timeout 자동재시도)과는 별개 메커니즘
- **엔드투엔드 200 1건** (12 §10 인수기준 #1, M1 충족 조건)

2. 오늘 병렬로 진행할 Admissions Coach 산출물:
- AC 정의 v0.2 초안 1건 — AI 백그라운드 위임, 본인은 검수만. 8/1 별개 트랙 유지 (WBS §6).

3. 오늘 만들 샘플 수:
- 신규 글 샘플 작성 **0건** (데모 5종 고정)
- BE 자체 테스트 입력: **5종 anchor**(재현 확인) + **임의 글 2~3건**(novel 일반화 스팟체크) = **7~8 입력**
- ⚠️ 09 v.2 기준 5종은 anchor 승격→**회로적**. 일반화 신호는 임의 글에서만 나옴.

4. AI에게 맡길 일:
- **트랙 A (BE/Claude)**: verify.mjs → route.ts·grading.ts·prompt.ts 이식, 가드·정규화·에러처리 구현, `normalizeBody` 픽스처 테스트, 자체 테스트 실행·로그
- **트랙 B (FE·문서/Claude)**: 1장 계획 초안, FE 입력 폼 와이어·컴포넌트 골격, AC 정의 v0.2 초안

5. 내가 직접 검수/판단할 일:
- 1장 계획 범위·일정 최종 승인
- BE 자체 테스트 판정 — **임의 글의 novel 고점 −6~−10 보수 편향**(09 v.2 §5.1)을 M1 골격에선 수용할지 / P5로 이관할지
- **E 스키마 1회 재호출 흡수 동작 확인** — E(1/5 무효)가 재호출로 200 되는지, 재호출도 무효 시 E11 응답하는지 (05-22 미완료 #4 해소 검증)
- 에러 UX 카피·HTTP 코드 매핑(12 §5.2) 적합성
- AC 정의 v0.2 방향성

6. 예상 blocker:
- **critical gap (WBS §9)**: `/api/score` 타임아웃·429 무방비 시 25초 끝에 흰 화면 → `maxDuration=60`·`timeout=55s`·`maxRetries=0`(SDK 429/timeout 자동재시도 OFF — 타임아웃 예산 보호) 반드시 포함. ※ 스키마 무효 1회 재호출(E 흡수)은 예산 내 별도 1회 — `maxRetries=0`과 충돌 아님
- **env 미등록**: `DEMO_ACCESS_TOKEN`·`ANTHROPIC_API_KEY` 로컬/Vercel 없으면 401·호출 실패
- novel 고점 보수 편향이 임의 글에서 크게 나오면 판정 시간 잠식
- **AGENTS.md 경고**: 이 Next.js는 breaking change 버전 — route handler 작성 전 `node_modules/next/dist/docs` 확인 비용
- KB 잔여 이슈 재인입 시 WC 시간 잠식 (WBS 리스크)

7. 당김 후보:
- P3.1 FE 입력화면 (트랙 B 선착수 → M1 후 연동 대기 단축)
- `normalizeBody` 픽스처 테스트를 eval 게이트에 회귀 고정
- 06 v.4 / rubric §5.1 ↔ `samples.ts` B 문구 동기화 (09 v.2 §5.3 후속) — 짧으면 당김
- *(후속 유지·오늘 아님)* §7.2 일일 글로벌 캡 — 데모 비번 광범위 공유 전
```

## 15:30 Evidence Check

```text
[15:30 Evidence Check / 최선혜]

1. 현재까지 나온 링크/파일:
- 커밋 2건: `388d184` (M1 골격 — FE 입력 폼·토큰 게이트 + 1장 계획 + EPO 에러매핑) · `9bf2f42` (normalizeBody dot-ellipsis 룰 + 25건 재검증 HARD PASS 갱신)
- BE: `app/api/score/route.ts` (207L) · `app/lib/grading.ts` (403L, 순수) · `app/lib/prompt.ts` (265L, 단일 소스)
- FE: `app/try/page.tsx` · `app/components/ScoreForm.tsx` (410L) · `app/components/TokenGate.tsx` (116L)
- 문서: `docs/PLAN_pwc_1pager.md` (P0.1 1장 계획) 신설
- 테스트/하네스: `scripts/normalize.test.mjs` 신설 · `scripts/verify.mjs` 기본 MOCK 전환(유료 토큰 0, 실호출은 `VERIFY_LIVE=1`)
- 리포/데모: github.com/curea-co/pullim-writing-coach · pullim-writing-coach-demo.vercel.app

2. 현재까지 나온 샘플:
- 신규 글 샘플 **0건** (계획대로 데모 5종 고정)
- eval 입력: **5종 anchor × 5회 = 25건** 재검증 실행 (Haiku v0.2)
- 임의 글 2~3건 novel 일반화 스팟체크: **미실행** (P2.4 측정·로깅 미시작)

3. 화면 또는 문서 증거:
- 빌드 게이트: `tsc` · `eslint` · `next build` ✓ (388d184)
- 유닛: grading 34건 → normalize 픽스처 3건 추가로 **37/37 통과**
- eval: verify **25건 HARD PASS** (스키마 25/25 · 총점±3 · 영역±2 · 분산 · FIX_COUNT 0) — 단 **anchor=시험셋 회로적**(09 v.2 §5.2)
- 문서 증거: PLAN_pwc_1pager.md · 12 §5.2 에러매핑 EPO 결정 4건(E8/E2·E11·E3/E-AUTH/E5·E6) 반영
- ⚠️ **스크린샷 증거 0** — /try 입력화면·TokenGate 화면 캡처 미수집

4. 부족한 것:
- **엔드투엔드 200 1건 (M1 핵심 인수기준 #1) 미실증** — verify.mjs는 grading 코어만 태우고 `route.ts` HTTP 경로 실호출 200은 미확인
- /try·토큰게이트·결과 화면 스크린샷 0
- 임의 글 novel 일반화 스팟체크 미실행
- P3.2 라이브 fetch 연동 미착수 (ScoreForm은 페이로드 미리보기까지)
- AC 정의 v0.2 초안 미착수 (트랙 B 병렬분)
- `DEMO_ACCESS_TOKEN`·`ANTHROPIC_API_KEY` 로컬/Vercel env 등록 미확인

5. 17:30 전까지 보강할 것:
- **(최우선)** dev 서버 또는 `VERIFY_LIVE=1`로 `/api/score` 엔드투엔드 **200 1건 실증 + 스크린샷 1장** (M1 인수기준 #1)
- /try 입력화면·토큰게이트 스크린샷 1~2장 확보
- env(`DEMO_ACCESS_TOKEN`·`ANTHROPIC_API_KEY`) 로컬 존재 확인
- (시간되면) AC 정의 v0.2 초안 AI 위임 착수 / 임의 글 1건 스팟체크

```

## 17:30 Daily Outcome

```text
[17:30 Daily Outcome / 최선혜]

1. 오늘 닫은 Writing Coach 산출물:
- BE 골격: `route.ts`(207L) · `grading.ts`(403L 순수) · `prompt.ts`(265L 단일 소스) — P2.1·2.2·2.3
- FE 입력(P3.1 골격): `/try` · `ScoreForm`(410L, F3 게이트·E2/E3/E10/E11 검증·페이로드 미리보기) · `TokenGate`(116L, E-AUTH 401·sessionStorage)
- P0.1 1장 계획 `PLAN_pwc_1pager.md`
- `normalizeBody` dot-ellipsis 룰 + 픽스처 테스트 3건
- 게이트: `tsc`·`eslint`·`next build` ✓ / 유닛 37/37 / eval 25건 HARD PASS
- ※ M1 인수기준 #1(route 엔드투엔드 200 실증)은 미완 — 8번 참조

2. 오늘 닫은 Admissions Coach 산출물:
- **별도 repo `curea-co/pullim-admissions-coach` 부트스트랩** (오늘 커밋 4건) — 계획(정의 v0.2 가볍게)보다 진척:
  - 서비스 정의 **v0.3** (윤리·규제 가드레일 포함) + 정의 v.2·pivot 메모 v.1
  - WBS v3.1·페르소나 v.2 동기화 + README
  - **`docs/student_profile_schema_v0.1.json`** (학생 프로필 입력 스키마 v0.1) ← 오늘 핵심 산출
- 8/1 별개 트랙 유지. EPO 검수는 내일(9번).

3. 실제 링크/파일:
- PR #1 (OPEN): https://github.com/curea-co/pullim-writing-coach/pull/1
- 커밋 `388d184` (M1 골격) · `9bf2f42` (dot-ellipsis + 25건 HARD PASS)
- 파일: route.ts · grading.ts · prompt.ts · ScoreForm.tsx · TokenGate.tsx · try/page.tsx · PLAN_pwc_1pager.md · scripts/normalize.test.mjs
- env: `DEMO_ACCESS_TOKEN`·`ANTHROPIC_API_KEY` 로컬 `.env.local` 존재 확인 ✓ (15:30 갭 해소)
- AC repo: https://github.com/curea-co/pullim-admissions-coach — 커밋 `8d9d011`·`10ac8d9`·`ecb792b`·`57bd6bd` / `docs/002_..._definition_v.3.md` · `docs/student_profile_schema_v0.1.json` 등

4. 샘플:
- 신규 글 샘플 **0건** (계획대로 데모 5종 고정)
- eval: 5종 anchor × 5회 = **25건 HARD PASS** (Haiku v0.2 / 스키마 25/25·총점±3·영역±2·분산·FIX_COUNT 0) — 단 anchor=시험셋 **회로적**
- 임의 글 novel 스팟체크: **미실행**

5. AI가 만든 것:
- 트랙 A(BE): route.ts·grading.ts·prompt.ts (verify.mjs 코어 이식 + HTTP 래퍼·가드·정규화·에러처리), normalize 픽스처 테스트, verify.mjs MOCK 기본 전환
- 트랙 B(FE·문서): /try·ScoreForm·TokenGate, PLAN_pwc_1pager.md 초안

6. 내가 수정/기각/채택한 것:
- 채택: A·E anchor 승격(5건 전부) / Haiku 4.5 v1 상향 / dot-ellipsis는 (중략) **양쪽 감쌀 때만 연결, 한쪽이면 단순 제거**
- EPO 에러매핑 결정 4건 반영: ① E8(503) 카피 "일시적 오류예요…" 정정 + 클라 오프라인 분리 ② E2·E11(422) vs E3(400) 의도된 구분 명문화 ③ E-AUTH(401) 전용 화면 신설 ④ E5·E6(502) 자동 1회 재호출 + 로깅 유지
- 이관(기각 아님): novel 고점 −6~−10 보수 편향 → P5 (재결정 트리거 N=5·X=5)

7. 검증 결과:
- 빌드 green / 유닛 37/37 / eval 25건 HARD PASS
- **AI 검증 카운트** — 오늘 미집계, **2026-05-27 산정 예정**(전날분 소급 카운트)
- ⚠️ HARD PASS는 anchor=시험셋이라 회로적 — 일반화 신호 아님

8. 미완료/미검증:
- **M1 인수기준 #1: `route.ts` 엔드투엔드 200 실증 미완** (verify는 grading 코어만 태움, HTTP 경로 미실호출)
- 스크린샷 증거 0 (/try·토큰게이트·결과 화면)
- 임의 글 novel 일반화 스팟체크 미실행
- AC: 정의 v0.3·스키마 v0.1 산출 완료 — **EPO 검수 미완**(내일)
- ⏳ **PR #2 (P3.2 FE 라이브 연동 — 입력 폼→/api/score→결과 바인딩, +864/−423·10파일) 머지 대기** — 저녁 추가 진행분. 리뷰봇 **18:58 기준 60분+ 실행 중**, 실행 그대로 두고 EOD (Overnight 위임, Rule 6)
- ✅ PR #1 리뷰봇(`REVIEW_BOT_PRIVATE_KEY`) 트러블슈팅 **약 2시간 만에 해결** (박승훈 PM 협조). **리뷰 정상 게시·Review 체크 pass 확인 완료** (`curea-review-ai` APPROVED·COMMENTED) → 종료

9. 내일 첫 액션:
- (최우선) **PR #2 리뷰봇 결과 확인 → 머지** (FE 라이브 연동, 어제 EOD 실행분)
- `/api/score` 엔드투엔드 **200 1건 실증 + 스크린샷 1장** → M1 인수기준 #1 확보
- **BE 샘플 누수 수정** (anchor 샘플 데이터가 응답/프롬프트 경로로 새어나가는 문제)
- AC 정의 v0.3·`student_profile_schema_v0.1.json` EPO 검수 (어제 산출분)
- **AC 남은 대기 산출물 (05-27 진행):**
  - `prompt_v0.1.md` (M2) — 정의 v0.3 §6 가드레일을 **시스템 프롬프트 제약으로 구현**
  - **미성년자 동의 플로우 + 보관·삭제 정책 v1** — 🔴 출시 blocker
- 어제 미집계분 AI 검증 카운트 산정 (7번)

10. 재사용 가능한 프롬프트 / 체크리스트 / 하네스:
- `scripts/normalize.test.mjs` — 정규화 회귀 픽스처(영속 자산, 룰 변경 시 회귀 고정)
- `scripts/verify.mjs` MOCK 기본 전환 — 유료 토큰 0으로 상시 회귀 eval 게이트
- (후보) 리뷰봇 GitHub App 설치·`REVIEW_BOT_PRIVATE_KEY` 트러블슈팅 노트 → 체크리스트화

11. 오늘 추정 vs 실제 (시간):
- WC BE+FE 골격: 계획상 05-27 P2 착수 → **하루 앞당겨 오늘 완료** (추정 대비 빠름, 선행분 덕)
- 리뷰봇 설치: 추정 ~30분 → **실제 약 2시간**(`REVIEW_BOT_PRIVATE_KEY`, 4배 초과) — 박승훈 PM 협조로 해결
- 순효과: WC 코어 당김 + AC도 계획(정의 v0.2) 초과해 v0.3·스키마까지 진척. 리뷰봇 2h는 엔드투엔드 실증·AC 검수 시간을 잠식
- PR #2 리뷰봇 런타임: **60분+** (PR #1 1~3분 대비 급증 — 디프 규모 +864/−423 영향 추정, 내일 원인 확인)

---
※ **18:58 EOD** — 본 daily_outcome CEO 공유 후 퇴근. **PR #2 리뷰봇은 실행 그대로 진행**(Overnight 위임, Rule 6), 결과·머지는 내일 09:30 첫 액션으로 확인.
```