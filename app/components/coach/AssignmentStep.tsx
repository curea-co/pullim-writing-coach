"use client";

// 코치 진입 — 과제 입력 단계 (C3). MetaForm을 그대로 재사용하고 검증은 coach-setup.validateAssignment.
//   initial이 있으면(모드 선택에서 '과제 다시 입력'으로 복귀) 그 값을 복원 — 입력 유실 방지(curea-review-ai 지적).
//   없으면 프로필 기반 prefill, 과제 내용은 빈 상태로 시작.

import { useEffect, useMemo, useState } from "react";
import MetaForm from "@/app/components/MetaForm";
import { type CoachAssignment, validateAssignment } from "@/app/lib/coach-setup";
import { TARGET_MIN, TARGET_MAX } from "@/app/lib/grading";
import { loadProfile } from "@/app/lib/storage";

export default function AssignmentStep({
  initial,
  onSubmit,
  onDraftChange,
}: {
  initial?: CoachAssignment;
  onSubmit: (a: CoachAssignment) => void;
  onDraftChange?: (a: CoachAssignment) => void; // 입력 중 draft 영속(디바운스) — 새로고침 보호
}) {
  const profile = useMemo(() => loadProfile(), []);
  const [schoolLevel, setSchoolLevel] = useState<string>(
    initial?.school_level ?? profile?.school_level ?? "중2",
  );
  const [subject, setSubject] = useState<string>(
    initial?.subject ??
      (profile?.primary_subject && profile.primary_subject !== "기타" ? profile.primary_subject : "과학"),
  );
  const [genre, setGenre] = useState<string>(initial?.genre ?? profile?.frequent_genre ?? "설명문");
  const [targetRaw, setTargetRaw] = useState(
    initial?.target_char_count != null ? String(initial.target_char_count) : "",
  );
  const [promptText, setPromptText] = useState(initial?.prompt_text ?? "");

  const targetTrimmed = targetRaw.trim();
  const targetNum = targetTrimmed === "" ? null : Number(targetTrimmed);
  const targetInvalid =
    targetTrimmed !== "" &&
    (!Number.isInteger(targetNum) || (targetNum as number) < TARGET_MIN || (targetNum as number) > TARGET_MAX);

  const assignment: CoachAssignment = {
    school_level: schoolLevel,
    subject,
    genre,
    target_char_count: targetNum,
    prompt_text: promptText.trim(),
  };
  const errors = validateAssignment(assignment);
  const canSubmit = errors.length === 0;

  // 입력 중에도 과제 draft를 디바운스 저장 — assignment 단계에서 새로고침해도 입력 보존
  //   (curea-review-ai 지적: 제출 시점에만 저장하면 작성 중 새로고침에 유실).
  useEffect(() => {
    if (!onDraftChange) return;
    const t = setTimeout(() => onDraftChange(assignment), 400);
    return () => clearTimeout(t);
    // assignment는 매 렌더 새 객체지만 값 동일 시 같은 draft 저장이라 무해.
  }, [
    schoolLevel,
    subject,
    genre,
    targetNum,
    promptText,
    onDraftChange,
  ]);

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-8 md:py-12">
      <header className="mb-6">
        <h1 className="text-foreground text-2xl font-bold tracking-tight md:text-3xl">어떤 글을 써볼까요?</h1>
        <p className="text-muted-foreground mt-3 text-sm">
          선생님이 내준 과제 조건을 알려주면, 코치가 그 기준으로 질문해요.
        </p>
      </header>
      <section className="border-border bg-surface rounded-xl border p-5">
        <MetaForm
          schoolLevel={schoolLevel}
          subject={subject}
          genre={genre}
          targetRaw={targetRaw}
          promptText={promptText}
          targetInvalid={targetInvalid}
          locked={false}
          hideTarget // 코치는 목표 분량 미사용(서버가 null 고정) — dead input 숨김.
          onChangeSchoolLevel={setSchoolLevel}
          onChangeSubject={setSubject}
          onChangeGenre={setGenre}
          onChangeTargetRaw={setTargetRaw}
          onChangePromptText={setPromptText}
        />
      </section>
      <button
        type="button"
        onClick={() => canSubmit && onSubmit(assignment)}
        disabled={!canSubmit}
        className="bg-primary text-primary-foreground mt-6 w-full rounded-lg px-4 py-3 text-base font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        다음 — 어떻게 쓸지 고르기 →
      </button>
    </main>
  );
}
