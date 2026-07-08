// Pullim Writing Coach — per-user 데이터 CRUD (server 전용).
//   저장소 = pullim-api RDS `writing` 스키마. 접근 = pullim-api KV 표면(`/writing/data`)으로 HTTP relay.
//   (2026-07-07 전환: Supabase 직결 → pullim-api 표면. Vercel 유동 egress IP라 RDS 직결은
//    0.0.0.0/0 공개뿐이라 금지 — 접속 주체를 VPC 안(pullim-api)으로 옮긴 것. docs/plan §3-0 계약안.)
//   인증 = 세션 쿠키 relay(sub는 pullim-api가 토큰에서 판정 — 서버 간 이중 /me 조회 없음).
//   mutation CSRF = double-submit relay(브라우저가 보낸 csrf 쿠키값을 X-CSRF-Token 헤더로 재전송).
//   모듈 경계: 부수효과(env·fetch). 자격증명·쿠키값·payload 본문 로깅 금지.
import "server-only";
import { apiBase } from "./pullim-session";

export type DataKey = "profile" | "results" | "revisions" | "drafts" | "meta_usage" | "consent";
export const DATA_KEYS: readonly DataKey[] = ["profile", "results", "revisions", "drafts", "meta_usage", "consent"];

export function isDataKey(v: unknown): v is DataKey {
  return typeof v === "string" && (DATA_KEYS as readonly string[]).includes(v);
}

// csrf 쿠키 이름 — 환경별: prod=pullim-csrf · dev=dev-pullim-csrf · local=local-pullim-csrf.
//   (access 쿠키의 환경별 이름 사고(PR #127)와 동형 — 세 이름 모두 인식.)
const CSRF_COOKIES = ["pullim-csrf", "dev-pullim-csrf", "local-pullim-csrf"] as const;

// pullim-api가 인증/보안(세션·CSRF·엔타이틀먼트)을 거부(401·403)했을 때 — 라우트에서 E-AUTH(401)로 매핑.
//   401(세션 만료·무효)·403(CSRF 불일치·flags 미보유)은 모두 "재인증/재로그인" 계열이지 일시 장애(E8)가
//   아니다. use-auth.tsx도 401·403 둘 다 세션/CSRF 실패로 취급 — 여기서 403을 E8로 번역하면 그 계약이
//   끊겨 세션 만료가 "일시 오류"로 오분류된다(Codex #129).
export class PullimDataAuthError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`pullim-api auth rejected (${status})`);
    this.name = "PullimDataAuthError";
    this.status = status;
  }
}

// cookie 헤더에서 이름 목록 중 첫 일치 값 추출(없으면 null). 값은 relay 헤더에만 사용, 로깅 금지.
function cookieValue(cookieHeader: string | null, names: readonly string[]): string | null {
  if (!cookieHeader) return null;
  for (const pair of cookieHeader.split(";")) {
    const trimmed = pair.trim();
    for (const name of names) {
      if (trimmed.startsWith(`${name}=`)) return trimmed.slice(name.length + 1);
    }
  }
  return null;
}

// KV 표면 relay. 401·403 → PullimDataAuthError(라우트 E-AUTH), 그 외 비2xx(404 포함) → throw(라우트 E8).
//   redirect:manual — 302 추종으로 인한 인가 우회(false-positive) 방지(pullim-session과 동일).
//   ⚠ 404 도 throw(GET·mutation 공통) — 우리 표면은 미존재 키에 200 {payload:null} 을 주지 404 를 주지
//   않는다(services/writing/api.md §2). 따라서 404 = 표면 부재/오라우팅이며, null(빈 데이터)로 삼키면
//   기존 데이터가 있어도 화면이 조용히 빈 상태가 된다(storage.ts 의 "읽기 실패" vs "빈 데이터" 계약 붕괴,
//   PR #115). GET 도 404 를 E8 로 전파해 mutation 과 일관(Codex #129 2차).
async function relay(req: Request, method: "GET" | "PUT" | "DELETE", path: string, body?: unknown): Promise<Response> {
  const cookieHeader = req.headers.get("cookie");
  const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_WEB_URL ?? "";
  const headers: Record<string, string> = {
    ...(cookieHeader ? { cookie: cookieHeader } : {}),
    ...(origin ? { origin } : {}),
  };
  if (method !== "GET") {
    const csrf = cookieValue(cookieHeader, CSRF_COOKIES);
    if (csrf) headers["x-csrf-token"] = csrf;
  }
  if (body !== undefined) headers["content-type"] = "application/json";

  const res = await fetch(`${apiBase()}/writing/data${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
    redirect: "manual",
  });
  if (res.status === 401 || res.status === 403) throw new PullimDataAuthError(res.status);
  if (!res.ok) throw new RelayStatusError(res.status); // 상태코드만 — 본문/자격증명 금지
  return res;
}

/** relay 비2xx 상태(404 포함) — 라우트 mapRelayError 가 E8 로 낙하시킨다. */
export class RelayStatusError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`[db] relay ${status}`);
    this.name = "RelayStatusError";
    this.status = status;
  }
}

/** 2xx 이지만 본문이 계약(`{payload}`)을 어긴 경우 — 라우트 mapRelayError 가 E8 로 낙하시킨다.
 *  본문/자격증명은 담지 않는다(사유 문자열만). */
export class RelayBodyError extends Error {
  constructor(reason: string) {
    super(`[db] relay body: ${reason}`);
    this.name = "RelayBodyError";
  }
}

export async function getUserData(req: Request, key: DataKey): Promise<unknown | null> {
  // 미존재 키 = 200 {payload:null}(표면 계약). "빈 데이터"는 payload===null 로 오지, 404 가 아니다 —
  //   404 는 relay 가 throw → 라우트 E8(표면 부재/오라우팅을 빈 상태로 위장하지 않음).
  //   ⚠ 본문 파싱 실패·shape 불일치(payload 필드 부재)도 "읽기 실패"다 — null 로 삼키면 깨진 200 이
  //   "저장된 데이터 없음"으로 둔갑해 storage.ts 의 "읽기 실패" vs "빈 데이터" 계약이 relay 층에서
  //   다시 붕괴한다. 두 경우 모두 throw → 라우트 E8(Codex #129 3차).
  const res = await relay(req, "GET", `/${key}`);
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new RelayBodyError("본문 JSON 파싱 실패");
  }
  if (typeof body !== "object" || body === null || !("payload" in body)) {
    throw new RelayBodyError("payload 필드 부재(shape 불일치)");
  }
  return (body as { payload: unknown }).payload ?? null;
}

export async function setUserData(req: Request, key: DataKey, payload: unknown): Promise<void> {
  await relay(req, "PUT", `/${key}`, { payload: payload ?? null });
}

export async function deleteUserData(req: Request, key: DataKey): Promise<void> {
  await relay(req, "DELETE", `/${key}`);
}

export async function deleteAllUserData(req: Request): Promise<void> {
  await relay(req, "DELETE", "");
}
