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

// pullim-api가 세션을 거부(401)했을 때 — 라우트에서 E-AUTH(401)로 매핑.
export class PullimDataAuthError extends Error {
  constructor() {
    super("pullim-api session rejected");
    this.name = "PullimDataAuthError";
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

// KV 표면 relay. 401 → PullimDataAuthError(라우트 E-AUTH), 그 외 비2xx → throw(라우트 E8).
//   redirect:manual — 302 추종으로 인한 인가 우회(false-positive) 방지(pullim-session과 동일).
//   ⚠ 404 도 throw — mutation 이 404 를 성공으로 삼키면 조용한 데이터 유실(로컬 종단 검증에서
//   표면 미배포 dev-api 에 PUT 이 {ok:true} 로 위장 성공한 실사고로 확정). GET 의 "미존재=404"
//   수용은 getUserData 가 catch 로 처리한다.
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
  if (res.status === 401) throw new PullimDataAuthError();
  if (!res.ok) throw new RelayStatusError(res.status); // 상태코드만 — 본문/자격증명 금지
  return res;
}

/** relay 비2xx 상태 — getUserData 의 404 특례 판별용(그 외엔 라우트 E8 낙하). */
export class RelayStatusError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`[db] relay ${status}`);
    this.name = "RelayStatusError";
    this.status = status;
  }
}

export async function getUserData(req: Request, key: DataKey): Promise<unknown | null> {
  let res: Response;
  try {
    res = await relay(req, "GET", `/${key}`);
  } catch (e) {
    // GET 한정 특례: 미존재 키를 404로 주는 표면 구현도 null 로 수용(계약 기본은 200+null).
    //   mutation 은 특례 없음 — 404 는 표면 부재/경로 오류이므로 실패로 전파(위 relay 주석).
    if (e instanceof RelayStatusError && e.status === 404) return null;
    throw e;
  }
  const body = (await res.json().catch(() => null)) as { payload?: unknown } | null;
  return body?.payload ?? null;
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
