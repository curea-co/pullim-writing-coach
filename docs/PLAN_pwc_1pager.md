# Pullim Writing Coach — 1장 계획 (초안)

> 작성일: 2026-05-26 · 트랙 B(FE/문서) 작성 · **검수·최종 승인: 최선혜(EPO)**
> 단계: WBS `00_WBS …_v.2` **P0.1** 산출물 — 유일하게 남은 P0 산출물(daily 09:30 기준)
> 성격: 정본은 WBS·API 계약. 본 문서는 **한 장 앵커** — 흩어진 결정을 1쪽으로 묶어 "지금 무엇을, 어디까지, 누가" 를 한눈에 보이게 한다. 상세는 짝 문서로 링크만 건다.
> 짝 문서: [00_WBS_v.2](00_WBS_PullimWritingCoach_2026-05-22_v.2.md) · [12_api_contract_v.1](12_api_contract_score_v.1_2026-05-22.md) · [13_scoring_philosophy](13_scoring_philosophy_decision_2026-05-22.md) · [02_functional_spec_v.3](02_functional_spec_v.3_2026-05-19.md) · [03_wireframe_v.3](03_wireframe_first_screen_v.3_2026-05-19.md)

---

## 1. 목표 (한 문장)

학생이 **과제 정보 + 쓴 글**을 입력하면, AI가 **5영역(과제 이해·내용 충실도·구조·논리·표현·문장·성장 가능성) 0~100점 + 영역별 잘한 점/고칠 점 + 수정 가이드 1~3개**를 돌려주는 **라이브 채점 서비스**를 만든다. 현재 데모는 정적 EPO 채점값만 표시 — **이번 작업의 핵심은 "라이브 채점 BE 구현 + 프롬프트 v0.2 보정"** 이다.

## 2. 채점 철학 (확정 — P-1.1)

상위 절반(74+)의 정답은 **EPO 자체 채점값**(A 74·E 85·B 86). 모델의 ~62 수렴은 **상위 구간 과압축(오판)**으로 보고 거부한다. → v0.2 프롬프트가 few-shot으로 모델을 EPO 분포까지 **상향**한다. 원칙: ① 오타·맞춤법 저비중 감점 ② 순위 보존(B>E) ③ on-task 우선. 상세 [13_scoring_philosophy](13_scoring_philosophy_decision_2026-05-22.md).

## 3. 범위

| 구분 | 내용 |
|---|---|
| **In (v1)** | `POST /api/score` 라이브 채점 API · 프롬프트 v0.2(EPO 분포 상향) · 후처리 가드(코드펜스·FIX_COUNT·DUPLICATION) · 입력 정규화·에러 처리 · 토큰 게이트 · FE 입력 화면 + 라이브 연동 · 기존 `/samples` 결과 UI 재사용 바인딩 |
| **Out (이번 제외)** | 응답시간 실측 단축(Haiku/스트리밍 — 배포 후 트랙) · 일일 글로벌 캡(비번 광범위 공유 전) · 점수대 슬롯 F·G(0~34·90~100) · 정식 외부 사용자 테스트 · 결과 이력·수정 전/후 비교(Month 2) · **Admissions Coach(별개 트랙 8/1)** |
| **신규 글 샘플** | **0건** — 데모 5종(A/B/C/D/E) 고정. 테스트는 5종 anchor + 임의 글 2~3건 |

## 4. BE / FE 분리

```text
┌─ 트랙 A (BE/프롬프트) ───────────────┐   ┌─ 트랙 B (FE/문서) ──────────────────┐
│ app/lib/prompt.ts   프롬프트 단일소스 │   │ app/try  학생 글 입력 화면 (폼·글자수) │
│ app/lib/grading.ts  순수 모듈         │   │ app/components/ScoreForm  입력·검증   │
│   (가드·스키마검증·normalizeBody)     │←─│ /samples  결과 UI (P3.3 라이브 바인딩) │
│   ※ SDK·server-only import 금지       │ 계약 │ 본 1장 계획 / AC 정의(별트랙)         │
│ app/api/score/route.ts  POST 파이프라인│ 공유 └────────────────────────────────────┘
│   (토큰→파싱→검증→정규화→Haiku→가드   │
│    →스키마검증→[무효 1회 재호출]→meta) │   ← 단일 계약 = 12_api_contract
└──────────────────────────────────────┘
```

- **계약 한 개로 묶인다**: [`POST /api/score`](12_api_contract_score_v.1_2026-05-22.md). 이 문서가 흔들리면 BE·FE가 함께 흔들린다.
- **경계 규칙**: `grading.ts`·`prompt.ts`는 **순수**(SDK import 금지) → FE가 타입·포맷 헬퍼를 그대로 import. 입력 정규화는 **서버가 권위 소스**, FE는 F3 버튼 게이트용으로 동일 룰을 클라이언트에서 한 번 더 적용(멱등).
- **재사용(신규 구축 아님)**: `scripts/verify.mjs`(채점 코어) → route.ts · `verify-results.json` 25건(eval 게이트) · `/samples` 결과 화면 · 08 §4 5건(few-shot anchor).

## 5. API 계약 (요약 — 상세 [12](12_api_contract_score_v.1_2026-05-22.md))

| 항목 | 값 |
|---|---|
| Method·Path | `POST /api/score` |
| 입력 | `{ assignment{school_level,subject,genre,target_char_count?,prompt_text}, submission{body}, meta{attempt_no…} }` |
| 출력(200) | `{ total_score, scores[5], revision_guides[1~3], meta }` ([samples.ts](../app/data/samples.ts) `F3Output` 동일) |
| 헤더 | `x-demo-token`(상수시간 비교, 불일치 401) |
| 모델 | Haiku 4.5 · `max_tokens=2000` · `temp=0.2` · `timeout=55s` · `maxRetries=0` |
| 런타임 | `nodejs` · `maxDuration=60`(critical gap 방어) |
| 에러 | E1/E2/E3/E4/E5·E6/E8/E10/E11/E-AUTH → HTTP 매핑(§5.2). FE는 code로 [wireframe §7](03_wireframe_first_screen_v.3_2026-05-19.md) 마이크로카피 매핑 |

## 6. 일정 (역산 — 상세 [WBS §0~1](00_WBS_PullimWritingCoach_2026-05-22_v.2.md))

| 마일스톤 | 마감 | 산출 |
|---|---|---|
| **M1** | 05-28(목) | **BE 골격 시연** — 라이브 채점 엔드투엔드 **1건** + 프롬프트 v0.2 진행 (게이트키퍼 미팅) |
| **M2** | 06-02(화) 16:00 | **완성** — FE 라이브 연동·통합 (대표 공유는 작업 중 수시) |
| **M3** | 06-05(금) | **사용자 테스트(내부·프록시) + prod 배포 완료** |

```text
05-26 화  P0 1장 계획 + 프롬프트 v0.2 캘리브레이션 / [B] FE 입력 화면 와이어·컴포넌트 골격 ★오늘
05-27 수  P1 v0.2 25건 재검증(eval 게이트) + P2 /api/score 착수 / [B] 컴포넌트 골격
05-28 목  P2 BE 골격 동작(엔드투엔드 1건) + 시연 준비          ▣ M1
05-29 금  P3 FE 입력 화면 + 라이브 연동(정적→API)
06-01 월  P3 결과 화면 연동 + 로딩/에러 처리 + 통합 리뷰
06-02 화  P4 최종 점검·통합 마무리                              ▣ M2
06-04 목  P5 사용자 테스트(내부·프록시) + 버그 픽스
06-05 금  P6 prod 배포 + 검증                                   ▣ M3
※ 휴일(작업 없음): 05-25 / 05-30·31 / 06-03. M1 전 working day 3일·버퍼 0 → M1을 '골격 시연'으로 정의해 수용.
```

## 7. M1 인수 기준 (이 골격이 "동작"한다는 판정)

- [ ] 정상 입력 1건 → `200` + 출력 스키마 100% 만족 (= **엔드투엔드 1건**, M1 충족 조건)
- [ ] `validateOutput` 위반 출력은 502, 깨진 JSON은 화면 미노출
- [ ] E 샘플(1/5 스키마 비결정성)이 **서버측 1회 재호출**로 200, 재호출도 무효면 E11(=E5/E6) 응답
- [ ] `E2·E3·E4·E10·E11·E-AUTH`가 [§5.2](12_api_contract_score_v.1_2026-05-22.md) 코드/상태로 반환
- [ ] `normalizeBody` 픽스처 테스트 통과 (`(하략)` 제거 / `<중략>` 자연연결 / 단어중간 줄바꿈→공백 · `\n\n` 보존)
- [ ] 타임아웃·429 무방비 제거 — `maxDuration=60`·`timeout=55s`·`maxRetries=0` 포함(흰 화면 critical gap 차단)

## 8. 최대 리스크 1개 (상세 [WBS §5·§9](00_WBS_PullimWritingCoach_2026-05-22_v.2.md))

**critical gap — `/api/score` 타임아웃·429 무방비.** 처리 없으면 ~25초 대기 끝에 흰 화면. P2.3에 타임아웃·재시도·사용자 메시지 필수. (그 외: env 미등록 401, novel 고점 보수 편향, KB 재인입.)

## 9. 결정 반영 (EPO 2026-05-26) · 미결

### 9.1 결정됨

- **novel 고점 −6~−10 보수 편향(09 v.2 §5.1) → P5 이관** (M1 골격에서 닫지 않음). 데모 5종은 anchor라 시연 경로엔 안 드러나고, M1 인수기준(§7)에도 *novel 고점 ±3*은 없음.
  - **(2.1) 수용/이관과 무관하게 P2.4에서 측정·로깅** — BE 자체 테스트의 임의 글 2~3건(daily 09:30 §3)에서 고점 편차를 실측·기록해 M1 시연을 눈 뜨고 들어간다. *측정 자체는 미루지 않는다.*
  - **(2.2) P5 재결정 트리거 (명문화)** — 실학생 **고점(EPO 추정 80+) 글 ≥ N건**에서 **평균 편차 ≤ −X점**이면 → **v0.3 캘리브레이션 후보**(새 고점 라벨 확보 후, 과적합 회피 — 09 v.2 §4-(b)). **> −X점**이면 → **영구 수용**(닫음). *기본값 N=5·X=5 제안, P5 착수 시 EPO 확정.* (2중 안전망 — daily 운영룰 1번: 본 §9 + P5 plan 양쪽 등록.)
- **에러 UX 카피·HTTP 코드 매핑(12 §5.2) — 적합, 수정 반영 완료**:
  - ① E8(503) 카피 → "일시적 오류예요. 잠시 후 다시 시도해 주세요"(인터넷 탓 표현 제거). 클라이언트 오프라인은 FE fetch reject 경로 별도 안내. *(12 §5.2 · 02 §6 · 03 §7 · `grading.ts` ERROR_MESSAGE · FE 매핑 동기화)*
  - ② E2/E11(422) vs E3(400) — *범위 위반=400 / 정규화 후 처리 불가=422* 의도된 구분 명문화. *(12 §5.2 · 02 §6)*
  - ③ E-AUTH(401) — 전용 데모 비밀번호 입력 화면 신설([TokenGate](../app/components/TokenGate.tsx), 12 §7.1.1). 401 재노출 연결은 P3.2.
  - ④ E5/E6(502) — 스키마 무효 시 서버 자동 1회 재호출 **유지** + `schema_retry`/`schema_fail_502` 메트릭 로깅([route.ts](../app/api/score/route.ts), 12 §4.3).
- **eval 게이트(25건) → MOCK 전환** — 5종 전부 anchor라 실호출은 회로적(09 v.2 §5.2). 기본 MOCK(무료)로 하네스 회귀만 검증, 실모델 기록은 `VERIFY_LIVE=1`. *(scripts/verify.mjs)*

### 9.2 미결

- [ ] **본 1장 계획의 범위·일정 최종 승인** (EPO)
- [ ] (P5 착수 시) 2.2 트리거의 N·X 확정
