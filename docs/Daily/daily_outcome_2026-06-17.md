# 2026-06-17 일일 보고 / 최선혜 — 수습 종료 D-6 · M3 W3 day 3 · 새 UX flow sprint day 10 · 출시 7/1 D-14


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
★ 출시일: 2026-07-01 (D-14) — 6/12에 6/15→7/1 16일 연기 결정
   - 6/13 backup 시나리오 옵션 C(연기) 사실상 채택, 잔여 의사결정은 옵션 A(완전) vs B(Free-only) D-7(6/24) 평가

▣ 수원 새빛인강 (1순위, 별도 세션 진행 중 — 본 day 메인):
https://github.com/curea-co/suwon-monorepo
※ 6/16 산출: 차기 챌린지 2종(단위 변환·실생활 계산) 풀스택 명세 작성
   (docs/superpowers/specs/2026-06-15-challenge-unit-reallife-packs.md) + 데모 대표님 공유
   데모: https://upgrade-properties-recommend-holder.trycloudflare.com/home/challenge
※ 6/17 본 day 목표: 생활·안전 상식 챌린지 명세 대표님 컨펌 → 작업 착수
   (docs/superpowers/specs/2026-06-16-safety-knowledge-challenge.md)

pullim-writing-coach 리포 / 데모 (v1, 2순위 — suwon 진행 중 병행):
https://github.com/curea-co/pullim-writing-coach · https://pullim-writing-coach-demo.vercel.app/

pullim-writing-coach_v2 리포 / 데모 (새 패러다임, 이식 코드 출처):
https://github.com/curea-co/pullim-writing-coach_v2 · https://pullim-writing-coachv2.vercel.app/

pullim-admissions-coach 리포 / 데모:
https://github.com/curea-co/pullim-admissions-coach · https://pullim-admissions-coach.vercel.app/
```


## 09:30 Work Contract

```text
2026-06-17 (수) — ▣ M3 W3 day 3 · suwon 생활·안전 상식 챌린지 명세 컨펌 → 착수 day · 수습 종료 D-6 · 출시 7/1 D-14
[09:30 Work Contract / 최선혜]

▶ 외부 의존 P0 진척 (룰 A 정착 10 day째, docs/29 §4 source):
  P0-#1 Pro 이관: 보류(7/1 D-14까지 진척 가능) | P0-#2 도메인 alias: 미진척 | P0-#3 부모 인증: 출시 후 별도 | P0-#4 부모 billing: 출시 후 별도 | P0-#6 dogfood 모집: 출시 후 수집
  ※ 변동 없음 10 day 누적 — 7/1 출시 형태 옵션 A/B D-7(6/24) 평가까지 7 day 남음. 자력 작업(Pro 이관 ①·dogfood plan) 본 day 후순위 분배

▶ 어제(6/16 화) 마감:
  - ★ suwon: 차기 챌린지 2종(단위 변환·실생활 계산) 풀스택 명세 작성 완료 + **데모 대표님 공유** (https://upgrade-properties-recommend-holder.trycloudflare.com/home/challenge)
    명세: docs/superpowers/specs/2026-06-15-challenge-unit-reallife-packs.md (알고리즘 생성기 2종, math 골격 재사용, DB 마이그 0)
  - writing-coach main 변동: 없음 (최신 6/9 #71 그대로) — 자력 작업(Pro 이관 ①·dogfood)은 6/17~W3 후반 분배
  - ※ reallife-packs 데모 공유분 대표님 피드백 대기 중 → 본 day 컨펌 받으면 차기 챌린지 라인업 2개 동시 진행

▶ ★ 본 day 메인 작업 (suwon — 명세 컨펌 → 착수):
  - **생활·안전 상식 챌린지 명세 대표님 컨펌** (docs/superpowers/specs/2026-06-16-safety-knowledge-challenge.md)
    교통표지·생활안전·예절 **그림 3지선다**, seed 큐레이션 팩(55+ seed), 초등 저학년 대상, 일일 10문항·타이머 없음
  - **컨펌 후 즉시 작업 착수** — seed 데이터 큐레이션 + constants 등록 + web 플레이 페이지(proverb 복제, choices[3])
  - **reallife-packs 데모 피드백 인테이크** — 6/16 공유분 대표님 응답 합류 시 차기 챌린지 우선순위 조정

▶ 미해결 인계 (오늘 또는 이후):
  - 🔴 **safety-knowledge 명세 대표님 컨펌** — 본 day 1순위 게이트. 컨펌 전 착수 보류, 컨펌 즉시 착수
  - 🔴 **3지선다 엔진 호환 확인** — 기존 proverb/geo는 choices 4개. FE 렌더가 choices.length 기반인지 착수 전 확인 (명세 §5 단서)
  - 🔴 **reallife-packs 데모 대표님 피드백 인테이크** — 6/16 공유분 응답 합류
  - 🟡 **Vercel Pro 이관 ①현황 점검 1page** — 6/16 자력 분배분, suwon 게이트 대기 시간에 진척
  - 🟡 **dogfood 모집 채널 결정** — D-10(6/21) 시작 준비, 학원·SNS·지인 비교
  - 🟡 **외부 의존 P0 누적 평가 + D-7(6/24) 출시 형태 사전 준비** — 10 day 정체, D-7까지 7 day
  - ⚠ docs/22 인프라 체크리스트 갱신 — `@sentry/nextjs` ESM 해석 한계 + helper 분리 패턴
  - ⚠ pullim-admissions-coach `prompt_v0.1.md` M2 산출물 — 5/30 이월 22일째, 8/1 D-45
  - 수습 종료 6/23 D-6 — 본 daily 능동성·자기 증명 가시화 (suwon 챌린지 라인업 주도 + 데모 공유 사이클이 핵심 증명)

▶ 오늘 위치: **M3 W3 day 3 · suwon 챌린지 라인업 주도 day**. 6/16 명세+데모 공유에 이어, 본 day는 **safety-knowledge 명세 대표님 컨펌 게이트 통과 → 즉시 착수**가 메인. 컨펌 대기/게이트 시간에 writing-coach 자력 작업(Pro 이관 ①·dogfood) 분배. 명세 → 데모 → 컨펌 → 착수 사이클을 본인이 주도하는 것이 수습 D-6 자기 증명.

0. 오늘 작업 순서 (suwon 컨펌 게이트 우선, 대기 시간 자력 작업 분배)
- (09:30~10:00) **6/16 산출 동기화** — reallife-packs 데모 대표님 피드백 + safety-knowledge 명세 컨펌 진행 상태 확인
- (10:00~11:00) **safety-knowledge 명세 컨펌 요청 + 데모 점검** — 대표님 공유용 명세 요약 + (필요시) safety-knowledge 데모 화면 사전 준비
- (11:00~12:00) **3지선다 엔진 호환 확인** — proverb 페이지 choices.length 처리 + BE grade 채점 choices 수 무관 확인 (착수 사전 검증, 컨펌 대기 병행)
- (점심 후 13:30~16:00) **컨펌 후 착수** — seed 큐레이션(교통표지·생활안전·예절 55+) + constants 등록 + web 플레이 페이지 골격 (컨펌 지연 시 자력 작업 전환)
- (13:30~16:00 대기 시 병행) writing-coach 트랙: **Vercel Pro 이관 ①현황 점검 1page** (컨펌 게이트 시간 활용)
- (16:00~17:00) **외부 의존 P0 누적 평가** — 룰 A 10-day 누적 + D-7(6/24) 출시 형태 옵션 A/B 사전 평가 노트 (docs/29 §4 갱신)
- (17:00~17:30) dogfood 모집 채널 결정 사전 plan (선택)
- (저녁) 17:30 Daily Outcome + over.md (Overnight 위임: safety-knowledge seed 큐레이션 잔여분 또는 web 페이지 골격)

1. 오늘 진행할 suwon-monorepo 산출물 (본 day 메인):
- ★ **safety-knowledge 명세 대표님 컨펌** (docs/superpowers/specs/2026-06-16-safety-knowledge-challenge.md)
- ★ **컨펌 후 착수** — `_seed/safety-knowledge.seed.ts` 55+ 큐레이션 + `CHALLENGE_PACK_IDS`·`PACK_DAILY_POOL` 등록 + seed 스크립트
- ★ **web 플레이 페이지** `/home/challenge/safety-knowledge` — proverb 복제(choices[3], 타이머 없음) + 허브 카드(ShieldCheck)
- ★ **3지선다 엔진 호환 확인** — 착수 사전 검증
- reallife-packs 데모 피드백 인테이크 + 차기 라인업 우선순위 정합

2. 오늘 진행할 pullim-writing-coach 산출물 (2순위, 컨펌 대기 시간 분배):
- **Vercel Pro 이관 ①현황 점검 1page** (`docs/26_vercel_migration_phase1.md` 또는 적당 번호) — 자력 ①~③ 첫 단계
- **외부 의존 P0 10-day 누적 평가 노트** — D-7(6/24) 출시 형태 A/B 사전 평가 입력
- (선택) dogfood 모집 채널 결정 사전 plan
- daily 09:30·17:30 + over.md

3. 오늘 병렬로 진행할 pullim-admissions-coach 산출물:
- 본 daily 범위 밖 — 별도 세션. (이월 22일째) `prompt_v0.1.md` M2 산출물 — 8/1 D-45, M3 closure 후 1순위 합류 검토

4. 오늘 만들 산출물 수:
- suwon safety-knowledge seed 큐레이션 55+ 항목 1세트 (컨펌 후)
- suwon web 플레이 페이지 + 허브 카드 1건 (컨펌 후)
- Vercel Pro 이관 ①현황 점검 표 1건 (컨펌 대기 시간)
- 외부 의존 P0 10-day 누적 평가 노트 1건
- 신규 글 샘플 0건 (writing-coach anchor 5종 유지)

5. AI에게 맡길 일:
- 트랙 A(suwon safety-knowledge): 컨펌 후 seed 큐레이션 초안(교통표지·생활안전·예절, 소방청·교통법규 근거) + choices 유효성 유닛 테스트 시드
- 트랙 B(suwon 엔진 호환 확인): proverb 페이지 choices.length 처리 + grade 채점 경로 sweep
- 트랙 C(Vercel Pro 이관 ①): Vercel CLI로 project 상태 sweep + 1page 정리
- 트랙 D(외부 의존 P0 누적 평가): 룰 A 10-day 누적 분석 + D-7(6/24) 출시 형태 사전 평가
- 트랙 E(daily): 09:30·17:30 + over.md
- 트랙 F(선택, docs): docs/22 ESM 한계 + helper 분리 패턴

6. 내가 직접 검수/판단할 일:
- **safety-knowledge 명세 컨펌 게이트 관리** — 대표님 응답 대기 중 착수 보류 vs 사전 검증/자력 작업 전환 판단
- **seed 콘텐츠 정확성** — 교통법규·소방청 안전 수칙 근거 확인, 저학년 눈높이 카피 (AI 큐레이션 초안 전수 검수)
- **3지선다 vs 4지선다 엔진 차이** — choices[3] 렌더/채점 안전성 본인 확인
- **reallife-packs 데모 피드백 반영 우선순위** — 대표님 응답에 따라 차기 챌린지 라인업 순서 조정
- **D-7(6/24) 출시 형태 옵션 A/B 사전 평가** — 외부 의존 P0 5건 10-day 정체 반영

7. 예상 blocker:
- **safety-knowledge 명세 컨펌 지연** — 대표님 응답 시점 외부 의존. 컨펌 전 3지선다 엔진 호환 확인 + seed 큐레이션 초안으로 착수 준비 선행, 자력 작업(Pro 이관 ①) 병행으로 대기 시간 흡수
- **3지선다 엔진 비호환 발견 시** — proverb 4개 전제 렌더면 choices.length 분기 추가 필요 → 착수 분량 증가. 사전 확인으로 조기 노출
- **seed 콘텐츠 근거 확인 시간** — 55+ 항목 교통법규·소방청 근거 대조. 추정 2h vs 실제 2.5h 가능
- **suwon ↔ writing-coach 컨텍스트 스위칭** — 컨펌 게이트 대기로 트랙 전환 잦음. 자력 작업은 중단 안전한 단위(Pro 이관 ① sweep)로 한정

8. 당김 후보 (Standing Rule 5) — 출시 7/1 D-14 시간 여유 활용:
- **reallife-packs 2종 구현 착수** — 데모 공유분 컨펌 시 safety-knowledge와 동시 진행 가능
- **Vercel Pro 이관 ②플랜 비교 + ③체크리스트** — ①현황 점검 closure 후 곧장 진입
- **dogfood 모집 메시지 본문 작성** — 학원·SNS·지인용 3종
- v1 컴포넌트 단위 테스트 +N건 (5/31 이월) — M3 W3에 진입 가능
- /api/score 라우트 fetch 다이버전스 정정 (memory `score-route-fetch-divergence`)
```
