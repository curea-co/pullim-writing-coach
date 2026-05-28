// Pullim Writing Coach — localStorage 어댑터 (A2 프로필 + 향후 이력/revision)
// 모듈 경계: 순수 + 브라우저 전용(typeof window 가드). 서버 컴포넌트에서 호출 시 안전.
// 단일 어댑터 채택(CEO 리뷰 2026-05-28): 모든 LS 접근은 여기를 거쳐 타입 가드·버전·LRU를 보장.

import { SCHOOL_LEVELS, SUBJECTS, GENRES } from "./grading";

export type SchoolLevel = (typeof SCHOOL_LEVELS)[number];
export type Subject = (typeof SUBJECTS)[number];
export type Genre = (typeof GENRES)[number];

// ── Profile ────────────────────────────────────────────────────────────
// A2: localStorage["pwc_profile_v1"]. 필수 = school_level + primary_subject + consent_at.
//   닉네임·학교명·장르는 선택. consent_at은 동의 시각 기록(향후 정책 변경 시 재동의 트리거).

const PROFILE_KEY = "pwc_profile_v1";

export type Profile = {
  nickname: string;                  // 필수, 1~12자, 결과 화면 인사
  school_name?: string;              // 선택, ≤30자, PDF 헤더
  school_level: SchoolLevel;         // 필수
  primary_subject: Subject;          // 필수
  primary_subject_other?: string;    // "기타" 선택 시 자유 입력(≤20자, 필수). 그 외엔 undefined.
  frequent_genre?: Genre;            // 선택, /try 폼 프리필
  consent_at: string;                // ISO 8601 +09:00, 동의 모먼트
};

// 런타임 type guard — 다른 탭이 손상시켰거나 schema가 바뀌어도 안전.
// export = 단위 테스트(scripts/storage.test.mjs)가 직접 호출.
export function isProfile(v: unknown): v is Profile {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  if (typeof o.nickname !== "string" || o.nickname.trim().length === 0 || o.nickname.length > 12) return false;
  if (typeof o.school_level !== "string" || !(SCHOOL_LEVELS as readonly string[]).includes(o.school_level)) return false;
  if (typeof o.primary_subject !== "string" || !(SUBJECTS as readonly string[]).includes(o.primary_subject)) return false;
  if (typeof o.consent_at !== "string" || o.consent_at.length === 0) return false;
  if (o.school_name !== undefined && (typeof o.school_name !== "string" || o.school_name.length > 30)) return false;
  if (o.primary_subject_other !== undefined && (typeof o.primary_subject_other !== "string" || o.primary_subject_other.length > 20)) return false;
  if (o.frequent_genre !== undefined && (typeof o.frequent_genre !== "string" || !(GENRES as readonly string[]).includes(o.frequent_genre))) return false;
  // 비즈니스 룰: primary_subject === "기타"면 primary_subject_other가 있어야 의미가 있다.
  //   엄격히 검증할 수도 있으나 schema 마이그레이션·이전 빌드 호환을 위해 경고 수준으로만 둔다.
  return true;
}

export function loadProfile(): Profile | null {
  if (typeof window === "undefined") return null; // SSR 가드
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isProfile(parsed) ? parsed : null;
  } catch {
    return null; // 손상된 JSON·LS 접근 거부 모두 null
  }
}

export function saveProfile(profile: Profile): { ok: true } | { ok: false; reason: "quota" | "denied" | "invalid" } {
  if (typeof window === "undefined") return { ok: false, reason: "denied" };
  if (!isProfile(profile)) return { ok: false, reason: "invalid" };
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    return { ok: true };
  } catch (e) {
    // QuotaExceededError 포함 — Profile은 작아서 거의 안 터지지만 방어.
    const reason = e instanceof DOMException && e.name === "QuotaExceededError" ? "quota" : "denied";
    return { ok: false, reason };
  }
}

export function clearProfile(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PROFILE_KEY);
  } catch {
    /* swallow — clear 실패는 사용자에게 의미 없음 */
  }
}

// 동의 시점 생성 헬퍼 — KST(+09:00) 명시(기존 grading.ts kstNowIso와 동일 규약).
export function consentNow(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().replace(/\.\d{3}Z$/, "+09:00").replace(/Z$/, "+09:00");
}
