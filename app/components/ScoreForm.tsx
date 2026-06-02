"use client";

// Pullim Writing Coach — 학생 글 입력 폼 + 실시간 채점 (WBS P3.1 + P3.2)
//
// 근거: 03_wireframe_first_screen_v.3 (블록 A·B·마이크로카피) ·
//       02_functional_spec_v.3 §3 F1·F2·§6 에러 · 12_api_contract §3(요청)·§4(응답)·§5(에러)
//
// P3.2: 제출 → POST /api/score (x-demo-token 헤더) → 로딩/에러/재시도 UX →
//   200이면 결과를 공유 ResultView(=/samples UI)에 바인딩(P3.3). 401이면 TokenGate 재입력.

import { useEffect, useRef, useState } from "react";
import { cn, scrollBehavior } from "@/app/lib/utils";
// 단일 소스 = 트랙 A의 순수 모듈(grading.ts, 계약 §9 S4). enum·길이정책·정규화·char_count·에러카피를
// FE가 그대로 import해 서버와 한 곳에서 맞춘다(중복 구현 = 분기 위험 제거).
import {
  BODY_MAX,
  BODY_MIN,
  charCount,
  type ErrorCode,
  ERROR_MESSAGE,
  GENRES,
  normalizeBody,
  PROMPT_MAX,
  PROMPT_MIN,
  SCHOOL_LEVELS,
  SUBJECTS,
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
import {
  computeProgress,
  getProgressBarClass,
  getProgressTextClass,
} from "@/app/lib/progress";
import MetaForm from "./MetaForm";
import ResultView from "./ResultView";
import Stepper from "./Stepper";
import TextPreviewCard from "./TextPreviewCard";
import { DEMO_TOKEN_KEY } from "./TokenGate";

// #9 본문 자동 저장 — saved_at(ISO) → "M/D HH:MM" 짧은 카피.
//   학생/교사가 한눈에 "최근에 저장됐다" 인식하면 충분 — 초 단위·날짜년도 생략.
function formatSavedAt(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "방금 전";
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const h = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${m}/${day} ${h}:${min}`;
  } catch {
    return "방금 전";
  }
}

// 학년·과목·장르 프리필은 A2 프로필 기반(TokenGate→ScoreForm defaults prop)으로 일원화.
// "자주 쓰는 조합" chip은 프로필 도입 후 중복이라 제거(사용자 피드백 2026-05-29).

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
// E-NET = 클라이언트 네트워크 단절(오프라인). 서버 계약 코드(E8 등)와 구분해 로그·문의 혼선 방지(curea-review-ai 지적).
const RETRYABLE: ReadonlySet<string> = new Set([
  "E4",
  "E5",
  "E6",
  "E8",
  "E-PARSE",
  "E-CAP",
  "E-NET",
]);

type SubmitState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "result"; output: F3Output; assignment: ScoreRequest["assignment"] }
  | { phase: "error"; code: string; message: string; retryable: boolean };

export default function ScoreForm({
  onAuthExpired,
  defaults,
}: {
  onAuthExpired?: () => void; // 401(E-AUTH) 시 TokenGate가 토큰 폐기 + 재입력 노출
  defaults?: {
    // 프로필 기반 프리필 (A2). mount 시점 1회 적용 — 이후 사용자가 자유 편집.
    school_level?: string;
    subject?: string;
    genre?: string;
  };
}) {
  // 초기값 우선순위(#M3 ③): profile defaults > LRU 최빈값 > 빈 문자열.
  //   LRU는 채점 성공마다 recordMetaUsage가 학습 — 자주 쓴 학년·과목·장르·목표 분량을 자연 prefill.
  //   /try는 익명 경로도 정상 지원 — no-profile 사용자에게도 본인의 직전 사용 패턴 prefill.
  //   공용 기기 위험은 /me 데이터 삭제 동선(missing 분기에도 노출)으로 사용자가 인지·차단.
  const [schoolLevel, setSchoolLevel] = useState(
    () => defaults?.school_level ?? getMostUsedMeta("school_level") ?? "",
  );
  const [subject, setSubject] = useState(
    () => defaults?.subject ?? getMostUsedMeta("subject") ?? "",
  );
  const [genre, setGenre] = useState(
    () => defaults?.genre ?? getMostUsedMeta("genre") ?? "",
  );
  // 목표 분량은 프로필에 없음 — LRU만 사용. 빈 문자열 = 제한 없음.
  const [targetRaw, setTargetRaw] = useState(() => getMostUsedMeta("target_raw") ?? "");
  const [promptText, setPromptText] = useState("");
  const [body, setBody] = useState(""); // 학생이 본 원본 — 정규화 전(화면 보존)
  const [submit, setSubmit] = useState<SubmitState>({ phase: "idle" });
  // 제출 횟수(첫 제출=1, 새 제출마다 +1). 새 제출(메인 CTA)만 증가, 재시도(transient 재호출)는 유지.
  const submitCount = useRef(0);
  // 직전에 실제 전송한 payload — '다시 시도하기'는 이걸 그대로 재전송한다(같은 요청·같은 attempt_no).
  const lastPayload = useRef<ScoreRequest | null>(null);
  // #1 수정 전/후 비교 — 이번 폼 라이프타임 동안의 thread id + 직전 두 revision pair.
  const [revisionThreadId, setRevisionThreadId] = useState<string | null>(null);
  const [revisionPair, setRevisionPair] = useState<{ v1: RevisionEntry; v2: RevisionEntry } | null>(
    null,
  );
  // #9 본문 자동 저장 — 마운트 시 draft 발견하면 명시적 "이어 쓰기/새로 시작" 배너.
  //   공용 기기에서 타인 글 자동 노출 방지 → 자동 복원 X.
  const [restoredDraft, setRestoredDraft] = useState<DraftSnapshot | null>(null);
  // 마지막 자동 저장 시각(표시용). null = 아직 저장 안 됨.
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  // #B 클립보드 자동 감지 — 마운트 시 1회 조용히 read. 권한 거절·미지원 → null 유지(폴백).
  //   noise 차단: 30자 미만이면 무시. body·draft 있으면 표시 X(중복 방지).
  const [clipboardPreview, setClipboardPreview] = useState<string | null>(null);
  // #C 파일 업로드/드롭 — textarea 자체가 dropzone. .txt/.md만 v1 지원, UTF-8 가정.
  //   에러는 fileError state로 사용자에게 즉시 노출(설계: 친절한 에러 카피).
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  // #M3 E paradigm v1 — Step wizard (1: 글 입력 / 2: 미리보기 + 메타 / 3: 채점 결과).
  //   한 라우트 내 conditional rendering. 진행 상태도 자체 보존(submit.phase가 idle 아니면 step=3 강제).
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const formTopRef = useRef<HTMLDivElement>(null);
  const outcomeRef = useRef<HTMLDivElement>(null);

  // 블록 C(로딩·결과·에러)가 나오면 그 위치로 스크롤 (wireframe §1 — 자동 스크롤)
  //   #M3 E: submit phase가 loading/result/error로 진입 = Step 3.
  useEffect(() => {
    if (submit.phase !== "idle") {
      setStep(3);
      outcomeRef.current?.scrollIntoView({ behavior: scrollBehavior(), block: "start" });
    }
  }, [submit.phase]);

  // #9 마운트 시 1회 — 저장된 draft가 있으면 배너로 사용자에게 선택권 부여.
  //   Codex PR #20: 저장 조건(body OR prompt)과 복원 조건이 어긋나 prompt만 적고 이탈한
  //   경우 draft가 유실됐음. 저장 조건과 동일 기준(body OR prompt 둘 중 하나라도 있으면)으로 정렬.
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
  //   조건: clipboard API 지원 + 권한 허용 + 30자 이상. 권한 거절·미지원 → 조용히 폴백.
  //   Codex PR #36: draft 또는 body 있으면 read 자체 안 함(프라이버시). loadDraft를 직접 호출해
  //   state batching 이슈 회피(restoredDraft state는 아직 null일 수 있음).
  useEffect(() => {
    // SSR/구버전 가드
    if (typeof navigator === "undefined" || !navigator.clipboard?.readText) return;
    // draft 있으면 외부 클립보드 read 회피(공용 기기 프라이버시).
    if (loadDraft() !== null) return;
    let cancelled = false;
    navigator.clipboard
      .readText()
      .then((text) => {
        if (cancelled) return;
        const trimmed = text?.trim() ?? "";
        // 30자 미만 = URL/짧은 메모 추정, noise. 글 본문 가능성 낮음.
        if (trimmed.length >= 30) setClipboardPreview(text);
      })
      .catch(() => {
        // 권한 거절 / 미지원 — 조용히 폴백, 사용자에게 알리지 않음(설계 default).
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Codex PR #36: 사용자가 타이핑 시작한 후 본문 비워도 클립보드 배너 다시 안 나타나도록
  // 한 번 body가 채워지면 clipboardPreview 영구 클리어(one-shot).
  useEffect(() => {
    if (body.length > 0 && clipboardPreview !== null) {
      setClipboardPreview(null);
    }
  }, [body, clipboardPreview]);

  // #9 자동 저장 — debounce 800ms. idle phase + restore 배너 결정 전이면 보류.
  //   비어 있는 폼은 저장 X(LS 공간·오해 방지). 변경 후 800ms 침묵 → write.
  useEffect(() => {
    if (submit.phase !== "idle") return;
    if (restoredDraft !== null) return; // 사용자가 "이어 쓰기/새로 시작" 결정할 때까지 대기
    const meaningful = body.trim().length > 0 || promptText.trim().length > 0;
    if (!meaningful) return;
    const t = setTimeout(() => {
      const res = saveDraft({
        body,
        school_level: schoolLevel || undefined,
        subject: subject || undefined,
        genre: genre || undefined,
        target_raw: targetRaw || undefined,
        prompt_text: promptText || undefined,
      });
      if (res.ok) setLastSavedAt(res.saved_at);
      // 실패해도 사용자에게 알리지 않음 — 입력 흐름 끊지 않기 위함(quota는 거의 없음).
    }, 800);
    return () => clearTimeout(t);
  }, [body, schoolLevel, subject, genre, targetRaw, promptText, submit.phase, restoredDraft]);

  // #9 제출 성공 시 draft 폐기 — 결과를 받은 시점에 draft는 더는 가치 없음.
  useEffect(() => {
    if (submit.phase === "result") {
      clearDraft();
      setLastSavedAt(null);
    }
  }, [submit.phase]);

  function applyRestore() {
    if (!restoredDraft) return;
    setBody(restoredDraft.body);
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

  // #B 클립보드 텍스트 적용 — body에 채우고 미리보기 클리어. autosave가 800ms 후 LS 저장.
  function applyClipboard() {
    if (!clipboardPreview) return;
    setBody(clipboardPreview);
    setClipboardPreview(null);
  }

  // #B 미리보기 무시 — state만 클리어, 시스템 클립보드는 건드리지 않음.
  function dismissClipboard() {
    setClipboardPreview(null);
  }

  // #C/#M3 ② 파일 → 텍스트 변환. v1: .txt/.md/.docx 클라 사이드, UTF-8 가정.
  //   에러는 fileError로 즉시 노출. 성공 시 body로 채우면 autosave가 800ms 후 LS 저장(기존 #9).
  //   DOCX는 mammoth(lazy load, ~300KB)로 클라에서 직접 텍스트 추출 — 서버·외부 API 0.
  async function readTextFile(file: File) {
    setFileError(null);
    // 확장자·MIME 둘 다 허용 — 일부 브라우저가 .md를 application/octet-stream으로 분류.
    const isDocx =
      file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      /\.docx$/i.test(file.name);
    const isTextLike =
      file.type === "text/plain" ||
      file.type === "text/markdown" ||
      /\.(txt|md|markdown)$/i.test(file.name);
    // 한컴 HWP/HWPX 감지 — 클라 파싱 ecosystem 미성숙(hwp.js 5년 미유지)이라 친절한
    // 변환 가이드로 안내. 학생이 즉시 액션 가능하도록.
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
    // DOCX는 텍스트보다 크기가 크니 5MB 캡, 텍스트는 기존 1MB 유지.
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
        // mammoth lazy load — 초기 번들 영향 0(사용자가 DOCX 업로드할 때만 fetch).
        const mammoth = await import("mammoth");
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value ?? "";
        if (!text.trim()) {
          setFileError("DOCX에서 본문을 찾지 못했어요. 파일이 비어 있거나 손상됐을 수 있어요.");
          return;
        }
      } else {
        // Codex PR #37: file.text()는 UTF-8 가정 — CP949/EUC-KR 한글 파일은 깨진 채 "성공"으로 처리.
        // 네이티브 TextDecoder로 UTF-8 fatal 시도 → 실패 시 EUC-KR fallback. 라이브러리 추가 0.
        const buffer = await file.arrayBuffer();
        try {
          text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
        } catch {
          // UTF-8 실패 → EUC-KR(CP949)로 재시도 (한국 학교 환경 거의 두 가지만)
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
      // Codex PR #40: 추출된 텍스트가 너무 크면 #9 autosave가 LS quota 초과로 계속 실패.
      // BODY_MAX(2000자) 한참 초과면 잘라서 안내. 학생도 결국 BODY_MAX 이하로 줄여야 채점 가능.
      const MAX_EXTRACTED = BODY_MAX * 4; // 8000자 — 여유 두되 LS quota 폭주 차단
      if (text.length > MAX_EXTRACTED) {
        setFileError(
          `파일에서 추출된 텍스트가 너무 길어요(${text.length}자). 직접 ${BODY_MAX}자 이하로 잘라서 붙여넣어 주세요.`,
        );
        return;
      }
      setBody(text);
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
    // 같은 파일 재선택 시에도 onChange 발화하도록 value 비움.
    if (e.target) e.target.value = "";
  }

  // Codex PR #37: 파일 드래그만 가로채기. 일반 텍스트(다른 앱/탭에서 드래그) 드롭은
  // 브라우저 기본 동작(textarea에 텍스트 삽입) 유지 — 회귀 방지.
  function hasFilesInDataTransfer(dt: DataTransfer): boolean {
    // DataTransfer.types는 'Files' 문자열을 포함하면 파일 드래그.
    return Array.from(dt.types || []).includes("Files");
  }

  function handleDrop(e: React.DragEvent<HTMLTextAreaElement>) {
    if (!hasFilesInDataTransfer(e.dataTransfer)) {
      // 텍스트 드래그 — 브라우저 기본 동작 그대로(textarea 삽입).
      setIsDraggingFile(false);
      return;
    }
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void readTextFile(file);
  }

  function handleDragOver(e: React.DragEvent<HTMLTextAreaElement>) {
    if (!hasFilesInDataTransfer(e.dataTransfer)) {
      // 텍스트 드래그 — 가로채지 않음.
      return;
    }
    // 파일 드래그만: preventDefault로 브라우저 새 탭 동작 차단.
    e.preventDefault();
    if (!isDraggingFile) setIsDraggingFile(true);
  }

  function handleDragLeave() {
    setIsDraggingFile(false);
  }

  // ── 파생 검증값 ─────────────────────────────────────────────────────
  const bodyCount = charCount(normalizeBody(body)); // 정규화 후 기준 (gate·표시)
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

  // 본문 에러 코드 — wireframe §7 마이크로카피 매핑
  let bodyError: { code: string; message: string } | null = null;
  if (body.trim().length > 0) {
    if (bodyCount > BODY_MAX) {
      bodyError = { code: "E3", message: "2,000자까지 첨삭할 수 있어요" };
    } else if (bodyCount < BODY_MIN) {
      // 원문은 충분한데 정규화 후 부족 = 거의 발췌 표기뿐(E11), 아니면 단순 부족(E2)
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
  // #10 글자수 진척 — 목표 입력 시만 노출. 5밴드(warmup/approaching/bullseye/over/way-over).
  const progressState = computeProgress(bodyCount, targetNum, BODY_MAX);
  // 로딩·에러 중에는 폼을 잠근다 → 에러 화면에서 값을 못 바꾸므로 '다시 시도하기'(직전 payload 재전송)와
  // 화면 내용이 항상 일치. 수정하려면 '글 고치고 다시 받기'로 idle 복귀(curea-review-ai 지적).
  const locked = submit.phase === "loading" || submit.phase === "error";
  const canSubmit = requiredOk && bodyOk && !targetInvalid && !locked;

  // ── 실시간 채점 호출 (contract §3~§5) ────────────────────────────────
  async function runScore(payload: ScoreRequest) {
    const token = sessionStorage.getItem(DEMO_TOKEN_KEY) ?? "";
    // 토큰이 없으면(=401 후 폐기됨) 호출하지 않고 재입력만 유도 — stale 토큰 401 루프·낭비 방지(curea-review-ai 지적).
    if (!token) {
      onAuthExpired?.();
      return;
    }
    setSubmit({ phase: "loading" });

    let res: Response;
    try {
      res = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-token": token },
        body: JSON.stringify(payload),
        // 서버 maxDuration 60s 보다 약간 길게 — 서버의 E4(타임아웃) 응답이 먼저 도착하도록.
        signal: AbortSignal.timeout(65_000),
      });
    } catch (e) {
      // fetch 자체 실패. AbortSignal.timeout → TimeoutError(클라 타임아웃), 그 외 → 진짜 오프라인.
      // 오프라인은 서버 계약 코드(E8 등)와 겹치지 않게 클라 전용 코드 E-NET로 구분(curea-review-ai 지적).
      const isTimeout = e instanceof DOMException && e.name === "TimeoutError";
      setSubmit({
        phase: "error",
        code: isTimeout ? "E4" : "E-NET",
        message: isTimeout
          ? "지금 첨삭이 지연되고 있어요. 다시 시도해 주세요"
          : "인터넷 연결을 확인하고 다시 시도해 주세요", // 서버 503 E8 아닌 '진짜 오프라인' (EPO ①)
        retryable: true,
      });
      return;
    }

    if (res.status === 401) {
      // 로딩 해제(버튼 재활성) — 재인증 후 바로 다시 제출할 수 있게. TokenGate는 재입력 배너 노출.
      setSubmit({ phase: "idle" });
      onAuthExpired?.(); // E-AUTH: TokenGate가 재입력 배너 노출(토큰은 유지 → 글 보존)
      return;
    }

    if (res.ok) {
      // 200이라도 본문 JSON 파싱이 깨질 수 있다 — try/catch 없으면 loading에 영구 고정(curea-review-ai 지적).
      try {
        const output = (await res.json()) as F3Output;
        // #11 채점 결과 조회 — /results 목록에 자동 저장 (LRU 20건).
        //   저장 실패해도 결과 화면은 정상 표시(데이터 보존만 못한 것).
        addResult({
          assignment: payload.assignment,
          submission: {
            body: payload.submission.body,
            char_count: Array.from(payload.submission.body).length,
          },
          output,
        });

        // #M3 ③ Meta usage LRU — 채점 성공한 메타를 학습해 다음 진입 시 prefill 강화.
        //   값이 빈 문자열이면 recordMetaUsage가 자체 가드(기록 안 함).
        recordMetaUsage("school_level", payload.assignment.school_level);
        recordMetaUsage("subject", payload.assignment.subject);
        recordMetaUsage("genre", payload.assignment.genre);
        if (payload.assignment.target_char_count !== null) {
          recordMetaUsage("target_raw", String(payload.assignment.target_char_count));
        }

        // #1 수정 전/후 — thread에 이번 제출 추가. 같은 thread면 비교 모드 활성.
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
            setRevisionPair(null); // 1차 제출 — 비교 모드 없음
          }
        }
        // 저장 실패해도 결과 화면은 항상 보여줌(데이터 보존만 못한 것).
        setSubmit({ phase: "result", output, assignment: payload.assignment });
      } catch {
        setSubmit({
          phase: "error",
          code: "E5",
          message: ERROR_MESSAGE.E5,
          retryable: true,
        });
      }
      return;
    }

    // 서버 에러 봉투 (계약 §5.1). code→카피 단일 소스 = grading.ts ERROR_MESSAGE.
    let code: ErrorCode = "E5";
    try {
      const env = (await res.json()) as { error?: { code?: ErrorCode } };
      if (env?.error?.code) code = env.error.code;
    } catch {
      /* 봉투 파싱 실패 → 기본 E5 */
    }
    setSubmit({
      phase: "error",
      code,
      message: ERROR_MESSAGE[code] ?? "결과를 다시 만들어야 해요. 다시 시도해 주세요",
      retryable: RETRYABLE.has(code),
    });
  }

  // 새 제출 — 현재 화면 값으로 payload 조립, attempt_no +1, lastPayload에 보관 후 전송.
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    submitCount.current += 1; // functional_spec E9 재제출 추적
    const payload: ScoreRequest = {
      assignment: {
        school_level: schoolLevel,
        subject,
        genre,
        target_char_count: targetNum,
        prompt_text: promptText.trim(),
      },
      submission: { body }, // 원본 전송 — 서버가 normalizeBody (contract §3.2)
      meta: {
        client_version: "v0.1",
        submitted_at: new Date().toISOString(),
        attempt_no: submitCount.current,
      },
    };
    lastPayload.current = payload;
    void runScore(payload);
  }

  // 다시 시도하기 — 일시 오류의 재호출. **직전 실패 payload를 그대로** 재전송(같은 요청·같은 attempt_no).
  //   내용을 고쳐 다시 받으려면 '글 고치고 다시 받기'로 새 제출(attempt_no +1). 에러 중 폼은 잠겨 화면=전송 일치.
  function retry() {
    if (lastPayload.current) void runScore(lastPayload.current);
  }

  function handleResubmit() {
    // 입력으로 복귀(폼 잠금 해제). 다음 새 제출(handleSubmit)에서 attempt_no가 증가한다.
    //   #M3 E: 글 수정 가능하도록 Step 1로 복귀(메타·target·promptText는 그대로 유지).
    setSubmit({ phase: "idle" });
    setStep(1);
    formTopRef.current?.scrollIntoView({ behavior: scrollBehavior() });
  }

  const resubmitButton = (
    <button
      type="button"
      onClick={handleResubmit}
      className="inline-flex items-center justify-center rounded-lg bg-[#24D39E] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1FBE8C]"
    >
      {revisionPair ? "한 번 더 고쳐쓰기" : "고쳐쓰기 시작"}
    </button>
  );

  return (
    <div ref={formTopRef} className="space-y-6">
      {/* #9 본문 자동 저장 복원 배너 — 마운트 시 draft 있을 때만 */}
      {restoredDraft && (
        <section
          role="region"
          aria-label="이전 작성 글 불러오기"
          className="border-accent-mid-surface bg-accent-mid-surface flex flex-wrap items-start gap-3 rounded-xl border p-4"
        >
          <div className="min-w-0 flex-1">
            <p className="text-foreground break-keep text-sm font-semibold">
              📝 이전에 쓰던 작업이 있어요
            </p>
            <p className="text-muted-foreground break-keep mt-1 text-xs leading-relaxed">
              마지막 저장 {formatSavedAt(restoredDraft.saved_at)} · 본문{" "}
              {restoredDraft.body.trim().length}자
              {(restoredDraft.prompt_text ?? "").trim().length > 0 && " + 과제 내용"}.
              이어서 쓸까요?{" "}
              <span className="text-subtle-foreground">'새로 시작'하면 저장된 내용은 지워져요.</span>
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={applyRestore}
              className="rounded-lg bg-[#24D39E] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1FBE8C]"
            >
              이어 쓰기
            </button>
            <button
              type="button"
              onClick={dismissRestore}
              className="border-border bg-surface text-foreground hover:bg-muted rounded-lg border px-3 py-1.5 text-xs font-medium"
            >
              새로 시작
            </button>
          </div>
        </section>
      )}

      {/* #B 클립보드 자동 감지 배너 — draft 없을 때 + body 비었을 때만 노출.
          draft 배너와 동시 노출 X(restoredDraft가 null이어야 함). 사용자가 타이핑 시작하면 자연 소멸. */}
      {clipboardPreview && !restoredDraft && body.length === 0 && (
        <section
          role="region"
          aria-label="클립보드 글 붙여넣기"
          className="border-accent-mid-surface bg-accent-mid-surface flex flex-wrap items-start gap-3 rounded-xl border p-4"
        >
          <div className="min-w-0 flex-1">
            <p className="text-foreground break-keep text-sm font-semibold">
              📋 클립보드에 글이 있어요 ({clipboardPreview.trim().length}자)
            </p>
            <p className="text-muted-foreground break-keep mt-1 line-clamp-1 text-xs leading-relaxed">
              "{clipboardPreview.trim().slice(0, 40)}…"
            </p>
            <p className="text-subtle-foreground mt-1 text-[11px]">
              본문에 1클릭으로 채워 넣을 수 있어요.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={applyClipboard}
              className="rounded-lg bg-[#24D39E] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1FBE8C]"
            >
              붙여넣기
            </button>
            <button
              type="button"
              onClick={dismissClipboard}
              className="border-border bg-surface text-foreground hover:bg-muted rounded-lg border px-3 py-1.5 text-xs font-medium"
            >
              무시
            </button>
          </div>
        </section>
      )}

      {/* #M3 E paradigm v1 — Stepper (1·2·3 진행 표시). conditional 렌더 위 상단에 항상 노출. */}
      {step !== 3 && (
        <Stepper current={step} />
      )}

      {/* Step 1 — 글 입력 (paradigm v1 #A: 글 먼저). #M3 E: conditional 렌더, step=1일 때만. */}
      {step === 1 && (<>
      <section className="border-border bg-surface rounded-xl border p-5">
        <h2 className="text-foreground mb-1 text-base font-semibold">
          1. 글을 넣어 주세요
        </h2>
        <p className="text-muted-foreground mb-3 text-xs">
          어디서 가져온 글이든 받아들일게요. 맞춤법·띄어쓰기는 고치지 말고 쓴 그대로
          두세요 — 그 부분도 채점 대상이에요.
        </p>
        <textarea
          id="body"
          name="body"
          aria-label="학생 글 본문"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          disabled={locked}
          rows={12}
          placeholder="여기에 글 전체를 붙여넣어 주세요 (50자 이상). .txt·.md·.docx 파일을 끌어다 놓아도 돼요."
          className={cn(
            "border-border bg-background text-foreground w-full resize-y rounded-lg border px-3 py-2 text-sm leading-relaxed transition-colors",
            bodyError && "border-band-warn",
            isDraggingFile && "border-accent-mid bg-accent-mid-surface/40 border-2",
            locked && "cursor-not-allowed opacity-60"
          )}
        />
        {/* #C 파일 업로드 버튼 + DnD 안내 + 에러 */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            id="body-file-upload"
            name="body-file-upload"
            type="file"
            accept=".txt,.md,.markdown,.docx,.hwp,.hwpx,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={handleFileInput}
            className="hidden"
            aria-label="텍스트·DOCX 파일 업로드"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={locked}
            className={cn(
              "border-border bg-surface text-foreground hover:bg-muted inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium",
              locked && "cursor-not-allowed opacity-60",
            )}
          >
            📎 파일 업로드 (.txt·.md·.docx)
          </button>
          <span className="text-subtle-foreground text-[11px]">
            또는 위 영역에 끌어다 놓으세요. HWP·사진·링크는 추후 추가 예정.
          </span>
        </div>
        {fileError && (
          <div role="alert" className="border-band-warn-surface bg-band-warn-surface mt-2 rounded-md border p-2.5">
            <p className="text-band-warn-foreground break-keep text-xs leading-relaxed">
              {fileError}
            </p>
            {/* #M3 ⑤ 채널 폴백 안내 — 어떤 파일 에러여도 직접 붙여넣기로 우회 가능. */}
            <p className="text-muted-foreground break-keep mt-1.5 text-[11px] leading-relaxed">
              💡 본문을 위 영역에 직접 붙여넣어도 채점받을 수 있어요.
            </p>
          </div>
        )}
        <div className="mt-1.5 flex items-center justify-between text-xs">
          <span className={cn(bodyError && "text-band-warn-foreground")}>
            {bodyError?.message ?? " "}
          </span>
          <span
            className={cn(
              "tabular-nums",
              bodyCount === 0
                ? "text-subtle-foreground"
                : bodyCount < BODY_MIN
                  ? "text-foreground font-medium"
                  : "text-subtle-foreground",
            )}
          >
            현재 {bodyCount}자{targetNum ? ` / 목표 ${targetNum}자` : ""}
          </span>
        </div>
        {/* #D paradigm v1 — 50자 미만 시 "to-50자" 미니바로 시각 강화.
            body 비어 있으면 미노출, 50자 이상 → 기존 target-driven progressState 바로 전환. */}
        {bodyCount > 0 && bodyCount < BODY_MIN && (
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={BODY_MIN}
            aria-valuenow={bodyCount}
            aria-label="최소 글자수까지 남은 진척"
            className="mt-2"
          >
            <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
              <div
                className="bg-muted-foreground/50 h-full transition-all duration-300 motion-reduce:transition-none"
                style={{ width: `${Math.min(100, (bodyCount / BODY_MIN) * 100)}%` }}
              />
            </div>
            <p className="text-subtle-foreground break-keep mt-1 text-xs">
              {/* Codex PR #35: bodyError E11(원본은 충분하나 정규화 후 부족 = 발췌 표기뿐)인
                  경우엔 "더 써라"가 잘못된 안내 — 발췌 표기 외 본문을 붙여넣어야 함. 분기. */}
              {bodyError?.code === "E11"
                ? "발췌 표기(〈중략〉 등) 외 학생이 쓴 실제 본문을 더 붙여넣어 주세요"
                : `${BODY_MIN - bodyCount}자 더 쓰면 채점받을 수 있어요`}
            </p>
          </div>
        )}
        {/* #10 글자수 진척 인디케이터 — 목표 입력 + 본문 ≥50자 시 노출. role=progressbar로 a11y.
            #D: h-1.5→h-2, text-[11px]→text-xs로 시각 강화. */}
        {progressState && bodyCount >= BODY_MIN && (
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            // Codex PR #23: aria-valuenow가 aria-valuemax 초과 시 invalid → pct로 clamp(0~100).
            // raw 비율은 aria-valuetext로 별도 전달.
            aria-valuenow={Math.round(progressState.pct)}
            aria-valuetext={`${progressState.rawPct}% (${progressState.label})`}
            aria-label="목표 글자수 대비 진척"
            className="mt-2"
          >
            <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
              {/* 인라인 style 정당 — 동적 width는 Tailwind 정적 클래스로 표현 불가(score-bar와 동일 예외) */}
              <div
                className={cn(
                  "h-full transition-all duration-300 motion-reduce:transition-none",
                  getProgressBarClass(progressState.band),
                )}
                style={{ width: `${progressState.pct}%` }}
              />
            </div>
            <p
              className={cn(
                "mt-1 break-keep text-xs",
                getProgressTextClass(progressState.band),
              )}
            >
              {progressState.label}
              <span className="text-subtle-foreground ml-1 tabular-nums">
                ({progressState.rawPct}%)
              </span>
            </p>
          </div>
        )}
        {/* #9 자동 저장 표시 — 한 번이라도 저장된 적이 있으면 노출 */}
        {lastSavedAt && (
          <p
            className="text-subtle-foreground mt-1 text-right text-[11px]"
            aria-live="polite"
          >
            자동 저장됨 · {formatSavedAt(lastSavedAt)}
          </p>
        )}
      </section>

      {/* Step 1 → Step 2 진행 버튼 (#M3 E: bodyOk 시 활성) */}
      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => setStep(2)}
          disabled={!bodyOk || locked}
          className={cn(
            "bg-primary text-primary-foreground w-full rounded-lg px-4 py-3 text-base font-semibold transition hover:opacity-90",
            (!bodyOk || locked) && "cursor-not-allowed opacity-40",
          )}
        >
          다음 단계 →
        </button>
        {bodyCount === 0 && (
          <p className="text-muted-foreground break-keep text-center text-xs">
            글을 {BODY_MIN}자 이상 넣으면 다음으로 갈 수 있어요
          </p>
        )}
      </div>
      </>)}

      {/* Step 2 — 글 미리보기 + 과제 정보 + 채점 받기 (#M3 E) */}
      {step === 2 && (<>
      <TextPreviewCard body={body} onEdit={() => setStep(1)} />

      <section className="border-border bg-surface rounded-xl border p-5">
        <h2 className="text-foreground mb-1 text-base font-semibold">
          2. 과제 정보를 알려 주세요
        </h2>
        <p className="text-muted-foreground mb-4 text-xs">
          선생님이 내준 과제 조건을 입력하면, AI가 그 기준으로 채점해요.
        </p>
        <MetaForm
          schoolLevel={schoolLevel}
          subject={subject}
          genre={genre}
          targetRaw={targetRaw}
          promptText={promptText}
          targetInvalid={targetInvalid}
          locked={locked}
          onChangeSchoolLevel={setSchoolLevel}
          onChangeSubject={setSubject}
          onChangeGenre={setGenre}
          onChangeTargetRaw={setTargetRaw}
          onChangePromptText={setPromptText}
        />
        {/* Codex PR #34: Step 2에서 목표 분량 변경 시 진척 즉시 확인. 모바일에서 위로 스크롤 안 해도 됨.
            본문은 Step 1에서 확정돼 fixed — 목표 분량만 사용자가 조정. progressState 동일 계산. */}
        {progressState && bodyCount >= BODY_MIN && (
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progressState.pct)}
            aria-valuetext={`${progressState.rawPct}% (${progressState.label})`}
            aria-label="현재 본문 vs 목표 글자 수 진척"
            className="border-border bg-muted/30 mt-4 rounded-lg border p-3"
          >
            <div className="text-foreground mb-2 flex items-center justify-between text-xs">
              <span className="font-medium">현재 글자수 진척</span>
              <span className="text-subtle-foreground tabular-nums">
                {bodyCount}자{targetNum ? ` / 목표 ${targetNum}자` : ""}
              </span>
            </div>
            <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
              <div
                className={cn(
                  "h-full transition-all duration-300 motion-reduce:transition-none",
                  getProgressBarClass(progressState.band),
                )}
                style={{ width: `${progressState.pct}%` }}
              />
            </div>
            <p
              className={cn(
                "mt-1 break-keep text-xs",
                getProgressTextClass(progressState.band),
              )}
            >
              {progressState.label}
              <span className="text-subtle-foreground ml-1 tabular-nums">
                ({progressState.rawPct}%)
              </span>
            </p>
          </div>
        )}
      </section>

      {/* 채점 버튼 + disabled 사유 안내 — 기존 #38 카피 유지(글 길이는 이미 Step 1에서 보장) */}
      <section>
        <form onSubmit={handleSubmit}>
          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              "bg-primary text-primary-foreground w-full rounded-lg px-4 py-3 text-base font-semibold transition hover:opacity-90",
              !canSubmit && "cursor-not-allowed opacity-40",
            )}
          >
            {submit.phase === "loading" ? "AI가 글을 읽고 있어요…" : "AI 첨삭 받기"}
          </button>
        </form>
        {submit.phase === "idle" && !canSubmit && (() => {
          const missing: string[] = [];
          if (!schoolLevel) missing.push("학교·학년");
          if (!subject) missing.push("과목");
          if (!genre) missing.push("장르");
          if (!promptOk) missing.push(`과제 내용(${PROMPT_MIN}자 이상)`);
          if (bodyCount < BODY_MIN) missing.push(`글(${BODY_MIN}자 이상)`);
          else if (bodyCount > BODY_MAX) missing.push(`글(${BODY_MAX}자 이하로 줄여 주세요)`);
          if (targetInvalid) missing.push("목표 글자 수");
          return (
            <p className="text-muted-foreground break-keep mt-2 text-center text-xs">
              {missing.length > 0
                ? `다음을 채우면 채점을 받을 수 있어요: ${missing.join(" · ")}`
                : "잠시 후 다시 시도해 주세요"}
            </p>
          );
        })()}
      </section>
      </>)}

      {/* 블록 C — 로딩 / 결과 / 에러 */}
      {submit.phase === "loading" && (
        <section
          ref={outcomeRef}
          className="border-border bg-surface flex items-center gap-3 rounded-xl border p-6"
        >
          <span
            className="border-primary inline-block h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-t-transparent"
            aria-hidden
          />
          <div>
            <p className="text-foreground text-sm font-medium">
              AI가 5가지 기준으로 글을 읽고 있어요…
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
              과제 이해 · 내용 충실도 · 구조·논리 · 표현·문장 · 성장 가능성
              <br />
              최대 1분 정도 걸릴 수 있어요.
            </p>
          </div>
        </section>
      )}
      {submit.phase === "result" && (
        <div ref={outcomeRef}>
          <ResultView
            assignment={submit.assignment}
            output={submit.output}
            actions={resubmitButton}
            revisionMode={revisionPair ?? undefined}
          />
        </div>
      )}

      {submit.phase === "error" && (
        <section
          ref={outcomeRef}
          className="border-band-warn-surface bg-band-warn-surface rounded-xl border p-5"
        >
          <h2 className="text-band-warn-foreground text-sm font-semibold">
            채점을 마치지 못했어요
          </h2>
          <p className="text-foreground mt-1.5 text-sm">{submit.message}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {submit.retryable && (
              <button
                type="button"
                onClick={retry}
                className="bg-primary text-primary-foreground inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition hover:opacity-90"
              >
                다시 시도하기
              </button>
            )}
            {resubmitButton}
          </div>
          <p className="text-subtle-foreground mt-2 text-[11px]">
            오류 코드: {submit.code}
          </p>
        </section>
      )}

      {/* C5 — 면책 (결과 화면엔 ResultView가 동일 문구 포함하므로 그 외 상태에서만) */}
      {submit.phase !== "result" && (
        <p className="bg-muted text-muted-foreground rounded-md px-3 py-2 text-xs">
          ※ 이 채점은 AI 자동 채점입니다. 학교 교사의 실제 채점과 다를 수
          있습니다.
        </p>
      )}
    </div>
  );
}
// Stepper 컴포넌트는 ./Stepper로 추출 (단위 테스트 가능 + 단일 책임). 2026-06-02.
