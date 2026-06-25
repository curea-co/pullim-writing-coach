"use client";

// app/hooks/useScoreForm.ts
// Pure logic hook extracted from ScoreForm.tsx — no JSX.
// All state, effects, handlers, and derived values migrated verbatim.
// ScoreForm.tsx is NOT yet modified (done in Task 7/9).

import { useEffect, useRef, useState } from "react";
import {
  BODY_MAX,
  BODY_MIN,
  charCount,
  type ErrorCode,
  ERROR_MESSAGE,
  normalizeBody,
  PROMPT_MAX,
  PROMPT_MIN,
  TARGET_MAX,
  TARGET_MIN,
} from "@/app/lib/grading";
import type { F3Output } from "@/app/data/scoring";
import {
  addResult,
  addRevision,
  clearDraft,
  type DraftSnapshot,
  getMostUsedMeta,
  getThread,
  loadDraft,
  recordMetaUsage,
  type RevisionEntry,
  saveDraft,
} from "@/app/lib/storage";
import { computeProgress } from "@/app/lib/progress";
import { plainToHtml } from "@/app/lib/editor-doc";
import { DEMO_TOKEN_KEY } from "@/app/components/TokenGate";

// 요청 계약 (contract §3.1). body 는 **원본** — 정규화·char_count 는 서버 권위.
type ScoreRequest = {
  assignment: {
    school_level: string;
    subject: string;
    genre: string;
    target_char_count: number | null;
    prompt_text: string;
  };
  submission: { body: string };
  meta: { client_version: string; submitted_at: string; attempt_no: number };
};

// 서버 에러 중 재시도가 의미 있는 코드(전송/업스트림 일시 장애·타임아웃·재호출 후 무효). 12 §5.2.
const RETRYABLE: ReadonlySet<string> = new Set([
  "E4",
  "E5",
  "E6",
  "E8",
  "E-PARSE",
  "E-CAP",
  "E-NET",
]);

export type SubmitState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "result"; output: F3Output; assignment: ScoreRequest["assignment"] }
  | { phase: "error"; code: string; message: string; retryable: boolean };

export type UseScoreFormReturn = {
  // ── Essay field ──────────────────────────────────────────────────────
  body: string;
  setBody: (v: string) => void;
  bodyHtml: string;                 // RichEditor HTML(서식 보존) — StepEssay valueHtml로 전달
  onEditorChange: (c: { html: string; text: string }) => void;  // RichEditor onChange — bodyHtml/body 원자적 갱신
  bodyCount: number;                // charCount(normalizeBody(body))
  bodyError: { code: string; message: string } | null;
  bodyOk: boolean;
  progressState: ReturnType<typeof computeProgress> | null;  // null when no targetNum

  // ── File input ───────────────────────────────────────────────────────
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  fileError: string | null;
  isDraggingFile: boolean;
  handleFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLElement>) => void;
  handleDragOver: (e: React.DragEvent<HTMLElement>) => void;
  handleDragLeave: () => void;

  // ── Draft banner ─────────────────────────────────────────────────────
  restoredDraft: DraftSnapshot | null;
  lastSavedAt: string | null;
  applyRestore: () => void;
  dismissRestore: () => void;

  // ── Clipboard banner ─────────────────────────────────────────────────
  clipboardPreview: string | null;
  applyClipboard: () => void;
  dismissClipboard: () => void;

  // ── Meta fields ──────────────────────────────────────────────────────
  schoolLevel: string;
  setSchoolLevel: (v: string) => void;
  subject: string;
  setSubject: (v: string) => void;
  genre: string;
  setGenre: (v: string) => void;
  targetRaw: string;
  setTargetRaw: (v: string) => void;
  targetNum: number | null;
  targetInvalid: boolean;
  promptText: string;
  setPromptText: (v: string) => void;

  // ── Validation ───────────────────────────────────────────────────────
  requiredOk: boolean;
  canSubmit: boolean;
  locked: boolean;
  missingFields: string[];   // ["학교·학년", "과목", "장르", "과제 내용(10자 이상)"] etc.

  // ── Submit state ─────────────────────────────────────────────────────
  submitState: SubmitState;
  handleSubmit: (e: React.FormEvent) => void;
  retry: () => void;
  handleResubmit: () => void;   // returns to step essay (caller controls `step` state)

  // ── Refs for scroll ──────────────────────────────────────────────────
  outcomeRef: React.RefObject<HTMLDivElement | null>;

  // ── Revision ─────────────────────────────────────────────────────────
  revisionPair: { v1: RevisionEntry; v2: RevisionEntry } | null;
};

export function useScoreForm(opts: {
  onAuthExpired?: () => void;
  defaults?: { school_level?: string; subject?: string; genre?: string };
  onResubmit?: () => void;
}): UseScoreFormReturn {
  const { onAuthExpired, defaults, onResubmit } = opts;

  // 초기값 우선순위: profile defaults > LRU 최빈값 > 빈 문자열.
  const [schoolLevel, setSchoolLevel] = useState(
    () => defaults?.school_level ?? getMostUsedMeta("school_level") ?? "",
  );
  const [subject, setSubject] = useState(
    () => defaults?.subject ?? getMostUsedMeta("subject") ?? "",
  );
  const [genre, setGenre] = useState(
    () => defaults?.genre ?? getMostUsedMeta("genre") ?? "",
  );
  const [targetRaw, setTargetRaw] = useState(() => getMostUsedMeta("target_raw") ?? "");
  const [promptText, setPromptText] = useState("");
  const [body, setBody] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>({ phase: "idle" });

  // 제출 횟수(첫 제출=1, 새 제출마다 +1). 재시도는 유지.
  const submitCount = useRef(0);
  // 직전에 실제 전송한 payload — '다시 시도하기'는 이걸 그대로 재전송한다.
  const lastPayload = useRef<ScoreRequest | null>(null);
  // #1 수정 전/후 비교
  const [revisionThreadId, setRevisionThreadId] = useState<string | null>(null);
  const [revisionPair, setRevisionPair] = useState<{ v1: RevisionEntry; v2: RevisionEntry } | null>(
    null,
  );
  // #9 본문 자동 저장 — 마운트 시 draft 발견하면 명시적 배너.
  const [restoredDraft, setRestoredDraft] = useState<DraftSnapshot | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  // #B 클립보드 자동 감지
  const [clipboardPreview, setClipboardPreview] = useState<string | null>(null);
  // #C 파일 업로드/드롭
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  // Refs for scroll
  const outcomeRef = useRef<HTMLDivElement>(null);

  // #9 마운트 시 1회 — 저장된 draft가 있으면 배너로 사용자에게 선택권 부여.
  useEffect(() => {
    const draft = loadDraft();
    if (
      draft &&
      (draft.body.trim().length > 0 || (draft.prompt_text ?? "").trim().length > 0)
    ) {
      setRestoredDraft(draft);
    }
  }, []);

  // #B 마운트 시 1회 — 클립보드에 의미 있는 텍스트가 있으면 배너로 1클릭 붙여넣기 제공.
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.clipboard?.readText) return;
    if (loadDraft() !== null) return;
    let cancelled = false;
    navigator.clipboard
      .readText()
      .then((text) => {
        if (cancelled) return;
        const trimmed = text?.trim() ?? "";
        if (trimmed.length >= 30) setClipboardPreview(text);
      })
      .catch(() => {
        // 권한 거절 / 미지원 — 조용히 폴백
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Codex PR #36: 사용자가 타이핑 시작한 후 본문 비워도 클립보드 배너 다시 안 나타나도록.
  useEffect(() => {
    if (body.length > 0 && clipboardPreview !== null) {
      setClipboardPreview(null);
    }
  }, [body, clipboardPreview]);

  // #9 자동 저장 — debounce 800ms.
  useEffect(() => {
    if (submitState.phase !== "idle") return;
    if (restoredDraft !== null) return;
    const meaningful = body.trim().length > 0 || promptText.trim().length > 0;
    if (!meaningful) return;
    const t = setTimeout(() => {
      const res = saveDraft({
        body,
        body_html: bodyHtml,
        school_level: schoolLevel || undefined,
        subject: subject || undefined,
        genre: genre || undefined,
        target_raw: targetRaw || undefined,
        prompt_text: promptText || undefined,
      });
      if (res.ok) setLastSavedAt(res.saved_at);
    }, 800);
    return () => clearTimeout(t);
  }, [body, bodyHtml, schoolLevel, subject, genre, targetRaw, promptText, submitState.phase, restoredDraft]);

  // #9 제출 성공 시 draft 폐기.
  useEffect(() => {
    if (submitState.phase === "result") {
      clearDraft();
      setLastSavedAt(null);
    }
  }, [submitState.phase]);

  function applyRestore() {
    if (!restoredDraft) return;
    setBody(restoredDraft.body);
    setBodyHtml(restoredDraft.body_html ?? plainToHtml(restoredDraft.body));
    if (restoredDraft.school_level) setSchoolLevel(restoredDraft.school_level);
    if (restoredDraft.subject) setSubject(restoredDraft.subject);
    if (restoredDraft.genre) setGenre(restoredDraft.genre);
    if (restoredDraft.target_raw) setTargetRaw(restoredDraft.target_raw);
    if (restoredDraft.prompt_text) setPromptText(restoredDraft.prompt_text);
    setLastSavedAt(restoredDraft.saved_at);
    setRestoredDraft(null);
  }

  function dismissRestore() {
    setRestoredDraft(null);
    clearDraft();
    setLastSavedAt(null);
  }

  function applyClipboard() {
    if (!clipboardPreview) return;
    setBody(clipboardPreview);
    setBodyHtml(plainToHtml(clipboardPreview));
    setClipboardPreview(null);
  }

  function dismissClipboard() {
    setClipboardPreview(null);
  }

  // RichEditor onChange — bodyHtml(서식)·body(평문 투영)를 원자적으로 갱신.
  const onEditorChange = (c: { html: string; text: string }) => {
    setBodyHtml(c.html);
    setBody(c.text);
  };

  // #C/#M3 ② 파일 → 텍스트 변환.
  async function readTextFile(file: File) {
    setFileError(null);
    const isDocx =
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      /\.docx$/i.test(file.name);
    const isTextLike =
      file.type === "text/plain" ||
      file.type === "text/markdown" ||
      /\.(txt|md|markdown)$/i.test(file.name);
    const isHwp = /\.(hwp|hwpx)$/i.test(file.name);
    if (isHwp) {
      setFileError(
        "HWP 파일은 아직 직접 읽지 못해요. 한컴오피스에서 [다른 이름으로 저장] → 형식을 DOCX(.docx)로 바꿔서 다시 올려 주세요. 또는 본문을 복사해 위 영역에 직접 붙여넣으셔도 돼요.",
      );
      return;
    }
    if (!isDocx && !isTextLike) {
      setFileError(
        "이 형식은 아직 지원하지 않아요(.txt·.md·.docx만 가능). 사진·링크는 추후 추가 예정.",
      );
      return;
    }
    const MAX_FILE = isDocx ? 5 * 1024 * 1024 : 1 * 1024 * 1024;
    if (file.size > MAX_FILE) {
      const sizeLabel = isDocx
        ? `${(file.size / 1024 / 1024).toFixed(1)}MB`
        : `${Math.round(file.size / 1024)}KB`;
      const limitLabel = isDocx ? "5MB" : "1MB";
      setFileError(`파일이 너무 커요(${sizeLabel}). ${limitLabel} 이하로 줄여 주세요.`);
      return;
    }
    try {
      let text: string;
      if (isDocx) {
        const mammoth = await import("mammoth");
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value ?? "";
        if (!text.trim()) {
          setFileError("DOCX에서 본문을 찾지 못했어요. 파일이 비어 있거나 손상됐을 수 있어요.");
          return;
        }
      } else {
        const buffer = await file.arrayBuffer();
        try {
          text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
        } catch {
          try {
            text = new TextDecoder("euc-kr").decode(buffer);
          } catch {
            setFileError(
              "파일 인코딩을 알아보지 못했어요. UTF-8로 다시 저장하거나 본문을 직접 붙여넣어 주세요.",
            );
            return;
          }
        }
      }
      const MAX_EXTRACTED = BODY_MAX * 4;
      if (text.length > MAX_EXTRACTED) {
        setFileError(
          `파일에서 추출된 텍스트가 너무 길어요(${text.length}자). 직접 ${BODY_MAX}자 이하로 잘라서 붙여넣어 주세요.`,
        );
        return;
      }
      setBody(text);
      setBodyHtml(plainToHtml(text));
    } catch {
      setFileError(
        isDocx
          ? "DOCX 파일을 읽지 못했어요. 다른 .docx 파일로 시도하거나 본문을 직접 붙여넣어 주세요."
          : "파일을 읽지 못했어요. 본문을 직접 붙여넣어 주세요.",
      );
    }
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void readTextFile(file);
    if (e.target) e.target.value = "";
  }

  function hasFilesInDataTransfer(dt: DataTransfer): boolean {
    return Array.from(dt.types || []).includes("Files");
  }

  function handleDrop(e: React.DragEvent<HTMLElement>) {
    if (!hasFilesInDataTransfer(e.dataTransfer)) {
      setIsDraggingFile(false);
      return;
    }
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void readTextFile(file);
  }

  function handleDragOver(e: React.DragEvent<HTMLElement>) {
    if (!hasFilesInDataTransfer(e.dataTransfer)) {
      return;
    }
    e.preventDefault();
    if (!isDraggingFile) setIsDraggingFile(true);
  }

  function handleDragLeave() {
    setIsDraggingFile(false);
  }

  // ── 파생 검증값 ─────────────────────────────────────────────────────
  const bodyCount = charCount(normalizeBody(body));
  const targetTrimmed = targetRaw.trim();
  const targetNum = targetTrimmed === "" ? null : Number(targetTrimmed);
  const targetInvalid =
    targetTrimmed !== "" &&
    (!Number.isInteger(targetNum) ||
      (targetNum as number) < TARGET_MIN ||
      (targetNum as number) > TARGET_MAX);

  const promptOk =
    promptText.trim().length >= PROMPT_MIN &&
    promptText.trim().length <= PROMPT_MAX;
  const requiredOk = !!schoolLevel && !!subject && !!genre && promptOk;

  // 본문 에러 코드
  let bodyError: { code: string; message: string } | null = null;
  if (body.trim().length > 0) {
    if (bodyCount > BODY_MAX) {
      bodyError = { code: "E3", message: "2,000자까지 첨삭할 수 있어요" };
    } else if (bodyCount < BODY_MIN) {
      bodyError =
        body.trim().length >= BODY_MIN
          ? {
              code: "E11",
              message:
                "글에 본문이 충분히 들어 있지 않아요. 학생이 쓴 글 전체를 붙여넣어 주세요",
            }
          : { code: "E2", message: "본문을 50자 이상 입력해 주세요" };
    }
  }

  const bodyOk = bodyCount >= BODY_MIN && bodyCount <= BODY_MAX;
  const progressState = computeProgress(bodyCount, targetNum, BODY_MAX);
  const locked = submitState.phase === "loading" || submitState.phase === "error";
  const canSubmit = requiredOk && bodyOk && !targetInvalid && !locked;

  // missingFields: collect same missing-field strings as the inline IIFE in ScoreForm lines 951–966.
  const missingFields: string[] = [];
  if (!schoolLevel) missingFields.push("학교·학년");
  if (!subject) missingFields.push("과목");
  if (!genre) missingFields.push("장르");
  if (!promptOk) missingFields.push(`과제 내용(${PROMPT_MIN}자 이상)`);
  if (bodyCount < BODY_MIN) missingFields.push(`글(${BODY_MIN}자 이상)`);
  else if (bodyCount > BODY_MAX) missingFields.push(`글(${BODY_MAX}자 이하로 줄여 주세요)`);
  if (targetInvalid) missingFields.push("목표 글자 수");

  // ── 실시간 채점 호출 ────────────────────────────────────────────────
  async function runScore(payload: ScoreRequest) {
    const token = sessionStorage.getItem(DEMO_TOKEN_KEY) ?? "";
    if (!token) {
      onAuthExpired?.();
      return;
    }
    setSubmitState({ phase: "loading" });

    let res: Response;
    try {
      res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-token": token },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(65_000),
      });
    } catch (e) {
      const isTimeout = e instanceof DOMException && e.name === "TimeoutError";
      setSubmitState({
        phase: "error",
        code: isTimeout ? "E4" : "E-NET",
        message: isTimeout
          ? "지금 첨삭이 지연되고 있어요. 다시 시도해 주세요"
          : "인터넷 연결을 확인하고 다시 시도해 주세요",
        retryable: true,
      });
      return;
    }

    if (res.status === 401) {
      setSubmitState({ phase: "idle" });
      onAuthExpired?.();
      return;
    }

    if (res.ok) {
      try {
        const output = (await res.json()) as F3Output;
        addResult({
          assignment: payload.assignment,
          submission: {
            body: payload.submission.body,
            char_count: Array.from(payload.submission.body).length,
          },
          output,
        });

        recordMetaUsage("school_level", payload.assignment.school_level);
        recordMetaUsage("subject", payload.assignment.subject);
        recordMetaUsage("genre", payload.assignment.genre);
        if (payload.assignment.target_char_count !== null) {
          recordMetaUsage("target_raw", String(payload.assignment.target_char_count));
        }

        const revRes = addRevision(revisionThreadId, {
          assignment: payload.assignment,
          submission: {
            body: payload.submission.body,
            char_count: Array.from(payload.submission.body).length,
          },
          output,
        });
        if (revRes.ok) {
          setRevisionThreadId(revRes.thread_id);
          const thread = getThread(revRes.thread_id);
          if (thread && thread.revisions.length >= 2) {
            const rs = thread.revisions;
            setRevisionPair({ v1: rs[rs.length - 2], v2: rs[rs.length - 1] });
          } else {
            setRevisionPair(null);
          }
        }
        setSubmitState({ phase: "result", output, assignment: payload.assignment });
      } catch {
        setSubmitState({
          phase: "error",
          code: "E5",
          message: ERROR_MESSAGE.E5,
          retryable: true,
        });
      }
      return;
    }

    // 서버 에러 봉투
    let code: ErrorCode = "E5";
    try {
      const env = (await res.json()) as { error?: { code?: ErrorCode } };
      if (env?.error?.code) code = env.error.code;
    } catch {
      /* 봉투 파싱 실패 → 기본 E5 */
    }
    setSubmitState({
      phase: "error",
      code,
      message: ERROR_MESSAGE[code] ?? "결과를 다시 만들어야 해요. 다시 시도해 주세요",
      retryable: RETRYABLE.has(code),
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    submitCount.current += 1;
    const payload: ScoreRequest = {
      assignment: {
        school_level: schoolLevel,
        subject,
        genre,
        target_char_count: targetNum,
        prompt_text: promptText.trim(),
      },
      submission: { body },
      meta: {
        client_version: "v0.1",
        submitted_at: new Date().toISOString(),
        attempt_no: submitCount.current,
      },
    };
    lastPayload.current = payload;
    void runScore(payload);
  }

  function retry() {
    if (lastPayload.current) void runScore(lastPayload.current);
  }

  function handleResubmit() {
    // 입력으로 복귀(폼 잠금 해제). 다음 새 제출(handleSubmit)에서 attempt_no가 증가한다.
    // Wizard controls step state — call onResubmit callback instead of setStep(1).
    setSubmitState({ phase: "idle" });
    onResubmit?.();
  }

  return {
    // Essay field
    body,
    setBody,
    bodyHtml,
    onEditorChange,
    bodyCount,
    bodyError,
    bodyOk,
    progressState,

    // File input
    fileInputRef,
    fileError,
    isDraggingFile,
    handleFileInput,
    handleDrop,
    handleDragOver,
    handleDragLeave,

    // Draft banner
    restoredDraft,
    lastSavedAt,
    applyRestore,
    dismissRestore,

    // Clipboard banner
    clipboardPreview,
    applyClipboard,
    dismissClipboard,

    // Meta fields
    schoolLevel,
    setSchoolLevel,
    subject,
    setSubject,
    genre,
    setGenre,
    targetRaw,
    setTargetRaw,
    targetNum,
    targetInvalid,
    promptText,
    setPromptText,

    // Validation
    requiredOk,
    canSubmit,
    locked,
    missingFields,

    // Submit state
    submitState,
    handleSubmit,
    retry,
    handleResubmit,

    // Refs for scroll
    outcomeRef,

    // Revision
    revisionPair,
  };
}
