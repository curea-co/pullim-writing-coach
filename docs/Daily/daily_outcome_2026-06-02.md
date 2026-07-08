# 2026-06-02 일일 보고 / 최선혜 — 수습 종료 D-21


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
2026-06-02 (화) — ▣ M2 16:00 D-day · 수습 종료 D-21
[09:30 Work Contract / 최선혜]

▶ 어제(6/1 CEO 평가 day) 마감:
  ① ▣ 6/1 CEO 평가 피드백 인테이크 (기능 80% / 정책 30% 정량 평가)
  ② 회의록 docs/19 신설 — 22항목 5섹션, 시간 코드 보존, 이름 치환, 후속 액션 매핑
  ③ ★ pullim-writing-coach main에 12 PR squash 머지 (sprint 2회 + 품질 보강):
     · M2 W1 빠른 시드 5건 (15:17~15:33, 16분): #33 docs/18·#34 입력 순서·#35 진척바·#36 클립보드·#37 DnD+TXT
     · PR #38 form fix
     · M3 Pro 의존 0 5건 (16:19~16:37, 18분): #39 Step wizard·#40 DOCX 클라·#41 prefill LRU·#42 /results 폴리시·#43 에러 폴백
     · PR #44 Codex 누적 16건 일괄 정정
  ④ ★ main 브랜치 보호 룰셋 적용 (`main-protection` active, 17:xx, 5/31 사고 정정 후속 당김)
  ⑤ 09 v.2 §5.3 closure 동기화 완료 (Codex PR #32 후속 정합화)

▶ 미해결 인계 (오늘 또는 이후):
  - ⚠ Vercel Hobby → 조직·Pro 이관 (memory `vercel-hobby-to-org-migration` 8단계) — M3 후반·pullim-admissions-coach 8/1 전 필수
  - ⚠ pullim-admissions-coach `prompt_v0.1.md` M2 산출물 — 5/30 이월 7일째 누적. 8/1 D-60
  - ⚠ 회의록 §능동성 피드백 — pullim-admissions-coach 능동 제안 검토 미진행 (시장 분석·수익성·차별화)
  - ⚠ /try 전체 동선 user 직접 회귀 미실시 (헤드리스 한계, M2 W1 + M3 Pro 의존 0 통합 검증 필요)
  - 수습 종료 6/23 D-21 — 패턴(D-day 압력 + 회복 사이클) 유지 시 정량 80→90 가능성

▶ 오늘 위치: M2 16:00 정산 day. 어제 sprint로 M2 명목 산출 + M3 첫 절반(Pro 의존 0)이 이미 닫힘 → **오늘은 회귀 검증 + 능동 제안 + M3 W2 plan**.

0. 오늘 작업 순서
- (오전) /try 전체 동선 user 회귀 — Step wizard 3-step + DnD/TXT/DOCX/클립보드/진척바/에러폴백 + 메타 prefill LRU
  ※ user가 TokenGate 토큰 직접 입력 후 동선 1회. 캡처 3~5장
- (오전) pullim-admissions-coach 능동 제안 검토 — 회의록 §(01:11:20)·(01:12:15)·(01:14:46) 응답
  ※ 초등 교육 시장 경쟁사 다각 분석(수익성·유저 수·기술 구현 용이성·참신 기능) 1page
- (낮) 테스트 커버리지 확장 — 어제 추가 컴포넌트 단위 테스트 (MetaForm·TextPreviewCard·DOCX 파서·LRU prefill·필터·검색)
- (▣ 16:00 M2 정산) M2 명목 산출 closure 확인 + M3 W2 plan 1page
- (저녁) 잔여 가능 시 — 링크 본문 추출(D) 검토 또는 Vercel Pro 이관 1차 점검

1. 오늘 진행할 pullim-writing-coach 산출물:
- /try 전체 동선 회귀 보고서 (12 PR 머지 후 통합 검증, 캡처 3~5장)
- 테스트 커버리지 +N건 단위 테스트 PR (어제 추가분 5~6 컴포넌트)
- M2 16:00 정산 1page — 명목 완성 항목 vs 미완 항목 정리
- M3 W2 plan 1page — 남은 Pro 의존 0 작업(링크 추출·테스트·로깅) + Pro 이관 진입 시점

2. 오늘 병렬로 진행할 pullim-admissions-coach 산출물:
- 🔴 **능동 제안 1page** (회의록 응답) — 초등 교육 앱 시장 경쟁사 분석(필터링 + 수익성·유저 수·기술 구현 용이성) + 참신 기능 후보 2~3건. 대표님 보여드릴 차별화 기획안
- (이월 7일째) `prompt_v0.1.md` M2 산출물 — 박준호 mock 답변 구조 추출 + §6 가드레일. 8/1 D-60, 더 이상 미루기 어려움

3. 오늘 만들 샘플 수:
- 신규 글 샘플 0건 (코드 freeze 해제 상태이나 신규 글 작업은 별개)
- /try 동선 회귀 캡처 3~5장 (시연 자료 보강)
- pullim-admissions-coach 능동 제안용 경쟁사 분석 매트릭스 1건

4. AI에게 맡길 일:
- 트랙 A(pullim-writing-coach 회귀·테스트): /try 동선 자동 회귀 + 컴포넌트 단위 테스트 +N건 PR
- 트랙 B(pullim-admissions-coach 능동 제안): 초등 교육 시장 경쟁사 분석 매트릭스 + 차별화 기능 후보 도출
- 트랙 C(pullim-admissions-coach M2 산출): `prompt_v0.1.md` 초안 (§6 가드레일 이식)
- 트랙 D(M2 정산·M3 plan): 16:00 정산 메모 + W2 plan 1page

5. 내가 직접 검수/판단할 일:
- /try 동선 user 직접 회귀 — Step wizard·DOCX 클라 파싱·prefill LRU 모두 user 시점에서 매끄러운가
- pullim-admissions-coach 능동 제안 우선순위 — 어떤 차별화 기능을 대표님께 선제적으로 보여드릴지
- `prompt_v0.1.md` 톤·범위 — M2 충족 검증 + 미성년자 가드레일 정합
- M2 정산: completion · 잔여 부채 (M3로 이관) · 정량 80→90 자기 평가
- Vercel Pro 이관 결정 시점 — 6/2 시작 / W3 / M3 후반 중 택

6. 예상 blocker:
- 어제 5배 sprint(12 PR/3 sprint) 후 컨디션 — 회의록 (01:06:20)·(01:07:23) "5~11시 self-investment" 인용했으나, 회복도 self-investment 일부. 무리 시 quality ↓
- pullim-admissions-coach 능동 제안의 "어떤 형태로 보여드릴까" 결정 부담 — 코드 prototype vs 문서 vs 와이어. 회의록 (01:15:37) "시각적 구성·UX 측면에서 감탄할 만한 기획" 인용 → 시각 prototype 권장이나 시간 부담
- pullim-admissions-coach prompt_v0.1.md 7일 이월 — M2 산출물 자체가 미명시 상태 지속 시 8/1 마일스톤 리스크 누적
- 수습 D-21 — 매 daily에 능동성·자기 증명 가시화 필요. 무행동 day = 평가 음전 신호

7. 당김 후보:
- 링크 본문 추출(D) — 4채널 중 마지막 1건. Hobby 가능 (server fetch + readability)
- 테스트 커버리지 4~6 컴포넌트 (단위 테스트 패턴 storage.test.mjs·draft.test.mjs 그대로 확장)
- pullim-admissions-coach Member DB doc v0.1 EPO 검수 (8개 결정 잠금 후속)
- HWP 파싱 prototype (hwp.js 품질 시험 — Hobby 가능 영역, 시간되면)
- Vercel Pro 이관 1차 점검 (memory 8단계 ①~③ 시작)
```


## 15:30 Evidence Check

```text
[15:30 Evidence Check / 최선혜]

▶ 오늘 09:30 계획에서 큰 pivot 발생: v1 동선 회귀·테스트·pullim-admissions-coach 능동 제안 → **CEO doc §3 재설계 기반 v2 시각 프로토타입 신축** (별도 repo). 6/1 회의록 *(00:30:02)·(00:51:42)·(01:15:37)* "주도적·차별화·선제적 구현" 피드백 직접 응답.

1. 현재까지 나온 링크/파일:
- 09:30 daily 작성 — 수습 종료 D-21 카운트다운 헤더 시작 + 미해결 인계 5건 박힘
- ★ **새 workspace `C:\workspace\pullim-writing-coach_v2`** (Next.js 16 + TS + Tailwind + Turbopack)
- ★ **새 GitHub repo `curea-co/pullim-writing-coach_v2`** (public, https://github.com/curea-co/pullim-writing-coach_v2)
  · commit 1e14abd (init), d1fdd1e (v2 본문 일괄 — 5 컴포넌트 + 4 페이지)
- ★ **Vercel 배포 production URL**: https://pullim-writing-coachv2.vercel.app (HTTP 200, 33초 빌드, Hobby plan)
- 로컬 dev: http://localhost:3200/ (PID 11564 LISTENING)
- **CEO doc §3 재설계 5건 적용** (docs/CEO/2026-06-01-writing-coach-ux-redesign-design.md 인테이크):
  · 두 문서 모델(§3-2) — 안내서 첫 입력, AI가 과제·장르·분량·조건·선생님 루브릭 자동 추출
  · Universal Capture(§3-6) — 6채널(사진/파일/붙여넣기/링크/말/타이핑), 사진 추천 강조
  · 준비/평가 모드 분리(§3-3) — /prepare 4-step wizard(점수 X) · /evaluate(5영역+안내서 기준 채점)
  · AI 어시스턴트 6선(§3-8) — 단일 액션·추론·신뢰도 칩(점선/실선)·스트리밍 등장·관대·이어쓰기
  · **루브릭 유지** — v0.5 5영역·5종 anchor·/api/score·data·lib 100% 재사용
- 신규 파일 9건: `UniversalCapture.tsx` · `AssignmentCard.tsx` · `ConfidenceChip.tsx` · `AssistantBubble.tsx` · `ModeSelector.tsx` · `page.tsx` · `prepare/page.tsx` · `evaluate/page.tsx` · `about/page.tsx`
- 재사용 파일 7건 (v1 → v2 그대로): `grading.ts` · `prompt.ts` · `model-version.ts` · `utils.ts` · `scoring.ts` · `samples.ts` · `api/score/route.ts`
- globals.css에 stream-in keyframes 보강 (AI 어시스턴트 §3-7 시각 시뮬레이션)

2. 현재까지 나온 샘플:
- 신규 글 샘플 **0건** (v2도 anchor 5종 그대로)
- v2 mock 시각 시뮬레이션 데이터 패턴 1건 — 안내서 텍스트 → 키워드 기반 메타 추정 (장르·분량·조건·루브릭 인식 여부)
- 채점 mock 매칭 패턴 1건 — 글 길이 기반 anchor 5종 자동 선택 (저점·편차·중점·중상·고점)
- 시각 검증 스크린샷 5장 — 로컬 4장(home/prepare/evaluate/about) + prod 1장(prod-home)

3. 화면 또는 문서 증거:
- 빌드·CI: tsc 0 · `next build` 통과 · 4 routes static prerender + API route dynamic
- 로컬 **smoke test** (dev 3200): 4 routes 200 · 콘솔 에러 0 · response 0.04~0.10s (※ HTTP status·콘솔만, **E2E 아님**)
- **prod smoke test** (https://pullim-writing-coachv2.vercel.app): 4 routes 200 · 콘솔 에러 0 · response 0.88s (캐시 후 0.1s 이하)
- Vercel project: `shc-6088s-projects/pullim-writing-coach_v2` (`prj_qJb4I5kK...`, v1과 같은 team)
- 시각 일치 검증: 로컬·prod 모두 "수행평가 안내서를 던져 주세요" h1 정상 + Universal Capture 큰 영역 + 6채널 버튼 + 사진 추천 뱃지 + footer "v2 시각 프로토타입" 명시

4. 부족한 것:
- ⚠ **09:30 계획 4건 미실행** (v2 sprint로 대체):
  · v1 `/try` 전체 동선 user 회귀 — 미실시
  · 테스트 커버리지 확장 — 미실시
  · M2 16:00 정산 1page — **임박, 17:30 전 필수**
  · M3 W2 plan 1page — 미수립
- ※ **pullim-admissions-coach 능동 제안 검토(회의록 §시장 분석 응답) — 별도 세션에서 진행 중** (본 daily는 pullim-writing-coach 트랙. 양 트랙 동시 sprint = 회의록 두 줄기 동시 응답)
- ⚠ pullim-admissions-coach `prompt_v0.1.md` M2 산출물 — 별도 세션 진척 따라 결정 (본 daily 범위 밖). 8/1 D-60
- v2 자체 잔여:
  · 🟡 **v2 E2E 회귀 미실시** — smoke(HTTP 200·콘솔 0)만 했고, user가 실제 동선(안내서 던지기 → mock 파싱 → 모드 선택 → /evaluate에서 글 던지기 → mock 채점 → 결과 화면 렌더) 끝까지 도는 검증은 안 함. 헤드리스에서 UniversalCapture 6채널 버튼·DnD·sessionStorage 흐름까지 따라가는 데 한계
  · 🟡 v1 `/try` E2E 회귀(TokenGate 토큰 입력 → ScoreForm 내부 4요소: DnD·TXT 업로드·클립보드 배너·진척바)도 어제 5/31 17:30 미완으로 이월된 상태 그대로 — 6/2에도 미실시
  · GitHub 자동 배포 미연결 (`vercel git connect` 실패 — curea-co org GitHub App 권한 재승인 필요, v1 5/28과 같은 패턴)
  · Vercel preview hash URL 401 (production alias만 공개)
  · 실제 OCR·HWP/DOCX 파서·LLM 메타 추출은 mock 그대로 (Phase A 시각 프로토타입 범위)
  · env 변수(`DEMO_ACCESS_TOKEN`·`ANTHROPIC_API_KEY`) 미등록 (v2는 mock이라 불필요하나 향후 실 API 호출 시 필요)
- 5 컴포넌트·4 페이지 단위 테스트 0건 (v2는 시각 프로토타입이라 미작성, 출시 단계 진입 시 추가)
- AI 검증 카운트 today — 5/31 catchup 후 정착 시도 중, 미산정

5. 17:30 전까지 보강할 것:
- (최우선) **M2 16:00 정산 + M3 W2 plan 1page** — 09:30 계획 pivot 명시(v1 회귀 → v2 신축), M2 명목 달성 항목·잔여 부채·M3 진입 방향 정리
- **AI 검증 카운트 today 산정** — v2 sprint 산출(13:25~13:35 약 1.5h, ~600 LoC) + pivot 결정에 대한 EPO 잡음/AI 누락 패턴
- **9번 내일 첫 액션** — v2 GitHub 자동 배포 연결(curea-co GitHub App 재승인) + **v2 E2E 회귀**(user가 직접 안내서→모드→글→채점 동선 끝까지 + 캡처 3~5장) + v1 `/try` E2E 회귀 이월분 정리 + pullim-admissions-coach 별도 세션 산출물 합류 시점 결정
- **회의록 §능동성 피드백 응답 평가** — 양 트랙 동시 응답으로 정합: pullim-writing-coach 트랙은 v2 신축(§3-2·3-6 두 문서 모델·Universal Capture), pullim-admissions-coach 트랙은 별도 세션 시장 분석(§1.11:20·01:12:15·01:14:46). **하나의 day에 두 줄기 동시 sprint = 회의록 두 트랙 동시 응답 입증**
- (선택) v2 prod URL과 v1 prod URL 나란히 비교 캡처 — 평가위 후속 시연 자료

```

## 17:30 Daily Outcome

```text
[17:30 Daily Outcome / 최선혜]

▶ 오늘 핵심: 09:30 계획에서 큰 pivot — v1 동선 회귀·테스트·pullim-admissions-coach 능동 제안 → **v2 시각 프로토타입 신축**(별도 repo + Vercel) + **Codex 정정 후속**(PR #56·#57 fix 후 그린 상태). 회의록 *(00:30:02)·(00:51:42)·(01:15:37)* "주도적·차별화·선제적 구현" 피드백 직접 응답.

1. 오늘 닫은 pullim-writing-coach 산출물:
- ★ **v2 시각 프로토타입 신축** — 새 workspace `C:\workspace\pullim-writing-coach_v2` + 새 GitHub repo + Vercel 배포 일괄
  · CEO doc §3-2(두 문서 모델)·§3-3(준비/평가 분리)·§3-6(Universal Capture 6채널)·§3-7(AI 시각)·§3-8(어시스턴트 6선) 5건 적용
  · 신규 5 컴포넌트 + 4 페이지 + v1 lib 100% 재사용(루브릭·anchor·/api/score)
- ★ **PR #58 머지** (b44c432, main) — PDF 멀티페이지 캔버스 슬라이싱(파일 사이즈 N→1배, Codex PR #13)
- ★ **PR #56 Codex 정정 + push 그린** (commit 4293232 + rebase) — `/me` no-profile 분기 `<MetaUsageCard />` 렌더 + `loadValidatedMetaUsage()` 신설(getMostUsedMeta와 동일 필터)
- ★ **PR #57 Codex 정정 + push 그린** (172b856 + ee9c5d5) — `vi.stubGlobal('fetch', …)` + clipboard descriptor 저장/복원 패턴 (mock 누수·테스트 순서 의존성 차단), vitest 9/9 통과

2. 오늘 닫은 pullim-admissions-coach 산출물:
- 본 daily 범위 밖 — 별도 세션에서 회의록 §능동 제안·시장 분석 트랙 동시 진행. **하나의 day에 두 줄기 동시 sprint = 회의록 두 트랙 동시 응답 입증**

3. 실제 링크/파일:
- 새 workspace: C:\workspace\pullim-writing-coach_v2 (Next.js 16 + TS + Tailwind + Turbopack)
- 새 GitHub repo: https://github.com/curea-co/pullim-writing-coach_v2 (public)
  · commit 1e14abd (init), d1fdd1e (v2 본문 일괄 — 5 컴포넌트 + 4 페이지)
- Vercel v2 prod: https://pullim-writing-coachv2.vercel.app (HTTP 200, 33초 빌드, Hobby plan)
- v1 main commits: b44c432(PR #58), bbed928(PR #51 Playwright 회귀), 41f7d35(PR #50 Vitest), 896c603(PR #49 Codex 정합화), ce84436(PR #48 PDF), 8791fb9(PR #47 진척바)
- PR #56·#57 — 정정 push 후 모든 체크 그린(다른 세션이 머지 처리)
- daily_outcome_2026-06-02.md 세 섹션 작성(09:30·15:30·17:30)

4. 샘플:
- 신규 글 샘플 **0건** (v2도 anchor 5종 그대로)
- v2 mock 데이터 패턴 2종 — 안내서 텍스트 → 키워드 기반 메타 추정(장르·분량·조건·루브릭 인식 여부) + 글 길이 기반 anchor 5종 자동 선택(저점·편차·중점·중상·고점)
- 시각 검증 캡처 5장 — v2 로컬 4장(home·prepare·evaluate·about) + v2 prod 1장(home)

5. AI가 만든 것 (트랙 A·B·C·D):
- 트랙 A(v2 신축): 9 신규 파일(UniversalCapture·AssignmentCard·ConfidenceChip·AssistantBubble·ModeSelector·page·prepare·evaluate·about) + globals.css stream-in keyframes + v1 lib 7파일 그대로 재사용
- 트랙 B(Codex 정정): `loadValidatedMetaUsage` 함수 신설(storage.ts) + `MetaUsageCard` import 교체 + `/me` missing 분기 렌더 + `vi.stubGlobal`/`unstubAllGlobals` 패턴 적용 + clipboard descriptor 저장/복원
- 트랙 C(daily): 09:30·15:30·17:30 세 섹션 본문 작성
- 트랙 D(GitHub repo + Vercel deploy 자동화): `gh repo create` + `vercel link` + `vercel --prod` + push + body 갱신

6. 내가 수정/기각/채택한 것:
- 수정: PR #57 `@ts-expect-error` unused 디렉티브 — cast 후엔 valid TS라 TS2578 발생, 직접 제거 후 `delete (window.navigator as { clipboard?: unknown }).clipboard;`만 남김
- 수정: 15:30 Evidence Check 4번에 pullim-admissions-coach 능동 제안을 "이월 누적"으로 적었다가 user 지적 후 "별도 세션 진행 중·이 daily 범위 밖"으로 정정 (양 트랙 동시 sprint 정합)
- 수정: E2E vs smoke 정의 — 15:30에 "v2 E2E 회귀 pass"로 잘못 표현했다가 user 지적 후 "smoke test(HTTP 200 + 콘솔 0)와 E2E(user 동선 끝까지)는 다름" 명시
- 채택: 다른 세션이 PR #56·#57 최종 머지 처리 — 본 세션은 fix·push·그린까지만, user 지시로 중지

7. 검증 결과 / AI 검증 카운트:
- v2 prod·로컬: 4 routes 200 + 콘솔 에러 0 + tsc 0 (smoke만, E2E 아님)
- PR #56·#57: 5/5 체크 그린 (Component·E2E·Review(Codex)·Typecheck·Vercel)
- vitest 로컬: PR #57 9/9 pass
- **AI 검증 카운트**: AI(Codex 봇)가 잡은 곳 **4건** (#56 no-profile 미렌더·#56 validation 누락·#57 fetch 직접 대입·#57 clipboard descriptor 누수), 본인이 잡은 곳 **1건** (PR #57 fix 1차에 unused @ts-expect-error)

8. 미완료/미검증:
- 🟡 **v2 E2E 회귀 미실시** — smoke만, user가 실제 동선(안내서 던지기 → mock 파싱 → 모드 선택 → /evaluate 글 던지기 → mock 채점) 끝까지 도는 검증 안 함. 헤드리스에서 UniversalCapture 6채널·DnD·sessionStorage 흐름 한계
- 🟡 v1 `/try` E2E 회귀 (5/31 → 6/2 이월 그대로) — TokenGate 토큰 입력 → ScoreForm 내부 4요소(DnD·TXT·클립보드·진척바) user 직접 동선 미실시
- 🟡 **M2 16:00 정산 1page** — 미작성. 어제 12 PR 머지로 M2 명목 산출 + M3 첫 절반 닫혔으나 closure 문서 별도 미수립
- 🟡 **M3 W2 plan 1page** — 미수립
- v2 GitHub 자동 배포 미연결 (`vercel git connect` 실패 — curea-co org GitHub App 권한 재승인 필요, v1 5/28과 같은 패턴)
- Vercel Hobby → 조직·Pro 이관 (memory `vercel-hobby-to-org-migration` 8단계) — M3 후반·pullim-admissions-coach 8/1 D-60 전 필수, 시작 안 함
- env 변수 미등록(v2 `DEMO_ACCESS_TOKEN`·`ANTHROPIC_API_KEY`) — v2는 mock이라 불필요하나 향후 실 API 호출 시 필요
- v2 컴포넌트 5건·페이지 4건 단위 테스트 0건 (시각 프로토타입 단계라 미작성)

9. 내일 첫 액션 (6/3 화):
- **v2 E2E user 직접 회귀** — TokenGate 없는 v2이므로 곧장 동선 1회 + 캡처 3~5장 (안내서 → mock 파싱 → 모드 선택 → /evaluate)
- **v1 `/try` E2E 회귀** (5/31부터 이월) — TokenGate 토큰 직접 입력 후 ScoreForm 4요소 동선 1회 + 캡처
- **M2 16:00 정산 1page + M3 W2 plan 1page** — 오늘 미작성분 닫기 (~30m × 2)
- **pullim-admissions-coach 별도 세션 산출물 합류 시점 결정** — 두 트랙 동시 sprint의 day-end 정합점
- (선택) v2 GitHub 자동 배포 연결 — curea-co GitHub App 재승인 1차 시도

10. 재사용 가능한 프롬프트 / 체크리스트 / 하네스:
- ★ **Vitest mock 원복 패턴 체크리스트** (PR #57에서 추출) — 다른 컴포넌트 테스트에 그대로 적용:
  · 글로벌은 `vi.stubGlobal('name', vi.fn(...))` (직접 `globalThis.x = ...` 금지)
  · `afterEach` 에 `vi.unstubAllGlobals()` 추가
  · `Object.defineProperty(window.navigator, ...)` 사용 시 → `beforeEach`에서 `getOwnPropertyDescriptor` 저장, `afterEach`에서 원본 복원(없으면 `delete`)
  · 적용 효과: 테스트 순서 의존성 차단·이 파일 뒤 실행 테스트가 mock 물려받는 사고 방지
- (보조) **CEO redesign doc → v2 신축 인테이크 체크리스트**: §3-2(두 문서)·§3-3(모드 분리)·§3-6(Universal Capture)·§3-7(AI 시각)·§3-8(어시스턴트 6선) 5건 1:1 매핑 후 코드 → 다음 doc 인테이크에도 동일 패턴 적용 가능

11. 오늘 추정 vs 실제 (시간):
- v2 신축 (workspace + repo + Vercel + 코드 ~600 LoC): 추정 2h vs 실제 **1.5h** (-25%, 어제 5배 sprint 패턴 학습 가속)
- PR #56·#57 Codex 정정 + 그린 대기 + body 갱신: 추정 30m vs 실제 **~1h+** (+100%, rebase 후 CI 재실행·Review 잡 폴링 포함)
- daily 09:30·15:30·17:30 세 섹션: 추정 30m vs 실제 ~40m (+33%, 15:30 정정 2회 반영)
- **총 추정 3h vs 실제 ~3.3h** (+10%, 캘리브레이션은 거의 정확)

```
