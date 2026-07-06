"use client";

// 코치 진입 — 과제 입력 단계 (C3). MetaForm을 그대로 재사용하고 검증은 coach-setup.validateAssignment.
//   initial이 있으면(모드 선택에서 '과제 다시 입력'으로 복귀) 그 값을 복원 — 입력 유실 방지(curea-review-ai 지적).
//   없으면 프로필 기반 prefill, 과제 내용은 빈 상태로 시작.

import { useEffect, useState } from "react";
import MetaForm from "@/app/components/MetaForm";
import { type CoachAssignment, validateAssignment } from "@/app/lib/coach-setup";
import { TARGET_MIN, TARGET_MAX } from "@/app/lib/grading";
import { loadProfile, type Profile } from "@/app/lib/storage";

export default function AssignmentStep({
  initial,
  onSubmit,
  onDraftChange,
}: {
  initial?: CoachAssignment;
  onSubmit: (a: CoachAssignment) => void;
  onDraftChange?: (a: CoachAssignment) => void; // 입력 중 draft 영속(디바운스) — 새로고침 보호
}) {
  // 프로필 기반 prefill — 비동기 로드(account mode면 /api/data 왕복). initial(과제 복원)·사용자 입력이
  //   우선이므로, 프로필 prefill은 "사용자가 아직 안 건드린 필드"에만 함수형 갱신으로 적용한다.
  // 기본값 = 미선택("") — 데모 하드코딩(중2·과학·설명문) 프리필은 사용자를 오인시킴(UX 점검 ⑥).
  //   프로필이 있으면 아래 effect가 프로필 값으로 prefill, 없으면 "선택해 주세요"에서 시작.
  const [schoolLevel, setSchoolLevel] = useState<string>(initial?.school_level ?? "");
  const [subject, setSubject] = useState<string>(initial?.subject ?? "");
  const [genre, setGenre] = useState<string>(initial?.genre ?? "");
  const [targetRaw, setTargetRaw] = useState(
    initial?.target_char_count != null ? String(initial.target_char_count) : "",
  );
  const [promptText, setPromptText] = useState(initial?.prompt_text ?? "");

  useEffect(() => {
    // initial(부분 draft 복원)이 있어도 skip하지 않는다 — 복원된 draft가 학년·과목·장르를 아직 안
    //   채웠으면 그 빈 필드만 프로필로 prefill(아래 prev==="" 가드가 복원값·사용자 입력을 보호).
    //   (기본값이 하드코딩이던 시절엔 hasInitial skip이 무해했지만, ""-기본값에선 UX 퇴행 — Codex 리뷰 #124.)
    let alive = true;
    void (async () => {
      const profile: Profile | null = await loadProfile();
      if (!alive || !profile) return;
      // 미선택("") 상태일 때만 프로필 값으로 prefill(사용자가 고른 값은 덮어쓰지 않음).
      setSchoolLevel((prev) => (prev === "" && profile.school_level ? profile.school_level : prev));
      setSubject((prev) =>
        prev === "" && profile.primary_subject && profile.primary_subject !== "기타"
          ? profile.primary_subject
          : prev,
      );
      setGenre((prev) => (prev === "" && profile.frequent_genre ? profile.frequent_genre : prev));
    })();
    return () => {
      alive = false;
    };
  }, []);

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
