# 30. 글쓰기 경험 종합 설계 — 발상~고쳐쓰기 4단계 · 4작성모드 · 과정로그 성취서사

> 작성일 2026-06-23 · 멀티에이전트 설계 워크플로(17 agents, 7영역 30기능 설계 + 대필 불변식 적대 검증) 산출물
> 북극성: **AI는 학생 문장을 단 하나도 대신 쓰지 않는다("코치가 준 문장 0개"). 보조는 비계(scaffolding)에만, 문장 생성(대필)은 금지.**

관련 문서: [[23_product_strategy_v2_process_coach]] · [[25_implementation_plan_process_coach]] · [[27_new_ux_flow_phase_plan]]

---

# 풀림 라이팅코치 — 통합 설계 종합

## 1. 한 줄 비전

**"빈 캔버스 공포부터 완성 후 자부심까지, 모든 입력 방식이 단일 캔버스로 수렴하고 코치는 위치·질문·온기만 줄 뿐 단 한 문장도 대신 쓰지 않는, '내가 다 썼다'가 증명되는 글쓰기 여정."**

---

## 2. 대필 불변식 검증 요약 (제품 정체성의 핵심)

전체 30개 기능 중 `violates`는 **0건**. `risky` 7건, 나머지는 모두 `safe`. risky를 처리 방향별로 분류한다.

### 2-A. 이번 라운드 DROP (선행 인프라 없이는 출시 불가)

| 기능 | 영역 | drop 사유 | 재도입 조건 |
|---|---|---|---|
| **음성 모드 (STT)** | drafting + modes 중복 | 대필이 아니라 **신규 개인정보·미성년 보호자 동의·AI학습 분리 옵트인** 인프라가 `consent.ts`/`age-policy.ts`에 부재. STT 엔진 연동도 신규. authorIsStudent 증거력도 받아쓰기에서 본질적으로 희석. | ① `ConsentState`에 음성/녹음 옵트인(기본 OFF) 신설 ② 미성년 보호자 트랙 재설계 ③ 순수 STT(AI 보정 0)·검토 패널 직접 확정·`captureMode:'voice-self'` 메타. 별도 EPIC으로 분리. 그때까지 `UniversalCapture`의 '준비 중' 게이트 유지. |

음성은 drafting과 modes 양쪽에서 제안됐으나 **둘을 합쳐 하나의 보류 항목**으로 묶는다. 모드 선택 화면의 '말하기' 카드는 '준비 중' 라벨로 노출만 한다(존재 예고 = 동기 유지).

### 2-B. modifyNote 반영 후 SAFE화하여 BUILD (코드/리뷰 체크포인트로 못박을 것)

| 기능 | 영역 | risky 칼날 | safe화 하드가드 (머지 게이트) |
|---|---|---|---|
| **Bridge to Canvas (메모→캔버스)** | ideation | 메모 본문 자동삽입 한 번이면 firstDraft 저작 증거 붕괴 | 참조 패널 readonly·복사/드래그-투-캔버스 **버튼 일절 금지** / Canvas textarea는 항상 빈 시작 / `createSession.firstDraft`는 캔버스 입력만으로 생성됨을 **단위 테스트로 강제** / PR 체크리스트에 '본문에 넣기'류 UI 추가 금지 명시 |
| **Flow Map 관계칩** | structure | '그래서/하지만' 칩이 연결어 떠먹임으로 미끄러짐 | 칩을 '학생이 쓸 연결어'가 아닌 **'두 블록 논리관계를 스스로 분류하는 메타 라벨'**로 프레이밍 / 칩 텍스트 본문 자동삽입 동작 0 / nudge→블록 매핑은 `annotate` verbatim 0건일 때 조용히 비활성 |
| **가이드 질문 스트립 (동적 질문)** | modes | 동적 생성 질문이 `checkGenerationBlock`을 안 거침 + 너무 구체적이면 사실상 대필 | ① **1차는 정적 상수 질문 풀로만 출시** ② 동적은 후속, 각 질문을 `{diagnosis:'', guiding_question:q}`로 감싸 `runCoachGuards` 통과시키는 어댑터 필수 ③ '캔버스에 옮기기'=포커스 이동만, 텍스트 삽입 0 |
| **개요 슬롯→본문 승격** | structure + modes 중복 | AI가 메모를 문장으로 '확장'하면 즉시 리라이트=대필 | 슬롯 라벨·장르 템플릿은 **정적 상수만** / 승격은 학생 메모 verbatim 합치기만(`// 도입: <학생메모>`) / **순서·구조 추천 기능 절대 추가 금지** |
| **내 계획 메모 (intent memo)** | revising | placeholder의 `예: 근거를 한 줄 더…`가 베껴쓸 모범답안 → `checkGenerationBlock` **사각지대**(클라 정적 텍스트는 가드 미검사) | placeholder에서 `예:` 시작 문구 전면 제거, **중립 안내만**('이번에 바꿀 점을 네 말로 적어 봐(선택)') |
| **성장 스토리 공유 카드 (클립보드 WRITE)** | gamification | 복사 텍스트가 학생이 본문에 붙여넣을 유일한 출력물 → 본문/nudge/점수 한 글자라도 새면 violates | `formatStoryText`를 **화이트리스트 토큰**으로만 구성(과제명·장르·'고쳐쓰기 N회'·'돌파 영역'·고정 인장) / 블랙리스트(draft 본문·nudge·점수 정수) / 순수 모듈 분리 후 '본문·점수 미포함' **회귀 테스트** + `checkGenerationBlock` 백스톱 |
| **장르 빈 개요 골격 placeholder** | structure | 클라 정적 placeholder가 완성 예시 문장으로 변질 시 가드 사각지대 | placeholder 문구를 '자리 안내'로 **동결**하는 코드리뷰 린트 규칙 |

### 2-C. 공통 사각지대 경고 (전 영역 관통)

`checkGenerationBlock`은 **코치 API 출력(nudge 객체)만 검사**한다. 클라이언트 정적 텍스트(placeholder·MOCK 질문 풀·카피·복사 직렬화)는 **가드가 못 잡는다.** 따라서:
- **모든 정적 질문 풀/MOCK은 `checkGenerationBlock` 단위 테스트를 머지 차단 게이트로** 둔다(Spark Deck, Unblock Nudge, 가이드 질문, 발상 MOCK).
- **모든 placeholder·카피는 '예:' 시작·완성 문장 톤 금지**, 코드리뷰 린트로 동결.
- coach-mock의 처방적 연결어 템플릿('먼저~그래서~') **재사용 금지**.

---

## 3. 통합 경험 흐름 (단일 상태머신)

기존 검증된 reducer `write→checking→nudge→rechecking→growth→done`을 **한 글자도 바꾸지 않고**, 앞단에 수집(scaffold) 서브상태만 얹는다. 모든 입력 방식의 종착지가 동일 Canvas(`body` 문자열)이므로 **대필 방어선은 단 한 곳**에서 상속된다.

```
[modeSelect] ──선택──┐
                     ├─→ [scaffold: 모드별 진입] ──합성──→ [write(Canvas)] ──[봐줘/코치부르기]──→
                     │      (직교 mode/scaffold 메타)          │ (집중모드 기본)        │ Hand-off Ritual
                     │                                          │                        ↓
                     └────────────────────────────────────→ checking→nudge→rechecking→growth→done
                                                                                              ↓
                                                                                    [완료: 성취 서사]
```

### Phase별 매핑

| 단계 | Phase / 서브상태 | 핵심 기능 | 4개 모드 매핑 |
|---|---|---|---|
| **모드 선택** | `modeSelect` (신규) | 성향 4-카드 | 4개 모드 분기점. localStorage `pwc-writing-mode-v1` |
| **발상** | scaffold (guide) | Spark Deck · 관점 카드 · 구슬 보드 · 온기 미터 | **가이드 모드**의 진입 경험 |
| **구조** | scaffold (outline) | 빈 개요 골격 · 블록 드래그 · Flow Map · 구조 진척 칩 | **개요 먼저 모드**의 진입 경험 |
| **초고** | `write` (focusMode 기본 ON) | 집중 모드 · Unblock Nudge · Flow Bar | **자유 쓰기 모드** = 현행 직진 + 집중모드 |
| **(음성)** | scaffold (voice) | — 준비 중 게이트 — | **말하기 모드** (drop, 예고만) |
| **전환 의식** | write→checking 래퍼 | Hand-off Ritual ('여기까지 네가 다 썼어') | 모드 무관 공통 |
| **고쳐쓰기** | `nudge`/`rechecking` | 문단 앵커 · 변화 디프 · 진척 타임라인 · 계획 메모 | 모드 무관 공통 (검증된 루프) |
| **완료** | `done` | 과정 타임라인 · 돌파 하이라이트 · 전후 토글 · 공유 카드 · 끈기 스트릭 | 모드 무관 공통 |

### 핵심 배선 원칙 (modes 영역에서 확정)
- `RESTORE`가 `...initial`을 펼치므로, **신규 `mode`/`scaffold` 필드를 RESTORE·initial·영속 직렬화 세 곳에 빠짐없이** 실어야 새로고침 시 소실 안 됨.
- `mode`는 reducer 핵심 흐름과 **직교**(phase 안 바꿈, body 불변). SET_MODE는 EDIT 보존 패턴 재사용.
- 모드 간 전환은 학생 텍스트 **이동·보존만**(생성 0). '글은 그대로 있어요' 토스트.

---

## 4. 우선순위 로드맵 (3개 물결)

### 🌊 물결 1 — 지금 가진 자산으로 가장 빠른 체감 개선 (전부 safe·S/easy 중심)

기존 순수 모듈(`progress`/`revision`/`process-log`/`storage`)과 검증된 reducer를 직차용. 신규 의존성 0.

| 기능 | 영역 | effort | 의존성 |
|---|---|---|---|
| 모드-무관 통합 상태머신 배선 + 모드 선택 화면 | modes | M (둘 묶어 첫 PR) | **모든 후속의 토대** |
| 단일 브랜드 토큰 통합 (green #24D39E 흡수) | coherence | M | **시각 후속 전부의 기반** |
| 성장 막대 모션 표준화 (`--ease` @theme 승격) | coherence | S | 토큰 통합 |
| 구조 진척 칩 | structure | S | `segGain/segPop` 기존 애니 |
| 영역별 진척 타임라인 (AreaProgressRail) | revising | S | `revision.toBarSegments`·state |
| 막혔다 뚫은 순간 하이라이트 | gamification | S | `stuckAreas`(이미 존재, 학생화면 미사용) |
| 절제된 끈기 스트릭 | gamification | S | `storage.ts` 어댑터 키 1개 |
| 발상 온기 미터 | ideation | S | `progress` 밴드 패턴 |
| 관점 카드 (정적 상수) | ideation | M | 없음(서버 호출 0) |
| 집중 모드 (Zen Draft) | drafting | S | boolean state 1개 |
| 초고→코치 전환 의식 | drafting | S | 집중모드 (래퍼만, reducer 불변) |

> 물결 1의 정신: **'방어 증거 = 성취 증거' 이중가치**(돌파 하이라이트)와 **'한 제품 한 팔레트 + 한 감속곡선'**을 최소 코드로 먼저 확보.

### 🌊 물결 2 — 핵심 차별화 ('비계는 생성하지 않는다'를 경험으로)

| 기능 | 영역 | effort | 의존성 / 조건 |
|---|---|---|---|
| 장르별 빈 개요 골격 | structure | M | placeholder 동결 린트 |
| 개요→본문 전환 (코치 루프 합류 통합 핀) | structure | M | 골격 / ASSIGNMENT 장르 주입 seam |
| 모드 간 무손실 전환 | modes | M | SET_MODE (EDIT 패턴) |
| Spark Deck (질문 카드 덱) | ideation | M | 신규 ideation 요청 모드(draft 없이 질문만) + MOCK 가드 테스트 |
| 가이드 질문 스트립 (**정적 풀만**) | modes | M | Spark Deck과 질문 풀 공유 |
| Unblock Nudge (막힘 감지) | drafting | M | unblock-prompts 가드 테스트 게이트 |
| 전/후 본문 토글 | revising | S~M | `RevisionToggle` 재사용 + draftHistory plumbing |
| 내 계획 메모 (**placeholder 수정 후**) | revising | M | recordRevision 호출부 확장 |
| 과정 타임라인 ('내가 해냈다') | gamification | M | draft 본문 미출력 가드 |
| Flow Bar (리듬 점 선행, 분량 바는 실과제 주입과 묶음) | drafting | M | target_char_count 주입 |
| 성장 스토리 공유 카드 (**화이트리스트 직렬화 후**) | gamification | M | formatStoryText 회귀 테스트 |
| a11y·모바일 기준선 | coherence | M | 토큰 통합 (포커스 링 ring-primary) |

### 🌊 물결 3 — 야심작 (L, 신규 인프라/난제)

| 기능 | 영역 | effort | 의존성 / 난제 |
|---|---|---|---|
| 3중 크롬 평탄화 + 2패널 풀폭 레이아웃 | coherence | L (한 묶음) | 레이아웃 대수술. 폰프레임·중복 헤더·고정높이 동시 해제 |
| 문단 위치 앵커 (textarea 오버레이) | revising | **L** (브리프 M보다 큼) | 신규 `paragraphRange` 헬퍼 + textarea-오버레이 픽셀 정렬(한글 가변폭 난제) |
| 변화 디프 (내가 바꾼 곳) | revising | M | **문단 앵커 오버레이 인프라 선행 필수** |
| 생각 구슬 보드 (Idea Beads) | ideation | L | @dnd-kit 미설치 → **비-드래그 폴백 MVP**(탭→클러스터 배정) 먼저 |
| 블록 드래그 재배치 | structure | M | join 역연산 부재 → '학생 블록 배열 1차 소스, body 파생' 모델 |
| 개요 슬롯→본문 승격 (드래그 보드) | modes/structure | L | verbatim 승격만, 추천 0 |
| Flow Map (흐름 지도) | structure | L | **유일 risky** 영역 마지막. 영역 nudge↔블록쌍 매핑 비자명 + 점선 신규 CSS |
| Bridge to Canvas (메모 참조 패널) | ideation | M | 하드가드 4종 코드/테스트 못박은 후 |

---

## 5. 영역 간 충돌·시너지

### 중복 → 하나로 통합해야 할 것 (중복 구현 금지)

1. **개요/구조 골격**: `structure`의 '빈 개요 골격'과 `modes`의 '개요 먼저 모드'는 **동일 기능**. → `modes`의 개요 모드 = `structure` 골격 컴포넌트를 scaffold로 호스팅. 슬롯 템플릿 상수·승격 로직 **단일 소스**.
2. **가이드 질문**: `ideation`의 Spark Deck/관점 카드와 `modes`의 가이드 질문 스트립이 겹침. → **질문 풀 상수를 단일 모듈**(`unblock-prompts`/ideation 풀 통합)로 두고 가이드 모드·발상·Unblock Nudge가 공유. 모두 같은 가드 테스트 통과.
3. **음성 모드**: drafting·modes 양쪽 제안 → **하나의 보류 EPIC**으로 병합.
4. **드래그 재배치**: `structure`의 블록 Reorder와 `modes`의 OutlineBoard 드래그가 겹침 → 동일 `BlockReorder`/`blocks.ts` 재사용.
5. **전후 비교**: `revising`의 전/후 토글과 `gamification`의 과정 타임라인이 완료화면에서 공존 → **CompletionView 한 화면**에서 타임라인(서사) + 토글(원문) + GrowthBars(추상) 3층으로 조합.

### 시너지 (서로 강화)

- **오버레이 인프라 공유**: `revising` 문단 앵커가 만드는 textarea-오버레이 레이어를 변화 디프가 그대로 얹음. + `structure` Flow Map의 nudge→블록 앵커도 `annotate`/`feedback-anchors`를 공유 → **앵커 인프라 1회 투자, 3기능 회수.**
- **온기 미터 ↔ 구조 진척 칩 ↔ 진척 타임라인**: `progress`/`revision` 밴드 어법을 발상·구조·고쳐쓰기 전 단계에서 일관 재사용 → **수치 숨김·색 균형이라는 단일 시각 언어.**
- **방어 증거의 이중가치**: `process-log`의 stuckAreas·revisions·draftHistory가 교사 방어 증거이자 동시에 `gamification`의 학생 성취 서사. **데이터 신규 생성 0.**

### 충돌 (해소 규칙 확정)

- **집중 모드 기본 ON ↔ 코치 발견성**: 초고 단계 집중모드는 코치를 숨기므로 신규 사용자가 코치 존재를 모를 위험. → **최초 1회 '코치 부르기' CTA 은은히 노출** 또는 온보딩 힌트.
- **2패널 넓은 레일 ↔ '한 호흡 한 nudge'**: 데스크탑 레일이 넓다고 nudge 여러 장 노출 금지. **레일·시트 모두 `topNudge` 1장 제한 유지.**
- **green 의미 재정의 ↔ 동률 막대**: `--color-primary`를 blue로 재매핑 시 GrowthCard의 'neutral=primary(동률)' 막대가 파랑이 됨. '상승=green'과 충돌 안 하는지 회귀 확인. green은 **'상승/성공' 전용으로 강등**, lemon은 **'새로 자란 것/성취' 전용**.
- **라운드트립 무손실 주장**: `splitParagraphs`가 trim/빈줄 drop → body↔blocks 완전 무손실 불가. **'학생 블록 배열이 1차 소스, body는 파생'으로 정직하게 재정의.**

---

## 6. 디자인·UX 통합 결론 (확정 방향)

### 시각 언어 통합 — "한 제품 한 팔레트, 한 감속곡선"
- **단일 토큰 소스**: `globals.css @theme`. 하드코딩 `#24D39E` 23곳을 시맨틱 토큰으로 치환.
  - **파랑(pullim-blue #0362da) = 행동/1차 액션** (`--color-primary` 재매핑, CTA·active·포커스 링 수렴)
  - **초록(#10b987 --color-ok) = 상승/성공** 의미 전용 강등
  - **레몬(#e6ff4c) = 새로 자란 것/성취** 액센트 전 앱 공통
- **단일 모션 언어**: `--ease(cubic-bezier(0.32,0.72,0,1))`를 `@theme`로 1회 승격, 버튼·토글·칩 전이 통일. 성장=자라남 = 코치 루프는 `segPop`, 채점/전후는 `growBarFromV1` 2종으로 문서화. 모든 신규 모션은 `prefers-reduced-motion` 가드에 **동시 등록**(누락 시 회귀).
- **포커스 링**: `ring-[#24D39E]`(실측 1곳, AnnotatedBody) → `ring-primary`. 토큰 통합과 한 PR.

### 더블/트리플 크롬 해소 — 확정
현 3중 크롬(사이드바 + 코치 자체 탑바 + 432px 폰프레임)을 **사이드바 1개 + 에디터가 주인공인 풀폭 워크스페이스 + 옆/아래 비계 코치**로 평탄화한다.
- **데스크탑(md+)**: 루트 `layout.tsx` Sidebar 하나만 글로벌 크롬. 코치 내부 sticky header(`:626`)·폰프레임 `max-w-[432px]`(`:657`)·고정높이 `h-[min(76vh,690px)]`(`:658`) **동시 해제**. 좌측 에디터 60~66% + 우측 sticky 코치 레일(nudge 1장·GrowthBars·과제 칩). 코치 브랜드 마크는 Sidebar 헤더로 1회 흡수.
- **모바일(<md)**: 폰프레임 테두리만 제거, 너비 100% 단일 컬럼. 코치는 기존 `BottomSheet`(peek/open/hidden 3상태) **그대로**.
- **불변식 보존**: 레이아웃 재배치만 — 빈 캔버스 첫 페인트(`:360`)와 reducer 무손상. 생성 경로 무접촉이라 invariant 리스크 0.

> 레이아웃 대수술(크롬 평탄화 L + 2패널 L)은 **한 묶음**으로 물결 3에서. 그 전에 물결 1의 토큰·모션 통합으로 '시각적 한 손' 감각을 먼저 깔아, 레이아웃 변경 시 색·모션 회귀를 최소화한다.

---

**종합 결론**: 6개 영역 30기능 중 **DROP 1건(음성)**, **safe화 후 build 7건(하드가드 명시)**, 나머지 즉시 build. 모든 입력 모드가 단일 Canvas로 수렴해 **대필 방어선은 한 곳에서 상속**되고, 모든 정서·게임화·진척 피드백은 **신규 텍스트 생성 0의 순수 메타데이터 시각화**다. 물결 1(가진 자산·S 중심)로 '한 팔레트·이중가치 성취·집중모드'를 즉시 깔고, 물결 2로 '비계는 생성하지 않는다'를 경험화하며, 물결 3에서 오버레이·드래그·레이아웃 난제를 공유 인프라로 회수한다.

---

# 부록 A — 영역별 상세 설계 + 적대 검증 (원본)

워크플로 Design→Verify 단계의 영역별 산출물. 각 기능은 `대필 안전 보장` 전략과 검증자의 판정(safe/risky/violates · build/modify/drop)을 함께 기재.

## A.ideation — 발상/시작

_발상 단계의 핵심은 "빈 캔버스 공포"를 제거하되 절대 대필하지 않는 것. AI는 질문/관점/구조 비계만 제공하고, 모든 텍스트는 학생이 짧은 메모로 직접 쓴다. 질문 카드 덱에서 흩뿌린 메모를 끌어 모아(구슬 보드) 초고 재료로 변환하는 "발상 → 정렬 → 초고 이관"의 즐거운 흐름을 만든다._

### 질문 카드 덱 (Spark Deck)  ·  effort M · 검증: ✅ safe / moderate → **build**

- **무엇**: 5영역 루브릭 렌즈(과제이해/내용/구조/표현/성장)에 묶인 소크라테스식 질문을 카드 한 장씩 넘기며 본다. 각 카드 하단에 작은 메모 textarea가 붙어 학생이 '본인 답'을 짧게 적는다. 스와이프(또는 화살표키)로 다음 카드. '이 질문은 패스' / '다시 보기' 가능. 카드 질문 텍스트는 서버가 guiding_question만 주거나(coach-prompt 재사용), 키 없을 땐 영역별 고정 질문 풀(MOCK)에서 뽑는다. 메모는 빈 채로 넘겨도 무방(부담 0).
- **왜 즐거운가**: 빈 캔버스 대신 '질문 한 장'만 마주하니 진입 장벽이 사라짐. 카드 넘김의 물리적 리듬과 진척감(7장 중 3장)이 게임처럼 작동. 패스 가능 → 막히면 도망갈 출구가 있어 마찰이 없다.
- **대필 안전 보장**: 카드에 담기는 건 질문(guiding_question)뿐 — 답/예시/모범문장 없음. 메모칸은 항상 빈 상태로 시작하고 placeholder도 '네 생각을 한 줄로' 같은 중립 안내만. 서버 질문은 기존 coach-schema의 runCoachGuards(checkGenerationBlock)를 그대로 통과시켜 평서문·콜론 떠먹임을 차단. 학생이 안 적으면 0자 그대로 — AI가 채우지 않음.
- **재사용**: NudgeCard.tsx, icons.tsx, coach-prompt.ts, coach-schema.ts, app/api/coach/route.ts, nudge-priority.ts, coach.module.css
- **신규 작업**: SparkDeck.tsx (카드 캐러셀 + 메모 textarea, 스와이프/키보드 a11y), 영역별 발상 질문 MOCK 풀 (키 없을 때, coach route MOCK 패턴 확장), ideation 전용 요청 모드(질문만 생성, submission.body 대신 assignment 컨텍스트만 전달)
- **검증 근거(불변식)**: 카드에 담기는 텍스트가 guiding_question(질문)뿐이고 메모칸은 0자로 시작·AI가 채우지 않는다는 설계가 불변식과 정렬. 결정적으로 서버 생성 질문을 기존 checkGenerationBlock에 그대로 통과시키므로(코드 확인: checkGenerationBlock은 nudge별 diagnosis+guiding_question만 검사) 평서문 박아넣기·콜론/목록 떠먹임이 동일 권위 백스톱으로 차단된다. 단 한 가지 risky seam: MOCK 질문 풀을 만들 때 coach-mock의 기존 문구(예: '먼저 ~, 그래서 ~, 따라서 ~'처럼 이어 주는 말을 넣어 볼까요? — 연결어 템플릿 떠먹임에 근접)를 그대로 차용하면 발상 질문으로는 너무 처방적이다. 발상용 MOCK은 순수 개방형 질문('왜 그렇게 생각해?')만 담고, 새 MOCK 풀도 checkGenerationBlock으로 단위 테스트해 통과를 강제하면 safe 유지.
- **수정/보류 노트**: NudgeCard/icons/coach.module.css는 그대로 재사용 가능하나, 캐러셀·스와이프·메모 textarea는 신규. 가장 큰 비용은 '질문만 생성하는' ideation 요청 모드: 현재 /api/coach route는 submission.body(초고)를 필수로 받고 10자 미만이면 E2로 거부하며(route.ts 확인), MOCK도 runCoachMock(draft)로 draft에 의존한다. 따라서 별도 엔드포인트(/api/spark 또는 route에 mode 분기)와 draft 없이 assignment 컨텍스트만으로 질문을 만드는 새 프롬프트 경로가 필요. 기존 coach route를 그대로 호출하는 식의 'easy 재사용'은 불가 → moderate.

```
[decode icon] 과제 이해 · 카드 3/7
┌──────────────────────────┐
│ 화산이 '왜' 우리 삶과       │
│ 관련 있다고 생각해?         │
│                            │
│ [ 네 생각을 한 줄로… ]      │
└──────────────────────────┘
  ‹ 이전   · ● ● ○ ○ ·   패스 ›
```

### 생각 구슬 보드 (Idea Beads)  ·  effort L · 검증: ✅ safe / hard → **build**

- **무엇**: Spark Deck에서 적은 메모들이 자동으로 '구슬'(작은 칩 카드)로 보드에 흩뿌려진다. 학생이 직접 추가 구슬도 만들 수 있다(빈 칩 탭 → 한 줄 입력). 드래그로 구슬을 끌어 모아 그룹(클러스터)을 만들고, 그룹에 이름표(학생이 작성)를 단다. 그룹 = 글의 문단 후보. 구슬 색은 5영역 토큰(blue/lemon/pb-*)로 자동 태깅돼 어느 렌즈에서 나왔는지 보인다.
- **왜 즐거운가**: 흩어진 생각을 손으로 끌어 모으는 촉각적 정리가 '아 이게 한 문단이구나'를 스스로 발견하게 함. 부담 없는 한 줄 메모가 모여 구조가 '드러나는' 쾌감. 색 태깅으로 빈약한 영역(구슬 적은 색)이 시각적으로 보여 다음 발상을 유도.
- **대필 안전 보장**: 모든 구슬 텍스트는 학생이 직접 입력한 메모뿐(AI가 구슬을 생성하지 않음). 그룹 이름표도 학생 작성. AI의 역할은 색 태깅(어느 질문에서 나왔나)과 '이 색 구슬이 적네, 한 장 더 볼래?' 같은 질문 넛지뿐 — 내용 제안 없음. coach-session.ts의 '학생 draft만 기록' 철학과 정합.
- **재사용**: icons.tsx, globals.css, coach.module.css, utils.ts, progress.ts
- **신규 작업**: IdeaBeads.tsx (드래그 보드, 클러스터링), 구슬↔메모 데이터 모델 (영역 태그 포함, localStorage pwc-ideation-v1), @dnd-kit 또는 Pointer Events 기반 드래그(reduced-motion 가드), 빈영역 감지 → 질문 넛지 트리거 로직
- **검증 근거(불변식)**: 모든 구슬·그룹 이름표가 학생 입력 텍스트뿐이고 AI는 색 태깅(출처 렌즈)과 '이 색이 적네, 한 장 더?'식 질문 넛지만 한다 — 텍스트 생성 0. coach-session의 '학생 draft만 기록' 철학과 정합. 한 가지 주의: '빈영역 감지 → 질문 넛지'가 만약 비어 있는 영역에 대해 내용을 암시하는 문구(예: 특정 근거를 대라)를 띄우면 risky가 되므로, 넛지는 영역명+개방형 질문 형태로만 두고 Spark Deck과 동일하게 checkGenerationBlock을 통과시키면 safe.
- **수정/보류 노트**: 재사용 자산(icons/globals/coach.module.css/utils/progress)은 표면적이고 핵심인 드래그 보드·클러스터링·자유배치는 전부 신규. @dnd-kit이 package.json에 없음(확인) → 신규 의존성 추가 또는 Pointer Events 직접 구현 필요, reduced-motion·터치 a11y·드래그 접근성(키보드 대체 경로)까지 고려하면 비용 큼. effort L 타당. MVP에서는 드래그를 빼고 '구슬 탭 → 클러스터에 배정'(선택 기반) 같은 비-드래그 폴백으로 먼저 지어 a11y/구현 리스크를 낮추는 것을 권장.

```
보드 (드래그 자유배치)
  ●'화산=땅의 숨' (decode)
      ●'온천 관광' (ask)
  ┌─클러스터: 일상 영향─┐
  │ ●비옥한 흙  ●지열발전 │
  └──────────────────┘
  [+ 빈 구슬]
```

### 관점 카드 (Perspective Lenses)  ·  effort M · 검증: ✅ safe / moderate → **build**

- **무엇**: 한 주제를 다른 각도에서 보게 하는 '렌즈 카드' 세트: 시간(과거/미래), 사람(과학자/주민/나), 대조(만약 없었다면?), 규모(작게/크게). 학생이 렌즈를 고르면 그 관점에 맞춘 질문 1개가 뜨고, 답 메모를 적으면 그 메모가 해당 렌즈 태그를 달고 구슬 보드로 간다. 한 주제당 여러 렌즈를 돌려가며 생각을 입체화.
- **왜 즐거운가**: '더 쓸 게 없다'는 학생에게 같은 주제의 새 입구를 계속 열어줌. 렌즈 전환이 곧 아이디어 확장이라 막힘이 풀리는 체감. 관점 다양성이 자연스럽게 '내용 충실도'를 끌어올림.
- **대필 안전 보장**: 렌즈는 '보는 각도'(질문 프레임)만 제공하고 답은 주지 않음. 각 렌즈 질문도 guiding_question 형식으로 checkGenerationBlock 통과. 렌즈 자체는 콘텐츠가 아니라 사고 도구라 대필과 무관 — '만약 화산이 없었다면?'은 질문이지 문장 제공이 아님.
- **재사용**: NudgeCard.tsx, icons.tsx, coach-prompt.ts (RUBRIC_COACH_LENS 패턴), coach.module.css
- **신규 작업**: PerspectiveLenses.tsx (렌즈 선택 그리드 + 질문 패널), 렌즈 정의 상수 (시간/사람/대조/규모 + 영역 매핑), 렌즈→질문 매핑(MOCK + 서버 모드 선택)
- **검증 근거(불변식)**: 렌즈는 '보는 각도'(질문 프레임)만 주고 답을 주지 않는다. '만약 화산이 없었다면?'은 질문이지 문장 제공이 아니므로 대필과 무관. RUBRIC_COACH_LENS 패턴(영역별 코칭 렌즈)을 재사용하고 렌즈 질문도 guiding_question 형식으로 checkGenerationBlock을 통과시키면 안전. 렌즈 정의가 정적 상수면 생성 위험 자체가 없어 가장 견고하게 safe.
- **수정/보류 노트**: 렌즈 정의를 정적 상수(시간/사람/대조/규모 + 영역 매핑)로 두면 서버 호출조차 불필요 → 생성 위험 0 + 구현 단순. 이 정적 우선 접근으로 지을 것. NudgeCard/icons/coach.module.css 재사용. 서버 모드(렌즈→동적 질문)는 선택 확장이며, 도입 시 Spark Deck과 같은 ideation 요청 모드 비용을 공유하므로 1차 버전에서는 정적으로만 build.

```
어느 각도에서 볼까?
[⏳시간] [👥사람] [🔀만약] [📏규모]
선택: 만약
→ '화산이 없는 세상은 어떨까?'
   [ 네 생각… ]
```

### 가이드 모드 — 초고 재료 이관 (Bridge to Canvas)  ·  effort M · 검증: ⚠️ risky / moderate → **build**

- **무엇**: 발상이 충분해지면(구슬 N개 이상 또는 클러스터 2개 이상) '이제 써볼까?' CTA가 활성화. 누르면 학생이 만든 클러스터(문단 후보)가 캔버스 상단에 '내가 적은 메모' 목록으로 접힌 채 따라온다 — 본문은 여전히 빈 칸. 각 클러스터를 탭하면 그 메모들이 사이드에 펼쳐지고, 학생은 그걸 '보면서' 본문을 직접 쓴다. 메모는 절대 본문에 자동 삽입되지 않는다.
- **왜 즐거운가**: 발상의 결과물이 사라지지 않고 글쓰기로 '연결'되는 연속감. 내 메모를 곁눈질하며 쓰니 '뭘 쓰지' 공포 없이 출발. 한 클러스터 = 한 문단이라는 구조 감각이 쓰기에 그대로 이어짐.
- **대필 안전 보장**: 북극성의 가장 민감한 지점 — 메모를 본문에 복사/자동삽입하면 회색지대다. 따라서 메모는 캔버스와 분리된 참조 패널에만 표시(읽기 전용 사이드), 본문 textarea(Canvas.tsx)는 빈 채로 시작하고 학생이 손으로 다시 쓴다. '메모를 본문에 넣기' 버튼 같은 건 만들지 않음. coach-session.createSession의 firstDraft는 학생이 캔버스에 친 것만 기록.
- **재사용**: Canvas.tsx, BottomSheet.tsx, coach-session.ts (createSession), CoachClient.tsx (상태머신 진입점), coach.module.css
- **신규 작업**: IdeationToCanvas 브릿지 (클러스터 → 읽기전용 참조 패널), 발상 충분도 게이트 로직, CoachClient 진입 전 ideation phase 추가(또는 별도 /ideate 라우트 → /coach 인계)
- **검증 근거(불변식)**: 북극성의 가장 민감한 지점. 학생 본인이 적은 메모라도 그것을 본문에 자동 삽입/복사하면 '학생이 캔버스에 직접 친 것'이라는 authorIsStudent/firstDraft 저작 증거 모델이 흐려진다(coach-session.createSession의 firstDraft는 캔버스 입력만 기록해야 함 — 확인). 브리프가 이를 인지해 '읽기전용 참조 패널 분리, 자동삽입/넣기 버튼 없음'으로 설계했으므로 그 가드를 지키면 safe에 가깝지만, '메모를 본문에 넣기' 한 번이면 회색지대로 추락하는 구조라 기본값은 risky로 둔다.
- **수정/보류 노트**: safe로 만들려면 하드 가드를 코드로 못박을 것: (1) 참조 패널은 readonly·복사버튼/드래그-투-캔버스 일절 없음, (2) Canvas textarea는 항상 빈 채 시작하고 메모 문자열을 본문 state에 절대 주입하지 않음, (3) createSession.firstDraft는 캔버스 입력값만으로 생성(메모 미포함)임을 테스트로 강제, (4) 메모 패널 텍스트에 select/copy를 막을 필요는 없으나 '본문에 넣기'류 어떤 자동 이관 UI도 추가 금지를 PR 체크리스트에 명시. 이 가드 충족 시 build. Canvas/BottomSheet/coach-session/CoachClient 진입점 재사용 가능.

```
캔버스
┌ 내 메모(참조, 읽기전용) ▾ ┐
│ ▸ 일상 영향 (3) ▸ 형성 (2) │
└───────────────────────┘
[ 여기에 직접 글을 써 보세요 ]
  ← 본문은 빈 칸, 메모는 옆에서 참고만
```

### 발상 온기 미터 (Warmth, not Score)  ·  effort S · 검증: ✅ safe / easy → **build**

- **무엇**: 발상 단계 진척을 점수가 아닌 '온기'로 표현: 구슬 수·렌즈 다양성·클러스터 형성에 따라 보드 배경이 차가운 회색 → 따뜻한 레몬빛으로 서서히 물든다. 5영역 색이 골고루 모이면 '균형 잡힌 발상'으로 표시. 수치는 일절 노출 안 함.
- **왜 즐거운가**: 정량 평가 압박 없이 '내 생각이 점점 모이고 있다'는 정서적 피드백. 색 균형이 자연스럽게 빈약한 영역으로 시선을 끌어 다음 행동을 부드럽게 유도. 미성년 좌절 방지 톤과 일치.
- **대필 안전 보장**: 점수 숫자 비노출 계약(coach-prompt:133, process-log:9)을 발상 단계에도 그대로 적용. 온기는 학생 활동량(본인이 적은 메모 수)의 반영일 뿐 AI 평가가 아니며, 어떤 텍스트도 생성하지 않음.
- **재사용**: progress.ts (밴드 색 매퍼 패턴), revision.ts (수치 숨김 toBarSegments 철학), globals.css (브랜드 토큰), GrowthBars.tsx (색 어법 참고)
- **신규 작업**: WarmthMeter (배경 그라데이션 + 영역 색 균형 인디케이터), 활동량→온기 매핑(progress.ts 밴드 패턴 차용)
- **검증 근거(불변식)**: 점수 숫자 비노출 계약(coach-prompt:133, process-log:9)을 발상 단계에 그대로 적용. 온기는 학생 활동량(본인 메모 수·렌즈 다양성)의 반영일 뿐 AI 평가나 텍스트 생성이 아님. 어떤 문장도 만들지 않으므로 대필과 무관. 미성년 좌절 방지 톤과도 일치.
- **수정/보류 노트**: progress.ts의 밴드→Tailwind 클래스 매퍼 패턴과 revision.ts의 수치 숨김(toBarSegments) 철학을 그대로 차용한 순수 매핑 + 배경 그라데이션 한 컴포넌트. globals.css 브랜드 토큰 사용. 신규 비용 최소, effort S 타당. 가장 먼저/싸게 지을 수 있는 정서적 피드백 레이어.

```
보드 배경: 회색 ▓▓░░ → 레몬 ████
영역 균형: ●blue ●lemon ○ ●pb ○
           '한 색이 비었네 — 한 장 더?'
```

**이 영역 우선 추천**: 먼저 지을 순서: (1) 관점 카드 — 정적 상수로 두면 서버 호출·생성 위험이 0이라 불변식상 가장 안전하고 즉시 '막힘 해소' 가치를 준다. (2) 발상 온기 미터 — effort S, 기존 순수 모듈(progress/revision) 패턴 직차용으로 가장 싸게 정서 피드백을 깔 수 있다. (3) Spark Deck — 핵심 발상 경험이지만 '질문만 생성하는' ideation 요청 모드(현 /api/coach는 초고 body 필수, MOCK도 draft 의존)가 신규 서버 작업이라 그다음. 단 새 MOCK 질문 풀은 반드시 checkGenerationBlock 단위 테스트로 통과를 강제하고, coach-mock의 처방적 문구('먼저~그래서~' 연결어 템플릿) 재사용은 금지할 것. Bridge to Canvas는 invariant risky라 자동삽입 금지·firstDraft 캔버스전용 가드를 코드/테스트로 못박은 뒤 build. Idea Beads는 가치는 높으나 드래그 a11y+신규 의존성(@dnd-kit 미설치)으로 가장 비싸니 비-드래그 폴백 MVP로 마지막에.

## A.structure — 구조 잡기

_추상적인 "구조·논리"를 만질 수 있는 블록으로 바꾼다. 장르별 빈 골격(라벨만, 내용 0)을 학생이 직접 채우고 → 문단 블록을 드래그로 재배치하고 → 흐름 지도로 연결의 끊김을 눈으로 보게 한다. 골격·지도·아이콘은 전부 "비계"일 뿐 한 문장도 생성하지 않으며, 채워진 블록은 그대로 \n\n 구분 본문으로 합성돼 기존 코치 루프(CoachClient)·과정로그에 무손실로 들어간다._

### 장르별 빈 개요 골격 (Outline Skeleton)  ·  effort M · 검증: ✅ safe / moderate → **build**

- **무엇**: 글쓰기 시작 시 '개요 먼저' 또는 '바로 쓰기'를 고른다. '개요 먼저'를 고르면 장르(논설/설명/감상)에 맞는 빈 슬롯 카드 묶음이 펼쳐진다. 논설=[주장][근거][근거][예상 반론][결론], 설명=[무엇을][과정·원리][영향·의미][정리], 감상=[첫인상][그렇게 느낀 이유][나에게 연결]. 각 슬롯은 라벨 + '여기에 네 생각을 한 줄로' placeholder + 빈 입력칸만 갖는다. 슬롯 안에 예시 문장·모범 답·추천 표현은 절대 없다 — 골격은 '무엇을 쓸 자리인지'만 알려준다. 슬롯은 추가/삭제 가능(근거 칸 +).
- **왜 즐거운가**: 백지 공포(빈 textarea 막막함)를 '칸 채우기' 게임으로 바꿔 진입 마찰을 없앤다. 장르 구조가 머릿속이 아니라 화면에 미리 깔려 있어 '뭘 어떤 순서로 써야 하지'를 스스로 깨우치게 된다. 칸을 하나 채울 때마다 진척이 눈에 보여 작은 성취가 쌓인다.
- **대필 안전 보장**: 슬롯은 라벨·placeholder·빈 입력칸으로만 구성된 정적 템플릿(클라 상수)이라 AI 호출이 없고 모델이 개입할 표면 자체가 없다. placeholder는 '주장 한 줄' 같은 자리 안내일 뿐 베껴 쓸 완성/예시 문장이 아니다(coach-prompt GENERATION BLOCK·checkGenerationBlock의 금지 대상과 형식이 다름). 모든 칸 내용은 100% 학생 키 입력. process-log의 authorIsStudent:true·coachWroteSentences:false 불변식과 충돌 없음.
- **재사용**: Canvas.tsx, coach.module.css, icons.tsx, rubric-criteria.ts, data/scoring.ts(Assignment.genre)
- **신규 작업**: app/lib/outline-templates.ts(순수: 장르→슬롯 라벨/placeholder 배열, 내용 0), OutlineSkeleton.tsx(슬롯 카드 렌더 + 추가/삭제), 장르 자동 매핑(Assignment.genre→템플릿, 미매칭 시 범용 [도입][전개][정리])
- **검증 근거(불변식)**: 검증 완료. 슬롯은 클라 상수 템플릿(라벨+placeholder+빈칸)으로 AI 호출 표면이 없고, 모든 내용은 100% 학생 키 입력이다. process-log.ts:31-32의 coachWroteSentences:false·authorIsStudent:true 리터럴 불변식과 충돌 없음. 단 한 가지 risky 씨앗: placeholder가 '논쟁의 양면을 한 줄로'를 넘어 베껴 쓸 수 있는 완성 예시 문장으로 변질되면 coach-prompt.ts:79('예시 문장 절대 제공 금지')의 정신을 우회한다. checkGenerationBlock은 서버 nudge만 검사하므로 클라 정적 템플릿은 가드 사각지대 — placeholder 문구는 '자리 안내'로 고정하고 코드리뷰로 동결해야 안전 유지. 현 설계는 이를 명시하므로 safe.
- **수정/보류 노트**: placeholder를 '완성 문장 톤'이 아니라 '무엇을 쓸 자리'로 못박는 린트/리뷰 규칙을 newWork에 추가하라(가드 사각지대 보완). 장르 자동매핑은 data/scoring.ts Assignment.genre가 자유 문자열('설명문' 등)이라 enum 매칭이 아닌 키워드/폴백 매핑 필요 — 이미 newWork에 '미매칭 시 범용 [도입][전개][정리]'로 반영됨.

```
┌ 개요 먼저 ───────────────┐
│ ① 주장   [____________]   │
│ ② 근거   [____________] + │
│ ③ 반론   [____________]   │
│ ④ 결론   [____________]   │
│      [블록으로 펼치기 →]   │
└──────────────────────────┘
```

### 문단 블록 드래그 재배치 (Reorder)  ·  effort M · 검증: ✅ safe / moderate → **build**

- **무엇**: 채운 개요 슬롯(또는 이미 쓴 글의 \n\n 문단)을 각각 드래그 핸들이 달린 블록 카드로 본다. 카드를 위아래로 끌어 순서를 바꾸면 글의 전개 순서가 즉시 재배열된다. 키보드(↑/↓ + Enter)로도 이동 가능. 각 카드 상단엔 그 블록이 어떤 역할인지(주장/근거/…) 칩만 표시. 재배치 결과는 splitParagraphs의 역연산(블록을 \n\n로 join)으로 본문 문자열로 합성된다.
- **왜 즐거운가**: '구조를 바꾼다'가 글 전체를 다시 쓰는 게 아니라 카드 몇 개를 끌어 옮기는 손맛 있는 동작이 된다. 결론을 맨 앞으로 옮겨 보는 실험을 비용 없이 할 수 있어 '구조는 고정이 아니라 내가 정하는 것'을 체득한다.
- **대필 안전 보장**: 드래그는 학생이 이미 쓴 블록의 순서만 바꾼다 — 새 텍스트 생성·문장 수정 전무. 블록 내용은 학생 입력 그대로 보존되고 join만 한다. AI 호출 없음. 어떤 블록을 어디로 옮길지는 전적으로 학생 선택(coach-prompt '어떻게는 학생이 정한다' 원칙과 일치).
- **재사용**: paragraphs.ts(splitParagraphs / 역연산 join), coach.module.css(카드/그립 스타일 .grip 재활용), utils.ts(cn, scrollBehavior), RevisionToggle.tsx(ARIA tablist·화살표키 키보드 패턴 참고)
- **신규 작업**: BlockReorder.tsx(HTML5 drag 또는 pointer 기반 재배치 + 키보드 이동 + reduced-motion 가드), app/lib/blocks.ts(순수: Block[]↔body 양방향 변환, 빈 블록 폴백), 역할 칩 매핑(블록 index→템플릿 라벨)
- **검증 근거(불변식)**: 드래그는 학생이 이미 쓴 블록의 순서만 바꾸고 내용 생성·수정이 전무하다. blocks→body는 \n\n join 뿐이라 학생 저작 증거(coach-session draftHistory)를 그대로 보존. '어떻게는 학생이 정한다'(coach-prompt.ts:65) 원칙과 정합. 불변식 위반 경로 없음.
- **수정/보류 노트**: paragraphs.ts에는 join 역연산이 없음을 확인(splitParagraphs만 존재, line 9-16). 따라서 blocks↔body 라운드트립은 전부 new work이며, splitParagraphs가 trim+빈줄제거를 하므로 단순 역연산이 아님 — 원문 그대로 복원이 불가하다(문단 내 단일 개행/선행 공백 소실 가능). blocks.ts는 '학생이 입력한 블록 배열'을 1차 소스로 삼고 body는 파생값으로 두는 단방향 모델을 권장(본문→블록 역변환은 손실 허용 표시). RevisionToggle.tsx의 화살표키 패턴 재사용 타당.

```
⠿ [주장] 인공지능은…       
⠿ [근거] 첫째 이유는…   ↕ 드래그
⠿ [결론] 따라서…           
```

### 흐름 지도 — 연결 끊김 비주얼 (Flow Map)  ·  effort L · 검증: ⚠️ risky / hard → **modify**

- **무엇**: 블록들을 세로 흐름으로 그리고 블록 사이마다 '이음 마디'를 둔다. 학생이 인접 두 블록의 논리 관계를 [그래서]/[하지만]/[예를 들어]/[?(아직 안 정함)] 칩 중에서 직접 고른다. '?'로 남은 마디는 점선+레몬 점으로 '여기 다리가 비어 있어' 신호를 준다. 코치 점검을 돌리면 구조·논리 영역 nudge가 이 빈 마디 근처로 스크롤·플래시되어 어디를 손볼지 한눈에 보인다. 지도는 어떤 연결어도 대신 제안하지 않고, 선택지 칩(관계 유형)만 준다.
- **왜 즐거운가**: '논리 흐름'이라는 추상 개념이 다리가 놓인/빈 시각적 지도가 된다. 빈 마디가 곧 '다음 할 일'이라 막힘 없이 진척한다. 코치 nudge가 본문 위치로 점프해 붙어 '추상적 지적'이 '여기 이 자리'로 구체화된다.
- **대필 안전 보장**: 마디 칩은 관계 '유형' 라벨(그래서/하지만 등)일 뿐 학생이 쓸 연결 문장이 아니다 — 학생은 칩을 골라 '관계를 인지'할 뿐 문장은 직접 쓴다. 코치 nudge는 기존 coach API(스키마·checkGenerationBlock 가드 통과분)만 표시하므로 대필 누출 경로 없음. 지도는 빈 마디를 '표시'할 뿐 채워주지 않는다.
- **재사용**: AnnotatedBody.tsx(focusFeedbackArea scrollIntoView+flash 패턴), feedback-anchors.ts(feedbackAreaId 공유 anchor), annotate.ts(인용구→본문 verbatim 매칭으로 nudge↔블록 연결), NudgeCard.tsx, coach.module.css(flash·점선·레몬 액센트), icons.tsx(loop=구조·논리 아이콘)
- **신규 작업**: FlowMap.tsx(세로 블록+이음 마디 렌더, 빈 마디 점선 강조), 관계칩 상태(블록쌍별 선택, localStorage 영속), nudge→블록 anchor 매핑(annotate 재사용)
- **검증 근거(불변식)**: 관계칩(그래서/하지만/예를 들어)은 '유형 라벨'이라 그 자체로는 베껴 쓸 문장이 아니어서 형식상 안전하다. 그러나 risky로 본다: (1) 칩 선택이 곧 '연결어 제안'으로 미끄러지기 쉽다 — '그래서'를 고르면 학생이 그 접속사를 그대로 본문에 옮겨 적게 되어 사실상 전이 표현을 떠먹이는 경계에 선다(coach-prompt.ts:81 '추천 표현 금지'의 회색지대). (2) '빈 마디=다음 할 일' 신호는 안전하나, 마디에 코치 nudge를 붙일 때 그 nudge가 colonHandsOverSentence/listHandsOverContent 가드를 통과한 정당 코칭이어야 하며 클라가 위치만 매핑해야 한다. annotate.ts(verbatim 매칭)·feedback-anchors.ts(feedbackAreaId, 검증됨)·AnnotatedBody focusFeedbackArea 재사용은 누출 경로를 새로 열지 않으므로 그 부분은 안전.
- **수정/보류 노트**: safe화: 관계칩을 '학생이 본문에 쓸 연결어'가 아니라 '두 블록의 논리 관계를 학생이 스스로 분류/인지하는 메타 라벨'로 명확히 프레이밍하고, 칩 텍스트를 본문에 자동 삽입하는 어떤 동작도 금지(복사 버튼·자동 주입 X). 칩은 '관계가 비었다'를 비추는 진단 도구일 뿐 연결 문장은 학생이 직접 쓰게 둔다. 또한 nudge→블록 anchor 매핑은 annotate verbatim 매칭이 0건일 때 plain 폴백(annotate.ts 설계)을 그대로 상속해 오매칭 시 조용히 비활성. hard 사유: 코치 응답(영역 단위)을 블록 인접쌍(마디)에 정렬하는 매핑이 비자명하고, 점선/레몬점 스타일은 coach.module.css에 .dashed류가 없어 신규 CSS 필요. 가치는 높으나 다른 4개 이후 마지막에.

```
[주장]
  └ 그래서 ↓
[근거]
  └ ?  ····← 다리 비어있어 (레몬점)
[결론]
```

### 개요→본문 매끄러운 전환 + 기존 코치 루프 합류  ·  effort M · 검증: ✅ safe / moderate → **build**

- **무엇**: 개요/블록 모드에서 '이대로 쓰기'를 누르면 채운 블록들이 \n\n 구분 본문으로 합성돼 기존 Canvas(노트형 textarea)에 그대로 들어가고, CoachClient의 write→checking→nudge→growth 루프가 평소처럼 이어진다. 반대로 본문에서 '구조 보기'를 누르면 현재 본문을 splitParagraphs로 블록으로 되돌려 재배치/흐름 점검을 할 수 있다. 두 뷰는 같은 데이터(body 문자열)의 다른 표현이라 왕복해도 학생 글이 손실되지 않는다.
- **왜 즐거운가**: 구조 잡기가 별도 도구가 아니라 글쓰기 흐름의 한 렌즈로 녹아든다. '개요로 시작 → 살 붙이기 → 막히면 다시 구조로' 같은 실제 작가의 왕복을 마찰 없이 지원한다. 모드 전환이 곧 사고의 줌인/줌아웃.
- **대필 안전 보장**: 전환은 순수 문자열 변환(blocks↔body)만 — 생성·수정 없음. 합성된 body는 전부 학생 입력의 join이라 coach-session draftHistory(학생 저작 증거)·process-log 불변식을 그대로 만족. 기존 코치 API 계약을 변경하지 않으므로 3중 방어선(프롬프트·가드·라우트) 무손상 상속.
- **재사용**: CoachClient.tsx(상태머신·영속·복원·재시도 배선 그대로), Canvas.tsx, paragraphs.ts, coach-session.ts(createSession/recordRevision), BottomSheet.tsx(모드 토글 시트)
- **신규 작업**: body↔blocks 라운드트립 보장(빈 줄/단일 개행 보존 테스트), '구조 보기/이대로 쓰기' 뷰 토글 + 모드 상태(write 단계 안의 서브상태), CoachClient ASSIGNMENT 데모값을 장르 주입으로 받도록 작은 seam 추가
- **검증 근거(불변식)**: 전환은 순수 문자열 변환(blocks↔body)만이며 생성·수정이 없다. 합성 body는 전부 학생 입력의 join이라 coach-session draftHistory·process-log 불변식 만족. 기존 coach API 계약을 바꾸지 않아 3중 방어선(coach-prompt GENERATION BLOCK 검증됨 :74-86 / checkGenerationBlock 검증됨 :163-206 / route 재호출·502)을 무손상 상속. CoachClient의 첫 페인트 빈 캔버스 불변식(:360)과도 정합.
- **수정/보류 노트**: 라운드트립 무손실은 보장 불가(splitParagraphs가 trim/빈줄drop). '무손실'을 '학생 블록 배열이 1차 소스이고 body는 파생'으로 재정의하면 실현 가능. CoachClient ASSIGNMENT는 :54-62에 하드코딩 확인 — 장르 주입 seam은 주석(:52-53 '실서비스는 프로필/과제에서 주입')에 이미 예고돼 작은 prop 추가로 충분. 이 기능이 나머지를 코치 루프에 연결하는 통합 핀이므로 Skeleton 직후 우선 배치.

```
[개요/블록]  ⇄  [본문 캔버스]
   같은 body, 두 렌즈 · 왕복 무손실
```

### 구조 진척 칩 — '뼈대 완성도' 가시화  ·  effort S · 검증: ✅ safe / easy → **build**

- **무엇**: 개요 모드 상단에 채운 슬롯 수 / 전체 슬롯, 연결한 마디 수 / 전체 마디를 작은 진척 칩(막대 아님, 숫자도 점수 아님)으로 보여준다. 예: '뼈대 4칸 중 3칸', '다리 2개 중 1개 연결'. 모두 채우면 레몬 펄스로 '뼈대 섰어 — 이제 살을 붙일 차례' 마이크로 카피. 이는 글자수 진척바(progress.ts)와 별개로 '구조 자체의 완성도'를 따로 비춘다.
- **왜 즐거운가**: 구조 작업이 끝없는 막연함이 아니라 '몇 칸 남았다'는 분명한 목표가 된다. 완성 순간의 작은 축하가 다음 단계(본문 쓰기)로 자연스레 밀어준다. 코칭 톤(잘한 점부터·격려)과 정합.
- **대필 안전 보장**: 칩은 학생이 채운 칸/연결 '개수'를 셀 뿐 내용 평가·생성이 전혀 없다. AI 호출 없음. 숫자는 채점 점수가 아니라 단순 카운트라 '점수 비노출' 원칙과도 무관하게 안전.
- **재사용**: progress.ts(밴드 색 매퍼 어법 참고), GrowthBars.tsx(수치 숨김·세그먼트 시각 어법 참고), coach.module.css(segGain 레몬 펄스·reduced-motion 가드), utils.ts(cn)
- **신규 작업**: OutlineProgress.tsx(채운 슬롯/연결 마디 카운트 칩 + 완성 마이크로 카피), 완성 펄스 애니메이션(기존 segPop 재사용)
- **검증 근거(불변식)**: 칩은 채운 칸/연결 개수를 셀 뿐 내용 평가·생성이 없다. 표시 숫자는 채점 점수(0~20)가 아니라 단순 카운트라 '점수 비노출' 원칙(coach-prompt.ts:133)과 무관하게 안전. AI 호출 없음. 코칭 톤(칭찬 먼저·격려)과 정합.
- **수정/보류 노트**: coach.module.css에 .segGain·segPop 키프레임 존재 확인(line 132-156) → 레몬 펄스는 기존 애니메이션 재사용으로 즉시 가능. reduced-motion 가드도 동일 파일에 있음(:185). 가장 저비용·고확실 — 먼저 지어 빠른 win.

```
뼈대 3/4 · 다리 1/3   [● ● ● ○]
   ↑ 다 채우면 레몬 펄스 + '뼈대 섰어!'
```

**이 영역 우선 추천**: 먼저 지을 순서: (1) 구조 진척 칩(effort S, 가드 무관 safe, .segGain/segPop 기존 애니 재사용으로 즉시 — 빠른 win). (2) 장르별 빈 개요 골격 — 이 영역의 핵심 진입 가치이며 가드 사각지대(클라 정적 placeholder는 checkGenerationBlock이 검사 안 함)만 '자리 안내 문구 동결' 리뷰 규칙으로 막으면 safe. (3) 개요→본문 전환 — 나머지를 검증된 CoachClient 루프·과정로그에 무손상으로 연결하는 통합 핀(API 계약 불변, ASSIGNMENT 주입 seam은 이미 예고됨). 그 다음 (4) 블록 드래그 재배치 — 단, paragraphs.ts에 join 역연산이 없고 splitParagraphs가 trim/빈줄drop을 하므로 '학생 블록 배열을 1차 소스로, body는 파생'으로 모델링해 라운드트립 손실 주장을 정직하게 한정해야 함. 마지막 (5) 흐름 지도 — 가치는 가장 높지만 유일하게 risky(관계칩이 연결어 떠먹임으로 미끄러질 위험)이고 effort L(영역 단위 nudge를 블록 인접쌍에 매핑하는 비자명 정렬 + 점선/레몬점 신규 CSS). 칩을 '연결어 제안'이 아닌 '학생이 스스로 논리관계를 분류하는 메타 라벨'로 못박고 본문 자동삽입을 전면 금지해야 safe로 내려옴. 영역 전체 결론: 4겹 불변식(프롬프트·스키마 가드·route·과정로그 리터럴)을 모두 실파일로 재확인했고, 이 설계는 '비계는 생성하지 않는다'는 선을 대체로 지킨다 — Flow Map만 modify 후 build.

## A.drafting — 초고 몰입

_초고는 "평가받는 자리"가 아니라 "쏟아내는 자리"가 되어야 한다. 점수·코치·첨삭을 의도적으로 숨긴 집중 모드를 기본값으로 두고, 막힘이 감지될 때만 답이 아닌 질문 1개를 내밀며, 분량·리듬을 부드럽게 시각화한다. 음성 모드는 STT를 자동 채택하지 않고 "학생이 받아쓴 초안을 학생이 직접 손보는" 과정으로 설계해 authorIsStudent 불변식을 화면과 로그 양쪽에서 증명한다. 모든 보조는 기존 순수 모듈(progress/coach-session/process-log)과 Canvas/BottomSheet/coach API 가드를 재사용한다._

### 집중 모드(Zen Draft) — 점수·코치·첨삭 전부 숨김 기본값  ·  effort S · 검증: ✅ safe / easy → **build**

- **무엇**: /coach 진입 시 첫 화면을 '집중 모드'로 둔다. Canvas 전체화면 + 바텀시트는 hidden, 점수·막대·nudge·[봐줘] CTA 일체 비노출. 상단에는 끄고 켤 수 있는 작은 토글('집중')과, 글자수만 은은하게(Canvas의 기존 cp 카운터 재사용, 평소 ink-5 톤·평가어 없음)표시. 학생이 스스로 '코치 부르기'를 누르기 전까지는 어떤 피드백도 화면에 들어오지 않는다. 토글 상태는 localStorage 'pwc-draft-focus-v1'에 영속해 새로고침해도 유지. write phase 안의 하위 모드라 기존 reducer는 그대로 두고 boolean state 하나만 추가한다.
- **왜 즐거운가**: 평가 불안의 1차 원인은 '쓰는 동안 누가 채점하고 있다'는 감각이다. 이걸 물리적으로 제거하면 초고를 막힘 없이 쏟아낼 수 있다. 빈 캔버스 + 침묵이 곧 '네 글은 아직 평가 대상이 아니야'라는 메시지가 된다.
- **대필 안전 보장**: 집중 모드는 보조를 '빼는' 방향이라 본질적으로 대필 위험이 0이다. 코치 호출 자체를 학생이 명시적으로 트리거할 때만 일어나므로, AI는 학생이 부르기 전엔 단 한 글자도 산출하지 않는다. 캔버스 입력은 항상 학생 소유(Canvas.tsx 주석 그대로).
- **재사용**: app/components/coach/Canvas.tsx, app/components/coach/CoachClient.tsx, app/coach/coach.module.css
- **신규 작업**: focusMode boolean state + 상단 토글 UI, localStorage 'pwc-draft-focus-v1' 영속(SSR 가드, 기존 persist 패턴 복제), 집중 모드일 때 BottomSheet position=hidden 강제 + CTA 숨김 분기
- **검증 근거(불변식)**: 보조를 '빼는' 방향이라 대필 경로가 구조적으로 0이다. AI 호출은 학생이 명시적으로 '코치 부르기'를 누를 때만 발생하고, 그 전엔 빈 캔버스에 단 한 글자도 산출되지 않는다. 이는 CoachClient.tsx:14의 '코치가 준 문장 0개' 증명, :360 '첫 페인트는 항상 빈 캔버스' 불변식과 정확히 정합한다. focusMode는 boolean state 하나라 검증된 reducer/가드 경로를 전혀 건드리지 않는다.
- **수정/보류 노트**: 거의 그대로 build. 단 두 가지만 못박을 것: (1) localStorage 키는 'pwc-' 프리픽스 규약(storage.ts 계약)을 따르되 기존 키와 충돌 없는지 확인 — 브리프의 'pwc-draft-focus-v1'은 안전. (2) '집중 모드 기본값 ON'은 신규 사용자가 코치 기능 존재 자체를 모를 위험이 있으니, 최초 1회는 '코치 부르기' CTA를 은은히 노출하거나 온보딩 힌트를 둘 것(불변식과 무관한 UX 보강).

```
[집중 ●]            327자
┌────────────────────────┐
│ 화산은 땅속 마그마가...   │
│ █                       │
│ (코치/점수/막대 전부 없음) │
└────────────────────────┘
        ( 코치 부르기 )  ← 학생이 누를 때만 등장
```

### 막힘 감지 → 답이 아닌 질문 1개(Unblock Nudge)  ·  effort M · 검증: ✅ safe / moderate → **build**

- **무엇**: 집중 모드에서 N초(기본 25s, reduced-motion/저사양 무관 순수 타이머) 동안 입력이 없고 커서가 멈추면, 화면 하단에 아주 작게 '잠깐 막혔어?' 칩 하나만 띄운다. 누르면 코치 API가 아니라 '클라이언트 상수 질문 풀'에서 현재 focus 영역(없으면 마지막 작성 문맥)에 맞는 소크라테스식 질문 1개를 보여준다. 예: '지금 설명하려던 게 한 문장으로 뭐였지?' '여기서 독자가 가장 궁금해할 건?'. 질문은 절대 답을 담지 않으며, 닫으면 다시 침묵으로 복귀. 타이핑 재개 시 칩은 즉시 사라진다. 질문 풀은 영역×상황 매트릭스(AREAS 순서 재사용)로 사람이 작성한 고정 문장이라 모델 호출 0.
- **왜 즐거운가**: 막혔을 때 가장 큰 마찰은 '빈 화면 응시'다. 답을 주면 대필이지만, 질문 1개는 생각의 물꼬를 튼다. 강제 개입이 아니라 '필요하면 눌러'라 학생 통제감을 해치지 않는다. 한 번에 하나(킥 UX)라 압도되지 않는다.
- **대필 안전 보장**: 질문 풀이 모델 산출이 아니라 사람이 작성한 고정 상수라 대필 경로 자체가 없다. 그럼에도 안전벨트로, 질문 풀 상수를 빌드 타임에 coach-schema의 checkGenerationBlock(questionFieldIsDeclarative/WRITE_DIRECTIVE)로 단위 테스트해 '평서문·예시 문장이 섞이지 않음'을 회귀 차단한다. nudge처럼 NudgeCard의 평문 렌더 규약(dangerouslySetInnerHTML 금지)을 그대로 따른다.
- **재사용**: app/components/coach/NudgeCard.tsx, app/lib/nudge-priority.ts, app/lib/grading.ts(AREAS 순서), app/lib/coach-schema.ts(checkGenerationBlock — 테스트용)
- **신규 작업**: idle 타이머 훅(입력 onChange로 리셋, write phase + focusMode에서만 활성), 영역×상황 소크라테스 질문 풀 상수 파일(app/lib/unblock-prompts.ts, 순수), '잠깐 막혔어?' 칩 + 질문 1개 표시 UI, 질문 풀 invariant 단위 테스트
- **검증 근거(불변식)**: 질문 풀이 모델 산출이 아니라 사람이 작성한 빌드타임 고정 상수라 대필 생성 경로가 아예 없다. 브리프가 안전벨트로 제안한 'unblock-prompts.ts 상수를 checkGenerationBlock(coach-schema.ts:163)으로 단위 테스트'는 적절하다 — questionFieldIsDeclarative(:154)/WRITE_DIRECTIVE(:101)가 평서문·예시 혼입을 회귀 차단한다. NudgeCard의 평문 렌더(dangerouslySetInnerHTML 금지) 규약도 상속. 핵심 검증 포인트: 질문 풀 문장은 반드시 '?'로 끝나거나 SOFT_TAIL(:118 '볼까/어때') 꼴이어야 하고, 답을 미리 담은 유도(coach-prompt.ts:84)가 없어야 한다.
- **수정/보류 노트**: build하되 두 가지 강제: (1) 질문 풀 상수에 대한 invariant 단위 테스트를 '있으면 좋음'이 아니라 머지 차단 게이트로 둘 것 — 사람이 작성한 문장이라도 '예를 들면 화산은~' 같은 떠먹임이 슬쩍 들어가면 불변식이 깨진다. (2) idle 타이머는 본문 텍스트를 절대 어디로도 전송하지 않음(로컬 메타데이터만)을 코드 주석+테스트로 명시. 영역 매칭은 AREAS 순서(grading.ts:12)를 쓰되, write phase에서는 아직 baseline 점수가 없으므로 'focus 영역 없음' 폴백 질문이 일반적이라는 점을 설계에 반영.

```
(25초 침묵 후)
              ┌─ 잠깐 막혔어? ─┐
              └────────────────┘ ← 탭하면
┌ 코치의 질문 ───────────────┐
│ 지금 설명하려던 걸 한 문장으로│
│ 말하면 뭐야?                │
│            (닫기)          │
└────────────────────────────┘
```

### 타이핑 리듬 & 분량 시각화(Flow Bar) — 평가어 없는 진척감  ·  effort M · 검증: ✅ safe / moderate → **modify**

- **무엇**: 캔버스 하단에 얇은 바 하나. 두 신호를 겹쳐 보여준다: (1) 목표 분량 대비 진척 — 기존 computeProgress(progress.ts)의 5밴드를 그대로 소비하되, 집중 모드에서는 '조금 길어요/줄여요' 같은 평가 라벨을 끄고 밴드 '색'만 은은히 쓴다(bullseye=레몬 글로우). (2) 타이핑 리듬 — 최근 30초 입력 활동을 작은 점/물결로 표현해 '지금 흐르고 있다'는 감각만 준다(속도 비교·정체 경고 없음). 집중 모드를 끄면 progress.ts의 원래 라벨(거의 다 왔어요 등)이 복귀한다. target_char_count가 null이면(현재 데모 기본값) 분량 바는 비노출되고 리듬 점만 남는다.
- **왜 즐거운가**: 글쓰기는 진척이 안 보여서 지친다. 숫자·등급 대신 '색이 차오르고 물결이 흐르는' 비언어적 피드백은 불안을 안 키우면서 몰입(flow)을 강화한다. bullseye에 닿는 순간의 레몬 글로우가 작은 보상이 된다.
- **대필 안전 보장**: 분량/리듬은 학생 입력의 메타데이터(글자수·입력 타임스탬프)만 쓰고 본문 내용을 모델로 보내지 않는다. 어떤 텍스트도 산출하지 않으므로 대필과 무관. 리듬 점은 활동 유무만 표현하고 '더 빨리 써' 같은 압박 카피를 절대 넣지 않는다(미성년 좌절 방지 톤).
- **재사용**: app/lib/progress.ts(computeProgress + getProgressBarClass), app/components/ScoreForm.tsx(진척바 렌더 패턴), app/coach/coach.module.css(seg/stagger pop 애니메이션), app/components/coach/Canvas.tsx(cp 글자수)
- **신규 작업**: focus 모드용 라벨 억제 + 색만 쓰는 progress 렌더 wrapper, 최근 입력 타임스탬프 링버퍼 → 리듬 점/물결 렌더(reduced-motion 가드), target null일 때 분량 바 graceful 비노출
- **검증 근거(불변식)**: 글자수·입력 타임스탬프 메타데이터만 사용하고 본문을 모델로 보내지 않으며 어떤 텍스트도 산출하지 않는다. computeProgress(progress.ts:23)는 순수 함수로 점수 노출이 아닌 분량 밴드만 반환 — 점수 비노출 불변식과 정합. '더 빨리 써' 류 압박 카피를 배제한다는 미성년 좌절 방지 톤(revision.ts:61)도 준수.
- **수정/보류 노트**: build 가치는 있으나 두 가지 검증 결과 조정 필요: (1) 현재 데모 ASSIGNMENT.target_char_count는 null(CoachClient.tsx:58)이고 progress.ts:28은 target null이면 그대로 null 반환 → 분량 바는 데모에서 '항상 비노출'이다. 즉 이 기능의 절반(분량 바)은 실과제 주입 전까지 빈 껍데기. 브리프도 'target null이면 리듬 점만'이라 인지하고 있으나, 실질 가치가 '리듬 점'에만 걸리므로 분량 바는 실과제 주입(별도 선행 작업)과 묶어 단계화할 것. (2) progress.ts의 label을 '끄고 색만' 쓰려면 wrapper에서 ProgressState.label을 무시하는 것이라 모듈 수정 불필요 — 좋다. 리듬 점은 활동 유무만 표현(속도 비교 금지)을 코드로 강제.

```
글자: ▓▓▓▓▓▓▓░░  (bullseye 레몬 글로우)
리듬: · ·· · ··· ·  (흐르는 중)
— 라벨 텍스트 없음 —
```

### 음성으로 말하기 모드 — '받아쓰고 내가 손본다'(대필 아님 보장)  ·  effort L · 검증: ⚠️ risky / hard → **modify**

- **무엇**: voice 채널을 mock alert에서 실제 모드로 승격하되, STT 결과를 본문에 자동 삽입하지 않는다. 플로우: ① 학생이 말하면 브라우저 Web Speech API(또는 추후 서버 STT)로 받아쓴 텍스트가 '받아쓰기 임시 영역(보조 패널)'에만 쌓인다. ② 본문 캔버스는 비어 있고, 학생이 임시 영역의 조각을 보며 '내가 직접' 캔버스에 옮겨/고쳐 쓴다(드래그-삽입이 아니라 타이핑 유도, 한 번에 한 조각 '본문에 넣기' 버튼은 제공하되 넣은 직후 편집 가능 상태로). ③ 화면 상단 영구 배지: '🎤 네 목소리를 네가 받아쓴 거예요 — 코치 문장 0개'. 음성 채널은 동의 게이트를 통과해야만 활성(아래 동의 항목 참조). 권한 거부/미지원 브라우저는 친절 폴백(타이핑 권유, ScoreForm 폴백 패턴).
- **왜 즐거운가**: 말이 글보다 쉬운 학생(쓰기 불안·난독·초안 공포)에게 '일단 말로 쏟아내기'는 강력한 잠금 해제다. 동시에 '내 말 → 내 글'이라 저작 주체감이 오히려 강해진다. 받아쓰기 조각을 보며 다듬는 행위 자체가 자연스러운 초고 정리 과정이 된다.
- **대필 안전 보장**: 핵심 설계: STT 산출물은 '코치/AI 문장'이 아니라 '학생 본인 발화의 기록'이며, 그조차 본문에 자동 안착시키지 않고 학생이 캔버스에서 직접 옮겨/편집해야 한다 → authorIsStudent: true가 깨지지 않는다. process-log에 captureMode:'voice-self'를 증거로 남기되 coachWroteSentences:false/authorIsStudent:true 리터럴은 절대 런타임 분기로 바꾸지 않는다(타입 고정 유지). STT 텍스트는 coach API로 보내지 않으므로 모델 산출과 무관. 배지로 교사·학생 모두에게 '대필 아님'을 가시화.
- **재사용**: app/components/UniversalCapture.tsx(voice 채널 슬롯 + 폴백 alert 패턴), app/components/coach/Canvas.tsx, app/components/coach/BottomSheet.tsx(받아쓰기 임시 패널), app/lib/process-log.ts(증거 모델), app/lib/coach-session.ts(draftHistory에 학생 편집본만 기록)
- **신규 작업**: Web Speech API 래퍼(권한·미지원·중단 폴백, 'use client'), 받아쓰기 임시 영역(보조 패널) UI + '본문에 넣기 후 편집' 인터랙션, '네 목소리를 네가 받아쓴 거예요 — 코치 문장 0개' 영구 배지, process-log captureMode 증거 필드(불변식 리터럴은 불변)
- **검증 근거(불변식)**: 대필 불변식(코치=AI 문장) 관점에서는 STT가 학생 본인 발화라 AI 생성이 아니므로 직접 위반은 아니다. 그러나 risky로 보는 이유: (1) authorIsStudent 경계 문제 — STT 자동 받아쓰기는 '학생이 직접 썼다'의 증명 모델(process-log.ts:7 '런타임 분기 금지')과 정합성이 미묘하다. 브리프가 '본문 자동삽입 금지, 학생이 직접 옮겨/편집'으로 완화한 설계는 옳은 방향이나, '본문에 넣기 버튼'이 사실상 원클릭 붙여넣기가 되면 손보기 의식이 형식화돼 경계가 흐려진다. (2) 더 큰 리스크는 대필이 아니라 프라이버시/동의다 — 음성은 신규 개인정보로, 미성년 보호자 트랙(age-policy needsGuardianConsent) 및 AI학습 분리 옵트인(consent.ts 기본 OFF)을 충족해야 하는데 현 ConsentState에 음성 항목이 없다.
- **수정/보류 노트**: 현 단계 build 반대, modify로 범위 축소·선행조건 분리. safe로 만드는 조건: (1) '본문에 넣기'를 원클릭 붙여넣기가 아니라 '한 조각씩 보면서 학생이 직접 타이핑'을 기본으로 하고, 붙여넣기를 제공하더라도 삽입 직후 강제 편집 상태 + process-log에 captureMode:'voice-self' 증거를 남길 것. 단 coachWroteSentences:false/authorIsStudent:true 리터럴(process-log.ts:31-32)은 절대 런타임 분기로 바꾸지 말 것 — captureMode는 별도 신규 필드로만 추가. (2) 동의 게이트 선행 필수: ConsentState에 음성/녹음 항목 추가 + 미성년 보호자 동의 + AI학습 분리 옵트인(기본 OFF)을 통과해야만 voice 채널 활성. 이게 별도 EPIC급 작업이라 hard. UniversalCapture.tsx:48,269의 mock alert를 푸는 건 이 동의 인프라가 선행돼야 하므로, 음성은 동의 작업과 묶어 후속 단계로 빼고 지금은 drop에 가깝게 보류 권고.

```
🎤 네 목소리를 네가 받아쓴 거예요 · 코치 문장 0개
┌ 본문(내가 쓴다) ───────────┐
│ 화산은 마그마가 분출해서...  │
└────────────────────────────┘
┌ 받아쓰기 메모(임시) ───────┐
│ “화산은 음 마그마가 올라와서”│
│   [본문에 넣고 다듬기]      │
└────────────────────────────┘
```

### 초고 → 코치 전환 의식(Hand-off Ritual)  ·  effort S · 검증: ✅ safe / easy → **build**

- **무엇**: 집중 모드에서 학생이 '코치 부르기'를 누르는 순간을 의도적 전환점으로 디자인한다. 곧장 checking으로 넘기지 않고, 0.6초 짜리 부드러운 전환(coach.module.css 슬라이드업 재사용)과 함께 한 줄: '여기까지 네가 다 썼어. 이제 같이 볼까?'를 보여준 뒤 기존 checking → nudge 루프로 자연 합류. 이 전환에서 baseline 세션이 createSession으로 시작되고, 이후엔 기존 CoachClient reducer가 그대로 작동한다.
- **왜 즐거운가**: 초고(쏟아내기)와 코칭(다듬기)은 심리적으로 다른 모드다. 둘 사이에 작은 의식을 두면 모드 전환이 매끄럽고, '내가 다 썼다'는 성취를 먼저 인정받아 코칭을 방어적이지 않게 받아들인다. 잘한 점부터 짚는 코칭 톤의 워밍업.
- **대필 안전 보장**: 전환 카피는 고정 상수(칭찬·안내만, 문장 제안 없음). 이 단계에서도 AI는 아무것도 산출하지 않고, 이후 합류하는 루프는 이미 4겹 가드(prompt/schema/route/process-log)가 적용된 검증된 경로다. baseline은 학생 본문에서만 계산된다.
- **재사용**: app/components/coach/CoachClient.tsx(reducer write→checking, callCoach), app/lib/coach-session.ts(createSession), app/coach/coach.module.css(완료 슬라이드업 애니메이션)
- **신규 작업**: 전환 인터스티셜 1개(고정 카피 + 슬라이드 전환, reduced-motion 가드), focusMode→코칭 진입 시 createSession 트리거 배선
- **검증 근거(불변식)**: 전환 카피는 칭찬·안내만 담은 고정 상수로 문장 제안이 없고, 이 단계에서 AI는 아무것도 산출하지 않는다. 합류하는 write→checking 루프는 이미 4겹 가드(coach-prompt/coach-schema/route/process-log)가 적용된 검증 경로다. createSession(coach-session.ts)은 학생 본문에서만 baseline을 계산하므로 저작 증거 모델과 정합.
- **수정/보류 노트**: 그대로 build. 검증 시 확인할 1점: 기존 CoachClient는 [봐줘] CTA에서 직접 checking으로 dispatch하므로, 인터스티셜은 'CTA→0.6s 전환→기존 dispatch'를 감싸는 래퍼로 두고 reducer 액션은 추가하지 말 것(검증된 상태머신 불변 유지). reduced-motion 시 0.6s 전환을 즉시 스킵(utils.ts scrollBehavior 패턴).

```
( 코치 부르기 ) 탭
   ↓ 0.6s 슬라이드업
┌────────────────────────┐
│ 여기까지 네가 다 썼어.    │
│ 이제 같이 볼까?          │
└────────────────────────┘ → checking…
```

**이 영역 우선 추천**: 먼저 지을 것: (1) 집중 모드(Zen Draft) — easy·safe, 대필 위험 0, boolean state 하나로 검증된 reducer/가드를 안 건드리며 '평가 불안 제거'라는 이 영역의 핵심 가치를 즉시 실현. (2) 초고→코치 전환 의식 — easy·safe, 집중 모드와 짝을 이뤄 모드 전환을 완성하고 기존 [봐줘]→checking 경로를 래퍼로만 감싸 리스크 최소. 이 둘이 '쏟아내는 자리' 경험의 뼈대다.

다음: (3) 막힘 감지 Unblock Nudge — moderate·safe, 단 질문 풀 상수의 checkGenerationBlock 단위 테스트를 머지 차단 게이트로 강제하는 조건부 build.

조건부/후순위: (4) Flow Bar는 분량 바가 데모에서 target=null로 빈 껍데기(progress.ts:28)이므로 리듬 점만 선행하고 분량 바는 실과제 주입과 묶어 단계화. (5) 음성 모드는 risky·hard — 대필 자체보다 음성 신규 개인정보·미성년 보호자 동의·AI학습 분리 옵트인 인프라(consent.ts/age-policy.ts에 음성 항목 부재)가 선행돼야 하고 authorIsStudent 경계도 미묘하므로, 이번 영역에서는 보류하고 동의 인프라 EPIC과 묶어 후속으로 분리할 것.

## A.revising — 고쳐쓰기 강화

_현행 nudge 루프(write→checking→nudge→rechecking→growth)를 "고칠 위치"는 정확히 짚되 "고칠 문장"은 절대 주지 않는 즐거운 고쳐쓰기 경험으로 강화한다. 핵심 레버는 이미 존재하나 UI에서 미사용인 CoachNudge.paragraph_index(고칠 위치)를 캔버스에 시각적으로 앵커링하고, 고친 직후 영역별 성장을 즉각 막대로 되먹임하는 것이다. 모든 추가는 진단·질문·위치 표시만 하고 학생 문장은 학생이 쓴다는 불변식을 깨지 않는 가산적(additive) 배선이다._

### 문단 위치 앵커 — '여기를 고쳐봐' 하이라이트  ·  effort M · 검증: ✅ safe / hard → **build**

- **무엇**: 현재 nudge의 CoachNudge.paragraph_index가 가리키는 문단을 캔버스 textarea에 시각적으로 표시한다. textarea 위에 동일 폰트·줄간격의 read-only 오버레이 레이어를 깔고, 해당 문단 범위만 연블루 배경 밴드(--pb-1)로 칠한다. nudge 카드 진입 시 그 문단으로 부드럽게 스크롤(scrollBehavior 가드)하고 1회 flash(globals.css .feedback-flash 재사용). 절대 대안 텍스트를 오버레이에 넣지 않음 — 오직 '위치'만 색으로 표시. 문단 분리는 본문 \n\n 기준, paragraph_index가 범위를 벗어나면 표시 생략(조용한 폴백, annotate.ts의 폴백 철학 답습).
- **왜 즐거운가**: 지금은 nudge가 '몇 번째 문단'을 말로만 가리켜 학생이 글 안에서 눈으로 찾아야 하는 마찰이 있다. 색 밴드로 '바로 여기'가 보이면 어디를 만질지 즉시 알아 막힘이 줄고, 고칠 지점이 명확해 손이 빨리 움직인다.
- **대필 안전 보장**: 오버레이는 학생이 이미 쓴 본문(state.body)을 그대로 read-only로 비추기만 하며 어떤 텍스트도 추가·치환하지 않는다. 칠하는 것은 background-color뿐, 글자는 100% 학생 것. paragraph_index는 위치 정수일 뿐 문장 내용이 아니므로 checkGenerationBlock 표면 자체가 없다. 편집은 항상 밑의 실제 textarea(coach-canvas)에서만 일어난다.
- **재사용**: app/components/coach/Canvas.tsx, app/lib/utils.ts (scrollBehavior), app/globals.css (.feedback-flash + reduced-motion 가드), app/coach/coach.module.css, app/lib/coach-schema.ts (CoachNudge.paragraph_index)
- **신규 작업**: Canvas에 read-only highlight 오버레이 레이어 추가(textarea와 픽셀 정렬: 동일 padding/font/line-height, pointer-events:none, scroll 동기화), 본문→문단 범위 계산 순수 헬퍼 paragraphRange(body, index) (annotate.ts 옆에 배치, React 무의존), nudge phase 진입 시 해당 문단으로 스크롤+flash 트리거(부수효과는 CoachClient effect)
- **검증 근거(불변식)**: 오버레이가 칠하는 것은 background-color뿐이고 글자는 state.body(학생이 친 본문)를 read-only로 그대로 비춘다. paragraph_index(coach-schema.ts:17)는 0-based 정수 위치일 뿐 문장 내용이 아니라 checkGenerationBlock이 검사할 텍스트 표면 자체가 없다. 편집은 항상 밑의 실제 textarea(coach-canvas)에서만 일어난다. 단 절대 지켜야 할 선: 오버레이/밴드에 어떤 제안·예시 텍스트도 넣지 않고 위치만 색으로 표시. 이 선만 지키면 명백히 safe.
- **수정/보류 노트**: 핵심 실현 리스크: Canvas.tsx는 꾸밈 없는 단일 textarea(overlay 없음)이고 paragraphs.ts splitParagraphs는 trim+빈문단 제거 후 index를 0부터 재부여해 nudge의 paragraph_index를 raw 본문 char-offset으로 환원할 수 없다. 따라서 (a) trim/제거 없이 원문 char 범위를 보존하는 새 순수 헬퍼 paragraphRange(body,index)를 신설해야 하고(splitParagraphs 재사용 불가), (b) textarea와 픽셀 정렬되는 read-only 오버레이(동일 font/padding/line-height, pointer-events:none, scroll 동기화)를 만들어야 한다. textarea-위-오버레이 정렬은 한글 가변폭·줄바꿈·resize에서 어긋나기 쉬운 고전 난제라 hard. 현재 nudge 객체는 state.lastNudges+focusArea로 도출 가능해 데이터 접근은 OK. flash/scroll은 globals.css .feedback-flash, utils.scrollBehavior 그대로 재사용. build 권고하되 effort는 브리프의 M보다 L에 가깝다.

```
[캔버스]
  화산은 마그마가 분출하여...
  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  ← 연블루 밴드(이 문단을 고쳐봐)
  ▓ 그래서 화산은 위험하다. ▓
  우리 삶에는...
(밴드 위엔 어떤 제안 텍스트도 없음 — 위치만)
```

### 고친 글자만 빛나는 변화 디프(내가 바꾼 곳)  ·  effort M · 검증: ✅ safe / hard → **build**

- **무엇**: [고쳤어 ✓] 재점검 후 growth 단계에서, 직전 draft(session.draftHistory 마지막 전) 대비 이번 draft에서 '추가/변경된 구간'을 캔버스 오버레이에 레몬(--pullim-lemon) 언더라인으로 잠깐(예: 2.5s) 표시한다. 단어 단위 LCS 기반 diff로 added 구간만 강조(삭제는 표시 안 함 — 화면엔 현재 글만 존재). growth 카드에 '네가 N군데 손봤어' 같은 카운트 카피(숫자는 편집 위치 개수일 뿐 점수 아님).
- **왜 즐거운가**: 고쳐쓰기의 보람이 즉각 눈에 보인다. '내가 방금 무엇을 바꿨는지'가 레몬으로 반짝이면 노력→결과의 인과가 손에 잡혀 다음 수정으로 이어가는 동기가 생긴다. 성장막대(추상 수치)와 실제 편집(구체 위치)을 연결.
- **대필 안전 보장**: diff는 학생이 직접 친 두 draft(둘 다 authorIsStudent) 사이의 비교일 뿐, AI가 만든 텍스트는 입력에도 출력에도 없다. 강조 대상은 '학생이 쓴' added 토큰이며 코치는 비교·하이라이트만 한다. coachWroteSentences 불변식과 무관(런타임 분기 없음).
- **재사용**: app/lib/coach-session.ts (draftHistory — 직전/현재 본문), app/components/coach/Canvas.tsx (오버레이 레이어, 기능1과 공유), app/coach/coach.module.css (segGain pop 애니메이션 결 차용), app/lib/utils.ts (cn, scrollBehavior)
- **신규 작업**: 순수 word-diff 모듈 wordDiff(prev, next) → added 토큰 범위[] (LCS, React 무의존, 노드 테스트 가능), 오버레이에 added 범위 레몬 언더라인 + 자동 소멸 타이머(reduced-motion이면 애니 없이 정적 표시), growth 카드에 편집 위치 개수 카피 한 줄 추가
- **검증 근거(불변식)**: diff 입력은 sessionRef.draftHistory의 두 student draft(둘 다 authorIsStudent)이고 강조 대상은 학생이 친 added 토큰뿐. AI 생성 텍스트는 입력에도 출력에도 없어 coachWroteSentences 불변식(process-log.ts 리터럴)과 무관. 삭제는 표시 안 하고 현재 본문만 비추므로 누출 표면 없음. safe.
- **수정/보류 노트**: 두 리스크: (1) draftHistory가 reducer state가 아니라 sessionRef(useRef, CoachClient.tsx:462)에 있어 growth phase 렌더에서 직전/현재 draft를 꺼내 오버레이에 전달하는 배선 필요. recordRevision은 본문 변경 시에만 append하므로 '직전 draft'가 draftHistory[length-2]가 맞는지(같은 본문 재점검 케이스 제외)를 정확히 짚어야 회귀 없음. (2) 오버레이가 기능1과 동일한 hard textarea-정렬 레이어에 의존. 기능1을 먼저 지어 오버레이 인프라를 공유한 뒤 얹는 게 합리적. 순수 wordDiff(prev,next)→added 범위는 노드 테스트 가능하고 쉬움. 단독이면 L, 기능1 위면 M. build 권고하되 기능1 의존.

```
후 막대 ▰▰▰▱▱ ▲자람
캔버스: ...화산이 폭발하면 _용암이 흘러나와_ 위험하다.
                        ‾‾‾‾‾‾‾‾ 레몬(방금 네가 추가)
'이번엔 2군데 직접 손봤어'
```

### 영역별 진척 타임라인(고칠수록 차오르는 여정)  ·  effort S · 검증: ✅ safe / easy → **build**

- **무엇**: 바텀시트 nudge/growth 단계 상단에 4개 nudgeable 영역(과제 이해·내용 충실도·구조·논리·표현·문장)의 미니 진척 점/막대 행을 항상 표시한다. 각 영역: 미점검=빈 점, 코칭 중=현재 강조, 통과(>=PASS)=레몬 체크. baseline 대비 현재 scores로 toBarSegments(revision.ts) 사용, 숫자는 절대 노출 안 함. 한 영역 통과 시 그 점이 레몬으로 톡 채워지는 마이크로 애니메이션.
- **왜 즐거운가**: '한 호흡에 한 nudge' 원칙은 지키되, 지금 어디쯤이고 얼마나 남았는지 전체 여정이 보여 막연함이 사라진다. 영역 하나가 레몬으로 채워질 때의 작은 성취감이 루프를 게임처럼 만든다. 끝이 보이니 중도 이탈이 준다.
- **대필 안전 보장**: 진척 표시는 area 점수의 막대/점 시각화뿐이며 원점수 숫자 비노출(수치 숨김 계약 준수). 어떤 문장·예시·추천도 포함하지 않는다. 점수→막대 매핑은 기존 revision.ts toBarSegments 그대로라 새 누출 경로 없음.
- **재사용**: app/lib/revision.ts (toBarSegments, toBarFill), app/lib/nudge-priority.ts (영역 우선순위 일관성), app/components/coach/GrowthBars.tsx (세그먼트 시각 어법), app/coach/coach.module.css (seg/segCur/segGain), app/lib/grading.ts (AREAS 권위 순서)
- **신규 작업**: AreaProgressRail 컴포넌트(4영역 점/막대 행, weakAreas·통과 상태 반영), 통과 전환 시 점 채움 마이크로 애니메이션(reduced-motion 가드), SheetBody nudge/growth 상단에 배치(기존 currentNudge 카드 위)
- **검증 근거(불변식)**: area 점수를 revision.ts toBarSegments로 막대/점 시각화만 하고 원점수 숫자는 비노출(수치 숨김 계약 — coach-prompt.ts:133, process-log.ts:9 준수). 어떤 문장·예시·추천도 없음. 점수→막대 매핑이 기존 검증된 경로 그대로라 새 누출 경로 0. 명백히 safe.
- **수정/보류 노트**: 재사용도 최상: revision.ts(toBarSegments/toBarFill), GrowthBars 세그먼트 어법, coach.module.css(seg/segCur/segGain), grading.AREAS 권위 순서, nudge-priority가 이미 다 있음. 데이터(state.scores, state.baseline, PASS 임계)도 reducer state에 그대로 존재해 배선 최소. 새 AreaProgressRail 컴포넌트 + 통과 전환 마이크로 애니(reduced-motion 가드)만 신설. 가장 먼저 지을 quick win. effort S 정확.

```
과제이해 ●  내용 ◑(지금)  구조 ○  표현 ✓레몬
[NudgeCard …]
```

### 고치기 전 '내 계획' 한 줄 메모(생각 비계)  ·  effort M · 검증: ⚠️ risky / moderate → **modify**

- **무엇**: nudge 카드에서 유도질문을 읽은 뒤, [고쳤어 ✓] 누르기 전 학생이 '이번에 뭘 바꿔볼지' 자기 말로 한 줄 적는 선택적 의도 메모 칸을 둔다(예: '근거를 한 줄 더 넣겠다'). 이 메모는 session에 함께 기록되어 완료화면 과정 로그·교사 로그에 '학생이 세운 수정 계획'으로 남는다. 빈칸이어도 진행 가능(강제 아님).
- **왜 즐거운가**: 질문→행동 사이의 인지적 다리를 학생이 직접 놓는다. 자기 말로 계획을 적으면 막연한 '고쳐'가 구체적 행동이 되어 글쓰기가 메타인지 게임이 된다. 나중에 '내가 이렇게 계획하고 해냈다'는 자기효능 증거가 됨.
- **대필 안전 보장**: 메모는 100% 학생이 작성하며 AI는 빈칸만 제공한다(어떤 placeholder 예시 문장도 넣지 않음 — '예: ...' 형태의 모범 답안 금지, 중립 안내문만). authorIsStudent 증거를 오히려 강화. 코치는 질문만 하고 계획·실행 모두 학생 몫이라는 불변식과 정합.
- **재사용**: app/components/coach/NudgeCard.tsx, app/lib/coach-session.ts (recordRevision 확장 지점 — draft에 메모 동반), app/lib/process-log.ts (교사 증거 로그), app/coach/coach.module.css
- **신규 작업**: NudgeCard에 선택적 의도 메모 input(평문, placeholder는 예시 문장 아닌 중립 안내), coach-session draft 기록에 학생 의도 메모 필드 부착(순수 모듈은 호출부에서 주입, 불변식 리터럴 불변), 완료 과정로그에 '학생 수정 계획 N건' 표시(내용은 교사 로그에서만 상세)
- **검증 근거(불변식)**: 메모 자체는 100% 학생 작성이라 본질은 safe하고 authorIsStudent 증거를 오히려 강화한다. risky로 보는 단 하나의 칼날: placeholder/안내문. 브리프 uiSketch의 '예: 근거를 한 줄 더 넣겠다' 같은 예시는 학생이 그대로 베껴 넣을 수 있는 '모범 답안'에 해당해 대필 금지 정신과 충돌. 게다가 checkGenerationBlock은 코치 API 출력만 검사하므로 이 placeholder는 코드 가드가 못 잡는 사각지대 — 더 엄격히 봐야 한다.
- **수정/보류 노트**: safe로 만드는 법: placeholder에서 내용 예시('예: …')를 전면 제거하고 중립 안내문만 둔다(예: '이번에 바꿀 점을 네 말로 적어 봐(선택)'). '예:'로 시작하는 어떤 문구도 금지. 이 한 가지만 고치면 safe. feasibility moderate 이유: NudgeCard에 평문 input 추가는 쉽지만, 메모를 세션에 동반 기록하려면 recordRevision 시그니처(coach-session.ts:81)에 메모 인자가 없어 호출부(CoachClient)에서 draft에 부착하는 확장 필요. 순수 모듈의 불변식 리터럴(coachWroteSentences:false 등)은 절대 건드리지 않고 호출부에서만 주입. placeholder 수정을 전제로 build 가능하나 현재 브리프 명세(예시 placeholder)대로면 modify 필수.

```
질문: 이 주장의 근거는 무엇일까?
[ 이번에 바꿀 것(선택): ___________ ]
[ 고쳤어 ✓ ]
```

### 전/후 본문 토글 — 첫 글과 지금 글 나란히 보기  ·  effort S · 검증: ✅ safe / moderate → **build**

- **무엇**: 완료화면(CompletionView)에 baseline 시점 본문(session.draftHistory[0])과 최종 본문을 v1/v2 탭으로 전환해 보는 영역을 추가한다. 기존 RevisionToggle(ARIA tablist+화살표키)을 그대로 쓰고, 본문은 평문 렌더(코치 데이터엔 인용구 첨삭이 없으므로 AnnotatedBody 대신 Canvas 결의 read-only 본문). '처음 쓴 글 → 네가 끌어낸 지금 글'의 변화를 본인이 직접 확인.
- **왜 즐거운가**: 여정의 마무리에서 '내가 얼마나 멀리 왔는지'를 자기 글로 직접 본다. 성장막대가 추상 점수라면 이건 진짜 문장의 변화 — 성취감의 정점이자 '직접 썼다'는 자부심의 근거.
- **대필 안전 보장**: 양쪽 모두 학생이 쓴 실제 draft(draftHistory)로, AI 생성물은 어디에도 없다. 토글은 학생 글 두 버전을 보여줄 뿐 새 텍스트를 만들지 않음. 점수 숫자 비노출 유지(변화는 위의 GrowthBars가 막대로만).
- **재사용**: app/components/RevisionToggle.tsx, app/lib/coach-session.ts (draftHistory[0] vs 최신), app/components/coach/Canvas.tsx (본문 read-only 렌더 결), app/lib/utils.ts
- **신규 작업**: CompletionView에 전/후 본문 토글 섹션(RevisionToggle 재사용, 코치 세션 draft 두 개 주입), 코치 세션엔 인용구 첨삭이 없으므로 AnnotatedBody 대신 평문 본문 뷰 어댑터(짧은 래퍼)
- **검증 근거(불변식)**: 양쪽 패널 모두 draftHistory[0](최초)와 최신 draft — 둘 다 학생이 직접 쓴 본문. 토글은 학생 글 두 버전을 보여줄 뿐 새 텍스트를 만들지 않는다. 점수 숫자 비노출 유지(변화는 GrowthBars 막대로만). safe.
- **수정/보류 노트**: RevisionToggle(ARIA tablist+화살표키)은 그대로 재사용 가능해 UI는 거의 공짜. 배선 한 군데가 걸림: 현재 CompletionView는 prop으로 state만 받고(CoachClient.tsx:848) draftHistory를 안 받는다 — draftHistory[0]은 sessionRef에 있다. 따라서 CompletionView 시그니처에 최초/최신 draft 본문을 넘기는 plumbing 필요(state로 끌어올리거나 sessionRef 값을 prop 전달). 코치 세션엔 인용구 첨삭이 없어 AnnotatedBody 대신 Canvas 결의 read-only 평문 뷰 짧은 어댑터면 충분(annotate.ts 불필요). build 권고. effort S~M.

```
[처음 글][지금 글]  ← 탭
(지금 글) 화산은 마그마가... 그래서 우리는 대비해야 한다.
위 GrowthBars가 영역별 ▲자람 표시
```

**이 영역 우선 추천**: 먼저 지을 순서: (1) 기능3 '영역별 진척 타임라인' — easy·safe, 기존 revision.ts/GrowthBars/state 그대로라 배선 최소, 즉각 체감 큰 quick win. (2) 기능5 '전/후 본문 토글' — RevisionToggle 재사용으로 UI는 거의 공짜, 완료화면 plumbing(draftHistory[0]을 sessionRef에서 CompletionView로 전달)만 풀면 됨. safe. (3) 기능1 '문단 위치 앵커'를 textarea 오버레이 인프라의 기반으로 구축(난이도 hard지만 핵심 레버 paragraph_index 활용, 새 순수 헬퍼 paragraphRange 필요 — splitParagraphs는 char-offset을 안 줘서 재사용 불가). 그 위에 (4) 기능2 '변화 디프'를 같은 오버레이를 공유해 얹는다 — 단독으로 만들지 말고 기능1 선행. (5) 기능4 '내 계획 메모'는 placeholder에서 예시 문장('예: …')을 반드시 제거해 중립 안내문으로 바꾼 뒤에만 build — 이 placeholder가 코드 가드(checkGenerationBlock은 API 출력만 검사)가 못 잡는 대필 사각지대라 modify 필수. 종합: 5개 모두 가산적이고 불변식을 깨지 않으나, 두 hard 리스크(textarea 오버레이 픽셀 정렬, sessionRef→render 배선)와 한 invariant 칼날(기능4 placeholder)에 주의가 집중돼야 한다.

## A.modes — 작성 모드 시스템

_4가지 작성 모드(가이드·개요먼저·음성·자유)를 "입력 방식의 차이일 뿐, 산출되는 글은 100% 학생 손글씨"라는 단일 원칙으로 통합한다. CoachClient의 기존 write→checking→nudge→growth→done reducer는 그대로 두고, 그 앞단에 modeSelect라는 "수집(scaffold) 서브상태"만 얹어 모드별로 캔버스에 들어가는 진입 경험만 바꾼다. 모든 모드의 출력은 결국 Canvas(학생 textarea)로 수렴하므로 불변식(코치가 준 문장 0개)은 모드 수와 무관하게 한 곳에서 보장된다._

### 모드 선택 진입 화면 (성향 기반 4-카드)  ·  effort M · 검증: ✅ safe / easy → **build**

- **무엇**: 코치 루프 시작 전 modeSelect 화면을 추가한다. 4개 카드 = 가이드 모드('질문 따라가며 채우기'), 개요 먼저('뼈대부터 잡기'), 음성으로 말하기('말로 풀어내기 — 준비 중'), 자유 쓰기('바로 캔버스에 쓰기 = 현행'). 각 카드에 한 줄 성향 카피('막막해요'→가이드, '생각은 많은데 순서가'→개요, '말이 더 편해요'→음성, '그냥 쓸게요'→자유). 선택 시 mode를 state에 저장하고 해당 모드의 진입 경험으로 분기한 뒤, 어떤 모드든 종착지는 동일한 write phase(Canvas)다. 모드는 localStorage에 기억해 다음 세션 기본값으로.
- **왜 즐거운가**: '어디부터 써야 하지'가 가장 큰 첫 마찰인데, 빈 캔버스를 던지는 대신 '너는 어떤 식으로 시작하고 싶어?'를 먼저 물어 진입 장벽을 성향에 맞게 낮춘다. 막힌 학생은 가이드로, 빨리 쓰는 학생은 자유로 — 강요 없는 분기라 누구도 느려지지 않는다.
- **대필 안전 보장**: 이 화면은 '어떻게 시작할지'만 고르게 할 뿐 어떤 문장도 생성하지 않는다. 4개 모드 카드 카피는 모두 정적 상수(코칭 톤 카피)이며 학생 글에 들어갈 텍스트를 일절 포함하지 않는다.
- **재사용**: CoachClient.tsx (reducer·Phase 타입에 modeSelect 추가), icons.tsx (BlockIcon 4종을 모드 아이콘으로), coach.module.css (카드/시트 스타일), utils.ts (cn)
- **신규 작업**: ModeSelect.tsx 진입 카드 컴포넌트, WritingMode 타입('guide'|'outline'|'voice'|'free'), localStorage 'pwc-writing-mode-v1' 영속 헬퍼
- **검증 근거(불변식)**: 이 화면은 '어떻게 시작할지'만 고르게 할 뿐 학생 글에 들어갈 텍스트를 일절 생성·삽입하지 않는다. 4개 카드 카피는 정적 코칭 상수다(과제·문장 풀과 무관). coach-schema 가드가 작동하는 코치 출력 경로에 끼어들지 않는다. 검증한 reducer(CoachClient.tsx:169-249)에 phase 하나 추가하는 것은 불변식 강제 지점(NudgeCard 평문 렌더·process-log 리터럴)을 전혀 건드리지 않는다.
- **수정/보류 노트**: 주의: RESTORE 액션이 '...initial'을 펼친 뒤 일부 필드만 복원한다(CoachClient.tsx:234-243). mode를 State에 추가하면 RESTORE에서 mode를 명시적으로 실어줘야 하고(브리프가 인지함), 세션 영속 키(SESSION_KEY='pwc-coach-session-v1')와 별개로 mode 영속 키를 둬야 새로고침 시 모드가 initial('write' 진입)로 리셋되지 않는다. 모드 영속은 사용자가 요구한 별 키('pwc-writing-mode-v1')로 처리 가능.

```
[화산의 형성과 영향]  어떻게 시작할까?
┌────────┐┌────────┐
│🖊 가이드 ││🗂 개요먼저│
│막막해요 ││순서부터 │
└────────┘└────────┘
┌────────┐┌────────┐
│🎤 말하기 ││✍ 자유쓰기│
│준비 중  ││바로 쓰기 │
└────────┘└────────┘
```

### 가이드 모드 — 비계 질문 스트립 (대필 아닌 빈칸)  ·  effort L · 검증: ⚠️ risky / moderate → **modify**

- **무엇**: 가이드 모드 선택 시 Canvas 위에 '생각 꺼내기' 질문 스트립을 띄운다. 과제 5영역(과제 이해·내용·구조·표현 + 도입/근거/마무리 같은 장르 슬롯)에 대응하는 열린 질문 3~5개를 카드로 보여주고, 각 질문 옆 '캔버스에 옮기기' 버튼이 캔버스로 포커스만 이동시킨다(답을 자동 삽입하지 않음). 질문은 buildCoachPrompt의 코칭 철학을 재사용한 정적/서버 질문 풀에서 가져오되, 학생이 직접 캔버스에 답을 쓴다. 질문에 답할 때마다 체크 표시로 진척감만 준다.
- **왜 즐거운가**: 빈 화면 공포 대신 '화산은 언제, 어떻게 만들어질까?' 같은 구체적 질문이 생각의 물꼬를 터준다. 답은 본인이 쓰니 성취감이 온전히 학생 것. 질문을 하나씩 끄는 체크 인터랙션이 게임처럼 진행감을 준다.
- **대필 안전 보장**: 질문은 전부 의문문(guiding_question 형식)이며 답·예시·평서문을 담지 않는다. coach-schema의 questionFieldIsDeclarative 가드 정신을 그대로 따라, 질문 풀에 평서문이 섞이지 않도록 필터한다. '캔버스에 옮기기'는 텍스트를 삽입하지 않고 포커스만 이동 — 학생이 0자에서 직접 작성.
- **재사용**: coach-prompt.ts (RUBRIC_COACH_LENS·코칭 철학 → 질문 풀), coach-schema.ts (questionFieldIsDeclarative 가드 재사용으로 질문 검증), Canvas.tsx (답 작성처), NudgeCard.tsx (질문 카드 시각 패턴), nudge-priority.ts (영역 우선순위로 질문 순서)
- **신규 작업**: GuideQuestionStrip.tsx, 장르/영역별 열린 질문 풀 상수(또는 /api/coach에 mode='guide' 질문 전용 응답 추가), 질문 응답 체크 진척 상태
- **검증 근거(불변식)**: 설계 의도(열린 의문문만, '캔버스에 옮기기'는 포커스만 이동·텍스트 미삽입)는 불변식과 정합. 그러나 risk 지점 둘: (1) 질문 풀이 LLM(/api/coach mode='guide')에서 동적 생성되면, 그 응답이 coach-schema의 questionFieldIsDeclarative/checkGenerationBlock을 반드시 통과해야 하는데 현 가드는 CoachOutput(nudge 객체 배열)을 받지 정적 질문 문자열을 받지 않는다 — '가드 재사용'이 그대로 되지 않고 질문을 nudge-shape으로 감싸 검증하는 어댑터가 필요. (2) '답을 미리 담은 유도질문'(coach-prompt.ts:84)이 가장 흔한 누수 — 질문이 너무 구체적이면 사실상 대필. 정적 풀이면 안전, 동적이면 가드 통과를 강제해야 safe.
- **수정/보류 노트**: safe화 조건: (a) 질문 풀을 1차로 정적 상수(coach-prompt.ts의 RUBRIC_COACH_LENS 톤 차용)로 출시하고, 동적 생성은 후속으로. (b) 동적일 경우 질문 각각을 {diagnosis:'', guiding_question:q} 형태로 감싸 runCoachGuards에 통과시키는 어댑터 추가(브리프의 '가드 정신 따라'를 실제 코드 경로로 강제). (c) '캔버스에 옮기기'는 절대 답/질문 텍스트를 캔버스에 넣지 말고 포커스 이동만(브리프 명시대로). effort는 L보다 M-L.

### 개요 먼저 모드 — 구조 슬롯 → 본문 승격  ·  effort L · 검증: ⚠️ risky / moderate → **modify**

- **무엇**: 개요 모드는 Canvas를 '슬롯 보드'로 바꾼다. 도입·본론1·본론2·마무리 같은 장르별 빈 슬롯에 학생이 짧은 메모(키워드·구절)를 직접 적고, 순서를 드래그로 재배열한다. 작성 준비가 되면 '본문으로 펼치기' 버튼이 슬롯 메모들을 캔버스에 '개요 주석'으로만 옮겨(예: '// 도입: 화산이란' 형태의 학생이 적은 메모 그대로) 학생이 그 아래에 문장을 채우게 한다. 슬롯 메모도 학생이 쓴 텍스트이므로 그대로 보존된다.
- **왜 즐거운가**: 생각은 많은데 순서가 안 잡히는 학생에게 구조를 먼저 손에 쥐여준다. 드래그로 흐름을 재배열하는 촉각적 재미 + '뼈대 → 살'로 가는 분명한 진행이 막힘을 줄인다.
- **대필 안전 보장**: 슬롯에 들어가는 모든 메모는 학생이 직접 입력한다. '본문으로 펼치기'는 학생이 쓴 메모를 그대로 옮길 뿐 AI가 문장으로 확장하지 않는다(확장=리라이트=금지). 슬롯 라벨(도입/본론/마무리)만 정적 비계 상수다. process-log의 authorIsStudent 모델과 정합 — 슬롯 메모도 학생 저작 증거.
- **재사용**: Canvas.tsx (펼친 본문 작성처), coach-session.ts (슬롯 메모를 draft 본문으로 기록), coach.module.css (보드/세그먼트 스타일), grading.ts AREAS (슬롯-영역 매핑)
- **신규 작업**: OutlineBoard.tsx (드래그 재배열 슬롯), 장르별 슬롯 템플릿 상수(설명문/논설문 등), 슬롯→캔버스 주석 승격 로직(학생 텍스트 verbatim)
- **검증 근거(불변식)**: 슬롯 메모가 100% 학생 입력이고 '본문으로 펼치기'가 학생 메모를 verbatim 주석으로만 옮기는 한 coach-session(draftHistory=학생 저작 증거)·process-log(authorIsStudent:true) 모델과 정합하여 안전. risk: 'AI가 슬롯을 문장으로 확장'하는 어떤 형태(메모→매끄러운 문장, 슬롯 라벨 자동 채움, 슬롯 내용 추천)가 끼면 즉시 리라이트=대필 위반. 또 드래그 재배열은 안전하나 '추천 순서/구조 제안'을 AI가 주면 구조·논리 영역의 떠먹임이 된다.
- **수정/보류 노트**: safe화 조건: (a) 슬롯 라벨(도입/본론/마무리)·장르 템플릿은 정적 상수만, AI 생성 금지. (b) '본문으로 펼치기'는 학생 메모 문자열을 그대로(예: '// 도입: <학생메모>') 합칠 뿐 확장 0 — 코드 리뷰 체크포인트로 박을 것. (c) 슬롯 순서 추천/구조 제안 기능을 절대 추가하지 말 것(추가 시 violates). 이 조건이면 build 가능. 드래그 재배열은 신규 컴포넌트라 effort L 타당.

### 음성 모드 — 받아쓰기 검토 게이트 (대필 경계 차단)  ·  effort L · 검증: ⚠️ risky / hard → **drop**

- **무엇**: 음성 모드는 STT(받아쓰기)로 말을 텍스트화하되, 변환 결과를 캔버스에 직접 흘리지 않고 '검토 패널'에 먼저 띄운다. 학생이 받아쓰기 결과를 읽고 직접 수정·확정한 뒤에만 캔버스로 들어간다. 받아쓰기는 '학생 본인 발화'이므로 저작 주체는 유지되지만, 음성은 신규 개인정보이자 미성년 동의 이슈가 있어 현 단계는 UniversalCapture와 동일하게 '준비 중' 게이트로 두고, 동의 충족 전엔 활성화하지 않는다.
- **왜 즐거운가**: 타이핑이 느리거나 손글씨가 부담인 학생, 생각이 말로 먼저 터지는 학생에게 가장 자연스러운 입구. 말 → 검토 → 확정의 흐름이 '내가 한 말을 내가 다듬는' 주도권을 준다.
- **대필 안전 보장**: STT는 코치가 아니라 학생 발화를 받아쓴 것 → coachWroteSentences=false 유지(코치가 만든 문장 0). 단 authorIsStudent 증명과의 경계가 미묘해, 받아쓰기 원문을 process-log에 '음성 출처' 메타로 남기고 학생이 검토 패널에서 직접 확정하게 해 '학생 저작' 증거를 보존한다. AI 보정(문장 매끄럽게)은 리라이트=대필이므로 절대 금지, 순수 받아쓰기만.
- **재사용**: UniversalCapture.tsx (voice 채널 '준비 중' 게이트·alert 패턴), age-policy.ts (needsGuardianConsent·consentTrackFor), consent.ts (분리 옵트인·기본 OFF), Canvas.tsx (확정 후 작성처), process-log.ts (출처 메타)
- **신규 작업**: VoiceReviewPanel.tsx (받아쓰기 검토·확정 UI, STT 연동 시), ConsentState에 음성/녹음 동의 항목 추가, 음성 출처 메타를 세션에 기록하는 seam
- **검증 근거(불변식)**: 순수 STT(학생 발화 받아쓰기)는 코치가 만든 문장이 아니므로 coachWroteSentences:false는 유지된다. 그러나 두 겹의 risk: (1) 대필 인접 — '문장 매끄럽게/문법 보정' 등 AI 후처리가 조금이라도 끼면 STT가 아니라 리라이트=대필(브리프도 금지 명시). (2) authorIsStudent 증명의 경계 약화 — process-log.ts:31-32는 타입 리터럴로 고정돼 있어 음성 메타 추가는 그 리터럴을 깨지 않지만, '학생이 직접 썼다'의 증거력은 받아쓰기에서 본질적으로 희석된다. 게다가 현재 voice는 alert-only mock(UniversalCapture.tsx:48,258-281)이고, 음성은 신규 개인정보로 age-policy(미지 학년→보호자 트랙 true)·consent(별도 옵트인 기본 OFF)에 음성/녹음 항목이 없다.
- **수정/보류 노트**: 이번 라운드 drop(현 단계 '준비 중' 게이트 유지가 정답). 근거: (a) ConsentState에 음성/녹음 동의 항목 신설 + 미성년 보호자 트랙 재설계는 컴플라이언스 작업이라 기능 단독으로 출시 불가. (b) STT 엔진 연동 자체가 신규 인프라. safe화 후 재도입 조건: 순수 받아쓰기만(AI 보정 0)·검토 패널에서 학생 직접 확정·process-log에 '음성 출처' 메타 기록·consent에 음성 옵트인(기본 OFF) 추가가 모두 갖춰진 뒤. 그 전까지 UniversalCapture와 동일하게 '준비 중'.

### 모드 간 무손실 전환 (글 보존 토글)  ·  effort M · 검증: ✅ safe / moderate → **build**

- **무엇**: 작성 중 언제든 상단에서 모드를 바꿀 수 있다. 핵심 규칙: 캔버스 본문(학생이 쓴 텍스트)은 모드 전환과 무관하게 절대 손실되지 않는다. 가이드→자유 전환은 질문 스트립만 접고 본문 유지, 개요→자유는 슬롯 메모를 캔버스 주석으로 합치고 유지, 자유→가이드는 빈 질문 스트립을 본문 위에 덧붙인다. 전환 시 '지금까지 쓴 글은 그대로 있어요' 확인 토스트. 모드는 EDIT/세션 상태와 직교(orthogonal)한 별도 필드라 reducer 핵심 흐름을 건드리지 않는다.
- **왜 즐거운가**: '가이드로 시작했는데 이제 그냥 쓰고 싶다'가 자유롭다. 모드가 감옥이 아니라 도구라 학생이 자기 리듬을 찾는다. 글이 안 날아간다는 신뢰가 실험을 부추긴다.
- **대필 안전 보장**: 전환은 학생 텍스트를 이동·보존만 할 뿐 새 문장을 생성하지 않는다. 모든 경로의 종착지가 동일한 Canvas라 불변식 보장 지점이 단일하게 유지된다 — 모드가 늘어도 대필 방어선은 그대로 1곳.
- **재사용**: CoachClient.tsx reducer (EDIT 액션·body 보존 로직), coach-session.ts (recordRevision 불변 모델), BottomSheet.tsx (모드 전환 시트), utils.ts (cn)
- **신규 작업**: SET_MODE 액션(body 무손실 + 모드별 scaffold 표시 전환), 모드 전환 확인 토스트, 상단 모드 스위처 컨트롤
- **검증 근거(불변식)**: 전환은 학생 텍스트를 이동·보존만 하고 새 문장을 생성하지 않는다. EDIT 액션(CoachClient.tsx:171-172)이 이미 body만 갱신하는 순수 보존 로직이라, SET_MODE를 body 불변으로 만들면 검증된 패턴과 동일. 모든 모드 종착지가 동일 Canvas라 대필 방어선이 단일하게 유지된다는 브리프 주장은 코드상 타당.
- **수정/보류 노트**: 단 '개요→자유: 슬롯 메모를 캔버스 주석으로 합침'은 개요 모드 승격 로직(verbatim)과 동일 경로여야 하며 여기서도 AI 확장 0이어야 함. SET_MODE는 reducer 핵심 흐름(write→...→done)과 직교한 별도 필드만 건드리도록 — phase는 바꾸지 말고 mode·scaffold 메타만 변경. 전환 확인 토스트·상단 스위처는 신규 UI지만 BottomSheet 재사용 가능, effort M 타당.

### 모드-무관 통합 상태머신 배선 (reducer 얹기)  ·  effort M · 검증: ✅ safe / easy → **build**

- **무엇**: 기존 write→checking→nudge→rechecking→growth→done은 한 글자도 바꾸지 않는다. 그 앞에 modeSelect phase 하나만 추가하고, State에 mode·scaffold 메타(가이드 질문 진척, 개요 슬롯, 음성 출처) 필드를 직교 추가한다. 어떤 모드든 scaffold 단계를 거쳐 write로 진입하면 그 뒤 코칭 루프(검증된 reducer·영속·복원·재시도·process-log)는 100% 공유된다. RESTORE도 mode를 함께 복원해 새로고침 시 모드 유지.
- **왜 즐거운가**: 기능은 4배로 늘지만 검증된 핵심 로직 재구현은 0. 학생 입장에선 '입구만 4개, 안에선 같은 든든한 코치'라 일관된 경험.
- **대필 안전 보장**: 코칭 루프의 불변식 강제 지점(NudgeCard 평문 렌더·coach-schema 가드·process-log 리터럴)이 전혀 바뀌지 않는다. 모드 메타는 입력 비계용일 뿐 코치 출력 경로에 끼어들지 않으므로 대필 방어선과 직교.
- **재사용**: CoachClient.tsx (reducer 전체·persist/RESTORE/callCoach 배선), process-log.ts (buildProcessLog 그대로), coach-session.ts, nudge-priority.ts, coach-schema.ts, revision.ts
- **신규 작업**: Phase에 'modeSelect' 추가, State에 mode + scaffold 메타 필드(직교), SET_MODE·RESTORE의 mode 처리, 세션 영속 키에 mode 포함
- **검증 근거(불변식)**: 기존 write→checking→nudge→rechecking→growth→done reducer를 한 글자도 안 바꾸고 앞에 modeSelect phase + 직교 mode/scaffold 필드만 추가한다는 설계는 불변식 강제 지점(coach-schema 가드·NudgeCard 평문 렌더·process-log 리터럴)을 전혀 건드리지 않음을 코드로 확인. 모드 메타는 입력 비계용일 뿐 코치 출력(callCoach→validateCoachOutput→runCoachGuards) 경로에 끼어들지 않아 대필 방어선과 직교.
- **수정/보류 노트**: 필수 보강 2건: (1) RESTORE가 '...initial' 펼침이라(CoachClient.tsx:234-243) mode/scaffold 신규 필드는 RESTORE에서 명시 복원 안 하면 새로고침 시 소실 — RESTORE 액션과 영속 직렬화에 mode 추가를 잊지 말 것(브리프가 인지함). (2) initial 상태(:156-167)에도 mode 기본값 추가. 이 둘만 챙기면 '검증된 핵심 로직 재구현 0' 주장 그대로 성립.

**이 영역 우선 추천**: 먼저 지을 것 순서: (1) 모드-무관 통합 상태머신 배선 + (2) 모드 선택 진입 화면 — 둘 다 safe·easy이고 나머지 모든 모드의 토대(phase·직교 필드·영속). 함께 묶어 첫 PR로. 단 RESTORE/initial/영속 직렬화에 mode 필드를 빠짐없이 실어야 함(reducer가 '...initial'을 펼치므로 누락 시 새로고침에 모드 소실). 다음 (3) 모드 간 무손실 전환(safe, EDIT 보존 패턴 재사용). 그다음 (4) 개요 먼저 모드와 (5) 가이드 모드 — 둘 다 risky→modify로, 각각 'AI 확장/추천 0(verbatim 승격)'과 '질문을 nudge-shape으로 감싸 runCoachGuards 통과(또는 정적 풀 우선)'라는 safe화 조건을 코드 체크포인트로 박은 뒤 build. (6) 음성 모드는 이번 라운드 drop — consent에 음성 옵트인(기본 OFF) 신설 + 미성년 보호자 트랙 재설계 + 순수 STT(AI 보정 0) 인프라가 갖춰지기 전까지 UniversalCapture와 동일하게 '준비 중' 게이트 유지. 핵심 안전 원칙: 모드는 입력 비계일 뿐, 모든 모드의 종착지가 동일 Canvas라 대필 방어선(coach-schema 가드·process-log 리터럴)은 한 곳에서 그대로 상속된다 — 신규 텍스트 생성·확장·추천을 어떤 모드에도 끼워넣지 않는 것이 전 기능 공통 게이트.

## A.gamification — 동기부여(성취 서사)

_부정행위 방어 증거(고쳐쓰기 횟수·막힘 돌파·작성 주체=학생)를 "내가 해냈다" 성취 서사로 재프레이밍한다. 새 수치나 AI 산출물을 만들지 않고, 이미 buildProcessLog가 내놓는 revisions·perArea.improved·stuckAreas·draftHistory만 학생 1인칭 타임라인·돌파 하이라이트·공유용 성장 스토리·절제된 스트릭으로 시각화한다. 모든 카피는 학생의 행위(네가 썼다/네가 뚫었다)만 가리킬 뿐 글에 옮길 문장을 생성하지 않는다._

### "내가 해냈다" 과정 타임라인  ·  effort M · 검증: ✅ safe / moderate → **build**

- **무엇**: 완료 화면의 정적 과정 로그 4줄을, 세션 draftHistory를 1인칭 시간순 타임라인 카드로 펼침. 각 노드는 학생이 실제로 한 행동만 표시: "1번째 글 — 412자 직접 씀", "막힌 영역을 뚫고 고쳐 씀 (구조·논리)", "분량 +180자". 노드 라벨은 draftHistory[n].charCount 차이, nudgeHistory[n].area, perArea.improved에서 파생된 고정 한국어 템플릿(학생 행위 서술)만 사용. 마지막 노드는 기존 '🔒 직접 쓴 글' 칩. 세로 타임라인, BlockIcon(pen/loop/grow/seal)으로 단계 표시.
- **왜 즐거운가**: 한 줄 통계("고쳐쓰기 3회")보다 "내가 거쳐온 길"을 눈으로 되짚으면 노력이 서사가 되어 성취감이 큼. 데이터를 새로 묻지 않고 이미 쌓인 궤적을 보여주므로 마찰 0이고, 끝까지 해낸 학생에게 보상 화면으로 작동.
- **대필 안전 보장**: 타임라인 노드 텍스트는 draftHistory의 charCount·n과 nudgeHistory.area·perArea.improved(전부 학생 행위/수치 파생)에서만 만들어진 고정 한국어 템플릿. 학생 draft 본문은 인용/요약/표시하지 않음(본문은 저작 증거일 뿐). AI 호출 없음, 문장 생성 없음. coachWroteSentences=false / authorIsStudent=true 리터럴을 그대로 표면화.
- **재사용**: process-log.ts, coach-session.ts, icons.tsx, CoachClient.tsx, coach.module.css, utils.ts
- **신규 작업**: ProcessTimeline.tsx(노드 렌더 + 고정 템플릿 매퍼), draftHistory→timeline 노드 배열 환원 순수 헬퍼(process-log.ts에 buildTimeline 추가 또는 신규 process-narrative.ts), 세로 타임라인 라인/노드 CSS(coach.module.css 확장)
- **검증 근거(불변식)**: 검증 완료: 타임라인 입력 데이터가 전부 학생 행위/수치 파생임을 코드로 확인. CoachClient.tsx:518,526,570에서 sessionRef.current가 createSession/recordRevision로 채워지고 draftHistory(DraftEntry{n,body,charCount})·nudgeHistory(NudgeEntry{area,...})가 런타임에 실재하며 localStorage(SESSION_KEY)에 영속된다(:285,533). 노드 라벨을 charCount 차이·n·nudgeHistory.area·perArea.improved로만 만들고 draft 본문(DraftEntry.body)을 절대 화면에 렌더/요약하지 않는다는 명세를 지키면 대필 표면이 0이다. 본문은 저작 증거일 뿐(coach-session.ts:10-11)이라 인용 금지 규칙이 핵심. AI 호출 없음, 문장 생성 없음. coachWroteSentences:false / authorIsStudent:true 리터럴 표면화는 process-log.ts:31-32 불변식과 정합.
- **수정/보류 노트**: 필수 가드레일 2가지를 구현 계약으로 박아라. (1) 절대 draftHistory[n].body를 노드에 출력하지 말 것 — 길이/회차/영역명만. body 누출 시 학생이 이전 회차 자기 문장을 다시 보는 건 무해하나, 컴포넌트 prop 경계를 좁혀 본문이 타임라인 레이어에 흘러들지 않게 한다. (2) 노드 라벨은 신규 평문 생성이 아니라 고정 한국어 템플릿 + 영역명/숫자 슬롯 채우기로만 — 가변 카피 생성 금지. 미세 주의: nudgeHistory는 본문이 실제 바뀐 recordRevision에서만 append되고 paragraph_index는 항상 0(coach-session.ts:101)이라 '문단 위치'는 못 쓴다 — 영역 빈도/회차만 신뢰할 것. buildTimeline은 process-log.ts(순수)에 추가하면 테스트 직접 import 가능.

### 막혔다 뚫은 순간 하이라이트  ·  effort S · 검증: ✅ safe / easy → **build**

- **무엇**: buildProcessLog.stuckAreas(nudge ≥2회 떴는데도 통과 못한 영역)는 현재 화면 미사용. 이를 '돌파 모먼트'로 승격: 막혔던 영역 중 최종 perArea.improved=true가 된 영역을 골라 "여기서 막혔지만, 네가 다시 써서 뚫었어 — 구조·논리" 돌파 배지로 강조(레몬 pop). 막혔지만 아직 못 뚫은 영역은 경고가 아니라 "다음에 한 걸음 더 — 표현·문장" 격려 톤. 완료 화면 GrowthBars 위에 가장 큰 돌파 1개만 노출(한 호흡에 하나).
- **왜 즐거운가**: 성장의 핵심 감정은 "어려웠는데 결국 해냈다". 가장 고생한 지점을 정확히 집어 축하하면 노력 대비 보상이 정직하게 연결됨. 막힘 데이터는 원래 교사용 방어 증거였는데 같은 데이터가 학생에겐 '끈기있게 뚫은 증거'가 되는 이 제품 고유의 이중 가치를 살림.
- **대필 안전 보장**: stuckAreas(영역명)·perArea.improved(불리언)만 입력. 배지 문구는 영역명을 끼운 고정 격려 템플릿으로, 학생이 글에 쓸 문장/표현/예시를 산출하지 않음. "어떻게 뚫었는지" 방법을 제시하지 않고 "네가 뚫었다"는 사실만 축하 → 답이 아닌 인정. AI 호출 없음.
- **재사용**: process-log.ts, revision.ts, GrowthBars.tsx, coach.module.css, icons.tsx, FeedbackDiff.tsx
- **신규 작업**: BreakthroughBadge.tsx(돌파/진행중 2상태), stuckAreas+perArea→대표 돌파 1건 선정 순수 헬퍼(process-log.ts에 selectBreakthrough 추가), 레몬 강조 배지 스타일 1종
- **검증 근거(불변식)**: 검증 완료: 입력이 stuckAreas(영역명 배열)·perArea.improved(불리언)뿐(process-log.ts:33-34,68-73). grep으로 stuckAreas가 학생 완료화면(CompletionView, CoachClient.tsx:847-926)에는 전혀 안 쓰이고 teacher/log/page.tsx에서만 소비됨을 확인 — 같은 방어 증거 데이터를 학생용 '돌파' 프레이밍으로 재사용한다는 이중가치 주장은 사실. 배지 문구가 '네가 뚫었다'는 사실/축하만 하고 '어떻게 뚫는지' 방법·표현·예시를 일절 제시하지 않으면 답이 아닌 인정에 머문다. AI 호출 없음.
- **수정/보류 노트**: 리스크 낮음. 단 카피 작성 시 절대 금지 어법 회피: '여기는 이렇게 고치면 돼' '예: ...' 같은 방법/예시 제공은 WRITE_DIRECTIVE성(coach-prompt.ts:74-86)이라 즉시 violates로 전락. 허용 템플릿은 '여기서 막혔지만 네가 다시 써서 뚫었어 — {영역}' '다음에 한 걸음 더 — {영역}'처럼 행위 인정·격려에 한정. 미해결 영역은 강한 경고색 금지(revision.ts:61 미성년 좌절 방지 톤). '한 호흡에 하나'(nudge-priority.ts:3) 준수해 돌파 1건만 노출하면 톤 계약도 보존.

### 부모·교사용 성장 스토리 공유 카드  ·  effort M · 검증: ⚠️ risky / moderate → **build**

- **무엇**: 완료 화면에서 '성장 스토리 보여주기' 버튼 → 한 장짜리 공유 뷰. 내용: 과제명/장르, 성장 막대(전→후), 과정 요약(고쳐쓰기 N회·돌파 영역), 신뢰 인장 '코치가 준 문장 0개 · 작성 주체 학생 본인'. 부모/교사에게 직접 보여주는 읽기 전용 화면 + 텍스트 요약 복사(Clipboard write — ScoreForm 클립보드 read 패턴의 대칭). 점수 숫자는 노출 안 함(막대/구간 frame 계약 준수).
- **왜 즐거운가**: "내가 한 걸 자랑할 수 있다"는 외적 동기 + 부모/교사 인정이라는 한국 수행평가 맥락의 실제 보상. 부정행위 방어 증거(0개·학생 본인)가 그대로 '떳떳함의 증명서'가 되어 방어와 동기부여가 한 화면에서 동시에 충족됨.
- **대필 안전 보장**: 공유 카드는 수치(막대)·메타·고정 인장 문구만 담고 학생 draft 본문이나 코치 nudge 텍스트를 옮기지 않음(복사 텍스트로 대필 흔적이 새어나갈 수 없음). 복사 요약은 '고쳐쓰기 3회, 구조 영역 돌파, 코치가 준 문장 0개' 같은 행위/통계 문장뿐 — 재사용 가능한 표현 0. AI 호출 없음.
- **재사용**: CoachClient.tsx, GrowthBars.tsx, process-log.ts, ScoreForm.tsx, coach.module.css, utils.ts
- **신규 작업**: ShareStory.tsx(읽기 전용 카드 + 복사 버튼 + 성공 토스트), ProcessLog→평문 요약 직렬화 순수 함수(formatStoryText), 복사 실패/미지원 폴백 UX
- **검증 근거(불변식)**: 구상 자체는 수치(막대)·메타·고정 인장만 담으면 safe하지만, '텍스트 요약 복사' 경로가 대필 누출의 잠재 표면이다. 복사된 텍스트는 클립보드를 통해 학생이 곧바로 글 본문에 붙여넣을 수 있는 유일한 출력물이므로, formatStoryText가 draft 본문·코치 nudge 텍스트·영역별 '방법' 문구를 한 글자라도 포함하면 그 순간 베껴붙이기용 콘텐츠가 되어 violates가 된다. 또 점수 숫자 비노출 계약(coach-prompt.ts:133)도 복사 텍스트에서 깨지기 쉽다(요약에 무심코 점수 삽입). 주의: ScoreForm은 clipboard READ만 함(:190 readText) — WRITE는 신규 코드라 누출 가드를 새로 세워야 한다.
- **수정/보류 노트**: safe로 만드는 조건: formatStoryText 출력을 화이트리스트 토큰으로만 구성 — 과제명/장르(메타), '고쳐쓰기 N회', '돌파 영역: {영역명}', 고정 인장 '코치가 준 문장 0개 · 작성 주체 학생 본인'. 블랙리스트: draftHistory.body, nudge.diagnosis/guiding_question, 점수 정수, 영역별 개선 '방법'. 직렬화 함수를 순수 모듈로 분리해 단위 테스트로 '본문/숫자 미포함'을 회귀 테스트화하라(coach-schema.ts checkGenerationBlock을 복사 텍스트에 한 번 통과시키는 것도 값싼 백스톱). 그러면 risky→safe.

### 절제된 "끈기" 스트릭  ·  effort S · 검증: ✅ safe / easy → **build**

- **무엇**: 과한 배지/포인트 대신 단 1종의 절제된 표식: '끝까지 고쳐쓰기' 진척을 별·트로피가 아니라 차분한 도트 행(○○●)으로 표현하고 "한 번 더 고쳐 쓸 때마다 네 글이 자랐어" 같은 노력 기반(결과 아님) 라벨. 세션 간 영속은 localStorage에 '직접 쓴 과제 수' 카운터 1개만, 경쟁/랭킹/연속일 압박 없음. 도트는 GrowthBars 5칸 세그먼트 시각 어법을 재사용해 디자인 통일.
- **왜 즐거운가**: 미성년 맥락에서 과한 게임화는 외적동기 과잉·좌절을 부르므로 '노력 자체를 조용히 인정'하는 수준이 적절. 고쳐쓸수록 칸이 차는 즉각 피드백은 다시쓰기 루프를 자연스럽게 권장(과정이 재미있어짐)하면서 점수·순위 압박이 없어 마찰이 낮음.
- **대필 안전 보장**: 스트릭은 revisions/완료 횟수 정수 카운트와 고정 라벨만 사용 — 학생 문장과 무관하고 글에 옮길 텍스트를 생성하지 않음. '결과(점수)'가 아니라 '행위(고쳐씀)'를 셈하므로 점수 노출 계약도 보호. AI 호출 없음, authorIsStudent 불변식과 충돌 없음.
- **재사용**: coach-session.ts, process-log.ts, GrowthBars.tsx, coach.module.css, storage.ts
- **신규 작업**: PersistDots.tsx(도트 행 + 노력 라벨), 누적 카운터 localStorage 키(pwc_done_count_v1) 읽기/증가 순수 래퍼(SSR·방어적 파싱 가드), 결과 아닌 노력 라벨 카피 1세트
- **검증 근거(불변식)**: 입력이 정수 카운트(revisions / 완료 횟수)와 고정 노력 라벨뿐 — 학생 문장과 무관하고 글에 옮길 텍스트를 생성하지 않는다. '결과(점수)'가 아닌 '행위(고쳐씀)'를 세므로 점수 비노출 계약과도 충돌 없음. GrowthBars 5칸 세그먼트 시각 어법 재사용은 디자인 통일에 적합. storage.ts(:3 단일 LS 어댑터 채택, type guard + SSR 가드 패턴)가 신규 카운터 키의 올바른 거처임을 확인. AI 호출 없음.
- **수정/보류 노트**: 구현 위생만: 신규 카운터는 반드시 storage.ts 어댑터를 거쳐 추가(pwc_done_count_v1) — CEO 리뷰 단일 어댑터 원칙(storage.ts:3)을 우회해 CoachClient에 직접 localStorage 박지 말 것. SSR 가드 + 방어적 파싱(타 탭 손상 대비) 필수. 라벨은 '결과 아닌 노력' 기반 1세트로 한정하고 연속일/랭킹/경쟁 압박 요소는 명세대로 배제(미성년 외적동기 과잉 방지). 과한 게임화 금지 원칙(coach-profile.ts 톤)과 정합.

**이 영역 우선 추천**: 먼저 지을 것: (1) "막혔다 뚫은 순간 하이라이트" — feasibility easy, 불변식 safe, 데이터(stuckAreas)가 이미 buildProcessLog에 있고 학생 화면엔 미사용이라 즉시 학생용 가치 전환 가능. 이 제품 고유의 '방어 증거=성취 증거' 이중가치를 가장 적은 코드로 증명한다. (2) "절제된 끈기 스트릭" — easy/safe, storage.ts 어댑터에 키 하나 추가 + GrowthBars 어법 재사용이라 리스크 최소. 다음으로 "내가 해냈다 타임라인"(moderate, 단 draft 본문 미출력 가드 필수). 마지막에 "성장 스토리 공유 카드" — 유일하게 risky이며 클립보드 WRITE가 신규 대필 누출 표면이므로, 그 전에 formatStoryText 화이트리스트 직렬화 + 회귀 테스트(본문/점수 미포함)를 먼저 세운 뒤 착수하라. 공통 가드: 모든 카피는 고정 템플릿+슬롯 채우기로만 생성하고 '방법/예시/추천 표현'은 어떤 기능에서도 출력 금지(coach-prompt.ts:74-86, checkGenerationBlock).

## A.coherence — 디자인·UX 일관성

_하나의 토큰 소스(globals.css @theme의 Pullim blue+lemon)로 앱 본체의 하드코딩 green #24D39E를 흡수해 "한 제품 한 팔레트"를 만들고, 사이드바+코치 탑바+폰프레임의 3중 크롬을 "사이드바 1개 + 에디터가 주인공인 풀폭 워크스페이스 + 옆/아래로 비계 코치"로 평탄화한다. 모션·a11y는 이미 존재하는 prefers-reduced-motion 가드와 seg-pop/growBar 키프레임을 표준으로 승격해 일관 적용한다._

### 단일 브랜드 토큰으로 통합 (green #24D39E 흡수)  ·  effort M · 검증: ✅ safe / moderate → **build**

- **무엇**: 앱 본체의 하드코딩 bg-[#24D39E]/border-[#24D39E]/focus-[#24D39E] 22+ 곳을 globals.css @theme의 시맨틱 토큰으로 치환한다. 핵심 결정: 1차 액션 색을 코치의 Pullim blue(#0362da, --color-pullim-blue)로 통일하고, green은 '상승/성공' 의미 전용으로 강등(GrowthCard.tsx:25 'good=상승' 어법과 정합). --color-primary를 라이트에서 pullim-blue로, --primary-fg를 white로 재매핑하면 Sidebar의 bg-muted/text-foreground active 상태와 CTA가 같은 블루 계열로 수렴한다. lemon(#e6ff4c)은 '새로 자란 것/성취' 액센트로 전 앱 공통 규칙화.
- **왜 즐거운가**: 앱과 코치를 오가도 같은 파란 버튼·같은 레몬 성취색이라 '다른 앱에 떨어진' 단절감이 사라진다. 색이 의미(파랑=행동, 초록=상승, 레몬=새 성취)를 일관되게 말해줘 학습 부하가 준다.
- **대필 안전 보장**: 순수 시각 토큰 치환이라 nudge 텍스트 생성 경로(coach-schema/prompt/route)·process-log 불변식 리터럴에 일절 접촉하지 않는다. 색은 학생 문장을 만들지 않는다.
- **재사용**: globals.css(@theme + :root raw 토큰), app/lib/utils.ts(cn), GrowthCard.tsx(good=초록 어법), coach.module.css(.segGain 레몬)
- **신규 작업**: @theme --color-primary → pullim-blue 재매핑(라이트/다크), #24D39E 하드코딩 22곳을 bg-primary/text-primary-foreground/focus-visible:ring-primary로 치환, green을 --color-ok(이미 존재 #10b987)/band-good로 의미 한정하는 사용 가이드 주석
- **검증 근거(불변식)**: 순수 시각 토큰 치환. coach-schema/prompt/route(nudge 텍스트 생성 경로)와 process-log의 coachWroteSentences=false/authorIsStudent=true 리터럴을 일절 건드리지 않는다. 색은 학생 문장을 만들지 않는다. 검증: app/globals.css @theme(:19,42-44)·:root(:85,88,104) 토큰 실재 확인, #24D39E는 .tsx 23곳에 산재(브리프 '22+' 정확).
- **수정/보류 노트**: 빌드 시 주의 1건: --color-primary는 현재 oklch 회색(globals.css:132)이며 다크에서 화이트로 역전(:160)된다. 이를 pullim-blue로 재매핑하면 GrowthCard.tsx:26 'neutral: bg-primary(동률)'와 Sidebar active 상태도 함께 파랑이 된다 — 의도(CTA 수렴)와 맞지만 '동률 막대가 파랑'이 '상승=초록'과 충돌하지 않는지 회귀 확인 필요. green을 --color-ok(#10b987 실재, :104)/band-good로 의미 한정하라는 가이드는 타당. 다크 모드 primary 역전 로직을 깨지 않도록 라이트/다크 양쪽 매핑 동시 수정.

### 3중 크롬 평탄화 — 사이드바 1개 + 풀폭 워크스페이스  ·  effort L · 검증: ✅ safe / moderate → **build**

- **무엇**: 코치 화면에서 자체 'OS 토픽바'(CoachClient.tsx:626 sticky header)와 432px 폰프레임(:657)을 데스크탑에서 제거/해제한다. 루트 layout.tsx의 Sidebar 하나만 글로벌 크롬으로 남기고, /coach 진입 시 코치 작업영역이 콘텐츠 슬롯(layout.tsx:53 flex-1)을 풀폭으로 채운다. 폰프레임은 모바일(<md)에서는 자연스러운 단일 컬럼이므로 프레임 테두리만 제거하고 너비 100%로, 데스크탑(md+)에서는 max-w를 풀고 에디터 패널로 펼친다. 코치 브랜드 마크(MastGlyph/풀림 OS)는 사이드바 헤더로 1회 승격 흡수.
- **왜 즐거운가**: 화면 안 화면(폰 속 앱) 액자 효과가 사라져 글 쓸 공간이 실제로 넓어진다. 테두리·중복 헤더가 먹던 픽셀이 에디터로 돌아온다.
- **대필 안전 보장**: 레이아웃/크롬 재배치만 — 빈 캔버스 첫 페인트(CoachClient.tsx:360)와 reducer 상태머신을 그대로 보존하므로 '학생이 직접 쓴다'는 흐름 불변.
- **재사용**: app/layout.tsx(Sidebar+flex-1 슬롯), Sidebar.tsx(반응형 드로어), CoachClient.tsx(reducer/상태), coach.css .device(:179)
- **신규 작업**: 데스크탑에서 코치 내부 header(:626) 숨김 + 폰프레임 max-w-[432px] 해제 분기, 코치 브랜드 마크를 Sidebar 헤더로 이전, 코치 작업영역을 콘텐츠 풀폭으로 채우는 래퍼
- **검증 근거(불변식)**: 레이아웃/크롬 재배치만. 빈 캔버스 첫 페인트(CoachClient.tsx:360-361 '학생이 직접 쓰는 게 핵심 불변식' 확인)와 reducer 상태머신을 보존하므로 '학생이 직접 쓴다' 흐름 불변. 생성 경로 무접촉.
- **수정/보류 노트**: 검증됨: layout.tsx는 Sidebar 1개 + flex-1 슬롯(:51-53), 코치 내부 sticky header(:626)와 max-w-[432px] 폰프레임(:657) 실재. 단 effort 'L'은 적절(데스크탑 분기 + 브랜드마크 이전 + 풀폭 래퍼). modify 권고는 아니나 주의: 폰프레임 제거 시 coach.module.css의 h-[min(76vh,690px)] 고정 높이(:658)가 데스크탑 풀폭에서 어색해지므로 높이 제약도 함께 해제해야 함. 브랜드마크(MastGlyph/풀림 OS)를 Sidebar 헤더로 1회만 흡수해 중복 제거.

### "에디터가 주인공" 2패널 레이아웃 (코치는 옆에서)  ·  effort L · 검증: ✅ safe / moderate → **build**

- **무엇**: 데스크탑(md+): 좌측 큰 에디터 패널(Canvas, 노트결 배경 coach.module.css:69) + 우측 좁은 코치 레일(NudgeCard 1장, GrowthBars, 과제/루브릭 칩). 에디터가 화면의 60~66%를 차지하고 코치 레일은 sticky로 따라온다. 모바일(<md): 에디터가 전체, 코치는 기존 BottomSheet(peek/open 3상태)로 하단에서 올라옴 — 이미 구현된 컴포넌트 그대로. '한 호흡에 한 nudge'(nudge-priority.topNudge) 원칙대로 레일/시트에는 항상 카드 1장만.
- **왜 즐거운가**: 글이 항상 무대 중앙에 있고 코치는 시야를 가리지 않는 조연으로 머문다. 쓰다가 고개만 돌리면 질문이 있어 흐름이 끊기지 않는다.
- **대필 안전 보장**: NudgeCard는 평문 렌더(dangerouslySetInnerHTML 미사용, NudgeCard.tsx:59)이고 진단+질문만 노출 — 패널 위치를 바꿔도 코치가 문장을 주지 않는다. 카드 1장 제한이 떠먹임을 구조적으로 차단.
- **재사용**: Canvas.tsx, NudgeCard.tsx, GrowthBars.tsx, BottomSheet.tsx, lib/nudge-priority.ts(topNudge), coach.module.css(.canvas/.sheet)
- **신규 작업**: md+ 2컬럼 그리드(에디터 6fr / 코치 레일 4fr) + sticky 레일, md+에서 BottomSheet→고정 레일로 전환하는 분기(모바일은 BottomSheet 유지)
- **검증 근거(불변식)**: NudgeCard는 평문 렌더 확정(NudgeCard.tsx:7 'dangerouslySetInnerHTML 안 씀', :58 '유도질문 — 대안 문장 아님')이고 진단+질문만 노출. 패널 위치를 바꿔도 코치가 문장을 주지 않으며, topNudge(nudge-priority.ts:30-34 실재)로 카드 1장 제한이 떠먹임을 구조적으로 차단. 위치 이동은 생성과 무관.
- **수정/보류 노트**: BottomSheet 3상태(peek/open/hidden, BottomSheet.tsx:12 확인)·Canvas·GrowthBars 모두 재사용 가능. md+ 2컬럼 그리드 + sticky 레일 신규는 표준 CSS 작업이라 'L'보다 가벼울 수 있음. 주의: md+에서 BottomSheet→고정 레일 전환 시 '카드 1장 제한'을 반드시 유지(레일 공간이 넓다고 nudge 여러 장 노출하면 '한 호흡 한 nudge' 톤 원칙 위반 — 불변식은 아니나 제품 톤 제약). 모바일은 BottomSheet 그대로.

```
데스크탑:
┌─사이드바─┬──────에디터(주인공)──────┬─코치레일─┐
│ 풀림     │  [노트결 textarea]        │ nudge 1 │
│ 둘러보기 │  쓰는 중...               │ 성장막대 │
└──────────┴───────────────────────────┴─────────┘
모바일:
[에디터 전체] + ⌃ 코치 BottomSheet(peek→open)
```

### 성장 막대 모션·마이크로인터랙션 표준화  ·  effort S · 검증: ✅ safe / easy → **build**

- **무엇**: 막대 채우기 모션을 두 종류로 일관화: (1) 코치 루프의 새 칸은 segPop(coach.module.css:141, scale 0.5→1, nth-child 단계 지연 0.05~0.26s)로 레몬 칸이 톡 터지듯 등장 — '내가 키웠다' 피드백. (2) 채점/전후비교 경로는 growBarFromV1(globals.css:199, v1 위치에서 v2로 자라남). 두 키프레임을 '성장=자라남' 단일 모션 언어로 문서화하고, 버튼 hover/active(coach.css .btn:127), nudge '왜 중요해?' 토글, 칩 활성화에 동일 --ease(cubic-bezier(0.32,0.72,0,1))를 적용해 모든 전이가 같은 감속 곡선을 쓰게 한다.
- **왜 즐거운가**: 고칠 때마다 레몬 칸이 단계적으로 톡톡 차오르는 보상감이 글쓰기를 게임처럼 만든다. 모든 인터랙션이 같은 '말랑한' 감속이라 제품이 한 손에서 만든 것처럼 느껴진다.
- **대필 안전 보장**: 순수 시각 모션 — 막대는 수치를 숨기고(revision.ts 수치숨김 계약) 점수 숫자를 노출하지 않으며 문장 생성과 무관.
- **재사용**: coach.module.css(.segGain/segPop/nth-child 지연), globals.css(growBar/growBarFromV1/score-bar), GrowthBars.tsx, lib/revision.ts(toBarSegments), --ease 토큰
- **신규 작업**: --ease를 globals.css @theme로 승격해 전 앱 transition 표준화, 버튼/토글/칩 transition을 --ease로 통일, 두 막대 모션의 사용 규칙 주석(코치=segPop, 채점=growBarFromV1)
- **검증 근거(불변식)**: 순수 시각 모션. 막대는 수치 숨김 계약(revision.ts toBarSegments) 하에 점수 숫자 비노출이며 문장 생성과 무관. 검증: coach.module.css segPop(:135 animation: segPop 0.4s var(--ease)), globals.css growBarFromV1(:205) 실재.
- **수정/보류 노트**: 가장 작은 변경(S 정확). 핵심 발견: --ease(cubic-bezier(0.32,0.72,0,1))는 globals.css:119에 있으나 @theme 블록이 아닌 :root에 있고, coach.module.css:44/coach.css에 중복 정의됨. @theme로 1회 승격하면 전 앱 transition 표준화 가능 — 브리프 주장 정확. 사용 규칙 주석(코치=segPop, 채점=growBarFromV1) 추가만 하면 됨. 위험 없음.

### 통합 접근성·모바일 우선 기준선  ·  effort M · 검증: ✅ safe / moderate → **build**

- **무엇**: 이미 산재한 a11y 자산을 단일 기준으로 정렬: prefers-reduced-motion 가드를 globals.css(:226)·coach.module.css(:178) 두 곳에서 동일 규칙으로 유지하고 새 모션(--ease 전이)도 이 미디어쿼리에 등록. Canvas의 sr-only 라벨·글자수, NudgeCard의 data-testid 계약, RevisionToggle의 ARIA tablist+화살표 키, AnnotatedBody의 role=button/Enter·Space/focus ring을 '컴포넌트 a11y 체크리스트'로 표준화. 포커스 링 색을 통합 토큰(--color-primary=blue)으로 통일(현재 일부 ring-[#24D39E]). 모바일 우선: 사이드바는 드로어, 코치는 BottomSheet로 단일 컬럼 흐름 유지(Sidebar.tsx:5 'wireframe §0 세로 1방향').
- **왜 즐거운가**: 키보드·스크린리더·모션 민감·작은 화면 어디서든 동일하게 매끄럽게 동작해, 미성년·다양한 환경의 학생이 막힘 없이 글에 집중한다.
- **대필 안전 보장**: a11y/반응형 표준화는 코치 출력 계약을 건드리지 않는다. 포커스·키보드 보조는 학생의 직접 작성을 돕는 비계일 뿐 문장 생성이 아니다.
- **재사용**: Canvas.tsx(sr-only/count), NudgeCard.tsx(data-testid), RevisionToggle.tsx(ARIA tablist), AnnotatedBody.tsx(role/keyboard), globals.css·coach.module.css(reduced-motion), ThemeToggle.tsx
- **신규 작업**: 포커스 링 색을 ring-primary로 통일(ring-[#24D39E] 제거), 새 --ease 전이를 prefers-reduced-motion 가드에 등록, 컴포넌트 a11y 체크리스트 문서 1매
- **검증 근거(불변식)**: a11y/반응형 표준화는 코치 출력 계약 무접촉. 포커스·키보드 보조는 학생 직접 작성을 돕는 비계일 뿐 문장 생성이 아니다. NudgeCard data-testid 계약(coach-nudge/coach-fixed, :43,86), Sidebar 드로어(:5 'wireframe §0 세로 1방향'), reduced-motion 가드(globals.css/coach.module.css) 모두 실재 확인.
- **수정/보류 노트**: 포커스 링 통일은 ring-[#24D39E]가 단 1곳(AnnotatedBody.tsx:84)뿐이라 ring-primary 치환 비용 거의 0 — 기능1과 묶어 처리하면 효율적. 신규 --ease 전이를 prefers-reduced-motion 가드에 등록하는 것은 필수(모션 추가 시 동시 등록 안 하면 회귀). a11y 체크리스트 1매는 문서 산출물이라 코드 위험 없음. effort M은 분산된 자산 정렬 비용 반영으로 타당.

**이 영역 우선 추천**: 먼저 지을 것: (1) "단일 브랜드 토큰 통합" — 다른 4개 기능이 모두 의존하는 색 기반(포커스 링 통일, GrowthCard 의미 분리, --ease 표준화의 시각적 토대)이라 우선순위 1번. effort도 M으로 가장 ROI가 높다. (2) "성장 막대 모션 표준화(S)" — 자산이 이미 segPop/growBarFromV1로 존재하고 --ease만 @theme로 승격하면 되는 가장 작은 변경이라 빠른 가시 성과. 이 둘로 "한 제품 한 팔레트 + 한 감속곡선"을 먼저 확보한 뒤, 레이아웃 대수술인 "3중 크롬 평탄화(L)"와 "2패널(L)"을 한 묶음으로 진행. a11y 기준선(M)은 레이아웃 변경에 묻어가도록 마지막. 전 기능이 대필 불변식과 완전 분리(시각/레이아웃/a11y만)되어 invariant 측면 리스크는 0에 수렴 — 적대적 심사에서도 violates/risky 없음.
