# 2026-05-27 일일 보고 / 최선혜


## 운영 룰 (Standing Rules)

daily_outcome 작성 시 적용하는 6개 룰. 다음 daily_outcome 파일에도 복사해 유지.

1. **2중 안전망 등록 룰** — 영향이 큰 사실 변화(예: 자기소개서 폐지)나 발견은 plan(개별 문서) + 주간 계획(상위 문서) **두 위치에 등록**. 한 곳만 박으면 잊혀짐.
   - 적용 사례: `definition_pivot_memo_v0.1` + `personas_v0.1.1` + 정의 v0.3 + WBS v3.1 — cascade 4개 문서 분산.
   - 다음 발견 시: plan + 주간 계획 두 위치 등록을 룰로 실행.

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
2026-05-27
[09:30 Work Contract / 최선혜]

▶ 어제(05-26) 마감분: WC BE 골격(route/grading/prompt)·1장 계획·25건 HARD PASS.
  Overnight — PR #2(FE 라이브 연동 P3.2 + 좌측 내비) 머지(19:11) → 라이브 데모 갱신.
  AC repo 부트스트랩(정의 v0.3·스키마 v0.1). 신규 PR #5(누수 #4)·#6(CI) 대기 상태로 올라옴.
▶ 오늘 위치: M1(05-28 BE 골격 시연) D-1.

0. 오늘 작업 순서
- (최우선) PR #5(번들 누수 #4)·PR #6(CI) 리뷰 통과 → 머지
- /api/score 엔드투엔드 200 1건 실증 + 스크린샷 (M1 인수기준 #1 마감) — 라이브 데모서 캡처
- M1 시연 준비 (P2.5 — 백엔드 붙은 1경로 시나리오)
- AC 병렬: 정의 v0.3·스키마 v0.1 검수 → prompt_v0.1.md → 동의/보관·삭제 정책 v1

1. 오늘 진행할 Writing Coach 산출물:
- PR #5 머지 — `grading.ts` 클라 번들 누수 차단 (issue #4, 5종 few-shot 누출 1→0, `model-version.ts` leaf 분리)
- PR #6 머지 — Node 24 단위테스트 CI 워크플로 (typecheck + test:unit)
- **`/api/score` 엔드투엔드 200 + 스크린샷** → M1 인수기준 #1 마감
- M1 시연 시나리오 (P2.5, 백엔드 붙은 데모 1경로)

2. 오늘 병렬로 진행할 Admissions Coach 산출물:
- 정의 v0.3·`student_profile_schema_v0.1.json` EPO 검수 (어제 산출분)
- `prompt_v0.1.md` (M2) — 정의 v0.3 §6 가드레일을 **시스템 프롬프트 제약으로 구현**
- 미성년자 동의 플로우 + 보관·삭제 정책 v1 — 🔴 출시 blocker

3. 오늘 만들 샘플 수:
- WC: 신규 글 샘플 0건(데모 5종 고정). 엔드투엔드 실증 입력 1건(라이브) + 임의 글 1~2건 스팟체크(당김 시)
- AC: 신규 채점 샘플 없음. 스키마 v0.1 기준 입력 예시 1~2건 검토 수준(few-shot anchor는 M2 prompt 범위)

4. AI에게 맡길 일:
- 트랙 A (WC/BE): PR #5·#6 리뷰 대응·머지 후속, 엔드투엔드 200 재현·스크린샷, 임의 글 스팟체크 실행
- 트랙 B (AC/문서): prompt_v0.1.md 초안(§6 가드레일 이식), 미성년자 동의 플로우·보관/삭제 정책 v1 초안

5. 내가 직접 검수/판단할 일:
- PR #5 누수 fix 정합성 (MODEL_VERSION leaf 분리가 계약 §9 S4 순수 경계 지키는지) + PR #6 CI 게이트 승인
- 엔드투엔드 200 결과 품질 스팟체크 + M1 시연 시나리오 승인
- AC 정의 v0.3·스키마 v0.1 검수 (윤리·규제 가드레일 정합)
- AC 미성년자 동의·보관/삭제 정책 v1 — 출시 blocker, 법규·정책 판단 직접
- 어제 미집계 AI 검증 카운트 산정 (7번)

6. 예상 blocker:
- PR #5·#6 "no checks reported" — 리뷰봇이 두 브랜치에 아직 미실행. 트리거 안 되면 어제 같은 hang/지연 재발 가능
- **Vercel env** (`ANTHROPIC_API_KEY`·`DEMO_ACCESS_TOKEN`) 미등록 시 라이브 데모 채점 401/500 → 엔드투엔드 스크린샷 막힘. + `maxDuration=60` 플랜 허용 확인
- AC 미성년자 동의·보관/삭제 정책은 개인정보·미성년자 법규 판단 필요 — v1 범위 잡기 난도 높음
- M1 D-1 — 누수 fix·CI·엔드투엔드·시연 준비가 하루에 몰림

7. 당김 후보:
- 임의 글 novel 일반화 스팟체크 (P2.4) — WC 머지·실증 일찍 끝나면
- Vercel env 등록·플랜(maxDuration 60) 확인 → 라이브 데모 안정화(배포 트랙 선당김)
- 06 v.4 / rubric §5.1 ↔ `samples.ts` B 문구 동기화 (05-26 이월)
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
- **PR #5 머지** — `grading.ts` 클라 번들 누수 차단 (issue #4: 5종 few-shot 에세이+시스템 프롬프트 누출 1→0, `model-version.ts` leaf 모듈 분리)
- **PR #6 머지** — Node 24 단위테스트 CI 워크플로 (typecheck + test:unit)
- ✅ **M1 인수기준 #1 마감 — `/api/score` 엔드투엔드 200 실증 + 스크린샷** (**Vercel prod** `https://pullim-writing-coach-demo.vercel.app/try` 에서 라이브 입력→채점→결과 렌더, 총점 62/5영역·피드백·수정가이드 정상 바인딩). prod 캡처이므로 **Vercel env·`maxDuration` 동작도 함께 입증**(8번 prod 확인 항목 해소)
- ✅ **데모 디자인 개선** (curea.co/platform/layers 레퍼런스 차용, 색·폰트는 기존 토큰 유지) — sticky 번호 섹션 내비(scroll-spy)·계층 브레드크럼·닫는 CTA 밴드·홈 3-up 피처 카드·사이드바 depth 라벨 + 사이트맵 문서(`docs/14`). tsc·next build·브라우저 스크린샷 검증 ✓. ⚠️ **미커밋·미배포**(프로덕션 미반영)

2. 오늘 닫은 Admissions Coach 산출물:
- repo 커밋·PR 기준 **신규 산출 없음** (정의/스키마 검수·prompt_v0.1·정책 미커밋). 13시 CEO 개별 평가 미팅에 오후 시간 배분. → EPO 확인·보강

3. 실제 링크/파일:
- main 커밋 `6e6e317`(#5 누수 차단) · `596a627`(#6 CI 워크플로)
- 신설: `app/lib/model-version.ts` (MODEL_VERSION leaf) · `.github/workflows`(Node24 typecheck+test)
- 이벤트: **13:00 대표님 개별 평가 미팅** — 5/13~현재 산출물·일정·고민·애로 공유 (발표 스크립트 ~2000자)
- 엔드투엔드 증거: `pwc_e2e_200.png` — **Vercel prod** `https://pullim-writing-coach-demo.vercel.app/try` 라이브 채점(총점 62)
- 디자인 개선(미커밋): 신설 `app/components/SectionNav.tsx`·`Breadcrumb.tsx`·`CtaBand.tsx` / 수정 `ResultView.tsx`·`page.tsx`·`samples/[id]/page.tsx`·`Sidebar.tsx` / 문서 `docs/14_sitemap_and_ux_improvements_2026-05-27.md`

4. 샘플:
- 신규 글 샘플 0건 (데모 5종 고정)
- **라이브 채점 입력 1건** — 엔드투엔드 실증분 (총점 62, 데모 5종에 없는 값 = 실제 라이브 채점 확인)
- 임의 글 novel 일반화 스팟체크(다건): 미실행

5. AI가 만든 것:
- 트랙 A(WC/BE): PR #5 누수 fix(`model-version.ts` 분리) · PR #6 CI 워크플로
- 트랙 B(WC/디자인): 레퍼런스 분석 → 컴포넌트 3종(SectionNav·Breadcrumb·CtaBand) + 페이지 4개 수정 + 사이트맵 문서
- CEO 미팅 발표 스크립트 초안 (~2000자, EPO 검수·발표)

6. 내가 수정/기각/채택한 것:
- 채택: PR #5 누수 fix 정합성 검수 → 머지 승인 (MODEL_VERSION leaf 분리가 계약 §9 S4 순수 경계 충족) / PR #6 CI 게이트 채택
- (그 외 직접 검수·판단분 EPO 보강)

7. 검증 결과:
- PR #5: `next build` 후 `.next/static` 누수 검출 **1→0 ✅** · `tsc` 0 · `test:unit` 37/37 · build ✓
- PR #6: Node 24 typecheck+test:unit 자동화 게이트 도입
- **엔드투엔드 200**: **Vercel prod** `/try` 라이브 입력→채점→결과 렌더 정상 (스크린샷 증거, 총점 62) → prod env·런타임 동작 입증
- 디자인 개선: `tsc` 0 · `next build` 10/10 정적 생성 · 브라우저 스크린샷(홈·샘플 상세) 콘솔 에러 0 · SectionNav scroll-spy 활성 전환 확인
- **AI 검증 카운트**: 05-26+05-27분 미집계 — EPO 산정 예정(이월)

8. 미완료/미검증:
- ✅ (해소) Vercel prod env·`maxDuration` 확인 — 스크린샷이 prod `/try` 캡처로 확정 → 라이브 채점 prod 동작 입증
- ⏳ **디자인 개선 미커밋·미배포** — 로컬 검증만 완료. 커밋→PR(리뷰봇)→머지→Vercel 자동배포 남음. **🔴 M1 시연이 새 prod에 의존(EPO 결정) → M1 임계경로**
- M1 시연 시나리오(P2.5) 문서화 미확인
- AC: 정의 v0.3·스키마 v0.1 검수 / `prompt_v0.1.md` / 미성년자 동의·보관·삭제 정책 v1 — 미착수·미커밋
- 임의 글 novel 스팟체크 미실행

9. 내일 첫 액션 (5/28 = ▣ M1 당일):
- ★ **결정(EPO): M1 시연은 디자인 머지 후 새 prod로 한다** → 디자인 배포가 M1 임계경로
- (최우선) 디자인 커밋 → PR(리뷰봇) → 머지 → **Vercel 새 prod 배포·검증** → 그 prod로 시연
- ▣ M1 게이트키퍼 미팅 — BE 골격 시연 (새 prod `/try` 라이브 + 증거 `pwc_e2e_200.png`)
- AC 정의 v0.3·스키마 검수 → `prompt_v0.1.md` 착수

10. 재사용 가능한 프롬프트 / 체크리스트 / 하네스:
- **PR #6 CI 워크플로** (Node24 typecheck+test:unit) — 상시 회귀 게이트 영속 자산
- `model-version.ts` leaf 분리 패턴 — 공유 순수 모듈의 클라 번들 누수 방지 체크리스트 후보
- **레퍼런스 UX 차용 컴포넌트** (SectionNav scroll-spy·Breadcrumb·CtaBand) — 결과/상세 페이지 재사용 자산 + `docs/14` 사이트맵(레퍼런스→WC 매핑표)

11. 오늘 추정 vs 실제 (시간):
- PR #5·#6 머지: 예상 범위 내
- **13시 CEO 개별 평가 미팅(준비+진행)이 반나절 차지** → AC 작업이 미뤄짐 (구체 수치 EPO 보강)
- 디자인 개선은 계획 외 추가분(레퍼런스 분석→구현→검증) — M1 핵심경로(엔드투엔드 prod 입증)는 이미 닫혀 일정 영향 없음

```
