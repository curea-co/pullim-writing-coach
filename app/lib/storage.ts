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

// ── Revisions (#1 수정 전/후 비교) ─────────────────────────────────────
// localStorage["pwc_revisions_v1"] = RevisionThread[].
//   한 thread = "같은 글의 고쳐쓰기 묶음". revisions[0]이 v1(초안), 끝이 최신.
//   LRU 정책(CEO 리뷰 2026-05-28):
//   · thread당 4번째 추가 시 가장 오래된 1건 drop ("오래된 이력 1건 정리했어요")
//   · 전체 storage quota 초과 시 가장 오래된 thread 통째 drop, 재시도 1회.

import type { Assignment, F3Output } from "../data/scoring";

const REVISIONS_KEY = "pwc_revisions_v1";
export const MAX_REVISIONS_PER_THREAD = 3;

export type RevisionEntry = {
  id: string;                                        // crypto.randomUUID()
  version: number;                                   // 1, 2, 3 (thread 내 순번)
  created_at: string;                                // ISO 8601 +09:00
  assignment: Assignment;
  submission: { body: string; char_count: number };
  output: F3Output;
};

export type RevisionThread = {
  thread_id: string;                                 // crypto.randomUUID()
  revisions: RevisionEntry[];                        // [oldest, ..., newest], length ≤ MAX_REVISIONS_PER_THREAD
};

function isRevisionEntry(v: unknown): v is RevisionEntry {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.version !== "number") return false;
  if (typeof o.created_at !== "string") return false;
  if (typeof o.assignment !== "object" || typeof o.submission !== "object") return false;
  if (typeof o.output !== "object") return false;
  return true;
}

function isRevisionThread(v: unknown): v is RevisionThread {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  if (typeof o.thread_id !== "string") return false;
  if (!Array.isArray(o.revisions) || o.revisions.some((r) => !isRevisionEntry(r))) return false;
  return true;
}

export function loadRevisions(): RevisionThread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(REVISIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isRevisionThread);
  } catch {
    return [];
  }
}

function writeRevisions(threads: RevisionThread[]): { ok: true } | { ok: false; reason: "quota" | "denied" } {
  if (typeof window === "undefined") return { ok: false, reason: "denied" };
  try {
    window.localStorage.setItem(REVISIONS_KEY, JSON.stringify(threads));
    return { ok: true };
  } catch (e) {
    const reason = e instanceof DOMException && e.name === "QuotaExceededError" ? "quota" : "denied";
    return { ok: false, reason };
  }
}

export type AddRevisionResult =
  | { ok: true; thread_id: string; dropped_oldest_in_thread: boolean; dropped_oldest_thread: boolean }
  | { ok: false; reason: "denied" };

// thread_id 있으면 해당 thread에 append, 없으면 새 thread 생성.
// 새 entry의 version은 thread 안에서 자동(직전 max+1, 첫 추가는 1).
// quota 초과 시 가장 오래된 thread 통째 drop + 재시도 1회. 또 실패하면 denied.
export function addRevision(
  threadId: string | null,
  partial: Omit<RevisionEntry, "id" | "version" | "created_at">,
): AddRevisionResult {
  const threads = loadRevisions();
  let droppedInThread = false;
  let targetIdx = threadId ? threads.findIndex((t) => t.thread_id === threadId) : -1;

  // 새 thread 생성
  if (targetIdx === -1) {
    const newThread: RevisionThread = {
      thread_id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `thr_${Date.now()}`,
      revisions: [],
    };
    threads.push(newThread);
    targetIdx = threads.length - 1;
  }

  const thread = threads[targetIdx];
  const nextVersion = thread.revisions.length > 0
    ? Math.max(...thread.revisions.map((r) => r.version)) + 1
    : 1;
  const newEntry: RevisionEntry = {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `rev_${Date.now()}_${nextVersion}`,
    version: nextVersion,
    created_at: consentNow(),
    ...partial,
  };
  thread.revisions.push(newEntry);

  // thread 내 LRU
  if (thread.revisions.length > MAX_REVISIONS_PER_THREAD) {
    thread.revisions.shift();
    droppedInThread = true;
  }

  // 1차 write
  let result = writeRevisions(threads);
  let droppedThread = false;

  // quota 초과 → 가장 오래된 thread(현재 target 아닌 것 중) drop 후 재시도
  if (!result.ok && result.reason === "quota") {
    const candidate = threads.findIndex((_, i) => i !== targetIdx);
    if (candidate !== -1) {
      threads.splice(candidate, 1);
      droppedThread = true;
      // targetIdx가 candidate 뒤에 있었으면 인덱스 보정 — 여기선 thread_id로 다시 찾음
      result = writeRevisions(threads);
    }
  }

  if (!result.ok) return { ok: false, reason: "denied" };
  return {
    ok: true,
    thread_id: thread.thread_id,
    dropped_oldest_in_thread: droppedInThread,
    dropped_oldest_thread: droppedThread,
  };
}

export function getThread(threadId: string): RevisionThread | null {
  const threads = loadRevisions();
  return threads.find((t) => t.thread_id === threadId) ?? null;
}

export function clearAllRevisions(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(REVISIONS_KEY);
  } catch {
    /* swallow */
  }
}

// ── Draft (#9 본문 자동 저장) ─────────────────────────────────────────
// localStorage["pwc_draft_v1"] = DraftSnapshot.
//   /try 입력 화면에서 body·과제정보를 debounce(800ms)로 자동 저장.
//   복원은 명시적 "이어 쓰기/새로 시작" 배너로 — 공용 기기에서 타인 글 노출 방지.
//   제출 성공 시 clearDraft 호출(데이터 보존이 끝남).
//
//   단일 draft 정책: 한 번에 하나만 보관(샘플 폼은 본문 1개 입력 슬롯이라).
//   thread별 다중 draft가 필요해지면 키를 v2로 마이그레이션해 분리.

const DRAFT_KEY = "pwc_draft_v1";

export type DraftSnapshot = {
  body: string;                    // 학생 글 원본 (정규화 전)
  // 타입은 string으로 두되 isDraftSnapshot이 enum 멤버십을 검증 — Codex 리뷰 2026-05-29.
  //   타입 narrow를 안 하는 이유: ScoreForm의 schoolLevel은 useState<string>("")로
  //   select onChange에서 enum 값이 들어오는 구조라, 호출자 캐스팅 부담을 안 만들기 위함.
  //   안전성은 loadDraft가 invalid draft를 null로 반환해 보장.
  school_level?: string;
  subject?: string;
  genre?: string;
  target_raw?: string;             // 빈 문자열 = 제한 없음 (자유 입력이라 enum 아님)
  prompt_text?: string;
  saved_at: string;                // ISO 8601 +09:00
};

export function isDraftSnapshot(v: unknown): v is DraftSnapshot {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  if (typeof o.body !== "string") return false;
  if (typeof o.saved_at !== "string" || o.saved_at.length === 0) return false;
  // enum 필드 — 손상된 LS가 select에 없는 값을 통과시키면 ScoreForm의 requiredOk가
  // 가짜 truthy가 되어 잘못된 payload 전송 위험(Codex 리뷰 2026-05-29). isProfile과 동일 패턴.
  if (
    o.school_level !== undefined &&
    (typeof o.school_level !== "string" || !(SCHOOL_LEVELS as readonly string[]).includes(o.school_level))
  ) return false;
  if (
    o.subject !== undefined &&
    (typeof o.subject !== "string" || !(SUBJECTS as readonly string[]).includes(o.subject))
  ) return false;
  if (
    o.genre !== undefined &&
    (typeof o.genre !== "string" || !(GENRES as readonly string[]).includes(o.genre))
  ) return false;
  // 자유 입력 필드 — string 또는 undefined만.
  for (const k of ["target_raw", "prompt_text"] as const) {
    if (o[k] !== undefined && typeof o[k] !== "string") return false;
  }
  return true;
}

export function loadDraft(): DraftSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isDraftSnapshot(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveDraft(
  snapshot: Omit<DraftSnapshot, "saved_at">,
): { ok: true; saved_at: string } | { ok: false; reason: "quota" | "denied" | "invalid" } {
  if (typeof window === "undefined") return { ok: false, reason: "denied" };
  const saved_at = consentNow();
  const full: DraftSnapshot = { ...snapshot, saved_at };
  if (!isDraftSnapshot(full)) return { ok: false, reason: "invalid" };
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(full));
    return { ok: true, saved_at };
  } catch (e) {
    const reason = e instanceof DOMException && e.name === "QuotaExceededError" ? "quota" : "denied";
    return { ok: false, reason };
  }
}

export function clearDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* swallow */
  }
}

// ── Results (채점 결과 조회) ──────────────────────────────────────────
// localStorage["pwc_results_v1"] = ResultEntry[].
//   /try 채점 성공 시 자동 저장 → /results 페이지에서 목록·상세 조회.
//   LRU 정책: 최대 20건 보관, 초과 시 가장 오래된 1건 drop. quota 초과 시 추가 1건 drop 후 재시도.
//   Revisions와 별개 — Revisions는 "같은 글의 고쳐쓰기 묶음", Results는 "독립된 채점 이력".

const RESULTS_KEY = "pwc_results_v1";
export const MAX_RESULTS = 20;

export type ResultEntry = {
  id: string;                                          // crypto.randomUUID()
  created_at: string;                                  // ISO 8601 +09:00
  assignment: Assignment;
  submission: { body: string; char_count: number };
  output: F3Output;
};

function isResultEntry(v: unknown): v is ResultEntry {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  if (typeof o.id !== "string" || o.id.length === 0) return false;
  if (typeof o.created_at !== "string" || o.created_at.length === 0) return false;
  if (typeof o.assignment !== "object" || o.assignment === null) return false;
  if (typeof o.submission !== "object" || o.submission === null) return false;
  if (typeof o.output !== "object" || o.output === null) return false;
  return true;
}

export function loadResults(): ResultEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RESULTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isResultEntry);
  } catch {
    return [];
  }
}

export function getResult(id: string): ResultEntry | null {
  const all = loadResults();
  return all.find((r) => r.id === id) ?? null;
}

function writeResults(results: ResultEntry[]): { ok: true } | { ok: false; reason: "quota" | "denied" } {
  if (typeof window === "undefined") return { ok: false, reason: "denied" };
  try {
    window.localStorage.setItem(RESULTS_KEY, JSON.stringify(results));
    return { ok: true };
  } catch (e) {
    const reason = e instanceof DOMException && e.name === "QuotaExceededError" ? "quota" : "denied";
    return { ok: false, reason };
  }
}

export type AddResultResult =
  | { ok: true; id: string; dropped_oldest: boolean }
  | { ok: false; reason: "denied" };

// 신규 채점 결과 저장. 목록 끝에 추가(시간순 append) — 조회 시 역순 정렬.
//   MAX_RESULTS 초과 시 가장 오래된 1건 shift. quota 시 1건 더 drop 후 재시도.
export function addResult(
  partial: Omit<ResultEntry, "id" | "created_at">,
): AddResultResult {
  const results = loadResults();
  let droppedOldest = false;
  const newEntry: ResultEntry = {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `res_${Date.now()}`,
    created_at: consentNow(),
    ...partial,
  };
  results.push(newEntry);

  // 전역 LRU
  if (results.length > MAX_RESULTS) {
    results.shift();
    droppedOldest = true;
  }

  let r = writeResults(results);
  // quota → 추가 1건 drop 후 재시도
  if (!r.ok && r.reason === "quota" && results.length > 1) {
    results.shift();
    droppedOldest = true;
    r = writeResults(results);
  }

  if (!r.ok) return { ok: false, reason: "denied" };
  return { ok: true, id: newEntry.id, dropped_oldest: droppedOldest };
}

export function clearAllResults(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(RESULTS_KEY);
  } catch {
    /* swallow */
  }
}

// #M3 ④ — 개별 결과 삭제. 존재하지 않는 id는 silent no-op.
//   타 결과 영향 0. 저장 실패는 호출자에게 알리지 않음(다음 load 시 반영되므로).
export function removeResult(id: string): { ok: boolean; removed: boolean } {
  if (typeof window === "undefined") return { ok: false, removed: false };
  const list = loadResults();
  const idx = list.findIndex((r) => r.id === id);
  if (idx === -1) return { ok: true, removed: false };
  list.splice(idx, 1);
  try {
    window.localStorage.setItem(RESULTS_KEY, JSON.stringify(list));
    return { ok: true, removed: true };
  } catch {
    return { ok: false, removed: false };
  }
}

// ── #M3 ③ Meta usage LRU — 자주 쓴 장르·목표 분량 학습 ────────────────
// localStorage["pwc_meta_usage_v1"] = MetaUsage.
//   채점 성공 시 recordMetaUsage 호출 → 필드별 LRU 5건 유지(count + last_used_at).
//   Step 2 prefill 우선순위: profile(주어진 defaults) > LRU 최빈값 > 빈 문자열.
//   target_raw는 프로필에 없으니 LRU만 사용 — 학생 자주 쓰는 분량 자연 학습.

const META_USAGE_KEY = "pwc_meta_usage_v1";
export const MAX_META_USAGE_PER_FIELD = 5;

export type MetaField = "school_level" | "subject" | "genre" | "target_raw";

export type MetaUsageEntry = {
  value: string;
  count: number;        // 누적 사용 횟수
  last_used_at: string; // ISO 8601 +09:00
};

export type MetaUsage = Record<MetaField, MetaUsageEntry[]>;

function emptyMetaUsage(): MetaUsage {
  return { school_level: [], subject: [], genre: [], target_raw: [] };
}

function isMetaUsageEntry(v: unknown): v is MetaUsageEntry {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.value === "string" &&
    typeof o.count === "number" &&
    typeof o.last_used_at === "string"
  );
}

function isMetaUsage(v: unknown): v is MetaUsage {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  const fields: MetaField[] = ["school_level", "subject", "genre", "target_raw"];
  return fields.every(
    (f) => Array.isArray(o[f]) && (o[f] as unknown[]).every(isMetaUsageEntry),
  );
}

export function loadMetaUsage(): MetaUsage {
  if (typeof window === "undefined") return emptyMetaUsage();
  try {
    const raw = window.localStorage.getItem(META_USAGE_KEY);
    if (!raw) return emptyMetaUsage();
    const parsed = JSON.parse(raw);
    return isMetaUsage(parsed) ? parsed : emptyMetaUsage();
  } catch {
    return emptyMetaUsage();
  }
}

// 단일 필드 사용 기록. 같은 value 있으면 count + 1 + last_used_at 갱신, 없으면 신규 추가.
// 필드별 LRU 5건 — 6번째 신규 추가 시 last_used_at 가장 오래된 항목 drop.
export function recordMetaUsage(field: MetaField, value: string): void {
  if (typeof window === "undefined") return;
  const trimmed = value.trim();
  if (!trimmed) return; // 빈 값은 기록 안 함
  const usage = loadMetaUsage();
  const list = usage[field];
  const now = consentNow();
  const existing = list.find((e) => e.value === trimmed);
  if (existing) {
    existing.count += 1;
    existing.last_used_at = now;
  } else {
    list.push({ value: trimmed, count: 1, last_used_at: now });
    // 6번째 신규 추가 시 가장 오래된 항목 drop(last_used_at 기준).
    if (list.length > MAX_META_USAGE_PER_FIELD) {
      list.sort((a, b) => a.last_used_at.localeCompare(b.last_used_at));
      list.shift(); // 가장 오래된 1건 drop
    }
  }
  try {
    window.localStorage.setItem(META_USAGE_KEY, JSON.stringify(usage));
  } catch {
    /* swallow — quota는 거의 안 터짐(JSON 작음) */
  }
}

// 최빈값 — count 우선, 동률은 last_used_at(최신 우선). 없으면 null.
export function getMostUsedMeta(field: MetaField): string | null {
  const list = loadMetaUsage()[field];
  if (list.length === 0) return null;
  // count desc, last_used_at desc
  const sorted = [...list].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return b.last_used_at.localeCompare(a.last_used_at);
  });
  return sorted[0].value;
}

export function clearMetaUsage(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(META_USAGE_KEY);
  } catch {
    /* swallow */
  }
}
