# writing-coach BE 구현 작업 계획 v2.3 — pullim-Q 패턴 이식 (D11·정책 컨펌 반영)

> 작성: 2026-07-06 · v2.3 · 오너: 최선혜
> **v2.2→v2.3(대표님 답변)**: ①**D11 확정 = ⓑ 게스트 앱 진입 자체 차단** → 로그인 게이트 신설을 7/9 런웨이(7/7)에 추가 ②**정책 D1~D8 = 컨펌 취급(pass)** — PR #297 미머지이나 대표님 기지 사항. Phase 4 잔여 게이트는 D6 HTTP 표면(성호님)+Toss(구독)뿐
> **v2.1→v2.2(인수인계 대조)**: ①Phase 2 가드 = 현행 인가 동등(회원 통과 — flags.writing 아님!) + 비prod 데모토큰 fallback ②**D10** 신설(flags 강제는 Phase 4 크레딧과 함께 명시 전환) ③런웨이에 Supabase 티어/pause 확인·미성년 보존정책 확정·승격 PR merge-commit 명시 ④로드맵(§2-5) 승계 ⑤러너 DDL-전용·완료기준(배포 환경 동작) 불변식 추가
> 참조: `/Users/kokho/workspace/pullim-Q`(모노레포·NestJS 구조), 인수인계 문서 §2, 구독·크레딧 코드작업계획(pullim-api PR #297)
> **v2→v2.1 변경**: **writing.pullim.ai 배포일 2026-07-09 확정** → BE 전 Phase를 배포 후(7/10~)로 재게이트. 7/9까지는 launch 런웨이(§3-0)만. workspaces 추가도 Vercel 빌드에 영향(v2 "무접촉" 표현 정정) → 배포 주간 머지 금지.
> v1→v2 변경: ①모노레포 이동 후순위(가산형 `backend/`) ②ai 모듈 선행(크레딧 enabler) ③data 이관 조건부 ④종단검증 선행 ⑤마이그레이션 이중화 결정 ⑥크레딧 배선 위치(D9)

## 3-0. 🔴 7/9 배포 런웨이 (BE보다 선행 — launch critical)

**오픈일 = 7/10 (2026-07-07 갱신).** 오픈 스코프 = 현행 기능(무크레딧·무결제) + 게스트 진입 차단(D11ⓑ) + **DB = 기존 RDS(전환 후 오픈)**. 크레딧·구독은 D6+Toss 게이트로 범위 밖(정책 D1~D8 컨펌됨).

**DB 전환 결정(2026-07-07)**: 오픈일 7/10, "전환 후 오픈"(실사용자 데이터 이관 0인 지금이 최적). 경로: FE 무변경 → writing `/api/data`(BFF 유지) → **pullim-api KV 표면(쿠키+CSRF 릴레이)** → RDS `writing` 스키마. Supabase는 전환 검증 후 폐기(Restore는 임시 폴백용만).
**역할 분담(게이트키퍼 회신 2026-07-07)**: 계약 승인됨(우리 제안 그대로, CSRF 방식은 우리 결정 = **double-submit 릴레이 유지**). **표면 구현 = 우리**("AI 사용해서 직접") — pullim-api에 writing KV 모듈+마이그레이션+테스트+설계문서 PR(base=dev, 컨벤션·design-first 준수). 게이트키퍼 = 리뷰·머지·마이그레이션 적용·배포(dev 7/8 · prod 7/9 맞춰줌).

| 일자 | 작업 |
|---|---|
| 7/7(화) | ★**KV 표면 계약 합의 + 게이트키퍼 착수 요청**(하단 계약안) — 마이그레이션(writing 스키마)도 그쪽 주기 안에 · §2-2 EPO 발신(+보존정책) · §2-3 잔여 env(Sentry DSN·DEMO_\* 삭제) · (임시) Supabase Restore — 전환 지연 시 폴백 |
| 7/8(수) | 게이트키퍼 표면 dev 완료(가정) → **writing-coach 전환 PR**(서버 어댑터: db.ts 직결 → pullim-api HTTP 클라이언트, FE·라우트 계약 무변경) · ★게스트 진입 차단 게이트(D11ⓑ, FE PR — 기능 표면 로그인 필수·`?next=` 복귀·비prod 데모토큰 유지·error≠guest) |
| 7/9(목) | prod 반영(표면+마이그레이션) → **종단검증 재실행(RDS 기준: 채점→저장→다기기→삭제→로그)** · EPO 회신 시 ConsentNotice 교체 PR · **기능 프리즈** |
| 7/10(금) | dev→main 승격 — **PR + merge commit**(squash 금지 — SHA 발산) → 배포 → 스모크 → **오픈** |

### KV 표면 계약안 (게이트키퍼 전달용 — 현행 `/api/data` 계약 미러)
- 인증: **세션 쿠키**(JwtVerifyGuard, sub=토큰) — writing 서버가 쿠키 릴레이. mutation CSRF는 **double-submit 릴레이**(브라우저가 보낸 `pullim-csrf` 쿠키값을 X-CSRF-Token 헤더로 재전송) — 예외 처리 필요 여부는 BE 결정
- 엔드포인트: `GET/PUT/DELETE /writing/data/:key` + `DELETE /writing/data`(전체 삭제 — 계정 데이터 삭제 UX)
- key 화이트리스트 6종: `profile·results·revisions·drafts·meta_usage·consent` · payload = jsonb(크기 상한 BE 정책)
- 테이블: `writing.writing_user_data(user_id, data_key, payload, updated_at)` — 현행 `0001_init.sql` 미러, user_id=sub 스코프
- 에러: 401(비세션)·400(키 위반)·413(크기) — writing이 기존 E-AUTH/E1/E8로 매핑

- ⚠️ **에스컬레이션**: EPO 승인이 7/8까지 미회신이면 — 현행 문구로 오픈(미성년 고지 불일치 리스크) vs 연기 — 대표님 판단 필요.
- BE Phase 1+는 **7/10 이후 착수·머지**. 7/6~7/8 중 여유 시 브랜치 선작업만 허용(dev 머지 금지 — workspaces 추가가 Vercel 빌드 인스톨에 영향).

---

## 0. 왜 / 무엇 (한 줄)

writing-coach를 pullim-Q와 같은 **"단독 운영체 → 향후 pullim 플랫폼 흡수 준비"** 형태로: **`backend/`(NestJS 11, pullim-api 구조 차용)**가 writing 도메인 BE(AI 연산·크레딧 소비·데이터)를 소유한다. 단, **prod를 건드리는 변경은 전부 뒤로** — 기존 Next 앱·Vercel 배포는 BE가 배포 가능해질 때까지 그대로 유지(strangler).

## 1. 현재 상태 vs 목표

| | writing-coach 현재 (main/dev) | 목표 (pullim-Q 차용) |
|---|---|---|
| 구조 | Next.js 단일앱 (npm) | 루트 유지 + **`backend/` 가산** + npm workspaces (`apps/` 정리는 후순위 Phase 6) |
| BE | Next API routes가 사실상 BE — `/api/data`·`/api/{score,extract,coach}` | NestJS 11 + TypeORM. pullim-api 모듈 구조: `modules/<name>/{controller,dto,service,use-cases,infrastructure,interface}` |
| DB | Supabase 관리형 PG(`0001_init`, pooler 6543) — prod 가동 | **재사용**(신설 없음) + 로컬 docker PG |
| 인증 | ✅ pullim-api 위임 완료(BFF `pullim-session.ts`, CORS 등재) | 유지 — **BE에 auth 모듈 만들지 않음** |
| 응답 방식 | score/coach JSON(스트리밍 아님, maxDuration 60) | 프록시 홉 무해(확인됨) |

### pullim-Q에서 배울 것 / 반복하지 말 것
- ✅ 차용: NestJS 모듈 구조(흡수 용이) · 공유 계약 패키지 · docker 로컬 PG · **FE/BE PR 분리 최상위 규칙**(Codex 리뷰 수렴) · **Noop 어댑터 패턴**(ADR-052 NoopCreditMeterAdapter — seam 먼저, 실구현 나중).
- ⛔ 반복 금지 1 — **자체 auth**: pullim-Q는 자체 signup/login 구현 후 pullim-api 위임(Model B)으로 컷오버, 자체 auth는 미배포 legacy화. → BE 세션 검증 = 쿠키 포워드로 pullim-api 프로브(`/me/entitlements` + `flags.writing`)만.
- ⛔ 반복 금지 2 — **배포 없는 백엔드가 prod 경로를 잡아먹는 것**: 조직 전례상 도메인 BE는 pullim-api 모놀리스로 흡수(planner·classbot·q, ADR-001)됐고 스탠드얼론 NestJS 별도 배포 전례 0(pullim-Q backend 미배포). → **BE가 배포되기 전까지 Next routes가 prod를 계속 서빙**하고, 이관은 "프록시 스위치(env)"로만 켠다. 배포 안 되면 prod는 아무것도 안 바뀜.

## 2. 목표 아키텍처

```
[browser] ──(계약 무변경)── [Next.js @ Vercel, writing.pullim.ai]
                                │ (스위치 ON 시) BFF 프록시 — 쿠키 포워드
                            [backend/ NestJS]  ← 배포처: P0-1 (미정이면 로컬/dev 전용)
                                ├─ guards: PullimSessionGuard(pullim-api /me 릴레이 — **현행 verifyWritingAccess 동등: 회원 통과**, 단기 캐시. flags.writing 강제는 D10)
                                ├─ modules/ai      : extract·score·coach + rate limit + CreditPort seam(Noop→실)
                                ├─ modules/credit  : pullim-api auth 크레딧 포트(reserve/settle/release) HTTP 소비 — D6
                                └─ modules/writing-data(조건부) : per-user store CRUD
                            [pullim-api]  신원 + 크레딧 지갑(auth 소유, ADR-013·052) + 구독(billing, Toss 후)
```

불변식: ①자체 auth 없음 ②Anthropic 호출 전 크레딧 선차감(도입 시) ③시크릿 커밋 금지·fail-closed·error≠guest(인수인계 §3 승계) ④**마이그레이션 = 기존 방식 유지**(게이트키퍼 정정 2026-07-06): 신규 변경은 **새 파일 append**(`db/migrations/000N_*.sql`, SQL 러너 SoT) — "기존 init에 합쳐 초기화 후 배포" 방식 철회. **적용·배포는 게이트키퍼가 1~2일 주기**로 수행 → DB 변경은 배치로 묶고 즉시 반영을 전제하지 않는 설계(비차단). TypeORM은 `synchronize:false`+엔티티 매핑만(이력 이중화 금지). ※ Phase 0~4는 신규 마이그레이션 0건(ai=무DB, 크레딧 지갑=pullim-api auth 소유)이라 케이던스 영향 없음. ⚠️ 러너(`db-migrate.mjs`)는 `;` 단순분할 = **단순 DDL 전용**(함수/트리거 본문 세미콜론 불가 — §3-4). ⑤**Phase 완료 기준 = 배포 환경 동작 확인**(§3-1 — "코드 머지" 아님; BE는 배포 전까지 로컬/dev 실행 검증으로 대체하고 그렇게 보고).

## 3. Phase 계획 v2 (PR 단위: FE/BE/공유 분리 — pullim-Q 최상위 규칙)

| Phase | 내용 | PR | 공수 | 게이트 |
|---|---|---|---|---|
| **0. 종단검증** (인수인계 §2-1) | 리팩터 전 baseline green 실증: 로그인 동선·Supabase 왕복·ANTHROPIC 라이브 | — | 0.5d | 오늘 daily 계약과 동일 — **첫 작업** |
| **1. backend 가산** | 루트 이동 없이 `backend/` 추가(NestJS 11+TypeORM 엔티티 매핑+health+docker PG) + 루트 npm workspaces + CI에 BE 잡 추가 | BE PR 1 | 1d | ⚠️ **7/10 이후 착수·머지**(§3-0 — workspaces가 Vercel 빌드에 영향) |
| **2. 세션 가드** | `PullimSessionGuard` — **현행 인가 동등 이식**(`verifyWritingAccess` 패턴: `/me` 쿠키 릴레이, **회원이면 통과** — flags.writing 아님), error≠guest, prod fail-closed + **비prod 데모토큰 fallback**(로컬은 api host-only 쿠키가 writing 서버 미도달 — 인수인계 §3-1, BE도 동일 제약) | BE PR | 1d | ⚠️ flags.writing 강제 금지 — **진입 게이트는 영구 불변**(D10ⓐ, 매트릭스 "가입 회원=미리보기 체험" 보장) |
| **3. ai 모듈** ★크레딧 enabler | extract·score·coach 이관(anthropic.ts·프롬프트) + rate limit 재구현(edge→Nest 레벨, 한도 동일: score·extract 10/60, coach 20/120) + **NoopCreditPort seam**. 데모토큰 fallback은 **비prod 한정으로 이관**(§2-5 "완전 제거"는 로컬 서버 인가 대안 생긴 후 — 로드맵) | BE PR | 2d | ANTHROPIC_API_KEY BE env |
| **4. 크레딧 연동** | Noop→실 pullim-api auth 크레딧 포트(HTTP) + 잔액 402 + (FE PR) 잔액 표시. **프록시 스위치 설계 포함**(Next route→BE, env 토글). **인가 계층(D10ⓐ) 적용**: 진입+미리보기=회원(불변) 위에 **크레딧(수량)·유료 구간(refine) 게이트만 추가** — 진입 게이트는 좁히지 않음(매트릭스 보장) | BE PR + FE PR | 1~2d | ✅ 정책 D1~D8 컨펌됨(2026-07-06 pass) → 잔여 게이트 = **D6 HTTP 표면**(pullim-api측 작업 = 성호님, 코드계획 A1)뿐 |
| ~~5. writing-data 이관~~ | **소멸(2026-07-07)** — 데이터 소유 = pullim-api KV 표면(§3-0에서 오픈 전 전환). storage 3-상태·화이트리스트 계약은 전환 PR에서 유지 | — | — | P0-3 참조 |
| **6. `apps/` 모노레포 정리** (선택) | Next→`apps/web` 이동 + Vercel Root 전환(+turbo/bun 검토) | chore PR | 1~1.5d | 흡수 준비 시점 또는 필요 시. Preview 선검증 |
| **7. 구독** | 플랜·결제 | — | 별도 | ⚠️ Toss 심사 후 |
| **8. 공통 헤더·사용자 배지 정렬** (우선순위 최하) | pullim-Q `apps/q/components/shell/app-header.tsx` 구조에 맞춰 헤더 사용자 배지 드롭다운 수정 — 위에서부터 **①사용자 이름 ②로그인 여부(이메일/'로그인됨') ③대시보드 ④설정 ⑤로그아웃** | FE PR 1건 | 0.5~1d | 7/9 이후 아무 때나(다른 Phase와 독립) |

**크레딧 가동(무료 크레딧 경로)까지 = Phase 0~4 ≈ 5.5~6.5d.** (v1의 모노레포 선행 대비 단축 + prod 리스크 제거)
Phase 5~6은 배포처·흡수 일정에 종속 — 밀려도 크레딧 목표 무영향.

### Phase 8 구현 메모 (pullim-Q 헤더 정렬 — 이식 시 지킬 것)
- 참조 SoT: pullim-Q `apps/q/components/shell/app-header.tsx` (DropdownMenu 기반).
- **대시보드·설정 = OS(플랫폼) 소유 화면** — writing-coach 안에 만들지 않고 `NEXT_PUBLIC_OS_URL`(osHomeUrl 동형)로 **위임**, env 미설정(로컬/standalone)이면 두 항목 **숨김**(pullim-Q ServiceSwitcher 동일 정책).
- **로그아웃 UX(Codex 검증 패턴 승계)**: 명시적 로그아웃 신호 플래그(세션만료와 구분) + signOut 실패(403/5xx/네트워크) 시 **이동하지 않고** 에러 안내만(세션 살아있는데 로그인으로 보내는 혼란 방지).
- 수정 대상 = **main의 현행 헤더**(대표님 impl: `app-shell.tsx`·`use-auth.tsx` 배선) — `wip/local-sso-ported`의 SsoAuthButton 아님(폐기 예정 보존 브랜치).

### 로드맵 (인수인계 §2-5 승계 — 급하지 않음, Phase 8 뒤)
- **데모 게이트 완전 제거**(로컬 fallback·`x-demo-token` 경로 정리, E-AUTH 메시지 이슈 자연 해소) — ⚠️ 전제: 로컬 서버 인가 대안 확보(현재 로컬은 host-only 쿠키 미도달로 데모토큰 의존, §3-1). Phase 3 이관 시점엔 비prod 한정 보존.
- **dev-writing.pullim.ai dev 티어 구축**(선택) — Vercel 도메인 + dev-api 향 env 분리(dev-api CORS 이미 열림 `:94`). ★BE 도입 시 가치 상승: **Phase 4 프록시 스위치의 선검증 환경**으로 활용.
- 헤더 검색·알림 실기능(현재 disabled·모바일 숨김).
- 코치 "말하기" 모드(현재 준비 중 disabled).
- **저장 실패 오진 수정**(종단검증 2026-07-07 발견): `useScoreForm`이 채점 성공 후 저장(addResult 등) 실패를 **E5(모델 에러 문구)**로 표시 — DB 장애가 "결과를 다시 만들어야 해요"로 오진됨. 저장 실패 전용 코드/문구(예: "채점은 됐는데 저장에 실패했어요") 분리.

## 4. 결정 항목

| # | 결정 | 선택지 | 권고 |
|---|---|---|---|
| P0-1 | **backend 배포처** | ① ECS(성호님 협의) ② 기타 ③ 미정→로컬/dev 전용 지속 | ① 협의 시작하되 **개발 비차단**(③으로 진행, prod는 프록시 스위치 OFF 유지) |
| **D9** | **크레딧 배선 위치** (기존 코드계획 B1~B5와 충돌 해소) | ⓐ 본 계획대로 BE(NestJS)에 배선 — 재작업 0 ⓑ Next routes에 먼저 배선(#297 원안) — 최속이나 BE 이관 시 재작업 | **ⓐ** — 단, 오픈 데드라인이 당겨지면 ⓑ로 전환 가능(코드계획 M3 그대로 유효) |
| **D10** | **인가 계층 구조** — OS 티어 매트릭스: 라이팅코치 = 유료(체험 있음)·게스트 불가·**진입(가입 회원)=가능(미리보기 체험)** | ⓐ 3층: **진입+미리보기 = 가입 회원**(현행 `verifyWritingAccess` 유지 — 매트릭스 보장, 좁히지 않음) / **연산 수량 = 크레딧** / **유료 전체(refine=2) = 유료 플랜** ⓑ flags.writing 전면 강제(진입까지) | **ⓐ** — ⓑ는 매트릭스 "가입 회원 진입 가능" 위반. Phase 4에서 추가되는 것은 크레딧·유료 구간 게이트뿐, **진입 게이트는 불변** |
| **D11** | **"게스트: 불가" 해석** | ~~ⓐ AI만 불가~~ / **ⓑ 앱 진입 자체 차단** | ✅ **확정 ⓑ(대표님 2026-07-06)** → 로그인 게이트 신설(§3-0 7/7). 게스트 localStorage 경로는 사용자 도달 불가로 사실상 폐기 — 단 **error≠guest 폴백은 유지**(로그인 사용자의 인증서버 장애 시 로컬 낙하는 별개 계약). EPO 교체안의 "로그인하지 않으면 브라우저에만 저장" 문구는 그대로 발신(게스트 차단과 양립 — 문구 수정으로 승인 루프 재시작하지 않음) |
| P0-3 | data 이관 여부 | ~~우리 BE로 이관(Phase 5)~~ | ✅ **소멸(2026-07-07 재결정)** — writing 데이터 소유 = **pullim-api KV 표면**(게이트키퍼 제공, 오픈 전 전환). 우리 BE의 writing-data 모듈 불필요 → **BE 계획 = ai+크레딧으로 축소**(planner·classbot 흡수 패턴과 정합) |
| P0-5 | DB | ~~Supabase~~ → **기존 pullim-api RDS (오픈 전 전환)** | ✅ **확정(게이트키퍼·오픈일 7/10, 2026-07-07)**: 새 인스턴스 X, 기존 RDS `writing` 스키마. ⚠️ Vercel→RDS 직결 불가(유동 IP→0.0.0.0/0 금지, PR #119~121) → **접속 주체 = pullim-api KV 표면**(§3-0 계약안). 지금 전환 = 실사용자 데이터 이관 0. P0-1(ECS)은 다시 ai/크레딧 모듈용 결정으로 복귀(데이터 요건 아님) |

*(v1의 P0-2 패키지 매니저·P0-4 cutover 방식은 v2 구조로 소멸 — workspaces는 npm 가산, cutover는 env 프록시 스위치로 고정)*

## 5. 리스크 & 완화 (v2)

| 리스크 | 완화 |
|---|---|
| 배포처 미확정 장기화 | prod는 스위치 OFF로 무영향. BE는 로컬/dev에서 크레딧 개발·테스트 가치 유지. 흡수(모놀리스行)로 결론 나도 NestJS 모듈 구조라 이식 비용 최소 |
| ~~정책 컨펌 지연~~ → ✅ 해소(D1~D8 pass) | Phase 4 잔여 게이트 = D6 표면(성호님)뿐. seam(Noop)까지 만들어두면 표면 확인 후 1~2d 내 가동 |
| 게스트 차단(D11ⓑ)이 배포 주간 신규 스코프 | 작은 FE PR 1건으로 한정(가드 wrapper + `?next=` 리다이렉트 — TokenGate·use-auth 인프라 재사용). 7/8 검증 실패 시 **fast-follow로 강등**(7/9은 현행으로 오픈, 직후 패치) — 단독 판단 말고 대표님 공유 |
| D6 HTTP 표면 부재(pullim-api측) | 코드계획 A1 — 성호님 협의 항목으로 조기 전달(Phase 2 시점) |
| Codex 리뷰 발산 | 한 PR = 한 계층(FE/BE/공유 분리) 엄수 |
| rate limit 동작 차이(edge in-memory → BE) | 한도 상수 동일 유지 + BE 단위테스트로 고정. BE가 상주 프로세스라 오히려 카운터 신뢰성 ↑ |
| e2e(3008 전제) | Phase 1~4는 Next 무변경이라 e2e 무영향. 프록시 스위치 ON 검증 시에만 e2e 재실행 |

## 6. 착수 순서 (오늘 기준)

1. **Phase 0 종단검증** (오늘 daily 계약 그대로) → baseline 판정 기록
2. P0-1(배포처)·D6(크레딧 포트 HTTP 표면) → **gate keeper 협의 요청 발신** (비차단)
3. `git switch -c feat/backend-scaffold` (base: dev) → Phase 1 착수
4. 검증 게이트: 기존 `typecheck·test:unit·test:components·build`(Next 무영향 확인) + BE `lint·typecheck·test` CI 잡 green → PR → Codex 리뷰(읽고 평가 후 resolve) → dev 머지

---
관련: [인수인계 §2](handoff-2026-07-03-writing-coach.md) · 크레딧 코드계획(pullim-api PR #297 — **D9로 정합**) · pullim-Q `CLAUDE.md`·`proc/plan/2026-06-18_prod-login-pullim-api-cutover.md`(Model B)
