"use client";

// app/components/StepResult.tsx
// Result step of the ScoreWizard — purely presentational.
// Handles three submitState phases: loading spinner / error panel / ResultView wrapper.
// All state lives in useScoreForm (T1); the orchestrator (T5) owns the hook
// instance and passes values down as props. This component has NO internal
// useState / useEffect.

import type React from "react";
import type { SubmitState } from "@/app/hooks/useScoreForm";
import type { RevisionEntry } from "@/app/lib/storage";
import ResultView from "@/app/components/ResultView";

export type StepResultProps = {
  submitState: SubmitState;
  revisionPair: { v1: RevisionEntry; v2: RevisionEntry } | null;
  onRetry: () => void;
  onResubmit: () => void;
  outcomeRef: React.RefObject<HTMLDivElement | null>;
};

export default function StepResult({
  submitState: submit,
  revisionPair,
  onRetry,
  onResubmit,
  outcomeRef,
}: StepResultProps) {
  if (submit.phase === "idle") return null;

  const resubmitButton = (
    <button
      type="button"
      onClick={onResubmit}
      className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
    >
      {revisionPair ? "한 번 더 고쳐쓰기" : "고쳐쓰기 시작"}
    </button>
  );

  return (
    <>
      {/* 블록 C — 로딩 / 결과 / 에러 */}
      {submit.phase === "loading" && (
        <section
          ref={outcomeRef}
          role="status"
          aria-live="polite"
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
          {/* 저장 안내 — 새로고침 시 /try가 홈으로 돌아가는 걸 데이터 유실로 오인하는 혼란 방지
              (2026-07-09 prod QA). addResult 성공 시에만 — 실패에 "저장됐어요"를 거짓 표시하지 않는다. */}
          {submit.saved ? (
            <div
              data-testid="saved-notice"
              className="border-border bg-surface mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-3"
            >
              <p className="text-foreground text-sm">
                <span aria-hidden>✓</span> 이 결과는 <strong>내 결과</strong>에 저장됐어요. 새로고침해도 사라지지 않아요.
              </p>
              <a
                href="/results"
                className="text-primary text-sm font-semibold underline-offset-2 hover:underline"
              >
                보러 가기 →
              </a>
            </div>
          ) : (
            // 저장 실패 — 무언 대신 경고(Codex #140). draft는 폐기하지 않지만(useScoreForm) 자동저장은
            //   idle 한정 디바운스라 "임시저장돼 있다"고 단정 못 함(제출 직전 입력·storage 차단 케이스).
            //   과장 없이 사용자가 지금 할 수 있는 행동(복사)을 안내한다.
            <div
              data-testid="save-failed-notice"
              className="border-band-warn-surface bg-band-warn-surface mb-3 rounded-xl border px-4 py-3"
            >
              <p className="text-foreground text-sm">
                결과 저장에 실패했어요 — 이 화면을 벗어나면 결과가 사라질 수 있어요. 필요한 내용은 지금
                복사해 두고, 잠시 후 다시 채점해 보세요.
              </p>
            </div>
          )}
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
                onClick={onRetry}
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
    </>
  );
}
