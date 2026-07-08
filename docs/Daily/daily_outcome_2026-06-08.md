# 2026-06-08 일일 보고 / 최선혜 — 수습 종료 D-15 · ▣ 수원 새빛인강 챌린지 1순위 day


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
▣ 수원 새빛인강 (1순위, 본 day 메인 작업):
https://github.com/curea-co/suwon-monorepo · PR #281 (챌린지 화면)
https://github.com/curea-co/suwon-monorepo/pull/281

pullim-writing-coach 리포 / 데모 (v1, 2순위 — suwon PR 리뷰 대기 중 진입):
https://github.com/curea-co/pullim-writing-coach · https://pullim-writing-coach-demo.vercel.app/

pullim-writing-coach_v2 리포 / 데모 (새 패러다임, 이식 코드 출처):
https://github.com/curea-co/pullim-writing-coach_v2 · https://pullim-writing-coachv2.vercel.app/

pullim-admissions-coach 리포 / 데모:
https://github.com/curea-co/pullim-admissions-coach · https://pullim-admissions-coach.vercel.app/
```


## 09:30 Work Contract

```text
2026-06-08 (월) — ▣ 수원 새빛인강 챌린지 1순위 day · 수습 종료 D-15
[09:30 Work Contract / 최선혜]

▶ 어제(6/5~6/7) 인계:
  - 6/5 (금): 10:30 대표님 보고 진행 + **★ 새 과제 받음: 수원 새빛인강 메뉴 '챌린지' 화면 작업 (1순위)**
  - 6/6~6/7 (토·일): 회복 사이클 (휴일)
  - pullim-writing-coach 새 UX flow sprint는 **2순위로 강등** — suwon PR 리뷰 대기 시간에 진입

▶ 오늘 우선순위 (대표님 새 과제 입력 기반):
  1순위 — **수원 새빛인강 챌린지 화면** (`suwon-monorepo` PR #281): 메인 작업 시간 투입
  2순위 — **pullim-writing-coach 새 UX flow sprint**: PR #281 리뷰 대기·CI 대기 중 진입 (틈 시간 활용)

▶ pullim-writing-coach 새 UX flow (2순위, 시간 여유 시 진입):
```
  홈 → [내 글 채점받기 진입 CTA]
    → 1. 데모 비밀번호 입력 (TokenGate)
    → 2. 수행평가 안내서 입력 (Universal Capture 6채널, v2 §3-6 이식)
    → 3. 분기: "이미 글 있어요" / "아직 안 썼어요"
        (A) 이미 글 있어요 → 글 입력 → 5영역 채점 → 결과 조회
        (B) 아직 안 썼어요 → 쓰기 과정 1~4단계 → 글 완성 → 5영역 채점 → 결과 조회
```

▶ 미해결 인계 (오늘 또는 이후):
  - 🔴 **suwon-monorepo PR #281 (챌린지 화면)** — 1순위, 본 day 메인. 리뷰 통과·머지가 day 목표
  - ⚠ pullim-writing-coach 새 UX flow sprint Phase 1~4 (총 ~7.5 day 추정) — suwon 1순위 진행에 따라 W2 일정 압축·재조정
  - ⚠ **M3 W2 plan 재작성 필요** — 기존 plan(`docs/21_m3_w2_plan_2026-06-04.md`)에 새 UX flow + suwon 1순위 반영. suwon 진행에 시간 여유 생기면 진입
  - ⚠ 6/5 보고에서 받은 의사결정 결과 daily에 반영 (Pro 이관 결정·부모 시스템 진척)
  - ⚠ v2 E2E user 직접 회귀 (헤드리스 한계분)
  - ⚠ pullim-admissions-coach `prompt_v0.1.md` M2 산출물 — 5/30 이월 13일째 누적
  - 수습 종료 6/23 D-15 — suwon + writing-coach 양 트랙 동시 진행으로 능동성·범위 가시화 강화

▶ 오늘 위치: **suwon 챌린지 1순위 + writing-coach 2순위 day**. PR #281 코드 작업·테스트·PR 본문 정리 → 리뷰 요청 → 리뷰 대기 중 writing-coach Phase 1 진입.

0. 오늘 작업 순서 (1순위 suwon → 대기 시간 writing-coach)
- (09:30~12:00) **★ suwon PR #281 챌린지 화면** — 코드 작업 + 로컬 검증 + 캡처 + PR 본문 갱신
- (12:00~12:30) PR push + CI 그린 폴링 시작 + 리뷰 요청
- (점심 후 13:30~) **CI/리뷰 대기 중** → writing-coach 진입:
  - (13:30~14:30) v2 → v1 이식 인벤토리 1page (`docs/26_v1v2_integration_inventory.md`)
  - (14:30~15:30) 새 UX flow Phase 4 분리 plan 1page (`docs/27_new_ux_flow_phase_plan.md`)
  - (15:30~16:30) 리뷰 결과 인입 시 PR #281 정정 / 미인입 시 writing-coach Phase 1 첫 commit 진입
- (16:30~17:00) suwon PR #281 머지 (리뷰 그린 시) 또는 정정 후 재push
- (17:00~17:30) 6/5 보고 의사결정 결과 인테이크 + 외부 의존 P0 5건 daily 모니터링 룰 첫 entry
- (저녁) 17:30 Daily Outcome + writing-coach W2 plan 재작성 (시간 여유 시)

1. 오늘 진행할 산출물 (양 트랙):

**▣ suwon-monorepo (1순위)**
- PR #281 챌린지 화면 — 코드 + 캡처 + PR 본문 + 리뷰 통과 + 머지

**pullim-writing-coach (2순위, 대기 시간 한정)**
- v2 → v1 이식 인벤토리 1page (`docs/26_v1v2_integration_inventory.md` 신설 목표)
- 새 UX flow Phase 4 분리 plan 1page (`docs/27_new_ux_flow_phase_plan.md` 신설 목표)
- (가능 시) Phase 1 첫 commit 진입
- daily 09:30·17:30

2. 오늘 병렬로 진행할 pullim-admissions-coach 산출물:
- 본 daily 범위 밖 — 별도 세션. suwon 1순위로 합류 진척 미실시

3. 오늘 만들 샘플 수:
- suwon 챌린지 화면 캡처 (PR #281 본문 첨부용)
- (writing-coach) v2 → v1 이식 매트릭스 1건 (가능 시)
- (writing-coach) Phase 4 분리 표 1건 (가능 시)

4. AI에게 맡길 일:
- 트랙 A(suwon 1순위): PR #281 챌린지 화면 코드 + 캡처 + PR 본문
- 트랙 B(writing-coach 대기 시간): v2 → v1 이식 인벤토리 + Phase 4 plan
- 트랙 C(daily): 09:30·17:30 + (시간 여유 시) W2 plan 재작성

5. 내가 직접 검수/판단할 일:
- **suwon PR #281 챌린지 화면 UX/UI** — 수원 새빛인강 다른 메뉴 톤·라우팅 정합·접근성 검수
- suwon 리뷰 코멘트 — Codex 또는 동료 리뷰 결과 정정 우선순위
- **suwon vs writing-coach 시간 분배 결정** — suwon 작업이 12:00 전 끝나면 writing-coach Phase 1 진입 / 안 끝나면 dokument 작업만
- (writing-coach) v2 → v1 이식 시 v1 기존 컴포넌트(ScoreForm·TokenGate·MetaForm)와 충돌 처리 방향 — 완전 교체 vs 병존
- (writing-coach) 쓰기 과정 1~4단계 콘텐츠 결정 — 4단계가 무엇인지 (예: 1=주제·관점 / 2=개요·구조 / 3=본문 / 4=검토·다듬기)

6. 예상 blocker:
- **suwon 챌린지 화면 작업 분량 미상** — PR #281 진입해 봐야 12:00 안에 끝나는지 확정. 분량 큰 경우 writing-coach Phase 1 진입 못함
- suwon 리뷰 라운드 — 빠르게 그린 시 16:30 머지 가능, 라운드 많을 시 17:30 후 또는 익일 머지
- writing-coach 새 UX flow 분량 (Phase 4 누적 ~7.5 day)이 suwon 1순위로 압축되면 6/15 출시 D-day 안에 완성 불가능 → 외부 의존 P0 진척 따라 출시 형태 재조정
- 두 트랙 컨텍스트 스위칭 — suwon(다른 codebase) ↔ writing-coach(v1·v2) 동시 진행 시 quality 분산 위험

7. 당김 후보 (Standing Rule 5):
- (suwon 끝난 후) writing-coach Phase 1 진입 — Universal Capture 6채널 v1 이식 첫 commit
- 링크 본문 추출(D 채널) PR — writing-coach 빈 시간 진입 가능
- Vercel Pro 이관 ①~③ 자료 (대표님 결정 받았다면)
- pullim-admissions-coach Member DB doc v0.1 EPO 검수


## 부록 — pullim-writing-coach 새 UX flow Phase 분리 사전 안내 (2순위)

suwon 1순위 작업이 끝나거나 리뷰 대기 시간에 진입할 writing-coach sprint의 큰 그림.

### Phase 1 — 안내서 입력 + 6채널 Universal Capture 이식 (1~2 day 추정)
- v2 `UniversalCapture.tsx` 컴포넌트 v1 이식 (6채널)
- v1 TokenGate 통과 후 진입 화면을 안내서 입력 화면으로 교체
- v2 `/api/extract` route 이식 (Claude Haiku 라이브 추출)
- `AssignmentCard` 컴포넌트 이식
- PR 분리: ① 컴포넌트 이식 / ② API 이식 / ③ 진입 화면 전환

### Phase 2 — "이미 글 있어요" / "아직 안 썼어요" 분기 화면 (1 day 추정)
- 안내서 추출 후 분기 카드 2개
- 분기 A → 기존 v1 ScoreForm Step 2~3 (글 입력 + 채점)
- 분기 B → Phase 3 진입
- sessionStorage 분기 보존
- PR 분리: ① 분기 화면 / ② 라우팅 정합

### Phase 3 — 쓰기 과정 1~4단계 wizard (2 day 추정)
- v2 `/prepare` 4-step wizard 이식 + 콘텐츠 확정
- 단계 콘텐츠 후보 (검수 필요):
  · 1단계: 주제·관점 잡기 (안내서 키워드 + 학생 입력)
  · 2단계: 개요·구조 짜기 (서론/본론/결론 또는 장르별 구조)
  · 3단계: 본문 쓰기 (AI 코칭 등장)
  · 4단계: 검토·다듬기 (글자 수·근거·출처 체크)
- 마지막 단계 "글 완성하기" → Phase 4
- PR 분리: ① wizard 컴포넌트 / ② 단계 콘텐츠 / ③ 완성 트리거

### Phase 4 — 채점 결과 조회 (0.5 day 추정, 기존 v1 활용)
- 기존 `/api/score` + `/results/[id]` + PDF 내보내기 재사용
- PR 분리: 단일 PR

### Phase별 누적 (suwon 1순위와 병행 시점 기준)
| Phase | 추정 day | 누적 day | PR 누적 |
|---|---|---|---|
| 1 안내서 + 6채널 | 1~2 | 2 | 3 |
| 2 분기 화면 | 1 | 3 | 5 |
| 3 쓰기 1~4단계 | 2 | 5 | 8 |
| 4 채점 결과 | 0.5 | 5.5 | 9 |
| 회귀·dogfood | 2 | 7.5 | 11 |

★ **6/15 D-day 완성 가능 여부는 suwon 1순위 진행 속도에 의존** — suwon이 6/8 안에 머지되면 6/9~6/15 W2 7 day로 가능. suwon이 6/10·6/11까지 끌리면 writing-coach W2 plan 축소(Phase 1·2만 + Phase 3·4는 M4로 이관) 필요.
```


## 17:30 Daily Outcome

```text
[17:30 Daily Outcome / 최선혜]

▶ 오늘 핵심: **양 트랙 분배 day** — 1순위 suwon-monorepo PR #281(챌린지 화면) 진행은 별도 세션, 본 daily는 2순위 writing-coach 새 UX flow sprint day 1. 09:30 contract 5트랙(분석·Phase plan·W2 plan 재작성·Phase 1 첫 commit·의사결정 인테이크) → **오전 분석·plan 문서 3건 (docs/26·27·28) + 오후 1 Phase 1 PR A 머지(lib 3 + 27 unit) + 오후 2 의사결정 인테이크 PR 머지(docs/29 + P0 첫 entry)** = **PR 2건 머지 + 문서 4건 신설 + 단위 테스트 169→196**. 새 UX flow sprint day 1 정상 진입. backup 시나리오 D-2 사전 경보 발생 (5건 중 4건 보류) → 출시 형태 잠재 확정 (데모 토큰 + rate limit + Vercel 기본 URL).

1. 오늘 닫은 pullim-writing-coach 산출물:
- ★ **PR #67 머지** (sha `a4d2437`) — Phase 1 PR A: extract.ts·anthropic.ts·extract-client.ts lib 수평 이식 + grading.ts capTargetToWritable 추가 + scripts/extract.test.mjs 27 unit. **Codex 6라운드 정정(server-only/스키마 가드/genre confidence 보존/channel 화이트리스트/응답 검증/EXTRACT_MESSAGE 분리)** + 7라운드 자기모순 감지(channel drop ↔ E1 실패 반대 권고) → **admin override 머지**
- ★ **PR #68 머지** (sha `874b07a`) — 의사결정 인테이크 docs/29 신설 + docs/28 §3·§5 갱신. **Codex 9라운드 미세 정정**(요일 오기·NEXT_PUBLIC vs DEMO_ACCESS·Sentry no-op 조건·룰 source·표현 일관성·서버/클라 에러 폴백 분리) → CLEAN 머지
- ★ **문서 4건 신설**: `docs/26_v1v2_integration_inventory.md` · `docs/27_new_ux_flow_phase_plan.md` · `docs/28_m3_w2_plan_revised_2026-06-08.md` · `docs/29_decisions_intake_2026-06-08.md`
- ★ **재사용 자산 ①**: v2 → v1 이식 매트릭스 (5컴포넌트 × 9lib × 4페이지 × 난이도 1~5점, docs/26 §1~5). 이후 4 Phase의 모든 컴포넌트·lib 이식 결정에 재사용
- ★ **재사용 자산 ②**: 룰 A~D 정의를 docs/29 §4에 main 추적 가능 source로 정착. 이후 daily·plan은 본 docs/29 §4 참조 (워크스페이스 로컬 W1 plan 의존성 끊음)
- ★ **재사용 자산 ③**: backup 시나리오 사전 코드 자산 표 (docs/29 §6). DEMO_ACCESS_TOKEN·rate limit·NEXT_PUBLIC 자동입장·Sentry no-op·인증 비활성 가드 — Free-only 출시 형태 사전 점검표
- daily 09:30·17:30 작성

2. 오늘 닫은 pullim-admissions-coach 산출물:
- 본 daily 범위 밖 — 별도 세션 진행. 새 UX flow sprint day 1 집중으로 미합류

2-1. 1순위 suwon-monorepo 진행 (참고 — 별도 세션 트랙):
- **suwon-monorepo PR #281** (수원 새빛인강 챌린지 화면) — 6/5 보고 후 1순위 과제, 별도 세션에서 진행 중
- 본 daily의 writing-coach 산출은 PR #281 리뷰·CI 대기 시간 활용 결과
- 양 트랙 동시 sprint = 회의록 §능동성 피드백(주도적·차별화) 정합. day-end 양 트랙 산출 합산은 별도 보고에서

3. 실제 링크/파일:
- main commits 2건: `a4d2437`(#67 Phase 1 PR A) · `874b07a`(#68 docs/29 의사결정 인테이크)
- 신규 docs 4건: docs/26·27·28·29
- 신규 lib 4건: `app/lib/extract.ts` · `app/lib/anthropic.ts` · `app/lib/extract-client.ts` · `app/lib/grading.ts`(capTargetToWritable 추가)
- 신규 test 1건: `scripts/extract.test.mjs` (27 unit)
- 신규 npm 의존 1건: `server-only` (Codex PR #67 권고)

4. 샘플:
- 신규 글 샘플 **0건** (anchor 5종 유지)
- v2 → v1 이식 매트릭스 1건 (5컴포넌트 × 9lib × 4페이지 × 난이도)
- Phase 4 분리 표 1건 (Phase·작업·예상 day·PR 분리·회귀 영향)
- 외부 의존 P0 일자별 진척 로그 1건 (docs/29 §4)

5. AI가 만든 것 (트랙 A·B·C·D·E):
- 트랙 A(코드 분석): subagent(Explore) v2 워크스페이스 5컴포넌트·4페이지·9lib 분석 + 이식 난이도 1~5 점수 + v1과의 충돌 시나리오
- 트랙 B(Phase plan): 4 Phase 분리 + 9~10 PR 묶음 plan + 회귀 영향 측정 + dogfood 일정 정정
- 트랙 C(W2 plan 재작성): 기존 W1 plan(워크스페이스 로컬) 항목(링크 추출·테스트 커버리지·로깅)을 W3로 이관 + 새 UX flow를 메인 sprint로
- 트랙 D(Phase 1 PR A): extract.ts(ExtractedAssignment 타입 정의·EXTRACT_SYSTEM_PROMPT·validate/finalize·channel 화이트리스트) + anthropic.ts(server-only·callAnthropic) + extract-client.ts(extractAssignment·looksLikeExtractedAssignment 스키마 가드·EXTRACT_MESSAGE 13 코드 매핑) + 27 unit
- 트랙 E(의사결정 인테이크): docs/29 §1~8 본문 + 룰 A~D 정의 정착 + P0 첫 entry + backup 시나리오 사전 경보 명시 + Sentry 서버/클라 폴백 분리

6. 내가 수정/기각/채택한 것:
- 채택: **v1↔v2 = 완전 교체** (`/try` → `/coach`, 09:30 work contract 잠금)
- 채택: **홈 Hero CTA 교체** (`[직접 채점받기]` → `[내 글 채점받기]`)
- 채택: **4단계 콘텐츠 = v2 mock 재사용** (출시 후 EPO 원본 작성)
- 채택: **출시 범위 = Phase 1+2+3+4 전체** (4단계는 mock으로)
- 채택: **6/5 보고 의사결정 4건** — Sentry 보류 / Pro 이관 6/13 재검토 / 부모 시스템 출시 후 단계적 / dogfood 출시 후 수집
- 결정: **PR #67 Codex 7라운드 자기모순 감지 → admin override 머지** (channel drop ↔ E1 실패 직전 ↔ 이번 round 반대 권고)
- 수정: Codex PR #67 6라운드 정정 (server-only·표시 정책 통일·genre confidence 보존·channel 화이트리스트·응답 검증·EXTRACT_MESSAGE 분리)
- 수정: Codex PR #68 9라운드 미세 정정 (요일 오기·NEXT_PUBLIC vs DEMO_ACCESS·Sentry no-op 조건 정확화·룰 source 정착·표현 일관성)
- 채택: backup 시나리오 표현을 "유력 / 6/13 재검토에서 확정"으로 통일 (docs/29 §2·§5·진척 로그 모두)
- 채택: 룰 A~D 운영 source를 워크스페이스 로컬 W1 plan → main 추적 가능한 docs/29 §4로 승격

7. AI 검증 카운트 (Standing Rule 3):
- AI(Codex)가 틀린 곳: 1건 (PR #67 round 7 자기모순 — channel drop ↔ E1 실패)
- 본인이 잡은 곳: 1건 (위 자기모순 즉시 감지 + admin override 결정)
- AI가 합당하게 지적한 곳: 15건+ (PR #67 6라운드 ~15건 + PR #68 9라운드 ~20건). 모두 채택 정정
- ★ 학습: **새 lib 이식(v2 → v1) PR은 Codex 라운드 인플레이션 — extract.ts 같은 신규 모듈은 표시 정책·스키마 가드·prompt injection·메시지 맵 등 cross-cutting 검증 항목이 인프라 PR과 비슷한 깊이로 들어옴 (PR #60 인프라 PR과 동일 패턴 — `docs/22` 4 layer 체크리스트의 lib 버전 정착 필요)**

8. 재사용 자산 (Standing Rule 2) — 오늘 3건 박힘 (목표 1건 초과):
- ★ **v2 → v1 이식 매트릭스** (docs/26 §1~5) — 5컴포넌트·9lib·4페이지·난이도 표. 이후 Phase 1 PR C / Phase 2~4 모든 이식에 재참조
- ★ **룰 A~D 정의 정착** (docs/29 §4) — main 추적 가능 운영 룰 source. 이후 daily·plan은 docs/29 참조 (워크스페이스 로컬 의존 끊음)
- ★ **backup 시나리오 사전 코드 표** (docs/29 §6) — DEMO_ACCESS_TOKEN·rate limit·자동입장·Sentry no-op·인증 가드 5건 사전 점검. 6/13 (토) 재검토 시점에 이 표로 출시 형태 확정

9. 내일 첫 액션 (6/9 화 — M3 W2 day 1 정식 시작):
- (09:30 work contract) **suwon-monorepo PR #281 1순위 진척 확인** — 머지 여부·리뷰 라운드 수·writing-coach W2 plan 영향 점검 (별도 세션 head 동기화)
- (09:30 work contract) `▶ 외부 의존 P0 진척` 1줄 박기 (룰 A 정착 첫 day) — 형식: `P0-#1 Pro 이관: 보류(6/13 재검토) | P0-#2 도메인 alias: 미진척 | P0-#3 부모 인증: 출시 후 별도 | P0-#4 부모 billing: 출시 후 별도 | P0-#6 dogfood 모집: 출시 후 수집`. 변동 없으면 그대로 복사
- **Phase 1 PR B** — `/api/extract/route.ts` 신설 (Claude Haiku 라이브 추출 + x-demo-token 게이트 + JSON 프리필 재호출 + errorEnvelope) + 단위 테스트
- **Phase 1 PR C** — UniversalCapture + AssignmentCard + ConfidenceChip 컴포넌트 이식 (v2 → v1, Tailwind 토큰 호환·라우팅 무관)
- (시간 분배) suwon 진척에 따라 writing-coach Phase 1 PR B·C 진입 속도 조정: suwon 6/8 머지 시 6/9~6/15 7 day 가능 / suwon 6/10·6/11까지 끌리면 Phase 3·4 M4 이관 옵션

10. 예상 blocker:
- **Phase 1 PR B**: route.ts에서 anthropic.ts(server-only) 호출 + JSON 프리필 처리 + 재호출 로직 + 토큰 게이트 + 환경변수(DEMO_ACCESS_TOKEN·ANTHROPIC_API_KEY) 정합 — Codex 인프라 PR 평균 3 라운드 패턴 예상 (PR #60·#67 학습)
- **Phase 1 PR C**: AssignmentCard·ConfidenceChip Tailwind 토큰 v1↔v2 차이 / "use client" 경계 / ExtractedAssignment 타입 lib에서 import (이미 Phase 1 PR A에서 lib에 정의 완료)
- **suwon 1순위 sprint 의존성**: writing-coach Phase 진척이 suwon 진행에 따라 조정. 본 W2 plan은 suwon 완료 가정 — 미완 시 Phase 3·4 M4 이관 옵션

11. 시간 추정 vs 실제 (Standing Rule 4):
- 오전 분석·plan 3건 추정 3h vs 실제 ~2h (-33%, subagent Explore 활용으로 v2 코드 분석 단축)
- Phase 1 PR A 추정 2h vs 실제 ~3h (+50%, Codex 6라운드 정정 누적)
- 의사결정 인테이크 docs/29 추정 1h vs 실제 ~2.5h (+150%, Codex 9라운드 미세 정정 + 요일 오기·표현 일관성 정정 반복)
- ★ 학습: **새 docs 신설 PR이 새 lib 신설 PR과 비슷한 Codex 라운드 비용** — 문서도 cross-reference·표현 일관성·근거 검증이 깊게 들어옴. 인프라 PR 4 layer 체크리스트의 **문서 버전(docs/29처럼 정책·운영 룰·근거 외부 인용을 포함한 문서)** 정착 필요 → 다음 docs PR에서 사전 체크리스트로 적용

12. Overnight 위임 후보 (Standing Rule 6):
- (저녁 18:50 위임 가능) Phase 1 PR B 또는 PR C 사전 코드 작성 — extract route 또는 UniversalCapture 컴포넌트. 의존성 0이라 둘 다 가능. 다음 day 09:30~09:40에 PR 본문·테스트 검수만
```

