"use client";

// app/components/StepEssay.tsx
// Essay input step of the ScoreWizard — purely presentational.
// All state lives in useScoreForm (T1); the orchestrator (T5) owns the hook
// instance and passes values down as props. This component has NO internal
// useState / useEffect.

import type React from "react";
import { cn } from "@/app/lib/utils";
import { BODY_MIN, BODY_MAX } from "@/app/lib/grading";
import {
  getProgressBarClass,
  getProgressTextClass,
  computeProgress,
} from "@/app/lib/progress";
import type { DraftSnapshot } from "@/app/lib/storage";

// #9 본문 자동 저장 — saved_at(ISO) → "M/D HH:MM" 짧은 카피.
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

export type StepEssayProps = {
  // Essay state (seam: later swap textarea for RichEditor here)
  body: string;
  onChangeBody: (v: string) => void; // RichEditor seam: plain-text projection feeds this
  bodyCount: number;
  bodyError: { code: string; message: string } | null;
  bodyOk: boolean;
  progressState: ReturnType<typeof computeProgress> | null;
  locked: boolean;
  lastSavedAt: string | null;
  targetNum: number | null;
  // Draft banner
  restoredDraft: DraftSnapshot | null;
  onApplyRestore: () => void;
  onDismissRestore: () => void;
  // Clipboard banner
  clipboardPreview: string | null;
  onApplyClipboard: () => void;
  onDismissClipboard: () => void;
  // File input
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  fileError: string | null;
  isDraggingFile: boolean;
  onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: React.DragEvent<HTMLTextAreaElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLTextAreaElement>) => void;
  onDragLeave: () => void;
  // Navigation
  onNext: () => void; // "다음 단계" button handler
};

export default function StepEssay({
  body,
  onChangeBody,
  bodyCount,
  bodyError,
  bodyOk,
  progressState,
  locked,
  lastSavedAt,
  targetNum,
  restoredDraft,
  onApplyRestore,
  onDismissRestore,
  clipboardPreview,
  onApplyClipboard,
  onDismissClipboard,
  fileInputRef,
  fileError,
  isDraggingFile,
  onFileInput,
  onDrop,
  onDragOver,
  onDragLeave,
  onNext,
}: StepEssayProps) {
  return (
    <div className="space-y-6">
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
              <span className="text-subtle-foreground">&apos;새로 시작&apos;하면 저장된 내용은 지워져요.</span>
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={onApplyRestore}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
            >
              이어 쓰기
            </button>
            <button
              type="button"
              onClick={onDismissRestore}
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
              &ldquo;{clipboardPreview.trim().slice(0, 40)}…&rdquo;
            </p>
            <p className="text-subtle-foreground mt-1 text-[11px]">
              본문에 1클릭으로 채워 넣을 수 있어요.
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={onApplyClipboard}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
            >
              붙여넣기
            </button>
            <button
              type="button"
              onClick={onDismissClipboard}
              className="border-border bg-surface text-foreground hover:bg-muted rounded-lg border px-3 py-1.5 text-xs font-medium"
            >
              무시
            </button>
          </div>
        </section>
      )}

      {/* Step 1 — 글 입력 */}
      <section className="border-border bg-surface rounded-xl border p-5">
        <h2 className="text-foreground mb-1 text-base font-semibold">
          1. 글을 넣어 주세요
        </h2>
        <p className="text-muted-foreground mb-3 text-xs">
          어디서 가져온 글이든 받아들일게요. 맞춤법·띄어쓰기는 고치지 말고 쓴 그대로
          두세요 — 그 부분도 채점 대상이에요.
        </p>

        {/* === RichEditor seam: swap this block for <RichEditor> and pipe htmlToPlain → onChangeBody === */}
        <textarea
          id="body"
          name="body"
          aria-label="학생 글 본문"
          value={body}
          onChange={(e) => onChangeBody(e.target.value)}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
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
        {/* === end RichEditor seam === */}

        {/* #C 파일 업로드 버튼 + DnD 안내 + 에러 */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            id="body-file-upload"
            name="body-file-upload"
            type="file"
            accept=".txt,.md,.markdown,.docx,.hwp,.hwpx,text/plain,text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={onFileInput}
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
          onClick={onNext}
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
    </div>
  );
}
