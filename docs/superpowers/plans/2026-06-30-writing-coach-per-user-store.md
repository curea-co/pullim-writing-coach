# Writing Coach Per-User Store Implementation Plan

For agentic workers: REQUIRED SUB-SKILL: superpowers:subagent-driven-development

> 2026-06-30 · spec: `docs/superpowers/specs/2026-06-30-writing-coach-per-user-store-design.md`
> 작업 브랜치(예정): `feat/per-user-store` (base = phase3 머지 후 main)
> **선행(머지 필수)**: 로그인 `#111` · Phase3 게이팅/refresh `#112`. 이 두 PR이 base에 있어야 `verifyWritingAccess`·`/me` 세션·refresh 회전이 동작한다. base에 없으면 T2~T6 실증 불가(코드/단위테스트는 가능하나 Dev e2e는 차단).

## Goal

writing-coach의 per-user 데이터(채점결과·프로필·수정이력·임시저장·메타·동의) 6종을 localStorage(기기-로컬)에서 **계정 귀속 서버 저장**(writing-coach 자체 Next API + Neon Postgres)으로 전환한다. 로그인 회원은 다른 기기/브라우저에서도 데이터를 본다. 게스트·로컬(host-only 쿠키)은 기존 localStorage 동작을 그대로 유지한다.

> **동의(consent) 범위 결정**: 스펙 §보안/PII (1)이 「ConsentNotice 동의가 서버 저장에도 적용」을 명시하고, `/me` 페이지 "데이터 삭제" 카피도 "프로필·동의 기록"을 약속한다. 따라서 동의 상태(`pwc-consent-v1`: `serviceConsentAt`·`guardianConsentAt`·`aiTrainingOptInAt`)도 **계정 귀속 대상에 포함**한다 — 미성년 보호자 동의 이력이 계정에 귀속되어 다른 기기에서도 보이고, "데이터 삭제"가 서버 동의 이력까지 지운다. 이에 따라 데이터 키는 **5종 → 6종**(`profile`·`results`·`revisions`·`drafts`·`meta_usage`·`consent`)이며, `consent-store.ts`는 storage 어댑터 경유로 전환한다(Task 4·5). (decision #8 백필 없음과는 일관 — 기존 로컬 동의는 자동 이관 안 함, 신규 시작.)

## Architecture

```
브라우저(dev-writing.pullim.ai) ──> writing-coach Next API (/api/data/[key]) ──(server)──> Neon Postgres
   │  세션 쿠키(.pullim.ai 자동첨부)        │  getSessionSub(req): /me 검증 → sub        │  writing_user_data WHERE user_id=sub
로컬/게스트 ─────────────────────────────> localStorage (현 storage.ts) 폴백
```

- **데이터-자체 / 신원-pullim**: 데이터는 writing-coach가 소유(Neon), 신원은 pullim 세션(`/me`의 `sub`).
- **단일 key-value 테이블**: 6종이 모두 `key → JSON` 구조 → 서버는 payload를 불투명 `jsonb`로 저장. LRU(MAX_RESULTS=20·revision 3/thread)·런타임 type guard는 **어댑터 계층(storage.ts)**에 그대로 유지.
- **비동기 인터페이스**: storage.ts 전 함수를 `Promise` 반환으로 전환. `accountMode`(authed·non-local)면 `/api/data/*`, 아니면 localStorage.

## Tech Stack

- Next 16.2.6 (App Router, Node runtime) · React 19.2.4 · TypeScript
- 신규 의존성: `@neondatabase/serverless` (서버리스 Postgres HTTP 드라이버 — DB 접속 필수)
- 테스트: `npm run test:unit`(node:test, `scripts/*.test.mjs`, register-ts 훅으로 `.ts` 직접 import) · `npm run test:components`(vitest+jsdom, `scripts/components/*.test.tsx`) · `npm run typecheck`(tsc --noEmit) · `npm run build`
- 에러 봉투: `app/lib/grading.ts`의 `ErrorCode`/`ERROR_HTTP`/`errorEnvelope`

## Global Constraints

스펙의 불변(verbatim — 모든 Task가 준수):

1. **신규 의존성은 `@neondatabase/serverless`만 허용.** DB 접속에 필수라 정당. 그 외 신규 npm 의존성 금지(raw fetch 선호 톤 유지).
2. **세션 토큰은 httpOnly 쿠키(`dev-pullim-at`, Domain=`.pullim.ai`)** — 서버는 cookie 헤더를 `/me`로 relay만 한다. 토큰값을 디코드/저장/로깅하지 않는다.
3. **prod fail-closed.** `getSessionSub`/`verifyWritingAccess`는 prod에서 `/me` 비200·쿠키 없음·fetch 실패 시 인가 거부(`null`/`false`). 데모토큰 fallback은 `NODE_ENV !== "production"`에서만.
4. **로컬·게스트는 localStorage 폴백.** 로컬(pullim.local)은 access 쿠키가 host-only(api 호스트)라 writing-coach 서버에 미도달 → 계정 store 불가 → 기존 localStorage 유지. 게스트(미로그인)도 localStorage.
5. **신원 키 = `/me`의 `sub`.** row 스코프는 `user_id = sub`로만. `sub` 외 식별자(이메일·실명) 미저장 — payload는 에세이·점수·메타만.
6. **`data_key` 화이트리스트 검증** — `'profile'|'results'|'revisions'|'drafts'|'meta_usage'|'consent'`만 허용, 임의 키 거부(400).
7. **자격증명·payload 본문 로깅 금지.** 사실(상태코드·route·errorCode)만 `console.warn`/Sentry tags로.
8. **마이그레이션 백필 없음** — 계정 store는 신규 시작. 기존 localStorage 데이터 자동 이관 안 함.
9. **DB 접속은 server-only.** `app/lib/server/db.ts` 첫 줄 `import "server-only";`. `DATABASE_URL` 미설정 시 fail-closed throw. `DATABASE_URL`은 `NEXT_PUBLIC_` 프리픽스 금지.
10. **401 처리(authed 경로)**: authed로 호출했는데 401이면 → `onAuthExpired`(= useAuth.refresh 1회 래퍼) 시도 → **refresh 결과가 authed면 true(재요청)**, **guest/error면 false → 재시도 없이 곧바로 auth 실패 낙하** + "로그인 필요" 안내. (이를 위해 refresh는 `Promise<Status>`를 반환해야 한다 — `Promise<void>`면 onAuthExpired가 항상 true가 되어 실패해도 무의미한 재요청 후 두 번째 401에서야 실패하므로 Constraint 위반. Task 5 Step 5.1에서 refresh 시그니처 확장.) **로컬 폴백 금지**(계정 데이터를 로컬에 분산 저장하지 않는다). 조회 실패: 빈 상태 + 안내(로컬 폴백 아님).

### 검증 한계 / 수용 기준

- **로컬 dev 검증 한계(host-only)**: 로컬에선 계정 store path 미동작(localStorage 폴백). 계정 store end-to-end는 **원격 Dev(dev-writing.pullim.ai + `.pullim.ai` 쿠키)에서만 실증**. 로컬에서는 단위/컴포넌트 테스트(fetch·db·localStorage mock)로만 검증.
- **Dev e2e 수용기준**: dev-writing.pullim.ai 로그인 → 채점 → 결과가 **다른 브라우저/기기 로그인 시에도 보임** + 게스트는 로컬만 + 데이터 삭제가 서버 반영.
- 매 Task 끝: `npm run typecheck` + `npm run test:unit` + `npm run test:components` 그린. 전 Task 완료 후 `npm run build` 그린 + Neon 마이그레이션 dev 적용 확인.

---

## Task 1 — Neon db.ts + 마이그레이션 SQL + db-migrate 스크립트

**Files**
- Create: `db/migrations/0001_init.sql`
- Create: `app/lib/server/db.ts`
- Create: `scripts/db-migrate.mjs`
- Create (Test): `scripts/db.test.mjs`
- Modify: `package.json` (dependencies에 `@neondatabase/serverless`, scripts에 `db:migrate`)

**Interfaces**
- Produces (`app/lib/server/db.ts`):
  - `export type DataKey = "profile" | "results" | "revisions" | "drafts" | "meta_usage" | "consent";`
  - `export const DATA_KEYS: readonly DataKey[];`
  - `export function isDataKey(v: unknown): v is DataKey;`
  - `export async function getUserData(sub: string, key: DataKey): Promise<unknown | null>;` — row 없으면 `null`, 있으면 `payload`(파싱된 JSON).
  - `export async function setUserData(sub: string, key: DataKey, payload: unknown): Promise<void>;` — upsert(`ON CONFLICT (user_id, data_key)`).
  - `export async function deleteAllUserData(sub: string): Promise<void>;`
  - `export function __setSqlForTest(fn: ((strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]>) | null): void;` — 테스트 전용 sql 주입(Neon 미접속).
- Consumes: `process.env.DATABASE_URL` (미설정 시 throw, lazy — import 시점이 아니라 첫 쿼리 시점).

Steps:

- [ ] **Step 1.1** — 마이그레이션 SQL 작성 `db/migrations/0001_init.sql`:
  ```sql
  -- writing-coach per-user 데이터 단일 key-value 테이블 (localStorage 미러).
  -- user_id = /me sub (안정 user id). payload = 5종 데이터(JSON) 불투명 저장.
  CREATE TABLE IF NOT EXISTS writing_user_data (
    user_id    text        NOT NULL,   -- = /me sub
    data_key   text        NOT NULL,   -- 'profile'|'results'|'revisions'|'drafts'|'meta_usage'|'consent'
    payload    jsonb       NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, data_key)
  );
  CREATE INDEX IF NOT EXISTS idx_writing_user_data_user ON writing_user_data (user_id);
  ```

- [ ] **Step 1.2** — 의존성 추가:
  ```bash
  npm install @neondatabase/serverless
  ```

- [ ] **Step 1.3 (실패 테스트)** — `scripts/db.test.mjs` 작성(Neon 미접속, `__setSqlForTest`로 sql 모킹):
  ```js
  // db.ts 단위 테스트 — Neon sql 태그드 템플릿을 모킹(__setSqlForTest)해 쿼리 형태·스코프 검증.
  //   실행: node --import ./scripts/register-ts.mjs --test scripts/db.test.mjs
  import assert from "node:assert/strict";
  import { test, beforeEach, afterEach } from "node:test";

  const db = await import("../app/lib/server/db.ts");

  let calls;
  beforeEach(() => {
    calls = [];
    db.__setSqlForTest(async (strings, ...values) => {
      calls.push({ text: strings.join("?"), values });
      // getUserData가 기대하는 row 형태를 기본 반환(setUserData/delete는 무시).
      return [{ payload: { ok: true } }];
    });
  });
  afterEach(() => db.__setSqlForTest(null));

  test("isDataKey — 화이트리스트만 true", () => {
    assert.equal(db.isDataKey("results"), true);
    assert.equal(db.isDataKey("profile"), true);
    assert.equal(db.isDataKey("hack"), false);
    assert.equal(db.isDataKey(123), false);
  });

  test("getUserData — sub·key 바인딩 + payload 반환", async () => {
    const out = await db.getUserData("user-abc", "results");
    assert.deepEqual(out, { ok: true });
    assert.deepEqual(calls[0].values, ["user-abc", "results"]);
    assert.match(calls[0].text, /select payload/i);
  });

  test("getUserData — row 없으면 null", async () => {
    db.__setSqlForTest(async () => []);
    assert.equal(await db.getUserData("u", "results"), null);
  });

  test("setUserData — upsert에 sub·key·payload 바인딩", async () => {
    await db.setUserData("user-abc", "profile", { nickname: "민수" });
    assert.match(calls[0].text, /insert into writing_user_data/i);
    assert.match(calls[0].text, /on conflict/i);
    assert.deepEqual(calls[0].values, ["user-abc", "profile", { nickname: "민수" }]);
  });

  test("deleteAllUserData — sub만 바인딩", async () => {
    await db.deleteAllUserData("user-abc");
    assert.match(calls[0].text, /delete from writing_user_data/i);
    assert.deepEqual(calls[0].values, ["user-abc"]);
  });
  ```

- [ ] **Step 1.4 (실패 확인)** — 모듈 미존재로 실패:
  ```bash
  npm run test:unit
  ```
  예상: `Cannot find module '../app/lib/server/db.ts'` 또는 import 실패로 db.test.mjs 전체 fail.

- [ ] **Step 1.5 (최소 구현)** — `app/lib/server/db.ts` 작성:
  ```ts
  // Pullim Writing Coach — Neon 접속 + per-user 데이터 CRUD (server 전용).
  //   모듈 경계: 부수효과(env·Neon HTTP). app/lib/server/* 만 server 전용 부수효과 가능.
  //   자격증명·payload 본문 로깅 금지. DATABASE_URL 미설정 시 fail-closed throw.
  import "server-only";
  import { neon } from "@neondatabase/serverless";

  export type DataKey = "profile" | "results" | "revisions" | "drafts" | "meta_usage" | "consent";
  export const DATA_KEYS: readonly DataKey[] = ["profile", "results", "revisions", "drafts", "meta_usage", "consent"];

  export function isDataKey(v: unknown): v is DataKey {
    return typeof v === "string" && (DATA_KEYS as readonly string[]).includes(v);
  }

  // Neon sql 태그드 템플릿. 테스트는 __setSqlForTest로 교체. 실접속은 lazy(첫 쿼리 시 DATABASE_URL 검증).
  type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]>;
  let injected: Sql | null = null;
  let cached: Sql | null = null;

  function sql(): Sql {
    if (injected) return injected;
    if (cached) return cached;
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("[db] DATABASE_URL 미설정 — 계정 데이터 store 비활성(fail-closed)");
    cached = neon(url) as unknown as Sql;
    return cached;
  }

  export function __setSqlForTest(fn: Sql | null): void {
    injected = fn;
    cached = null;
  }

  export async function getUserData(sub: string, key: DataKey): Promise<unknown | null> {
    const rows = (await sql()`
      select payload from writing_user_data where user_id = ${sub} and data_key = ${key}
    `) as Array<{ payload: unknown }>;
    return rows.length > 0 ? rows[0].payload : null;
  }

  export async function setUserData(sub: string, key: DataKey, payload: unknown): Promise<void> {
    await sql()`
      insert into writing_user_data (user_id, data_key, payload, updated_at)
      values (${sub}, ${key}, ${payload as never}, now())
      on conflict (user_id, data_key) do update set payload = excluded.payload, updated_at = now()
    `;
  }

  export async function deleteAllUserData(sub: string): Promise<void> {
    await sql()`delete from writing_user_data where user_id = ${sub}`;
  }
  ```

- [ ] **Step 1.6** — `scripts/db-migrate.mjs` 작성(Neon에 0001_init.sql 적용):
  ```js
  // Neon 마이그레이션 러너 — db/migrations/*.sql 을 순서대로 실행.
  //   실행: npm run db:migrate  (DATABASE_URL 환경변수 필요)
  //   주의: payload·자격증명 로깅 금지. 적용 SQL 파일명과 상태만 출력.
  //   ★ neon() HTTP one-shot 드라이버의 sql.query(text)는 멀티-statement를 지원하지 않는다
  //     (한 번에 한 statement). 0001_init.sql은 CREATE TABLE + CREATE INDEX 2개 statement이므로
  //     파일 전체를 한 번에 던지면 두 번째 statement에서 실패한다 → ';'로 분할해 순차 실행한다.
  import { readFileSync, readdirSync } from "node:fs";
  import { fileURLToPath } from "node:url";
  import { dirname, join } from "node:path";
  import { neon } from "@neondatabase/serverless";

  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("[db:migrate] DATABASE_URL 미설정 — 중단");
    process.exit(1);
  }
  const here = dirname(fileURLToPath(import.meta.url));
  const dir = join(here, "..", "db", "migrations");
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
  const sql = neon(url);

  // SQL 파일을 statement 단위(';')로 분할. 줄단위 '--' 주석 제거 후 빈 statement 스킵.
  //   (0001_init.sql 처럼 단순 DDL 다중 statement 전제 — 문자열 리터럴 내 ';' 미사용.)
  function splitStatements(text) {
    return text
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n")
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  for (const f of files) {
    const text = readFileSync(join(dir, f), "utf8");
    const statements = splitStatements(text);
    console.log(`[db:migrate] applying ${f} (${statements.length} statement(s))`);
    for (const stmt of statements) {
      await sql.query(stmt); // one-shot — statement 1개씩 순차 실행
    }
  }
  console.log(`[db:migrate] done (${files.length} file(s))`);
  ```

- [ ] **Step 1.7** — `package.json` scripts에 `"db:migrate": "node scripts/db-migrate.mjs"` 추가.

- [ ] **Step 1.8 (통과 확인)**:
  ```bash
  npm run test:unit
  npm run typecheck
  ```
  예상: db.test.mjs 5건 pass, typecheck 0 error.

- [ ] **Step 1.9 (Dev 적용 — 지침)** — Vercel Neon 통합으로 `DATABASE_URL` 프로비저닝 후:
  ```bash
  DATABASE_URL="<dev neon url>" npm run db:migrate
  ```
  예상: `applying 0001_init.sql (2 statement(s))` → `done (1 file(s))`. (러너가 ';'로 분할해 CREATE TABLE·CREATE INDEX를 순차 실행 — neon HTTP one-shot이 멀티-statement 미지원이므로 분할 필수.) (로컬에서 dev Neon에 접속 가능할 때. 권한 없으면 Vercel 환경에서 실행.)

- [ ] **Step 1.10 (commit)**:
  ```bash
  git add db/migrations/0001_init.sql app/lib/server/db.ts scripts/db-migrate.mjs scripts/db.test.mjs package.json package-lock.json
  git commit -m "feat(db): Neon db.ts + 0001_init 마이그레이션 + db-migrate 스크립트"
  ```

---

## Task 2 — getSessionSub 확장 (pullim-session.ts)

**Files**
- Modify: `app/lib/server/pullim-session.ts` (`getSessionSub` 추가, `/me` 본문 JSON 파싱)
- Modify (Test): `scripts/pullim-session.test.mjs` (getSessionSub 케이스 추가)

**Interfaces**
- Produces (`app/lib/server/pullim-session.ts`):
  - `export async function getSessionSub(req: Request): Promise<string | null>;` — access 쿠키 있으면 `/me` cookie relay + `redirect:"manual"` + `no-store` 호출 → `status===200`이고 body에 `sub`(string) 있으면 반환. 그 외 `null`(prod fail-closed). 비prod에서 데모 fallback 통과 시에는 `process.env.DEMO_SESSION_SUB ?? "demo-sub"` 반환(로컬 e2e용 안정 키).
- Consumes: `apiBase()`(기존), `hasAccessCookie()`(기존), `demoTokenAuthorized()`(기존). `/me` 응답 스키마 `{ sub?: string, email?, displayName?, name? }`.

> 신원 키 결정(recon 미해결 해소): `/me` 본문의 `sub`를 안정 키로 채택. 현재 `/me`가 `sub`를 반환하지 않으면 **선행 #112(또는 pullim-api 측)에서 `/me`에 `sub` 추가가 필요**하다. 이 Task는 `/me` 본문에 `sub`가 있다는 전제로 파싱하며, 없으면 `null`(authed지만 sub 미확보 → 계정 store 불가, 안내). 비prod 데모 경로는 `DEMO_SESSION_SUB` env(기본 `"demo-sub"`)로 안정 키 제공.

Steps:

- [ ] **Step 2.1 (실패 테스트)** — `scripts/pullim-session.test.mjs` 하단에 추가:
  ```js
  // ── getSessionSub ────────────────────────────────────────────────────
  const { getSessionSub } = await import("../app/lib/server/pullim-session.ts");

  test("getSessionSub — /me 200 + sub → sub 반환", async () => {
    globalThis.fetch = async () => ({ status: 200, json: async () => ({ sub: "user-abc", email: "a@b.c" }) });
    const req = makeReq({ cookie: "dev-pullim-at=tok" });
    assert.equal(await getSessionSub(req), "user-abc");
  });

  test("getSessionSub — /me 200 but sub 없음 → null", async () => {
    globalThis.fetch = async () => ({ status: 200, json: async () => ({ email: "a@b.c" }) });
    const req = makeReq({ cookie: "dev-pullim-at=tok" });
    assert.equal(await getSessionSub(req), null);
  });

  test("getSessionSub — /me 401 + prod → null (fail-closed)", async () => {
    process.env.NODE_ENV = "production";
    globalThis.fetch = async () => ({ status: 401, json: async () => ({}) });
    const req = makeReq({ cookie: "dev-pullim-at=tok" });
    assert.equal(await getSessionSub(req), null);
  });

  test("getSessionSub — 쿠키 없음 + prod → null + /me 미호출", async () => {
    process.env.NODE_ENV = "production";
    let called = false;
    globalThis.fetch = async () => { called = true; return { status: 200, json: async () => ({ sub: "x" }) }; };
    assert.equal(await getSessionSub(makeReq()), null);
    assert.equal(called, false);
  });

  test("getSessionSub — fetch throw + prod → null", async () => {
    process.env.NODE_ENV = "production";
    globalThis.fetch = async () => { throw new Error("net"); };
    assert.equal(await getSessionSub(makeReq({ cookie: "dev-pullim-at=tok" })), null);
  });

  test("getSessionSub — 비prod + 데모토큰 일치 → DEMO_SESSION_SUB", async () => {
    process.env.NODE_ENV = "test";
    process.env.DEMO_ACCESS_TOKEN = "secret";
    process.env.DEMO_SESSION_SUB = "local-demo";
    const req = makeReq({ "x-demo-token": "secret" });
    assert.equal(await getSessionSub(req), "local-demo");
    delete process.env.DEMO_SESSION_SUB;
  });

  test("getSessionSub — 비prod + 데모토큰 불일치 → null", async () => {
    process.env.NODE_ENV = "test";
    process.env.DEMO_ACCESS_TOKEN = "secret";
    assert.equal(await getSessionSub(makeReq({ "x-demo-token": "wrong" })), null);
  });
  ```

- [ ] **Step 2.2 (실패 확인)**:
  ```bash
  npm run test:unit
  ```
  예상: `getSessionSub is not a function`(또는 import 실패)로 신규 7건 fail.

- [ ] **Step 2.3 (최소 구현)** — `app/lib/server/pullim-session.ts` 끝에 추가:
  ```ts
  /**
   * 세션 sub(/me) 획득 — 계정 데이터 store의 안정 신원 키.
   *  1) access 쿠키 있으면 {API}/me 를 cookie relay + redirect:manual + no-store 로 호출.
   *     200 이고 본문에 sub(string)가 있으면 sub 반환.
   *  2) /me 비200·sub 없음·fetch 실패·쿠키 없음:
   *     - 비production: 데모토큰 일치 시 DEMO_SESSION_SUB(기본 "demo-sub") — 로컬 e2e 안정 키.
   *     - production: null (fail-closed, 데모 fallback 없음).
   *  자격증명/토큰/쿠키값은 로깅하지 않는다.
   */
  export async function getSessionSub(req: Request): Promise<string | null> {
    const cookieHeader = req.headers.get("cookie");

    if (hasAccessCookie(cookieHeader)) {
      try {
        const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_WEB_URL ?? "";
        const res = await fetch(`${apiBase()}/me`, {
          headers: { cookie: cookieHeader as string, ...(origin ? { origin } : {}) },
          cache: "no-store",
          redirect: "manual",
        });
        if (res.status === 200) {
          const body = (await res.json().catch(() => null)) as { sub?: unknown } | null;
          if (body && typeof body.sub === "string" && body.sub.length > 0) return body.sub;
          // 200이지만 sub 없음 — 사실만 로깅(값 금지). null로 낙하.
          console.warn("[pullim-session] /me 200 but sub 미반환 — 계정 store 비활성");
        }
      } catch {
        // 네트워크/CORS 실패 → fallback/거부로 낙하(자격증명 로깅 금지).
      }
    }

    if (process.env.NODE_ENV !== "production") {
      if (demoTokenAuthorized(req)) return process.env.DEMO_SESSION_SUB ?? "demo-sub";
    }
    return null;
  }
  ```

- [ ] **Step 2.4 (통과 확인)**:
  ```bash
  npm run test:unit && npm run typecheck
  ```
  예상: 기존 verifyWritingAccess 9건 + getSessionSub 7건 pass.

- [ ] **Step 2.5 (commit)**:
  ```bash
  git add app/lib/server/pullim-session.ts scripts/pullim-session.test.mjs
  git commit -m "feat(session): getSessionSub — /me sub 파싱(prod fail-closed)"
  ```

---

## Task 3 — /api/data/[key] 라우트 (GET/PUT/DELETE) + /api/data DELETE

**Files**
- Create: `app/api/data/helpers.ts` (jsonError·logMetric — 노드 테스트 가능 단위)
- Create: `app/api/data/[key]/route.ts` (GET·PUT·DELETE)
- Create: `app/api/data/route.ts` (DELETE — 계정 전체 삭제)
- Create (Test): `scripts/data-route-helpers.test.mjs`
- Create (Test): `scripts/components/data-route.test.tsx` (route 핸들러 통합 — getSessionSub·db mock)

**Interfaces**
- Produces (`app/api/data/helpers.ts`):
  - `export function jsonError(code: ErrorCode): Response;` — `Response.json(errorEnvelope(code), { status: ERROR_HTTP[code] })`.
  - `export function logMetric(event: string, extra?: Record<string, unknown>): void;`
- Produces (`app/api/data/[key]/route.ts`): `export async function GET(req, ctx)`, `PUT(req, ctx)`, `DELETE(req, ctx)` where `ctx: { params: Promise<{ key: string }> }`. `export const runtime`, `dynamic`, `maxDuration`.
- Produces (`app/api/data/route.ts`): `export async function DELETE(req): Promise<Response>`.
- Consumes: `getSessionSub`(T2), `getUserData`/`setUserData`/`deleteAllUserData`/`isDataKey`(T1), `ERROR_HTTP`/`errorEnvelope`/`ErrorCode`(`app/lib/grading.ts`).

> route 핸들러는 `getSessionSub`·`db`를 직접 import하므로 노드 테스트(`@/` alias·server-only) 부적합 → **vitest(`scripts/components/`)에서 `vi.mock`으로 모킹**해 통합 테스트한다. 순수 helper(jsonError)만 노드 테스트.
> `data_key`가 화이트리스트 외이면 `E1`(400). getSessionSub `null`이면 `E-AUTH`(401). DB 실패는 `E8`(503).

Steps:

- [ ] **Step 3.1 (실패 테스트 — helpers)** — `scripts/data-route-helpers.test.mjs`:
  ```js
  import assert from "node:assert/strict";
  import { test } from "node:test";
  const { jsonError } = await import("../app/api/data/helpers.ts");

  test("jsonError — E-AUTH는 401 + 봉투", async () => {
    const res = jsonError("E-AUTH");
    assert.equal(res.status, 401);
    const body = await res.json();
    assert.equal(body.error.code, "E-AUTH");
  });
  test("jsonError — E1은 400", () => {
    assert.equal(jsonError("E1").status, 400);
  });
  ```

- [ ] **Step 3.2 (실패 확인)**:
  ```bash
  npm run test:unit
  ```
  예상: `Cannot find module '../app/api/data/helpers.ts'`.

- [ ] **Step 3.3 (구현 — helpers)** — `app/api/data/helpers.ts`:
  ```ts
  // /api/data route 내부 helpers — 노드 테스트 가능 위해 relative import만 사용.
  import { ERROR_HTTP, type ErrorCode, errorEnvelope } from "../../lib/grading";

  export function jsonError(code: ErrorCode): Response {
    return Response.json(errorEnvelope(code), { status: ERROR_HTTP[code] });
  }

  // 자격증명·payload 본문 로깅 금지 — 사실(event·route·상태)만.
  export function logMetric(event: string, extra: Record<string, unknown> = {}): void {
    console.warn(`[/api/data][metric] ${JSON.stringify({ event, ...extra })}`);
  }
  ```

- [ ] **Step 3.4 (통과 확인 — helpers)**:
  ```bash
  npm run test:unit
  ```
  예상: data-route-helpers 2건 pass.

- [ ] **Step 3.5 (구현 — [key] route)** — `app/api/data/[key]/route.ts`:
  ```ts
  // GET/PUT/DELETE /api/data/[key] — per-user 계정 데이터 CRUD.
  //   인가: getSessionSub(req) → sub 없으면 E-AUTH(401). data_key 화이트리스트 검증(E1).
  //   row는 sub로만 스코프(타인 데이터 접근 불가). 자격증명·payload 로깅 금지.
  import * as Sentry from "@sentry/nextjs";
  import { getSessionSub } from "@/app/lib/server/pullim-session";
  import { getUserData, setUserData, deleteAllUserData, isDataKey } from "@/app/lib/server/db";
  import { jsonError } from "../helpers";

  export const runtime = "nodejs";
  export const dynamic = "force-dynamic";
  export const maxDuration = 60;

  type Ctx = { params: Promise<{ key: string }> };

  async function resolve(req: Request, ctx: Ctx): Promise<{ sub: string; key: import("@/app/lib/server/db").DataKey } | Response> {
    const sub = await getSessionSub(req);
    if (!sub) return jsonError("E-AUTH");
    const { key } = await ctx.params;
    if (!isDataKey(key)) return jsonError("E1");
    return { sub, key };
  }

  export async function GET(req: Request, ctx: Ctx): Promise<Response> {
    const r = await resolve(req, ctx);
    if (r instanceof Response) return r;
    try {
      const payload = await getUserData(r.sub, r.key);
      return Response.json({ payload }, { status: 200 });
    } catch (e) {
      Sentry.captureException(e, { tags: { route: "/api/data/[key]", errorCode: "E8" } });
      return jsonError("E8");
    }
  }

  export async function PUT(req: Request, ctx: Ctx): Promise<Response> {
    const r = await resolve(req, ctx);
    if (r instanceof Response) return r;
    let body: { payload?: unknown };
    try {
      body = (await req.json()) as { payload?: unknown };
    } catch {
      return jsonError("E-PARSE");
    }
    try {
      await setUserData(r.sub, r.key, body.payload ?? null);
      return Response.json({ ok: true }, { status: 200 });
    } catch (e) {
      Sentry.captureException(e, { tags: { route: "/api/data/[key]", errorCode: "E8" } });
      return jsonError("E8");
    }
  }

  export async function DELETE(req: Request, ctx: Ctx): Promise<Response> {
    const r = await resolve(req, ctx);
    if (r instanceof Response) return r;
    try {
      await setUserData(r.sub, r.key, null); // 단일 키 비우기(전체 삭제는 /api/data DELETE)
      return Response.json({ ok: true }, { status: 200 });
    } catch (e) {
      Sentry.captureException(e, { tags: { route: "/api/data/[key]", errorCode: "E8" } });
      return jsonError("E8");
    }
  }
  ```

- [ ] **Step 3.6 (구현 — /api/data DELETE)** — `app/api/data/route.ts`:
  ```ts
  // DELETE /api/data — 계정 전체 데이터 삭제(deleteAllUserData). "데이터 삭제" 서버 연동.
  import * as Sentry from "@sentry/nextjs";
  import { getSessionSub } from "@/app/lib/server/pullim-session";
  import { deleteAllUserData } from "@/app/lib/server/db";
  import { jsonError } from "./helpers";

  export const runtime = "nodejs";
  export const dynamic = "force-dynamic";
  export const maxDuration = 60;

  export async function DELETE(req: Request): Promise<Response> {
    const sub = await getSessionSub(req);
    if (!sub) return jsonError("E-AUTH");
    try {
      await deleteAllUserData(sub);
      return Response.json({ ok: true }, { status: 200 });
    } catch (e) {
      Sentry.captureException(e, { tags: { route: "/api/data", errorCode: "E8" } });
      return jsonError("E8");
    }
  }
  ```

- [ ] **Step 3.7 (실패 테스트 — route 통합, vitest)** — `scripts/components/data-route.test.tsx`:
  ```tsx
  import { it, expect, vi, beforeEach } from "vitest";

  vi.mock("@/app/lib/server/pullim-session", () => ({ getSessionSub: vi.fn() }));
  vi.mock("@/app/lib/server/db", () => ({
    getUserData: vi.fn(),
    setUserData: vi.fn(),
    deleteAllUserData: vi.fn(),
    isDataKey: (k: string) => ["profile", "results", "revisions", "drafts", "meta_usage", "consent"].includes(k),
  }));

  import { getSessionSub } from "@/app/lib/server/pullim-session";
  import { getUserData, setUserData, deleteAllUserData } from "@/app/lib/server/db";
  import { GET, PUT } from "@/app/api/data/[key]/route";
  import { DELETE as DELETE_ALL } from "@/app/api/data/route";

  const ctx = (key: string) => ({ params: Promise.resolve({ key }) });
  const req = (body?: unknown) =>
    new Request("https://w/api/data/results", { method: "POST", body: body ? JSON.stringify(body) : undefined });

  beforeEach(() => vi.clearAllMocks());

  it("GET — sub 없으면 401", async () => {
    (getSessionSub as any).mockResolvedValue(null);
    const res = await GET(req(), ctx("results"));
    expect(res.status).toBe(401);
  });

  it("GET — 화이트리스트 외 key → 400", async () => {
    (getSessionSub as any).mockResolvedValue("user-a");
    const res = await GET(req(), ctx("hack"));
    expect(res.status).toBe(400);
  });

  it("GET — sub 스코프로 payload 반환", async () => {
    (getSessionSub as any).mockResolvedValue("user-a");
    (getUserData as any).mockResolvedValue([{ id: "r1" }]);
    const res = await GET(req(), ctx("results"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ payload: [{ id: "r1" }] });
    expect(getUserData).toHaveBeenCalledWith("user-a", "results");
  });

  it("PUT — payload upsert(sub 스코프)", async () => {
    (getSessionSub as any).mockResolvedValue("user-a");
    (setUserData as any).mockResolvedValue(undefined);
    const res = await PUT(req({ payload: [{ id: "r1" }] }), ctx("results"));
    expect(res.status).toBe(200);
    expect(setUserData).toHaveBeenCalledWith("user-a", "results", [{ id: "r1" }]);
  });

  it("DELETE(전체) — sub 없으면 401", async () => {
    (getSessionSub as any).mockResolvedValue(null);
    expect((await DELETE_ALL(new Request("https://w/api/data", { method: "DELETE" }))).status).toBe(401);
  });

  it("DELETE(전체) — deleteAllUserData(sub) 호출", async () => {
    (getSessionSub as any).mockResolvedValue("user-a");
    (deleteAllUserData as any).mockResolvedValue(undefined);
    const res = await DELETE_ALL(new Request("https://w/api/data", { method: "DELETE" }));
    expect(res.status).toBe(200);
    expect(deleteAllUserData).toHaveBeenCalledWith("user-a");
  });
  ```

- [ ] **Step 3.8 (통과 확인)**:
  ```bash
  npm run test:components && npm run test:unit && npm run typecheck
  ```
  예상: data-route 6건 + helpers 2건 pass, typecheck 0 error.

- [ ] **Step 3.9 (commit)**:
  ```bash
  git add app/api/data scripts/data-route-helpers.test.mjs scripts/components/data-route.test.tsx
  git commit -m "feat(api): /api/data CRUD — getSessionSub 인증·data_key 검증·sub 스코프"
  ```

---

## Task 4 — storage.ts 비동기화 + accountMode 라우팅

**Files**
- Modify: `app/lib/storage.ts` (전 public 함수 async화 + accountMode 라우팅. LRU·type guard·기본값 유지)
- Create (Test): `scripts/components/storage-adapter.test.tsx` (accountMode→API / guest→local, fetch·localStorage mock)
- Create (Test): `scripts/storage-pure.test.mjs` (순수 헬퍼 — type guard·LRU dedup. window 미존재 환경)

**Interfaces**
- Produces (`app/lib/storage.ts`) — 모든 public 함수가 `Promise` 반환으로 변경(시그니처):
  - `export function setAccountMode(mode: { authed: boolean; local: boolean }): void;` — useAuth가 주입(authed && !local이면 API path).
  - `export async function loadProfile(): Promise<Profile | null>;`
  - `export async function saveProfile(p: Profile): Promise<{ ok: true } | { ok: false; reason: "quota" | "denied" | "invalid" | "auth" }>;`
  - `export async function clearProfile(): Promise<void>;`
  - `export async function loadRevisions(): Promise<RevisionThread[]>;`
  - `export async function addRevision(threadId, partial): Promise<AddRevisionResult>;`
  - `export async function getThread(id): Promise<RevisionThread | null>;`
  - `export async function clearAllRevisions(): Promise<void>;`
  - `export async function loadDraft(): Promise<DraftSnapshot | null>;`
  - `export async function saveDraft(s): Promise<{ ok: true; saved_at: string } | { ok: false; reason }>;`
  - `export async function clearDraft(): Promise<void>;`
  - `export async function loadResults(): Promise<ResultEntry[]>;`
  - `export async function getResult(id): Promise<ResultEntry | null>;`
  - `export async function addResult(partial): Promise<AddResultResult>;`
  - `export async function clearAllResults(): Promise<void>;`
  - `export async function removeResult(id): Promise<{ ok: boolean; removed: boolean }>;`
  - `export async function loadMetaUsage(): Promise<MetaUsage>;`
  - `export async function recordMetaUsage(field, value): Promise<void>;`
  - `export async function recordMetaUsageBatch(entries: ReadonlyArray<readonly [MetaField, string]>): Promise<void>;` — 같은 `meta_usage` 키 RMW를 1 load → 다필드 갱신 → 1 write로 묶어 lost update·중복 왕복 방지.
  - `export async function getMostUsedMeta(field): Promise<string | null>;`
  - `export async function loadValidatedMetaUsage(): Promise<MetaUsage>;`
  - `export async function clearMetaUsage(): Promise<void>;`
  - `export async function loadConsentData(): Promise<unknown | null>;` — `consent` 키 raw payload 로드(account mode면 GET, 아니면 LS). 검증(`isConsentState`)·`emptyConsent` 폴백은 consent-store가 적용.
  - `export async function saveConsentData(state: unknown): Promise<{ ok: boolean; reason?: "quota" | "denied" | "auth" }>;` — `consent` 키 write.
  - `export async function clearConsentData(): Promise<void>;` — `consent` 키 clear.
  - `export function clearAllLocalStorage(): void;` — accountMode와 무관하게 6키(`LS_KEY` 전부)를 localStorage에서 직접 제거. me "데이터 삭제"의 authed 분기에서 서버 전량 DELETE와 별개로 같은 기기의 게스트-시절 로컬 흔적을 정리(서버 PUT(null) 미발생 — 순수 localStorage).
  - 유지(동기·순수, export): `isProfile`, `isDraftSnapshot`, `consentNow`, 상수(`MAX_RESULTS` 등), 타입.

**설계** — 어댑터는 key별 "전체 payload load/save" 두 헬퍼로 환원하고, 기존 LRU·type guard는 그 위에서 동작:
- `async function readKey(key: DataKey): Promise<unknown>` — accountMode면 `GET /api/data/{key}` → 401이면 1회 refresh 콜백 후 재시도 → 실패 시 `null`(로컬 폴백 금지). 아니면 `localStorage.getItem`.
- `async function writeKey(key: DataKey, value: unknown): Promise<{ ok: boolean; reason? }>` — accountMode면 `PUT /api/data/{key}` body `{payload:value}`. 아니면 `localStorage.setItem`(quota 처리).
- DataKey ↔ LS 키 매핑: `profile→pwc_profile_v1`, `results→pwc_results_v1`, `revisions→pwc_revisions_v1`, `drafts→pwc_draft_v1`, `meta_usage→pwc_meta_usage_v1`, `consent→pwc-consent-v1`(기존 consent-store.ts 키 — 로컬 폴백 시 동일 키 유지로 호환).

Steps:

- [ ] **Step 4.1 (실패 테스트 — 순수 헬퍼 보존)** — `scripts/storage-pure.test.mjs`(window 없는 노드 환경 → 순수 export만):
  ```js
  import assert from "node:assert/strict";
  import { test } from "node:test";
  const s = await import("../app/lib/storage.ts");

  test("isProfile — 필수 필드 검증 유지", () => {
    assert.equal(s.isProfile({ nickname: "민수", school_level: "중1", primary_subject: "국어", consent_at: "2026-01-01T00:00:00+09:00" }), true);
    assert.equal(s.isProfile({ nickname: "" }), false);
  });
  test("MAX_RESULTS·MAX_REVISIONS_PER_THREAD 상수 유지", () => {
    assert.equal(s.MAX_RESULTS, 20);
    assert.equal(s.MAX_REVISIONS_PER_THREAD, 3);
  });
  test("loadResults — window 없으면 [] (SSR/노드)", async () => {
    assert.deepEqual(await s.loadResults(), []);
  });
  test("consent payload 통로 export 존재(consent-store 위임 대상)", () => {
    assert.equal(typeof s.loadConsentData, "function");
    assert.equal(typeof s.saveConsentData, "function");
    assert.equal(typeof s.clearConsentData, "function");
    assert.equal(typeof s.clearAllLocalStorage, "function");
  });
  ```

- [ ] **Step 4.2 (실패 테스트 — 어댑터, vitest)** — `scripts/components/storage-adapter.test.tsx`:
  ```tsx
  import { it, expect, vi, beforeEach } from "vitest";
  import * as storage from "@/app/lib/storage";

  function localStorageMock() {
    const m = new Map<string, string>();
    return {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, v),
      removeItem: (k: string) => void m.delete(k),
    } as Storage;
  }

  beforeEach(() => {
    storage.setAccountMode({ authed: false, local: false });
    (globalThis as any).window = { localStorage: localStorageMock() };
    globalThis.localStorage = (globalThis as any).window.localStorage;
    globalThis.fetch = vi.fn();
  });

  it("guest(미인증) — addResult/loadResults는 localStorage", async () => {
    await storage.addResult({
      assignment: { school_level: "중1", subject: "국어", genre: "설명문", prompt_text: "주제", target_char_count: null },
      submission: { body: "x".repeat(60), char_count: 60 },
      output: { total_score: 80, scores: [{ area: "과제 이해", score: 16 }], revision_guides: [], meta: {} } as any,
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
    const list = await storage.loadResults();
    expect(list.length).toBe(1);
  });

  it("accountMode — loadResults는 GET /api/data/results", async () => {
    storage.setAccountMode({ authed: true, local: false });
    (globalThis.fetch as any).mockResolvedValue({ status: 200, json: async () => ({ payload: [{ id: "r1", created_at: "2026-01-01T00:00:00+09:00", assignment: { school_level: "중1", subject: "국어", genre: "설명문", prompt_text: "p" }, submission: { body: "b", char_count: 1 }, output: { total_score: 80, scores: [{ area: "과제 이해", score: 16 }], revision_guides: [], meta: {} } }] }) });
    const list = await storage.loadResults();
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/data/results", expect.objectContaining({ method: "GET", credentials: "include" }));
    expect(list.length).toBe(1);
  });

  it("accountMode — addResult는 read-modify-write PUT (LRU 어댑터 유지)", async () => {
    storage.setAccountMode({ authed: true, local: false });
    (globalThis.fetch as any)
      .mockResolvedValueOnce({ status: 200, json: async () => ({ payload: [] }) }) // GET (load)
      .mockResolvedValueOnce({ status: 200, json: async () => ({ ok: true }) });   // PUT (write)
    const r = await storage.addResult({
      assignment: { school_level: "중1", subject: "국어", genre: "설명문", prompt_text: "p", target_char_count: null } as any,
      submission: { body: "b", char_count: 1 },
      output: { total_score: 80, scores: [{ area: "과제 이해", score: 16 }], revision_guides: [], meta: {} } as any,
    });
    expect(r.ok).toBe(true);
    const putCall = (globalThis.fetch as any).mock.calls.find((c: any[]) => c[1]?.method === "PUT");
    expect(putCall[0]).toBe("/api/data/results");
    expect(JSON.parse(putCall[1].body).payload.length).toBe(1);
  });

  it("accountMode — GET 401 → refresh 콜백 1회 → 재시도", async () => {
    const refresh = vi.fn().mockResolvedValue(true);
    storage.setAccountMode({ authed: true, local: false, onAuthExpired: refresh } as any);
    (globalThis.fetch as any)
      .mockResolvedValueOnce({ status: 401, json: async () => ({}) })
      .mockResolvedValueOnce({ status: 200, json: async () => ({ payload: [] }) });
    await storage.loadResults();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect((globalThis.fetch as any).mock.calls.length).toBe(2);
  });
  ```

- [ ] **Step 4.3 (실패 확인)**:
  ```bash
  npm run test:components && npm run test:unit
  ```
  예상: `setAccountMode is not a function` 및 `loadResults(...).length` (Promise라 동기 접근 실패)로 fail.

- [ ] **Step 4.4 (구현 — 어댑터 코어)** — `app/lib/storage.ts` 상단(import 아래)에 accountMode·readKey·writeKey 추가:
  ```ts
  // ── 계정 store 어댑터 (per-user 서버 저장) ────────────────────────────
  //   accountMode(authed && !local)면 /api/data/{key}, 아니면 localStorage. (Global Constraints 4·10)
  type DataKey = "profile" | "results" | "revisions" | "drafts" | "meta_usage" | "consent";
  // consent는 기존 consent-store.ts의 'pwc-consent-v1' 키를 그대로 재사용(로컬 폴백 호환).
  const CONSENT_KEY = "pwc-consent-v1";
  const LS_KEY: Record<DataKey, string> = {
    profile: PROFILE_KEY, results: RESULTS_KEY, revisions: REVISIONS_KEY,
    drafts: DRAFT_KEY, meta_usage: META_USAGE_KEY, consent: CONSENT_KEY,
  };

  type AccountMode = { authed: boolean; local: boolean; onAuthExpired?: () => Promise<boolean> };
  let accountMode: AccountMode = { authed: false, local: false };
  export function setAccountMode(mode: AccountMode): void { accountMode = mode; }
  function useApi(): boolean { return accountMode.authed && !accountMode.local; }

  // 계정 store 읽기 — 401이면 refresh 1회 후 재시도. 실패 시 null(로컬 폴백 금지).
  async function apiGet(key: DataKey): Promise<unknown> {
    let res = await fetch(`/api/data/${key}`, { method: "GET", credentials: "include", cache: "no-store" });
    if (res.status === 401 && accountMode.onAuthExpired) {
      const ok = await accountMode.onAuthExpired();
      if (ok) res = await fetch(`/api/data/${key}`, { method: "GET", credentials: "include", cache: "no-store" });
    }
    if (res.status !== 200) return null;
    const body = (await res.json().catch(() => null)) as { payload?: unknown } | null;
    return body?.payload ?? null;
  }
  async function apiPut(key: DataKey, value: unknown): Promise<{ ok: boolean; reason?: "auth" | "denied" }> {
    let res = await fetch(`/api/data/${key}`, {
      method: "PUT", credentials: "include",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ payload: value }),
    });
    if (res.status === 401 && accountMode.onAuthExpired) {
      const ok = await accountMode.onAuthExpired();
      if (ok) res = await fetch(`/api/data/${key}`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ payload: value }),
      });
    }
    if (res.status === 401) return { ok: false, reason: "auth" };
    return res.status === 200 ? { ok: true } : { ok: false, reason: "denied" };
  }

  // key별 전체 payload load/save — LRU·type guard는 호출부(각 loadX/addX)가 그 위에서 적용.
  async function readKey(key: DataKey): Promise<unknown> {
    if (useApi()) return apiGet(key);
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(LS_KEY[key]);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  }
  async function writeKey(key: DataKey, value: unknown): Promise<{ ok: boolean; reason?: "quota" | "denied" | "auth" }> {
    if (useApi()) return apiPut(key, value);
    if (typeof window === "undefined") return { ok: false, reason: "denied" };
    try {
      window.localStorage.setItem(LS_KEY[key], JSON.stringify(value));
      return { ok: true };
    } catch (e) {
      const reason = e instanceof DOMException && e.name === "QuotaExceededError" ? "quota" : "denied";
      return { ok: false, reason };
    }
  }
  // 단일 키 비우기. account mode에서는 PUT(payload:null) upsert를 호출하던 기존 방식이
  //   ① /api/data DELETE(전체)와 중복(6번 서버 요청), ② [key] DELETE가 null-payload row를 남겨
  //   전체 삭제 후 다시 null row를 만들어 idempotency를 깨는 문제가 있었다. (finding)
  //   → account mode에서 단일 클리어는 **PUT(payload: null)로 그 키만 비우되**, "데이터 삭제"(전체)는
  //     me/page가 DELETE /api/data 1회로 처리하고 clearKey(account)를 호출하지 않는다(중복 회피, Step 6.3).
  //   로컬 모드는 localStorage.removeItem.
  async function clearKey(key: DataKey): Promise<void> {
    if (useApi()) { await apiPut(key, null); return; } // 그 키만 비움(전체 삭제는 /api/data DELETE)
    if (typeof window === "undefined") return;
    try { window.localStorage.removeItem(LS_KEY[key]); } catch { /* swallow */ }
  }
  ```

- [ ] **Step 4.5 (구현 — Results async화)** — `loadResults`/`getResult`/`addResult`/`clearAllResults`/`removeResult`를 readKey/writeKey 기반 async로 재작성(LRU·`isResultEntry` 유지). 예:
  ```ts
  export async function loadResults(): Promise<ResultEntry[]> {
    const parsed = await readKey("results");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isResultEntry);
  }
  export async function getResult(id: string): Promise<ResultEntry | null> {
    return (await loadResults()).find((r) => r.id === id) ?? null;
  }
  export async function addResult(partial: Omit<ResultEntry, "id" | "created_at">): Promise<AddResultResult> {
    const results = await loadResults();
    let droppedOldest = false;
    const newEntry: ResultEntry = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `res_${Date.now()}`,
      created_at: consentNow(), ...partial,
    };
    results.push(newEntry);
    if (results.length > MAX_RESULTS) { results.shift(); droppedOldest = true; }
    let r = await writeKey("results", results);
    if (!r.ok && r.reason === "quota" && results.length > 1) { results.shift(); droppedOldest = true; r = await writeKey("results", results); }
    if (!r.ok) return { ok: false, reason: "denied" };
    return { ok: true, id: newEntry.id, dropped_oldest: droppedOldest };
  }
  export async function clearAllResults(): Promise<void> { await clearKey("results"); }
  export async function removeResult(id: string): Promise<{ ok: boolean; removed: boolean }> {
    const list = await loadResults();
    const idx = list.findIndex((r) => r.id === id);
    if (idx === -1) return { ok: true, removed: false };
    list.splice(idx, 1);
    const r = await writeKey("results", list);
    return { ok: r.ok, removed: r.ok };
  }
  ```

- [ ] **Step 4.6 (구현 — Profile async화)** — `loadProfile`/`saveProfile`/`clearProfile`를 readKey/writeKey 기반 async로. `saveProfile`은 `isProfile` 검증 유지, write 실패 reason에 `auth` 추가:
  ```ts
  export async function loadProfile(): Promise<Profile | null> {
    const parsed = await readKey("profile");
    return isProfile(parsed) ? parsed : null;
  }
  export async function saveProfile(profile: Profile): Promise<{ ok: true } | { ok: false; reason: "quota" | "denied" | "invalid" | "auth" }> {
    if (!isProfile(profile)) return { ok: false, reason: "invalid" };
    const r = await writeKey("profile", profile);
    return r.ok ? { ok: true } : { ok: false, reason: r.reason ?? "denied" };
  }
  export async function clearProfile(): Promise<void> { await clearKey("profile"); }
  ```

- [ ] **Step 4.7 (구현 — Revisions async화)** — `loadRevisions`/`addRevision`/`getThread`/`clearAllRevisions`를 async로. `addRevision`은 thread LRU + thread-drop 재시도 로직을 `writeKey` 기반으로 유지(기존 quota 분기를 `r.reason === "quota"`로):
  ```ts
  export async function loadRevisions(): Promise<RevisionThread[]> {
    const parsed = await readKey("revisions");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRevisionThread);
  }
  export async function addRevision(threadId: string | null, partial: Omit<RevisionEntry, "id" | "version" | "created_at">): Promise<AddRevisionResult> {
    const threads = await loadRevisions();
    let droppedInThread = false;
    let targetIdx = threadId ? threads.findIndex((t) => t.thread_id === threadId) : -1;
    if (targetIdx === -1) {
      threads.push({ thread_id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `thr_${Date.now()}`, revisions: [] });
      targetIdx = threads.length - 1;
    }
    const thread = threads[targetIdx];
    const nextVersion = thread.revisions.length > 0 ? Math.max(...thread.revisions.map((r) => r.version)) + 1 : 1;
    thread.revisions.push({ id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `rev_${Date.now()}_${nextVersion}`, version: nextVersion, created_at: consentNow(), ...partial });
    if (thread.revisions.length > MAX_REVISIONS_PER_THREAD) { thread.revisions.shift(); droppedInThread = true; }
    let result = await writeKey("revisions", threads);
    let droppedThread = false;
    if (!result.ok && result.reason === "quota") {
      const candidate = threads.findIndex((_, i) => i !== targetIdx);
      if (candidate !== -1) { threads.splice(candidate, 1); droppedThread = true; result = await writeKey("revisions", threads); }
    }
    if (!result.ok) return { ok: false, reason: "denied" };
    return { ok: true, thread_id: thread.thread_id, dropped_oldest_in_thread: droppedInThread, dropped_oldest_thread: droppedThread };
  }
  export async function getThread(threadId: string): Promise<RevisionThread | null> {
    return (await loadRevisions()).find((t) => t.thread_id === threadId) ?? null;
  }
  export async function clearAllRevisions(): Promise<void> { await clearKey("revisions"); }
  ```
  (기존 동기 private `writeRevisions`·`writeResults`는 삭제 — `writeKey`로 대체.)

- [ ] **Step 4.8 (구현 — Draft async화)** — `loadDraft`/`saveDraft`/`clearDraft`를 async로. `saveDraft`는 `isDraftSnapshot` 검증 유지:
  ```ts
  export async function loadDraft(): Promise<DraftSnapshot | null> {
    const parsed = await readKey("drafts");
    return isDraftSnapshot(parsed) ? parsed : null;
  }
  export async function saveDraft(snapshot: Omit<DraftSnapshot, "saved_at">): Promise<{ ok: true; saved_at: string } | { ok: false; reason: "quota" | "denied" | "invalid" | "auth" }> {
    const saved_at = consentNow();
    const full: DraftSnapshot = { ...snapshot, saved_at };
    if (!isDraftSnapshot(full)) return { ok: false, reason: "invalid" };
    const r = await writeKey("drafts", full);
    return r.ok ? { ok: true, saved_at } : { ok: false, reason: r.reason ?? "denied" };
  }
  export async function clearDraft(): Promise<void> { await clearKey("drafts"); }
  ```

- [ ] **Step 4.9 (구현 — MetaUsage async화)** — `loadMetaUsage`/`recordMetaUsage`/`getMostUsedMeta`/`loadValidatedMetaUsage`/`clearMetaUsage`를 async로. `dedupAndCapLRU`·`isMetaUsageEntry`·`isValidMetaValue`·`emptyMetaUsage`(순수)는 유지. `loadMetaUsage`/`loadValidatedMetaUsage`는 `readKey` 결과를 기존 필드 루프로 처리:
  ```ts
  export async function loadMetaUsage(): Promise<MetaUsage> {
    const parsed = await readKey("meta_usage");
    if (typeof parsed !== "object" || parsed === null) return emptyMetaUsage();
    const o = parsed as Record<string, unknown>;
    const result = emptyMetaUsage();
    for (const f of ["school_level", "subject", "genre", "target_raw"] as MetaField[]) {
      const arr = o[f];
      if (Array.isArray(arr)) result[f] = dedupAndCapLRU(arr.filter(isMetaUsageEntry));
    }
    return result;
  }
  // 순수 — usage 객체의 한 필드를 in-place 갱신(count++/LRU). RMW의 modify 단계만 분리.
  function applyMetaUsage(usage: MetaUsage, field: MetaField, value: string, now: string): void {
    const trimmed = value.trim();
    if (!trimmed) return;
    const list = usage[field];
    const existing = list.find((e) => e.value === trimmed);
    if (existing) { existing.count += 1; existing.last_used_at = now; }
    else {
      list.push({ value: trimmed, count: 1, last_used_at: now });
      if (list.length > MAX_META_USAGE_PER_FIELD) { list.sort((a, b) => a.last_used_at.localeCompare(b.last_used_at)); list.shift(); }
    }
  }
  export async function recordMetaUsage(field: MetaField, value: string): Promise<void> {
    if (!value.trim()) return;
    const usage = await loadMetaUsage();
    applyMetaUsage(usage, field, value, consentNow());
    await writeKey("meta_usage", usage);
  }
  // ★ 4필드 일괄 기록 — 1 load → 다필드 갱신 → 1 write. account mode에서 8왕복→2왕복, lost update 제거.
  //   (runScore가 4건을 Promise.all로 병렬 호출하면 같은 meta_usage 키를 같은 base로 읽어 마지막 쓰기만 남는다.)
  export async function recordMetaUsageBatch(entries: ReadonlyArray<readonly [MetaField, string]>): Promise<void> {
    const valid = entries.filter(([, v]) => v.trim().length > 0);
    if (valid.length === 0) return;
    const usage = await loadMetaUsage();
    const now = consentNow();
    for (const [field, value] of valid) applyMetaUsage(usage, field, value, now);
    await writeKey("meta_usage", usage);
  }
  export async function getMostUsedMeta(field: MetaField): Promise<string | null> {
    const list = (await loadValidatedMetaUsage())[field];
    if (list.length === 0) return null;
    return [...list].sort((a, b) => (b.count !== a.count ? b.count - a.count : b.last_used_at.localeCompare(a.last_used_at)))[0].value;
  }
  export async function loadValidatedMetaUsage(): Promise<MetaUsage> {
    const parsed = await readKey("meta_usage");
    if (typeof parsed !== "object" || parsed === null) return emptyMetaUsage();
    const o = parsed as Record<string, unknown>;
    const result = emptyMetaUsage();
    for (const f of ["school_level", "subject", "genre", "target_raw"] as MetaField[]) {
      const arr = o[f];
      if (Array.isArray(arr)) result[f] = dedupAndCapLRU(arr.filter(isMetaUsageEntry).filter((e) => isValidMetaValue(f, e.value)));
    }
    return result;
  }
  export async function clearMetaUsage(): Promise<void> { await clearKey("meta_usage"); }
  ```

- [ ] **Step 4.9b (구현 — Consent payload 통로)** — consent 상태도 계정 귀속(스펙 PII (1)). storage는 raw payload만 read/write/clear 하고, 검증(`isConsentState`)·`emptyConsent` 폴백·필드 토글은 consent-store.ts가 적용(관심사 분리 — storage는 `consent.ts` 타입을 import하지 않는다):
  ```ts
  // ── Consent (동의) payload 통로 — 검증/폴백은 consent-store.ts 책임 ──────
  export async function loadConsentData(): Promise<unknown | null> {
    return readKey("consent");
  }
  export async function saveConsentData(state: unknown): Promise<{ ok: boolean; reason?: "quota" | "denied" | "auth" }> {
    return writeKey("consent", state);
  }
  export async function clearConsentData(): Promise<void> { await clearKey("consent"); }

  // accountMode 무관 — localStorage 6키 직접 제거(서버 PUT(null) 미발생). me 삭제 authed 분기 전용.
  export function clearAllLocalStorage(): void {
    if (typeof window === "undefined") return;
    for (const k of Object.values(LS_KEY)) {
      try { window.localStorage.removeItem(k); } catch { /* swallow */ }
    }
  }
  ```

- [ ] **Step 4.10 (통과 확인)**:
  ```bash
  npm run test:components && npm run test:unit && npm run typecheck
  ```
  예상: storage-adapter 5건 + storage-pure 4건(consent 통로 export 포함) pass. typecheck는 호출부 미전환으로 **에러 다수 발생 예상**(T5에서 해소) — 단, 여기선 storage.ts 자체가 컴파일되는지만 확인하고, 호출부 await 에러는 T5에서 잡는다. (storage.ts 단독 타입 오류 0을 목표로; 호출부 오류는 허용.)

- [ ] **Step 4.11 (commit)**:
  ```bash
  git add app/lib/storage.ts scripts/components/storage-adapter.test.tsx scripts/storage-pure.test.mjs
  git commit -m "feat(storage): 비동기 어댑터 + accountMode 라우팅(API/localStorage), LRU·type guard 유지"
  ```

---

## Task 5 — storage 전 호출부 await 전환

리콘 callers 전수. 각 파일 await 전환 + 영향(로딩 상태·effect async wrapper) 명시. **type-only 5개 파일**(`ProfileForm.tsx`·`ResultView.tsx`·`RevisionBodyView.tsx`·`StepEssay.tsx`·`StepResult.tsx`·`app/lib/profile-validate.ts`)은 타입만 import하므로 **무변경**(typecheck로 확인).

**Files**
- Modify: `app/hooks/useScoreForm.ts`
- Modify: `app/components/coach/AssignmentStep.tsx`
- Modify: `app/components/HomeWelcomeBanner.tsx`
- Modify: `app/components/MetaUsageCard.tsx`
- Modify: `app/components/TryClient.tsx`
- Modify: `app/onboarding/page.tsx`
- Modify: `app/me/page.tsx` (await만; 서버 DELETE 연동은 T6)
- Modify: `app/results/[id]/page.tsx`
- Modify: `app/results/page.tsx`
- Modify: `app/lib/use-auth.tsx` (refresh→Promise<Status> + `setAccountMode` 주입 — accountMode 활성화)
- Modify: `app/lib/consent-store.ts` (`loadConsent`/`saveConsent`/`clearConsent`를 storage 어댑터 경유 async로 — consent 계정 귀속)

**Interfaces**
- Consumes: T4의 async storage 함수 전부 + `setAccountMode`.
- `local` 판정: `NEXT_PUBLIC_API_URL`에 `pullim.local` 포함이면 local(host-only) → `setAccountMode({authed, local:true})`로 localStorage 강제.

Steps:

- [ ] **Step 5.1 (use-auth — refresh 결과 반환 + accountMode 주입)** — `app/lib/use-auth.tsx` 두 가지 변경:

  **(1) `refresh` 시그니처 확장 — `Promise<void>` → `Promise<Status>`** (finding: 기존 refresh가 성공/실패를 반환하지 않아 onAuthExpired가 항상 true를 반환 → refresh 실패해도 storage가 재요청, Constraint 10의 "refresh 실패 시 곧바로 안내" 경로 도달 불가):
  - `type AuthCtx`의 `refresh: () => Promise<void>` → `refresh: () => Promise<Status>`. (Status는 export 필요 — `export type Status`로 노출하거나 별도 `refreshOk(): Promise<boolean>`을 두는 방법도 가능하나, 여기선 Status 반환 채택.)
  - `refresh` 콜백 본문의 모든 `setStatus(X); return;` 분기를 `setStatus(X); return X;`(또는 `return "authed"` 등 해당 상태)로 바꿔 **최종 상태를 그대로 반환**한다. 예: authed 분기 `setStatus("authed"); return "authed";`, guest 분기 `setUser(null); setStatus("guest"); return "guest";`, error 분기 `setStatus("error"); return "error";`, catch 분기 `setUser(null); setStatus("guest"); return "guest";`.
  - 기존 `useEffect(() => { void refresh(); }, [refresh]);`는 그대로(반환값 무시).
  - 기존 useAuth 소비자(타입) 동반 확인: `refresh`의 반환을 무시하던 호출부는 무영향(`void`/미사용). 타입은 `Promise<Status>`로 넓어질 뿐이라 호환.

  **(2) accountMode 주입 — onAuthExpired는 refresh 결과를 그대로 반환**:
  - 구현: `AuthProvider`에서 `import { setAccountMode } from "./storage";` 후 effect로 주입:
    ```tsx
    const isLocal = API_BASE.includes("pullim.local");
    useEffect(() => {
      setAccountMode({
        authed: status === "authed",
        local: isLocal,
        // refresh 결과를 그대로 반환 — authed면 true(재요청), 그 외(guest/error)면 false(재시도 없이 auth 실패 낙하 → 상위 안내).
        onAuthExpired: async () => (await refresh()) === "authed",
      });
    }, [status, refresh]);
    ```
  - 실패 테스트(`scripts/components/useAuth.test.tsx`에 추가): (a) authed 전환 시 `setAccountMode({authed:true,...})` 호출, local URL이면 `local:true`; (b) `refresh()`가 `"guest"`로 끝나는 시나리오(401→csrf 실패 mock)에서 `onAuthExpired()`가 `false`를 반환하는지(storage spy로 주입된 콜백 직접 호출).
    ```tsx
    // 예: vi.spyOn(storageMod, "setAccountMode"); status authed 시 authed:true 인자 확인.
    //     refresh가 guest로 끝나는 mock에서 캡처한 onAuthExpired() === false 확인.
    ```
  - 확인: `npm run test:components`(useAuth) + `npm run typecheck`(refresh 시그니처 변경 파급) green.
  - commit: `git commit -am "feat(auth): refresh→Promise<Status> + useAuth storage.setAccountMode 주입(onAuthExpired는 refresh 결과 반영)"`

- [ ] **Step 5.2 (results/page.tsx)** — effect의 `loadResults()`를 async, `handleDelete`의 `removeResult`를 await:
  - 실패 테스트: 신규 `scripts/components/results-page.test.tsx` — `vi.mock("@/app/lib/storage", ...)`로 `loadResults` async mock → `waitFor`로 목록 렌더 확인, 삭제 핸들러 await 후 목록에서 제거.
  - 구현:
    ```tsx
    useEffect(() => {
      let alive = true;
      void (async () => {
        const list = await loadResults();
        if (!alive) return;
        setItems(list);
        setState(list.length === 0 ? "empty" : "loaded");
      })();
      return () => { alive = false; };
    }, []);

    async function handleDelete(id: string) {
      const result = await removeResult(id);
      if (result.ok && result.removed) { /* 기존 setItems 로직 그대로 */ }
    }
    ```
    onClick은 `onClick={() => void handleDelete(r.id)}`. 영향: 초기 `state="loading"` 그대로 유지(이미 있음).
  - 확인: `npm run test:components`.
  - commit.

- [ ] **Step 5.3 (results/[id]/page.tsx)** — `getResult(id)` await:
  - 실패 테스트: `scripts/components/result-detail.test.tsx` — `getResult` async mock → `waitFor`로 상세 렌더(found/not-found).
  - 구현(L27 effect):
    ```tsx
    useEffect(() => {
      let alive = true;
      void (async () => { const r = await getResult(id); if (alive) { /* 기존 setResult/setState */ } })();
      return () => { alive = false; };
    }, [id]);
    ```
  - 확인 + commit.

- [ ] **Step 5.4 (HomeWelcomeBanner.tsx)** — `loadProfile()` await:
  - 실패 테스트: `scripts/components/home-welcome-banner.test.tsx` — `loadProfile` async mock → `waitFor`로 닉네임 표시.
  - 구현(L15 effect):
    ```tsx
    useEffect(() => {
      let alive = true;
      void (async () => { const p = await loadProfile(); if (alive) setProfile(p); })();
      return () => { alive = false; };
    }, []);
    ```
  - 확인 + commit.

- [ ] **Step 5.5 (MetaUsageCard.tsx)** — `loadValidatedMetaUsage()` await:
  - 실패 테스트: `scripts/components/meta-usage-card.test.tsx` — async mock → `waitFor`로 칩 렌더.
  - 구현(L30 effect): async wrapper(위 패턴) + `setUsage`.
  - 확인 + commit.

- [ ] **Step 5.6 (AssignmentStep.tsx)** — `useMemo(() => loadProfile(), [])`(L22)를 effect+state로 전환(async는 useMemo 불가):
  - 실패 테스트: `scripts/components/assignment-step.test.tsx`(또는 기존 coach 테스트에 추가) — `loadProfile` async mock → 프로필 defaults 반영 확인.
  - 구현:
    ```tsx
    const [profile, setProfile] = useState<Profile | null>(null);
    useEffect(() => { let alive = true; void (async () => { const p = await loadProfile(); if (alive) setProfile(p); })(); return () => { alive = false; }; }, []);
    ```
    `profile`을 쓰는 하위 로직은 `null` 초기값 허용(로딩 중 defaults 미적용 → 로드 후 반영). import에 `type Profile` 추가.
  - 확인 + commit.

- [ ] **Step 5.7 (TryClient.tsx)** — `loadProfile()`(L23 effect)·`saveProfile(next)`(L46 handler) await:
  - 실패 테스트: `scripts/components/try-client.test.tsx`(또는 기존) — async mock.
  - 구현: L23 effect를 async wrapper. L46 핸들러를 `async`로 만들고 `const result = await saveProfile(next);`. 호출부는 `void handler()`.
  - 확인 + commit.

- [ ] **Step 5.8 (onboarding/page.tsx)** — `loadProfile()`(L53)·`saveProfile`(L85)·`loadProfile()`(L297) await:
  - 실패 테스트: `scripts/components/onboarding-page.test.tsx` — async mock으로 기존 프로필 진입/저장 흐름.
  - 구현: L53 effect async wrapper. L85 핸들러 async + await. L297의 `!loadProfile()` 가드는 effect로 끌어내 state(`hasProfile`)로 치환:
    ```tsx
    const [hasProfile, setHasProfile] = useState<boolean | null>(null);
    useEffect(() => { void (async () => setHasProfile(!!(await loadProfile())))(); }, []);
    // 기존 if (!profile && !loadProfile()) → if (!profile && hasProfile === false)
    ```
  - **동의(consent) 흐름 await(Step 5.8b 의존)**: onboarding은 consent도 영속한다 — `loadConsent()`(L89·L292)·`saveConsent(...)`(L90·L313·L320)가 Step 5.8b에서 async가 되므로 await 전환:
    - L89~90 핸들러(`handleProfileSubmit`)를 async로: `const base = await loadConsent(); await saveConsent(setServiceConsent(base, consentAccepted, now));`. 호출부는 `void handleProfileSubmit(...)`.
    - L292 마운트 `setConsent(loadConsent())`를 async wrapper로: `useEffect(() => { let alive = true; void (async () => { const c = await loadConsent(); if (alive) setConsent(c); })(); return () => { alive = false; }; }, []);`.
    - L311~313·L318~320 토글 핸들러(`handleGuardianConsent`·`handleAiTrainingOptIn`)를 async로: `setConsent(nextState); await saveConsent(nextState);`. (낙관적 set 후 저장 — 저장 실패 reason 안내 훅 자리만 남김.)
  - 확인 + commit.

- [ ] **Step 5.8b (consent-store.ts — storage 어댑터 경유 async화)** — consent 계정 귀속(스펙 PII (1)). `loadConsent`/`saveConsent`/`clearConsent`를 storage 어댑터(Step 4.9b)로 위임하되, **검증(`isConsentState`)·`emptyConsent` 폴백·필드 토글 헬퍼(setServiceConsent 등 순수)는 그대로 유지**:
  - 구현:
    ```ts
    import { loadConsentData, saveConsentData, clearConsentData } from "./storage";
    // CONSENT_KEY/직접 localStorage 접근은 제거 — storage 어댑터가 account/local 라우팅 담당.

    export async function loadConsent(): Promise<ConsentState> {
      const parsed = await loadConsentData();           // account면 GET, 아니면 LS
      return isConsentState(parsed) ? parsed : emptyConsent();  // 손상/미존재/SSR → 기본 OFF
    }
    export async function saveConsent(
      state: ConsentState,
    ): Promise<{ ok: true } | { ok: false; reason: "quota" | "denied" | "invalid" | "auth" }> {
      if (!isConsentState(state)) return { ok: false, reason: "invalid" };
      const r = await saveConsentData(state);
      return r.ok ? { ok: true } : { ok: false, reason: r.reason ?? "denied" };
    }
    export async function clearConsent(): Promise<void> { await clearConsentData(); }
    ```
    (`isConsentState`·토글 헬퍼·`emptyConsent` import는 무변경. SSR 가드는 storage 어댑터의 `typeof window` 처리에 위임.)
  - 실패 테스트: `scripts/components/consent-store.test.tsx`(또는 기존 consent-store 테스트에 추가) — storage mock으로 (a) guest(localStorage)에서 save→load 왕복, (b) account mode에서 `loadConsentData`/`saveConsentData` 호출 확인.
  - 확인: `npm run test:components` + `npm run typecheck`.
  - commit: `git commit -am "feat(consent): consent-store → storage 어댑터 경유 async(consent 계정 귀속)"`

- [ ] **Step 5.9 (useScoreForm.ts)** — 가장 큰 파급. 동기 호출 전부 await. **import 변경**: `recordMetaUsage`(개별) 대신 `recordMetaUsageBatch`(일괄 RMW)를 import한다(L30 부근 storage import).
  - **초기 useState(L140~149)**: `getMostUsedMeta`는 이제 async라 lazy initializer 불가 → 빈 문자열로 초기화 후 effect로 채움. ⚠ **prefill은 draft 복원(applyRestore)값을 덮어쓰면 안 된다** (기존 동기 lazy initializer는 마운트 시점에 단번에 결정됐지만, async prefill effect와 draft-restore가 비동기로 같은 setter를 건드리면 늦게 도착한 LRU prefill이 복원값을 덮어쓰는 회귀가 생긴다 — 특히 account mode 네트워크 지연 시). 따라서 prefill은 **setter가 비어있을 때만** 적용한다(`setX(prev => prev || v)` 함수형 갱신 — 사용자가 복원/입력으로 이미 채운 값은 보존):
    ```ts
    const [schoolLevel, setSchoolLevel] = useState(defaults?.school_level ?? "");
    // ... subject/genre/targetRaw 동일(defaults 우선, LRU는 effect로)
    useEffect(() => {
      let alive = true;
      void (async () => {
        // 함수형 갱신 — 이미 값이 있으면(applyRestore·사용자 입력) 보존, 빈 값일 때만 LRU 채움.
        if (!defaults?.school_level) { const v = await getMostUsedMeta("school_level"); if (alive && v) setSchoolLevel((prev) => prev || v); }
        if (!defaults?.subject) { const v = await getMostUsedMeta("subject"); if (alive && v) setSubject((prev) => prev || v); }
        if (!defaults?.genre) { const v = await getMostUsedMeta("genre"); if (alive && v) setGenre((prev) => prev || v); }
        const t = await getMostUsedMeta("target_raw"); if (alive && t) setTargetRaw((prev) => prev || t);
      })();
      return () => { alive = false; };
    }, []); // defaults는 prefill 우선순위 — 마운트 1회. 복원/입력값은 함수형 갱신으로 보존.
    ```
  - **draft 마운트 effect(L177)·clipboard(L188) — 단일 async effect로 병합(loadDraft 1회 호출)**: 기존 두 effect는 각각 독립적으로 `loadDraft()`를 동기 호출했고, clipboard 가드 `if (loadDraft() !== null) return;`이 draft가 있으면 클립보드 배너를 억제한다(순서 보장은 동기 코드라 자동). async 전환 시 둘을 그대로 분리하면 ① account mode에서 `loadDraft()`가 `GET /api/data/drafts` 왕복이 되어 중복 fetch, ② 두 effect의 완료 순서가 비결정적이라 draft가 서버에 있어도 clipboard 배너가 먼저 떠버리는 레이스가 생긴다. **두 마운트 로직을 하나의 async effect로 합치고 `loadDraft()`를 1회만 호출**한다 — 그 단일 결과로 (a) 의미 있는 draft면 `setRestoredDraft`, (b) draft가 없을 때만(`draft === null`) 클립보드 readText를 진행하도록 가드:
    ```ts
    useEffect(() => {
      let cancelled = false;
      void (async () => {
        const draft = await loadDraft(); // ★ 1회만 — 두 로직이 같은 결과를 공유(중복 fetch·레이스 제거)
        if (cancelled) return;
        if (draft && (draft.body.trim().length > 0 || (draft.prompt_text ?? "").trim().length > 0)) {
          setRestoredDraft(draft);
          return; // draft가 있으면 클립보드 배너 억제(기존 동기 가드와 동일 의미)
        }
        if (typeof navigator === "undefined" || !navigator.clipboard?.readText) return;
        try {
          const text = await navigator.clipboard.readText();
          if (cancelled) return;
          const trimmed = text?.trim() ?? "";
          if (trimmed.length >= 30) setClipboardPreview(text);
        } catch {
          // 권한 거절 / 미지원 — 조용히 폴백
        }
      })();
      return () => { cancelled = true; };
    }, []);
    ```
  - **autosave debounce(L221)**: `saveDraft(...)`를 `setTimeout(async () => { const res = await saveDraft(...); if (res.ok) setLastSavedAt(res.saved_at); }, 800)`.
  - **제출 성공 effect(L236)**: `clearDraft()` await(async wrapper).
  - **dismissRestore(L256)**: `clearDraft()` await(`void clearDraft()` 또는 async).
  - **runScore 성공 분기(L477~510)**: `addResult`·`recordMetaUsage`×4·`addRevision`·`getThread`를 await:
    > ⚠ **recordMetaUsage 4건은 같은 `meta_usage` 키 RMW(read-modify-write)다.** 각 호출이 내부에서 `loadMetaUsage()`(read) → `writeKey()`(write)를 한다. **반드시 단일 `recordMetaUsageBatch`로 묶거나(권장 — 1 load → 4필드 갱신 → 1 write로 account mode 왕복을 8회→2회로 줄이고 레이스 제거), 불가피하게 개별 호출이면 순차 `await`만 허용한다.** `Promise.all`로 병렬화하면 4건이 같은 base를 읽어 마지막 쓰기만 남는 lost update가 발생한다(Task 4 Step 4.9에 `recordMetaUsageBatch` 추가).
    ```ts
    await addResult({ ... });
    // 단일 RMW로 4필드 일괄 기록(Promise.all 금지 — 같은 meta_usage 키 lost update 방지).
    await recordMetaUsageBatch([
      ["school_level", payload.assignment.school_level],
      ["subject", payload.assignment.subject],
      ["genre", payload.assignment.genre],
      ...(payload.assignment.target_char_count !== null
        ? [["target_raw", String(payload.assignment.target_char_count)] as const]
        : []),
    ]);
    const revRes = await addRevision(revisionThreadId, { ... });
    if (revRes.ok) {
      setRevisionThreadId(revRes.thread_id);
      const thread = await getThread(revRes.thread_id);
      if (thread && thread.revisions.length >= 2) { /* 기존 */ }
    }
    setSubmitState({ phase: "result", output, assignment: payload.assignment });
    ```
    (runScore는 이미 async — 추가 wrapper 불필요. 단 result 저장 실패 시에도 화면엔 결과를 보여주되, authed 저장 실패는 콘솔 사실 로깅 + 향후 안내 훅 자리만 남김.)
  - 실패 테스트: 기존 `scripts/components/*scoreform*` 또는 신규 `scripts/components/use-score-form.test.tsx` — `vi.mock("@/app/lib/storage")`로 async mock, 제출 성공 시 `addResult`/`addRevision` await 호출 확인 + revisionPair 세팅.
  - 확인: `npm run test:components`.
  - commit: `git commit -am "refactor(score): useScoreForm storage 호출 await 전환(prefill·draft·제출 저장)"`

- [ ] **Step 5.10 (me/page.tsx — await만)** — clear* 5종(L36~40)·`loadProfile`(L45)·`saveProfile`(L111) await. 삭제 핸들러를 async로. **consent 삭제 누락 보완**: 기존 핸들러는 `clearConsent()`를 호출하지 않아 "모든 데이터를 지웠다"는 카피(실제 "프로필·동의 기록" 약속)와 불일치였다 — `clearConsent()`를 추가한다(consent-store import 필요):
  - 구현: 삭제 핸들러 `async` + `await clearProfile(); await clearDraft(); await clearAllRevisions(); await clearAllResults(); await clearMetaUsage(); await clearConsent();`. (`import { clearConsent } from "../lib/consent-store";` 추가.) (서버 DELETE 통합·account 분기는 T6.) L45 effect async wrapper, L111 핸들러 await.
  - 실패 테스트: T6에서 통합 검증(여기선 typecheck로 충분).
  - 확인: `npm run typecheck`.
  - commit: `git commit -am "refactor(me): storage 호출 await 전환(삭제·프로필) + clearConsent 누락 보완"`

- [ ] **Step 5.11 (전체 typecheck 그린 확인)**:
  ```bash
  npm run typecheck && npm run test:components && npm run test:unit
  ```
  예상: 호출부 await 미전환으로 인한 타입 에러 0. type-only 5개 파일은 무변경으로 통과.

---

## Task 6 — "데이터 삭제" 서버 연동 (/me page)

**Files**
- Modify: `app/me/page.tsx` (삭제 핸들러에 authed면 `DELETE /api/data` 추가)
- Create (Test): `scripts/components/me-delete.test.tsx`

**Interfaces**
- Consumes: `useAuth()`(status), `DELETE /api/data`(T3), storage clear*(T5)·`clearConsent`(consent-store, T5.8b).
- **삭제 분기(중복/idempotency 회피, finding)**: `status==="authed"`(account mode)면 **서버는 `DELETE /api/data` 1회로 전량 삭제**하고, 개별 `clearKey`(account)는 호출하지 않는다(`/api/data/[key]`를 6키 × PUT(null)로 다시 부르면 전체 DELETE 후 null row를 재생성해 idempotency가 깨진다). 단 **로컬(localStorage)에 남은 게스트-시절 흔적 제거를 위해 local clear는 항상 수행**한다 — 이를 위해 me 핸들러는 (a) authed면 `DELETE /api/data`(서버 전량) + (b) account/local 무관하게 localStorage 6키를 직접 비우는 경로를 쓴다. clear* storage 함수는 account mode에서 단일 키 서버 PUT(null)을 내므로 **authed 분기에서는 clear*를 호출하지 않고**, localStorage 직접 정리는 별도 헬퍼나 local-clear 경로로 처리(아래 Step 6.3 참조). 게스트/로컬이면 clear*(=localStorage) 만 호출.

Steps:

- [ ] **Step 6.1 (실패 테스트)** — `scripts/components/me-delete.test.tsx`:
  ```tsx
  import { it, expect, vi, beforeEach } from "vitest";
  import { render, screen, waitFor, fireEvent } from "@testing-library/react";

  const clearAllLocalStorage = vi.fn();
  vi.mock("@/app/lib/storage", () => ({
    loadProfile: vi.fn().mockResolvedValue(null),
    saveProfile: vi.fn(), clearProfile: vi.fn().mockResolvedValue(undefined),
    clearDraft: vi.fn().mockResolvedValue(undefined), clearAllRevisions: vi.fn().mockResolvedValue(undefined),
    clearAllResults: vi.fn().mockResolvedValue(undefined), clearMetaUsage: vi.fn().mockResolvedValue(undefined),
    clearAllLocalStorage,
    consentNow: () => "2026-01-01T00:00:00+09:00",
  }));
  const clearConsent = vi.fn().mockResolvedValue(undefined);
  vi.mock("@/app/lib/consent-store", () => ({ clearConsent }));
  vi.mock("@/app/lib/use-auth", () => ({ useAuth: () => ({ status: "authed", user: { displayName: "민수" }, refresh: vi.fn() }) }));

  beforeEach(() => { vi.clearAllMocks(); globalThis.fetch = vi.fn().mockResolvedValue({ status: 200, json: async () => ({ ok: true }) }); });

  // ⚠ 결정적 테스트 — 2단계 확인 UI(app/me/page.tsx DataDeleteSection)의 실제 셀렉터로 끝까지 클릭.
  //   1단계: "데이터 삭제하기" 버튼 → confirmDelete 펼침. 2단계: "네, 삭제할게요" 버튼 → onDelete 실행.
  it("authed 삭제 — DELETE /api/data(전체) 1회 호출, 개별 /api/data/[key] 미호출", async () => {
    const Page = (await import("@/app/me/page")).default;
    render(<Page />);
    fireEvent.click(await screen.findByRole("button", { name: "데이터 삭제하기" }));
    fireEvent.click(await screen.findByRole("button", { name: "네, 삭제할게요" }));
    await waitFor(() =>
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/data", expect.objectContaining({ method: "DELETE", credentials: "include" })),
    );
    // 중복/idempotency 회피 — authed는 전체 DELETE만, 개별 키 요청은 없어야 한다.
    const calls = (globalThis.fetch as any).mock.calls.map((c: any[]) => c[0]);
    expect(calls.filter((u: string) => u === "/api/data").length).toBe(1);
    expect(calls.some((u: string) => /^\/api\/data\/[^/]+$/.test(u))).toBe(false);
  });

  it("authed 삭제 — 로컬 흔적 정리(clearAllLocalStorage), 개별 clear*는 미호출", async () => {
    const storage = await import("@/app/lib/storage");
    const Page = (await import("@/app/me/page")).default;
    render(<Page />);
    fireEvent.click(await screen.findByRole("button", { name: "데이터 삭제하기" }));
    fireEvent.click(await screen.findByRole("button", { name: "네, 삭제할게요" }));
    await waitFor(() => expect(clearAllLocalStorage).toHaveBeenCalled());
    // authed는 서버 전량 DELETE가 책임 — 개별 clear*(account면 서버 PUT(null))는 호출 안 함.
    expect(storage.clearProfile).not.toHaveBeenCalled();
  });
  ```
  > consent 삭제 검증은 **guest 분기** 케이스에서 한다(authed는 `DELETE /api/data` 전량이 consent 키까지 삭제하므로 별도 `clearConsent` 미호출). guest 케이스는 `useAuth` mock을 `status: "guest"`로 바꾼 별도 it 블록에서 `clear*` 5종 + `clearConsent` 호출을 확인한다(`fetch("/api/data", DELETE)`는 미호출).

- [ ] **Step 6.2 (실패 확인)**:
  ```bash
  npm run test:components
  ```
  예상: `fetch("/api/data", DELETE)` 미호출로 fail.

- [ ] **Step 6.3 (구현)** — `app/me/page.tsx` 삭제 핸들러를 **account/guest 분기**로 재작성(중복·idempotency·consent 일괄 해소). `import { clearAllLocalStorage, clearProfile, clearDraft, clearAllRevisions, clearAllResults, clearMetaUsage } from "../lib/storage";` + `import { clearConsent } from "../lib/consent-store";`:
  ```tsx
  const { status } = useAuth();
  async function handleDeleteAll() {
    if (status === "authed") {
      // ── account mode ──
      // 서버 계정 데이터: 전체 1회 DELETE로 6키 전량 삭제(개별 /api/data/[key] 호출 금지 —
      //   PUT(null) 6회가 전체 DELETE 후 null row를 재생성해 idempotency를 깬다).
      await fetch("/api/data", { method: "DELETE", credentials: "include" }).catch(() => {});
      // 같은 기기에 남은 게스트-시절 로컬 흔적 정리(서버 PUT(null) 미발생 — 순수 localStorage).
      clearAllLocalStorage();
    } else {
      // ── guest/local ── clear*는 이 모드에서 localStorage로 라우팅.
      await clearProfile();
      await clearDraft();
      await clearAllRevisions();
      await clearAllResults();
      await clearMetaUsage();
      await clearConsent(); // 동의 기록도 삭제(카피 "프로필·동의 기록" 약속 충족)
    }
    // 기존 완료 상태/리다이렉트 로직 그대로
  }
  ```
  > consent는 account mode에서 `consent` 키로 서버에 귀속되므로 authed 분기의 `DELETE /api/data`(전량)가 동의 이력도 함께 삭제한다(별도 clearConsent 불필요). guest/local 분기에서만 `clearConsent()`로 localStorage 동의를 지운다. me-delete 테스트(Step 6.1)는 authed에서 `clearAllLocalStorage` 호출과 `DELETE /api/data` 1회를 검증하고, 별도 guest 케이스를 추가해 clear*+`clearConsent` 호출을 검증한다.

- [ ] **Step 6.4 (통과 확인)**:
  ```bash
  npm run test:components && npm run typecheck
  ```

- [ ] **Step 6.5 (commit)**:
  ```bash
  git add app/me/page.tsx scripts/components/me-delete.test.tsx
  git commit -m "feat(me): 데이터 삭제 서버 연동(authed → DELETE /api/data + 로컬 clear)"
  ```

---

## Task 7 — .env.example · 실행/검증 노트

**Files**
- Modify: `.env.example` (`DATABASE_URL` 등재)
- Modify: `README.md` (마이그레이션·계정 store 실행 노트. 없으면 생성)

**Interfaces** — 없음(문서).

Steps:

- [ ] **Step 7.1** — `.env.example`에 추가(한국어 주석, `NEXT_PUBLIC_` 금지 명시):
  ```
  # per-user 계정 데이터 store — Neon Postgres 연결 문자열(서버 전용).
  #   /api/data/* 라우트가 app/lib/server/db.ts(neon 드라이버)로 접속. 미설정 시 계정 store fail-closed(throw).
  #   ⚠ 서버 전용 — NEXT_PUBLIC_ 프리픽스 금지(클라 번들 유출 방지). 자격증명·payload 로깅 금지.
  #   local: 미설정(host-only 쿠키라 로컬은 localStorage 폴백) · dev/prod: Vercel Neon 통합 시크릿.
  DATABASE_URL=

  # (선택) 비prod 로컬 e2e용 데모 세션 sub — getSessionSub 데모 fallback 시 안정 user_id.
  #   prod에선 무시(fail-closed). 미설정 시 "demo-sub".
  DEMO_SESSION_SUB=
  ```

- [ ] **Step 7.2** — `README.md`에 "계정 데이터 store" 섹션 추가(마이그레이션·검증 한계):
  - `npm run db:migrate`(DATABASE_URL 필요) — Neon에 `0001_init.sql` 적용.
  - **로컬 검증 한계(host-only)**: 로컬은 access 쿠키가 api 호스트 전용이라 계정 store path 미동작 → localStorage 폴백. 계정 store end-to-end는 **dev-writing.pullim.ai**에서만 실증.
  - **Dev e2e 수용 절차**: dev-writing 로그인 → 채점 → 다른 브라우저/기기 로그인 시 동일 결과 조회 → 게스트는 로컬만 → /me 데이터 삭제가 서버 반영.
  - **선행**: 로그인 #111 · Phase3 #112 머지 필요. `/me`가 `sub` 반환해야 함.

- [ ] **Step 7.3 (최종 검증)**:
  ```bash
  npm run typecheck && npm run test:unit && npm run test:components && npm run build
  ```
  예상: 전부 green. build 성공.

- [ ] **Step 7.4 (commit)**:
  ```bash
  git add .env.example README.md
  git commit -m "docs(store): .env.example DATABASE_URL + 계정 store 실행/검증 노트"
  ```

---

## 완료 기준 (수용)

- [ ] 로그인 회원: 6종 데이터(프로필·결과·수정이력·임시저장·메타·동의)가 계정 귀속 저장 + 다른 기기/브라우저 로그인 시 조회(Dev e2e). 미성년 보호자 동의 이력도 계정 귀속(스펙 PII (1)).
- [ ] 게스트·로컬(host-only): 기존 localStorage 동작 불변(storage-adapter 테스트 + Dev e2e).
- [ ] storage 비동기 전환 후 기존 화면(결과목록·상세·/try·/coach·/me·홈배너·메타카드) 회귀 없음(typecheck + component 테스트).
- [ ] 타 사용자 데이터 접근 불가(sub 스코프) · 게스트 `/api/data/*` 401(data-route 테스트).
- [ ] "데이터 삭제"가 서버 계정 데이터(동의 포함 6종)까지 삭제 — authed는 `DELETE /api/data` 전량 1회(중복/null-row 재생성 없음) + 로컬 흔적 정리, guest/local은 localStorage clear*+clearConsent(me-delete 테스트 + Dev e2e).
- [ ] Neon 마이그레이션 dev 실행 완료 · `DATABASE_URL` 시크릿(NEXT_PUBLIC_ 아님).
- [ ] `npm run typecheck`·`test:unit`·`test:components`·`build` 전부 green.
