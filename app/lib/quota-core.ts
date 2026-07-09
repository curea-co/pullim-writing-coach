// Pullim Writing Coach — 무료 1일 사용 한도(쿼터) 순수 코어 (QA WRITING-ACCESS-002, 2026-07-09 정책).
//   정책: 무료(writing:1) 회원은 직접 채점(score)·과정 코치(coach) 각 1명 1일 1회. 조회(/results)·
//   샘플(/samples)은 무제한. 유료(writing:2+)는 횟수 무제한. 초과 시 429 E-CAP.
//
//   저장소: pullim-api KV `meta_usage` payload 안의 예약 필드 `_quota`(서버 전용) 동거 —
//   KV 키가 화이트리스트(profile·results·revisions·drafts·meta_usage·consent)라 새 키를 못 만든다
//   (pullim-api 변경 없이 가려면 기존 키 안에 두는 수밖에 없음). storage.ts가 meta_usage를 통째로
//   재기록하므로 **미지 필드 보존**(recordMetaUsage*)이 전제 — 깨지면 쿼터가 조용히 리셋된다.
//   ⚠ 한계(수용): KV는 본인 세션으로 클라이언트도 PUT 가능 → 유저가 자기 카운터를 리셋할 수 있다.
//   학생 대상 LLM 비용 통제 목적의 소프트 강제 — 위조 불가 강제는 크레딧 정책(#297)에서 pullim-api로 이관.
//
//   모듈 경계: 순수(fetch·env·Date.now 미사용 — now는 인자). 부수효과는 server/quota.ts.

export type QuotaFeature = "score" | "coach";
// 무료 1일 한도(호출 단위). 정책 "1명 1일 1회"의 단위는 **세션**이라, 한 세션이 다회 호출인 과정 코치는
//   호출 예산으로 환산한다: 1세션 = 첫 [봐줘] + 수정 재점검 2회 = 3호출(CoachClient MAX_CHECKS=3 —
//   첫 점검 포함, Codex #143 정합). 소프트 카운터(표시)와 서버 예산이 같은 값이라 "남은 점검 0회"와
//   429가 동시에 온다(세션 중단 컷오프 없음 — 1일 1호출이면 [고쳤어] 재점검에서 코칭이 끊긴다).
//   직접 채점은 1호출 = 1회 그대로.
export const FREE_DAILY_LIMITS: Record<QuotaFeature, number> = { score: 1, coach: 3 };
/** meta_usage payload 안의 쿼터 예약 필드 — storage.ts 미지 필드 보존과 한 쌍(위 주석). */
export const QUOTA_FIELD = "_quota";

type QuotaEntry = { d: string; n: number };

/** KST(UTC+9) 기준 날짜 문자열(YYYY-MM-DD) — 롤오버 경계는 한국 자정. */
export function kstDateOf(now: Date): string {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

// 방어적 파싱 — 손상/타 구조는 0회 사용으로 취급(쿼터가 사용자를 잘못 잠그지 않게).
function entryOf(raw: unknown, feature: QuotaFeature): QuotaEntry | null {
  if (typeof raw !== "object" || raw === null) return null;
  const q = (raw as Record<string, unknown>)[QUOTA_FIELD];
  if (typeof q !== "object" || q === null) return null;
  const e = (q as Record<string, unknown>)[feature];
  if (typeof e !== "object" || e === null) return null;
  const { d, n } = e as Record<string, unknown>;
  if (typeof d !== "string" || typeof n !== "number" || !Number.isFinite(n)) return null;
  return { d, n };
}

/** 오늘(KST) 해당 기능 사용 횟수 — 다른 날짜 엔트리는 0(롤오버). */
export function usedToday(raw: unknown, feature: QuotaFeature, today: string): number {
  const e = entryOf(raw, feature);
  return e && e.d === today ? Math.max(0, Math.floor(e.n)) : 0;
}

/** 무료 한도 초과 여부. */
export function isQuotaExceeded(raw: unknown, feature: QuotaFeature, today: string): boolean {
  return usedToday(raw, feature, today) >= FREE_DAILY_LIMITS[feature];
}

/**
 * 클라이언트 meta_usage PUT에 **서버 권위 `_quota`를 강제**하는 머지(Codex #143 3R) —
 * BFF(/api/data/meta_usage PUT)가 쓰기 직전 서버 현재값의 `_quota`로 덮어써, 클라이언트의 stale
 * 스냅샷(동시 탭)이나 위조 payload가 카운터를 되돌리는 것을 막는다. 클라가 보낸 `_quota`는 항상 폐기.
 * - 서버에 `_quota` 없음: 클라 payload에서 `_quota`만 제거해 통과(null은 null 그대로 — 키 비우기 유지).
 * - 서버에 `_quota` 있음: 클라 payload(null이면 빈 객체)에 서버 `_quota`를 얹음 — 메타 초기화(/me)로도
 *   당일 카운터는 보존(쿼터 리셋 루프홀 차단).
 */
export function withServerQuota(clientPayload: unknown, serverRaw: unknown): unknown {
  const serverQ =
    typeof serverRaw === "object" && serverRaw !== null ? (serverRaw as Record<string, unknown>)[QUOTA_FIELD] : undefined;
  const isObj = typeof clientPayload === "object" && clientPayload !== null && !Array.isArray(clientPayload);
  const base: Record<string, unknown> = isObj ? { ...(clientPayload as Record<string, unknown>) } : {};
  delete base[QUOTA_FIELD]; // 클라 제공 _quota는 신뢰하지 않는다(서버 권위)
  if (serverQ === undefined) return isObj ? base : (clientPayload ?? null);
  return { ...base, [QUOTA_FIELD]: serverQ };
}

/**
 * 사용 1회 반영한 payload 반환 — **기존 필드(학습 LRU 등)와 타 기능 쿼터를 보존**하는 머지.
 * raw가 객체가 아니면(미존재·손상) 쿼터만 담은 새 객체.
 */
export function applyQuotaConsume(raw: unknown, feature: QuotaFeature, today: string): Record<string, unknown> {
  const base: Record<string, unknown> =
    typeof raw === "object" && raw !== null && !Array.isArray(raw) ? { ...(raw as Record<string, unknown>) } : {};
  const prevQ = typeof base[QUOTA_FIELD] === "object" && base[QUOTA_FIELD] !== null ? (base[QUOTA_FIELD] as Record<string, unknown>) : {};
  base[QUOTA_FIELD] = { ...prevQ, [feature]: { d: today, n: usedToday(raw, feature, today) + 1 } };
  return base;
}
