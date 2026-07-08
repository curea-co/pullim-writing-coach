# 2026-06-15 일일 보고 / 최선혜 — 수습 종료 D-8 · M3 W3 day 1 · 새 UX flow sprint day 8 · 출시 7/1 D-16


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
★ 출시일: 2026-07-01 (D-16) — 6/12에 6/15→7/1 16일 연기 결정
   - 6/13 backup 시나리오 옵션 C(연기) 사실상 채택, 잔여 의사결정은 옵션 A(완전) vs B(Free-only) D-7(6/24) 평가

▣ 수원 새빛인강 (1순위, 별도 세션 진행 중):
https://github.com/curea-co/suwon-monorepo
※ 6/12 챌린지 4개 dev 머지 closure (PR #281·사자성어·세계 국기·암산왕) + 부가 기능(닉네임 모달·리더보드·대표님 URL 공유)
※ 본 day 작업: **dev에 수동 마이그레이션 + 추가 챌린지 아이디에이션**

pullim-writing-coach 리포 / 데모 (v1, 2순위 — suwon PR 리뷰 대기 중 진입):
https://github.com/curea-co/pullim-writing-coach · https://pullim-writing-coach-demo.vercel.app/

pullim-writing-coach_v2 리포 / 데모 (새 패러다임, 이식 코드 출처):
https://github.com/curea-co/pullim-writing-coach_v2 · https://pullim-writing-coachv2.vercel.app/

pullim-admissions-coach 리포 / 데모:
https://github.com/curea-co/pullim-admissions-coach · https://pullim-admissions-coach.vercel.app/
```


## 09:30 Work Contract

```text
2026-06-15 (월) — ▣ M3 W3 day 1 · suwon dev 수동 마이그레이션 + 챌린지 아이디에이션 day · 수습 종료 D-8 · 출시 7/1 D-16
[09:30 Work Contract / 최선혜]

▶ 외부 의존 P0 진척 (룰 A 정착 8 day째, docs/29 §4 source):
  P0-#1 Pro 이관: 보류(7/1 D-16까지 진척 가능) | P0-#2 도메인 alias: 미진척 | P0-#3 부모 인증: 출시 후 별도 | P0-#4 부모 billing: 출시 후 별도 | P0-#6 dogfood 모집: 출시 후 수집
  ※ 변동 없음 8 day 누적 — **6/13 backup sweep 결과 미확인** (09:30~10:00 동기화 필요). 7/1 출시 형태 옵션 A/B D-7(6/24) 평가까지 9 day 남음

▶ 어제·그저께(6/13 토·6/14 일) 마감 (다른 세션 산출 + 회복 추정):
  - 6/13 (토): backup 시나리오 sweep + writing-coach Phase 진척 (다른 세션 산출 추정)
  - 6/14 (일): 회복 사이클 (휴일 추정)
  - main 변동: `app/api/extract/route.ts`·`.env.example` 6/9 갱신 그대로 유지
  ※ 본 세션 정확한 상태 미확인 → 09:30~10:00 동기화 1순위

▶ ★ suwon-monorepo 1순위 (6/15 본 day 작업):
  - **dev 수동 마이그레이션** — 6/12 dev 머지된 챌린지 4개 + 부가 기능을 prod·staging 환경으로 수동 이관 (자동 deploy 없으면 build + env + asset 복사 + 라우팅 검수)
  - **추가 챌린지 아이디에이션** — 챌린지 4개 closure 후 5번째·6번째 후보 brainstorm + 우선순위 + 작업 분량 추정 + 다음 sprint plan 1page
  - 양 트랙 동시 sprint 정합 — 6/12 챌린지 4개 closure → 6/15 수동 마이그 + 차기 ideation

▶ 미해결 인계 (오늘 또는 이후):
  - 🔴 **6/13·14 산출 동기화** — backup sweep 결과 + Phase 진척 closure 상태
  - 🔴 **suwon dev 수동 마이그레이션 + 챌린지 아이디에이션** (1순위 day 메인)
  - 🔴 **writing-coach Phase 진척 closure 확인** — Phase 3 wizard·Phase 4 채점 결과 진척 상태 점검
  - 🟡 **Vercel Pro 이관 ①현황 점검 1page** — 6/12 확보 시간 옵션, 본 day 또는 W3에 진행 (7/1 D-16까지 ①~③ 자력 정리 + 결제 결정 입력 충분)
  - 🟡 **외부 의존 P0 7-day 누적 평가 + D-7(6/24) 출시 형태 사전 준비**
  - 🟡 **dogfood 모집 채널 결정 사전 plan** — D-10(6/21) 시점 시작 가능, 본 day 또는 W3에 채널 결정 (학원·SNS·지인)
  - ⚠ docs/22 인프라 체크리스트 갱신 — `@sentry/nextjs` ESM 해석 한계 + helper 분리 패턴
  - ⚠ docs/25_secret_leak_response_checklist.md 신설 (선택)
  - ⚠ pullim-admissions-coach `prompt_v0.1.md` M2 산출물 — 5/30 이월 20일째, 8/1 D-47
  - 수습 종료 6/23 D-8 — 본 daily 능동성·자기 증명 가시화

▶ 오늘 위치: **M3 W3 day 1 · suwon 수동 마이그 + 챌린지 ideation day**. 6/12 출시 연기로 시간 압박 해소된 상태에서 W3 진입 → **자력 작업(Pro 이관 자료·dogfood plan·docs 정착) 진척 가능 시간 확보**. writing-coach Phase 진척 동기화 + suwon 마이그·ideation + 자력 작업 3축 분배.

0. 오늘 작업 순서 (1순위 suwon → 2순위 writing-coach + 자력 작업 분배)
- (09:30~10:00) **양 트랙 1순위 동기화** — 6/13·14 산출 결과 + writing-coach Phase 진척 closure 상태 + suwon 6/12 closure 후 정합
- (10:00~12:00) **★ suwon dev 수동 마이그레이션** (별도 세션 진행 동기화) — 챌린지 4개 + 부가 기능 prod·staging 환경 이관
- (10:00~12:00 병행) writing-coach 트랙: **Phase 3·4 closure 확정 + 잔여 진척 marshalling** (closure 미완 시 본 day 마무리, closure 완료 시 자력 작업 진입)
- (점심 후 13:30~15:00) **suwon 추가 챌린지 아이디에이션** (별도 세션 동기화) — 5번째·6번째 후보 brainstorm + 우선순위 + 작업 분량 추정 + 다음 sprint plan 1page
- (13:30~15:00 병행) writing-coach 트랙: **Vercel Pro 이관 ①현황 점검 1page** (자력 자료 시작, 6/12 확보 시간 활용)
- (15:00~16:30) **외부 의존 P0 7-day 누적 평가** — 룰 A entry 누적 + D-7(6/24) 출시 형태 옵션 A/B 사전 평가 노트 (docs/29 §4 갱신 또는 별 § 박기)
- (16:30~17:00) **dogfood 모집 채널 결정 사전 plan** — 학원·SNS·지인 채널 비교 + D-10(6/21) 시작 준비 + 모집 메시지 템플릿 시드
- (17:00~17:30) docs 정착 진입 (선택) — docs/22 ESM 한계 + helper 분리 패턴 또는 docs/25 보안 인시던트 체크리스트
- (저녁) 17:30 Daily Outcome + over.md (Overnight 위임: Pro 이관 ②플랜 비교 또는 dogfood 모집 메시지 본문)

1. 오늘 진행할 pullim-writing-coach 산출물:
- ★ **Phase 진척 closure 확인** — Phase 3·4 머지 상태 확정 + Phase closure 의의 정합
- ★ **Vercel Pro 이관 ①현황 점검 1page** (`docs/26_vercel_migration_phase1.md` 또는 적당 번호) — 자력 ①~③ 첫 단계
- ★ **외부 의존 P0 7-day 누적 평가 노트** — D-7(6/24) 출시 형태 A/B 사전 평가 입력
- ★ **dogfood 모집 채널 결정 사전 plan** — D-10(6/21) 시작 준비
- (선택) docs/22 갱신 / docs/25 신설
- daily 09:30·17:30 + over.md

2. 오늘 병렬로 진행할 pullim-admissions-coach 산출물:
- 본 daily 범위 밖 — 별도 세션 진행. M3 W3 진입 + Pro 이관·dogfood plan 시간 확보로 합류 시점 W3 중·후반에 사전 검토 가능
- (이월 20일째) `prompt_v0.1.md` M2 산출물 — 8/1 D-47, M3 closure 후 1순위 합류 검토

2-1. 1순위 suwon-monorepo 진행 (참고 — 별도 세션 트랙, day 메인 목표):
- **dev 수동 마이그레이션** — 챌린지 4개(PR #281·사자성어·세계 국기·암산왕) + 부가 기능(닉네임·리더보드) prod·staging 이관
- **추가 챌린지 아이디에이션** — 5번째·6번째 후보 brainstorm + 우선순위 + 작업 분량 추정 + 다음 sprint plan 1page
- 양 트랙 동시 sprint = 회의록 §능동성 피드백(주도적·차별화) 정합. 본 day는 1순위 sprint 첫 마일스톤 후속(마이그 + ideation)

3. 오늘 만들 샘플 수:
- 신규 글 샘플 0건 (anchor 5종 유지)
- Vercel Pro 이관 ①현황 점검 표 1건 (Vercel project·env·domain·deployment·Hobby 제약 사용량 sweep)
- 외부 의존 P0 7-day 누적 평가 노트 1건
- dogfood 모집 채널 비교 + 메시지 템플릿 시드 1건 (학원·SNS·지인)

4. AI에게 맡길 일:
- 트랙 A(양 트랙 1순위 동기화 + suwon 진척 인테이크): 6/13·14 산출 + Phase closure 상태 + suwon 6/15 마이그·ideation 본 daily 17:30 인테이크
- 트랙 B(Vercel Pro 이관 ①): Vercel CLI로 현재 project 상태 sweep + 1page 정리
- 트랙 C(외부 의존 P0 누적 평가): 룰 A entry 7-day 누적 분석 + D-7(6/24) 출시 형태 사전 평가 노트
- 트랙 D(dogfood 모집 채널 plan): 학원·SNS·지인 비교 + 메시지 템플릿 시드
- 트랙 E(daily): 09:30·17:30 + over.md
- 트랙 F(선택, docs): docs/22 ESM 한계 + helper 분리 패턴 또는 docs/25 보안 인시던트
- ❌ 트랙 G(슬랙 봇 통합) — 6/10 drop 그대로

5. 내가 직접 검수/판단할 일:
- **Phase 진척 closure 시점 결정** — Phase 3·4 미완 시 본 day 마무리, closure 완료 시 자력 작업 시간 분배
- **suwon 5번째·6번째 챌린지 후보 우선순위** — 별도 세션 ideation 결과를 본 daily에 인테이크 후 W4 sprint plan에 반영 여부
- **Vercel Pro 이관 ①현황 점검 결과의 결제 결정 입력** — Hobby 제약 임박도(함수 실행 시간·빌드 시간·대역폭 3축) 정량 데이터 정리
- **D-7(6/24) 출시 형태 옵션 A/B 사전 평가** — 외부 의존 P0 5건 진척 따라 본 day 잠재 평가 노트
- **dogfood 모집 채널 우선순위** — 학원(공식 채널, 학생 5+ 확보 안정성 높음) vs SNS(트래픽 변동) vs 지인(소량·빠름) 중 어느 채널로 D-10 시작
- (선택) docs/25 정착 가치 평가

6. 예상 blocker:
- **6/13·14 산출 상태 미확인** — 09:30~10:00 동기화 결과에 따라 본 day 작업 순서 분기 (Phase closure 미완 시 자력 작업 시간 압축)
- **suwon 별도 세션 진행 결과 동기화 지연** — 본 daily 17:30 인테이크 시점에 마이그·ideation 결과 합류 미정
- **Vercel Pro 이관 ①현황 점검 정량 데이터 수집 시간** — Vercel CLI·dashboard 접근 + 데이터 정리. 추정 1h vs 실제 1.5h 가능
- **dogfood 모집 채널 결정 부담** — 학원 채널 의존도 높지만 외부 의존(학원·교사 응답 시간), SNS·지인은 본인 책임 범위. 결정 신중
- **새 docs PR Codex 라운드 비용** — 6/8 #68에서 9라운드 학습 + 6/9 #69 helper 분리 정정 → docs/22·docs/25 신설 시 사전 체크리스트 적용해 라운드 1~2 단축 시도

7. 당김 후보 (Standing Rule 5) — 출시 7/1 D-16 시간 여유 활용:
- **링크 본문 추출(D 채널) PR** — 출시 후 W3 이관 → 본 day~W3 안에 진입 가능 (Hobby 가능, 1-2 day)
- **Vercel Pro 이관 ②플랜 비교 + ③체크리스트** — ①현황 점검 후 곧장 진입 가능
- **dogfood 모집 메시지 본문 작성** — 학원·SNS·지인용 3종
- pullim-admissions-coach Member DB doc v0.1 EPO 검수 (8개 결정 잠금 후속) — M3 W3에 합류 검토 가능
- v1 컴포넌트 단위 테스트 +N건 (5/31 이월) — M3 W3에 진입 가능
- /api/score 라우트 fetch 다이버전스 정정 (memory `score-route-fetch-divergence` — main에 T2.3 callModel 공유 헬퍼 분리 부분 정합 진행)
```
