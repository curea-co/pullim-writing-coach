// Pullim Writing Coach — 무료 1일 사용 한도 게이트 (server 전용 부수효과층. 순수 로직은 quota-core.ts).
//   /api/score·/api/coach 진입 시: 데모 스킵 → 유료(writing≥2) 스킵 → 무료면 오늘 카운트 검사(초과 429
//   E-CAP) → 성공 응답 직전 소비(+1). 에러 응답은 소비하지 않음(실패 재시도가 하루치를 태우지 않게).
//
//   fail-open 원칙: 티어 조회·KV 읽기/쓰기 실패는 **허용 + 로그** — 쿼터 인프라 장애가 전 사용자 채점
//   불능(fail-closed)으로 번지지 않게 한다. 비용 리스크는 1일 1회 초과 허용 수준. 단 티어 조회 실패는
//   "무료(1)" 취급 — 장애가 무제한 개방으로 이어지지 않게(quotaGate에서 무료 한도는 그대로 적용).
//   동의 미GRANTED 미성년은 KV 쓰기가 403 → 소비 실패 fail-open(해당 세그먼트는 결과 저장도 불가).

import "server-only";
import { apiBase } from "./pullim-session";
import { getUserData, setUserData } from "./db";
import { type QuotaFeature, isQuotaExceeded, applyQuotaConsume, kstDateOf } from "@/app/lib/quota-core";

/** 비프로덕션 데모 경로(x-demo-token) — 쿼터 제외(로컬 데모·E2E 런북 보존, 2026-07-09 소유자 확정).
 *  토큰 유효성은 이미 [G1] verifyWritingAccess가 검증(무효 토큰+무세션은 여기 도달 전 401). */
export function demoQuotaSkip(req: Request): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return !!req.headers.get("x-demo-token");
}

/** 회원 writing 레벨 — GET /me/entitlements(쿠키 relay)의 flags.writing. 실패/부재 = 1(무료) 취급. */
async function getWritingLevel(req: Request): Promise<number> {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return 1;
  try {
    const res = await fetch(`${apiBase()}/me/entitlements`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
      redirect: "manual", // 302 추종 인가 우회 방지(pullim-session 동형)
    });
    if (!res.ok) return 1;
    const body = (await res.json()) as { flags?: Record<string, unknown> } | null;
    const w = body?.flags?.writing;
    return typeof w === "number" && Number.isFinite(w) ? w : 1;
  } catch {
    return 1;
  }
}

export type QuotaGate =
  | { allowed: true; consume: false } // 유료·데모·인프라 실패 — 소비 불필요/불가
  | { allowed: true; consume: true; raw: unknown } // 무료 통과 — 성공 시 consumeQuota로 +1
  | { allowed: false }; // 오늘 한도 소진 → 429 E-CAP

/** 라우트 진입 게이트 — [G1] 인가 통과 후 호출. */
export async function quotaGate(req: Request, feature: QuotaFeature): Promise<QuotaGate> {
  if (demoQuotaSkip(req)) return { allowed: true, consume: false };
  const level = await getWritingLevel(req);
  if (level >= 2) return { allowed: true, consume: false }; // 유료 — 횟수 무제한
  let raw: unknown;
  try {
    raw = await getUserData(req, "meta_usage");
  } catch (e) {
    // KV 읽기 실패 — fail-open(집계 불가, 허용). 로그는 상태만(자격증명·본문 금지).
    console.warn(`[quota] ${feature} 읽기 실패 — fail-open: ${e instanceof Error ? e.name : "?"}`);
    return { allowed: true, consume: false };
  }
  if (isQuotaExceeded(raw, feature, kstDateOf(new Date()))) return { allowed: false };
  return { allowed: true, consume: true, raw };
}

/** 성공 응답 직전 1회 소비 — 실패는 fail-open(로그만). gate에서 받은 raw를 머지 기반으로 사용. */
export async function consumeQuota(req: Request, feature: QuotaFeature, raw: unknown): Promise<void> {
  try {
    await setUserData(req, "meta_usage", applyQuotaConsume(raw, feature, kstDateOf(new Date())));
  } catch (e) {
    console.warn(`[quota] ${feature} 소비 기록 실패 — fail-open: ${e instanceof Error ? e.name : "?"}`);
  }
}
