"use client";

// 코치 진입 — 과제 입력 단계 (C3). MetaForm을 그대로 재사용하고 검증은 coach-setup.validateAssignment.
//   프로필 있으면 학년·과목·장르 prefill. 과제 내용은 항상 빈 상태로 시작 — 직접 입력 유도.

import { useMemo, useState } from "react";
import MetaForm from "@/app/components/MetaForm";
import { type CoachAssignment, validateAssignment } from "@/app/lib/coach-setup";
import { TARGET_MIN, TARGET_MAX } from "@/app/lib/grading";
import { loadProfile } from "@/app/lib/storage";

export default function AssignmentStep({ onSubmit }: { onSubmit: (a: CoachAssignment) => void }) {
  const profile = useMemo(() => loadProfile(), []);
  const [schoolLevel, setSchoolLevel] = useState<string>(profile?.school_level ?? "중2");
  const [subject, setSubject] = useState<string>(
    profile?.primary_subject && profile.primary_subject !== "기타" ? profile.primary_subject : "과학",
  );
  const [genre, setGenre] = useState<string>(profile?.frequent_genre ?? "설명문");
  const [targetRaw, setTargetRaw] = useState("");
  const [promptText, setPromptText] = useState("");

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
