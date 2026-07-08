# 2026-06-25 일일 보고 / 최선혜 — 배포 D-5(6/30) · M3 W4 day 4 · writing-coach 과정 코치 풀 패러다임 + planner 병렬


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
★ 통합 배포일: 2026-06-30 (D-5) — writing-coach·planner 양 트랙 공통 마감
   - writing-coach: 과정 코치 풀 패러다임(Phase 1~4 + 대필 가드) prod 배포 → 사용자 접속
   - planner: 06-30 루틴 BE 통합 배포 (pullim-api 핸드오프 R1~R5)
   ⚠ 6/26(금)·6/27(토) 휴일 → 실 working day = 6/25(오늘)·6/29(월)·6/30(화 배포) 3일뿐
      오늘 = 공백(6/26~6/28) 전 마지막 풀 working day. D-5이나 실작업 가능일은 today 포함 3일 = 압박 상향

▣ pullim-writing-coach (1순위, 오전 메인):
https://github.com/curea-co/pullim-writing-coach · https://pullim-writing-coach-demo.vercel.app/
※ 6/30 배포 목표 = 과정 코치 풀 패러다임 (안내서 입력→AI 추출→분기→쓰기 wizard/채점 + 대필 가드)
※ [사실 갱신 6/25] 6/24~6/25 main 대량 머지 완료 — 과정 코치 코어가 이미 main에 들어감:
   - #73 물결1 토대(진입 흐름·모드 선택·과제 입력·토큰 통합 C1/C2/C3)
   - #74~#78 Wave2 #1~#5 (mode 배선·정적 대필 가드 안전망·개요먼저+OutlinePanel·가이드 질문 장르 분기·개요→본문 전환)
   - #81~#85 PUDS dashboard shell + OS-style 홈 리뉴얼 (shell collapse·left tabs·tabbar)
   - #86 공용 RichEditor(TipTap) + /coach 통합 (평문 투영·reducer 무수정)
   → 잔여 OPEN 2건뿐: **#79 Wave2 #6a 대필 가드 covert 차단**(mergeable UNKNOWN, CI 확인) · **#72 글쓰기 경험 설계 docs**(BEHIND, rebase 필요)
※ 배포 토폴로지: dev 브랜치 없음 → 전부 main 직접 머지 · main 미보호 · Vercel 대시보드 git 통합
   → 운영 배포(local→dev→main) 파이프라인 신설 공수 = 본 day 메인 의사결정 (하단 §공수 산정)
※ 이식 출처(v2): https://github.com/curea-co/pullim-writing-coach_v2 · https://pullim-writing-coachv2.vercel.app/

▣ pullim-planner (2순위, 오후 트랙):
https://github.com/curea-co/pullim-planner · https://dev-planner.pullim.ai/planner
※ 6/24 산출: dev 머지 9건 (#84~#91) + pullim-api 핸드오프
   docs/planner/2026-06-24_planner-fe-handoff_be-status-0630-deploy.md (06-30 루틴 API·통합 배포 R1~R5)
※ dev: main 대비 다수 커밋 ahead (미승격) — 06-30 통합 배포에 승격

pullim-admissions-coach (별개 트랙, 8/1):
https://github.com/curea-co/pullim-admissions-coach · https://pullim-admissions-coach.vercel.app/
```


## 09:30 Work Contract

```text
2026-06-25 (목) — ▣ M3 W4 day 4 · writing-coach 과정 코치 풀 패러다임 배포 push (오전 메인) + planner 06-30 루틴 BE (오후) · 통합 배포 D-5
[09:30 Work Contract / 최선혜]

▶ 외부 의존 / 배포 게이트 (양 트랙 공통 마감 6/30 D-5):
  - writing-coach P0: Pro 이관 보류 | 도메인 alias 미진척 | 부모 인증·billing 출시 후 별도 | dogfood 출시 후 수집
    → 6/30 사용자 접속 readiness 게이트(Vercel Pro·도메인·env·토큰 게이트)를 본 sprint 내 확정 필요
  - planner: 06-30 루틴 BE 통합 배포 → 게이트키퍼 핸드오프 회신 대기
    → OI 3건 결정 대기: ① 소유단위 ② 완료키 ③ 충돌 우선순위 (회신 도착 시 루틴 BE 착수 조율)

▶ 어제(6/24 수)~오늘 새벽 마감 — 양 트랙 산출:
  - ★ writing-coach (main 직접 머지): #73 토대(C1/C2/C3) + #74~#78 Wave2 #1~#5(가드 안전망·개요먼저·장르 분기·개요→본문) + #81~#85 PUDS shell+홈 리뉴얼 + #86 RichEditor(TipTap)+/coach 통합 → **과정 코치 코어 main 진입 완료**
  - planner (dev 머지 9건): #84 PUDS 재스킨(pullim-jr) / #85 eyebrow 제거+카피 / #86 planner-manage dev-bypass parity / #87 일간 날짜 달력 점프 / #88 정직한 빈 상태 / #89 미완료 정리(auth-context+플레이북)+OI-1 결정 / #90 시간표 카드 "공유"(친구 모달)+`/planner/share` 인바운드 / #91 친구 시간표 카드 ~50% 축소
  - pullim-api 핸드오프 md: BE 구현/미구현 표 + 06-30 루틴 API + 통합 배포 R1~R5 (그 레포에 untracked → 게이트키퍼 워크플로 커밋 필요)
  - OI-1 확정: 하단탭 4개(홈/관리/리포트/공유), 소개는 메뉴화 (proc/spec studygram-share §OI-1 닫음)
  ※ writing-coach 코어가 예상보다 빨리 main 진입 → 본 day 무게는 "잔여 #79·#72 closure + **운영 배포 파이프라인 신설**"로 이동

▶ ★ 본 day 메인 (writing-coach — 오전 집중, 6/30 운영 배포 readiness):
  - **잔여 OPEN closure** — PR #79(대필 가드 covert) CI/mergeable 확인 후 머지(대필 0 불변식, 배포 전 필수) → PR #72(docs) rebase 후 머지
    ※ 코어(#73~#86)는 이미 main → "브랜치 closure"가 아니라 "잔여 2건 + 운영 readiness"가 실제 남은 일
  - **운영 배포 파이프라인 신설** — local→dev→main 도입 (하단 §공수 산정). 도메인 alias·Vercel production branch·env 분리가 진짜 게이트
  - **배포 readiness 점검** — 실 env 주입(ANTHROPIC_API_KEY·DEMO_ACCESS_TOKEN·Sentry DSN) + 도메인 + 토큰 게이트 → 6/30 사용자 접속 가능 상태 확정

▶ 오후 트랙 (planner — 6/24 next action 이어가기):
  - **게이트키퍼 핸드오프 회신 확인** → 06-30 루틴 BE 착수 조율 (OI 3건 결정)
  - **또는 studygram P0** (`packages/types`) 타입 PR 단독 착수 (공유 실 배선 선행 — BE 의존 없이 타입만)

▶ 미해결 인계 (오늘 또는 이후):
  - 🔴 **writing-coach 브랜치 상태 동기화** — PR #79·#72 머지 가능 여부 + 파라다임 코어 잔여 분량 (09:30~10:00 1순위)
  - 🔴 **PR #79 대필 가드 covert 차단 closure** — 동적 생성 선행 de-risk, 배포 전 필수 (대필 0 불변식)
  - 🔴 **6/30 배포 readiness 게이트** — Vercel Pro·도메인·env·토큰 게이트 (양 트랙 공통 D-5)
  - 🔴 **planner 게이트키퍼 회신 → 루틴 BE OI 3건** (소유단위·완료키·충돌 우선순위)
  - 🟡 **studygram P0 타입 PR** (`packages/types`) — 공유 실 배선 선행, 회신 대기 시 진행 가능
  - 🟡 **pullim-api 핸드오프 md 커밋** — 게이트키퍼 워크플로로 untracked 해소
  - ⚠ pullim-admissions-coach `prompt_v0.1.md` M2 산출물 — 8/1 D-37, M3 closure 후 합류

▶ 오늘 위치: **M3 W4 day 4 · 양 트랙 6/30 통합 배포 D-5 push · 공백(6/26~28) 전 마지막 풀 working day**. 6/26(금)·27(토) 휴일로 배포까지 실 working day는 today·6/29(월)·6/30(화) 3일뿐 → 오늘 산출이 곧 6/29~30 마감 안전마진. 오전은 writing-coach 과정 코치 풀 패러다임 브랜치 closure(가드 #79 우선) + 배포 readiness, 오후는 planner 06-30 루틴 BE 조율(게이트키퍼 회신 게이트). **6/26~28 공백 동안 외부 의존(게이트키퍼 회신·Codex 라운드)이 멈추므로, 오늘 안에 회신 요청·머지 트리거를 최대한 선행**.

0. 오늘 작업 순서 (오전 writing-coach 메인 → 오후 planner)
- (09:30~10:00) **양 트랙 동기화** — writing-coach 브랜치 상태(PR #79·#72·코어) + planner 게이트키퍼 회신 여부 확인
- (10:00~12:00) **★ writing-coach 브랜치 closure** — PR #79 대필 가드 Codex 대응·머지 → PR #72 docs 머지
- (점심 후 13:30~15:00) **writing-coach 파라다임 코어 머지 + 새 동선 prod 통합** (Phase 1~4 + 가드 라이브 확인)
- (15:00~16:00) **planner 트랙** — 게이트키퍼 회신 시 루틴 BE OI 3건 조율 / 미회신 시 studygram P0 타입 PR 착수
- (16:00~17:00) **6/30 배포 readiness 점검** — Vercel Pro·도메인·env·토큰 게이트 체크리스트 1page
- (17:00~17:30) docs 정착 (선택) — 배포 readiness 체크리스트 자산화
- (저녁) 17:30 Daily Outcome + over.md (Overnight 위임: writing-coach 잔여 머지 검증 또는 planner studygram P0 타입)
  ※ 6/26·27 휴일 → 다음 daily는 6/29(월). Overnight 위임 산출은 6/29 09:30에 일괄 확인 (3일치 위임 가능, 검수 부담 분산 고려)

1. 오늘 진행할 pullim-writing-coach 산출물 (1순위, 오전 메인):
- ★ **PR #79 대필 가드 covert 차단** Codex 대응·머지 (대필 0 불변식, 배포 전 필수)
- ★ **PR #72 글쓰기 경험 종합 설계 docs** 머지
- ★ **파라다임 코어 머지** (feat/coach-engine-core 등) + 새 동선 prod 통합
- ★ **6/30 배포 readiness 체크리스트** (Vercel Pro 이관 ①현황·도메인·env·토큰 게이트)
- daily 09:30·17:30 + over.md

2. 오늘 진행할 pullim-planner 산출물 (2순위, 오후):
- **게이트키퍼 핸드오프 회신 확인** → 06-30 루틴 BE 착수 조율 (OI 3건 결정 기록)
- **또는 studygram P0** (`packages/types`) 타입 PR 단독 (공유 실 배선 선행)
- pullim-api 핸드오프 md 커밋 (게이트키퍼 워크플로)

3. 오늘 만들 산출물 수:
- writing-coach 브랜치 머지 2~3건 (#79·#72 + 코어)
- 6/30 배포 readiness 체크리스트 1건 (양 트랙 공통 게이트 정리)
- planner 루틴 BE OI 3건 결정문 1건 또는 studygram P0 타입 PR 1건
- 신규 글 샘플 0건 (anchor 5종 유지)

4. AI에게 맡길 일:
- 트랙 A(writing-coach 동기화): PR #79·#72 머지 가능 여부 + 파라다임 코어 잔여 분량 sweep
- 트랙 B(writing-coach 가드): PR #79 Codex 코멘트 Must/Should/Won't Fix 표 + covert 차단 회귀 테스트
- 트랙 C(배포 readiness): Vercel CLI project·env·domain sweep + 체크리스트 1page
- 트랙 D(planner): 게이트키퍼 핸드오프 회신 파싱 + 루틴 BE OI 3건 옵션 정리 / studygram P0 타입 스캐폴드
- 트랙 E(daily): 09:30·17:30 + over.md

5. 내가 직접 검수/판단할 일:
- **6/30 배포 scope 게이트** — 풀 패러다임 전체 머지 가능 여부 vs 핵심만 우선 머지(D-5 시간 압박 따라 본 day 판정)
- **대필 가드 안전성** — PR #79 covert 차단이 대필 0 불변식 충족하는지 (배포 차단 항목)
- **planner OI 3건 결정** — 소유단위·완료키·충돌 우선순위 (게이트키퍼 회신 기반, 대표/게이트키퍼 확인 필요 시 이월)
- **studygram P0 타입 단독 착수 타당성** — 회신 대기 시 BE 의존 없는 타입 PR 진행 판단

6. 예상 blocker:
- **writing-coach 브랜치 머지 충돌** — main 6/9 이후 파라다임 코어 다수 브랜치 → rebase/충돌 가능, 머지 순서 의존성(#79 가드 선행)
- **Codex 라운드 누적** — PR #79 가드 covert 차단은 로직 민감 → 라운드 길어질 수 있음. 사전 체크리스트로 단축 시도
- **6/30 D-5 시간 압박 (실 working day 3일)** — 6/26·27 휴일로 today·6/29·6/30뿐. 풀 패러다임 전체 머지 + readiness가 사실상 3 day → scope 게이트(핵심 우선 머지) 본 day 조기 판정 필요
- **공백(6/26~28) 외부 의존 정지** — 게이트키퍼 회신·Codex 라운드가 휴일 동안 멈춤 → 오늘 안에 회신 요청·머지 트리거 선행 안 하면 6/29 출근까지 대기 발생. 휴일 전 발사 우선
- **planner 게이트키퍼 회신 지연** — 루틴 BE OI 3건 결정 외부 의존 → 미회신 시 studygram P0 타입 PR로 대기 시간 흡수
- **양 트랙 컨텍스트 스위칭** — 오전 writing-coach / 오후 planner 전환. 오후 트랙은 중단 안전한 단위(타입 PR·OI 정리)로 한정

7. 당김 후보 (Standing Rule 5) — 회신 대기/조기 closure 시:
- **planner studygram P0 타입 PR** — 게이트키퍼 회신 전에도 BE 의존 없이 착수 가능
- **writing-coach 배포 readiness ②도메인 alias 실작업** — ①현황 점검 후 곧장 진입
- **planner 홈 캘린더 UX 폴리시** (6/24 당김 후보) — 빈 상태 메시지·aria-label 보강
- pullim-api 핸드오프 md 커밋 정리 (untracked 해소)
- writing-coach v1 컴포넌트 단위 테스트 +N건 (이월)
```


## 운영 배포 파이프라인 공수 산정 — local → dev → main (2026-06-25)

> 질문: 사용자 운영 서버 배포를 위해 worktree(브랜치·승격 파이프라인)를 `local → dev → main`으로 바꾸려면 공수가 얼마인가?
> 결론: **순수 작업 ≈ 6~8h (코드 거의 0, 설정 중심)**. 단 외부 의존(도메인 DNS 전파·실 API 키·Vercel·Codex 러너)이 일정 변수. 6/30 운영 배포 충분히 가능하나 **도메인 alias는 6/25 오늘 발사 필수**(6/26~28 휴일 동안 DNS 전파 자동 진행되게).

### 현재 상태 (AS-IS) — local → main 직결
- `dev` 브랜치 **없음** → 모든 PR이 `main`으로 직접 머지
- `main` **브랜치 보호 없음** (required review·status check 0)
- CI(`ci.yml`): `push: [main]` + 모든 PR에 typecheck·unit·components·e2e 4잡
- Codex 리뷰(`codex-review.yml`): `pull_request_target`, self-hosted 러너(`curea-runner-groups-2`)
- Vercel: 대시보드 git 통합(`vercel.json` 없음), demo = `pullim-writing-coach-demo.vercel.app`
- env: 로컬 `.env` 빈 값 (ANTHROPIC_API_KEY·DEMO_ACCESS_TOKEN·Sentry DSN 미주입)

### 목표 (TO-BE) — local → dev → main
- `dev` = 스테이징/통합(자동 staging 배포) · `main` = 운영(production 도메인)
- 개발: feature → **PR into dev** (CI+Codex 게이트) → dev staging 배포 검증
- 릴리스: **PR dev → main** 승격 → main이 production 도메인으로 배포 → 사용자 접속

### 공수 분해 (work breakdown)
| # | 작업 | 공수 | 코드 | 외부 의존 | 리스크 |
|---|------|------|------|----------|--------|
| A | `dev` 브랜치 생성(main 분기)·origin push·repo default PR base=dev 전환 | 0.5h | 0 | — | 낮음 |
| B | 브랜치 보호 2종 — main(PR-only·CI 필수·review 1·linear) / dev(CI 필수) | 1.0h | 0 | GitHub 권한 | 중 (Codex self-hosted를 required로 넣으면 러너 다운 시 게이트 블록) |
| C | `ci.yml` `push.branches: [main]` → `[main, dev]` 추가 + PR base=dev 동작 확인 | 1.0h | 소(yml) | — | 낮음 (codex는 base 무관 → 무변경) |
| D | **Vercel 환경 분리** — production branch=main 설정 / dev→Preview(staging) / **운영 도메인 alias 연결** / env 분리(Prod 실키 vs Preview 테스트키) | 2~3h | 0 | Vercel·DNS·실 API 키 | **높음 (P0-#2 도메인 alias 미진척 — DNS·인증서 전파 수h~1day)** |
| E | 릴리스 운영 룰 문서화 — dev→main 승격 시점·승인자·롤백 | 0.5h | 0 | — | 낮음 |
| F | 검증 — dev push→staging smoke → dev→main PR→production 배포→사용자 접속 E2E happy path | 1.0h | 0 | — | 중 (실 채점 키 동작 확인) |
| | **합계** | **6~8h** | **거의 0** | | |

### 진짜 게이트 (코드 아님 = 외부 의존)
1. **도메인 alias (P0-#2, 미진척)** — DNS·TLS 전파 지연(수h~1day)이 최장 임계경로. **6/25 오늘 발사**하면 휴일(6/26~28)에 전파 자연 진행 → 6/29 검증, 6/30 운영.
2. **실 env 키 주입** — ANTHROPIC_API_KEY·DEMO_ACCESS_TOKEN(+rate limit·예산 알람)·Sentry DSN을 Vercel Production env에 등록. 현재 빈 값이라 사용자 채점 불가.
3. **main 보호 도입 = 관행 전환 비용** — 지금까지 main 직접 머지 습관 → dev 경유로 전환. Codex self-hosted 러너를 required check에 넣을지(안정성 트레이드오프) 판정 필요.

### working day 배치 제안 (06-25 · 06-28 · 06-29 · 06-30)
- **06-25(목, 오늘)**: #79·#72 closure + **A·D 발사** — dev 브랜치 생성 + Vercel production branch/도메인 alias 발사(휴일 전파) + 실 env 주입. ★도메인은 오늘이 마지노선
- **06-28(일)**: staging(dev) 배포 검증 + B(브랜치 보호) + C(CI dev 추가)
- **06-29(월)**: E(릴리스 룰) + dev→main 승격 리허설 + F 일부(E2E smoke·Codex 게이트 확인)
- **06-30(화)**: 운영 배포 — dev→main 승격 PR 머지 → production 배포 → 사용자 접속 확인 + Sentry 모니터링

### 참고: "git worktree" 문자 그대로의 옵션
- 만약 `git worktree`(한 레포에서 다중 작업 디렉터리)를 묻는 것이면: dev·main 동시 체크아웃용 worktree 2개 추가는 ~10분(`git worktree add ../wc-dev dev`). 단 운영 배포 파이프라인 본질은 위 A~F(브랜치 승격+Vercel)이고, worktree는 그 보조 편의일 뿐 — 배포 공수의 핵심 아님.


## 15:30 Evidence Check

```text
[15:30 Evidence Check / 최선혜]

1. 현재까지 나온 링크/파일:
[pullim-writing-coach — 운영 배포 파이프라인 (local→dev→main)]
- main 머지 2건(squash): `9e2dae9`(PR #88 README 현행화, 14:07 KST) · `8c60bd2`(PR #89 ci dev push 트리거 → dev, 14:46 KST)
- dev 브랜치 신설: `origin/dev` (9e2dae9 → 8c60bd2, main 대비 1커밋 ahead)
- 기본 브랜치 전환: main → **dev** (gh api default_branch=dev, Vercel Production=main 핀 확인 후 실행)
- 도메인 2종 라이브: 운영 https://writing.pullim.ai (→production/main) · dev https://dev-writing.pullim.ai (→dev 브랜치 매핑 확인)
- Notion: 운영 배포 파이프라인 공수 산정 페이지 https://app.notion.com/p/38a7b9b431ef81d1a123ff200cbd10ad
- docs: `docs/Daily/feature_list_2026-06-25.md`(기능 인벤토리) · 본 daily §운영 배포 파이프라인 공수 산정

2. 현재까지 나온 산출물(샘플):
- 신규 글 샘플 0건 (anchor 5종 고정)
- 배포 파이프라인 산출물 5종: dev 브랜치 · 도메인 2종(+TLS) · ci dev 트리거(#89) · 공수 산정 1page · 기능 리스트 1건
- README 정합: Codex 5라운드 누적 13지적 검증·정정(가드 mock 폴백 · 모드 라벨[자유·가이드·개요 활성/말하기 준비중] · rate limit 2단[user10·ip60] · "SDK"→raw fetch · DEMO_ACCESS_TOKEN fail-closed · /coach 미배선 항목) → 실제 구현과 1:1 정합

3. 화면 또는 문서 증거:
- `https://writing.pullim.ai` HTTP 200 · TLS 유효(실측 0.07s) / `https://dev-writing.pullim.ai` HTTP 200 · TLS 유효
- pullim.ai NS = ns1/ns2.vercel-dns.com → **Vercel DNS 직접 호스팅** = 도메인 Add 시 레코드 자동 생성(외부 DNS 작업·휴일 전파 대기 불필요)
- PR #88·#89 CI 전체 green(typecheck·unit·components·e2e·Vercel) + Codex Review pass(#89 지적 0건)
- PR #89 base=dev 자동 타겟 → 기본 브랜치 전환 정상 작동 검증
- ci.yml `push: [main, dev]` 머지 반영 → 이후 dev push마다 CI 게이트

4. 부족한 것:
- 🔴 **Production env 미검증** — `DEMO_ACCESS_TOKEN`·`ANTHROPIC_API_KEY` 등 Production 주입(사용자 직접 진행 중). 주입 전 `writing.pullim.ai`는 200이나 토큰 게이트·채점 미동작 → 6/30 readiness 마지막 게이트
- 🔴 **#79·#72·#87 미머지(→main)** — #79 대필 가드 covert(배포 전 필수, ey-code 담당) · #72 글쓰기 경험 docs · #87 /try 위저드 재설계. 머지 후 `dev←main` 동기화 필요
- ⏳ **dev←main 동기화 미실행** — 현재 dev가 main보다 1 ahead(ci뿐), 역방향 동기화는 #79·#72 main 진입 후 일괄
- ⏳ **staging(dev) 실배포 기능 스모크 미실행** — dev-writing 200이나 dev 고유 변경(ci) 외 기능 차이 없음 → 실질 검증은 후속 dev 머지 후
- ⚠ **휴일(6/26~28) 외부 의존 정지** — env 주입·#79 머지 트리거를 오늘 안 끝내면 6/29 출근까지 대기. 도메인 게이트는 오늘 해소(Vercel DNS 즉시 반영)
```


## 17:30 Daily Outcome

```text
[17:30 Daily Outcome / 최선혜]

1. 오늘 닫은 pullim-writing-coach 산출물 (운영 배포 파이프라인 local→dev→main):
- ★ **운영 채점 라이브 검증 완료** — `writing.pullim.ai/api/score` → **200**(실제 피드백) + `dev-writing.pullim.ai/api/score` → **200**. 6/30 사용자 접속의 핵심 게이트(키 실동작) 양쪽 다 닫힘
- main 머지 1건: `9e2dae9`(PR #88 README 현행화, 14:07 KST) — 과정 코치 패러다임+라이브 API 정합, **Codex 5라운드 13지적 검증·정정**
- dev 머지 2건: `8c60bd2`(PR #89 ci `push:[main,dev]` 트리거, 14:46) · `2d8e2cb`(PR #90 dev 스모크 재배포 트리거, 17:06)
- **dev 브랜치 신설 + 기본 브랜치 main→dev 전환** (Vercel Production=main 핀 확인 후 안전 전환)
- **도메인 2종 라이브**: 운영 `writing.pullim.ai`(→main) · 스테이징 `dev-writing.pullim.ai`(→dev). Vercel DNS 자동(ns1/ns2.vercel-dns.com)+TLS, P0-#2 도메인 alias closure
- **env 주입**: ANTHROPIC_API_KEY 회전 + Production·Preview scope 주입, DEMO_ACCESS_TOKEN(운영 `pullim1102`/dev) 게이트
- 🔒 보안: `.env.example`에 실키 혼입 발견 → 커밋 전 scrub(유출 차단) + 키 회전

2. 오늘 닫은 pullim-planner 산출물:
- 본 daily 범위 밖(별도 세션). 6/24 dev 머지 9건(#84~#91) 후속 — 게이트키퍼 핸드오프 회신·루틴 BE OI 3건은 6/29로 이월

3. 실제 링크/파일:
- 운영 데모: https://writing.pullim.ai (채점 200 검증) · 스테이징: https://dev-writing.pullim.ai (SSO 보호, 채점 200)
- main 머지: `9e2dae9`(#88) / dev 머지: `8c60bd2`(#89)·`2d8e2cb`(#90)
- docs: `docs/Daily/feature_list_2026-06-25.md`(기능 인벤토리) · `docs/deploy/smoke_2026-06-25.md` · 본 daily §운영 배포 파이프라인 공수 산정·§15:30 Evidence Check
- Notion: 운영 배포 파이프라인 공수 산정 https://app.notion.com/p/38a7b9b431ef81d1a123ff200cbd10ad
- 오픈 PR(→main): #79 대필 가드 · #72 docs · #87 /try 재설계 (전부 미머지)

4. 샘플:
- 신규 글 샘플 0건 (anchor 5종 고정)
- 배포 파이프라인 산출물 5종: dev 브랜치 · 도메인 2종(+TLS) · ci dev 트리거 · 공수 산정 1page · 기능 리스트
- 채점 라이브 응답 2건(운영·dev, content-length ~1827) — 실 키 동작 증거

5. AI가 만든 것:
- README 현행화(#88) 코드·정정 13건, ci.yml dev 트리거(#89), 스모크 문서(#90), 기능 리스트·공수 산정·15:30/17:30 daily, Notion 페이지, dev 브랜치/도메인 진단·검증 스크립트

6. 내가 수정/기각/채택한 것:
- 채택: Vercel main 핀 확인 후 기본 브랜치 전환(prod 흔들림 0) · 도메인=Vercel DNS 자동(외부 DNS 작업 불필요 판정) · 키 회전(유출 평문 노출 대응)
- 기각/판정: Codex "디렉터리 트리 오류"(#88) = false positive(이미 app/ 하위) → 변경 없이 resolve · 스모크 문서 Codex 4라운드 nitpick = Must Fix 아님 → 문서 최소화로 루프 차단 후 resolve
- 수정: AWS Bedrock 대신 Anthropic 직접 키(코드가 raw fetch라 Bedrock은 코드변경 필요 → 6/30엔 직접 키)

7. 검증 결과 (AI 검증 카운트 [룰3]):
- 운영·dev `/api/score` 200 + 실 피드백 라이브 확인 / 잘못된 토큰 → 401(게이트 정상) / dev 503=E8 진단→Preview 키+재배포로 해소
- **AI(Codex)가 잡은 곳 N=21건**(#88 README 13 + #90 스모크 8) — 전부 코드 대조 검증 후 반영 or 판정
- **본인이 잡은 곳 N=3건**: ① `.env.example` 실키 혼입(유출 차단) ② Codex 디렉터리 지적 false positive 판별 ③ dev 503=E8 원인(Preview 키 미반영) 진단

8. 미완료/미검증:
- 🔴 **#79 대필 가드(→main) 미머지** — 대필 0 불변식, 배포 전 필수(ey-code) → 휴일 전 머지 트리거 미확인
- 🔴 **#72 docs · #87 /try(→main) 미머지** (#87은 차단 아님)
- ⏳ **dev←main 동기화** — 위 머지 후(현재 dev가 main보다 2 ahead: ci+smoke)
- ⏳ 브랜치 보호 dev(미설정) / 릴리스 운영 룰 문서(step E) / daily 06-25 커밋(untracked)
- ⬜ 크레딧·결제·인증(Phase 2) — 유료 모델은 출시 후 별도 구축

9. 내일(6/26·27 휴일 → 6/29 월) 첫 액션:
- **휴일 전 오늘 발사**: #79 머지 트리거 요청(ey-code) — 휴일 중 외부 의존 정지라 안 띄우면 6/29까지 대기
- **6/29 첫 액션**: #79·#72·#87 머지 확인 → `dev←main` 동기화 → 운영 재검증 + Overnight 위임 산출 확인

10. 재사용 가능한 프롬프트/체크리스트/하네스 [룰2]:
- **운영 배포 파이프라인 체크리스트(local→dev→main) A~F** — dev 브랜치·브랜치 보호·CI 트리거·Vercel 환경분리/도메인/env·릴리스 룰·검증 (본 daily §공수 산정 = 영속 자산, 타 리포 재사용 가능)
- **env 주입 하네스**: Production/Preview scope 분리 + env 변경은 **Redeploy 필요** + 도메인이 Vercel DNS면 레코드 자동(NS 확인 1줄로 외부 DNS 작업 여부 판별)

11. 오늘 추정 vs 실제 (시간) [룰4]:
- 파이프라인 공수 추정 6~8h(§공수 산정) → 실제 핵심 경로는 **도메인이 Vercel DNS 자동이라 추정 2~3h(DNS 전파 포함) → 사실상 즉시**로 단축, 반면 **#88 README Codex 5라운드 루프가 추정 외 시간** 소요. 순증감 상쇄 — 파이프라인 골격은 오늘 1일 내 완료(추정 부합), 단 외부 의존 closure(#79)는 휴일로 이월
```
