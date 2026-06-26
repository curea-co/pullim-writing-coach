"use client";

// Pullim Writing Coach — U5 코치 상태머신 (docs/27_coach_prototype.html React 포팅)
//
// 흐름(킥 UX, 한 호흡에 한 nudge):
//   write → [봐줘] → checking(POST /api/coach) → nudge(peek→open) → [고쳤어 ✓]
//     → rechecking(POST /api/coach) → growth(전/후 막대) → [다음] → 다음 nudge … → done(완료화면)
//
// 서버 계약(EPIC2 /api/coach, /api/score 패턴 답습): 요청={assignment, rubric?, submission:{body}},
//   200 응답=CoachOutput(coach-schema). x-demo-token 헤더(TokenGate와 공유). 401→재인증 유도.
//   nudge 우선순위는 prioritizeNudges/topNudge(nudge-priority), 성장막대는 revision.ts.
//
// 불변식: 코치는 학생 문장을 대신 쓰지 않는다. 이 클라이언트는 서버가 준 diagnosis/guiding_question만
//   표시하고, 작성은 전적으로 캔버스(학생)에 맡긴다. "코치가 준 문장 0개"를 과정 로그로 증명.
//
// ── 이번 웨이브: 라이브 루프 배선 ──────────────────────────────────────
// 자체 useReducer 루프는 유지하되, 순수 모듈을 라이브 데이터에 배선한다(동작 변화는 가산적):
//   (1) coach-session.ts(createSession·recordRevision)로 세션을 모델링하고 localStorage
//       'pwc-coach-session-v1'에 영속(SSR 가드). 새로고침 시 복원.
//   (2) 루프가 갱신될 때 process-log.ts buildProcessLog(session)를 계산해 localStorage
//       'pwc-process-log-v1'에 저장(교사 /teacher/log가 읽음).
//   (3) 시작 시 localStorage 'pwc-teacher-rubric-v1'(TeacherRubric)이 있으면 읽어
//       teacher-rubric.serializeRubricForPrompt로 텍스트화 → /api/coach 요청 rubric 필드로 전송.
// 순수 모듈은 import만(수정 금지). 부수효과(localStorage·window)는 전부 이 "use client" 파일에.

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import type { CoachNudge, CoachOutput } from "@/app/lib/coach-schema";
import type { AreaName } from "@/app/data/scoring";
import type { RichEditorHandle } from "@/app/components/editor/RichEditor";
import { plainToHtml, htmlToPlain } from "@/app/lib/editor-doc";
import { validateCoachOutput } from "@/app/lib/coach-schema";
import { topNudge } from "@/app/lib/nudge-priority";
import { AREAS } from "@/app/lib/grading";
import {
  type AreaScore,
  type CoachSession,
  type SessionAssignment,
  createSession,
  recordRevision,
} from "@/app/lib/coach-session";
import { buildProcessLog, buildTimeline, selectBreakthroughs } from "@/app/lib/process-log";
import {
  type TeacherRubric,
  serializeRubricForPrompt,
} from "@/app/lib/teacher-rubric";
import type { CoachAssignment, WritingMode } from "@/app/lib/coach-setup";
import { DEMO_TOKEN_KEY } from "@/app/components/TokenGate";
import styles from "@/app/coach/coach.module.css";
import { loadDoneCount, bumpDoneCount, hasDoneCounted, markDoneCounted } from "@/app/lib/storage";
import Canvas from "./Canvas";
import GuidePanel from "./GuidePanel";
import OutlinePanel from "./OutlinePanel";
import VoicePanel from "./VoicePanel";
import BottomSheet, { type SheetPosition } from "./BottomSheet";
import NudgeCard from "./NudgeCard";
import GrowthBars, { GrowthRow } from "./GrowthBars";
import BreakthroughBadge from "./BreakthroughBadge";
import PersistDots from "./PersistDots";
import ProcessTimeline from "./ProcessTimeline";
import { BlockIcon, MastGlyph } from "./icons";
import ShareStory from "./ShareStory";
import { formatStoryText } from "@/app/lib/story";

// ── 데모 기본 과제 — prop 미주입(직접 마운트·테스트) 시 폴백 ──────────
// 실서비스는 CoachSetupFlow에서 CoachAssignment prop으로 주입.
const DEMO_ASSIGNMENT: CoachAssignment = {
  school_level: "중2",
  subject: "과학",
  genre: "설명문",
  target_char_count: null,
  prompt_text: "화산의 형성 과정과 그것이 우리 삶에 미치는 영향을 설명하는 글을 쓰시오.",
  title: "화산의 형성과 영향",
};

// nudge 대상 4영역(성장 가능성 제외) — 루브릭 칩 "약점" 표시용.
const NUDGEABLE: readonly AreaName[] = ["과제 이해", "내용 충실도", "구조·논리", "표현·문장"];
const PASS = 14; // 영역 통과 기준(0~20)

// "왜 중요해?" 메타 근거(영역별) — NudgeCard.why로 주입. 대안 문장이 아니라 "이 기준이 왜 점수에
//   중요한가"의 설명이라 불변식과 무관. 서버가 별도 필드를 주지 않으므로 클라 상수.
const WHY_BY_AREA: Partial<Record<AreaName, string>> = {
  "과제 이해": "과제가 요구한 걸 빠짐없이 다뤘는지가 가장 먼저 보는 채점 포인트예요.",
  "내용 충실도": "설명·주장은 ‘왜 그런지’ 근거가 붙을 때 점수가 올라요. 한 줄이 글을 바꿔요.",
  "구조·논리": "읽는 사람이 길을 잃지 않으려면 문장과 문장을 잇는 다리가 필요해요.",
  "표현·문장": "문장 길이·표현에 변화를 주면 글이 단조롭지 않고 잘 읽혀요.",
};

// ── localStorage 키 (공유 계약) ─────────────────────────────────────
//   세션: 코치 루프 전체 궤적(클라 영속, MVP). 과정로그: 교사 /teacher/log가 읽음.
//   루브릭: 교사 /teacher/rubric이 씀(EPIC5) — 여기선 읽기만.
//   body_html: 리치 서식 HTML 별도 영속(캔버스 리치 에디터용, reducer 외부).
const SESSION_KEY = "pwc-coach-session-v1";
const PROCESS_LOG_KEY = "pwc-process-log-v1";
const TEACHER_RUBRIC_KEY = "pwc-teacher-rubric-v1";
const BODY_HTML_KEY = "pwc-coach-body-html-v1";

// 과제 서명: sameAssignment 4필드(school_level·subject·genre·prompt_text)와 동일 필드.
// 다른 과제의 body_html이 현재 세션을 덮어쓰는 교차 오염 방지(Codex 리뷰).
function assignmentSig(a: Pick<CoachAssignment, "school_level" | "subject" | "genre" | "prompt_text">): string {
  return [a.school_level, a.subject, a.genre, a.prompt_text].join("\0");
}

function loadBodyHtml(): { sig: string; html: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(BODY_HTML_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as { sig?: unknown; html?: unknown };
    if (typeof o !== "object" || o === null) return null;
    if (typeof o.sig !== "string" || typeof o.html !== "string") return null;
    return { sig: o.sig, html: o.html };
  } catch { return null; }
}
function saveBodyHtml(sig: string, html: string): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(BODY_HTML_KEY, JSON.stringify({ sig, html })); } catch {}
}
function clearBodyHtml(): void {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(BODY_HTML_KEY); } catch {}
}

// ── 상태머신 ────────────────────────────────────────────────────────
type Phase =
  | "write" // 작성 중 — peek로 [봐줘] CTA
  | "checking" // 첫 점검 호출 중
  | "nudge" // nudge 표시(open)
  | "rechecking" // 고친 뒤 재점검 호출 중
  | "growth" // 전/후 막대
  | "done"; // 완료화면

type ErrorState = { message: string; retryable: boolean } | null;

type State = {
  phase: Phase;
  body: string;
  scores: Record<AreaName, number> | null; // 최신 area 점수
  baseline: Record<AreaName, number> | null; // 첫 점검 점수(완료화면 비교 기준)
  focusArea: AreaName | null; // 지금 코칭 중인 영역
  focusBefore: number; // 코칭 시작 시 점수(성장막대 '전')
  focusAfter: number; // 재점검 후 점수(성장막대 '후')
  revisions: number; // 고쳐쓰기 횟수(과정 로그)
  // Codex PR #71 round 2: 직전 CHECK/RECHECK 응답 nudges 캐시. growth → [다음] 시 같은 응답 안의
  //   다음 우선순위 nudge로 이어가 (서버 재호출 없이) UX 약속 충족.
  lastNudges: CoachNudge[];
  error: ErrorState;
};

type Action =
  | { type: "EDIT"; body: string }
  | { type: "CHECK_START" }
  | { type: "CHECK_OK"; scores: Record<AreaName, number>; nudges: CoachNudge[] }
  | { type: "RECHECK_START" }
  // Codex PR #71 round 2: wasRevised=true 일 때만 revisions++. API 실패/본문 미변경 카운트 부풀림 방지.
  | { type: "RECHECK_OK"; scores: Record<AreaName, number>; nudges: CoachNudge[]; wasRevised: boolean }
  | { type: "REVISION_TRACKED" } // runCheck에서 본문 변경 감지 시 state.revisions 동기화(process log와 일치)
  | { type: "NEXT" }
  | { type: "FINISH" }
  | { type: "ERROR"; message: string; retryable: boolean }
  | { type: "AUTH_EXPIRED" } // 401 — 글은 보존하고 write로 복귀
  | {
      type: "RESTORE"; // 새로고침 복원: 저장 세션의 본문·점수·기준선·회차를 write 단계로 되살림
      body: string;
      scores: Record<AreaName, number>;
      baseline: Record<AreaName, number>;
      revisions: number;
    }
  | { type: "RESET" };

function emptyScores(): Record<AreaName, number> {
  return AREAS.reduce(
    (acc, a) => {
      acc[a] = 0;
      return acc;
    },
    {} as Record<AreaName, number>,
  );
}

// scores+nudges → 다음 코칭 영역(통과 못한 nudgeable 중 우선순위 1위). 없으면 null(=완료).
function pickFocus(
  scores: Record<AreaName, number>,
  nudges: CoachNudge[],
): { area: AreaName; nudge: CoachNudge } | null {
  const areaScores = AREAS.map((a) => ({ area: a, score: scores[a] ?? 0 }));
  // 아직 통과 못한 nudgeable 영역의 nudge만 후보로.
  const open = nudges.filter(
    (n) => NUDGEABLE.includes(n.rubric_area) && (scores[n.rubric_area] ?? 0) < PASS,
  );
  const top = topNudge(open, areaScores);
  if (!top) return null;
  return { area: top.rubric_area, nudge: top };
}

const initial: State = {
  phase: "write",
  body: "",
  scores: null,
  baseline: null,
  focusArea: null,
  focusBefore: 0,
  focusAfter: 0,
  revisions: 0,
  lastNudges: [],
  error: null,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "EDIT":
      return { ...state, body: action.body };
    case "CHECK_START":
      return { ...state, phase: "checking", error: null };
    case "CHECK_OK": {
      const baseline = state.baseline ?? action.scores;
      const focus = pickFocus(action.scores, action.nudges);
      if (!focus) {
        return { ...state, phase: "done", scores: action.scores, baseline, lastNudges: action.nudges };
      }
      return {
        ...state,
        phase: "nudge",
        scores: action.scores,
        baseline,
        focusArea: focus.area,
        focusBefore: action.scores[focus.area] ?? 0,
        lastNudges: action.nudges, // growth → [다음] 시 직전 응답에서 next focus 추출
      };
    }
    case "RECHECK_START":
      // Codex PR #71 round 2: revisions++는 RECHECK_OK 시점(wasRevised=true) 에만. 여기서 ++ 하면
      //   API 실패·401·본문 미변경 케이스에서도 학생 화면 카운트가 부풀려져 교사 로그와 어긋남.
      return { ...state, phase: "rechecking", error: null };
    case "RECHECK_OK": {
      const area = state.focusArea;
      const after = area ? (action.scores[area] ?? 0) : 0;
      return {
        ...state,
        phase: "growth",
        scores: action.scores,
        focusAfter: after,
        lastNudges: action.nudges,
        revisions: state.revisions + (action.wasRevised ? 1 : 0),
      };
    }
    case "REVISION_TRACKED":
      // Codex PR #71 round 2: runCheck 경로(본문 변경 후 [봐줘])에서 process log는 ++ 됐는데 학생
      //   화면 카운트는 안 올라가는 불일치 fix. recordRevision 호출과 1:1 동기화.
      return { ...state, revisions: state.revisions + 1 };
    case "NEXT": {
      // Codex PR #71 round 2: growth에서 [다음] — 직전 lastNudges + 현재 scores로 다음 focus 추출.
      //   남은 PASS 미만 nudgeable 영역이 있으면 추가 서버 호출 없이 nudge phase로 직접 진입.
      //   없으면 runNext가 FINISH로 분기(reducer는 NEXT만 받음).
      const scores = state.scores ?? emptyScores();
      const focus = pickFocus(scores, state.lastNudges);
      if (!focus) {
        return { ...state, phase: "write", focusArea: null };
      }
      return {
        ...state,
        phase: "nudge",
        focusArea: focus.area,
        focusBefore: scores[focus.area] ?? 0,
      };
    }
    case "FINISH":
      return { ...state, phase: "done" };
    case "ERROR":
      return { ...state, error: { message: action.message, retryable: action.retryable } };
    case "AUTH_EXPIRED":
      // 토큰 만료/오류 — 작성한 글은 그대로 두고 write로(재인증 후 다시 [봐줘]).
      return { ...state, phase: "write", focusArea: null, error: null };
    case "RESTORE":
      // 저장된 세션을 write 단계로 복원(점수·기준선·회차 반영, 다음 [봐줘]로 라이브 루프 재개).
      return {
        ...initial,
        phase: "write",
        body: action.body,
        scores: action.scores,
        baseline: action.baseline,
        revisions: action.revisions,
      };
    case "RESET":
      return { ...initial };
    default:
      return state;
  }
}

// ── 세션 영속 (storage.ts 패턴 — SSR 가드 + 방어적 파싱) ──────────────
// 순수 모듈(coach-session·process-log·teacher-rubric)은 import만 하고, 부수효과는 여기서만.

// 과제 → 세션 메타(target_char_count 제외).
function sessionAssignment(a: CoachAssignment): SessionAssignment {
  return {
    school_level: a.school_level,
    subject: a.subject,
    genre: a.genre,
    prompt_text: a.prompt_text,
  };
}

// Record<AreaName,number> → AreaScore[] (AREAS 권위 순서 보존).
function toAreaScores(scores: Record<AreaName, number>): AreaScore[] {
  return AREAS.map((a) => ({ area: a, score: scores[a] ?? 0 }));
}

// AreaScore[] → Record<AreaName,number> (복원용).
function fromAreaScores(scores: AreaScore[] | undefined): Record<AreaName, number> {
  const map = emptyScores();
  if (Array.isArray(scores)) {
    for (const s of scores) {
      if (s && (AREAS as readonly string[]).includes(s.area) && typeof s.score === "number") {
        map[s.area] = s.score;
      }
    }
  }
  return map;
}

function saveSession(session: CoachSession): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* swallow — quota/denied. 세션은 작아서 거의 안 터짐. 영속 실패가 루프를 막지 않는다. */
  }
}

// 저장된 세션을 방어적으로 복원(다른 탭 손상·schema 변화 대비). 모양이 안 맞으면 null.
function loadSession(): CoachSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as Partial<CoachSession>;
    if (typeof o !== "object" || o === null) return null;
    if (!Array.isArray(o.draftHistory) || o.draftHistory.length === 0) return null;
    if (!Array.isArray(o.baseline) || !Array.isArray(o.areaScores)) return null;
    if (typeof o.assignment !== "object" || o.assignment === null) return null;
    const last = o.draftHistory[o.draftHistory.length - 1];
    if (!last || typeof last.body !== "string") return null;
    return o as CoachSession;
  } catch {
    return null;
  }
}

function clearSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(SESSION_KEY);
  } catch {
    /* swallow */
  }
}

// 세션 → 과정 로그 영속(교사 /teacher/log가 'pwc-process-log-v1'을 읽음).
function saveProcessLog(session: CoachSession): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROCESS_LOG_KEY, JSON.stringify(buildProcessLog(session)));
  } catch {
    /* swallow */
  }
}

function clearProcessLog(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PROCESS_LOG_KEY);
  } catch {
    /* swallow */
  }
}

// 세션+로그를 함께 영속(루프가 갱신될 때마다 한 묶음으로 저장).
function persist(session: CoachSession): void {
  saveSession(session);
  saveProcessLog(session);
}

// 교사 루브릭 읽어 프롬프트 텍스트로 직렬화. 없거나 채운 기준이 없으면 undefined(미전송).
function loadRubricText(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(TEACHER_RUBRIC_KEY);
    if (!raw) return undefined;
    const r = JSON.parse(raw) as TeacherRubric;
    if (typeof r !== "object" || r === null || !Array.isArray(r.perArea)) return undefined;
    const text = serializeRubricForPrompt(r);
    return text.length > 0 ? text : undefined;
  } catch {
    return undefined;
  }
}

// ── 초기 상태 ─────────────────────────────────────────────────────────
// 첫 페인트는 항상 빈 캔버스 — 학생이 직접 쓰는 게 핵심 불변식. SSR/클라 hydration이 동일해야
//   깜빡임/불일치가 없다. 저장 세션 복원(이어쓰기)은 hydration 이후 useEffect에서 RESTORE 액션으로.
function initState(): State {
  return initial;
}

// ── API 호출 (TryClient/ScoreForm 패턴 답습) ─────────────────────────
type CoachRequest = {
  assignment: Pick<CoachAssignment, "school_level" | "subject" | "genre" | "target_char_count" | "prompt_text">;
  rubric?: string;
  submission: { body: string };
  mode?: WritingMode; // Wave2 Slice 1 — 서버가 수신하되 현재 무동작
};

async function callCoach(
  body: string,
  assignment: CoachAssignment,
  rubricText?: string,
  mode?: WritingMode,
): Promise<
  | { ok: true; output: CoachOutput }
  | { ok: false; auth: true }
  | { ok: false; auth: false; message: string; retryable: boolean }
> {
  const token = sessionStorage.getItem(DEMO_TOKEN_KEY) ?? "";
  if (!token) return { ok: false, auth: true };

  const payload: CoachRequest = {
    assignment: {
      school_level: assignment.school_level,
      subject: assignment.subject,
      genre: assignment.genre,
      target_char_count: assignment.target_char_count,
      prompt_text: assignment.prompt_text,
    },
    submission: { body },
    // 교사 루브릭이 있으면 rubric 필드로 전송(route.ts 요청 계약). 없으면 미전송.
    ...(rubricText ? { rubric: rubricText } : {}),
    // mode 배선(Wave2 Slice 1) — 서버는 수신하되 현재 무동작. 미전송 시 서버가 "free" 폴백.
    ...(mode ? { mode } : {}),
  };

  let res: Response;
  try {
    res = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-demo-token": token },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(65_000),
    });
  } catch (e) {
    const isTimeout = e instanceof DOMException && e.name === "TimeoutError";
    return {
      ok: false,
      auth: false,
      message: isTimeout
        ? "지금 코치가 글을 읽는 데 시간이 걸리고 있어요. 다시 시도해 주세요."
        : "인터넷 연결을 확인하고 다시 시도해 주세요.",
      retryable: true,
    };
  }

  if (res.status === 401) return { ok: false, auth: true };

  if (!res.ok) {
    return {
      ok: false,
      auth: false,
      message: "코치를 잠시 불러올 수 없어요. 잠시 후 다시 시도해 주세요.",
      retryable: true,
    };
  }

  let parsed: unknown;
  try {
    parsed = await res.json();
  } catch {
    return {
      ok: false,
      auth: false,
      message: "결과를 다시 받아야 해요. 다시 시도해 주세요.",
      retryable: true,
    };
  }

  // 서버가 권위지만, FE도 coach-schema로 한 번 더 방어(깨진 결과 화면 노출 금지).
  if (validateCoachOutput(parsed).length > 0) {
    return {
      ok: false,
      auth: false,
      message: "결과를 다시 받아야 해요. 다시 시도해 주세요.",
      retryable: true,
    };
  }

  return { ok: true, output: parsed as CoachOutput };
}

// CoachOutput.area_scores[] → Record<AreaName, number>.
function toScoreMap(output: CoachOutput): Record<AreaName, number> {
  const map = emptyScores();
  for (const s of output.area_scores) map[s.area] = s.score;
  return map;
}

// ────────────────────────────────────────────────────────────────────
export default function CoachClient({
  assignment: assignmentProp,
  mode = "free",
  onAuthExpired,
  onNewAssignment,
}: {
  assignment?: CoachAssignment;
  mode?: WritingMode;
  onAuthExpired?: () => void;
  onNewAssignment?: () => void;
}) {
  const [state, dispatch] = useReducer(reducer, undefined, initState);
  const [currentNudge, setCurrentNudge] = useState<CoachNudge | null>(null);
  const [sheetExpanded, setSheetExpanded] = useState(false); // nudge/growth open↔peek 토글
  const [outlineCollapsed, setOutlineCollapsed] = useState(false); // outline 패널 접기(로컬 UI state)
  const [bodyHtml, setBodyHtml] = useState(""); // 리치 에디터 HTML(reducer 외부 — body는 계속 평문)
  const [coachSpellcheck, setCoachSpellcheck] = useState(false);
  // 끈기 스트릭 — 완료 시 bumpDoneCount() 결과로 갱신(reducer 외부).
  const [doneStreak, setDoneStreak] = useState(() => loadDoneCount());
  const editorRef = useRef<RichEditorHandle>(null);

  // 라이브 세션(순수 CoachSession 모델) — 반복 갱신은 항상 새 객체로 교체(불변). 부수효과는 영속 헬퍼.
  const sessionRef = useRef<CoachSession | null>(null);
  // 교사 루브릭 직렬화 텍스트(마운트 시 1회 읽음). 있으면 /api/coach rubric 필드로 전송.
  const rubricRef = useRef<string | undefined>(undefined);
  // 완료 카운트 중복 방지 ref — 과제당 1회만 bumpDoneCount() 호출(effect 재실행 방어).
  const doneCountedRef = useRef(false);

  const assignment = assignmentProp ?? DEMO_ASSIGNMENT;
  const assignmentTitle = assignment.title ?? assignment.prompt_text.slice(0, 24);

  const busy = state.phase === "checking" || state.phase === "rechecking";

  // ── 마운트: 루브릭 읽기 + 저장된 세션 복원(이어쓰기) ──
  // hydration 불일치를 피하려고 복원은 첫 페인트 이후(useEffect)로 미룬다(초기는 항상 빈 캔버스).
  useEffect(() => {
    rubricRef.current = loadRubricText();

    const saved = loadSession();
    // 다른 과제의 세션이 남아 있으면 복원하지 않는다(curea-review-ai 지적): 새 과제 헤더 아래로
    // 이전 글·점수가 되살아나는 혼선 방지. 과제 식별 4필드(학년·과목·장르·과제문)가 모두 같아야 동일 과제로 본다.
    const sa = saved?.assignment;
    const sameAssignment =
      !!sa &&
      sa.school_level === assignment.school_level &&
      sa.subject === assignment.subject &&
      sa.genre === assignment.genre &&
      sa.prompt_text === assignment.prompt_text;
    if (saved && sameAssignment) {
      sessionRef.current = saved;
      const lastDraft = saved.draftHistory[saved.draftHistory.length - 1];
      // 본문·점수·기준선·회차를 write 단계로 복원(다음 [봐줘]로 라이브 루프 재개).
      dispatch({
        type: "RESTORE",
        body: lastDraft.body,
        scores: fromAreaScores(saved.areaScores),
        baseline: fromAreaScores(saved.baseline),
        revisions: Math.max(0, saved.draftHistory.length - 1),
      });
      // 리치 HTML 복원(reducer 외부): sig + htmlToPlain(html) === savedBody 둘 다 만족할 때만
      // 저장 HTML을 신뢰한다. sig는 같더라도 html의 평문이 세션 마지막 draft와 다르면
      // (quota 실패·탭 레이스 등으로 html이 stalе) 세션 평문에서 HTML을 재생성한다.
      // state.body는 RESTORE 액션으로 이미 savedBody로 설정되어 있으며,
      // html 신뢰 분기에서도 htmlToPlain(html) === savedBody이므로 추가 EDIT 동기화 불필요.
      const savedBody = lastDraft.body;
      const savedHtmlEntry = loadBodyHtml();
      if (
        savedHtmlEntry &&
        savedHtmlEntry.sig === assignmentSig(assignment) &&
        htmlToPlain(savedHtmlEntry.html) === savedBody
      ) {
        setBodyHtml(savedHtmlEntry.html); // html is the formatted version of exactly the session's last draft → safe
      } else {
        setBodyHtml(plainToHtml(savedBody)); // mismatch/stale/other-assignment → reconstruct from session plain
      }
    } else if (saved) {
      clearSession();
      clearProcessLog();
    }
    // 마운트 1회(루브릭 읽기 + 세션 복원). dispatch는 안정적이라 deps 불필요.
  }, []);

  // ── 완료 시 끈기 스트릭 1회 증가 ──
  // reducer 외부: done phase 진입 시 과제당 1번만 bumpDoneCount().
  //   doneCountedRef = 같은 마운트 내 effect 재실행 방어. hasDoneCounted(sig) = 새로고침 후 같은 과제
  //   재통과 시 영속 중복집계 방어(RESTORE가 통과 세션을 write로 되살려도 재집계 안 됨).
  useEffect(() => {
    if (state.phase === "done" && !doneCountedRef.current) {
      doneCountedRef.current = true;
      const sig = assignmentSig(assignment);
      if (!hasDoneCounted(sig)) { markDoneCounted(sig); setDoneStreak(bumpDoneCount()); }
      else setDoneStreak(loadDoneCount());
    }
  }, [state.phase]);

  // ── 첫 점검 (봐줘) ──
  // 매 렌더 새 클로저 — 호출 시점의 최신 state.body를 캡처(stale 방지). 의존성 추적 불필요.
  // Codex/E2E 가드: 빈 캔버스에서 [봐줘] 클릭 시 코치 호출 안 함 (write 상태 유지, nudge 미생성).
  const runCheck = async () => {
    if (!state.body.trim()) return;
    dispatch({ type: "CHECK_START" });
    const r = await callCoach(state.body, assignment, rubricRef.current, mode);
    if (!r.ok) {
      if (r.auth) {
        dispatch({ type: "AUTH_EXPIRED" }); // 글 보존하고 write 복귀
        onAuthExpired?.();
        return;
      }
      dispatch({ type: "ERROR", message: r.message, retryable: r.retryable });
      return;
    }
    const scores = toScoreMap(r.output);
    const focus = pickFocus(scores, r.output.nudges);
    setCurrentNudge(focus?.nudge ?? null);
    setSheetExpanded(true);

    // ── 세션 배선 ──
    // 첫 점검(세션 없음): createSession으로 최초 draft+점수+rubricText(교사 정렬 기준) 기록.
    // 이후 [봐줘](복원 후 등): 본문이 직전 draft에서 바뀌었을 때만 recordRevision(불필요한 회차 인플레 방지).
    //   바뀌지 않았으면 점수만 최신화(같은 draft 재점검) — 세션을 새 객체로 교체하되 draftHistory는 보존.
    const areaScores = toAreaScores(scores);
    const sess = sessionRef.current;
    let revisionTracked = false;
    if (!sess) {
      sessionRef.current = createSession(sessionAssignment(assignment), state.body, areaScores, rubricRef.current);
    } else {
      const lastBody = sess.draftHistory[sess.draftHistory.length - 1]?.body ?? "";
      if (state.body !== lastBody) {
        // 본문이 바뀐 채로 다시 [봐줘] = 고쳐쓰기 1회. focus 영역 기준 before/after 기록.
        const area = focus?.area ?? AREAS[0];
        const before = sess.areaScores.find((s) => s.area === area)?.score ?? 0;
        const after = scores[area] ?? 0;
        sessionRef.current = recordRevision(sess, state.body, areaScores, area, before, after);
        revisionTracked = true;
      } else {
        // 같은 본문 재점검 — draftHistory는 그대로 두고 최신 areaScores만 갱신(불변 교체).
        sessionRef.current = { ...sess, areaScores };
      }
    }
    persist(sessionRef.current);

    dispatch({ type: "CHECK_OK", scores, nudges: r.output.nudges });
    // Codex PR #71 round 2: process log에 revision 기록 시 학생 화면 카운트도 동기화.
    if (revisionTracked) dispatch({ type: "REVISION_TRACKED" });
  };

  // ── 재점검 (고쳤어 ✓) ──
  const runRecheck = async () => {
    // Codex PR #71 round 2: 본문이 직전 draft에서 실제로 변경됐는지 먼저 확인.
    //   안 바뀐 채 [고쳤어 ✓] = 새 회차 기록 X. 학생이 안 고치고 클릭만 했는데 교사 로그에
    //   '직접 고쳐 쓴 과정'이 부풀려지는 회귀 차단.
    const lastBody = sessionRef.current?.draftHistory[sessionRef.current.draftHistory.length - 1]?.body ?? "";
    const wasRevised = sessionRef.current ? state.body !== lastBody : true;
    dispatch({ type: "RECHECK_START" });
    const r = await callCoach(state.body, assignment, rubricRef.current, mode);
    if (!r.ok) {
      if (r.auth) {
        dispatch({ type: "AUTH_EXPIRED" });
        onAuthExpired?.();
        return;
      }
      dispatch({ type: "ERROR", message: r.message, retryable: r.retryable });
      return;
    }
    const scores = toScoreMap(r.output);
    setSheetExpanded(true);

    // ── 세션 배선: 본문이 실제로 바뀌었을 때만 recordRevision(과정 로그 부풀림 방지) ──
    const area = state.focusArea ?? AREAS[0];
    const before = state.focusBefore;
    const after = scores[area] ?? 0;
    const areaScores = toAreaScores(scores);
    if (!sessionRef.current) {
      // 이론상 RECHECK 전 CHECK 필수라 발생 불가지만 방어적으로 세션 생성.
      sessionRef.current = createSession(sessionAssignment(assignment), state.body, areaScores, rubricRef.current);
    } else if (wasRevised) {
      sessionRef.current = recordRevision(sessionRef.current, state.body, areaScores, area, before, after);
    } else {
      // 본문 미변경 — areaScores만 갱신(같은 draft 재점검).
      sessionRef.current = { ...sessionRef.current, areaScores };
    }
    persist(sessionRef.current);

    dispatch({ type: "RECHECK_OK", scores, nudges: r.output.nudges, wasRevised });
  };

  // ── 다음 (성장막대 → 다음 nudge 또는 완료) ──
  // Codex PR #71 round 2: 직전 lastNudges + 현재 scores로 next focus 추출 — 남은 약점이 있으면
  //   추가 서버 호출 없이 nudge phase로 직접 진입(UX 약속). 없으면 FINISH.
  const runNext = () => {
    const scores = state.scores ?? emptyScores();
    const nextFocus = pickFocus(scores, state.lastNudges);
    if (!nextFocus) {
      // 완료 시점 과정 로그를 한 번 더 확정 저장(교사 /teacher/log).
      setCurrentNudge(null);
      if (sessionRef.current) persist(sessionRef.current);
      dispatch({ type: "FINISH" });
    } else {
      // 같은 응답 안의 다음 우선순위 nudge로 이어가기.
      setCurrentNudge(nextFocus.nudge);
      setSheetExpanded(true);
      dispatch({ type: "NEXT" });
    }
  };

  // ── 음성 삽입 핸들러 — VoicePanel onInsert 콜백. 에디터 doc에 직접 paragraph append.
  //   기존 서식(heading/bold/font-size) 보존 + stale closure 없음. ──
  const handleVoiceInsert = (text: string) => { editorRef.current?.insertBlock(text); };

  // ── 시트 위치 결정 ──
  const sheetPosition: SheetPosition = useMemo(() => {
    if (state.phase === "done") return "hidden";
    if (state.phase === "write") return "peek"; // [봐줘] CTA만
    if (state.phase === "checking" || state.phase === "rechecking") return "open";
    return sheetExpanded ? "open" : "peek";
  }, [state.phase, sheetExpanded]);

  // ── 루브릭 칩(약점 표시) ──
  const weakAreas = useMemo(() => {
    if (!state.scores) return new Set<AreaName>();
    return new Set(NUDGEABLE.filter((a) => (state.scores?.[a] ?? 0) < PASS));
  }, [state.scores]);

  const reset = () => {
    setCurrentNudge(null);
    setSheetExpanded(false);
    setOutlineCollapsed(false); // 새 라운드는 개요 패널 다시 열림
    setBodyHtml("");
    clearBodyHtml();
    setCoachSpellcheck(false); // 새 라운드는 맞춤법 토글 OFF로 초기화(기본값)
    // 라이브 세션·과정 로그도 초기화(새 라운드는 깨끗한 궤적에서 시작).
    sessionRef.current = null;
    clearSession();
    clearProcessLog();
    // 새 과제는 다시 카운트 가능(끈기 스트릭 중복 방지 ref 초기화).
    doneCountedRef.current = false;
    dispatch({ type: "RESET" });
  };

  const handleNewAssignment = () => {
    // 기존 reset()으로 세션·과정 로그·상태 초기화 후, 가이드 메모도 제거하고 onNewAssignment 콜백 호출.
    // reset() 내부에서 doneCountedRef.current = false 처리됨 — 새 과제 재카운트 가능.
    reset();
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem("pwc-guide-memos-v1");
      } catch {
        /* swallow — 영속 실패가 흐름을 막지 않는다. */
      }
      try {
        window.localStorage.removeItem("pwc-outline-v1");
      } catch {
        /* swallow — 영속 실패가 흐름을 막지 않는다. */
      }
    }
    onNewAssignment?.();
  };

  return (
    <div className={`${styles.root} ${styles.stageBg} flex w-full flex-col items-center`}>
      {/* OS 토픽바 */}
      <header className="sticky top-0 z-[60] w-full border-b border-[var(--line)] bg-white/[0.82] backdrop-blur-md backdrop-saturate-150">
        <div className="mx-auto flex h-[60px] max-w-[1280px] items-center gap-3.5 px-[22px]">
          <span className="flex items-center gap-[9px]">
            <span className="grid h-[30px] w-[30px] place-items-center rounded-[9px] bg-[var(--pullim-blue)] shadow-[inset_0_0_0_2px_rgba(255,255,255,0.2)]">
              <MastGlyph size={20} />
            </span>
            <span className={`${styles.brandFont} text-[18px] font-bold tracking-[-0.02em]`}>풀림</span>
            <span className={`${styles.monoFont} -ml-[3px] text-[11px] text-[var(--ink-4)]`}>OS</span>
          </span>
          <span className="flex items-center gap-2 rounded-[var(--r-pill)] bg-[var(--pb-1)] px-3 py-1.5 text-[13px] font-semibold text-[var(--pullim-blue)]">
            <BlockIcon name="pen" size={18} /> 라이팅 코치
          </span>
          <span className="flex-1" />
          <span
            className={`${styles.monoFont} inline-block rounded bg-[var(--pullim-lemon)] px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--pullim-ink)]`}
          >
            체험
          </span>
        </div>
      </header>

      {/* 무대 리드 카피 */}
      <div className="flex w-full max-w-[1280px] items-center justify-between gap-4 px-[22px] pt-[18px]">
        <p className="max-w-[60ch] text-[13.5px] text-[var(--ink-3)]">
          직접 고쳐보세요. 코치는 답을 <b className="text-[var(--pullim-ink)]">주지 않고</b> 질문으로
          끌어냅니다 — 고칠수록 막대가 <b className="text-[var(--pullim-ink)]">블루</b>로 차고, 새로 자란
          칸은 <b className="text-[var(--pullim-ink)]">레몬</b>으로 빛납니다.
        </p>
      </div>

      {/* 디바이스 */}
      <div className="relative mx-auto mb-[26px] mt-[18px] w-full max-w-[432px] overflow-hidden rounded-[var(--r-xl)] border border-[var(--line)] bg-white shadow-[var(--sh-3)]">
        <div className="relative flex h-[min(76vh,690px)] min-h-[560px] flex-col overflow-hidden bg-white">
          {/* 과제 헤더 */}
          <div className="border-b border-[var(--line-2)] bg-gradient-to-b from-[var(--pb-1)] to-white px-[18px] pb-[13px] pt-4">
            <div className="flex items-center gap-[11px]">
              <BlockIcon name="pen" size={38} className="rounded-[var(--r-md)]" />
              <div>
                <div className={`${styles.brandFont} text-[16px] font-bold tracking-[-0.01em]`}>
                  {assignmentTitle}
                </div>
                <div className={`${styles.monoFont} mt-px text-[10.5px] text-[var(--ink-4)]`}>
                  수행평가 · {assignment.genre} · 채점 5영역
                </div>
              </div>
            </div>
            {/* 루브릭 칩 */}
            <div className="mt-[11px] flex flex-wrap gap-1.5" aria-label="채점 5영역">
              {AREAS.map((a) => {
                const weak = weakAreas.has(a);
                return (
                  <span
                    key={a}
                    className={
                      weak
                        ? "inline-flex items-center gap-[5px] rounded-[var(--r-pill)] bg-white px-2.5 py-[3px] text-[11.5px] font-semibold text-[var(--pullim-blue)] shadow-[inset_0_0_0_1.5px_var(--pb-3)]"
                        : "inline-flex items-center gap-[5px] rounded-[var(--r-pill)] bg-[var(--pb-1)] px-2.5 py-[3px] text-[11.5px] font-semibold text-[var(--ink-4)]"
                    }
                  >
                    {weak && (
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--pullim-lemon)]" aria-hidden />
                    )}
                    {a}
                  </span>
                );
              })}
            </div>
          </div>

          {/* 음성 패널 — mode=voice + done 아님. Canvas 위에 배치해 BottomSheet 겹침 방지. busy 중에도 마운트 유지(전사 보존). */}
          {mode === "voice" && state.phase !== "done" && (
            <div className="px-[18px] pt-2">
              <VoicePanel onInsert={handleVoiceInsert} disabled={busy} />
            </div>
          )}

          {/* 캔버스 */}
          <Canvas
            valueHtml={bodyHtml}
            onChange={({ html, text }) => { setBodyHtml(html); saveBodyHtml(assignmentSig(assignment), html); dispatch({ type: "EDIT", body: text }); }}
            disabled={busy || state.phase === "done"}
            spellcheck={coachSpellcheck}
            onToggleSpellcheck={() => setCoachSpellcheck((v) => !v)}
            editorRef={editorRef}
          />

          {/* 가이드 패널 — mode=guide + write 단계일 때만. 직교 패널(reducer 무수정). */}
          {mode === "guide" && state.phase === "write" && (
            <div className="px-[18px] pb-[64px]">
              <GuidePanel genre={assignment.genre} />
            </div>
          )}

          {/* 개요 패널 — mode=outline + write 단계 + 패널 미접힘일 때만. 직교 패널(reducer 무수정). */}
          {mode === "outline" && state.phase === "write" && !outlineCollapsed && (
            <div className="px-[18px] pb-[64px]">
              <OutlinePanel
                genre={assignment.genre}
                onStartBody={() => {
                  setOutlineCollapsed(true);
                  editorRef.current?.focus();
                }}
              />
            </div>
          )}

          {/* 접은 뒤 재오픈 affordance — '개요를 계속 참고하며 쓰기'를 보장(한 번 보고 숨김 회귀 방지). */}
          {mode === "outline" && state.phase === "write" && outlineCollapsed && (
            <div className="px-[18px] pb-[64px]">
              <button
                type="button"
                onClick={() => setOutlineCollapsed(false)}
                className="text-subtle-foreground hover:text-foreground text-xs underline underline-offset-2"
              >
                개요 다시 보기
              </button>
            </div>
          )}

          {/* 바텀시트 */}
          <BottomSheet
            position={sheetPosition}
            onToggle={
              state.phase === "nudge" || state.phase === "growth"
                ? () => setSheetExpanded((v) => !v)
                : undefined
            }
          >
            <SheetBody
              state={state}
              currentNudge={currentNudge}
              busy={busy}
              onAsk={runCheck}
              onFixed={runRecheck}
              onNext={runNext}
              onRetry={state.phase === "rechecking" ? runRecheck : runCheck}
            />
          </BottomSheet>

          {/* 완료화면 */}
          <CompletionView state={state} onRestart={reset} onNewAssignment={handleNewAssignment} session={sessionRef.current} doneStreak={doneStreak} assignment={assignment} />
        </div>
      </div>

      <p className={`${styles.monoFont} max-w-[432px] px-[26px] pb-10 text-center text-[10px] leading-[1.7] text-[var(--ink-5)]`}>
        코치는 설계상 문장을 생성하지 않습니다 · 풀림 OS 디자인 시스템 적용
      </p>
    </div>
  );
}

// ── 시트 본문(상태별 분기) ──────────────────────────────────────────
function SheetBody({
  state,
  currentNudge,
  busy,
  onAsk,
  onFixed,
  onNext,
  onRetry,
}: {
  state: State;
  currentNudge: CoachNudge | null;
  busy: boolean;
  onAsk: () => void;
  onFixed: () => void;
  onNext: () => void;
  onRetry: () => void;
}) {
  // 에러 우선.
  if (state.error) {
    return (
      <div role="alert" className="py-2">
        <p className="text-[14px] text-[var(--ink-2)]">{state.error.message}</p>
        {state.error.retryable && (
          <button
            type="button"
            onClick={onRetry}
            className={`${styles.brandFont} mt-3 inline-flex w-full items-center justify-center rounded-xl bg-[var(--pullim-blue)] px-4 py-3 text-[14px] font-semibold text-white shadow-[0_4px_14px_rgba(3,98,218,0.24)]`}
          >
            다시 시도하기
          </button>
        )}
      </div>
    );
  }

  if (state.phase === "checking" || state.phase === "rechecking") {
    return (
      <div
        className={`${styles.monoFont} flex items-center justify-center gap-2 py-[18px] text-[12px] text-[var(--pullim-blue)]`}
        role="status"
        aria-live="polite"
      >
        <BlockIcon name="mark" size={22} />
        코치가 글을 읽는 중<span className={styles.thinkingDots}>…</span>
      </div>
    );
  }

  if (state.phase === "write") {
    return (
      <button
        type="button"
        data-testid="coach-ask"
        onClick={onAsk}
        className={`${styles.brandFont} flex w-full cursor-pointer items-center justify-center gap-[9px] py-3 text-[14px] font-semibold text-[var(--pullim-blue)]`}
      >
        ✍️ 다 썼으면 코치에게 봐달라고 해봐 <span className={styles.arrowBob}>↑</span>
      </button>
    );
  }

  if (state.phase === "nudge" && currentNudge) {
    return (
      <NudgeCard
        nudge={currentNudge}
        onFixed={onFixed}
        why={WHY_BY_AREA[currentNudge.rubric_area]}
        busy={busy}
      />
    );
  }

  if (state.phase === "growth" && state.focusArea) {
    const improved = state.focusAfter > state.focusBefore;
    const resolved = state.focusAfter >= PASS;
    const head = resolved
      ? "좋아졌어 — 통과!"
      : improved
        ? "거의 왔어, 한 걸음 더!"
        : "아직 더 끌어낼 수 있어";
    return (
      <div>
        <div className="flex items-center gap-[9px]">
          <BlockIcon name="grow" size={30} />
          <div>
            <h4 className={`${styles.brandFont} mb-px text-[16px]`}>{head}</h4>
            <p className={`${styles.monoFont} text-[12px] text-[var(--ink-4)]`}>{state.focusArea}</p>
          </div>
        </div>
        <GrowthRow
          area={state.focusArea}
          before={state.focusBefore}
          after={state.focusAfter}
        />
        <div className="mt-3.5 flex gap-2">
          <button
            type="button"
            data-testid="coach-next"
            onClick={onNext}
            className={`${styles.brandFont} inline-flex flex-1 items-center justify-center rounded-xl bg-[var(--pullim-blue)] px-4 py-3 text-[14px] font-semibold text-white shadow-[0_4px_14px_rgba(3,98,218,0.24)] transition hover:-translate-y-px active:scale-[0.98]`}
          >
            다음 ▸
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// ── 완료화면 ────────────────────────────────────────────────────────
function CompletionView({
  state,
  onRestart,
  onNewAssignment,
  session,
  doneStreak,
  assignment,
}: {
  state: State;
  onRestart: () => void;
  onNewAssignment: () => void;
  session: CoachSession | null;
  doneStreak: number;
  assignment: CoachAssignment;
}) {
  const [wedgeOpen, setWedgeOpen] = useState(false);
  const on = state.phase === "done";
  const baseline = state.baseline ?? emptyScores();
  const scores = state.scores ?? emptyScores();
  const finalChars = Array.from(state.body.trim()).length;

  const rows = AREAS.map((a) => ({ area: a, before: baseline[a] ?? 0, after: scores[a] ?? 0 }));

  return (
    <div
      data-testid="coach-done"
      className={`${styles.done} ${on ? styles.doneOn : ""} absolute inset-0 overflow-auto px-5 pb-[30px] pt-6`}
      aria-hidden={!on}
      role={on ? "region" : undefined}
      aria-label="완료"
    >
      <div className={`${styles.monoFont} flex items-center gap-2 text-[11px] tracking-[0.16em] text-[var(--pullim-blue)]`}>
        <BlockIcon name="seal" size={16} />
        RECHECK COMPLETE · 통과
      </div>
      <h2 className={`${styles.brandFont} mb-1 mt-[9px] text-[25px] tracking-[-0.02em]`}>
        네 손으로 더 잘 썼어.
      </h2>
      <p className="mb-4 text-[14px] text-[var(--ink-3)]">
        코치는 질문만 했고, 문장은 전부 네가 썼어. 그 ‘과정’이 그대로 남았어.
      </p>

      <GrowthBars rows={rows} animate={on} />

      {session ? <BreakthroughBadge areas={selectBreakthroughs(buildProcessLog(session))} /> : null}

      <PersistDots count={doneStreak} />
      {session ? <ProcessTimeline nodes={buildTimeline(session)} /> : null}

      {/* 공유 카드 title은 검증된 과제명만 — 없으면 자유입력 prompt_text가 아니라 안전한 장르 기반 일반명 사용. */}
      {session ? <ShareStory text={formatStoryText({ title: assignment.title ?? `${assignment.genre} 글`, genre: assignment.genre, revisions: state.revisions, breakthroughs: selectBreakthroughs(buildProcessLog(session)) })} /> : null}

      {/* 과정 로그 */}
      <div className="mt-[18px] rounded-[var(--r-lg)] border border-[var(--line)] bg-white p-[18px] shadow-[var(--sh-1)]">
        <div className={`${styles.monoFont} mb-2.5 flex items-center gap-[7px] text-[11px] tracking-[0.08em] text-[var(--pullim-blue)]`}>
          <BlockIcon name="seal" size={15} />
          과정 로그 — 교사·부모가 확인하는 증거
        </div>
        <LogRow k="고쳐쓰기" v={`${state.revisions}회`} />
        <LogRow k="최종 분량" v={`${finalChars.toLocaleString("ko-KR")}자`} />
        <LogRow k="코치가 준 문장" v="0개" highlight />
        <LogRow k="작성 주체" v="학생 본인" />
      </div>

      <span className="mt-3.5 inline-flex items-center gap-2 rounded-[var(--r-pill)] bg-[var(--pullim-lemon)] px-3.5 py-2 text-[12.5px] font-bold text-[var(--pullim-ink)]">
        🔒 직접 쓴 글 — 들켜도 떳떳해요
      </span>

      {/* "다른 AI였다면?" 웨지 */}
      <div className="mt-4 overflow-hidden rounded-[var(--r-lg)] border border-[var(--line)] bg-white">
        <button
          type="button"
          onClick={() => setWedgeOpen((v) => !v)}
          aria-expanded={wedgeOpen}
          className="flex w-full cursor-pointer items-center justify-between px-4 py-[13px] text-[13.5px] font-semibold"
        >
          <span>다른 AI였다면?</span>
          <span aria-hidden>{wedgeOpen ? "－" : "＋"}</span>
        </button>
        {wedgeOpen && (
          <div className="px-4 pb-4 text-[13px] leading-relaxed text-[var(--ink-3)]">
            <p className="text-[#E5484D]">
              ❌ 베끼는 AI: 완성 문장을 통째로 만들어 붙여넣기 끝 — 들키면 0점.
            </p>
            <p className="mt-2 font-semibold text-[var(--ok)]">
              ✓ 풀림: 같은 결론도 ‘네가’ 끌어내 썼고, 과정 로그가 그걸 증명해요.
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={onRestart}
          className={`${styles.brandFont} inline-flex w-full items-center justify-center rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-[14px] font-semibold text-[var(--ink-2)] transition hover:border-[var(--ink-4)] hover:bg-[var(--pb-1)]`}
        >
          다시 해보기 ↺
        </button>
        <button
          type="button"
          data-testid="coach-new-assignment"
          onClick={onNewAssignment}
          className={`${styles.brandFont} inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-[13px] font-medium text-[var(--ink-4)] transition hover:text-[var(--ink-2)]`}
        >
          다른 과제로 쓰기
        </button>
      </div>
    </div>
  );
}

function LogRow({ k, v, highlight }: { k: string; v: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-dashed border-[var(--line)] py-[7px] text-[13px] last:border-0">
      <span>{k}</span>
      <b className={`${styles.brandFont} ${highlight ? "text-[var(--ok)]" : ""}`}>{v}</b>
    </div>
  );
}
