# writing-coach per-user 데이터 store (item 3) — Design

> 2026-06-30 · 상태: 승인됨(brainstorming) → 구현계획 대기
> repo: `pullim-writing-coach` (Next 16 + React 19 + TS). 작업 브랜치(예정): `feat/per-user-store` (base = phase3 머지 후 main).
> 선행: 로그인(#111)·Phase3 게이팅/refresh(#112) 머지 필요(세션·`verifyWritingAccess`·`/me sub` 의존).

## 목표
writing-coach의 per-user 데이터(채점결과·프로필·수정이력·임시저장·메타)를 **localStorage(기기-로컬) → 계정 귀속 서버 저장**으로 전환. 다른 기기/브라우저에서도 로그인하면 내 데이터가 보인다(로그인의 핵심 가치 실현).

## 결정 (brainstorming 합의, 2026-06-30)
1. **방향 = writing-coach 자체 API+DB** (데이터-자체 / 신원-pullim). q식 pullim-api 모듈(B)·RDS 스키마(C) 배제 — writing은 schema-less 소비 서비스이고 writing-coach가 이미 자체 Next API를 가짐.
2. **DB = Neon** (Vercel Marketplace 서버리스 Postgres). 서버측 접속만(RLS/auth 미사용 — 신원은 pullim 세션). 드라이버 `@neondatabase/serverless`(신규 의존성 — DB 접속에 필수, 정당).
3. **범위 = 5종 전부** 계정 귀속: Results(≤20)·Profile·Revisions·Drafts·MetaUsage.
4. **신원 키 = `/me`의 `sub`** (안정 user id, 실측 확인). dev/prod에서 `.pullim.ai` 쿠키가 writing-coach 서버에 도달 → 세션 검증 가능.
5. **로컬/게스트 = localStorage 폴백.** 로컬(pullim.local)은 access 쿠키가 host-only(api 호스트)라 writing-coach 서버에 미도달 → 계정 store 불가 → 기존 localStorage 유지. 게스트(미로그인)도 localStorage.
6. **마이그레이션 백필 없음** — 계정 store는 신규 시작(기존 localStorage 데이터 자동 이관 안 함). "로컬 데이터 가져오기"는 후속 옵션(비범위).

## 아키텍처 (데이터-자체 / 신원-pullim)
```
브라우저(dev-writing.pullim.ai) ──> writing-coach Next API (/api/data/[key]) ──(server)──> Neon Postgres
   │  세션 쿠키(.pullim.ai 자동첨부)        │  getSessionSub(req): /me 검증 → sub        │  writing_user_data WHERE user_id=sub
로컬/게스트 ─────────────────────────────> localStorage (현 storage.ts) 폴백
```

## 데이터 모델 (단일 key-value 테이블 — localStorage 미러)
5종이 모두 `key → JSON` 형태이므로 서버도 동형으로 둔다. LRU(MAX_RESULTS=20·revision 3/thread)·런타임 type guard는 **어댑터 계층**에 그대로 유지(서버는 payload를 불투명 jsonb로 저장).
```sql
CREATE TABLE writing_user_data (
  user_id    text        NOT NULL,   -- = /me sub
  data_key   text        NOT NULL,   -- 'profile'|'results'|'revisions'|'drafts'|'meta_usage'
  payload    jsonb       NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, data_key)
);
CREATE INDEX idx_writing_user_data_user ON writing_user_data (user_id);
```
- 마이그레이션 = `db/migrations/0001_init.sql` + 적용 스크립트(`scripts/db-migrate.mjs`, Neon에 실행). 개발 DB 실행까지 확인(지침).
- `data_key` 화이트리스트 검증(임의 키 거부).

## 컴포넌트 (단위 분리)
| 상태 | 경로 | 책임 |
|---|---|---|
| 신규 | `app/lib/server/db.ts` | `import "server-only"`. Neon 접속(`DATABASE_URL` 시크릿) + `getUserData(sub,key)`·`setUserData(sub,key,payload)`·`deleteAllUserData(sub)`. |
| 수정 | `app/lib/server/pullim-session.ts` | `getSessionSub(req): Promise<string|null>` 추가 — `/me` 검증(verifyWritingAccess 동형) 후 `sub` 반환. |
| 신규 | `app/api/data/[key]/route.ts` | GET(load)·PUT(save)·DELETE. `getSessionSub`로 인증·sub 획득(없으면 401), `data_key` 검증, DB CRUD. |
| 신규 | `app/api/data/route.ts` (DELETE) | 계정 전체 데이터 삭제(`deleteAllUserData`) — "데이터 삭제" 서버 연동. |
| 수정 | `app/lib/storage.ts` | **비동기 인터페이스화.** 백엔드 라우팅: `accountMode`(authed·non-local)면 `/api/data/*`, 아니면 현 localStorage. LRU·type guard·기본값 로직은 어댑터에 유지. |
| 수정 | storage 호출부(results 페이지·/try·/coach·/me·hooks) | sync→async 전환(await). |
| 수정 | `app/me/page.tsx`(데이터 삭제) | 서버 데이터까지 삭제(authed면 `DELETE /api/data`). |

## 데이터 흐름
- **저장(authed)**: 컴포넌트 → storage.saveX(async) → accountMode → `PUT /api/data/results` → getSessionSub→sub → DB upsert. (LRU는 PUT 전 어댑터에서 적용)
- **조회(authed)**: storage.loadX → `GET /api/data/results` → sub 스코프 row → JSON.
- **게스트/로컬**: storage가 localStorage(현 로직) 사용.
- **로그인 직후**: useAuth authed 전환 → 이후 storage 호출이 accountMode로. (기존 로컬 데이터는 백필 안 함)

## 에러 처리
- 세션 만료/미인증(API 401): authed로 호출했는데 401이면 → **useAuth.refresh 1회 시도 → 성공 시 재요청, 실패 시 "로그인 필요" 안내**(로컬 폴백 금지 — 계정 데이터를 로컬에 분산 저장하지 않는다). 저장 실패 시 데이터 유실 방지 안내.
- DB 실패(5xx): 저장 실패 안내(재시도). 조회 실패: 빈 상태 + 안내(로컬 폴백 아님 — 계정 데이터를 로컬로 오인 금지).
- 자격증명·payload 본문 로깅 금지.

## 보안 / PII
- 학생 에세이(미성년 포함) = 민감 데이터. 계정 귀속 시: (1) ConsentNotice 동의가 서버 저장에도 적용, (2) **계정 데이터 삭제**(DELETE /api/data) 제공 — 기존 로컬 "데이터 삭제"를 서버까지 확장, (3) `user_id`(sub) 외 식별자 미저장(이메일·실명 미저장 — payload는 에세이·점수·메타만), (4) DB 접속은 server-only + 시크릿 env. 보존정책(기간)은 운영 결정으로 명시(비범위 — 기본 무기한, 삭제는 사용자 주도).
- 인가: 모든 `/api/data/*`는 `getSessionSub` 통과 필수(게스트 401). row는 sub로만 스코프(타인 데이터 접근 불가).

## 테스트
- **단위(node)**: `db.ts`(쿼리 — Neon mock)·`getSessionSub`(/me 200→sub, 401→null, fetch mock).
- **컴포넌트/통합(vitest)**: `/api/data/[key]` 라우트(인증·키검증·CRUD, db mock)·storage 어댑터(accountMode→API / guest→local, fetch·localStorage mock)·LRU 유지·데이터 삭제(서버+로컬).
- **Dev e2e(지침)**: dev-writing.pullim.ai 로그인 → 채점 → 결과가 **다른 브라우저/기기 로그인 시에도 보임**(계정 귀속 실증) + 게스트는 로컬만 + 데이터 삭제가 서버 반영.
- typecheck + test:unit + test:components + build 그린. Neon 마이그레이션 dev 적용 확인.

## 수용 기준
- [ ] 로그인 회원: 채점결과·프로필·수정이력·임시저장·메타가 **계정 귀속 저장**되고 다른 기기/브라우저 로그인 시 조회됨.
- [ ] 게스트·로컬(host-only): 기존 localStorage 동작 불변.
- [ ] storage 비동기 전환으로 기존 화면(결과목록·상세·/try·/coach·/me) 회귀 없음.
- [ ] 타 사용자 데이터 접근 불가(sub 스코프) · 게스트 `/api/data/*` 401.
- [ ] "데이터 삭제"가 서버 계정 데이터까지 삭제.
- [ ] Neon 마이그레이션 dev 실행 완료 · DATABASE_URL 시크릿.

## 위험 / 미해결
- **sync→async 전환 파급**: storage.ts 호출부 다수 → await 전환. 가장 큰 구현 비용·회귀 위험. 호출부 전수 점검 필요.
- **로컬 dev 검증 한계**: host-only 쿠키라 로컬에선 계정 store path 미동작(localStorage 폴백) → **계정 store end-to-end는 원격 Dev(dev-writing.pullim.ai + .pullim.ai 쿠키)에서만 실증**.
- **신규 의존성** `@neondatabase/serverless` — DB 접속 필수(정당). Vercel Neon 통합·`DATABASE_URL` 프로비저닝 필요(팀/Vercel 권한).
- **보존정책·미성년 PII** — 무기한 저장 + 사용자 삭제가 기본. 법무/PM 보존정책 확정은 후속.
- 기존 localStorage 데이터 백필 미지원(신규 시작) — 사용자가 기기 바꾸면 과거 로컬 데이터는 미이관(후속 "가져오기" 옵션).
