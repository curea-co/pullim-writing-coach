# Pullim 인증 Phase 1 (로그인+세션, BFF) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** writing-coach에서 `dev-api.pullim.ai`로 **실제 email/pw 로그인 → 세션 지속 → /me → refresh → 로그아웃**이 동작하게 한다(BFF 프록시).

**Architecture:** Next route handler(`app/api/auth/*`)가 서버에서 dev-api로 프록시하고, dev-api의 httpOnly 쿠키(`dev-pullim-at`/`dev-pullim-rt`)·CSRF를 우리 origin으로 relay(도메인 제거·refresh Path 매핑). 브라우저는 우리 origin만 호출(same-origin) → CORS·cross-site 쿠키 문제 0. 클라이언트는 `useAuth()`로 `/api/auth/me` 기반 세션 상태.

**Tech Stack:** Next 16 route handler · raw `fetch`(새 의존성 0) · React 19 context · vitest(컴포넌트) · node:test(순수).

## Global Constraints (spec: 2026-06-27-pullim-auth-login-design.md)
- **BFF only** — 브라우저는 dev-api를 직접 호출하지 않는다. 모든 dev-api 호출은 Next 서버 라우트 경유.
- **토큰 httpOnly 유지** — 쿠키 relay 시 `HttpOnly; Secure; SameSite=Lax` 보존, 토큰을 JS/응답 body에 노출 0.
- **새 의존성 0** — raw fetch + 헤더 조작(기존 `app/lib/server` 패턴).
- **dev seed 라우트는 prod에서 404** (`NODE_ENV==="production"` → 404, dev-api 동형).
- **자격증명 미로깅** — email/password를 로그·Sentry에 남기지 않는다.
- **env**: `PULLIM_API_URL`(기본 `https://dev-api.pullim.ai`). dev-api 계약 상수(쿠키명·CSRF 헤더)는 T1에서 실측 확정.
- 기존 데모 게이트·코치/채점/추출 API **무수정**(Phase 1 공존).
- 커밋 끝: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. 검증: `npm run test:unit`·`test:components`·`typecheck`·`build`.

## File Structure
| 상태 | 경로 | 책임 |
|---|---|---|
| 신규 | `app/lib/server/pullim-auth.ts` | dev-api 프록시 fetch + Set-Cookie relay/재기록 + 계약 상수(순수·서버) |
| 신규 | `app/api/auth/csrf/route.ts` | `GET /auth/csrf` 프록시 |
| 신규 | `app/api/auth/login/route.ts` | `POST /auth/login` 프록시 + 쿠키 relay |
| 신규 | `app/api/auth/me/route.ts` | `GET /me` 프록시 |
| 신규 | `app/api/auth/refresh/route.ts` | `POST /auth/refresh` 프록시 |
| 신규 | `app/api/auth/logout/route.ts` | `POST /auth/logout` 프록시 |
| 신규 | `app/api/auth/dev/seed/route.ts` | `POST /auth/dev/seed-member`(prod 404) |
| 신규 | `app/lib/use-auth.tsx` | `useAuth()` 컨텍스트 |
| 신규 | `app/login/page.tsx` | email/pw 로그인 폼 |
| 수정 | `app/components/app-shell.tsx` | 헤더 `actions`에 인증 위젯 |
| 신규 | `scripts/pullim-auth.test.mjs`, `scripts/components/{LoginPage,useAuth}.test.tsx` | 테스트 |

---

## Task 1: pullim-auth 서버 헬퍼 + dev-api 계약 실측

**Files:** Create `app/lib/server/pullim-auth.ts`, `scripts/pullim-auth.test.mjs`; Modify `.env.example`

**Produces:** `PULLIM_API_URL`; `forwardToPullim(path, opts): Promise<{status, body, setCookies}>`; `rewriteSetCookie(line: string): string`; `mapLoginError(status: number): string`.

**확정된 계약(read-only 실측 2026-06-27 — `GET /auth/csrf`):**
- CSRF 쿠키 = **`dev-pullim-csrf`** (NOT httpOnly, `Domain=.pullim.ai`, `SameSite=Lax`) — double-submit.
- 토큰 = 응답 body `{"csrfToken":"<값>"}` (쿠키값 === 토큰).
- 세션 쿠키 = `dev-pullim-at`(access)·`dev-pullim-rt`(refresh, `Path=/auth`). `access-control-allow-credentials: true`.
- **미확정**: 변이 요청의 CSRF **헤더 이름**(csrf-csrf 기본 `x-csrf-token` 가정 → login에서 403 안 나면 확정) + dev-api가 받는 **Origin 허용값**.

- [ ] **Step 1: dev-api 계약 실측(라이브 — 구현 환경에서 1회)**. 위 확정값 외 남은 것(seed 동작·login 헤더)을 확인:
```bash
# CSRF 부트스트랩 — Set-Cookie + body(토큰) 확인
curl -s -i -m 10 https://dev-api.pullim.ai/auth/csrf | sed -n '1,25p'
# dev 테스트 회원 시드(이미 있으면 409 — 무해)
curl -s -m 10 -X POST https://dev-api.pullim.ai/auth/dev/seed-member \
  -H 'content-type: application/json' \
  -d '{"email":"coach-e2e@pullim.test","password":"Test1234!"}' | head -c 300
```
캡처해 `pullim-auth.ts` 상수에 기록: CSRF 쿠키 이름·CSRF 헤더 이름(응답/문서 기준, 미상이면 `x-csrf-token` 가정 후 login 401/403로 검증)·access/refresh 쿠키 이름(`dev-pullim-at`/`dev-pullim-rt` 확인). **확정 못 하면 그 사실을 주석에 남기고 진행**(login 라이브 테스트가 실허용).

- [ ] **Step 2: rewriteSetCookie 실패 테스트** — `scripts/pullim-auth.test.mjs`:
```js
import assert from "node:assert/strict";
import { test } from "node:test";
import { rewriteSetCookie, mapLoginError } from "../app/lib/server/pullim-auth.ts";

test("rewriteSetCookie: Domain 제거 + refresh Path /auth→/api/auth + httpOnly 보존", () => {
  const at = rewriteSetCookie("dev-pullim-at=abc; Path=/; Domain=dev-api.pullim.ai; HttpOnly; Secure; SameSite=Lax");
  assert.equal(/Domain=/i.test(at), false);          // Domain 제거(우리 origin host-only)
  assert.ok(/HttpOnly/i.test(at) && /Secure/i.test(at)); // 보안 속성 보존
  assert.ok(/dev-pullim-at=abc/.test(at));
  const rt = rewriteSetCookie("dev-pullim-rt=xyz; Path=/auth; Domain=dev-api.pullim.ai; HttpOnly");
  assert.ok(/Path=\/api\/auth/.test(rt));             // refresh Path 매핑
});
test("mapLoginError: 401→자격불일치, 403→CSRF, 그외→일반", () => {
  assert.match(mapLoginError(401), /일치하지/);
  assert.match(mapLoginError(403), /보안|다시/);
  assert.match(mapLoginError(500), /실패|잠시/);
});
```

- [ ] **Step 3: 실패 확인** — `node --import ./scripts/register-ts.mjs --test scripts/pullim-auth.test.mjs` → FAIL.

- [ ] **Step 4: 구현** — `app/lib/server/pullim-auth.ts`:
```ts
import "server-only";

// dev-api 계약(§dev-api 계약). 실측으로 확정 — 미상 항목은 보수적 기본값 + 라이브 검증.
export const PULLIM_API_URL = process.env.PULLIM_API_URL ?? "https://dev-api.pullim.ai";
export const COOKIE_AT = "dev-pullim-at";
export const COOKIE_RT = "dev-pullim-rt";
export const CSRF_HEADER = "x-csrf-token"; // T1 실측으로 확정

// dev-api Set-Cookie를 우리 origin용으로 재기록: Domain 제거(host-only), refresh Path /auth→/api/auth,
//   HttpOnly·Secure·SameSite 보존(토큰 httpOnly 유지).
export function rewriteSetCookie(line: string): string {
  let out = line.replace(/;\s*Domain=[^;]*/i, "");
  out = out.replace(/;\s*Path=\/auth\b/i, "; Path=/api/auth");
  return out;
}

export function mapLoginError(status: number): string {
  if (status === 401) return "이메일 또는 비밀번호가 일치하지 않아요.";
  if (status === 403) return "보안 확인에 실패했어요. 잠시 후 다시 시도해 주세요.";
  if (status === 400) return "입력 형식을 확인해 주세요.";
  return "로그인에 실패했어요. 잠시 후 다시 시도해 주세요.";
}

// 서버→dev-api 프록시. 브라우저 쿠키를 forward, dev-api Set-Cookie 회수. credentials는 수동 Cookie 헤더.
export async function forwardToPullim(
  path: string,
  opts: { method?: string; jsonBody?: unknown; cookie?: string | null; csrf?: string | null } = {},
): Promise<{ status: number; body: unknown; setCookies: string[] }> {
  const headers: Record<string, string> = { accept: "application/json" };
  if (opts.jsonBody !== undefined) headers["content-type"] = "application/json";
  if (opts.cookie) headers["cookie"] = opts.cookie;
  if (opts.csrf) headers[CSRF_HEADER] = opts.csrf;
  // dev-api CSRF Origin 검증 통과용 — 서버 발 요청이라 Origin을 명시(허용값은 T1 실측으로 확정).
  headers["origin"] = PULLIM_API_URL;
  const res = await fetch(`${PULLIM_API_URL}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.jsonBody !== undefined ? JSON.stringify(opts.jsonBody) : undefined,
    redirect: "manual",
  });
  // Next/undici: 다중 Set-Cookie는 getSetCookie()로 수집.
  const setCookies = typeof res.headers.getSetCookie === "function" ? res.headers.getSetCookie() : [];
  let body: unknown = null;
  const text = await res.text();
  if (text) { try { body = JSON.parse(text); } catch { body = text; } }
  return { status: res.status, body, setCookies };
}
```

- [ ] **Step 5: 통과** — 같은 명령 PASS.

- [ ] **Step 6: .env.example 갱신** — 추가:
```
# Pullim 인증 백엔드(BFF 프록시 대상). dev: https://dev-api.pullim.ai
PULLIM_API_URL=https://dev-api.pullim.ai
```

- [ ] **Step 7: Commit**
```bash
git add app/lib/server/pullim-auth.ts scripts/pullim-auth.test.mjs .env.example
git commit -m "$(printf 'feat(auth): pullim-auth 서버 헬퍼 — dev-api 프록시·쿠키 relay·에러 매핑\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 2: CSRF 부트스트랩 라우트

**Files:** Create `app/api/auth/csrf/route.ts`
**Consumes:** `forwardToPullim`, `rewriteSetCookie` (T1).

- [ ] **Step 1: 구현** — `app/api/auth/csrf/route.ts`:
```ts
import { NextResponse } from "next/server";
import { forwardToPullim, rewriteSetCookie } from "@/app/lib/server/pullim-auth";

// dev-api CSRF 부트스트랩 프록시 — CSRF 쿠키를 우리 origin으로 relay + 토큰 body 통과.
export async function GET() {
  const { status, body, setCookies } = await forwardToPullim("/auth/csrf", { method: "GET" });
  const res = NextResponse.json(body ?? {}, { status });
  for (const c of setCookies) res.headers.append("set-cookie", rewriteSetCookie(c));
  return res;
}
```

- [ ] **Step 2: 검증** — `npm run typecheck` 클린. `npm run build` PASS(라우트 컴파일).

- [ ] **Step 3: Commit**
```bash
git add app/api/auth/csrf/route.ts
git commit -m "$(printf 'feat(auth): /api/auth/csrf 프록시\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 3: 로그인 라우트

**Files:** Create `app/api/auth/login/route.ts`
**Consumes:** `forwardToPullim`, `rewriteSetCookie`, `mapLoginError`, `CSRF_HEADER` (T1).

- [ ] **Step 1: 구현** — `app/api/auth/login/route.ts`:
```ts
import { NextResponse, type NextRequest } from "next/server";
import { forwardToPullim, rewriteSetCookie, mapLoginError, CSRF_HEADER } from "@/app/lib/server/pullim-auth";

// email/pw 로그인 프록시. 브라우저 쿠키(CSRF 쿠키 포함)+CSRF 헤더를 dev-api로 forward, 세션 쿠키 relay.
//   자격증명은 로깅하지 않는다.
export async function POST(req: NextRequest) {
  let payload: { email?: unknown; password?: unknown };
  try { payload = await req.json(); } catch { return NextResponse.json({ message: "입력 형식을 확인해 주세요." }, { status: 400 }); }
  const email = typeof payload.email === "string" ? payload.email : "";
  const password = typeof payload.password === "string" ? payload.password : "";
  if (!email || !password) return NextResponse.json({ message: "이메일과 비밀번호를 입력해 주세요." }, { status: 400 });

  const { status, setCookies } = await forwardToPullim("/auth/login", {
    method: "POST",
    jsonBody: { email, password },
    cookie: req.headers.get("cookie"),
    csrf: req.headers.get(CSRF_HEADER),
  });
  if (status >= 400) return NextResponse.json({ message: mapLoginError(status) }, { status });
  const res = NextResponse.json({ ok: true }, { status: 200 });
  for (const c of setCookies) res.headers.append("set-cookie", rewriteSetCookie(c));
  return res;
}
```

- [ ] **Step 2: 검증 + Commit** — typecheck·build 그린.
```bash
git add app/api/auth/login/route.ts
git commit -m "$(printf 'feat(auth): /api/auth/login 프록시 + 세션 쿠키 relay\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 4: me · refresh · logout 라우트

**Files:** Create `app/api/auth/me/route.ts`, `app/api/auth/refresh/route.ts`, `app/api/auth/logout/route.ts`
**Consumes:** `forwardToPullim`, `rewriteSetCookie`, `CSRF_HEADER` (T1).

- [ ] **Step 1: me** — `app/api/auth/me/route.ts`:
```ts
import { NextResponse, type NextRequest } from "next/server";
import { forwardToPullim } from "@/app/lib/server/pullim-auth";

// 현재 사용자 — access-cookie를 dev-api로 forward. 401/403이면 그대로 전달(클라가 게스트 처리).
export async function GET(req: NextRequest) {
  const { status, body } = await forwardToPullim("/me", { method: "GET", cookie: req.headers.get("cookie") });
  return NextResponse.json(status === 200 ? (body ?? {}) : { authenticated: false }, { status: status === 200 ? 200 : 200 });
}
```
(주: /me는 미인증도 200+`{authenticated:false}`로 정규화 — 클라 `useAuth`가 단순 분기.)

- [ ] **Step 2: refresh** — `app/api/auth/refresh/route.ts`:
```ts
import { NextResponse, type NextRequest } from "next/server";
import { forwardToPullim, rewriteSetCookie, CSRF_HEADER } from "@/app/lib/server/pullim-auth";

export async function POST(req: NextRequest) {
  const { status, setCookies } = await forwardToPullim("/auth/refresh", {
    method: "POST", cookie: req.headers.get("cookie"), csrf: req.headers.get(CSRF_HEADER),
  });
  const res = NextResponse.json({ ok: status === 200 }, { status });
  for (const c of setCookies) res.headers.append("set-cookie", rewriteSetCookie(c));
  return res;
}
```

- [ ] **Step 3: logout** — `app/api/auth/logout/route.ts`:
```ts
import { NextResponse, type NextRequest } from "next/server";
import { forwardToPullim, rewriteSetCookie, CSRF_HEADER, COOKIE_AT, COOKIE_RT } from "@/app/lib/server/pullim-auth";

export async function POST(req: NextRequest) {
  const { setCookies } = await forwardToPullim("/auth/logout", {
    method: "POST", cookie: req.headers.get("cookie"), csrf: req.headers.get(CSRF_HEADER),
  });
  const res = NextResponse.json({ ok: true }, { status: 200 });
  // dev-api가 만료 쿠키를 보내면 relay, 아니면 우리 쪽에서도 즉시 만료.
  for (const c of setCookies) res.headers.append("set-cookie", rewriteSetCookie(c));
  res.headers.append("set-cookie", `${COOKIE_AT}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
  res.headers.append("set-cookie", `${COOKIE_RT}=; Path=/api/auth; Max-Age=0; HttpOnly; Secure; SameSite=Lax`);
  return res;
}
```

- [ ] **Step 4: 검증 + Commit** — typecheck·build 그린.
```bash
git add app/api/auth/me/route.ts app/api/auth/refresh/route.ts app/api/auth/logout/route.ts
git commit -m "$(printf 'feat(auth): /api/auth me·refresh·logout 프록시\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 5: dev seed 라우트 (prod 404)

**Files:** Create `app/api/auth/dev/seed/route.ts`
**Consumes:** `forwardToPullim` (T1).

- [ ] **Step 1: 구현** — `app/api/auth/dev/seed/route.ts`:
```ts
import { NextResponse, type NextRequest } from "next/server";
import { forwardToPullim } from "@/app/lib/server/pullim-auth";

// dev 전용 테스트 회원 시드(KCB 우회). prod는 라우트 자체를 404로 미노출(dev-api 동형).
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") return new NextResponse("Not Found", { status: 404 });
  let body: { email?: unknown; password?: unknown };
  try { body = await req.json(); } catch { return NextResponse.json({ message: "형식 오류" }, { status: 400 }); }
  const { status, body: out } = await forwardToPullim("/auth/dev/seed-member", {
    method: "POST", jsonBody: { email: body.email, password: body.password },
  });
  return NextResponse.json(out ?? {}, { status });
}
```

- [ ] **Step 2: 검증 + Commit** — typecheck·build 그린.
```bash
git add app/api/auth/dev/seed/route.ts
git commit -m "$(printf 'feat(auth): /api/auth/dev/seed 프록시(prod 404)\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 6: useAuth 컨텍스트

**Files:** Create `app/lib/use-auth.tsx`, `scripts/components/useAuth.test.tsx`
**Produces:** `AuthProvider`, `useAuth(): { user, status, login, logout, refreshMe }`. `status: "loading"|"authed"|"guest"`. `user: { email?, displayName?, name? } | null`.

- [ ] **Step 1: 컴포넌트 테스트(RED)** — `scripts/components/useAuth.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { AuthProvider, useAuth } from "@/app/lib/use-auth";

function Probe() { const { status, user } = useAuth(); return <div>{status}:{user?.displayName ?? "-"}</div>; }
beforeEach(() => { globalThis.fetch = vi.fn(); });

it("me 200(authenticated) → authed + displayName", async () => {
  (globalThis.fetch as any).mockResolvedValue({ ok: true, json: async () => ({ authenticated: true, displayName: "민수" }) });
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(screen.getByText(/authed:민수/)).toBeInTheDocument());
});
it("me authenticated=false → guest", async () => {
  (globalThis.fetch as any).mockResolvedValue({ ok: true, json: async () => ({ authenticated: false }) });
  render(<AuthProvider><Probe /></AuthProvider>);
  await waitFor(() => expect(screen.getByText(/guest:-/)).toBeInTheDocument());
});
```

- [ ] **Step 2: 실패 확인** — `npx vitest run scripts/components/useAuth.test.tsx` → FAIL.

- [ ] **Step 3: 구현** — `app/lib/use-auth.tsx`:
```tsx
"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type User = { email?: string; displayName?: string; name?: string };
type Status = "loading" | "authed" | "guest";
type AuthCtx = { user: User | null; status: Status; login: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>; logout: () => Promise<void>; refreshMe: () => Promise<void> };

const Ctx = createContext<AuthCtx | null>(null);

async function csrfToken(): Promise<string | undefined> {
  try { const r = await fetch("/api/auth/csrf"); const j = await r.json(); return j?.csrfToken ?? j?.token; } catch { return undefined; }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  const refreshMe = useCallback(async () => {
    try {
      const r = await fetch("/api/auth/me");
      const j = await r.json();
      if (j && j.authenticated !== false && (j.email || j.displayName)) { setUser(j); setStatus("authed"); }
      else { setUser(null); setStatus("guest"); }
    } catch { setUser(null); setStatus("guest"); }
  }, []);

  useEffect(() => { void refreshMe(); }, [refreshMe]);

  const login = useCallback(async (email: string, password: string) => {
    const token = await csrfToken();
    const r = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json", ...(token ? { "x-csrf-token": token } : {}) },
      body: JSON.stringify({ email, password }),
    });
    if (r.ok) { await refreshMe(); return { ok: true }; }
    const j = await r.json().catch(() => ({}));
    return { ok: false, message: j?.message ?? "로그인에 실패했어요." };
  }, [refreshMe]);

  const logout = useCallback(async () => {
    const token = await csrfToken();
    await fetch("/api/auth/logout", { method: "POST", headers: token ? { "x-csrf-token": token } : {} });
    setUser(null); setStatus("guest");
  }, []);

  return <Ctx.Provider value={{ user, status, login, logout, refreshMe }}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
}
```

- [ ] **Step 4: 통과** — vitest PASS.

- [ ] **Step 5: Commit**
```bash
git add app/lib/use-auth.tsx scripts/components/useAuth.test.tsx
git commit -m "$(printf 'feat(auth): useAuth 컨텍스트 — /api/auth/me 기반 세션 상태\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 7: /login 페이지 + 셸 인증 위젯

**Files:** Create `app/login/page.tsx`, `scripts/components/LoginPage.test.tsx`; Modify `app/components/app-shell.tsx`
**Consumes:** `useAuth` (T6). AppShell은 `AuthProvider`로 감싸고 헤더 `actions`에 위젯.

- [ ] **Step 1: 로그인 폼 테스트(RED)** — `scripts/components/LoginPage.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import LoginPage from "@/app/login/page";
import { AuthProvider } from "@/app/lib/use-auth";

it("제출 시 /api/auth/login 호출, 실패 메시지 노출", async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce({ json: async () => ({ token: "t" }) })            // csrf
    .mockResolvedValueOnce({ ok: false, json: async () => ({ message: "이메일 또는 비밀번호가 일치하지 않아요." }) }); // login
  globalThis.fetch = fetchMock as any;
  render(<AuthProvider><LoginPage /></AuthProvider>);
  fireEvent.change(screen.getByLabelText(/이메일/), { target: { value: "a@b.com" } });
  fireEvent.change(screen.getByLabelText(/비밀번호/), { target: { value: "pw" } });
  await act(async () => { fireEvent.click(screen.getByRole("button", { name: /로그인/ })); });
  await waitFor(() => expect(screen.getByText(/일치하지 않아요/)).toBeInTheDocument());
});
```
(주: AuthProvider 마운트 시 `/api/auth/me` fetch가 먼저 일어나므로, 테스트에서 fetchMock 기본 반환을 `{json: async()=>({authenticated:false})}`로 두고 위 mockResolvedValueOnce 순서를 me→csrf→login에 맞춰 조정한다.)

- [ ] **Step 2: 실패 확인** → FAIL.

- [ ] **Step 3: 로그인 페이지** — `app/login/page.tsx`:
```tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/use-auth";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    const r = await login(email, password);
    setBusy(false);
    if (r.ok) router.push("/");
    else setError(r.message ?? "로그인에 실패했어요.");
  };

  return (
    <main className="mx-auto w-full max-w-sm px-4 py-12">
      <h1 className="text-foreground mb-6 text-2xl font-bold">로그인</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-sm">
          <span className="text-foreground mb-1 block font-medium">이메일</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            className="border-border w-full rounded-lg border px-3 py-2.5 text-sm" autoComplete="email" />
        </label>
        <label className="block text-sm">
          <span className="text-foreground mb-1 block font-medium">비밀번호</span>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
            className="border-border w-full rounded-lg border px-3 py-2.5 text-sm" autoComplete="current-password" />
        </label>
        {error ? <p role="alert" className="text-sm text-[var(--color-danger,#dc2626)]">{error}</p> : null}
        <button type="submit" disabled={busy}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {busy ? "로그인 중…" : "로그인"}
        </button>
      </form>
    </main>
  );
}
```

- [ ] **Step 4: 통과** → vitest PASS.

- [ ] **Step 5: AppShell에 AuthProvider + 헤더 위젯** — `app/components/app-shell.tsx`: `useAuth`를 쓰는 작은 `AuthActions` 컴포넌트(미로그인 → `/login` 링크, authed → `displayName` + 로그아웃 버튼)를 만들고, 전체를 `<AuthProvider>`로 감싸 `actions={<AuthActions/>}` 전달. (DashboardShell이 `actions`를 헤더에 렌더 — components/ui/dashboard-shell.tsx:94.)
```tsx
// app-shell.tsx 내부에 추가
import { AuthProvider, useAuth } from "@/app/lib/use-auth";
function AuthActions() {
  const { status, user, logout } = useAuth();
  if (status !== "authed") return <Link href="/login" className="text-sm font-semibold text-[var(--color-action-primary)]">로그인</Link>;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-[var(--text-secondary)]">{user?.displayName ?? user?.email}</span>
      <button type="button" onClick={() => void logout()} className="text-[var(--text-tertiary)] hover:underline">로그아웃</button>
    </div>
  );
}
// AppShell return을 <AuthProvider>로 감싸고 DashboardShell에 actions={<AuthActions/>} 추가.
```

- [ ] **Step 6: 검증 + Commit** — `npm run test:components`·`typecheck`·`build` 그린.
```bash
git add app/login/page.tsx scripts/components/LoginPage.test.tsx app/components/app-shell.tsx
git commit -m "$(printf 'feat(auth): /login 페이지 + 셸 헤더 인증 위젯(AuthProvider)\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 8: 라이브 e2e 검증 + 최종 확인

- [ ] **Step 1: 최종 자동 검증** — `npm run typecheck` 클린 · `npm run test:all` 그린 · `npm run build` PASS.
- [ ] **Step 2: 라이브 로그인 검증(수동, 로컬 dev)** — `PULLIM_API_URL=https://dev-api.pullim.ai npm run dev` 후:
  1) `curl -s -X POST localhost:3000/api/auth/dev/seed -H 'content-type: application/json' -d '{"email":"coach-e2e@pullim.test","password":"Test1234!"}'` → 200/409.
  2) 브라우저 `/login` → 그 자격증명으로 로그인 → 홈 이동 → 헤더에 사용자명 표시 → **새로고침해도 유지**(쿠키 세션) → 로그아웃 → 미로그인 UI.
  3) 잘못된 비번 → "일치하지 않아요" 에러, 토큰 미노출(DevTools Application 쿠키가 HttpOnly).
- [ ] **Step 3: 계약 상수 확정** — T1에서 미상이던 CSRF 헤더/Origin/쿠키 속성을 라이브 결과로 `pullim-auth.ts`에 확정 반영(필요 시 수정 + 재검증). 기존 데모 게이트·코치 API 무수정 확인.

---

## Self-Review
**Spec coverage:** BFF 라우트(csrf/login/me/refresh/logout/dev-seed)=T2~T5 · 쿠키 relay=T1 `rewriteSetCookie` · useAuth=T6 · /login·셸위젯=T7 · 보안(httpOnly·미로깅·prod404)=T1/T5/T8 · 수용기준=T8 라이브 검증. 데모 게이트 무수정=Global Constraints.
**Placeholder scan:** 모든 코드 단계 완전. "T1 실측으로 확정"은 라이브 계약 검증(플레이스홀더 아님, 실행 단계 명시).
**Type consistency:** `forwardToPullim→{status,body,setCookies}`·`rewriteSetCookie(string)→string`·`CSRF_HEADER`·`COOKIE_AT/RT`가 T1→T2~T5 일관. `useAuth(): {user,status,login,logout,refreshMe}`가 T6→T7 일관. CSRF 토큰 키(`csrfToken`/`token`)·헤더(`x-csrf-token`)는 T1 실측으로 확정(useAuth·forwardToPullim 동일 헤더명 사용).
**위험:** dev-api CSRF 헤더명·Origin 허용값 미확정 → T1 라이브 실측 + T8 검증으로 닫음. 라이브 검증은 실 dev-api·테스트 회원 필요(수동) — CI는 mock 경계까지.
