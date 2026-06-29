// Pullim Writing Coach — per-user 데이터 어댑터 (프로필·결과·revision·draft·meta·consent)
// 모듈 경계: 순수 + 브라우저/네트워크 가드. 서버 컴포넌트에서 호출 시 안전.
// 단일 어댑터 채택(CEO 리뷰 2026-05-28): 모든 데이터 접근은 여기를 거쳐 타입 가드·버전·LRU를 보장.
//
// ── 계정 store 비동기 전환(2026-06-30) ──────────────────────────────────
//   per-user 데이터를 계정 귀속 서버 저장(/api/data/*)으로 확장. accountMode(authed && !local)면
//   /api/data/{key}, 아니면 localStorage 폴백. 전 public 함수는 Promise 반환.
//   LRU·런타임 type guard·기본값은 어댑터 위에서 그대로 유지.

import { SCHOOL_LEVELS, SUBJECTS, GENRES } from "./grading";

export type SchoolLevel = (typeof SCHOOL_LEVELS)[number];
export type Subject = (typeof SUBJECTS)[number];
export type Genre = (typeof GENRES)[number];

// ── 계정 store 어댑터 (per-user 서버 저장) ────────────────────────────
//   accountMode(authed && !local)면 /api/data/{key}, 아니면 localStorage. (Global Constraints 4·10)
type DataKey = "profile" | "results" | "revisions" | "drafts" | "meta_usage" | "consent";
// consent는 기존 consent-store.ts의 'pwc-consent-v1' 키를 그대로 재사용(로컬 폴백 호환).
const CONSENT_KEY = "pwc-consent-v1";
const LS_KEY: Record<DataKey, string> = {
  profile: "pwc_profile_v1",
  results: "pwc_results_v1",
  revisions: "pwc_revisions_v1",
  drafts: "pwc_draft_v1",
  meta_usage: "pwc_meta_usage_v1",
  consent: CONSENT_KEY,
};

type AccountMode = { authed: boolean; local: boolean; onAuthExpired?: () => Promise<boolean> };
let accountMode: AccountMode = { authed: false, local: false };
export function setAccountMode(mode: AccountMode): void {
  accountMode = mode;
}
function useApi(): boolean {
  return accountMode.authed && !accountMode.local;
}

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
  const doPut = () =>
    fetch(`/api/data/${key}`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload: value }),
    });
  let res = await doPut();
  if (res.status === 401 && accountMode.onAuthExpired) {
    const ok = await accountMode.onAuthExpired();
    if (ok) res = await doPut();
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
  } catch {
    return null;
  }
}

async function writeKey(
  key: DataKey,
  value: unknown,
): Promise<{ ok: boolean; reason?: "quota" | "denied" | "auth" }> {
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

// 단일 키 비우기. account mode에서는 PUT(payload:null) — 그 키만 비움(전체 삭제는 /api/data DELETE).
//   로컬 모드는 localStorage.removeItem.
async function clearKey(key: DataKey): Promise<void> {
  if (useApi()) {
    await apiPut(key, null);
    return;
  }
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LS_KEY[key]);
  } catch {
    /* swallow */
  }
}

// ── Profile ────────────────────────────────────────────────────────────
// A2: profile 키. 필수 = school_level + primary_subject + consent_at.
//   닉네임·학교명·장르는 선택. consent_at은 동의 시각 기록(향후 정책 변경 시 재동의 트리거).

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

export async function loadProfile(): Promise<Profile | null> {
  const parsed = await readKey("profile");
  return isProfile(parsed) ? parsed : null;
}

export async function saveProfile(
  profile: Profile,
): Promise<{ ok: true } | { ok: false; reason: "quota" | "denied" | "invalid" | "auth" }> {
  if (!isProfile(profile)) return { ok: false, reason: "invalid" };
  // Codex PR #56 검토 — 새 프로필 생성 시 메타 자동 초기화는 "동일 사용자가 익명으로 사용
  //   하다 나중에 온보딩"하는 정상 경로의 학습 이력까지 지우는 회귀(특히 target_raw는 프로필
  //   에서 복구 불가). 자동 격리는 거짓양성 비용이 너무 큼 — /me 명시 삭제 동선으로 충분.
  const r = await writeKey("profile", profile);
  return r.ok ? { ok: true } : { ok: false, reason: r.reason ?? "denied" };
}

export async function clearProfile(): Promise<void> {
  await clearKey("profile");
}

// 동의 시점 생성 헬퍼 — KST(+09:00) 명시(기존 grading.ts kstNowIso와 동일 규약).
export function consentNow(): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().replace(/\.\d{3}Z$/, "+09:00").replace(/Z$/, "+09:00");
}

// ── Revisions (#1 수정 전/후 비교) ─────────────────────────────────────
// revisions 키 = RevisionThread[].
//   한 thread = "같은 글의 고쳐쓰기 묶음". revisions[0]이 v1(초안), 끝이 최신.
//   LRU 정책(CEO 리뷰 2026-05-28):
//   · thread당 4번째 추가 시 가장 오래된 1건 drop ("오래된 이력 1건 정리했어요")
//   · 전체 storage quota 초과 시 가장 오래된 thread 통째 drop, 재시도 1회.

import type { Assignment, F3Output } from "../data/scoring";

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

export async function loadRevisions(): Promise<RevisionThread[]> {
  const parsed = await readKey("revisions");
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(isRevisionThread);
}

export type AddRevisionResult =
  | { ok: true; thread_id: string; dropped_oldest_in_thread: boolean; dropped_oldest_thread: boolean }
  | { ok: false; reason: "denied" };

// thread_id 있으면 해당 thread에 append, 없으면 새 thread 생성.
// 새 entry의 version은 thread 안에서 자동(직전 max+1, 첫 추가는 1).
// quota 초과 시 가장 오래된 thread 통째 drop + 재시도 1회. 또 실패하면 denied.
export async function addRevision(
  threadId: string | null,
  partial: Omit<RevisionEntry, "id" | "version" | "created_at">,
): Promise<AddRevisionResult> {
  const threads = await loadRevisions();
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
  let result = await writeKey("revisions", threads);
  let droppedThread = false;

  // quota 초과 → 가장 오래된 thread(현재 target 아닌 것 중) drop 후 재시도
  if (!result.ok && result.reason === "quota") {
    const candidate = threads.findIndex((_, i) => i !== targetIdx);
    if (candidate !== -1) {
      threads.splice(candidate, 1);
      droppedThread = true;
      // targetIdx가 candidate 뒤에 있었으면 인덱스 보정 — 여기선 thread_id로 다시 찾음
      result = await writeKey("revisions", threads);
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

export async function getThread(threadId: string): Promise<RevisionThread | null> {
  const threads = await loadRevisions();
  return threads.find((t) => t.thread_id === threadId) ?? null;
}

export async function clearAllRevisions(): Promise<void> {
  await clearKey("revisions");
}

// ── Draft (#9 본문 자동 저장) ─────────────────────────────────────────
// drafts 키 = DraftSnapshot.
//   /try 입력 화면에서 body·과제정보를 debounce(800ms)로 자동 저장.
//   복원은 명시적 "이어 쓰기/새로 시작" 배너로 — 공용 기기에서 타인 글 노출 방지.
//   제출 성공 시 clearDraft 호출(데이터 보존이 끝남).
//
//   단일 draft 정책: 한 번에 하나만 보관(샘플 폼은 본문 1개 입력 슬롯이라).
//   thread별 다중 draft가 필요해지면 키를 v2로 마이그레이션해 분리.

export type DraftSnapshot = {
  body: string;                    // 학생 글 원본 (정규화 전)
  body_html?: string;              // RichEditor HTML(서식 영속, 가산). 복원은 이걸 우선, 없으면 plainToHtml(body).
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
  if (o.body_html !== undefined && typeof o.body_html !== "string") return false;
  return true;
}

export async function loadDraft(): Promise<DraftSnapshot | null> {
  const parsed = await readKey("drafts");
  return isDraftSnapshot(parsed) ? parsed : null;
}

export async function saveDraft(
  snapshot: Omit<DraftSnapshot, "saved_at">,
): Promise<{ ok: true; saved_at: string } | { ok: false; reason: "quota" | "denied" | "invalid" | "auth" }> {
  const saved_at = consentNow();
  const full: DraftSnapshot = { ...snapshot, saved_at };
  if (!isDraftSnapshot(full)) return { ok: false, reason: "invalid" };
  const r = await writeKey("drafts", full);
  return r.ok ? { ok: true, saved_at } : { ok: false, reason: r.reason ?? "denied" };
}

export async function clearDraft(): Promise<void> {
  await clearKey("drafts");
}

// ── Results (채점 결과 조회) ──────────────────────────────────────────
// results 키 = ResultEntry[].
//   /try 채점 성공 시 자동 저장 → /results 페이지에서 목록·상세 조회.
//   LRU 정책: 최대 20건 보관, 초과 시 가장 오래된 1건 drop. quota 초과 시 추가 1건 drop 후 재시도.
//   Revisions와 별개 — Revisions는 "같은 글의 고쳐쓰기 묶음", Results는 "독립된 채점 이력".

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
  // Codex PR #29: 깊은 검증 — 손상된 LS 엔트리가 /results UI에서 런타임 예외 트리거 방지.
  // /results 목록(map 도는 r.output.total_score)·상세(scores.map) 양쪽 필수 필드 가드.
  if (typeof o.assignment !== "object" || o.assignment === null) return false;
  const a = o.assignment as Record<string, unknown>;
  if (typeof a.school_level !== "string" || typeof a.subject !== "string") return false;
  if (typeof a.genre !== "string" || typeof a.prompt_text !== "string") return false;
  if (typeof o.submission !== "object" || o.submission === null) return false;
  const s = o.submission as Record<string, unknown>;
  if (typeof s.body !== "string" || typeof s.char_count !== "number") return false;
  if (typeof o.output !== "object" || o.output === null) return false;
  const out = o.output as Record<string, unknown>;
  if (typeof out.total_score !== "number") return false;
  if (!Array.isArray(out.scores)) return false;
  // 영역 점수 항목별 검증 — ResultView.scores.map 안전 보장.
  for (const score of out.scores) {
    if (typeof score !== "object" || score === null) return false;
    const sc = score as Record<string, unknown>;
    if (typeof sc.area !== "string" || typeof sc.score !== "number") return false;
  }
  if (!Array.isArray(out.revision_guides)) return false;
  if (typeof out.meta !== "object" || out.meta === null) return false;
  return true;
}

export async function loadResults(): Promise<ResultEntry[]> {
  const parsed = await readKey("results");
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(isResultEntry);
}

export async function getResult(id: string): Promise<ResultEntry | null> {
  const all = await loadResults();
  return all.find((r) => r.id === id) ?? null;
}

export type AddResultResult =
  | { ok: true; id: string; dropped_oldest: boolean }
  | { ok: false; reason: "denied" };

// 신규 채점 결과 저장. 목록 끝에 추가(시간순 append) — 조회 시 역순 정렬.
//   MAX_RESULTS 초과 시 가장 오래된 1건 shift. quota 시 1건 더 drop 후 재시도.
export async function addResult(
  partial: Omit<ResultEntry, "id" | "created_at">,
): Promise<AddResultResult> {
  const results = await loadResults();
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

  let r = await writeKey("results", results);
  // quota → 추가 1건 drop 후 재시도
  if (!r.ok && r.reason === "quota" && results.length > 1) {
    results.shift();
    droppedOldest = true;
    r = await writeKey("results", results);
  }

  if (!r.ok) return { ok: false, reason: "denied" };
  return { ok: true, id: newEntry.id, dropped_oldest: droppedOldest };
}

export async function clearAllResults(): Promise<void> {
  await clearKey("results");
}

// #M3 ④ — 개별 결과 삭제. 존재하지 않는 id는 silent no-op.
//   타 결과 영향 0. 저장 실패는 호출자에게 알리지 않음(다음 load 시 반영되므로).
export async function removeResult(id: string): Promise<{ ok: boolean; removed: boolean }> {
  const list = await loadResults();
  const idx = list.findIndex((r) => r.id === id);
  if (idx === -1) return { ok: true, removed: false };
  list.splice(idx, 1);
  const r = await writeKey("results", list);
  return { ok: r.ok, removed: r.ok };
}

// ── #M3 ③ Meta usage LRU — 자주 쓴 장르·목표 분량 학습 ────────────────
// meta_usage 키 = MetaUsage.
//   채점 성공 시 recordMetaUsage 호출 → 필드별 LRU 5건 유지(count + last_used_at).
//   Step 2 prefill 우선순위: profile(주어진 defaults) > LRU 최빈값 > 빈 문자열.
//   target_raw는 프로필에 없으니 LRU만 사용 — 학생 자주 쓰는 분량 자연 학습.

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

// Codex PR #56: NaN/음수/빈 last_used_at도 typeof만 보면 통과해 UI에서 ×NaN 또는
// 정렬 깨짐 발생. 추가 검증으로 손상 항목을 input 단계에서 차단.
function isMetaUsageEntry(v: unknown): v is MetaUsageEntry {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  if (typeof o.value !== "string" || o.value.length === 0) return false;
  if (typeof o.count !== "number" || !Number.isFinite(o.count) || o.count <= 0) return false;
  if (typeof o.last_used_at !== "string" || o.last_used_at.length === 0) return false;
  // ISO 8601 + KST 형식 (consentNow): YYYY-MM-DDTHH:MM:SS...+09:00 또는 Z. 느슨하지만 빈/숫자/random 거부.
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:/.test(o.last_used_at)) return false;
  return true;
}

// Codex PR #56: 손상 LS를 "전체 폐기" 대신 "부분 복구"로 처리하되, 불변식도 같이 복원:
//   ① 엔트리 유효성 — isMetaUsageEntry(value/count/last_used_at)
//   ② value 중복 merge — count 합산, last_used_at 더 최신 것 유지 (React key 충돌 방지)
//   ③ LRU 5건 제한 — last_used_at desc로 정렬 후 상위 5건만 keep
// 이렇게 해야 MetaUsageCard의 "LRU N/5" 표시가 항상 N≤5, 같은 value 중복 칩 렌더링 0.
function dedupAndCapLRU(entries: MetaUsageEntry[]): MetaUsageEntry[] {
  const byValue = new Map<string, MetaUsageEntry>();
  for (const e of entries) {
    const prev = byValue.get(e.value);
    if (prev) {
      prev.count += e.count;
      if (e.last_used_at.localeCompare(prev.last_used_at) > 0) {
        prev.last_used_at = e.last_used_at;
      }
    } else {
      byValue.set(e.value, { value: e.value, count: e.count, last_used_at: e.last_used_at });
    }
  }
  return [...byValue.values()]
    .sort((a, b) => b.last_used_at.localeCompare(a.last_used_at))
    .slice(0, MAX_META_USAGE_PER_FIELD);
}

export async function loadMetaUsage(): Promise<MetaUsage> {
  const parsed = await readKey("meta_usage");
  if (typeof parsed !== "object" || parsed === null) return emptyMetaUsage();
  const o = parsed as Record<string, unknown>;
  const result = emptyMetaUsage();
  const fields: MetaField[] = ["school_level", "subject", "genre", "target_raw"];
  for (const f of fields) {
    const arr = o[f];
    if (!Array.isArray(arr)) continue;
    result[f] = dedupAndCapLRU(arr.filter(isMetaUsageEntry));
  }
  return result;
}

// 순수 — usage 객체의 한 필드를 in-place 갱신(count++/LRU). RMW의 modify 단계만 분리.
function applyMetaUsage(usage: MetaUsage, field: MetaField, value: string, now: string): void {
  const trimmed = value.trim();
  if (!trimmed) return;
  const list = usage[field];
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
}

// 단일 필드 사용 기록. 같은 value 있으면 count + 1 + last_used_at 갱신, 없으면 신규 추가.
// 필드별 LRU 5건 — 6번째 신규 추가 시 last_used_at 가장 오래된 항목 drop.
export async function recordMetaUsage(field: MetaField, value: string): Promise<void> {
  if (!value.trim()) return; // 빈 값은 기록 안 함
  const usage = await loadMetaUsage();
  applyMetaUsage(usage, field, value, consentNow());
  await writeKey("meta_usage", usage);
}

// ★ 4필드 일괄 기록 — 1 load → 다필드 갱신 → 1 write. account mode에서 8왕복→2왕복, lost update 제거.
//   (runScore가 4건을 Promise.all로 병렬 호출하면 같은 meta_usage 키를 같은 base로 읽어 마지막 쓰기만 남는다.)
export async function recordMetaUsageBatch(
  entries: ReadonlyArray<readonly [MetaField, string]>,
): Promise<void> {
  const valid = entries.filter(([, v]) => v.trim().length > 0);
  if (valid.length === 0) return;
  const usage = await loadMetaUsage();
  const now = consentNow();
  for (const [field, value] of valid) applyMetaUsage(usage, field, value, now);
  await writeKey("meta_usage", usage);
}

// 필드별 허용값 검증 — 손상된 LS가 enum 외 값을 반환해 ScoreForm requiredOk를
// 가짜 truthy로 만드는 사고 방지(Codex PR #41, isDraftSnapshot과 동일 패턴).
function isValidMetaValue(field: MetaField, value: string): boolean {
  switch (field) {
    case "school_level":
      return (SCHOOL_LEVELS as readonly string[]).includes(value);
    case "subject":
      return (SUBJECTS as readonly string[]).includes(value);
    case "genre":
      return (GENRES as readonly string[]).includes(value);
    case "target_raw": {
      // 빈 문자열 = 제한 없음(저장 안 함 가정). 숫자 문자열만 허용.
      const n = Number(value);
      return Number.isInteger(n) && n >= 50 && n <= 2000;
    }
  }
}

// 최빈값 — count 우선, 동률은 last_used_at(최신 우선). 없으면 null.
// Codex PR #41: enum 외 손상값은 폴백 무시(다음 유효 항목 시도, 없으면 null).
// Codex PR #56: loadValidatedMetaUsage()와 동일 경로 — enum 필터를 cap 전에 적용해야
//   최신 5건이 손상값이고 6번째가 정상인 케이스에서 정상값이 prefill에 살아남음.
export async function getMostUsedMeta(field: MetaField): Promise<string | null> {
  const list = (await loadValidatedMetaUsage())[field];
  if (list.length === 0) return null;
  // count desc, last_used_at desc
  const sorted = [...list].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return b.last_used_at.localeCompare(a.last_used_at);
  });
  return sorted[0].value;
}

// Codex PR #56: MetaUsageCard·기타 UI에서 손상 LS 값 노출 방지용 필터링 진입점.
//   `loadMetaUsage`(schema 손상만 복구) ↔ `loadValidatedMetaUsage`(enum/범위까지).
//   주의: enum 필터를 cap(LRU 5건) 적용 전에 통과시켜야 함 — 최신 5건이 모두 손상값이고
//   6번째가 정상이면, cap이 enum 필터보다 먼저 일어나면 정상 이력이 영원히 잘림.
//   raw에서 다시 읽어 enum 필터 → dedup → cap 순서 보장.
export async function loadValidatedMetaUsage(): Promise<MetaUsage> {
  const parsed = await readKey("meta_usage");
  if (typeof parsed !== "object" || parsed === null) return emptyMetaUsage();
  const o = parsed as Record<string, unknown>;
  const result = emptyMetaUsage();
  const fields: MetaField[] = ["school_level", "subject", "genre", "target_raw"];
  for (const f of fields) {
    const arr = o[f];
    if (!Array.isArray(arr)) continue;
    const valid = arr
      .filter(isMetaUsageEntry)
      .filter((e) => isValidMetaValue(f, e.value));
    result[f] = dedupAndCapLRU(valid);
  }
  return result;
}

export async function clearMetaUsage(): Promise<void> {
  await clearKey("meta_usage");
}

// ── Consent (동의) payload 통로 — 검증/폴백은 consent-store.ts 책임 ──────
//   consent 상태도 계정 귀속(스펙 PII (1)). storage는 raw payload만 read/write/clear 하고,
//   검증(isConsentState)·emptyConsent 폴백·필드 토글은 consent-store.ts가 적용.
export async function loadConsentData(): Promise<unknown | null> {
  return readKey("consent");
}

export async function saveConsentData(
  state: unknown,
): Promise<{ ok: boolean; reason?: "quota" | "denied" | "auth" }> {
  return writeKey("consent", state);
}

export async function clearConsentData(): Promise<void> {
  await clearKey("consent");
}

// accountMode 무관 — localStorage 6키 직접 제거(서버 PUT(null) 미발생). me 삭제 authed 분기 전용.
export function clearAllLocalStorage(): void {
  if (typeof window === "undefined") return;
  for (const k of Object.values(LS_KEY)) {
    try {
      window.localStorage.removeItem(k);
    } catch {
      /* swallow */
    }
  }
}
