// 프로필 폼 검증 — 순수 함수, React 없음. ProfileForm·테스트 양쪽이 import.
//   필수: nickname(1~12자) + school_level + primary_subject.
//   primary_subject === "기타"이면 primary_subject_other 필수(1~20자).
//   onboarding 모드는 consent 필수, edit 모드는 생략(이미 동의).

import type { Genre, SchoolLevel, Subject } from "./storage";

export type ProfileDraft = {
  nickname?: string;
  school_name?: string;
  school_level?: SchoolLevel;
  primary_subject?: Subject;
  primary_subject_other?: string;
  frequent_genre?: Genre;
};

export type ProfileFormErrors = Partial<
  Record<
    | "nickname"
    | "school_level"
    | "primary_subject"
    | "primary_subject_other"
    | "school_name"
    | "consent",
    string
  >
>;

export type ValidateMode = "onboarding" | "edit";

export function validateProfileDraft(
  draft: ProfileDraft,
  mode: ValidateMode,
  consentAccepted: boolean,
): ProfileFormErrors {
  const errors: ProfileFormErrors = {};

  // nickname — 필수 (A2 디자인 결정 2026-05-28)
  if (!draft.nickname || !draft.nickname.trim()) {
    errors.nickname = "닉네임을 입력해 주세요";
  } else if (draft.nickname.length > 12) {
    errors.nickname = "12자까지 입력할 수 있어요";
  }

  // school_level — 필수
  if (!draft.school_level) {
    errors.school_level = "학년을 골라주세요";
  }

  // primary_subject — 필수, "기타"면 자유 입력 추가 필수
  if (!draft.primary_subject) {
    errors.primary_subject = "과목을 골라주세요";
  } else if (draft.primary_subject === "기타") {
    const v = draft.primary_subject_other?.trim() ?? "";
    if (v.length === 0) {
      errors.primary_subject_other = "과목을 직접 적어 주세요";
    } else if (v.length > 20) {
      errors.primary_subject_other = "20자까지 입력할 수 있어요";
    }
  }

  // school_name — 선택. 입력했을 때만 길이 검사.
  if (draft.school_name && draft.school_name.length > 30) {
    errors.school_name = "30자까지 입력할 수 있어요";
  }

  // consent — onboarding 모드에서만 필수
  if (mode === "onboarding" && !consentAccepted) {
    errors.consent = "내용을 확인하고 동의해 주세요";
  }

  return errors;
}
