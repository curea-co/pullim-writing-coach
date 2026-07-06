# Pullim 인증 — Phase 1 로그인 + 세션 (BFF) — Design

> 2026-06-27 · 상태: 승인됨(brainstorming) → 구현계획 대기
> repo: `pullim-writing-coach` (Next 16 + React 19 + TS). 구현은 `main` 기준 `feat/pullim-auth-login`.
> 대상 백엔드: **`https://dev-api.pullim.ai`** (`pullim-api` 0.0.1, OpenAPI `/api-docs-json`).

## 목표
writing-coach가 **dev-api.pullim.ai에 실제 로그인**하는 모습까지 동작시킨다(Phase 1). 단일 공유 데모 토큰
게이트를 per-user 인증으로 전환하는 첫 단계 — **로그인 → 세션 지속 → 프로필(/me) → refresh → 로그아웃**.

## 스코프 분해 (전체 요청은 여러 서브시스템 → 분리)
- **Phase 1 (이 스펙) = 로그인 + 세션.** email/pw(dev seed-member 기반).
- Phase 2 = 회원가입(KCB 본인인증·14세 미만 보호자 동의·이메일 인증).
- Phase 3 = 대시보드(/me·entitlements·notifications) + 코치/채점/추출 API를 pullim 세션으로 게이팅(현 x-demo-token 대체).
- 비범위(Phase 1): OAuth 소셜 로그인, 회원가입, 대시보드, 데모 게이트 제거.

## 결정 (brainstorming 합의, 2026-06-27)
1. **로그인 방식 = email/pw + dev seed-member.** OAuth/KCB는 후속. dev `POST /auth/dev/seed-member`로 테스트 회원 생성.
2. **통합 = BFF 프록시.** 브라우저는 우리 origin(Next)만 호출(same-origin). Next 라우트 핸들러가 서버에서
   dev-api로 프록시 → CORS·cross-site 쿠키 문제 0, 로컬(localhost)·프로덕션 동일 동작, dev-api CORS 설정 의존 없음.
3. **토큰은 httpOnly 유지** — 프록시가 dev-api 쿠키를 우리 origin용으로 relay. JS에서 토큰 접근 0.

## dev-api 계약 (OpenAPI 발췌)
- **securitySchemes**: `access-cookie`(httpOnly `dev-pullim-at`) · `refresh-cookie`(httpOnly `dev-pullim-rt`, `Path=/auth`) · `bearer`(JWT). 인증은 **쿠키 기반**.
- `GET /auth/csrf` — CSRF 부트스트랩(double-submit + Origin 검증). security: none.
- `POST /auth/login` — body `{ email*, password* }`(LoginRequestDto). 200 성공(쿠키 set) · 400 형식 · 401 자격불일치/정지·삭제 · 403 CSRF(Origin/double-submit). security: none(CSRF 필요).
- `GET /me` — security `access-cookie`. 응답: `email·displayName·name`(복호화 실명 PII)·`ageBand` 등. 401 미인증 · 403 게스트(회원 전용).
- `POST /auth/refresh` — security `refresh-cookie`. refresh 회전. 401 무효/만료/도난 · 403 CSRF.
- `POST /auth/logout` — security `refresh-cookie`. 204 멱등(토큰 없어도 204). 403 CSRF.
- `POST /auth/dev/seed-member` *(dev 전용, prod 404)* — body `{ email*, password*, flags? }` → KCB 우회 테스트 회원 생성(email+pw 로그인 가능). 400/409.

**확정 필요(구현 시 검증)**: CSRF 헤더 이름 + dev-api가 허용하는 Origin 값 + Set-Cookie의 정확한 속성(Domain·SameSite·Secure). OpenAPI엔 "double-submit + Origin"만 명시 → dev-api 실응답/`api.md`로 확정. (사용자가 `api.md` 보유 시 공유받아 정밀화.)

## 아키텍처 & 컴포넌트
```
브라우저 ──(same-origin)──> Next route handler (/api/auth/*) ──(server fetch)──> dev-api.pullim.ai
   ▲                               │  쿠키/CSRF relay·재기록(httpOnly 유지)
   └───────── Set-Cookie(우리 origin) ┘
```

| 상태 | 경로 | 책임 |
|---|---|---|
| 신규 | `app/lib/server/pullim-auth.ts` | dev-api 호출 + 쿠키/CSRF relay 순수 헬퍼(라우트는 얇게). `PULLIM_API_URL` env. raw fetch(새 의존성 0). |
| 신규 | `app/api/auth/csrf/route.ts` | `GET /auth/csrf` 프록시 — CSRF 쿠키 relay + 토큰 반환 |
| 신규 | `app/api/auth/login/route.ts` | `POST /auth/login` — `{email,password}`+CSRF, dev-api Set-Cookie를 우리 host로 재기록해 relay |
| 신규 | `app/api/auth/me/route.ts` | `GET /me` — access-cookie 전달 → 프로필 |
| 신규 | `app/api/auth/refresh/route.ts` | `POST /auth/refresh` 회전 |
| 신규 | `app/api/auth/logout/route.ts` | `POST /auth/logout` — 204, 쿠키 클리어 |
| 신규 | `app/api/auth/dev/seed/route.ts` *(dev only)* | `POST /auth/dev/seed-member` 프록시. `NODE_ENV==="production"`이면 404 |
| 신규 | `app/lib/use-auth.tsx` | `useAuth()` 컨텍스트 — `{ user, status: loading\|authed\|guest, login, logout }`, `/api/auth/me` 기반, SSR 안전 |
| 신규 | `app/login/page.tsx` | email/pw 폼 + 에러(401·403·네트워크)·로딩. 성공 시 returnTo/홈 이동 |
| 수정 | 셸 헤더(`app/components/app-shell.tsx` 또는 헤더 슬롯) | 로그인 시 `displayName`+로그아웃, 미로그인 시 "로그인" 링크 |

### 쿠키 pass-through relay (핵심)
- 브라우저→Next 요청의 `Cookie`를 그대로 dev-api로 forward.
- dev-api 응답의 `Set-Cookie`(`dev-pullim-at`·`dev-pullim-rt`·CSRF)를 **우리 호스트용으로 재기록**(Domain 제거/우리 host, `dev-pullim-rt`의 `Path=/auth`→`/api/auth`)해 Next→브라우저 응답에 실어 relay. httpOnly·Secure·SameSite 보존.
- 다음 요청부터 브라우저가 우리 origin 쿠키를 Next로 보냄 → Next가 dev-api로 forward. 무상태(서버 세션 저장 없음).
- **CSRF**: `GET /api/auth/csrf`가 dev-api CSRF 쿠키를 relay + 토큰을 클라이언트에 반환. 변이 요청(login/refresh/logout)에서 클라이언트가 토큰을 헤더로 보내면 프록시가 dev-api로 forward(+ Origin 헤더를 dev-api 허용값으로 설정). 브라우저↔Next는 same-origin이라 SameSite가 1차 방어.

## 로그인 플로우 (end-to-end)
1. `/login` 마운트 → `GET /api/auth/csrf` → CSRF 토큰 확보.
2. email·password 제출 → `POST /api/auth/login`(CSRF 헤더).
3. 프록시→dev-api 200 → 쿠키 relay → 세션 성립.
4. returnTo(또는 홈) 이동 → `useAuth()`가 `/api/auth/me`로 사용자 표시.
5. 401 응답 시 `POST /api/auth/refresh` 후 1회 재시도, 실패면 게스트로 전환.
6. `POST /api/auth/logout` → 세션 종료 → 미로그인 UI.

## 에러 처리
- 400 → 입력 형식 안내. 401(login) → "이메일/비밀번호가 일치하지 않아요". 403(CSRF) → csrf 재부트스트랩 후 1회 재시도. 네트워크/5xx → 일반 실패 + 재시도. 자격증명은 로깅하지 않음.

## 보안
- 토큰 httpOnly(JS 접근 0) · CSRF 프록시 처리 · email/pw는 HTTPS로 우리 origin→서버→dev-api(중간 미저장·미로깅) · dev seed 라우트 prod 404(dev-api와 동형) · `PULLIM_API_URL` env(.env.example 갱신).

## 테스트
- **단위(node)**: `pullim-auth.ts` — Set-Cookie 재기록(도메인/Path 매핑) · CSRF 토큰 relay · 에러 매핑. dev-api fetch는 mock.
- **컴포넌트(vitest)**: `/login` 폼(제출 시 `/api/auth/login` 호출·에러 상태) · `useAuth`(me 200→authed, 401→guest).
- **수동/e2e**: `seed-member`로 테스트 회원 생성 → 로그인 → `/me` 확인(실 dev-api, 문서화 — 실 자격증명 필요해 CI 자동화는 mock 경계까지).
- typecheck + test:all + build 그린.

## 수용 기준
- [ ] `/login`에서 email/pw로 dev-api 로그인 성공 → 쿠키 세션 성립 → 새로고침해도 `/me`로 로그인 유지.
- [ ] dev seed-member로 만든 테스트 회원으로 로그인 가능(로컬).
- [ ] 잘못된 자격증명 → 친절한 에러, 토큰 미노출.
- [ ] 로그아웃 → 세션 종료 · refresh 회전 동작.
- [ ] 토큰 httpOnly 유지(JS에서 접근 불가) · CSRF 처리 · dev seed 라우트 prod 404.
- [ ] 기존 데모 게이트·코치 API는 무수정(공존) — Phase 3에서 세션 연동.

## 위험 / 미해결
- CSRF 헤더 이름·Origin 허용값·Set-Cookie 정확 속성 — dev-api 실응답/`api.md`로 확정 필요(구현 1번째 태스크에서 실측).
- 로컬(localhost)에서 dev-api 호출: BFF라 브라우저 쿠키 문제는 없으나, dev-api가 우리 서버 발 요청의 Origin/CSRF를 받아주는지 실측 필요.
- 실명 PII(`/me`의 name) 취급 — 화면 노출 최소화(displayName 우선), 로깅 금지.
