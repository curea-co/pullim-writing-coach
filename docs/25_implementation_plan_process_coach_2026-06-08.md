# 구현 계획 — 평가기 → 과정 코치 (코드 근거)

> 작성 2026-06-08 · Plan 에이전트가 실제 코드(`grading.ts`·`prompt.ts`·`/api/score`·`storage.ts`·`revision.ts`·`ScoreForm`·`middleware.ts`)를 읽고 작성.
> 입력 결정: [docs/24 핸드오프](24_HANDOFF_to_ultracode_2026-06-08.md) · [docs/23 제품·전략 v2](23_product_strategy_v2_process_coach_2026-06-08.md). 전략·UX 재설계 아님 — "어떻게 만들지"만.

---

## A. 현재 아키텍처 (코드 근거)

오늘 제품 = **단발 채점**(다 쓴 글 → 5영역 점수). 순수/부수효과 경계가 이미 깔끔함.

- **채점 파이프라인** `app/api/score/route.ts` — 토큰게이트 → `validateRequest` → `buildUserPrompt` → Haiku raw fetch(prefill `{`) → `parseModelJson` → `validateOutput` → 스키마 실패 시 55s 예산 내 1회 재호출 → `finalizeOutput`. Sentry·메트릭 있음.
- **순수 채점 코어** `app/lib/grading.ts` — 완전 순수(SDK/server-only/next/fetch 없음). 입력 enum·`normalizeBody`·검증·**후처리 가드(`checkFixCount`·`checkDuplication`·`runGuards`)**·에러모델. ← **생성 차단 가드가 확장할 파일.**
- **프롬프트 단일소스** `app/lib/prompt.ts` — 순수. `SYSTEM_PROMPT`(루브릭 v0.4 + 5 few-shot anchor)·`buildUserPrompt`. BE·eval(`scripts/verify.mjs`) 공유.
- **타입·데이터** `app/data/scoring.ts`(F3Output·Score·AreaName + `getScoreColor`·`getTotalScoreBand`, 클라 안전) / `app/data/samples.ts`(5 anchor).
- **클라 스토리지** `app/lib/storage.ts` — ★**이미 `RevisionThread`/`addRevision`(드래프트 버전 모델) 존재** + `DraftSnapshot` 자동저장 + LRU. consent는 `consent_at`만.
- **성장 비교(이미 구현됨!)** `app/lib/revision.ts`(`computeDelta`) + `app/components/GrowthCard.tsx`(v1→v2 영역별 막대). = "성장 막대" 거의 완성, "수치 숨김"만 추가하면 됨.
- **FE** `/try`→`TryClient`→`TokenGate`→`ScoreForm`→`ResultView`, `/samples`(SSG)·`/results`·`/me`·`/onboarding`·export.
- **재사용 인프라** `middleware.ts`(2단 rate-limit)·`rate-limit.ts`·`cn()`·Tailwind v4 `@theme` 토큰.

**재사용 판정:** 순수경계·스토리지 revision 모델·`revision.ts`/`GrowthCard`·토큰게이트/rate-limit·프롬프트 단일소스 전부 직접 재사용. 엔진은 이미 분리 가능.

---

## B. 격차 — "과정 코치"에 없는 것

현재=단발·전체글·점수out / 코치=문단별·쓰는중·질문out·반복. 빠진 것:
1. **코치 턴 루프** (진단→nudge 1개[진단+유도질문+영역, 문장 대필 X]→명시 재점검) — 채점과 별개.
2. **문단별 진단** — 지금은 전체글 5영역만.
3. **생성 차단 가드** — 기존 가드는 fix 개수/중복만 검사, *대신 써주는 문장*은 안 막음.
4. **활성 세션/드래프트 상태** — `RevisionThread`는 "완료 점수 스냅샷"용, 라이브 세션 아님.
5. **바텀시트 코치 UI** — 전무(현재는 세로 위저드).
6. **루브릭 해독(①) + quick-win 우선순위** — 없음.
7. **교사 루브릭 입력** — 코칭이 v0.4에 하드코딩됨.
8. **과정 로그(⑤)** — 교사용 증거 아티팩트 없음.
9. **수치 없는 성장 막대** — `GrowthCard`가 총점 수치 노출(락 UX는 막대만).
10. **AI학습 별도 옵트인 + 만14세 트랙** — `consent_at`만 있음.

---

## C. 에픽 → 티켓 (90일 MVP 컷)

**[MVP]** 90일 / **[v2]** 보류.

### EPIC 1 — 코치 엔진 코어 (순수, 주니어 공유 가능)
- **T1.1 [MVP]** `CoachTurn` 타입 + `validateCoachOutput` → 신규 `app/lib/coach-schema.ts` (AreaName 재사용).
- **T1.2 [MVP]** **생성 차단 가드** `checkGenerationBlock`+`runCoachGuards` → **`grading.ts` 확장**(순수 유지). ⚠️결정필요: 하드리젝트+재호출 vs flag-strip(권장: 하드리젝트→재호출).
- **T1.3 [MVP]** 문단 분리 `splitParagraphs`(`\n\n` 규칙 재사용) → 신규 `app/lib/paragraphs.ts`.
- **T1.4 [MVP]** quick-win 우선순위 `nudge-priority.ts`. ⚠️결정필요: 휴리스틱 vs 모델판단 난이도(권장 MVP=휴리스틱+모델 힌트).
- **T1.5 [MVP]** 성장막대 매핑(수치 숨김) → **`revision.ts` 확장**. ⚠️결정필요: 0–20→막대 매핑식.
- **T1.6 [MVP]** 연령/톤 분기 seam `coach-profile.ts`(주니어 스왑용 config).

### EPIC 2 — 코치 프롬프트 + 엔드포인트
- **T2.1 [MVP]** 코치 프롬프트(장르별 소크라테스 질문 시퀀스, "문장 대필 절대금지") → 신규 `app/lib/coach-prompt.ts`(anchor 재사용).
- **T2.2 [MVP]** **신규 `POST /api/coach`** (≠ /api/score, 이유 §D). route.ts 래퍼 패턴 + `runCoachGuards` 포함.
- **T2.3 [MVP]** 공유 헬퍼 추출(`isAuthorized`·`callModel`) → 신규 server-only `app/lib/server/anthropic.ts`, route.ts 리팩터(동작보존).
- **T2.4 [MVP]** rate-limit/matcher에 `/api/coach` 추가(루프=호출 잦음 → 별도 한도) → `middleware.ts` 편집.

### EPIC 3 — 바텀시트 코치 UI (제품 심장)
- **T3.1 [MVP]** 캔버스 우선 작성화면 `/coach` → `app/coach/page.tsx`+`components/coach/Canvas.tsx`.
- **T3.2 [MVP]** `BottomSheet`(peek↔expand 드래그·스냅, reduced-motion) + `NudgeCard` → 신규(커스텀, 무의존성 권장).
- **T3.3 [MVP]** 고쳐쓰기 루프 컨트롤러(상태머신: peek→펼침→편집→**"다 고쳤어 ✓"**→/api/coach 재점검→막대→다음) → `components/coach/CoachClient.tsx`.
- **T3.4 [MVP]** 수치없는 성장막대 → **`GrowthCard` 재사용+편집**(T1.5).
- **T3.5 [MVP]** 루브릭 해독 카드(①) → `components/coach/RubricDecodeCard.tsx`.
- **T3.6 [v2]** 인라인 밑줄 보조 레이어(핸드오프상 보류).

### EPIC 4 — 세션/드래프트 상태
- **T4.1 [MVP]** `CoachSession`(과제·루브릭·드래프트·문단 nudge 이력·영역별 내부점수·연령트랙) → **`storage.ts` 확장**(RevisionThread 패턴).
- **T4.2 [MVP]** 과정 로그 도출(세션→교사용 "직접 썼나/어디서 막혔나") → 순수 `app/lib/process-log.ts`.
- **T4.3 [v2]** 서버 세션 영속(교사 교차기기·위변조 방지 증거) — localStorage는 MVP. ⚠️결정필요: 저장소(docs/15 DB 스키마 참고).

### EPIC 5 — 교사 무료 도구 (유통)
- **T5.1 [MVP]** 교사 루브릭 등록 → `app/teacher/rubric/page.tsx`+`teacher-rubric.ts`(코칭에 1급 입력).
- **T5.2 [MVP]** 과정 로그 열람(읽기전용) → `app/teacher/log/page.tsx`.
- **T5.3 [v2]** 반 로스터/다학생. **안 만듦(락):** 교사 채점 자동화.

### EPIC 6 — 컴플라이언스
- **T6.1 [MVP]** AI학습 **별도 옵트인**(기본 off, 거부자 학습 제외) → `storage.ts` Profile + `ConsentNotice.tsx` 확장.
- **T6.2 [MVP]** 만14세+ 게이트/중1 트랙 플래그 → `onboarding/page.tsx`+Profile. ⚠️결정필요: 중1 처리.

**MVP 컷:** E1 전부(생성차단 포함)·E2(코치 프롬프트+엔드포인트+헬퍼추출+rate-limit)·E3.1~3.5(바텀시트 루프+성장막대+루브릭해독)·E4.1~4.2(localStorage 세션+과정로그)·E5.1~5.2(교사 루브릭+로그)·E6.
**보류(v2):** 인라인 밑줄·서버 세션 영속·반 로스터·자동/하이브리드 재점검·데스크톱 split.

---

## D. 핵심 아키텍처 결정 (권고 포함)

1. **세션 상태 = MVP는 `storage.ts`(localStorage) 확장, 서버 DB는 v2.** RevisionThread 패턴 그대로. ⚠️단 과정로그의 "위변조 방지 증거" 가치는 localStorage에선 약함 → 서버영속을 v2 1순위로. 저장소 선택은 결정필요(docs/15 스키마 있음).
2. **문단 진단 = 신규 `/api/coach`, /api/score 재사용 안 함.** 출력계약·가드셋(생성차단 필수)·호출빈도/비용·기존 채점 안정성(테스트 보존)이 다름. 래퍼 *기계장치*만 `server/anthropic.ts`로 공유.
3. **생성 차단 = `grading.ts`에 순수 `checkGenerationBlock`+`runCoachGuards`, 하드리젝트→기존 1회 재호출.** 기존 가드는 flag/log만 했지만 생성차단은 **권위적**이어야(위반 시 재호출, 그래도 위반이면 에러 — 생성문장 누출 금지). 순수 유지 → 주니어 공유·단위테스트 직접 import.
4. **바텀시트 = 커스텀 3층.** `CoachClient`(상태머신)→`BottomSheet`(드래그/스냅)→`NudgeCard`(진단+질문+영역+"다 고쳤어 ✓"). 챗봇창 없음(락). 무의존성(npm/Tailwind v4 제약).
5. **주니어 공유 경계 = 코칭 로직 전부 `app/lib/*` 순수, 분기는 config(`coach-profile.ts`)로만.** 부수효과는 route+`server/anthropic.ts`에. grading.ts/prompt.ts가 이미 문서화한 경계 보존.

---

## E. 리스크 & 시퀀싱

**순서:** ① E1+E2.3(순수 엔진+헬퍼, 단위테스트 먼저) → ② E2.1/2.2(프롬프트+엔드포인트) → ③ E4.1(세션, E2와 병렬) → ④ E3(UI) → ⑤ E5(교사) → ⑥ E6(데이터 유출 전 게이트).

**리스크:**
- **R1 — 생성 차단 신뢰도 = 제품 전체.** 과차단=고장, 미차단=ChatGPT와 동일(전략 §4 "무너지면 끝"). 적대적 eval셋(`verify.mjs` 패턴 확장) 출시 전 필수. **최우선 검증.**
- **R2 — Next16/React19/Tailwind v4 미지수.** AGENTS.md는 `node_modules/next/dist/docs/` 읽으라지만 **현재 그 디렉터리 비어있음/없음**, `globals.css`에 **`--r-*` radius 토큰 없음**(band/accent/surface만). ※내 메모리의 "--r-* radius scale"은 **pullim-web 것**이었음 — 이 레포엔 없음. UI 전: 실제 radius 토큰 출처(상위 OS 셸/pullim 패키지?) 확인 + `npm install` 후 docs 재확인. 훈련지식으로 App Router API 가정 금지.
- **R3 — 루프 코치 비용/지연.** 재점검마다 Haiku 호출. **"다 고쳤어 ✓" 명시 트리거(락)가 비용통제** — MVP에서 자동 재점검 추가 금지. /api/coach 한도·세션당 캡.
- **R4 — localStorage 과정로그 = 약한 증거.** MVP 루프엔 OK, 교사유통엔 서버영속 필요(E4.3) → GTM이 "위변조방지 증거"를 localStorage MVP로 과약속 말 것.
- **R5 — 프롬프트 2개 드리프트.** prompt.ts/coach-prompt.ts 둘 다 루브릭 v0.4 → 루브릭 정의를 공유 상수 하나로.

**⚠️ 결정 필요(미해결, 임의확정 금지):** 가격(2.9~4.9만) · 중1 처리 · 단품 SAM · 교사 무료/유료 경계 · 성장막대 매핑식(T1.5) · quick-win 난이도 추정(T1.4) · 생성차단 리젝트 vs strip(T1.2) · 서버 세션 저장소(E4.3).
