"use client";
// 사용자 프로필 입력 폼 — /onboarding Step2 + /me 양쪽에서 재사용.
//   필수: school_level + primary_subject. 나머지(닉네임·학교명·장르)는 선택.
//   onboarding 모드는 동의 체크박스 필수, edit 모드는 동의 생략(이미 동의됨).
//   검증 실패 시 band-warn + 한 줄 카피. 색만으로 안 알리고 텍스트 동반(a11y).

import { useState, type FormEvent } from "react";
import { GENRES, SCHOOL_LEVELS, SUBJECTS } from "../lib/grading";
import {
  type ProfileDraft,
  type ProfileFormErrors,
  validateProfileDraft,
} from "../lib/profile-validate";
import type { Genre, SchoolLevel } from "../lib/storage";
import { cn } from "../lib/utils";
import ConsentNotice from "./ConsentNotice";

export type { ProfileDraft } from "../lib/profile-validate";

const MIDDLE: readonly SchoolLevel[] = ["중1", "중2", "중3"];
const HIGH: readonly SchoolLevel[] = ["고1", "고2", "고3"];

export default function ProfileForm({
  initial,
  mode,
  submitLabel,
  onSubmit,
}: {
  initial?: ProfileDraft;
  mode: "onboarding" | "edit";
  submitLabel?: string;
  onSubmit: (draft: ProfileDraft, consentAccepted: boolean) => void;
}) {
  const [draft, setDraft] = useState<ProfileDraft>(initial ?? {});
  // edit 모드는 이미 동의됨. onboarding 모드라도 initial이 있으면(=Step3→Step2 뒤로) 이미 동의된 것.
  const [consent, setConsent] = useState(mode === "edit" || !!initial?.school_level);
  const [errors, setErrors] = useState<ProfileFormErrors>({});

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const errs = validateProfileDraft(draft, mode, consent);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    onSubmit(draft, consent);
  };

  const setField = <K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {/* ── 닉네임 (필수, 결과 화면 인사용) ──────────────────── */}
      <TextField
        label="닉네임"
        placeholder="결과 화면에 ‘○○님’으로 표시돼요"
        value={draft.nickname ?? ""}
        onChange={(v) => setField("nickname", v)}
        max={12}
        required
        error={errors.nickname}
      />

      {/* ── 학년 (필수, 2×3 grid + 학교급 그룹 라벨) ──────────── */}
      <fieldset>
        <legend className="text-foreground mb-3 text-sm font-semibold">
          학년 <span className="text-band-warn" aria-label="필수">*</span>
        </legend>
        <div className="space-y-3">
          <SchoolLevelRow
            label="중학교"
            levels={MIDDLE}
            current={draft.school_level}
            onSelect={(lv) => setField("school_level", lv)}
          />
          <SchoolLevelRow
            label="고등학교"
            levels={HIGH}
            current={draft.school_level}
            onSelect={(lv) => setField("school_level", lv)}
          />
        </div>
        {errors.school_level && (
          <p className="text-band-warn mt-2 text-xs">{errors.school_level}</p>
        )}
      </fieldset>

      {/* ── 과목 (필수, chip row + "기타" 선택 시 자유 입력) ────── */}
      <fieldset>
        <legend className="text-foreground mb-3 text-sm font-semibold">
          주로 쓰는 과목 <span className="text-band-warn" aria-label="필수">*</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {SUBJECTS.map((s) => {
            const active = draft.primary_subject === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setField("primary_subject", s);
                  // "기타" 외 선택 시 자유 입력값 정리(혼선 방지).
                  if (s !== "기타") setField("primary_subject_other", undefined);
                }}
                aria-pressed={active}
                className={cn(
                  "inline-flex h-9 items-center rounded-full border px-3 text-xs font-medium",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-surface text-foreground hover:bg-muted",
                )}
              >
                {s}
              </button>
            );
          })}
        </div>
        {errors.primary_subject && (
          <p className="text-band-warn mt-2 text-xs">{errors.primary_subject}</p>
        )}

        {draft.primary_subject === "기타" && (
          <div className="mt-3">
            <TextField
              label="어떤 과목인가요?"
              placeholder="예: 미술, 음악, 정보, 진로"
              value={draft.primary_subject_other ?? ""}
              onChange={(v) => setField("primary_subject_other", v)}
              max={20}
              required
              error={errors.primary_subject_other}
            />
          </div>
        )}
      </fieldset>

      {/* ── 선택 그룹 (회색 톤으로 시각 분리) ───────────────────── */}
      <div className="border-border bg-muted/40 space-y-4 rounded-xl border p-4">
        <p className="text-muted-foreground text-[11px]">선택 입력 — 결과 화면 개인화에 사용</p>

        <TextField
          label="학교명"
          placeholder="(예) 대한중학교"
          value={draft.school_name ?? ""}
          onChange={(v) => setField("school_name", v)}
          max={30}
          error={errors.school_name}
        />

        <label className="block">
          <span className="text-foreground text-sm font-medium">
            자주 쓰는 장르{" "}
            <span className="text-subtle-foreground text-xs font-normal">선택</span>
          </span>
          <select
            value={draft.frequent_genre ?? ""}
            onChange={(e) =>
              setField("frequent_genre", (e.target.value || undefined) as Genre | undefined)
            }
            className="bg-surface border-border text-foreground mt-1.5 block h-10 w-full rounded-lg border px-3 text-sm focus:border-primary focus:outline-none"
          >
            <option value="">선택 안 함</option>
            {GENRES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* ── 동의 (onboarding only) ─────────────────────────── */}
      {mode === "onboarding" && (
        <div>
          <ConsentNotice checked={consent} onChange={setConsent} />
          {errors.consent && <p className="text-band-warn mt-2 text-xs">{errors.consent}</p>}
        </div>
      )}

      <button
        type="submit"
        className="mt-2 inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90"
      >
        {submitLabel ?? "다음"}
      </button>
    </form>
  );
}

// ── 학교급 행 — 라벨 + 3-cell grid ────────────────────────────
function SchoolLevelRow({
  label,
  levels,
  current,
  onSelect,
}: {
  label: string;
  levels: readonly SchoolLevel[];
  current?: SchoolLevel;
  onSelect: (lv: SchoolLevel) => void;
}) {
  return (
    <div>
      <span className="text-subtle-foreground mb-1.5 block text-[11px] font-medium">{label}</span>
      <div className="grid grid-cols-3 gap-2">
        {levels.map((lv) => {
          const active = current === lv;
          return (
            <button
              key={lv}
              type="button"
              onClick={() => onSelect(lv)}
              aria-pressed={active}
              className={cn(
                "h-11 rounded-lg border text-sm font-medium",
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-surface text-foreground hover:bg-muted",
              )}
            >
              {lv}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── 텍스트 필드 + counter + error + required ─────────────────────────
function TextField({
  label,
  placeholder,
  value,
  onChange,
  max,
  required,
  error,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  max: number;
  required?: boolean;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="text-foreground text-sm font-medium">
        {label}{" "}
        {required ? (
          <span className="text-band-warn" aria-label="필수">
            *
          </span>
        ) : (
          <span className="text-subtle-foreground text-xs font-normal">선택</span>
        )}
      </span>
      <div className="relative mt-1.5">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          maxLength={max}
          placeholder={placeholder}
          aria-required={required}
          aria-invalid={!!error}
          className={cn(
            "bg-surface text-foreground placeholder:text-subtle-foreground block h-10 w-full rounded-lg border px-3 pr-12 text-sm focus:outline-none",
            error ? "border-band-warn focus:border-band-warn" : "border-border focus:border-primary",
          )}
        />
        <span className="text-subtle-foreground absolute right-3 top-1/2 -translate-y-1/2 text-[10px] tabular-nums">
          {value.length}/{max}
        </span>
      </div>
      {error && <p className="text-band-warn mt-1 text-xs">{error}</p>}
    </label>
  );
}
