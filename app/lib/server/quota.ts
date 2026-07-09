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

/** 회원 writing 레벨 — GET /me/entitlements(쿠키 relay)의 flags.writing.
 *  **null = 조회 실패**(비2xx·네트워크·shape 불일치) — 무료(1)와 구분한다(Codex #143):
 *  실패를 1로 뭉개면 일시 장애·shape 변경에 유료 회원이 무료 한도로 떨어져 잘못 429를 받는다.
 *  실패의 처리는 quotaGate가 fail-open(허용·미소비)으로 담당. 쿠키 부재만 확정 무료(게이트 [G1]
 *  통과가 데모 경로였다는 뜻 — 데모는 그 전에 스킵되므로 실질 도달 없음). */
async function getWritingLevel(req: Request): Promise<number | null> {
  const cookieHeader = req.headers.get("cookie");
  if (!cookieHeader) return 1;
  try {
    const res = await fetch(`${apiBase()}/me/entitlements`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
      redirect: "manual", // 302 추종 인가 우회 방지(pullim-session 동형)
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { flags?: Record<string, unknown> } | null;
    const w = body?.flags?.writing;
    return typeof w === "number" && Number.isFinite(w) ? w : null; // shape 불일치도 실패로
  } catch {
    return null;
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
  if (level === null) {
    // 티어 조회 실패 — fail-open(허용·미소비). 유료를 무료로 오분류해 429를 주는 쪽이 더 나쁘다(Codex #143).
    console.warn(`[quota] ${feature} 티어 조회 실패 — fail-open`);
    return { allowed: true, consume: false };
  }
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

/** 성공 응답 직전 1회 소비 — 실패는 fail-open(로그만).
 *  머지 기반은 **consume 시점 재조회**(Codex #143): gate 시점 raw를 그대로 쓰면 동시 요청 2건이 같은
 *  카운트에서 +1을 계산해 마지막 쓰기만 남는다(lost update). 재조회로 창을 LLM 호출 시간만큼 좁힌다 —
 *  완전한 원자 increment는 이 저장소(본인 세션으로 클라 PUT 가능한 소프트 강제 KV)의 본질적 한계로,
 *  크레딧 정책(#297)의 pullim-api 전용 카운터에서 해결. 재조회 실패 시 gate 시점 raw로 폴백. */
export async function consumeQuota(req: Request, feature: QuotaFeature, gateRaw: unknown): Promise<void> {
  try {
    let raw: unknown;
    try {
      raw = await getUserData(req, "meta_usage");
    } catch {
      raw = gateRaw;
    }
    await setUserData(req, "meta_usage", applyQuotaConsume(raw, feature, kstDateOf(new Date())));
  } catch (e) {
    console.warn(`[quota] ${feature} 소비 기록 실패 — fail-open: ${e instanceof Error ? e.name : "?"}`);
  }
}
