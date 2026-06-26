"use client";

// app/components/StepInfo.tsx
// Meta/submit step of the ScoreWizard — purely presentational.
// All state lives in useScoreForm (T1); the orchestrator (T5) owns the hook
// instance and passes values down as props. This component has NO internal
// useState / useEffect.

import type React from "react";
import { cn } from "@/app/lib/utils";
import {
  getProgressBarClass,
  getProgressTextClass,
  computeProgress,
} from "@/app/lib/progress";
import { BODY_MIN } from "@/app/lib/grading";
import MetaForm from "@/app/components/MetaForm";
import TextPreviewCard from "@/app/components/TextPreviewCard";

export type StepInfoProps = {
  // Meta fields (passed through to MetaForm)
  schoolLevel: string;
  subject: string;
  genre: string;
  targetRaw: string;
  targetNum: number | null;
  targetInvalid: boolean;
  promptText: string;
  onChangeSchoolLevel: (v: string) => void;
  onChangeSubject: (v: string) => void;
  onChangeGenre: (v: string) => void;
  onChangeTargetRaw: (v: string) => void;
  onChangePromptText: (v: string) => void;
  // Body preview (read-only)
  body: string;
  bodyCount: number;
  progressState: ReturnType<typeof computeProgress> | null;
  // Submit
  canSubmit: boolean;
  locked: boolean;
  isLoading: boolean;
  missingFields: string[];
  onSubmit: (e: React.FormEvent) => void;
  onBack: () => void;   // "수정" inside TextPreviewCard → back to step essay
};

export default function StepInfo({
  schoolLevel,
  subject,
  genre,
  targetRaw,
  targetNum,
  targetInvalid,
  promptText,
  onChangeSchoolLevel,
  onChangeSubject,
  onChangeGenre,
  onChangeTargetRaw,
  onChangePromptText,
  body,
  bodyCount,
  progressState,
  canSubmit,
  locked,
  isLoading,
  missingFields,
  onSubmit,
  onBack,
}: StepInfoProps) {
  return (
    <div className="space-y-6">
      {/* 글 미리보기 — 접힘 형태, [수정] → Step 1 */}
      <TextPreviewCard body={body} onEdit={onBack} />

      {/* Step 2 — 과제 정보 입력 */}
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
          onChangeSchoolLevel={onChangeSchoolLevel}
          onChangeSubject={onChangeSubject}
          onChangeGenre={onChangeGenre}
          onChangeTargetRaw={onChangeTargetRaw}
          onChangePromptText={onChangePromptText}
        />
        {/* Step 2에서 목표 분량 변경 시 진척 즉시 확인 */}
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

      {/* 채점 버튼 + disabled 사유 안내 */}
      <section>
        <form onSubmit={onSubmit}>
          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              "bg-primary text-primary-foreground w-full rounded-lg px-4 py-3 text-base font-semibold transition hover:opacity-90",
              !canSubmit && "cursor-not-allowed opacity-40",
            )}
          >
            {isLoading ? "AI가 글을 읽고 있어요…" : "AI 첨삭 받기"}
          </button>
        </form>
        {!isLoading && !canSubmit && missingFields.length > 0 && (
          <p className="text-muted-foreground break-keep mt-2 text-center text-xs">
            {`다음을 채우면 채점을 받을 수 있어요: ${missingFields.join(" · ")}`}
          </p>
        )}
      </section>
    </div>
  );
}
