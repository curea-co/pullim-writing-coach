"use client";

// app/components/ScoreWizard.tsx
// Orchestrator: owns the useScoreForm hook instance, manages wizard step state (1|2|3),
// and renders StepEssay / StepInfo / StepResult with explicit prop mapping.
// Task 5 of the /try deep-rebuild. ScoreForm.tsx is NOT yet modified (T9).

import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useScoreForm } from "@/app/hooks/useScoreForm";
import { scrollBehavior } from "@/app/lib/utils";
import Stepper from "@/app/components/Stepper";
import StepEssay from "@/app/components/StepEssay";
import StepInfo from "@/app/components/StepInfo";
import StepResult from "@/app/components/StepResult";

export type ScoreWizardProps = {
  onAuthExpired?: () => void;
  onAuthRefresh?: () => Promise<boolean>; // 401 → 토큰 회전 → 원 요청 자동 재시도(게이트키퍼 SSO 계약)
  defaults?: { school_level?: string; subject?: string; genre?: string };
};

export default function ScoreWizard({ onAuthExpired, onAuthRefresh, defaults }: ScoreWizardProps): React.ReactNode {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [spellcheckOn, setSpellcheckOn] = useState(false); // RichEditor 맞춤법 표시 UI 상태(소유).
  const formTopRef = useRef<HTMLDivElement>(null);

  const form = useScoreForm({
    onAuthExpired,
    onAuthRefresh,
    defaults,
    onResubmit: () => {
      setStep(1);
      formTopRef.current?.scrollIntoView({ behavior: scrollBehavior() });
    },
  });

  // Phase → step effect: when submit enters loading/result/error, advance to step 3.
  // Lives here (not in the hook) because step state is owned by this orchestrator.
  useEffect(() => {
    if (
      form.submitState.phase === "loading" ||
      form.submitState.phase === "result" ||
      form.submitState.phase === "error"
    ) {
      setStep(3);
      form.outcomeRef.current?.scrollIntoView({ behavior: scrollBehavior() });
    }
  }, [form.submitState.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div ref={formTopRef} className="space-y-6">
      {step !== 3 && <Stepper current={step} />}

      {step === 1 && (
        <StepEssay
          body={form.body}
          bodyHtml={form.bodyHtml}
          onEditorChange={form.onEditorChange}
          bodyCount={form.bodyCount}
          bodyError={form.bodyError}
          bodyOk={form.bodyOk}
          progressState={form.progressState}
          locked={form.locked}
          lastSavedAt={form.lastSavedAt}
          targetNum={form.targetNum}
          spellcheck={spellcheckOn}
          onToggleSpellcheck={() => setSpellcheckOn((v) => !v)}
          restoredDraft={form.restoredDraft}
          onApplyRestore={form.applyRestore}
          onDismissRestore={form.dismissRestore}
          clipboardPreview={form.clipboardPreview}
          onApplyClipboard={form.applyClipboard}
          onDismissClipboard={form.dismissClipboard}
          fileInputRef={form.fileInputRef}
          fileError={form.fileError}
          isDraggingFile={form.isDraggingFile}
          onFileInput={form.handleFileInput}
          onDrop={form.handleDrop}
          onDragOver={form.handleDragOver}
          onDragLeave={form.handleDragLeave}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <StepInfo
          schoolLevel={form.schoolLevel}
          subject={form.subject}
          genre={form.genre}
          targetRaw={form.targetRaw}
          targetNum={form.targetNum}
          targetInvalid={form.targetInvalid}
          promptText={form.promptText}
          onChangeSchoolLevel={form.setSchoolLevel}
          onChangeSubject={form.setSubject}
          onChangeGenre={form.setGenre}
          onChangeTargetRaw={form.setTargetRaw}
          onChangePromptText={form.setPromptText}
          body={form.body}
          bodyCount={form.bodyCount}
          progressState={form.progressState}
          canSubmit={form.canSubmit}
          locked={form.locked}
          isLoading={form.submitState.phase === "loading"}
          missingFields={form.missingFields}
          onSubmit={form.handleSubmit}
          onBack={() => setStep(1)}
        />
      )}

      {/* StepResult is ALWAYS rendered (not gated on step === 3).
          It returns null when phase === "idle". The phase→step useEffect
          above handles scrolling once the phase transitions. */}
      <StepResult
        submitState={form.submitState}
        revisionPair={form.revisionPair}
        onRetry={form.retry}
        onResubmit={form.handleResubmit}
        outcomeRef={form.outcomeRef}
      />
    </div>
  );
}
