# 물결 1 첫 PR — 코치 토대 (모드 선택 + 과제 입력 + 토큰 통합) 설계

> 작성일 2026-06-23 · 브레인스토밍 산출물 · 상위 설계: [[../../30_writing_experience_design_2026-06-23]]
> 북극성: **AI는 학생 문장을 단 하나도 대신 쓰지 않는다("코치가 준 문장 0개"). 보조는 비계(scaffolding)에만, 문장 생성(대필)은 금지.**

## 목표 & 범위

검증된 코치 루프(`write→checking→nudge→rechecking→growth→done`, 유닛 344개 통과)를 거의 건드리지 않으면서, 다음을 한 PR로 추가한다.

- **모드 선택**: 4모드 카드(자유·가이드 활성 / 개요·음성 '준비 중')
- **가이드 모드 최소버전**: 정적 질문 풀 + 참조용 메모 scratchpad
- **C3 — 과제 입력**: 학생이 자기 과제를 직접 입력(하드코딩 화산 과제 제거)
- **C2 — `/coach` 인증**: TokenGate 래핑 + 무반응 dead-end 제거
- **C1 — 발견 가능성**: Sidebar·onboarding 진입점 노출
- **브랜드 토큰 통합**: `#24D39E` 하드코딩 제거, 색 의미 확정(파랑=행동/초록=상승/레몬=성취)

### 범위 밖 (후속 물결)
- 동적 가이드 질문 생성(서버 ideation 요청 모드) — 물결 2
- 개요 먼저 모드·음성 모드 실제 동작 — 물결 2 / 별도 EPIC(음성: 미성년 동의 인프라 필요)
- 3중 크롬 평탄화·2패널 레이아웃·문단 앵커 오버레이 — 물결 3

## 접근 (결정: B — 분리된 진입 게이트 + reducer 무수정)

신규 진입 게이트가 과제·모드 선택을 reducer **밖**에서 처리하고, 완료되면 `CoachClient`를 `assignment`·`mode` prop으로 마운트한다. 검증된 reducer를 최대한 보존(회귀 위험·리뷰 부담 최소), 경계가 깨끗해 독립 테스트가 쉽다. C2(TokenGate 래핑)·C3(과제 prop)가 게이트 한 곳에 모인다.

대안 A(단일 reducer 확장)·C(reducer에 mode/assignment 필드 추가)는 검증된 reducer의 State/Action/RESTORE를 직접 수정해야 해 회귀 위험이 커서 기각.

## §1 아키텍처 & 컴포넌트 경계

```
app/coach/page.tsx (서버, metadata)
  └─ CoachGate (신규, "use client")            ← TokenGate로 래핑 (C2)
       └─ TokenGate (children render-prop로 일반화)
            └─ CoachSetupFlow (신규)            ← 진입 게이트, reducer 밖
                 ├─ [setup=incomplete]
                 │    ├─ AssignmentStep (신규)   ← 과제 입력 (C3). MetaForm 재사용 + 프로필 prefill
                 │    └─ ModeSelectStep (신규)   ← 4모드 카드. 자유/가이드 활성, 개요/음성 '준비중'
                 └─ [setup=complete]
                      └─ CoachClient (기존, 거의 무수정)
                           ├─ ASSIGNMENT 상수 → props.assignment
                           ├─ props.mode (UI 분기만, reducer 불변)
                           └─ GuidePanel (신규)   ← mode='guide'일 때 write 단계 직교 패널 (정적 질문 풀)
```

**경계 원칙**
- CoachClient의 reducer/상태머신 **무수정.** 변경은 둘뿐: ① 하드코딩 `ASSIGNMENT`(현 54–62행) → `props.assignment`, ② `props.mode` 받아 GuidePanel 렌더 분기(phase 로직 무관).
- 각 신규 컴포넌트 단일 책임: AssignmentStep(입력·검증), ModeSelectStep(선택), GuidePanel(질문 카드·메모 scratchpad), CoachSetupFlow(오케스트레이션·영속).
- TokenGate에 `children?: (onAuthExpired: () => void) => React.ReactNode` 추가. children 없으면 기존대로 `<ScoreForm>` 렌더(ScoreForm/`/try` 경로 무영향).

**진입 순서**: 과제 입력 → 모드 선택 → (자유=바로 write / 가이드=GuidePanel 동반 write) → 기존 코치 루프. 저장된 setup이 있으면 두 단계 건너뛰고 CoachClient 직행(이어쓰기).

## §2 데이터 흐름 & 영속

**신규 순수 모듈 `app/lib/coach-setup.ts`**
```ts
export type WritingMode = "free" | "guide" | "outline" | "voice";
export type CoachAssignment = {
  school_level: string; subject: string; genre: string;
  target_char_count: number | null; prompt_text: string; title?: string;
};
export type CoachSetup = { assignment: CoachAssignment; mode: WritingMode };
```
- `validateAssignment(a)` · `emptyAssignment()` · `isModeEnabled(mode)` 순수 함수.
- 검증 규칙은 기존 `grading.ts`(SUBJECTS/GENRES/SCHOOL_LEVELS/PROMPT_MIN…) **재사용**(중복 구현 금지).
- 활성 모드 화이트리스트 `["free","guide"]`. outline/voice는 `isModeEnabled=false` → 카드 '준비 중' 비활성.

**흐름**
1. `CoachSetupFlow` 마운트 → `loadSetup()`(`pwc-coach-setup-v1`). 있으면 `setup=complete` → CoachClient 직행.
2. 없으면 AssignmentStep. 프로필(`storage.ts loadProfile`) 있으면 학년·과목·장르 prefill. 데모 기본값(화산 과제) prefill로 "바로 체험" 유지.
3. `validateAssignment` 통과 → ModeSelectStep. 모드 선택 → `saveSetup({assignment, mode})` → `setup=complete`.
4. CoachClient에 `assignment`·`mode` prop 전달. CoachClient는 기존대로 `pwc-coach-session-v1`에 궤적 영속.
5. **새 과제로 다시 시작**: CoachClient `reset` 동선에 setup 초기화("다른 과제로") 추가 — setup·session·process-log·guide-memos 함께 클리어.

**영속 키 (충돌 없음)**
| 키 | 주체 | 내용 |
|---|---|---|
| `pwc-coach-setup-v1` (신규) | CoachSetupFlow | 과제 + 모드 |
| `pwc-coach-session-v1` (기존) | CoachClient | 루프 궤적 |
| `pwc-process-log-v1` (기존) | CoachClient | 교사 로그 |
| `pwc-guide-memos-v1` (신규) | GuidePanel | 가이드 메모 scratchpad (참조용) |

- 모든 영속은 기존 `storage.ts`/CoachClient 방어 패턴(SSR 가드, try/catch swallow, 손상 시 null) 답습.
- **가이드 메모는 CoachSession·process-log에 절대 미합류**(대필 증거 오염 방지).
- 새로고침 복원: setup은 게이트가, 루프는 CoachClient가 각자 복원 → reducer의 RESTORE/initial 무수정.

## §3 브랜드 토큰 통합

**색 의미 확정**
| 토큰 | 색 | 의미 | 용도 |
|---|---|---|---|
| `--color-primary` | 파랑 `#0362da` | 행동/1차 액션 | CTA·active·포커스 링 |
| `--color-ok` | 초록 `#10b987` | 상승/성공 전용 | 성장 막대 채움·통과 |
| `--color-lemon` | 레몬 `#e6ff4c` | 새로 자란 것/성취 | 액센트(전 앱 공통) |

**작업**
1. `globals.css @theme`에 3토큰 + `--ease`(`cubic-bezier(0.32,0.72,0,1)`) 1회 승격 → 단일 소스.
2. 하드코딩 `#24D39E`(현 23곳: home/onboarding/TryClient/ScoreForm/CtaBand 등) → 시맨틱 토큰. `ring-[#24D39E]`(AnnotatedBody) → `ring-primary`.
3. 코치 `coach.module.css`의 `--pullim-blue`·`--pullim-lemon`을 전역 토큰과 정렬(같은 값 참조).

**충돌 해소 (회귀 지점)**
- `--color-primary` green→blue 재매핑 시 **GrowthCard '동률=primary 막대'가 파랑이 됨** → 동률 막대는 중립색(ok 계열)으로 명시 분리, "상승=green"과 충돌 방지.
- green CTA 일괄 파랑 전환 → home·try·onboarding·coach 스크린샷 시각 회귀 확인.

**범위 통제**: 색 값 매핑 + 하드코딩 제거까지만. 레이아웃·모션 대수술은 물결 3. 신규 화면 전환 모션에만 `prefers-reduced-motion` 가드 동시 등록.

## §4 가이드 모드 불변식 가드 (제품 정체성 핵심)

가이드 모드는 검증에서 **risky**(동적 질문 미검사 + 메모 대필 통로 위험). 최소버전 하드가드를 머지 게이트로 못박는다.

**가이드 질문 — 정적 풀만 (이번 PR)**
- `app/lib/guide-prompts.ts`(신규): 5영역 렌즈별 **순수 개방형 질문 상수 풀**. 답·예시·모범문장 없음.
- 동적 서버 질문 생성은 물결 2(범위 외).
- **불변식 단위 테스트(머지 차단)**: 질문 풀 전체를 기존 `checkGenerationBlock`(coach-schema)에 통과 → 위반 0건 단언. coach-mock의 처방적 연결어 문구('먼저~그래서~') 차용 금지.

**메모 scratchpad — 참조용 readonly**
- placeholder는 중립 안내만(`"네 생각을 한 줄로…"`). `예:` 시작·완성문장 톤 금지(린트 + 테스트).
- **'캔버스에 넣기'·복사·드래그-투-캔버스 버튼 일절 없음.** 메모→본문 자동 이동 0. Canvas는 항상 빈 시작(기존 불변식 유지).
- 메모는 `pwc-guide-memos-v1`에만 저장.

**가드 사각지대 메모**: `checkGenerationBlock`은 코치 API 출력만 검사 → 클라이언트 정적 텍스트(질문 풀·placeholder·모드 카드 카피)는 가드 사각지대. 이 PR이 들이는 모든 정적 텍스트는 가드 단위 테스트 또는 린트로 명시 커버.

## §5 테스트 전략

**유닛 (`scripts/*.test.mjs`)**
- `coach-setup.ts`: `validateAssignment`(필수/길이/enum), `emptyAssignment`, `isModeEnabled`(free·guide=true, outline·voice=false), 영속 직렬화/방어적 역직렬화(손상 시 null).
- **`guide-prompts.ts` 불변식 게이트(핵심)**: 질문 풀 전체 `checkGenerationBlock` 통과 → 위반 0건. 실패 시 머지 차단.

**컴포넌트 (`vitest` + testing-library)**
- AssignmentStep: 미입력 시 다음 비활성·검증 메시지, 프로필 prefill.
- ModeSelectStep: 4카드 렌더, outline/voice '준비 중' 비활성, free/guide 선택 가능.
- CoachSetupFlow: setup 없으면 입력 흐름 / 있으면 CoachClient 직행.
- GuidePanel: 질문 카드 표시, 메모 입력, **'캔버스에 넣기'류 버튼이 DOM에 없음** 단언.
- CoachClient(회귀): `assignment` prop이 API 요청·헤더에 반영, `mode` 무관하게 기존 루프 불변.

**E2E (`playwright`)**
- C2 회귀: `/coach` 직접 진입 → TokenGate 노출 → 토큰 입력 → setup → write.
- 자유 모드 1회전: 과제 입력 → 자유 → 작성 → 봐줘 → nudge → 고쳤어 → growth → done.
- 가이드 모드: 모드 선택 → write 화면 진입 시 GuidePanel **동반 노출**(별도 게이팅 단계 아님, write phase의 직교 패널) → 질문 카드 확인·메모 작성하며 캔버스에 직접 작성.

**수동 검증**: 토큰 통합 시각 회귀 스크린샷(home·try·onboarding·coach), `npm run typecheck` + `test:all` 그린.

## 커밋 경계 (리뷰 편의)

1. `TokenGate` 일반화 + `/coach` 래핑 (C2)
2. `coach-setup.ts` + `guide-prompts.ts` 순수 모듈 + 유닛 테스트
3. AssignmentStep · ModeSelectStep · CoachSetupFlow (C3 + 모드 선택)
4. CoachClient 파라미터화(ASSIGNMENT→prop) + GuidePanel
5. C1 진입점(Sidebar · onboarding) 노출
6. 브랜드 토큰 통합 (별도 커밋)

## 수용 기준

- [ ] `/coach` 직접 진입 시 TokenGate 노출, 토큰 입력 후 정상 동작(C2 무반응 제거)
- [ ] Sidebar·onboarding에서 `/coach` 도달 가능(C1)
- [ ] 학생이 자기 과제 입력 → 코치가 그 과제 기준으로 동작(C3, 하드코딩 화산 제거)
- [ ] 모드 선택 화면: 자유·가이드 선택 가능, 개요·음성 '준비 중' 비활성
- [ ] 가이드 모드: 정적 질문 카드 + 참조 메모, 캔버스 자동삽입 경로 0
- [ ] `guide-prompts` 질문 풀이 `checkGenerationBlock` 위반 0건(테스트 통과)
- [ ] `#24D39E` 하드코딩 0건, 색 의미(파랑/초록/레몬) 적용, 시각 회귀 확인
- [ ] `npm run typecheck` + `test:all` 그린, 기존 코치 루프 회귀 없음
