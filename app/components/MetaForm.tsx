"use client";
// MetaForm — Step 2 과제 정보 입력 (paradigm v1 #M3 E, 2026-06-01).
//   학년·과목·장르·목표 분량·과제 내용 5칸. 상위 ScoreForm에서 state·핸들러 주입.
//   순수 controlled component — useState/useEffect 0, 테스트 용이.
//
// 입력 부담 절감 (#M3 ③ 후속): /me 프로필 prefill로 학년·과목·자주 쓰는 장르 기본값.

import { cn } from "@/app/lib/utils";
import {
  GENRES,
  PROMPT_MAX,
  PROMPT_MIN,
  SCHOOL_LEVELS,
  SUBJECTS,
} from "@/app/lib/grading";

export type MetaFormProps = {
  schoolLevel: string;
  subject: string;
  genre: string;
  targetRaw: string;     // 빈 문자열 = 제한 없음
  promptText: string;
  targetInvalid: boolean;
  locked: boolean;       // 제출 중 잠금
  hideTarget?: boolean;  // 목표 글자 수 숨김 — 코치(분량 미사용) 등 미지원 경로에서 dead input 방지
  onChangeSchoolLevel: (v: string) => void;
  onChangeSubject: (v: string) => void;
  onChangeGenre: (v: string) => void;
  onChangeTargetRaw: (v: string) => void;
  onChangePromptText: (v: string) => void;
};

export default function MetaForm(props: MetaFormProps) {
  const {
    schoolLevel,
    subject,
    genre,
    targetRaw,
    promptText,
    targetInvalid,
    locked,
    hideTarget = false,
    onChangeSchoolLevel,
    onChangeSubject,
    onChangeGenre,
    onChangeTargetRaw,
    onChangePromptText,
  } = props;

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          id="school-level"
          label="학교·학년"
          value={schoolLevel}
          options={SCHOOL_LEVELS}
          onChange={onChangeSchoolLevel}
          disabled={locked}
        />
        <SelectField
          id="subject"
          label="과목"
          value={subject}
          options={SUBJECTS}
          onChange={onChangeSubject}
          disabled={locked}
        />
        <SelectField
          id="genre"
          label="어떤 글인가요?"
          value={genre}
          options={GENRES}
          onChange={onChangeGenre}
          disabled={locked}
        />
        {!hideTarget && (
          <div>
            <label
              htmlFor="target"
              className="text-foreground mb-1.5 block text-sm font-medium"
            >
              목표 글자 수{" "}
              <span className="text-muted-foreground font-normal">(선택)</span>
            </label>
            <input
              id="target"
              name="target"
              type="number"
              inputMode="numeric"
              value={targetRaw}
              onChange={(e) => onChangeTargetRaw(e.target.value)}
              disabled={locked}
              placeholder="예: 800 — 모르면 비워 두세요"
              className={cn(
                "border-border bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm",
                targetInvalid && "border-band-warn",
                locked && "cursor-not-allowed opacity-60",
              )}
            />
            {targetInvalid && (
              <p className="text-band-warn-foreground mt-1 text-xs">
                목표 글자 수는 50~2,000자로 입력해 주세요
              </p>
            )}
          </div>
        )}
      </div>

      <div className="mt-4">
        <label
          htmlFor="prompt"
          className="text-foreground mb-1.5 block text-sm font-medium"
        >
          과제 내용
        </label>
        <textarea
          id="prompt"
          name="prompt"
          value={promptText}
          onChange={(e) => onChangePromptText(e.target.value)}
          disabled={locked}
          rows={3}
          maxLength={PROMPT_MAX}
          placeholder="선생님이 내준 과제를 그대로 적어 주세요. 예: 교복 자율화에 대한 자신의 주장을 근거 2개 이상으로 쓰시오."
          className={cn(
            "border-border bg-background text-foreground w-full resize-y rounded-lg border px-3 py-2 text-sm leading-relaxed",
            locked && "cursor-not-allowed opacity-60",
          )}
        />
        <p className="text-subtle-foreground mt-1 text-right text-xs">
          {promptText.trim().length} / {PROMPT_MAX}자{" "}
          {promptText.trim().length > 0 && promptText.trim().length < PROMPT_MIN && (
            <span className="text-band-warn-foreground ml-1">(최소 {PROMPT_MIN}자)</span>
          )}
        </p>
      </div>
    </div>
  );
}

// ── 드롭다운 필드 (학교·학년 / 과목 / 장르 공용) ─────────────────────
function SelectField({
  id,
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="text-foreground mb-1.5 block text-sm font-medium"
      >
        {label}
      </label>
      <select
        id={id}
        name={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          "border-border bg-background w-full rounded-lg border px-3 py-2 text-sm",
          value ? "text-foreground" : "text-subtle-foreground",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <option value="">선택해 주세요</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}
