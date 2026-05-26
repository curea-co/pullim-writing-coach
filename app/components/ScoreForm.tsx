"use client";

// Pullim Writing Coach — 학생 글 입력 폼 (WBS P3.1 컴포넌트 골격)
//
// 근거: 03_wireframe_first_screen_v.3 (블록 A·B·마이크로카피) ·
//       02_functional_spec_v.3 §3 F1·F2·§6 에러 · 12_api_contract §3(요청 계약)
//
// 범위(오늘 = M1 이전 골격): 입력 UI · 검증 · F3 게이트 · 요청 페이로드 직렬화까지.
//   라이브 연동(`POST /api/score` fetch·토큰·로딩/재시도 결과 바인딩)은 **P3.2(05-29)**.
//   route.ts 는 M1(05-28)에 생기므로 지금 fetch 하면 404 → 제출 시 직렬화 페이로드를
//   미리보기로 보여 주어 "FE가 계약과 정합하게 직렬화하는가"를 검수 가능하게 한다.

import { useRef, useState } from "react";
import { cn } from "@/app/lib/utils";
// 단일 소스 = 트랙 A의 순수 모듈(grading.ts, 계약 §9 S4). enum·길이정책·정규화·char_count를
// FE가 그대로 import해 서버와 한 곳에서 맞춘다(중복 구현 = 분기 위험 제거).
import {
  BODY_MAX,
  BODY_MIN,
  charCount,
  GENRES,
  normalizeBody,
  PROMPT_MAX,
  PROMPT_MIN,
  SCHOOL_LEVELS,
  SUBJECTS,
  TARGET_MAX,
  TARGET_MIN,
} from "@/app/lib/grading";

// 자주 쓰는 조합 프리셋 (F09, wireframe B1). FE 전용 — 장르는 기본값, 학생이 바꿀 수 있다.
const PRESETS = [
  { label: "중2 국어", school_level: "중2", subject: "국어", genre: "설명문" },
  { label: "중3 사회", school_level: "중3", subject: "사회", genre: "설명문" },
  {
    label: "고1 국어",
    school_level: "고1",
    subject: "국어",
    genre: "감상문·독후감",
  },
] as const;

// 요청 계약 (contract §3.1). body 는 **원본** — 정규화·char_count 는 서버 권위.
type ScoreRequest = {
  assignment: {
    school_level: string;
    subject: string;
    genre: string;
    target_char_count: number | null;
    prompt_text: string;
  };
  submission: { body: string };
  meta: { client_version: string; submitted_at: string; attempt_no: number };
};

type SubmitState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "preview"; payload: ScoreRequest } // P3.2에서 phase:"result" 로 대체
  | { phase: "error"; code: string; message: string };

export default function ScoreForm() {
  const [schoolLevel, setSchoolLevel] = useState("");
  const [subject, setSubject] = useState("");
  const [genre, setGenre] = useState("");
  const [targetRaw, setTargetRaw] = useState(""); // 빈 문자열 = 제한 없음
  const [promptText, setPromptText] = useState("");
  const [body, setBody] = useState(""); // 학생이 본 원본 — 정규화 전(화면 보존)
  const [submit, setSubmit] = useState<SubmitState>({ phase: "idle" });
  const attemptNo = useRef(1);
  const formTopRef = useRef<HTMLDivElement>(null);

  // ── 파생 검증값 ─────────────────────────────────────────────────────
  const bodyCount = charCount(normalizeBody(body)); // 정규화 후 기준 (gate·표시)
  const targetTrimmed = targetRaw.trim();
  const targetNum = targetTrimmed === "" ? null : Number(targetTrimmed);
  const targetInvalid =
    targetTrimmed !== "" &&
    (!Number.isInteger(targetNum) ||
      (targetNum as number) < TARGET_MIN ||
      (targetNum as number) > TARGET_MAX);

  const promptOk =
    promptText.trim().length >= PROMPT_MIN &&
    promptText.trim().length <= PROMPT_MAX;
  const requiredOk = !!schoolLevel && !!subject && !!genre && promptOk;

  // 본문 에러 코드 — wireframe §7 마이크로카피 매핑
  let bodyError: { code: string; message: string } | null = null;
  if (body.trim().length > 0) {
    if (bodyCount > BODY_MAX) {
      bodyError = { code: "E3", message: "2,000자까지 첨삭할 수 있어요" };
    } else if (bodyCount < BODY_MIN) {
      // 원문은 충분한데 정규화 후 부족 = 거의 발췌 표기뿐(E11), 아니면 단순 부족(E2)
      bodyError =
        body.trim().length >= BODY_MIN
          ? {
              code: "E11",
              message:
                "글에 본문이 충분히 들어 있지 않아요. 학생이 쓴 글 전체를 붙여넣어 주세요",
            }
          : { code: "E2", message: "본문을 50자 이상 입력해 주세요" };
    }
  }

  const bodyOk = bodyCount >= BODY_MIN && bodyCount <= BODY_MAX;
  const canSubmit =
    requiredOk && bodyOk && !targetInvalid && submit.phase !== "loading";

  // ── 제출 (P3.1: 직렬화 + 미리보기 / P3.2: /api/score 연동) ───────────
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    const payload: ScoreRequest = {
      assignment: {
        school_level: schoolLevel,
        subject,
        genre,
        target_char_count: targetNum,
        prompt_text: promptText.trim(),
      },
      submission: { body }, // 원본 전송 — 서버가 normalizeBody (contract §3.2)
      meta: {
        client_version: "v0.1",
        submitted_at: new Date().toISOString(),
        attempt_no: attemptNo.current,
      },
    };

    // ── P3.2 연동 자리 (05-29) ──────────────────────────────────────
    // const token = sessionStorage.getItem(DEMO_TOKEN_KEY) ?? "";  // TokenGate가 보관 (§7.1)
    // setSubmit({ phase: "loading" });
    // try {
    //   const res = await fetch("/api/score", {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json", "x-demo-token": token },
    //     body: JSON.stringify(payload),
    //     signal: AbortSignal.timeout(60_000),
    //   });
    //   if (res.status === 401) return onAuthExpired?.();      // E-AUTH: TokenGate 재입력
    //   if (res.ok) setSubmit({ phase: "result", data: await res.json() }); // 200 → /samples UI 재사용 (P3.3)
    //   else {
    //     const { error } = await res.json();                  // 서버 에러 봉투 (계약 §5.1)
    //     setSubmit({ phase: "error", code: error.code, message: ERROR_MESSAGE[error.code] });
    //     // code→카피 단일 소스 = grading.ts ERROR_MESSAGE (E4/E5·E6/E8/E10/E11 …). E8=503은 "일시적 오류…"(EPO ①)
    //   }
    // } catch {
    //   // fetch 자체가 reject = 진짜 클라이언트 오프라인 (서버 503 E8 아님). 인터넷 안내는 여기서만.
    //   setSubmit({ phase: "error", code: "E8", message: "인터넷 연결을 확인하고 다시 시도해 주세요." });
    // }
    // ─────────────────────────────────────────────────────────────────
    setSubmit({ phase: "preview", payload }); // 골격: 직렬화 페이로드 검수용
  }

  function handleResubmit() {
    attemptNo.current += 1; // 재제출 시 +1 (functional_spec E9)
    setSubmit({ phase: "idle" });
    formTopRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <div ref={formTopRef} className="space-y-6">
      {/* 블록 B1 — 과제 정보 (F1) */}
      <section className="border-border bg-surface rounded-xl border p-5">
        <h2 className="text-foreground mb-1 text-base font-semibold">
          1. 과제 정보를 알려 주세요
        </h2>
        <p className="text-muted-foreground mb-4 text-xs">
          선생님이 내준 과제 조건을 입력하면, AI가 그 기준으로 채점해요.
        </p>

        {/* 프리셋 칩 (F09) */}
        <div className="mb-4">
          <span className="text-muted-foreground mb-1.5 block text-xs font-medium">
            자주 쓰는 조합
          </span>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => {
              const active =
                schoolLevel === p.school_level &&
                subject === p.subject &&
                genre === p.genre;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setSchoolLevel(p.school_level);
                    setSubject(p.subject);
                    setGenre(p.genre);
                  }}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-foreground hover:bg-muted"
                  )}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            id="school-level"
            label="학교·학년"
            value={schoolLevel}
            options={SCHOOL_LEVELS}
            onChange={setSchoolLevel}
          />
          <SelectField
            id="subject"
            label="과목"
            value={subject}
            options={SUBJECTS}
            onChange={setSubject}
          />
          <SelectField
            id="genre"
            label="어떤 글인가요?"
            value={genre}
            options={GENRES}
            onChange={setGenre}
          />
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
              type="number"
              inputMode="numeric"
              value={targetRaw}
              onChange={(e) => setTargetRaw(e.target.value)}
              placeholder="예: 800 — 모르면 비워 두세요"
              className={cn(
                "border-border bg-background text-foreground w-full rounded-lg border px-3 py-2 text-sm",
                targetInvalid && "border-band-warn"
              )}
            />
            {targetInvalid && (
              <p className="text-band-warn-foreground mt-1 text-xs">
                목표 글자 수는 50~2,000자로 입력해 주세요
              </p>
            )}
          </div>
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
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            rows={3}
            maxLength={PROMPT_MAX}
            placeholder="선생님이 내준 과제를 그대로 적어 주세요. 예: 교복 자율화에 대한 자신의 주장을 근거 2개 이상으로 쓰시오."
            className="border-border bg-background text-foreground w-full resize-y rounded-lg border px-3 py-2 text-sm leading-relaxed"
          />
          <p className="text-subtle-foreground mt-1 text-right text-xs">
            {promptText.trim().length} / {PROMPT_MAX}자
          </p>
        </div>
      </section>

      {/* 블록 B2 — 학생 글 (F2) */}
      <section className="border-border bg-surface rounded-xl border p-5">
        <h2 className="text-foreground mb-1 text-base font-semibold">
          2. 쓴 글을 붙여넣어 주세요
        </h2>
        <p className="text-muted-foreground mb-3 text-xs">
          글 전체를 그대로 붙여넣어 주세요. 맞춤법·띄어쓰기는 고치지 말고 쓴 그대로
          두세요 — 그 부분도 채점 대상이에요.
        </p>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={12}
          placeholder="여기에 글 전체를 붙여넣어 주세요 (50자 이상)"
          className={cn(
            "border-border bg-background text-foreground w-full resize-y rounded-lg border px-3 py-2 text-sm leading-relaxed",
            bodyError && "border-band-warn"
          )}
        />
        <div className="mt-1.5 flex items-center justify-between text-xs">
          <span className={cn(bodyError && "text-band-warn-foreground")}>
            {bodyError?.message ?? " "}
          </span>
          <span className="text-subtle-foreground tabular-nums">
            현재 {bodyCount}자{targetNum ? ` / 목표 ${targetNum}자` : ""}
          </span>
        </div>
      </section>

      {/* 블록 B3 — 실행 버튼 (F3) */}
      <section>
        <form onSubmit={handleSubmit}>
          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              "bg-primary text-primary-foreground w-full rounded-lg px-4 py-3 text-base font-semibold transition hover:opacity-90",
              !canSubmit && "cursor-not-allowed opacity-40"
            )}
          >
            {submit.phase === "loading"
              ? "AI가 글을 읽고 있어요…"
              : "AI 첨삭 받기"}
          </button>
        </form>
        {!canSubmit && submit.phase !== "loading" && (
          <p className="text-muted-foreground mt-2 text-center text-xs">
            과제 정보와 글(50자 이상)을 모두 입력하면 첨삭을 받을 수 있어요
          </p>
        )}
      </section>

      {/* 블록 C — 결과 영역 (골격: 직렬화 페이로드 미리보기 / 실연동은 P3.2·P3.3) */}
      {submit.phase === "preview" && (
        <section className="border-accent-mid-surface bg-accent-mid-surface rounded-xl border p-5">
          <div className="mb-2 flex items-center gap-2">
            <span className="bg-accent-mid text-primary-foreground rounded-full px-2 py-0.5 text-xs font-semibold">
              골격
            </span>
            <h2 className="text-foreground text-sm font-semibold">
              /api/score 요청 페이로드 (검수용)
            </h2>
          </div>
          <p className="text-muted-foreground mb-3 text-xs leading-relaxed">
            🔌 라이브 채점 연동은 <b>P3.2(05-29)</b> — route.ts(M1·05-28) 완성 후
            붙입니다. 지금은 입력이 계약(12 §3.1)대로 직렬화되는지 보여 줍니다.
            body 는 원본 그대로 전송하고, 정규화·char_count·meta 는 서버가 다시
            산출합니다(계약 §3.2). 200 응답은 기존 <code>/samples</code> 결과
            UI에 바인딩합니다(P3.3).
          </p>
          <pre className="bg-surface border-border text-foreground overflow-x-auto rounded-lg border p-3 text-xs leading-relaxed">
            {JSON.stringify(submit.payload, null, 2)}
          </pre>
          <button
            type="button"
            onClick={handleResubmit}
            className="border-border text-foreground hover:bg-muted mt-3 inline-flex items-center justify-center rounded-lg border px-4 py-2 text-sm font-semibold"
          >
            글 고치고 다시 받기
          </button>
        </section>
      )}

      {/* C5 — 면책 (functional_spec §4.2 meta.disclaimer 와 동일 문자열) */}
      <p className="bg-muted text-muted-foreground rounded-md px-3 py-2 text-xs">
        ※ 이 채점은 AI 자동 채점입니다. 학교 교사의 실제 채점과 다를 수 있습니다.
      </p>
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
}: {
  id: string;
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
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
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "border-border bg-background w-full rounded-lg border px-3 py-2 text-sm",
          value ? "text-foreground" : "text-subtle-foreground"
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
