# 2026-05-28 일일 보고 / 최선혜


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

Admissions Coach 리포:
https://github.com/curea-co/pullim-admissions-coach
```


## 09:30 Work Contract

```text
2026-05-28
[09:30 Work Contract / 최선혜]

▶ 어제(05-27) 마감: PR #5(번들 누수 #4)·#6(CI) 머지 / M1 인수기준 #1 — Vercel prod
  `/try` 엔드투엔드 200 입증(pwc_e2e_200.png) / 데모 디자인 개선(layers IA) 구현·로컬 검증.
▶ 미해결 인계: 디자인 **PR #7**(feat/ux-layers-nav @8d1eb17) 그린·머지 대기 +
  로컬 **fe/result-experience-6-1**에 해시 라우팅 커밋 f177969(미푸시·PR 없음) — 브랜치 2갈래.
▶ 오늘 = ▣ M1 (BE 골격 시연) 당일. ★ EPO 결정: M1 시연은 디자인 머지 후 새 prod로.

0. 오늘 작업 순서
- (최우선) 디자인 브랜치 단일화 — PR #7에 f177969(해시 라우팅) 포함 여부 결정 → 단일 PR 그린 → 머지
- main 머지 → Vercel 새 prod 자동배포 → 배포 검증(홈·/samples·/try 200·라이브 채점·SectionNav)
- 새 prod `/try` 라이브 채점 스모크 1건(스크린샷) → M1 시연 자료 확정
- ▣ M1 게이트키퍼 미팅 — BE 골격 + 새 prod 데모 시연
- AC 병렬: 정의 v0.3·스키마 v0.1 검수 → prompt_v0.1.md → 미성년자 동의·보관/삭제 정책 v1

1. 오늘 진행할 Writing Coach 산출물:
- 디자인 PR 단일화·머지 → main → **Vercel 새 prod 배포**(M1 시연 prod)
- 새 prod 배포 검증 (홈·/samples·/try 200 · 라이브 채점 · SectionNav scroll-spy)
- M1 시연 시나리오 (P2.5 — 백엔드 붙은 1경로 = 새 prod `/try`)

2. 오늘 병렬로 진행할 Admissions Coach 산출물:
- 정의 v0.3·`student_profile_schema_v0.1.json` EPO 검수 (5/27 이월)
- `prompt_v0.1.md` (M2) — 정의 v0.3 §6 가드레일을 **시스템 프롬프트 제약으로 구현**
- 미성년자 동의 플로우 + 보관·삭제 정책 v1 — 🔴 출시 blocker

3. 오늘 만들 샘플 수:
- WC: 신규 글 샘플 0건(데모 5종 고정). 새 prod 라이브 채점 스모크 1건(시연 캡처)
- AC: 스키마 v0.1 기준 입력 예시 1~2건 검토(few-shot anchor는 M2 prompt 범위)

4. AI에게 맡길 일:
- 트랙 A(WC): 디자인 PR 단일화·CI 통과 후속 · 배포 후 prod 스모크 · M1 시연 시나리오 초안
- 트랙 B(AC): prompt_v0.1.md 초안(§6 가드레일 이식) · 미성년자 동의 플로우·보관/삭제 정책 v1 초안

5. 내가 직접 검수/판단할 일:
- 디자인 브랜치 정리 방침(PR #7 그대로 vs f177969 포함) + 머지 승인
- 새 prod 배포 후 시연 품질 스팟체크 + M1 시연 시나리오 승인
- AC 정의 v0.3·스키마 검수 (윤리·규제 가드레일 정합)
- AC 미성년자 동의·보관/삭제 정책 v1 — 출시 blocker, 법규 판단 직접
- 05-26+05-27 AI 검증 카운트 산정 (이월)

6. 예상 blocker:
- **브랜치 2갈래** — 머지 전 단일화 안 하면 해시 라우팅 누락 또는 충돌
- **Vercel 배포 지연/실패** 시 M1 시연이 기존 prod로 폴백(결정 번복 리스크) → 시연 전 새 prod 배포 완료 확인 필수
- 리뷰봇 재실행 대기 — 브랜치 갱신 시 ~3분
- AC 동의·보관/삭제 정책 법규 판단 난도(미성년자·개인정보)
- M1 당일 — 배포·시연·AC가 하루에 몰림

7. 당김 후보:
- 임의 글 novel 일반화 스팟체크 (P2.4) — 배포·시연 일찍 끝나면
- 06 v.4 / rubric §5.1 ↔ `samples.ts` B 문구 동기화 (이월)
- P3 결과 화면 추가 폴리시 (배포 안정 후)
```


## 15:30 Evidence Check

```text
[15:30 Evidence Check / 최선혜]

1. 현재까지 나온 링크/파일:

2. 현재까지 나온 샘플:

3. 화면 또는 문서 증거:

4. 부족한 것:

5. 17:30 전까지 보강할 것:

```

## 17:30 Daily Outcome

```text
[17:30 Daily Outcome / 최선혜]

1. 오늘 닫은 Writing Coach 산출물:
- ▣ **M1 게이트키퍼 시연 완료** — 새 prod(pullim-writing-coach-demo.vercel.app) 위에서.
- **디자인 PR 단일화·머지**: feat/ux-layers-nav를 d5af7f0(P1 인라인 첨삭 포함)까지 ff-push →
  CI/Codex 그린 → **PR #7 squash-merge → main `4cf6383`** (12파일 +546). 브랜치 2갈래 해소.
- **Vercel 새 prod 배포**: `pullim-writing-coach-b0otid795` Ready/Production (수동 vercel --prod).
  e=3·d=1·c=1 마크 확인, /api/score 토큰게이트 401 정상, reduced-motion CSS 포함.
- **Vercel ↔ curea-co repo 자동연결 정상화** (근본 원인 해소):
  기존 연결이 `250812-maker/pullim-writing-coach`(현재 존재하지 않는 fork)로 잡혀 자동배포가 영구 죽음.
  curea-co org owner의 GitHub App 설치 승인 받음 → `vercel git connect` 성공 →
  테스트 push에서 ~17초만 preview 자동 트리거 동작 검증. 이제 PR=preview, 머지=prod 자동.
- **6/1 평가 스코프 잠금 (B' tiered staging)** — CEO 리뷰 SCOPE EXPANSION 정식 결정:
  6/1=10건(A1·A2·#1·#2·#4·#9·#10·#16·스크린샷·#19) / M3=4건 / M3+=2건 / 재정의=1건.
- **#1 수정 전/후 비교 design doc** (office-hours): 성장 카드 + v1↔v2 토글 본문 + growBar v1→v2.
- **A1 온보딩 + A2 프로필 + /me·/try·홈 통합 → PR #10 머지** (main `1728b0d`, 17:36 KST squash):
  · /onboarding 3-step (Step1 환영+썸네일 / Step2 폼+동의 / Step3 CTA 2개)
  · ProgressDots(시각+텍스트 a11y) · `<` 뒤로가기 · Step3→Step2 prefill
  · /me (수정 + 데이터 삭제 2-step confirm + 저장 토스트)
  · /try (프로필 있음=환영 스트립 + 학년·과목·장르 자동 프리필 / 없음=인라인 권유 폼)
  · 홈 환영 배너 (신규=온보딩 CTA / 재방문=인사+채점받기+내 정보)
  · ScoreForm·TokenGate `defaults` prop 추가
  · 신규: storage.ts(localStorage 어댑터)·profile-validate.ts(순수 검증) +
    ProgressDots/ConsentNotice/ProfileForm/TryClient/HomeWelcomeBanner

2. 오늘 닫은 Admissions Coach 산출물:
- 별도 세션.

3. 실제 링크/파일:
- main: `4cf6383` (PR #7 squash) → `0bd376f` (#8) → `643ed87` (#9) → **`1728b0d` (PR #10 squash, A1·A2 통합)**
- prod: `pullim-writing-coach-b0otid795` → https://pullim-writing-coach-demo.vercel.app (·pullim-demo.vercel.app)
- **PR #10 MERGED**: https://github.com/curea-co/pullim-writing-coach/pull/10 (squash → main `1728b0d` @ 2026-05-28 17:36 KST)
- 신규 라우트: /onboarding · /me · (수정) /try · /
- 신규 파일 11개(앱 9 + 테스트 2) · 수정 4 · 단위 테스트 +34건 (48 → 82 전부 통과)
- CEO plan: ~/.gstack/projects/curea-co-pullim-writing-coach/ceo-plans/2026-05-28-scope-expansion-6-1.md
- Design doc (#1): ~/.gstack/projects/curea-co-pullim-writing-coach/kokho-main-design-20260528-152942.md
- 메모리 갱신: deploy-on-merge(근본 원인 + 해결 절차)·ceo-domain-architecture-pending(보유·미반영)

4. 샘플:
- 신규 글 샘플 0건(데모 5종 고정)
- 새 prod 라이브 채점 스모크 1건(M1 시연 캡처) — 사용자 보고
- 임의 글 novel 일반화 스팟체크: 미실행(이월)

5. AI가 만든 것:
- 디자인 PR 단일화 절차 + squash-merge(메시지 정리 흡수) + prod 배포·검증 자동화
- Vercel git connect 재정렬 + 동작 검증 (test push)
- CEO 리뷰(B' staging)·design 리뷰(4 결정 잠금)·office-hours(#1 design doc)
- A1/A2 코드 일체 + 단위 테스트 34건 + PR #10 본문
- localStorage 어댑터 패턴(storage.ts·isProfile·consentNow·LRU 정책 자리)
- profile-validate.ts 순수 검증 모듈 (컴포넌트↔검증 분리, 단위 테스트 가능)

6. 내가 수정/기각/채택한 것:
- 채택: B' tiered staging(토·일 풀 가동, 6/1=10건). 일요일 저녁 4h 휴식 PM 권고는 별도 자기관리
- 채택: 데모 시연 = e/d/c, samples만 P1 적용, git 정리 = squash-merge로 흡수
- 채택: Vercel 연결 교체 = 인프라 변경 승인, 도메인 통합 제안 = 보유·미반영
- 직접 결정: localStorage quota=LRU·동의=PM초안+EPO승인 대기·/try=인라인 폼(강제 X)
- 직접 결정: Step3 CTA=샘플 e Primary·데모 이미지=정지 PNG·학년 UI=2×3 grid
- 톤 수정 4건(Step1): break-keep+text-justify·#77D1B6 바·#24D39E CTA·footer "(1분)" 제거
- 톤 수정 3건(Step2): 뒤로가기 `<` 추가·"기타" 자유 입력·닉네임 필수
- 텍스트 수정 1건(홈): "○○님으로 인사" → "보기 좋아요"
- 기각: 보라 그라데이션·3-col 카드 hero·"Welcome to..." 카피 등 AI slop 패턴(설계 단계에서 차단)

7. 검증 결과:
- ▣ **M1 인수기준 #1·#2·#3 충족 시연 완료** (BE 골격 동작 + 새 prod + e2e 200)
- main 머지 후 prod 배포: Ready·5종 prerender·P1 mark 정상·캐시 헤더 정상
- **Vercel 자동연결 동작 검증**: 테스트 push → ~17초만 preview 빌드 Ready (커밋 ad21ff8, 정리 완료)
- PR #10 로컬: typecheck 0 · test:unit **82/82** · next build OK(/onboarding·/me static prerender)
- **AI 검증 카운트 (오늘)**:
  · 본인이 잡은 곳 9건 — 톤(break-keep·#24D39E·#77D1B6·"(1분)") 4 + UX(뒤로가기·기타 입력·닉네임 필수·홈 텍스트) 4 + 스코프 재조준("시각 우선 = 결과 경험") 1
  · AI가 부족했던 곳 4건 — ① 첫 UX 개편이 내비 chrome에 집중(결과 경험으로 재조준 필요)
    ② 도메인 250812-maker vs curea-co 차이 자력 발견 못함(사용자 질문 받고 인지)
    ③ 색 토큰 고정 제약과 신규 브랜드 색 충돌 인지 못함(사용자가 hex 직접 지정)
    ④ vercel git connect 시도 시 변이 확인 없이 실행해 prompt 발생
- 05-26+05-27 AI 검증 카운트: 또 이월 (5/29 첫 작업으로 묶음)

8. 미완료/미검증:
- ✅ **PR #10 머지 완료** — 충돌 해소 push(`a603443`, app/page.tsx: HomeWelcomeBanner 위·CtaBand 아래) 후 모든 체크 그린(Typecheck/Unit·Codex·Vercel preview·CLEAN) → squash-merge → main `1728b0d`. **새 prod 자동배포 검증은 5/29 첫 액션**(이제 Vercel git connect 정상으로 자동 트리거).
- Preview URL SSO 검증: VERCEL_BYPASS .env.local에서 제거 상태 → 사용자가 로그인 브라우저로 직접 확인 단계
- AC 3종(정의 v0.3·prompt_v0.1·동의·보관/삭제 정책): 미착수, 출시 blocker 잔존
- 6/1 묶음 잔여: #1 수정 전/후 구현(design doc만), #16 PDF + 스크린샷, #19 신뢰 라벨, #4 왜 이 점수 토글
- 동의 텍스트(PM 초안): EPO 최종 승인 대기
- 임의 글 novel 일반화 스팟체크 (P2.4): 미실행
- design-review 시안 생성(mockup): 의도적 스킵(토큰 고정·기존 컴포넌트 강함, ROI 낮음 판정)

9. 내일 첫 액션 (5/29 금):
- (최우선) PR #10 머지(완료, main `1728b0d`)로 트리거된 **새 prod 자동배포 검증**
  (Vercel git connect 정상화로 자동 트리거 — `vercel --prod` 수동 불필요)
- 새 prod e2e 동선 검증: / 배너 → /onboarding 3-step → /me 수정·삭제 → /try 프리필
- 6/1 묶음 잔여 진행 — 우선순위 추천: #1 수정 전/후 비교(센터피스, design doc 잠금) → #16 PDF/스크린샷
- AC 정의 v0.3·스키마 v0.1 검수 → prompt_v0.1.md 착수(또 이월하면 출시 blocker 누적)

10. 재사용 가능한 프롬프트 / 체크리스트 / 하네스:
- **`app/lib/storage.ts`** — localStorage 단일 어댑터 패턴(타입 가드·SSR 가드·정량 reason).
  향후 모든 클라 영속화(이력 #11, 드래프트 #9 등)에서 재사용.
- **`app/lib/profile-validate.ts` + `scripts/profile-validate.test.mjs`** — 검증 로직을 순수 모듈로
  분리해 React 없이 단위 테스트하는 패턴. ProfileForm 외에도 모든 폼 검증에 적용 가능.
- **`scripts/storage.test.mjs`** — 브라우저 의존 모듈(localStorage)을 node:test에서 mock 주입으로
  검증하는 하네스. 향후 sessionStorage·IndexedDB 등에도 동일 패턴.
- **break-keep + text-justify** 한국어 어절 단위 줄바꿈 + 양쪽 정렬 — 모든 새 본문 텍스트의 표준.
- **vercel git connect 절차 메모**(deploy-on-merge.md 갱신) — org member라 owner 승인 필요.
  앞으로 새 repo에서 동일 막힘 시 재참조.
- (office-hours 산출) **#1 수정 전/후 비교 패턴** — 성장 카드(델타) + v1↔v2 토글 + growBar v1→v2.
  내일 #1 구현 시 design doc 따라 그대로.

11. 오늘 추정 vs 실제 (시간):
- 추정(09:30 plan): 디자인 PR 단일화/머지/배포 + M1 시연 + AC 병렬 = 8h
- 실제: M1 일체(2h) + Vercel git connect 정상화(1h, 예상 외) + PM 아이디에이션·CEO 리뷰·디자인 리뷰·
  office-hours·A1/A2 구현 배치 1·2·3 + 단위 테스트 + PR(7h) ≈ **10h 실제 작업**
- AC 트랙: 0h(이월) — 6/1 평가 임팩트 우선 결정. AC 누수 5/29로 강제 이월.
- 캘리브레이션: M1 day는 시연·인프라·plan 정리 만으로도 풀 데이. 추가 구현은 본래 무리.
  토·일 추가 가동(B')은 이 패턴을 4일 늘려 6/1 fit. 단 컨디션 비용은 별도(일요일 4h 휴식 필수).

```
