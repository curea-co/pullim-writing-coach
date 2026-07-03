# 라이팅 코치 인수인계 — 2026-07-03 (의연 → 선혜)

이 문서 하나로 현재 상태·남은 작업·작업 지침을 파악할 수 있게 정리했다.
**모든 "완료" 표기는 실측(실행 결과·스크린샷·curl) 기반**이며, 미확인 항목은 미확인이라고 적었다.

- 레포: https://github.com/curea-co/pullim-writing-coach (main 기준 `197e7b2`)
- 서비스: **https://writing.pullim.ai** (Vercel 프로젝트 `pullim-writing-coach`, team curea — main push 시 자동 prod 배포)
- 관련 레포: pullim-api(백엔드·인증) · pullim-web(중앙 로그인 UI)

---

## 1. 현재 상태 (무엇이 어디까지 됐나)

### 1-1. 아키텍처 한 장 요약
- **인증**: 자체 인증 없음. 중앙 SSO **소비자** — 헤더 로그인 버튼 → `pullim.ai/login?next=<복귀URL>` → 로그인 후 복귀 → 브라우저가 `api.pullim.ai/me`를 직접 호출(credentials 포함, `.pullim.ai` 공유 쿠키)해 세션을 읽는다. `/me` 401 시 csrf→refresh→재시도(15분 만료 대응). 코드: `app/lib/use-auth.tsx`(클라) · `app/lib/server/pullim-session.ts`(서버 검증, prod fail-closed).
- **인가**: `/api/score·coach·extract`는 `verifyWritingAccess`(서버에서 `/me` 쿠키 릴레이) — 회원이면 통과. 비prod 한정 데모토큰 fallback 잔존(로컬 개발용).
- **per-user 데이터**: 6종(프로필·결과·수정이력·임시저장·메타·동의)을 `app/lib/storage.ts` 어댑터가 라우팅 — **로그인=자체 `/api/data/*` → Supabase Postgres** / **게스트·로컬=localStorage**. DB는 단일 KV 테이블 `writing_user_data(user_id=sub, data_key, payload jsonb)`. 코드: `app/lib/server/db.ts`(postgres 드라이버) · `app/api/data/`.
- **AI**: 채점 `/api/score`·코치 `/api/coach`·추출 `/api/extract` — Anthropic API(`ANTHROPIC_API_KEY`).

### 1-2. 완료 (실측 확인)
| 항목 | 상태 | 근거 |
|---|---|---|
| 중앙 SSO 로그인 배선·nav·게이팅·refresh | ✅ main | PR #110·#111·#114 |
| per-user store(계정 귀속) | ✅ main | PR #115·#116 |
| Supabase 프로비저닝 | ✅ | 프로젝트 생성·`0001_init` 마이그레이션 적용(`db:migrate done`)·Vercel **Production**에 `DATABASE_URL`(Transaction pooler 6543) 설정·재배포 |
| **api CORS에 writing 등재** | ✅ 2026-07-03 | ECS 태스크 리비전 dev `pullim-api-dev:94`(+dev-writing) · prod `pullim-api-prod:6`(+writing). preflight 실측: writing에 allow-origin 회신 + 기존 origin(os·apex·planner) 회귀 없음. **SoT 문서 PR: pullim-api #269(리뷰 대기)** |
| 데모 브랜딩 제거(타이틀·배지·E-AUTH 문구) | ✅ main | PR #118 (동의 본문은 제외 — §2-2) |
| UX 점검 개선 11건 | ✅ main | PR #122~#125 (사이드바 아이콘·저장위치 안내 3-상태·코치 정리·모바일 탭바/헤더·카피) |
| prod 서빙·인증게이트 | ✅ | `writing.pullim.ai` 200, 무인증 `/api/data` 401 |

### 1-3. ⚠️ 미확인 (완료 아님 — §2-1이 첫 작업)
- **CORS 반영 후 실브라우저 로그인 e2e** — preflight는 통과 확인했지만 **실제 로그인→헤더 사용자명 표시는 아직 아무도 확인 안 함**.
- **Supabase 실 데이터 왕복** — 마이그레이션은 됐지만 **authed 채점→저장→다기기 조회는 미실증**.
- `ANTHROPIC_API_KEY` prod 설정 — 설정했다고 하나 **채점 성공으로 실증된 적 없음**(과거 06-25 로그에 "미설정" 에러 이력).

---

## 2. 남은 작업 (우선순위순)

### 2-1. 🔴 종단검증 (첫 작업 — 30분)
1. https://writing.pullim.ai 접속 → **로그인** → 헤더에 사용자명 표시 확인.
   - 안 되면: 브라우저 devtools Network에서 `api.pullim.ai/me` 응답/CORS 에러 확인 후 §4 트러블슈팅.
2. 직접 채점받기 → 글 50자+ 입력 → 채점 → 결과 정상 + `/results` 저장 확인.
   - 채점 실패 시: Vercel → pullim-writing-coach → Logs에서 `/api/score` 에러 확인(대개 `ANTHROPIC_API_KEY`).
3. **다른 브라우저/기기**로 같은 계정 로그인 → `/results`에 같은 결과 보이면 **계정 귀속(Supabase) 성공**.
4. 내 정보 → 데이터 삭제 → 성공 후 다기기에서도 비워짐 확인.
5. Vercel Runtime Logs에서 `[db]`/`/api/data` 에러 0 확인.
- 결과를 슬랙 #3_풀림에 보고(성호님) — "2번(남은 것)이 가장 중요" 형식(§3-4).

### 2-2. 🔴 동의 문구(ConsentNotice) — EPO 승인 필요
- `app/components/ConsentNotice.tsx`의 서비스 동의 본문은 **EPO 승인 잠금**(파일 헤더 "변경 금지" 명시) — 임의 수정 금지.
- 문제: 현행 본문이 "이 데모는… **이 브라우저에만** 저장(서버 X)"인데 로그인 회원은 **서버(Supabase) 저장** — 고지 불일치(컴플라이언스).
- **승인용 교체안**(이대로 EPO에게 전달) — 저장 범위는 실제 계정 저장 6종(`storage.ts` DATA_KEYS: 프로필·채점 결과·수정 이력·임시 저장본·자주 쓰는 메타·동의 기록) 전부를 고지:
  > 입력하신 프로필(닉네임·학년·과목 등)과 글·채점 결과·수정 이력·임시 저장본·동의 기록은, **로그인하면 내 풀림 계정에** 저장돼 다른 기기에서도 이어볼 수 있고, **로그인하지 않으면 이 브라우저에만** 저장돼요. 닉네임·학교명은 **선택 입력**이고, 결과 화면·PDF에만 표시됩니다. 만 14세 미만이라면 보호자에게 알리고 사용해 주세요. 데이터는 **[내 정보] > [데이터 삭제]**에서 언제든 한 번에 지울 수 있어요(계정 데이터 포함).
- 승인되면: 본문 교체 PR + 파일 헤더의 승인 일자 갱신. 동의 **문구 자체를 assert하는 테스트는 현재 없음**(로직 테스트는 `scripts/consent.test.mjs`·`scripts/consent-store.test.mjs`) — 교체 후 `npm run test:unit`·`test:components`로 회귀만 확인.
- 함께: **미성년 에세이 서버 보존 기간/정책** 확정(법무/PM) — 정해지면 동의문에 한 문장 추가.

### 2-3. 🟡 운영 env 마감
- Vercel → pullim-writing-coach → Settings → Environment Variables(**Production**):
  - `ANTHROPIC_API_KEY` 존재 확인(§2-1의 채점 성공이 실증).
  - `SENTRY_DSN`·`NEXT_PUBLIC_SENTRY_DSN` 설정(README상 P0) — Sentry 프로젝트에서 발급.
  - `DEMO_ACCESS_TOKEN`·`NEXT_PUBLIC_DEMO_TOKEN`·`DEMO_SESSION_SUB` — **prod에 없어야 함**(있으면 삭제).
  - `NEXT_PUBLIC_API_URL=https://api.pullim.ai` · `NEXT_PUBLIC_WEB_URL=https://pullim.ai` · `NEXT_PUBLIC_OS_URL=https://os.pullim.ai/os`(**/os 포함**).
- 🔴 **`DATABASE_URL`은 Production 에만.** Preview에 넣으면 프리뷰가 운영 미성년 데이터를 읽고/씀 — 금지(상세: `docs/ops-db-provisioning.md` §4).

### 2-4. 🟡 pullim-api 후속 (성호님과)
- **PR #269**(writing origin 문서 SoT) 리뷰·머지 요청 — 런타임은 이미 반영됐고 문서만 남음.
- ECS 반영 내역 공유: dev `pullim-api-dev:94` / prod `pullim-api-prod:6` (기존 목록에 origin 추가만, 이전 리비전 존재=롤백 가능).

### 2-5. 🟢 후속 기능 (로드맵 — 급하지 않음)
- 헤더 검색·알림 실기능(현재 disabled·모바일 숨김).
- 코치 "말하기" 모드(현재 준비 중 disabled).
- 데모 게이트 완전 제거(로컬 fallback·`x-demo-token` 경로 정리 — 제거 시 E-AUTH 메시지 이슈도 자연 해소, PR #118 코멘트 참조).
- dev-writing.pullim.ai dev 티어 구축(선택): Vercel 도메인 추가 + dev-api 향 env 분리. dev-api CORS는 이미 열려 있음(:94).

---

## 3. 작업 지침 (이 레포에서 일하는 법)

### 3-1. 팀 공통 (성호님 지침 — 항상 우선)
- **브랜치/PR**: main 직push 금지. 기능별 브랜치 → PR → CI green + 리뷰 해소 → squash 머지. (pullim-api에 PR 낼 땐 **base=dev**.)
- **로컬 포트**: 라이팅코치 = **3008**, 접속은 `http://writing.pullim.local:3008`(hosts 등록, 쿠키 SSO). 포트 SoT = pullim-api `.claude/rules/local-ports.md`.
- **로그인/SSO**: 자체 로그인 만들지 않음 — 중앙 위임(`?next=` 쿼리). 쿠키는 api가 굽고 우리는 소비만.
  ⚠️ 쿠키 도달 범위는 환경별로 다름: **dev/prod는 `Domain=.pullim.ai` 공유**(writing 서버에도 도달), **로컬은
  api 호스트 전용(host-only)이라 writing-coach 서버에 도달하지 않음** → 로컬 서버 인가는 데모토큰 fallback에
  의존(브라우저→api 직접 호출인 `/me` 읽기는 로컬도 동작). 상세: `app/lib/server/pullim-session.ts` 주석.
- **DB/마이그레이션**: 임의 생성·배포 금지, 엔티티/스키마 먼저 검증. 이 레포 DB는 자체 Supabase(pullim-api RDS 아님 — writing은 schema-less 소비자, q/ADR-031 선례).
- **완료 기준**: "코드 머지"가 아니라 **배포 환경에서 동작 확인**. 0%면 0%로 보고.
- **보고 형식**: ① 한 것(실행 결과 근거) ② **남은 것/막힌 것(가장 중요)** ③ 다음 계획. 추측 금지 — 실측만.

### 3-2. 이 레포 검증 게이트 (PR 전 로컬에서 전부 green)
```bash
npm run typecheck        # tsc — 출력 없으면 통과
npm run test:unit        # node --test (~461)
npm run test:components  # vitest+RTL (~237)
npm run build            # next build
npm run test:e2e         # playwright 3브라우저 (~36) — 시간 걸림, UI 변경 시 필수
```
- dev 서버: `npm run dev` (3008). E2E도 3008 전제(`playwright.config.ts`).
- 로컬 실채점 셋업: `.env`는 gitignored(새 환경엔 없음) — `.env.example`을 복사해 `ANTHROPIC_API_KEY`와
  `DEMO_ACCESS_TOKEN`/`NEXT_PUBLIC_DEMO_TOKEN`(로컬 게이트 자동입장)을 채우면 로컬에서 실채점 가능.

### 3-3. Codex 자동리뷰 대응 (경험으로 굳은 규칙)
- PR을 올리면 Codex가 리뷰 스레드를 단다. **모든 스레드를 반드시 읽고 평가한 뒤** 처리:
  - 타당 → 실제 수정 → "수정(커밋SHA) — 무엇을 어떻게" 답글 → resolve.
  - 부당 → 근거(코드·실측)를 답글로 → resolve. **읽지 않고 일괄 resolve 절대 금지**(이번 세션에서 두 번 사고 남 — PR #118·#119 정정 코멘트 참조).
- push하면 재리뷰가 돌아 같은 지적이 새 스레드로 재게시될 수 있음 — 이미 반영한 커밋을 명시해 resolve.
- 머지 조건: unresolved 0 + checks fail 0 + mergeState CLEAN/UNSTABLE. BEHIND면 branch update 후 재확인.

### 3-4. 하드 룰 (어기면 사고)
- **시크릿**: 채팅·커밋·argv·로그에 절대 금지. 접속문자열은 `read -s`로 env 주입(README §마이그레이션 예시). Vercel env는 서버 전용 키에 `NEXT_PUBLIC_` 금지.
- **prod fail-closed**: 인증·DB 코드는 prod에서 env 미설정 시 dev로 fallback하지 않는다(기존 코드가 전부 이 패턴 — 유지할 것).
- **error ≠ guest**: 인증서버 미확인(error)을 미로그인(guest)으로 표시/처리하지 않는다(`use-auth` 계약 — 헤더 "연결 오류" 중립 표시).
- **EPO 잠금 문구**(ConsentNotice) 임의 수정 금지.
- **마이그레이션 러너**(`scripts/db-migrate.mjs`)는 `;` 단순분할 = **단순 DDL 전용**(문자열/함수 본문 세미콜론 미지원).

### 3-5. 주요 파일 지도
```
app/lib/use-auth.tsx            # 클라 세션(3-상태: authed/guest/error, refresh 회전)
app/lib/pullim-login.ts         # login/signup/logout/osHub URL(?next=, same-origin 검증)
app/lib/server/pullim-session.ts# 서버 /me 검증(verifyWritingAccess·getSessionSub)
app/lib/server/db.ts            # Supabase postgres 드라이버(max:1·prepare:false)
app/lib/storage.ts              # 저장 어댑터(authed→/api/data, guest→localStorage, LRU)
app/api/data/                   # per-user CRUD(sub 스코프·data_key 화이트리스트)
app/components/TokenGate.tsx    # 인가 게이트(+로컬 데모 fallback, entered=글 보존)
app/components/nav-adapter.ts   # NAV·아이콘(exhaustive)·탭바 축약 라벨
docs/ops-db-provisioning.md     # Supabase 프로비저닝/마이그레이션/env 런북
.env.example                    # 전체 env 카탈로그(주석이 SoT급으로 정확)
```

---

## 4. 트러블슈팅 빠른 참조
| 증상 | 원인/확인 |
|---|---|
| 로그인했는데 계속 게스트 | `api.pullim.ai/me` CORS — preflight로 allow-origin 확인(§1-2 명령). ECS 태스크 env가 SoT(Secrets Manager 아님 — jr 때 확인) |
| 채점 E8/실패 | Vercel Production `ANTHROPIC_API_KEY` 미설정/오류 — Runtime Logs 확인 |
| 계정 데이터 안 보임/500 | `DATABASE_URL`(Transaction pooler 6543) 확인·Supabase 프로젝트 pause 여부(무료 티어) |
| 헤더 "연결 오류" | 인증서버 5xx/미도달 — 의도된 중립 표시(게스트 위장 아님) |
| 로컬에서 hydrate 멈춤 | `writing.pullim.local` hosts 미등록 또는 `next.config.ts` allowedDevOrigins |

CORS preflight 확인 한 줄:
```bash
curl -s -X OPTIONS -H "Origin: https://writing.pullim.ai" -H "Access-Control-Request-Method: GET" -D - -o /dev/null https://api.pullim.ai/me | grep -i access-control-allow-origin
```

## 5. 이력 참조 (왜 이렇게 됐나)
- SSO/포트/레이아웃: PR #110·#111 · 게이팅/refresh: #114 · per-user store: #115 · DB 변천: Neon(#115)→AWS postgres 드라이버(#116)→**Supabase**(#121 — Vercel Static IP 불가로 자체 RDS 안전연결 불가가 이유, `docs/ops-db-provisioning.md` 상단 참조) · 데모 브랜딩: #118 · UX 개선: #122~#125 · CORS 문서: pullim-api #269.
