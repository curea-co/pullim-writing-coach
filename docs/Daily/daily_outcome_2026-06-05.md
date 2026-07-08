# 2026-06-05 일일 보고 / 최선혜 — 수습 종료 D-18 · M3 W1 day 2


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

v2 새 패러다임 리포 / 데모:
https://github.com/curea-co/pullim-writing-coach_v2 · https://pullim-writing-coachv2.vercel.app/
```


## 09:30 Work Contract

```text
2026-06-05 (금) — ▣ 10:30 대표님 보고 day · 수습 종료 D-18 · M3 W1 day 2
[09:30 Work Contract / 최선혜]

▶ 어제(6/4 목) 마감:
  ① ★ v1 3 PR squash 머지: #59(firefox/webkit E2E 매트릭스, cfw 캐시 키 fix) · #60(Sentry P0-#5 출시 차단 자력 해소, Next.js 16 instrumentation 4 layer) · #61(.env.example 템플릿 + .gitignore 예외, CLEAN 머지)
  ② ★ 문서 6건 신설: `docs/20_m2_closure_2026-06-04.md` · `docs/21_m3_w2_plan_2026-06-04.md` · `docs/22_infra_pr_checklist.md` · `docs/23_v2_e2e_regression_2026-06-04.md` · `docs/24_sentry_setup_guide.md` · `docs/CEO/Report/(26-0605) pullim-writing-coach.md`
  ③ ★ 재사용 자산 3건 박힘 (Standing Rule 2 초과 달성):
     · 인프라 PR 4 layer 체크리스트 (Codex 3 라운드 학습 → 다음 5 인프라 PR 적용)
     · v2 E2E 자동 회귀 패턴 (Playwright headless 5장 캡처 + 헤드리스 한계 명시)
     · EPO Sentry 가입 가이드 1page (가입 30m·env 등록 5m·운영 룰·트러블슈팅)
  ④ v2 E2E 자동 회귀 캡처 5장: 라이트/다크/입력 800자/about/모바일 iPhone 14 Pro
  ⑤ M2 closure 완료 — 누적 22 PR(v1 15 + v2 7) + 정량 자기평가 80% → 90% 도달 근거 7 차원

▶ 미해결 인계 (오늘 또는 이후):
  - 🔴 **10:30 대표님 보고 — 의사결정 3건 입력 받기** (Pro 이관·부모 시스템 진척·v1↔v2 통합 전략 A/B/C)
  - ※ Sentry 무료 tier 가입은 EPO 자체 진행으로 분류(0원·30분·대표님 결정 불필요) — 보고에서 빠짐, 17:30 또는 다음 보고에서 evidence 완료 보고 형식
  - 🔴 **외부 의존 P0 5건 진척 모니터링 룰 가동 시작** (M3 W2 plan §3 룰 A·B·C·D)
  - ⚠ M3 W1 잔여 4건 (6/5~6/8 안에 완성): 링크 본문 추출 PR / Pro 이관 ①~③ 자료 / v1 단위 테스트 +N건 / v2 단위 테스트 시드 1~2건
  - ⚠ v1·v2 E2E user 직접 회귀 (헤드리스 한계분, 보고 후 직접 진입 가능)
  - ⚠ pullim-admissions-coach `prompt_v0.1.md` M2 산출 — 5/30 이월 10일째 누적, 8/1 D-57
  - ⚠ pullim-admissions-coach 별도 세션 합류 시점 결정 — 별도 세션 진척 따라
  - 수습 종료 6/23 D-18 — D-day 압력 + 회복 사이클 패턴 유지

▶ 오늘 위치: **10:30 대표님 보고 day**. 보고 입력 자료(보고서·M2 closure·M3 W2 plan·인프라 체크리스트·v2 회귀·Sentry 가이드 5건) 모두 어제 준비 완료 → 오늘은 ① 보고 최종 점검 ② 보고 + 의사결정 4건 입력 받기 ③ 의사결정 결과 즉시 반영 후 M3 W1 진입.

0. 오늘 작업 순서
- (09:30~10:25) 보고 최종 점검 — `docs/CEO/Report/(26-0605) pullim-writing-coach.md` 본문 다시 읽기 + v1·v2 prod URL 둘 다 실행 확인 + 보조 자료(M2 closure·M3 W2 plan·Sentry 가이드) 손에 잡히게 정리
- **(10:30~) 대표님 보고** — 보고서 §1 비교 표부터 보여드리고 §2·§3 어제 작업 요약 → §4 출시 진척 → §5 6/2 회고. **의사결정 3건**(Pro 이관·부모 시스템·v1↔v2 통합 전략) 입력 받기
- (보고 후, 점심 전) 의사결정 결과 즉시 daily 업데이트 + 외부 의존 P0 5건 진척 모니터링 룰 가동 시작 (룰 A 매일 1줄 형식 정착)
- (오후 1) **링크 본문 추출(D 채널) PR 진입** — `app/api/extract-link/route.ts` 신설 + readability 래퍼. M3 W1 day 2 메인 산출
- (오후 2) **Vercel Pro 이관 ①현황 점검 1page** (`docs/25_vercel_migration_phase1.md` 신설) — env·domain·deployment 히스토리·Hobby 제약 사용량 대비 측정
- (저녁) 17:30 Daily Outcome 작성 + 부수 점검(외부 의존 진척 정리)

1. 오늘 진행할 pullim-writing-coach 산출물:
- **링크 본문 추출 PR** — Hobby 가능, 4채널 중 마지막 D 채널 완성. M3 W1 day 2 메인
- **Vercel Pro 이관 ①현황 점검 1page** — 자력 진입 ①단계
- (선택, 보고 결과에 따라) v1↔v2 통합 전략 입력 액션 1건 (옵션 A→M4 plan / 옵션 B→통합 sprint 시동 / 옵션 C→v2 도메인 alias 진입)
- daily 09:30·17:30 + 17:30 over.md(Overnight 위임 풀세트)

2. 오늘 병렬로 진행할 pullim-admissions-coach 산출물:
- 본 daily 범위 밖 — 별도 세션 진행. 보고 시 대표님께 별도 세션 산출물 합류 시점 확인 부탁드릴 예정
- (이월 10일째) `prompt_v0.1.md` M2 산출물 — 별도 세션 진척 따라 결정

3. 오늘 만들 샘플 수:
- 신규 글 샘플 0건 (v1/v2 anchor 5종 그대로)
- 링크 본문 추출 회귀용 mock 링크 3종 (블로그·뉴스·교사 안내 PDF)
- Vercel Pro 이관 ①현황 점검 표 1건 (env·domain·함수 사용량)

4. AI에게 맡길 일:
- 트랙 A(보고 준비): 보고서 본문 마지막 다듬기·핵심 문구 굵게·★ 항목 강조
- 트랙 B(링크 본문 추출): readability 라이브러리 비교·`/api/extract-link` route 신설·E2E 시나리오 1건 추가
- 트랙 C(Pro 이관 ①): Vercel CLI로 현재 project 상태 sweep + 1page 정리
- 트랙 D(외부 의존 P0 룰 가동): 매 daily 09:30 1줄 형식 템플릿 정리 + 첫 entry 작성
- 트랙 E(daily): 09:30·17:30 + over.md 풀세트

5. 내가 직접 검수/판단할 일:
- **10:30 대표님 보고 — 의사결정 4건 입력의 정확한 기록 + 다음 액션 우선순위 재조정**
- 링크 본문 추출 readability 라이브러리 선정 (Mozilla readability vs node-readability vs 자체 구현) — 출시 안정성·번들 사이즈 우선
- Vercel Pro 이관 ①현황 점검 결과의 정량 데이터 (Hobby 제약 임박도 — 함수 실행 시간·빌드 시간·대역폭 3축)
- 외부 의존 P0 5건 진척 룰 첫 entry — "변동 없음"이 default임을 명시
- v1↔v2 통합 전략 의사결정 받은 후 코드 차원 즉시 액션 결정 (옵션 B 채택 시 M3 W1·W2 plan 재작성 필요)

6. 예상 blocker:
- **대표님 일정 변동** — 10:30 보고가 미뤄지면 오후 일정(링크 추출·Pro 이관) 압축 또는 17:30 over.md로 이월
- 의사결정 4건 중 1건이라도 "Hold/검토 후 답변"으로 미정 처리되면 M3 W1 후속 액션 재조정 필요
- 링크 본문 추출에서 사이트별 anti-bot·CORS·로그인 가드 변수 — Hobby plan 함수 실행 시간 10s 제약 안에 처리 가능한지
- Vercel Pro 이관 결정 받은 후 ④~⑧단계가 환경 이관 + 도메인 alias + 회귀 검증 등 시간 부담 큼 — M3 W1·W2 분산 필요
- 6/4 +44% 시간 초과 캘리브레이션 잔여 — 인프라 PR(링크 추출) 추정 시 라운드당 +30m 버퍼 박기

7. 당김 후보 (Standing Rule 5):
- v1·v2 E2E user 직접 회귀 + 캡처 추가 3~5장 (보고 후 빈 시간 / 헤드리스 한계 잔여 부분 user 시점 동선)
- v2 컴포넌트 단위 테스트 시드 1~2건 (UniversalCapture 6채널 라우팅 · AssignmentCard 컨피던스 칩)
- v1 컴포넌트 단위 테스트 +1~2건 (MetaUsageCard·MetaForm Vitest mock 원복 패턴 적용)
- Vercel `git connect` curea-co GitHub App 재승인 시도 (자동 배포 연결, v1 5/28과 같은 패턴 5분 안에 가능 여부 시험)
- pullim-admissions-coach Member DB doc v0.1 EPO 검수 (8개 결정 잠금 후속)
```
