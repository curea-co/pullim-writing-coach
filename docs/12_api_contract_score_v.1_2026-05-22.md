# Pullim Writing Coach — API 계약 설계서 `POST /api/score` v0.1

> 작성일: 2026-05-22
> 버전: v0.1 (2026-05-22)
> 작성: 트랙 A (BE) · 검수: 최선혜 (EPO)
> 단계: WBS `00_WBS_PullimWritingCoach_2026-05-22_v.2` **P0.2 (API 계약 정의)** 산출물
> 짝 문서: `02_functional_spec_v.3_2026-05-19.md` (§4 입출력 스키마·§4.1.1 정규화·§6 에러) · `08_ai_prompt_v.1_2026-05-19.md`(→ v0.2 보정 중) · `09_prompt_verification_2026-05-21.md`(eval 게이트) · `00_WBS …_v.2.md`(정본 계획)
> 상태: **계약 1차 안정판** — functional_spec §4 스키마와 1:1 정합. 프롬프트 v0.2 확정(P0.3) 시 `meta.model_version` 문자열만 갱신.

---

## 0. 이 문서의 위치

- WBS 표준 흐름 **계획 → 검토 → 설계 → BE/FE**의 "설계" 산출물. `02_functional_spec` §3 F3(AI 첨삭 실행)을 **HTTP 엔드포인트 1개**로 확정한다.
- BE 구현([app/api/score/route.ts](../app/api/score/route.ts), WBS P2.1)과 FE 연동(P3.2)이 공유하는 단일 계약. 이 문서가 흔들리면 BE·FE가 함께 흔들린다.
- 코어는 신규 구축이 아니다 — `scripts/verify.mjs`의 Claude 호출·파싱·스키마 검증 로직(WBS §8)에 **HTTP 래퍼 + 가드 + 정규화 + 접근 제어**를 씌운 것이다.

### 0.1 정본(WBS) 결정 반영
| # | 결정 | 근거 |
|---|---|---|
| 1 | 엔드포인트 **`POST /api/score`** | WBS P0.2·P2.1 |
| 2 | 프롬프트 **v0.2 선행** (08 §4 5건 few-shot anchor → 25건 재검증 통과 후 BE) | WBS P-1.1→0.3→1.1, 09 §4.2 #1 |
| 3 | 모델 **Haiku 4.5로 v1 구현** | 본 결정으로 **WBS §7의 "Haiku=배포 후 트랙" 방침을 v1으로 상향** (응답성·비용·타임아웃 여유) |
| 4 | **후처리 가드 포함** (코드펜스 제거 + FIX_COUNT/DUPLICATION) | WBS P2.2, doc 08 §8 옵션 |
| 5 | **토큰 게이트 추가** (WBS 미기재 → 본 계약에서 신설) | 공개 데모 어뷰즈 가드. 일일 캡은 후속 |

---

## 1. 엔드포인트 요약

| 항목 | 값 |
|---|---|
| Method · Path | `POST /api/score` |
| 요청 본문 | `application/json` — §3 (functional_spec §4.1 정합) |
| 필수 헤더 | `Content-Type: application/json` · `x-demo-token: <비밀>` (§7 토큰 게이트) |
| 성공 응답 | `200` — §4 (functional_spec §4.2 정합) |
| 실패 응답 | `4xx/5xx` — §5 (functional_spec §6 E1~E11 매핑) |
| 런타임 | `runtime = "nodejs"` · `dynamic = "force-dynamic"` · **`maxDuration = 60`** (§6) |
| 캐싱 | 없음 (Route Handler POST는 기본 비캐시) |

---

## 2. 서버 처리 파이프라인

```text
요청
 │
 ├─[G1] 토큰 게이트     x-demo-token 상수시간 비교 ─ 불일치 → 401 (§7)
 │
 ├─[G2] 본문 파싱       JSON 파싱 실패 → 400 (E-PARSE)
 │
 ├─[V1] 입력 검증       필수 4 + 길이/범위/enum (§3.2) ─ 위반 → 400 (E1/E3/E10)
 │
 ├─[N1] 본문 정규화     normalizeBody(§4.1.1) → char_count 재계산(서버 권威)
 │        └ 정규화 후 50자 미만 → 422 (E2/E11)
 │
 ├─[M1] 모델 호출       Anthropic Haiku, system(캐싱) + user + assistant 프리필 "{"
 │        ├ 타임아웃(55s)·네트워크 → 504 (E4)
 │        └ 업스트림 429/5xx → 503 (E8)
 │
 ├─[P1] 후처리 가드     코드펜스 제거 → parse → FIX_COUNT/DUPLICATION 정정 (§8)
 │
 ├─[S1] 스키마 검증     validateOutput(§4.3) ─ 실패 → 모델 1회 재시도 → 그래도 실패 → 502 (E5/E6)
 │
 ├─[O1] meta 주입       서버가 meta 전체를 권위 있게 덮어씀 (§4.2)
 │
 └─ 200 + 출력 JSON
```

> 원칙: **클라이언트 입력은 신뢰하지 않는다.** 정규화·char_count·meta는 모두 서버가 다시 산출한다. 모델 출력의 `meta`도 신뢰하지 않고 서버가 덮어쓴다.

---

## 3. 요청 (Request)

### 3.1 본문 스키마 (functional_spec §4.1 정합)

```json
{
  "assignment": {
    "school_level": "중2",
    "subject": "국어",
    "genre": "논설문·주장하는 글",
    "target_char_count": 800,
    "prompt_text": "교복 자율화에 대한 자신의 주장을 근거 2개 이상으로 쓰시오."
  },
  "submission": {
    "body": "(학생이 입력한 본문 — 원본. 서버가 §4.1.1 정규화 적용)"
  },
  "meta": {
    "client_version": "v0.1",
    "submitted_at": "2026-05-22T10:30:00+09:00",
    "attempt_no": 1
  }
}
```

### 3.2 필드·검증 규칙

| 필드 | 타입 | 필수 | 검증 | 위반 시 |
|---|---|---|---|---|
| `assignment.school_level` | string | Y | enum: 중1/중2/중3/고1/고2/고3 | 400 `E1` |
| `assignment.subject` | string | Y | enum: 국어/사회/역사/도덕·윤리/과학/기타 | 400 `E1` |
| `assignment.genre` | string | Y | enum: 설명문/논설문·주장하는 글/감상문·독후감/성찰문·수필/보고서/요약문/기타 | 400 `E1` |
| `assignment.target_char_count` | number\|null | N | null 또는 정수 50~2,000 | 400 `E10` |
| `assignment.prompt_text` | string | Y | 10~1,000자 | 400 `E1` |
| `submission.body` | string | Y | **정규화 전** 원본. 정규화 후 50~2,000자 | <50 → 422 `E2`/`E11` · >2,000 → 400 `E3` |
| `meta.*` | object | N | 관대 수용 — 없거나 추가 키가 있어도 통과. 검증·채점에 미사용 | — |

> **정규화 위치**: functional_spec §4.1.1은 클라이언트 정규화를 권하나, 본 계약은 **서버를 권위 소스**로 둔다. 클라이언트가 보낸 `submission.char_count`는 받지 않으며(또는 무시), 서버가 `normalizeBody` 후 직접 계산한다. 정규화는 멱등이라 클라이언트가 먼저 정규화했어도 안전하다.
> **본문 삽입 안전**: body는 user 프롬프트의 삼중따옴표 구분자 안에 들어간다(doc 08 §3·§7 #7). 프롬프트 인젝션은 데모 저위험으로 수용하되, 길이 상한(2,000자)으로 토큰을 캡한다.

### 3.3 §4.1.1 정규화 룰 (서버 `normalizeBody`)

| 유형 | 처리 |
|---|---|
| `(하략)`·`(중략)`·`(전략)`·`(이하 생략)` | 표기 + 인접 공백 1칸 제거 |
| `<중략>`·`<생략>`·`[중략]`·`…(중략)…` | 제거 후 앞 종결부 마침표 보강 + 뒤 첫 글자 앞 공백 1칸 |
| 단어 중간 줄바꿈 (`관\n한`) | 공백 1칸으로. **단, 빈 줄 `\n\n`(문단 구분)은 보존** |
| 앞뒤 공백·탭 | `trim` |
| 연속 공백 3+ | 공백 1개로 축소 |
| 학생 mechanics 오류(맞춤법·띄어쓰기·오탈자·비문) | **보존** (채점 대상) |

> 정규화 결과가 50자 미만이면 `E11`. 정규식 회귀는 픽스처 테스트로 고정(WBS P2.3·본 설계 S3).

---

## 4. 성공 응답 (200) — functional_spec §4.2 정합

### 4.1 본문 스키마

```json
{
  "total_score": 72,
  "scores": [
    { "area": "과제 이해",   "score": 16, "max": 20, "feedback_good": "…", "feedback_fix": "…" },
    { "area": "내용 충실도", "score": 14, "max": 20, "feedback_good": "…", "feedback_fix": "…" },
    { "area": "구조·논리",   "score": 15, "max": 20, "feedback_good": "…", "feedback_fix": "…" },
    { "area": "표현·문장",   "score": 14, "max": 20, "feedback_good": "…", "feedback_fix": "…" },
    { "area": "성장 가능성", "score": 13, "max": 20, "feedback_good": "…", "feedback_fix": "…" }
  ],
  "revision_guides": [
    { "priority": 1, "action": "…(동사로 끝나는 실행형)", "reason": "…" }
  ],
  "meta": {
    "model_version": "writing-coach-prompt-v0.2",
    "generated_at": "2026-05-22T10:30:12+09:00",
    "is_verified": false,
    "disclaimer": "이 채점은 AI 자동 채점입니다. 학교 교사의 실제 채점과 다를 수 있습니다."
  }
}
```

> 이 스키마는 [app/data/samples.ts](../app/data/samples.ts) `F3Output` 타입과 동일하다. FE 결과 화면([app/samples/[id]/page.tsx](../app/samples/[id]/page.tsx))이 그대로 바인딩한다(WBS P3.3).

### 4.2 서버가 권위 있게 채우는 `meta`

모델 출력의 `meta`는 신뢰하지 않고 서버가 전부 덮어쓴다.

| 필드 | 값 |
|---|---|
| `model_version` | 프롬프트 버전 상수 (`writing-coach-prompt-v0.2`) |
| `generated_at` | 서버 시각, ISO 8601 `+09:00` |
| `is_verified` | 항상 `false` (사람 검수 전) |
| `disclaimer` | 고정 문자열 (위) — 화면·복사 텍스트에 항상 노출 |

### 4.3 스키마 검증 `validateOutput` (502 게이트)

`scripts/verify.mjs` `checkSchema` 이식. 아래 위반 시 **모델 1회 재시도 → 그래도 위반이면 502**(깨진 결과 미반환):

- `total_score`가 숫자이고 `scores[].score` 합과 일치
- `scores` 5개, `area`가 **고정 순서**(과제 이해 → 내용 충실도 → 구조·논리 → 표현·문장 → 성장 가능성)
- 각 `score` 0~20, `feedback_good`·`feedback_fix` 비어 있지 않음
- `revision_guides` 1~3개, `priority` 오름차순
- **모델 `meta` 누락·오류는 검증하지 않는다** (서버가 §4.2로 채우므로)

> **자동 1회 재호출 유지 + 메트릭 로깅 (EPO 2026-05-26 ④)**: 스키마 무효 시 *간헐적 비결정성*(E 1/5, 09 v.2 §3 #4)을 흡수하는 서버측 1회 재호출은 **유지**한다(사용자에게 묻지 않음 — 학생이 판단할 정보 없음). 단 검증을 위해 발동을 집계 가능하게 로깅한다: `[/api/score][metric]` 태그 단일 JSON 라인으로 `schema_retry`(재호출 발동) / `schema_retry_skipped_budget`(예산 부족 생략) / `schema_fail_502`(재호출 후에도 무효 → 502)를 기록. P2.4·P5에서 "재호출 빈도 / 502 ≈ 0"을 측정해 2단 설계를 검증한다. (서버리스 인메모리 카운터는 인스턴스 간 미공유 → 영속 집계는 로그 수집에서 grep. 외부 스토어는 §7.2 후속.)

---

## 5. 에러 응답 — functional_spec §6 매핑

### 5.1 에러 봉투 (공통)

```json
{ "error": { "code": "E2", "message": "본문을 50자 이상 입력해 주세요" } }
```

`code`는 functional_spec §6 E-코드. FE는 code로 wireframe §7 마이크로카피를 매핑한다(서버 `message`는 폴백).

### 5.2 상태 코드 매핑

| HTTP | code | 상황 | FE 카피 (wireframe §7) |
|---|---|---|---|
| 400 | `E-PARSE` | JSON 파싱 실패 | "결과를 다시 만들어야 해요…" |
| 400 | `E1` | 필수 4 미입력·enum/길이 위반 | (입력단 차단이 1차, 서버는 방어) |
| 400 | `E3` | 본문 2,000자 초과 | "2,000자까지 첨삭할 수 있어요" |
| 400 | `E10` | 목표 분량 범위 밖 | "목표 글자 수는 50~2,000자로 입력해 주세요" |
| 401 | `E-AUTH` | `x-demo-token` 누락/불일치 | (토큰 게이트 화면에서 재입력) |
| 422 | `E2` | 정규화 후 본문 50자 미만 | "본문을 50자 이상 입력해 주세요" |
| 422 | `E11` | 정규화 후 본문 부족(거의 표기뿐) | "글에 본문이 충분히 들어 있지 않아요…" |
| 502 | `E5`/`E6` | 모델 출력 파싱·스키마 실패(재시도 후) | "결과를 다시 만들어야 해요. 다시 시도해 주세요" |
| 503 | `E8` | 업스트림 Anthropic 429/5xx (서버 측 장애) | **"일시적 오류예요. 잠시 후 다시 시도해 주세요"** (EPO 2026-05-26 ①) |
| 504 | `E4` | 모델 응답 타임아웃(55s) | "지금 첨삭이 지연되고 있어요. 다시 시도해 주세요" |
| 429 | `E-CAP` | (예약) 일일 캡 초과 | — (후속, §7 캡 도입 시) |

> `E9`(재제출)은 에러가 아니라 정상 — `meta.attempt_no` +1로 통과. 클라이언트가 관리한다.
>
> **E8 카피 정정 (EPO 2026-05-26 ①)**: 503 `E8`은 *업스트림(Anthropic) 측* 장애다. 사용자 인터넷 탓이 아니므로 "인터넷 연결을 확인"이라 말하지 않는다. **진짜 클라이언트 오프라인**(서버에 도달조차 못 함 = HTTP 응답 없음)은 FE의 `fetch` reject 경로에서 별도로 "인터넷 연결을 확인하고 다시 시도해 주세요"를 띄운다 — 서버 503과는 다른 경로다.
>
> **E2(422) vs E3(400) 구분 (의도됨, EPO 2026-05-26 ②)**: 둘 다 본문 길이 위반이나 코드가 다른 것은 의도된 구분이다. **E3(2,000자 초과)는 정규화 *전* 입력값이 허용 범위를 벗어난 것** → 400(잘못된 요청 값). **E2/E11(50자 미만)은 정규화 *후* 비로소 채점 불가가 확정**되는 의미 판정(빈 본문이 아니라 표기 제거 결과 부족) → 422(Unprocessable Entity). 즉 *범위 위반=400 / 정규화 후 처리 불가=422*. (FE가 양쪽 다 입력단에서 막으므로 실사용 노출은 드물고, 서버는 방어선.)

---

## 6. 모델 호출 파라미터

| 항목 | 값 | 근거 |
|---|---|---|
| SDK | `@anthropic-ai/sdk` | doc 08 §5 |
| model | **`claude-haiku-4-5-20251001`** (env `ANTHROPIC_MODEL` 오버라이드) | 0.1 결정 #3 — Haiku v1 상향 |
| max_tokens | `2000` | doc 08 §1 |
| temperature | `0.2` | 재현 분산 ±3 (09) |
| system | `[{ text: SYSTEM_PROMPT_V2, cache_control: { type: "ephemeral" } }]` | doc 08 §1·§5. 단 데모 트래픽 산발적이라 캐시 적중률은 낮음(정합 목적) |
| messages | `[{ role:"user", content: userPrompt }, { role:"assistant", content:"{" }]` | **JSON 강제 프리필** (S2) |
| client opts | `{ timeout: 55_000, maxRetries: 0 }` | **자동 재시도 누적이 maxDuration 초과를 유발하므로 0** (S1) |
| 키 | `ANTHROPIC_API_KEY` (env, 서버 전용) | — |

> 프롬프트 본문(SYSTEM·USER 템플릿)은 [app/lib/prompt.ts](../app/lib/prompt.ts)가 단일 소스. v0.2는 doc 08 §4 5건을 시스템 프롬프트 끝에 few-shot anchor로 추가(P0.3). 본 계약은 프롬프트 버전 무관 — 버전은 `meta.model_version`에만 반영.

---

## 7. 접근 제어 (C2)

### 7.1 v1 — 토큰 게이트 (포함)
- 요청 헤더 `x-demo-token`을 env `DEMO_ACCESS_TOKEN`과 **상수시간 비교**. 불일치/누락 → 401 `E-AUTH`.
- 비밀은 **서버 env 전용 — 클라이언트 번들 미포함**. FE는 사용자가 입력한 값을 `sessionStorage`에 보관해 헤더로 전송.
- 보호 성격: 익명 인터넷·봇·`curl` 직접 호출 차단(접근 제어). 총 지출은 바운드하지 않음.

#### 7.1.1 401 UX 플로우 — 전용 입력 화면 (EPO 2026-05-26 ③)
입력 폼(`/try`) 진입 전 **데모 비밀번호 입력 화면**으로 게이트한다([app/components/TokenGate.tsx](../app/components/TokenGate.tsx)). 홈·`/samples`(공개 쇼케이스)는 게이트하지 않는다.

```text
/try 진입
  └ sessionStorage[pwc-demo-token] 있음? ─ 아니오 → [전용 입력 화면] 비밀번호 입력 → 세션 보관 → 폼 노출
                                          └ 예    → 입력 폼 노출 (+ "나가기" = 세션 토큰 폐기)
제출 시(P3.2): x-demo-token 헤더로 전송 → 서버가 진위 판정
  └ 200/4xx              → 결과·에러 표시
  └ 401 (E-AUTH)         → onAuthExpired(): 세션 토큰 폐기 + 입력 화면 재노출 + "비밀번호가 올바르지 않아요…"
```
- **진위는 서버만 안다** — 입력 화면은 값을 받아 보관만 하고, 검증은 제출 시 서버 401로 확정. (M1 골격은 화면+보관까지, 401 재노출 연결은 P3.2.)
- 비밀번호는 `sessionStorage`(탭 세션 한정)에만. localStorage·쿠키·URL 미사용.

### 7.2 후속 — 일일 글로벌 캡 (제외, 비번 광범위 공유 전 추가)
- `grade:count:YYYY-MM-DD` `INCR`+자정 만료, 상한 초과 → 429 `E-CAP`.
- 외부 스토어 필요(Upstash Redis 무료) — 서버리스 인메모리는 인스턴스 간 미공유.
- 데드라인: **데모 비번을 덱·메일에 싣기 전.** 그 전까지 토큰 게이트가 1차 방어.

---

## 8. 후처리 가드 (P1) — WBS P2.2

`scripts/verify.mjs`의 검출 로직 이식. 모델 출력 파싱 직후 **결정적으로** 보정:

1. **코드펜스 제거** — ` ```json … ``` ` 래핑 시 내부만 추출 후 `JSON.parse` (`parseModelJson`).
2. **FIX_COUNT** (`checkFixCount`) — 한 `feedback_fix`의 'A→B' 정정(`→`) 4개 이상이면, 핵심 1~2개만 남기고 나머지를 `revision_guides` 한 항목으로 묶음(최대 3개 유지). doc 08 §2 원칙 6·§8.
3. **DUPLICATION** (`checkDuplication`) — 동일 정정 토큰이 `feedback_fix`와 `revision_guides.action`에 중복되면 `revision_guides`에 남기고 `feedback_fix`에서 제거. doc 08 DUPLICATION_CHECK.

> 프롬프트가 1차로 강제(POSITION/FIX_COUNT/DUPLICATION)하고, 본 가드가 **코드 백스톱**이다(09 §4.2 #4 — "프롬프트만으론 100% 보장 못 함"). POSITION_CHECK 코드 검증은 v1 범위 밖(프롬프트 강제만).

---

## 9. 비기능 요구

| 항목 | 값 |
|---|---|
| `maxDuration` | **60초** — 응답 ~25초 + 여유. 누락 시 플랫폼 기본 타임아웃에 함수가 먼저 죽음(C1, WBS §9 critical gap) |
| SDK timeout | 55초(maxDuration 안쪽) |
| 모듈 경계 | `app/lib/grading.ts`·`prompt.ts`는 **순수**(SDK·server-only import 금지) — FE 클라이언트가 타입·포맷 헬퍼를 import (S4) |
| 배포 env | `ANTHROPIC_API_KEY` · `DEMO_ACCESS_TOKEN` (+후속 캡 시 `UPSTASH_REDIS_REST_URL`·`_TOKEN`) — Vercel 프로젝트에 등록 |

---

## 10. 인수 기준 (이 계약 충족 판정)

- [ ] 정상 입력 1건 → `200` + §4.1 스키마 100% 만족 (M1 엔드투엔드 1건)
- [ ] `validateOutput` 위반 출력은 502, 깨진 JSON은 화면 미노출
- [ ] `E2`·`E3`·`E4`·`E10`·`E11`·`E-AUTH`가 §5.2 코드/상태로 반환
- [ ] `normalizeBody` 픽스처 테스트 통과((하략) 제거 / `<중략>` 자연연결 / 단어중간 줄바꿈→공백·`\n\n` 보존)
- [ ] 25건 재검증(verify.mjs, eval 게이트)이 v0.2 프롬프트로 통과(P1.1) — **EPO 정답 ±3점(총점)·±2점(영역)** + 분산 ±3 + FIX/DUP 위반 0 (P-1.1 = 대안 A: EPO 유지, `13_scoring_philosophy_decision`)
- [ ] `x-demo-token` 불일치 시 401

---

## 11. 범위 밖 (이 계약에서 제외)

- 일일 글로벌 캡 / rate limit (§7.2 후속)
- 스트리밍·max_tokens 단축 등 응답시간 실측 최적화 (WBS §7 — 배포 후 트랙)
- POSITION_CHECK 코드 후처리 검증 (프롬프트 강제만; doc 08 §7 #2 후속)
- 프롬프트 v0.2 캘리브레이션 자체 (P0.3 별도 산출물 — 본 계약은 소비자)
- 채점 결과 이력 저장·재제출 비교(F13) (Month 2)
