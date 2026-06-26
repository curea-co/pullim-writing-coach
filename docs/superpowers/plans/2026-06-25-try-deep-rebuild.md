# /try Deep Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` before executing any task block. Each task is independently executable after the preceding one passes its commit gate. Do NOT skip the TDD loop (write failing test → run fail → implement → run pass → commit).

---

## Goal

Decompose the 1040-line `app/components/ScoreForm.tsx` into a `useScoreForm` hook + `ScoreWizard` + `StepEssay`/`StepInfo`/`StepResult` components, and refactor `app/components/ResultView.tsx` (303 lines) into PUDS dashboard card patterns. All scoring logic, API contract, autosave, validation, revision compare, and export are **preserved unchanged**.

## Architecture After Rebuild

```
app/try/page.tsx            (server, unchanged)
  → TryClient               (unchanged — profile gate)
     → TokenGate            (reskin only: OS-style border/copy)
        → ScoreWizard       (NEW: step state + useScoreForm)
           ├ Stepper         (reuse existing, unchanged)
           ├ StepEssay       (NEW: essay Card + textarea + draft banner + autosave indicator)
           ├ StepInfo        (NEW: meta Card + MetaForm reuse + "AI 첨삭 받기" submit)
           └ StepResult      (NEW: loading/error/ResultView wrapper)
useScoreForm                (NEW hook: all non-presentational logic from ScoreForm)
ResultView                  (refactor internals: StatCard hero + grid, dashboard patterns)
```

## Tech Stack

- Next.js 16, React 19, TypeScript strict, Tailwind v4
- Vitest + @testing-library/react (`npm run test:components`)
- Node --test (`npm run test:unit`)
- Playwright (`npm run test:e2e`)
- Branch: `feat/try-deep-rebuild` (off `main`)

## Global Constraints

1. **Logic preserved exactly**: `/api/score` + `x-demo-token` header, 401 → `onAuthExpired`, draft autosave/restore with keys `pwc_draft_v1`, `pwc_revisions_v1`, `pwc_results_v1`, `pwc_meta_usage_v1`, validation rules (BODY_MIN/MAX, PROMPT_MIN/MAX, TARGET_MIN/MAX), `formatSavedAt`, file upload (TXT/MD/DOCX), clipboard detection.
2. **e2e selectors preserved**: `#body`, `#body-file-upload`, `#school-level`, `#subject`, `#genre`, `#target`, `#prompt`, `#result-score`, `#result-guide`, button labels "다음 단계", "AI 첨삭 받기", "이어 쓰기", "새로 시작", `aria-label="학생 글 본문"`, heading "1. 글을 넣어 주세요", "2. 과제 정보를 알려 주세요". The new wizard must satisfy all assertions in `e2e/try-flow.spec.ts` and `e2e/try-channels.spec.ts`.
3. **`ScoreForm.tsx` is deleted** only in the final task; the existing component tests (`scripts/components/ScoreForm.test.tsx`) are migrated to test the new components.
4. **No new files outside plan scope**; no documentation files.
5. Commit messages end with: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

## File Structure

| Status | Path | Notes |
|--------|------|-------|
| NEW | `app/hooks/useScoreForm.ts` | All non-presentational logic extracted from ScoreForm |
| NEW | `app/components/ScoreWizard.tsx` | Step orchestrator (`step` state, renders StepEssay/StepInfo/StepResult) |
| NEW | `app/components/StepEssay.tsx` | Essay textarea + draft banner + clipboard banner + file upload + autosave indicator + "다음 단계" |
| NEW | `app/components/StepInfo.tsx` | MetaForm + progress bar + "AI 첨삭 받기" submit button + missing-field hint |
| NEW | `app/components/StepResult.tsx` | Loading spinner / error panel / ResultView wrapper |
| MODIFY | `app/components/ResultView.tsx` | Internal dashboard refactor (StatCard hero + area grid + SectionHead); public API unchanged |
| MODIFY | `app/components/TokenGate.tsx` | Render `ScoreWizard` instead of `ScoreForm`; reskin gate panel (OS card style) |
| DELETE (T9) | `app/components/ScoreForm.tsx` | Removed after all logic migrated and tests pass |
| MODIFY | `scripts/components/ScoreForm.test.tsx` | Repoint to `ScoreWizard` + `useScoreForm`; same assertions on UI behaviour |
| NEW | `scripts/components/useScoreForm.test.tsx` | Hook unit tests: validation, submit, 401, draft autosave/restore |
| NEW | `scripts/components/ScoreWizard.test.tsx` | Wizard step orchestration tests |
| NEW | `scripts/components/StepEssay.test.tsx` | Essay step: textarea, file upload, draft banner, clipboard |
| NEW | `scripts/components/StepInfo.test.tsx` | Meta form step: disabled/enabled submit, missing hint |
| NEW | `scripts/components/StepResult.test.tsx` | Loading / error / result render |
| MODIFY | `e2e/try-flow.spec.ts` | Update selectors where heading text changes (Step headings inside new cards) |
| MODIFY | `e2e/try-channels.spec.ts` | Preserve all selectors; verify autosave indicator + resubmit still work |

---

## Future Integration Note — RichEditor Seam

A parallel effort will add `app/components/editor/RichEditor.tsx` with `htmlToPlain`/`plainToHtml` in `app/lib/editor-doc.ts`. The scoring pipeline expects plain-text `body` (the `submission.body` field sent to `/api/score`).

**`StepEssay` is the seam.** Design it so:
- The textarea lives in a named sub-section (`<EssayInput>` or clearly-commented block) that can be swapped for `<RichEditor>` later.
- `StepEssay` receives `body: string` and `onChangeBody: (v: string) => void` from `useScoreForm`; the scoring hook never sees HTML — plain text projection from `htmlToPlain` happens inside `StepEssay` when the swap occurs.
- Do **not** add RichEditor in this plan. Keep the plain `<textarea id="body" aria-label="학생 글 본문">` with the existing id/aria-label so e2e selectors are unchanged.

---

## Tasks

---

### Task 0 — Create branch and scaffold test runner

**Files:** (git only, no source changes)

**Steps:**

1. Run `git checkout -b feat/try-deep-rebuild main`.
2. Run `npm run test:components` — confirm baseline passes.
3. Run `npm run test:e2e` — confirm baseline passes.
4. Commit: `chore: open feat/try-deep-rebuild branch (baseline green)\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

### Task 1 — Extract `useScoreForm` hook (pure logic, no UI)

**Files:**
- CREATE `app/hooks/useScoreForm.ts`
- CREATE `scripts/components/useScoreForm.test.tsx`

**Consumes:**
- `app/lib/grading`: `BODY_MIN`, `BODY_MAX`, `PROMPT_MIN`, `PROMPT_MAX`, `TARGET_MIN`, `TARGET_MAX`, `charCount`, `normalizeBody`, `ErrorCode`, `ERROR_MESSAGE`
- `app/lib/storage`: `loadDraft`, `saveDraft`, `clearDraft`, `DraftSnapshot`, `addResult`, `addRevision`, `getThread`, `recordMetaUsage`, `getMostUsedMeta`, `RevisionEntry`
- `app/lib/progress`: `computeProgress`
- `app/components/TokenGate`: `DEMO_TOKEN_KEY`
- `app/data/scoring`: `F3Output`

**Produces:** `useScoreForm` hook returning `UseScoreFormReturn` (see interface below)

**Interface — `UseScoreFormReturn`:**

```typescript
// app/hooks/useScoreForm.ts
export type UseScoreFormReturn = {
  // ── Essay field ──────────────────────────────────────────────────────
  body: string;
  setBody: (v: string) => void;
  bodyCount: number;                // charCount(normalizeBody(body))
  bodyError: { code: string; message: string } | null;
  bodyOk: boolean;
  progressState: ReturnType<typeof computeProgress> | null;  // null when no targetNum

  // ── File input ───────────────────────────────────────────────────────
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  fileError: string | null;
  isDraggingFile: boolean;
  handleFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleDrop: (e: React.DragEvent<HTMLTextAreaElement>) => void;
  handleDragOver: (e: React.DragEvent<HTMLTextAreaElement>) => void;
  handleDragLeave: () => void;

  // ── Draft banner ─────────────────────────────────────────────────────
  restoredDraft: DraftSnapshot | null;
  lastSavedAt: string | null;
  applyRestore: () => void;
  dismissRestore: () => void;

  // ── Clipboard banner ─────────────────────────────────────────────────
  clipboardPreview: string | null;
  applyClipboard: () => void;
  dismissClipboard: () => void;

  // ── Meta fields ──────────────────────────────────────────────────────
  schoolLevel: string;
  setSchoolLevel: (v: string) => void;
  subject: string;
  setSubject: (v: string) => void;
  genre: string;
  setGenre: (v: string) => void;
  targetRaw: string;
  setTargetRaw: (v: string) => void;
  targetNum: number | null;
  targetInvalid: boolean;
  promptText: string;
  setPromptText: (v: string) => void;

  // ── Validation ───────────────────────────────────────────────────────
  requiredOk: boolean;
  canSubmit: boolean;
  locked: boolean;
  missingFields: string[];   // ["학교·학년", "과목", "장르", "과제 내용(10자 이상)"] etc.

  // ── Submit state ─────────────────────────────────────────────────────
  submitState: SubmitState;
  handleSubmit: (e: React.FormEvent) => void;
  retry: () => void;
  handleResubmit: () => void;   // returns to step essay (caller controls `step` state)

  // ── Refs for scroll ──────────────────────────────────────────────────
  formTopRef: React.RefObject<HTMLDivElement | null>;
  outcomeRef: React.RefObject<HTMLDivElement | null>;

  // ── Revision ─────────────────────────────────────────────────────────
  revisionPair: { v1: RevisionEntry; v2: RevisionEntry } | null;
};

export type SubmitState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "result"; output: F3Output; assignment: ScoreRequest["assignment"] }
  | { phase: "error"; code: string; message: string; retryable: boolean };

export function useScoreForm(opts: {
  onAuthExpired?: () => void;
  defaults?: { school_level?: string; subject?: string; genre?: string };
}): UseScoreFormReturn;
```

**Steps:**

1. Write failing test `scripts/components/useScoreForm.test.tsx`:

```typescript
// scripts/components/useScoreForm.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useScoreForm } from "@/app/hooks/useScoreForm";
import { DEMO_TOKEN_KEY } from "@/app/components/TokenGate";

const MOCK_OUTPUT = {
  total_score: 75,
  scores: [
    { area: "과제 이해", score: 16, max: 20, feedback_good: "g", feedback_fix: "f" },
    { area: "내용 충실도", score: 15, max: 20, feedback_good: "g", feedback_fix: "f" },
    { area: "구조·논리", score: 14, max: 20, feedback_good: "g", feedback_fix: "f" },
    { area: "표현·문장", score: 15, max: 20, feedback_good: "g", feedback_fix: "f" },
    { area: "성장 가능성", score: 15, max: 20, feedback_good: "g", feedback_fix: "f" },
  ],
  revision_guides: [{ priority: 1, action: "결론 보강", reason: "마지막 단락" }],
  meta: { model_version: "v1", generated_at: "2026-06-02T10:00:00+09:00", is_verified: false, disclaimer: "AI 채점" },
};

describe("useScoreForm", () => {
  let originalClipboardDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    sessionStorage.setItem(DEMO_TOKEN_KEY, "test-mock");
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn(() =>
      Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(MOCK_OUTPUT) } as Response)
    ));
    originalClipboardDescriptor = Object.getOwnPropertyDescriptor(window.navigator, "clipboard");
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: { readText: () => Promise.reject(new Error("no-clipboard")) },
    });
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    if (originalClipboardDescriptor) {
      Object.defineProperty(window.navigator, "clipboard", originalClipboardDescriptor);
    } else {
      delete (window.navigator as { clipboard?: unknown }).clipboard;
    }
  });

  it("initial state: bodyOk=false, submitState.phase=idle, canSubmit=false", () => {
    const { result } = renderHook(() => useScoreForm({}));
    expect(result.current.bodyOk).toBe(false);
    expect(result.current.submitState.phase).toBe("idle");
    expect(result.current.canSubmit).toBe(false);
  });

  it("setBody to 50+ chars → bodyOk=true", () => {
    const { result } = renderHook(() => useScoreForm({}));
    act(() => {
      result.current.setBody("오늘 학교에서 친구들과 점심을 먹으며 교복 자율화에 대해 토론했다. 나는 교복이 학생의 개성을 제한한다고 생각한다.");
    });
    expect(result.current.bodyOk).toBe(true);
  });

  it("all fields filled → canSubmit=true", () => {
    const { result } = renderHook(() => useScoreForm({}));
    act(() => {
      result.current.setBody("오늘 학교에서 친구들과 점심을 먹으며 교복 자율화에 대해 토론했다. 나는 교복이 학생의 개성을 제한한다고 생각한다.");
      result.current.setSchoolLevel("중2");
      result.current.setSubject("국어");
      result.current.setGenre("논설문·주장하는 글");
      result.current.setPromptText("교복 자율화에 대한 자신의 주장을 근거 2개 이상으로 쓰시오.");
    });
    expect(result.current.canSubmit).toBe(true);
  });

  it("handleSubmit with canSubmit=true → fetch called + phase=result", async () => {
    const { result } = renderHook(() => useScoreForm({}));
    act(() => {
      result.current.setBody("오늘 학교에서 친구들과 점심을 먹으며 교복 자율화에 대해 토론했다. 나는 교복이 학생의 개성을 제한한다고 생각한다.");
      result.current.setSchoolLevel("중2");
      result.current.setSubject("국어");
      result.current.setGenre("논설문·주장하는 글");
      result.current.setPromptText("교복 자율화에 대한 자신의 주장을 근거 2개 이상으로 쓰시오.");
    });
    act(() => { result.current.handleSubmit({ preventDefault: () => {} } as React.FormEvent); });
    await waitFor(() => expect(result.current.submitState.phase).toBe("result"));
    expect(globalThis.fetch).toHaveBeenCalledWith("/api/score", expect.objectContaining({ method: "POST" }));
  });

  it("401 response → onAuthExpired called, phase back to idle", async () => {
    vi.stubGlobal("fetch", vi.fn(() =>
      Promise.resolve({ ok: false, status: 401, json: () => Promise.reject() } as unknown as Response)
    ));
    const onAuthExpired = vi.fn();
    const { result } = renderHook(() => useScoreForm({ onAuthExpired }));
    act(() => {
      result.current.setBody("오늘 학교에서 친구들과 점심을 먹으며 교복 자율화에 대해 토론했다. 나는 교복이 학생의 개성을 제한한다고 생각한다.");
      result.current.setSchoolLevel("중2");
      result.current.setSubject("국어");
      result.current.setGenre("논설문·주장하는 글");
      result.current.setPromptText("교복 자율화에 대한 자신의 주장을 근거 2개 이상으로 쓰시오.");
    });
    act(() => { result.current.handleSubmit({ preventDefault: () => {} } as React.FormEvent); });
    await waitFor(() => expect(onAuthExpired).toHaveBeenCalledOnce());
    expect(result.current.submitState.phase).toBe("idle");
  });

  it("draft in LS → restoredDraft set on mount, body stays empty", () => {
    localStorage.setItem("pwc_draft_v1", JSON.stringify({
      body: "이전에 작성한 글입니다. 충분히 길어요.", school_level: "중2",
      subject: "국어", genre: "논설문·주장하는 글", saved_at: "2026-06-02T10:00:00+09:00"
    }));
    const { result } = renderHook(() => useScoreForm({}));
    expect(result.current.restoredDraft).not.toBeNull();
    expect(result.current.body).toBe("");
  });

  it("applyRestore → body filled, restoredDraft null", () => {
    const draftBody = "이전에 작성한 글입니다. 충분히 길어요.";
    localStorage.setItem("pwc_draft_v1", JSON.stringify({
      body: draftBody, saved_at: "2026-06-02T10:00:00+09:00"
    }));
    const { result } = renderHook(() => useScoreForm({}));
    act(() => { result.current.applyRestore(); });
    expect(result.current.body).toBe(draftBody);
    expect(result.current.restoredDraft).toBeNull();
  });

  it("dismissRestore → restoredDraft null, LS cleared", () => {
    localStorage.setItem("pwc_draft_v1", JSON.stringify({
      body: "이전 글.", saved_at: "2026-06-02T10:00:00+09:00"
    }));
    const { result } = renderHook(() => useScoreForm({}));
    act(() => { result.current.dismissRestore(); });
    expect(result.current.restoredDraft).toBeNull();
    expect(localStorage.getItem("pwc_draft_v1")).toBeNull();
  });

  it("retryable error → retry() re-calls fetch with same payload", async () => {
    let callCount = 0;
    vi.stubGlobal("fetch", vi.fn(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve({ ok: false, status: 503, json: () => Promise.resolve({ error: { code: "E8" } }) } as unknown as Response);
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(MOCK_OUTPUT) } as Response);
    }));
    const { result } = renderHook(() => useScoreForm({}));
    act(() => {
      result.current.setBody("오늘 학교에서 친구들과 점심을 먹으며 교복 자율화에 대해 토론했다. 나는 교복이 학생의 개성을 제한한다고 생각한다.");
      result.current.setSchoolLevel("중2"); result.current.setSubject("국어");
      result.current.setGenre("논설문·주장하는 글");
      result.current.setPromptText("교복 자율화에 대한 자신의 주장을 근거 2개 이상으로 쓰시오.");
    });
    act(() => { result.current.handleSubmit({ preventDefault: () => {} } as React.FormEvent); });
    await waitFor(() => expect(result.current.submitState.phase).toBe("error"));
    expect((result.current.submitState as { retryable: boolean }).retryable).toBe(true);
    act(() => { result.current.retry(); });
    await waitFor(() => expect(result.current.submitState.phase).toBe("result"));
    expect(callCount).toBe(2);
  });

  it("defaults prop → schoolLevel/subject/genre pre-filled", () => {
    const { result } = renderHook(() =>
      useScoreForm({ defaults: { school_level: "고3", subject: "국어", genre: "감상문·독후감" } })
    );
    expect(result.current.schoolLevel).toBe("고3");
    expect(result.current.subject).toBe("국어");
    expect(result.current.genre).toBe("감상문·독후감");
  });
});
```

2. Run `npm run test:components` — confirm new test file fails (hook does not exist).
3. Create `app/hooks/useScoreForm.ts` by extracting every piece of non-presentational logic from `app/components/ScoreForm.tsx` (lines 11–596):
   - All `useState` and `useRef` declarations (lines 120–159)
   - `useEffect` blocks: submit→step3 scroll suppressed (step control moves to caller), draft load (lines 174–182), clipboard read (lines 188–208), clipboard one-shot clear (lines 213–216), autosave debounce (lines 220–238), clearDraft on result (lines 241–246)
   - Handler functions: `applyRestore`, `dismissRestore`, `applyClipboard`, `dismissClipboard`, `readTextFile`, `handleFileInput`, `handleDrop`, `handleDragOver`, `handleDragLeave` (lines 248–403)
   - Derived values: `bodyCount`, `targetTrimmed`, `targetNum`, `targetInvalid`, `promptOk`, `requiredOk`, `bodyError`, `bodyOk`, `progressState`, `locked`, `canSubmit`, `missingFields` (lines 406–444)
   - `runScore`, `handleSubmit`, `retry`, `handleResubmit` (lines 447–595) — **`handleResubmit` does NOT call `setStep`; instead it calls a passed-in `onResubmit?: () => void` callback** so the wizard controls step state.
   - Add parameter: `opts: { onAuthExpired?: () => void; defaults?: { school_level?: string; subject?: string; genre?: string }; onResubmit?: () => void }` where `onResubmit` replaces the direct `setStep(1)` call.
   - `formTopRef` and `outcomeRef` are returned; scroll-on-result (`setStep(3)` + `outcomeRef.current?.scrollIntoView`) is removed (wizard handles this via `submitState.phase` watch).
   - Add `missingFields: string[]` derived value: collect same missing-field strings as the inline IIFE in ScoreForm lines 951–966.
4. Run `npm run test:components` — all new tests pass.
5. Run `npm run typecheck` — clean.
6. Commit:

```
feat(hook): extract useScoreForm from ScoreForm — all logic preserved

All state/autosave/validation/submit/401/revision logic migrated.
ScoreForm.tsx not yet modified (done in Task 7).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
```

---

### Task 2 — Create `StepEssay` component

**Files:**
- CREATE `app/components/StepEssay.tsx`
- CREATE `scripts/components/StepEssay.test.tsx`

**Consumes:** `UseScoreFormReturn` props (destructured), `BODY_MIN`, `BODY_MAX`, `getProgressBarClass`, `getProgressTextClass`, `cn`

**Produces:** `StepEssay` component with exact same DOM as ScoreForm Step 1 section (lines 691–867 of ScoreForm.tsx)

**Interface:**

```typescript
// app/components/StepEssay.tsx
export type StepEssayProps = {
  // Essay state (seam: later swap textarea for RichEditor here)
  body: string;
  onChangeBody: (v: string) => void;     // RichEditor seam: plain-text projection feeds this
  bodyCount: number;
  bodyError: { code: string; message: string } | null;
  bodyOk: boolean;
  progressState: ReturnType<typeof computeProgress> | null;
  locked: boolean;
  lastSavedAt: string | null;
  targetNum: number | null;
  // Draft banner
  restoredDraft: DraftSnapshot | null;
  onApplyRestore: () => void;
  onDismissRestore: () => void;
  // Clipboard banner
  clipboardPreview: string | null;
  onApplyClipboard: () => void;
  onDismissClipboard: () => void;
  // File input
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  fileError: string | null;
  isDraggingFile: boolean;
  onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDrop: (e: React.DragEvent<HTMLTextAreaElement>) => void;
  onDragOver: (e: React.DragEvent<HTMLTextAreaElement>) => void;
  onDragLeave: () => void;
  // Navigation
  onNext: () => void;   // "다음 단계" button handler
};
```

**Steps:**

1. Write failing test `scripts/components/StepEssay.test.tsx`:

```typescript
// scripts/components/StepEssay.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StepEssay from "@/app/components/StepEssay";
import { createRef } from "react";

const baseProps = {
  body: "",
  onChangeBody: vi.fn(),
  bodyCount: 0,
  bodyError: null,
  bodyOk: false,
  progressState: null,
  locked: false,
  lastSavedAt: null,
  targetNum: null,
  restoredDraft: null,
  onApplyRestore: vi.fn(),
  onDismissRestore: vi.fn(),
  clipboardPreview: null,
  onApplyClipboard: vi.fn(),
  onDismissClipboard: vi.fn(),
  fileInputRef: createRef<HTMLInputElement>(),
  fileError: null,
  isDraggingFile: false,
  onFileInput: vi.fn(),
  onDrop: vi.fn(),
  onDragOver: vi.fn(),
  onDragLeave: vi.fn(),
  onNext: vi.fn(),
};

describe("StepEssay", () => {
  it("renders heading '1. 글을 넣어 주세요'", () => {
    render(<StepEssay {...baseProps} />);
    expect(screen.getByRole("heading", { name: "1. 글을 넣어 주세요" })).toBeInTheDocument();
  });

  it("textarea has id='body' and aria-label='학생 글 본문'", () => {
    render(<StepEssay {...baseProps} />);
    const ta = screen.getByRole("textbox", { name: "학생 글 본문" });
    expect(ta).toHaveAttribute("id", "body");
  });

  it("'다음 단계' button is disabled when bodyOk=false", () => {
    render(<StepEssay {...baseProps} bodyOk={false} />);
    expect(screen.getByRole("button", { name: /다음 단계/ })).toBeDisabled();
  });

  it("'다음 단계' button enabled and fires onNext when bodyOk=true", async () => {
    const onNext = vi.fn();
    const user = userEvent.setup();
    render(<StepEssay {...baseProps} bodyOk={true} onNext={onNext} />);
    await user.click(screen.getByRole("button", { name: /다음 단계/ }));
    expect(onNext).toHaveBeenCalledOnce();
  });

  it("shows draft restore banner when restoredDraft is set", () => {
    render(<StepEssay {...baseProps} restoredDraft={{ body: "이전 글", saved_at: "2026-06-02T10:00:00+09:00" }} />);
    expect(screen.getByText("📝 이전에 쓰던 작업이 있어요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "이어 쓰기" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "새로 시작" })).toBeInTheDocument();
  });

  it("'이어 쓰기' fires onApplyRestore", async () => {
    const onApplyRestore = vi.fn();
    const user = userEvent.setup();
    render(<StepEssay {...baseProps} restoredDraft={{ body: "이전 글", saved_at: "2026-06-02T10:00:00+09:00" }} onApplyRestore={onApplyRestore} />);
    await user.click(screen.getByRole("button", { name: "이어 쓰기" }));
    expect(onApplyRestore).toHaveBeenCalledOnce();
  });

  it("'새로 시작' fires onDismissRestore", async () => {
    const onDismissRestore = vi.fn();
    const user = userEvent.setup();
    render(<StepEssay {...baseProps} restoredDraft={{ body: "이전 글", saved_at: "2026-06-02T10:00:00+09:00" }} onDismissRestore={onDismissRestore} />);
    await user.click(screen.getByRole("button", { name: "새로 시작" }));
    expect(onDismissRestore).toHaveBeenCalledOnce();
  });

  it("clipboard preview banner shown when clipboardPreview set and body empty", () => {
    render(<StepEssay {...baseProps} clipboardPreview="클립보드 내용 30자 이상입니다 충분히 길어요." body="" />);
    expect(screen.getByRole("region", { name: "클립보드 글 붙여넣기" })).toBeInTheDocument();
  });

  it("autosave indicator shown when lastSavedAt set", () => {
    render(<StepEssay {...baseProps} lastSavedAt="2026-06-02T10:30:00+09:00" />);
    expect(screen.getByText(/자동 저장됨/)).toBeInTheDocument();
  });

  it("file upload input has id='body-file-upload'", () => {
    render(<StepEssay {...baseProps} />);
    expect(document.getElementById("body-file-upload")).toBeInTheDocument();
  });

  it("fileError shown in alert role", () => {
    render(<StepEssay {...baseProps} fileError="파일 형식 오류" />);
    expect(screen.getByRole("alert")).toHaveTextContent("파일 형식 오류");
  });

  it("bodyError message shown", () => {
    render(<StepEssay {...baseProps} bodyError={{ code: "E2", message: "본문을 50자 이상 입력해 주세요" }} />);
    expect(screen.getByText("본문을 50자 이상 입력해 주세요")).toBeInTheDocument();
  });
});
```

2. Run `npm run test:components` — new tests fail.
3. Create `app/components/StepEssay.tsx`:
   - Copy the entire JSX for the draft restore banner (ScoreForm lines 610–645), clipboard banner (lines 649–683), Step 1 section card (lines 691–846), and "다음 단계" button block (lines 849–867) from `ScoreForm.tsx`.
   - Wire all event handlers and state via props (no internal `useState`/`useEffect`).
   - Keep `<textarea id="body" aria-label="학생 글 본문">` with the same id and aria-label (e2e selector stability).
   - Mark the textarea section with comment `{/* === RichEditor seam: swap this block for <RichEditor> and pipe htmlToPlain → onChangeBody === */}`.
   - The disclaimer paragraph (`submit.phase !== "result"`) moves to `StepResult`; do NOT render it here.
   - Add `"use client"` directive.
4. Run `npm run test:components` — all new tests pass.
5. Run `npm run typecheck` — clean.
6. Commit:

```
feat(component): add StepEssay — essay step with RichEditor seam comment

Extracted from ScoreForm step 1 section. textarea id/aria-label unchanged
for e2e selector stability.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
```

---

### Task 3 — Create `StepInfo` component

**Files:**
- CREATE `app/components/StepInfo.tsx`
- CREATE `scripts/components/StepInfo.test.tsx`

**Consumes:** `UseScoreFormReturn` props, `MetaForm`, `TextPreviewCard`, `computeProgress`, `getProgressBarClass`, `getProgressTextClass`, `cn`

**Produces:** `StepInfo` component — complete DOM of ScoreForm Step 2 (lines 870–968)

**Interface:**

```typescript
// app/components/StepInfo.tsx
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
```

**Steps:**

1. Write failing test `scripts/components/StepInfo.test.tsx`:

```typescript
// scripts/components/StepInfo.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StepInfo from "@/app/components/StepInfo";

const baseProps = {
  schoolLevel: "", subject: "", genre: "", targetRaw: "", targetNum: null,
  targetInvalid: false, promptText: "",
  onChangeSchoolLevel: vi.fn(), onChangeSubject: vi.fn(), onChangeGenre: vi.fn(),
  onChangeTargetRaw: vi.fn(), onChangePromptText: vi.fn(),
  body: "학생이 작성한 글입니다. 충분히 길어요.",
  bodyCount: 18, progressState: null,
  canSubmit: false, locked: false, isLoading: false,
  missingFields: ["학교·학년", "과목", "장르", "과제 내용(10자 이상)"],
  onSubmit: vi.fn(), onBack: vi.fn(),
};

describe("StepInfo", () => {
  it("renders heading '2. 과제 정보를 알려 주세요'", () => {
    render(<StepInfo {...baseProps} />);
    expect(screen.getByRole("heading", { name: "2. 과제 정보를 알려 주세요" })).toBeInTheDocument();
  });

  it("shows TextPreviewCard '내 글 미리보기'", () => {
    render(<StepInfo {...baseProps} />);
    expect(screen.getByText("내 글 미리보기")).toBeInTheDocument();
  });

  it("'AI 첨삭 받기' button disabled when canSubmit=false", () => {
    render(<StepInfo {...baseProps} canSubmit={false} />);
    expect(screen.getByRole("button", { name: "AI 첨삭 받기" })).toBeDisabled();
  });

  it("'AI 첨삭 받기' button enabled when canSubmit=true", () => {
    render(<StepInfo {...baseProps} canSubmit={true} />);
    expect(screen.getByRole("button", { name: "AI 첨삭 받기" })).toBeEnabled();
  });

  it("missing field hint shown when canSubmit=false", () => {
    render(<StepInfo {...baseProps} canSubmit={false} isLoading={false} />);
    expect(screen.getByText(/다음을 채우면 채점을 받을 수 있어요/)).toBeInTheDocument();
    expect(screen.getByText(/다음을 채우면 채점을 받을 수 있어요/)).toHaveTextContent("학교·학년");
  });

  it("submit button shows loading copy when isLoading=true", () => {
    render(<StepInfo {...baseProps} isLoading={true} locked={true} canSubmit={false} missingFields={[]} />);
    expect(screen.getByRole("button", { name: /AI가 글을 읽고 있어요/ })).toBeInTheDocument();
  });

  it("'AI 첨삭 받기' calls onSubmit when enabled", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<StepInfo {...baseProps} canSubmit={true} onSubmit={onSubmit} />);
    // Submit button is inside a form — click it
    await user.click(screen.getByRole("button", { name: "AI 첨삭 받기" }));
    expect(onSubmit).toHaveBeenCalled();
  });

  it("MetaForm select fields rendered with correct ids", () => {
    render(<StepInfo {...baseProps} />);
    expect(document.getElementById("school-level")).toBeInTheDocument();
    expect(document.getElementById("subject")).toBeInTheDocument();
    expect(document.getElementById("genre")).toBeInTheDocument();
    expect(document.getElementById("prompt")).toBeInTheDocument();
  });
});
```

2. Run `npm run test:components` — new tests fail.
3. Create `app/components/StepInfo.tsx`:
   - Copy JSX of ScoreForm Step 2 section (lines 870–968): `TextPreviewCard` + meta section card + `MetaForm` + progress bar block + submit `<form>` + missing-field hint.
   - `TextPreviewCard` receives `onEdit={onBack}`.
   - The submit `<form onSubmit={onSubmit}>` contains `<button type="submit">` with label "AI 첨삭 받기" (idle) or "AI가 글을 읽고 있어요…" (loading). Button `disabled={!canSubmit}`.
   - Missing-field hint paragraph: `!isLoading && !canSubmit && missingFields.length > 0` → `"다음을 채우면 채점을 받을 수 있어요: ${missingFields.join(' · ')}"`.
   - Add `"use client"` directive.
4. Run `npm run test:components` — all new tests pass.
5. Run `npm run typecheck` — clean.
6. Commit:

```
feat(component): add StepInfo — meta/submit step

Reuses MetaForm and TextPreviewCard. Missing-field hint uses missingFields
array from useScoreForm hook.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
```

---

### Task 4 — Create `StepResult` component

**Files:**
- CREATE `app/components/StepResult.tsx`
- CREATE `scripts/components/StepResult.test.tsx`

**Consumes:** `SubmitState`, `ResultView`, `RevisionEntry`, `scrollBehavior`

**Produces:** `StepResult` — loading spinner / error panel / ResultView wrapper (ScoreForm lines 970–1036)

**Interface:**

```typescript
// app/components/StepResult.tsx
export type StepResultProps = {
  submitState: SubmitState;
  revisionPair: { v1: RevisionEntry; v2: RevisionEntry } | null;
  onRetry: () => void;
  onResubmit: () => void;
  outcomeRef: React.RefObject<HTMLDivElement | null>;
};
```

**Steps:**

1. Write failing test `scripts/components/StepResult.test.tsx`:

```typescript
// scripts/components/StepResult.test.tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StepResult from "@/app/components/StepResult";
import { createRef } from "react";

const MOCK_OUTPUT = {
  total_score: 75,
  scores: [
    { area: "과제 이해", score: 16, max: 20, feedback_good: "g", feedback_fix: "f" },
    { area: "내용 충실도", score: 15, max: 20, feedback_good: "g", feedback_fix: "f" },
    { area: "구조·논리", score: 14, max: 20, feedback_good: "g", feedback_fix: "f" },
    { area: "표현·문장", score: 15, max: 20, feedback_good: "g", feedback_fix: "f" },
    { area: "성장 가능성", score: 15, max: 20, feedback_good: "g", feedback_fix: "f" },
  ],
  revision_guides: [{ priority: 1, action: "결론 보강", reason: "마지막 단락" }],
  meta: { model_version: "v1", generated_at: "2026-06-02T10:00:00+09:00", is_verified: false, disclaimer: "AI 채점입니다." },
};

const MOCK_ASSIGNMENT = { school_level: "중2", subject: "국어", genre: "논설문·주장하는 글", target_char_count: null, prompt_text: "쓰시오" };

const baseProps = {
  revisionPair: null,
  onRetry: vi.fn(),
  onResubmit: vi.fn(),
  outcomeRef: createRef<HTMLDivElement>(),
};

describe("StepResult", () => {
  it("loading: shows spinner and '5가지 기준' copy", () => {
    render(<StepResult {...baseProps} submitState={{ phase: "loading" }} />);
    expect(screen.getByText(/AI가 5가지 기준으로 글을 읽고 있어요/)).toBeInTheDocument();
  });

  it("error: shows '채점을 마치지 못했어요' heading and error message", () => {
    render(<StepResult {...baseProps} submitState={{ phase: "error", code: "E5", message: "결과를 다시 만들어야 해요.", retryable: true }} />);
    expect(screen.getByRole("heading", { name: "채점을 마치지 못했어요" })).toBeInTheDocument();
    expect(screen.getByText("결과를 다시 만들어야 해요.")).toBeInTheDocument();
  });

  it("error: retryable=true shows '다시 시도하기' button", () => {
    render(<StepResult {...baseProps} submitState={{ phase: "error", code: "E5", message: "msg", retryable: true }} />);
    expect(screen.getByRole("button", { name: "다시 시도하기" })).toBeInTheDocument();
  });

  it("error: retryable=false hides '다시 시도하기'", () => {
    render(<StepResult {...baseProps} submitState={{ phase: "error", code: "E1", message: "msg", retryable: false }} />);
    expect(screen.queryByRole("button", { name: "다시 시도하기" })).not.toBeInTheDocument();
  });

  it("error: always shows resubmit button (고쳐쓰기 시작)", () => {
    render(<StepResult {...baseProps} submitState={{ phase: "error", code: "E5", message: "msg", retryable: false }} />);
    expect(screen.getByRole("button", { name: /고쳐쓰기 시작/ })).toBeInTheDocument();
  });

  it("error: retry button fires onRetry", async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(<StepResult {...baseProps} submitState={{ phase: "error", code: "E8", message: "msg", retryable: true }} onRetry={onRetry} />);
    await user.click(screen.getByRole("button", { name: "다시 시도하기" }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it("result: shows #result-score with total_score", () => {
    render(<StepResult {...baseProps} submitState={{ phase: "result", output: MOCK_OUTPUT, assignment: MOCK_ASSIGNMENT }} />);
    expect(document.getElementById("result-score")).toBeInTheDocument();
    expect(screen.getByText("75")).toBeInTheDocument();
  });

  it("result: shows resubmit button '고쳐쓰기 시작' (no revisionPair)", () => {
    render(<StepResult {...baseProps} submitState={{ phase: "result", output: MOCK_OUTPUT, assignment: MOCK_ASSIGNMENT }} />);
    expect(screen.getByRole("button", { name: "고쳐쓰기 시작" })).toBeInTheDocument();
  });

  it("result: resubmit button fires onResubmit", async () => {
    const onResubmit = vi.fn();
    const user = userEvent.setup();
    render(<StepResult {...baseProps} submitState={{ phase: "result", output: MOCK_OUTPUT, assignment: MOCK_ASSIGNMENT }} onResubmit={onResubmit} />);
    await user.click(screen.getByRole("button", { name: "고쳐쓰기 시작" }));
    expect(onResubmit).toHaveBeenCalledOnce();
  });

  it("result with revisionPair: resubmit says '한 번 더 고쳐쓰기'", () => {
    const mockEntry = { id: "x", version: 1, created_at: "2026-06-02T10:00:00+09:00", assignment: MOCK_ASSIGNMENT, submission: { body: "a", char_count: 1 }, output: MOCK_OUTPUT };
    render(<StepResult {...baseProps} revisionPair={{ v1: mockEntry, v2: mockEntry }} submitState={{ phase: "result", output: MOCK_OUTPUT, assignment: MOCK_ASSIGNMENT }} />);
    expect(screen.getByRole("button", { name: "한 번 더 고쳐쓰기" })).toBeInTheDocument();
  });

  it("idle: renders nothing", () => {
    const { container } = render(<StepResult {...baseProps} submitState={{ phase: "idle" }} />);
    expect(container.firstChild).toBeNull();
  });

  it("result: disclaimer rendered (AI 자동 채점)", () => {
    render(<StepResult {...baseProps} submitState={{ phase: "result", output: MOCK_OUTPUT, assignment: MOCK_ASSIGNMENT }} />);
    // disclaimer is in ExportableResultFrame inside ResultView
    expect(screen.getByText(/AI 채점입니다/)).toBeInTheDocument();
  });
});
```

2. Run `npm run test:components` — new tests fail.
3. Create `app/components/StepResult.tsx`:
   - Copy JSX from ScoreForm lines 970–1036: loading section, error section, result `<div ref={outcomeRef}>` wrapping `<ResultView>`.
   - `resubmitButton` JSX moved inside this component (uses `revisionPair` prop to pick label).
   - idle phase: return `null`.
   - The standalone disclaimer `<p>` (ScoreForm line 1031–1036 — shown when `submit.phase !== "result"`) moves here: shown when phase is "loading" or "error".
   - Add `"use client"` directive.
4. Run `npm run test:components` — all new tests pass.
5. Run `npm run typecheck` — clean.
6. Commit:

```
feat(component): add StepResult — loading/error/result wrapper

Extracts loading spinner, error panel, and ResultView wrapper from
ScoreForm. Idle phase returns null.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
```

---

### Task 5 — Create `ScoreWizard` (orchestrator)

**Files:**
- CREATE `app/components/ScoreWizard.tsx`
- CREATE `scripts/components/ScoreWizard.test.tsx`

**Consumes:** `useScoreForm`, `Stepper`, `StepEssay`, `StepInfo`, `StepResult`, `scrollBehavior`

**Produces:** `ScoreWizard` — renders all three steps, controls `step` state (1|2|3), wires `useScoreForm` to step components

**Interface:**

```typescript
// app/components/ScoreWizard.tsx
export type ScoreWizardProps = {
  onAuthExpired?: () => void;
  defaults?: { school_level?: string; subject?: string; genre?: string };
};

export default function ScoreWizard(props: ScoreWizardProps): React.ReactNode;
```

**Steps:**

1. Write failing test `scripts/components/ScoreWizard.test.tsx`:

```typescript
// scripts/components/ScoreWizard.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ScoreWizard from "@/app/components/ScoreWizard";
import { DEMO_TOKEN_KEY } from "@/app/components/TokenGate";

const MOCK_BODY =
  "오늘 학교에서 친구들과 점심을 먹으며 교복 자율화에 대해 토론했다. 나는 교복이 학생의 개성을 제한한다고 생각한다.";

const MOCK_OUTPUT = {
  total_score: 75,
  scores: [
    { area: "과제 이해", score: 16, max: 20, feedback_good: "g", feedback_fix: "f" },
    { area: "내용 충실도", score: 15, max: 20, feedback_good: "g", feedback_fix: "f" },
    { area: "구조·논리", score: 14, max: 20, feedback_good: "g", feedback_fix: "f" },
    { area: "표현·문장", score: 15, max: 20, feedback_good: "g", feedback_fix: "f" },
    { area: "성장 가능성", score: 15, max: 20, feedback_good: "g", feedback_fix: "f" },
  ],
  revision_guides: [{ priority: 1, action: "결론 보강", reason: "마지막 단락" }],
  meta: { model_version: "v1", generated_at: "2026-06-02T10:00:00+09:00", is_verified: false, disclaimer: "AI 채점입니다." },
};

describe("ScoreWizard", () => {
  let originalClipboardDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    sessionStorage.setItem(DEMO_TOKEN_KEY, "test-mock");
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn(() =>
      Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(MOCK_OUTPUT) } as Response)
    ));
    originalClipboardDescriptor = Object.getOwnPropertyDescriptor(window.navigator, "clipboard");
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: { readText: () => Promise.reject(new Error("no-clipboard")) },
    });
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    if (originalClipboardDescriptor) {
      Object.defineProperty(window.navigator, "clipboard", originalClipboardDescriptor);
    } else {
      delete (window.navigator as { clipboard?: unknown }).clipboard;
    }
  });

  it("initial render: Step 1 visible, Stepper visible, Step 2 hidden", () => {
    render(<ScoreWizard />);
    expect(screen.getByRole("heading", { name: "1. 글을 넣어 주세요" })).toBeInTheDocument();
    expect(screen.getByLabelText("진행 단계")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /2\. 과제 정보/ })).not.toBeInTheDocument();
  });

  it("body filled → '다음 단계' enabled → click → Step 2 visible", async () => {
    const user = userEvent.setup();
    render(<ScoreWizard />);
    await user.type(screen.getByRole("textbox", { name: "학생 글 본문" }), MOCK_BODY);
    const nextBtn = screen.getByRole("button", { name: /다음 단계/ });
    expect(nextBtn).toBeEnabled();
    await user.click(nextBtn);
    expect(screen.getByRole("heading", { name: /2\. 과제 정보/ })).toBeInTheDocument();
    expect(screen.getByText("내 글 미리보기")).toBeInTheDocument();
  });

  it("Step 2 [수정] → Step 1 restored, body preserved", async () => {
    const user = userEvent.setup();
    render(<ScoreWizard />);
    await user.type(screen.getByRole("textbox", { name: "학생 글 본문" }), MOCK_BODY);
    await user.click(screen.getByRole("button", { name: /다음 단계/ }));
    await user.click(screen.getByText("내 글 미리보기"));
    await user.click(screen.getByRole("button", { name: /수정/ }));
    expect(screen.getByRole("heading", { name: "1. 글을 넣어 주세요" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "학생 글 본문" })).toHaveValue(MOCK_BODY);
  });

  it("full flow Step 1→2→3: submit → result shown (#result-score)", async () => {
    const user = userEvent.setup();
    render(<ScoreWizard />);
    await user.type(screen.getByRole("textbox", { name: "학생 글 본문" }), MOCK_BODY);
    await user.click(screen.getByRole("button", { name: /다음 단계/ }));
    await user.selectOptions(screen.getByLabelText("학교·학년"), "중2");
    await user.selectOptions(screen.getByLabelText("과목"), "국어");
    await user.selectOptions(screen.getByLabelText("어떤 글인가요?"), "논설문·주장하는 글");
    await user.type(screen.getByLabelText("과제 내용"), "교복 자율화에 대한 자신의 주장을 근거 2개 이상으로 쓰시오.");
    await user.click(screen.getByRole("button", { name: "AI 첨삭 받기" }));
    await waitFor(() => expect(screen.getByText("75")).toBeInTheDocument(), { timeout: 5000 });
    expect(document.getElementById("result-score")).toBeInTheDocument();
  });

  it("result → resubmit → Step 1 restored, body preserved", async () => {
    const user = userEvent.setup();
    render(<ScoreWizard />);
    await user.type(screen.getByRole("textbox", { name: "학생 글 본문" }), MOCK_BODY);
    await user.click(screen.getByRole("button", { name: /다음 단계/ }));
    await user.selectOptions(screen.getByLabelText("학교·학년"), "중2");
    await user.selectOptions(screen.getByLabelText("과목"), "국어");
    await user.selectOptions(screen.getByLabelText("어떤 글인가요?"), "논설문·주장하는 글");
    await user.type(screen.getByLabelText("과제 내용"), "교복 자율화에 대한 자신의 주장을 근거 2개 이상으로 쓰시오.");
    await user.click(screen.getByRole("button", { name: "AI 첨삭 받기" }));
    await waitFor(() => expect(screen.getByText("75")).toBeInTheDocument(), { timeout: 5000 });
    const resubmitBtn = screen.getByRole("button", { name: /고쳐쓰기 시작|한 번 더 고쳐쓰기/ });
    await user.click(resubmitBtn);
    expect(screen.getByRole("heading", { name: "1. 글을 넣어 주세요" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "학생 글 본문" })).toHaveValue(MOCK_BODY);
  });

  it("Stepper hidden in step 3 (result/loading/error phase)", async () => {
    const user = userEvent.setup();
    render(<ScoreWizard />);
    await user.type(screen.getByRole("textbox", { name: "학생 글 본문" }), MOCK_BODY);
    await user.click(screen.getByRole("button", { name: /다음 단계/ }));
    await user.selectOptions(screen.getByLabelText("학교·학년"), "중2");
    await user.selectOptions(screen.getByLabelText("과목"), "국어");
    await user.selectOptions(screen.getByLabelText("어떤 글인가요?"), "논설문·주장하는 글");
    await user.type(screen.getByLabelText("과제 내용"), "교복 자율화에 대한 자신의 주장을 근거 2개 이상으로 쓰시오.");
    await user.click(screen.getByRole("button", { name: "AI 첨삭 받기" }));
    await waitFor(() => expect(screen.getByText("75")).toBeInTheDocument(), { timeout: 5000 });
    // Stepper is hidden in step 3 (same as original ScoreForm: `step !== 3 && <Stepper>`)
    expect(screen.queryByLabelText("진행 단계")).not.toBeInTheDocument();
  });

  it("defaults prop: Step 2 shows prefilled school_level/subject/genre", async () => {
    const user = userEvent.setup();
    render(<ScoreWizard defaults={{ school_level: "고3", subject: "국어", genre: "감상문·독후감" }} />);
    await user.type(screen.getByRole("textbox", { name: "학생 글 본문" }), MOCK_BODY);
    await user.click(screen.getByRole("button", { name: /다음 단계/ }));
    expect(screen.getByLabelText("학교·학년")).toHaveValue("고3");
    expect(screen.getByLabelText("과목")).toHaveValue("국어");
    expect(screen.getByLabelText("어떤 글인가요?")).toHaveValue("감상문·독후감");
  });

  it("draft restore: shows banner on mount, body empty; [이어 쓰기] restores", async () => {
    localStorage.setItem("pwc_draft_v1", JSON.stringify({
      body: MOCK_BODY, school_level: "중2", subject: "국어",
      genre: "논설문·주장하는 글", saved_at: "2026-06-02T10:00:00+09:00"
    }));
    const user = userEvent.setup();
    render(<ScoreWizard />);
    expect(screen.getByText("📝 이전에 쓰던 작업이 있어요")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "학생 글 본문" })).toHaveValue("");
    await user.click(screen.getByRole("button", { name: "이어 쓰기" }));
    expect(screen.getByRole("textbox", { name: "학생 글 본문" })).toHaveValue(MOCK_BODY);
    expect(screen.queryByText("📝 이전에 쓰던 작업이 있어요")).not.toBeInTheDocument();
  });
});
```

2. Run `npm run test:components` — new tests fail.
3. Create `app/components/ScoreWizard.tsx`:
   - Add `"use client"` directive.
   - `step` state: `const [step, setStep] = useState<1 | 2 | 3>(1)`.
   - Call `useScoreForm({ onAuthExpired, defaults, onResubmit: () => { setStep(1); formTopRef.current?.scrollIntoView({ behavior: scrollBehavior() }); } })`.
   - `useEffect` on `submitState.phase`: when phase is "loading", "result", or "error" → `setStep(3); outcomeRef.current?.scrollIntoView(...)`. (This replaces the inline effect in ScoreForm lines 164–169.)
   - Render:
     ```tsx
     <div ref={formTopRef} className="space-y-6">
       {step !== 3 && <Stepper current={step} />}
       {step === 1 && <StepEssay ...all essay props... onNext={() => setStep(2)} />}
       {step === 2 && <StepInfo ...all meta props... onBack={() => setStep(1)} onSubmit={handleSubmit} />}
       <StepResult submitState={submitState} revisionPair={revisionPair} onRetry={retry} onResubmit={handleResubmit} outcomeRef={outcomeRef} />
     </div>
     ```
   - Note: `StepResult` is **always rendered** (not conditional on step 3) because `idle` phase returns `null`; the scroll side-effect in the `useEffect` handles moving to it. This mirrors ScoreForm's original behavior where loading/error/result sections appear below the form in any step.
4. Run `npm run test:components` — all new tests pass.
5. Run `npm run typecheck` — clean.
6. Commit:

```
feat(component): add ScoreWizard — orchestrates 3-step flow via useScoreForm

Step transitions, Stepper visibility, and submit→result phase scroll
all wired. ScoreForm.tsx not yet removed.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
```

---

### Task 6 — Wire `TokenGate` to use `ScoreWizard`

**Files:**
- MODIFY `app/components/TokenGate.tsx`

**Steps:**

1. In `TokenGate.tsx`, replace the import of `ScoreForm` (line 16) with an import of `ScoreWizard` from `./ScoreWizard`.
2. Replace the render of `<ScoreForm defaults={defaults} onAuthExpired={handleAuthExpired} />` (line 190) with `<ScoreWizard defaults={defaults} onAuthExpired={handleAuthExpired} />`.
3. (Reskin TokenGate gate panel — OS card style): Update the gate panel section (lines 98–139): change `rounded-xl border` to `rounded-2xl border` and add `shadow-sm`. Change `h2` copy to `🔒 데모 접근 코드` (no functional change, just cosmetic per spec "리스킨"). The `entered` strip (lines 143–153): change font to `text-xs font-medium`. All functional logic (enter/leave/handleAuthExpired/AUTO_TOKEN) is unchanged.
4. Run `npm run test:components` — all tests pass (no new tests required; TokenGate changes are cosmetic, tested by e2e).
5. Run `npm run typecheck` — clean.
6. Run `npm run test:e2e` — confirm `/try wizard` e2e still passes (all selectors are inside wizard, not TokenGate).
7. Commit:

```
feat(gate): wire TokenGate to ScoreWizard + OS card reskin

ScoreWizard replaces ScoreForm inside TokenGate. Gate panel gets
rounded-2xl shadow-sm (no functional change).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
```

---

### Task 7 — Migrate `scripts/components/ScoreForm.test.tsx` → `ScoreWizard`

**Files:**
- MODIFY `scripts/components/ScoreForm.test.tsx` → rename and repoint to `ScoreWizard`

**Steps:**

1. Rename `scripts/components/ScoreForm.test.tsx` to `scripts/components/ScoreWizard-migrated.test.tsx` (or keep filename and update imports; keeping the filename is fine since it tests the same contract — the old `ScoreForm` behaviour through the new `ScoreWizard`).
2. Update the import at line 8 from `import ScoreForm from "@/app/components/ScoreForm"` to `import ScoreWizard from "@/app/components/ScoreWizard"`.
3. Replace all `render(<ScoreForm .../>)` and `render(<ScoreForm/>)` calls with `render(<ScoreWizard .../>)` / `render(<ScoreWizard/>)`.
4. For the `defaults` test (line 228): `<ScoreForm defaults={...}/>` → `<ScoreWizard defaults={...}/>`. Interface is identical.
5. All assertions (headings, button labels, IDs, aria-labels) are **unchanged** — they already match the new step structure since `StepEssay`/`StepInfo` preserve all IDs and copy.
6. Run `npm run test:components` — all tests pass.
7. Run `npm run typecheck` — clean.
8. Commit:

```
test: migrate ScoreForm.test.tsx to ScoreWizard (same assertions, new component)

All existing wizard behaviour assertions preserved. ScoreForm.tsx
still exists (deleted in Task 9 after full suite passes).

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
```

---

### Task 8 — Refactor `ResultView` internals (dashboard patterns)

**Files:**
- MODIFY `app/components/ResultView.tsx`

**Goal:** Internal visual refactor — dashboard hero + area grid cards, `SectionHead` usage. Public API (`assignment`, `output`, `actions`, `className`, `revisionMode` props) is **unchanged**. Selectors `#result-score`, `#result-feedback`, `#result-guide` are **preserved**.

**Steps:**

1. The existing test for `ResultView` is covered by `ScoreWizard.test.tsx` (full flow tests render ResultView). No separate ResultView test file required for the refactor since public API is unchanged; if a `scripts/components/ResultView.test.tsx` exists, run it as guard.
2. Run `npm run test:components` — establish passing baseline.
3. Edit `app/components/ResultView.tsx`:

   **C1 (점수 section, lines 119–213):** Wrap the total score hero in a dedicated hero sub-block:
   ```tsx
   {/* Hero: total score + band */}
   <div className="bg-surface-raised rounded-xl p-5 text-center">
     <div className="text-foreground text-5xl font-bold tracking-tight tabular-nums">
       {output.total_score}
       <span className="text-subtle-foreground text-xl font-normal"> / 100</span>
     </div>
     <p className={cn("mt-1 text-sm font-semibold", band.textClass)}>{band.label}</p>
     <p className="text-muted-foreground mt-1 text-xs">{band.message}</p>
   </div>
   ```
   Then the 5-area score list becomes a card grid row — keep the `<ul>` with existing bar rendering, revisionMode animation (`score-bar--from`, `--from-width` custom property), `isMax`/`isMin` highlighting, and `gap` banner unchanged.

   **C2 (영역별 피드백, lines 215–270):** Replace the plain `<div>` per area with card-style wrapper using `rounded-lg border border-border p-3`. Keep `id={feedbackAreaId(i)}`, `WhyScoreToggle`, `FeedbackDiff` (revisionMode) unchanged. Use `SectionHead` component if available, otherwise keep the `<h2>` pattern unchanged.

   **C3 (수정 가이드, lines 272–298):** Keep `<ol>` structure unchanged — only cosmetic: `rounded-xl border` card already present.

   The `buildCopyText` function, `RESULT_SECTIONS`, imports, `getTotalScoreBand`, `hasLargeAreaGap`, `getScoreColor`, `ExportableResultFrame`, `GrowthCard`, `RevisionBodyView`, `SectionNav`, `TrustLabel`, `WhyScoreToggle`, `FeedbackDiff` — all **unchanged**.

4. Run `npm run test:components` — all tests pass.
5. Run `npm run typecheck` — clean.
6. Run `npm run test:e2e` — confirm `#result-score`, `#result-guide` selectors still work.
7. Commit:

```
refactor(ui): ResultView dashboard pattern — hero total + area card grid

Public API, selectors (#result-score/#result-feedback/#result-guide),
and all logic helpers unchanged. Visual hierarchy improved.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
```

---

### Task 9 — Delete `ScoreForm.tsx` and verify full suite

**Files:**
- DELETE `app/components/ScoreForm.tsx`

**Steps:**

1. Run `npm run typecheck` — confirm no remaining references to `ScoreForm` (only `TokenGate` imported it; that was replaced in Task 6). If any import remains, fix it.
2. Delete `app/components/ScoreForm.tsx`.
3. Run `npm run typecheck` — clean.
4. Run `npm run test:components` — all tests pass.
5. Run `npm run test:unit` — all tests pass.
6. Run `npm run build` — build passes.
7. Run `npm run test:e2e` — all `/try wizard` tests pass (both `e2e/try-flow.spec.ts` and `e2e/try-channels.spec.ts`).
8. Commit:

```
chore: delete ScoreForm.tsx — logic fully migrated to useScoreForm + wizard

All tests green (components, unit, e2e). Build passes.

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
```

---

### Task 10 — Final smoke verification and PR prep

**Steps:**

1. Run `npm run dev` in background. Smoke-check the full flow: TokenGate gate panel → enter token → ScoreWizard step 1 → type essay → step 2 → fill meta → submit → loading → result. Verify:
   - Stepper shows on step 1 and 2, hidden on step 3 (result).
   - Draft autosave indicator appears ~800ms after typing.
   - Draft restore banner appears on second visit after partial save.
   - 401 re-gate: `onAuthExpired` shows re-auth banner inside TokenGate without losing wizard state.
   - Export/copy buttons functional in result.
   - Revision compare active on second submit in same session.
   - Console has no errors.
2. Run `npm run test:e2e` one final time — all pass.
3. Run `npm run build` — success.
4. Use `superpowers:finishing-a-development-branch` skill to choose merge/PR strategy.
5. Commit (if any smoke-fix needed):

```
fix(smoke): <describe specific fix if needed>

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>
```

---

## Self-Review Checklist

### Spec Coverage

| Spec requirement | Covered in task |
|-----------------|-----------------|
| 글 입력 → 정보 확인 → 채점 결과 3-step wizard | T5 (ScoreWizard) |
| `useScoreForm` hook extraction | T1 |
| `StepEssay` component | T2 |
| `StepInfo` component | T3 |
| `StepResult` component | T4 |
| `ResultView` dashboard refactor | T8 |
| `TokenGate` reskin | T6 |
| `ScoreForm.tsx` deletion | T9 |
| `/api/score` contract + `x-demo-token` preserved | T1 (runScore) |
| 401 → `onAuthExpired` preserved | T1 + T6 |
| Draft autosave/restore (same LS keys) preserved | T1 |
| Validation rules preserved | T1 |
| Revision compare (`GrowthCard`, `hasLargeAreaGap`) preserved | T4 |
| Export (`ExportableResultFrame`) preserved | T4 |
| All e2e selectors preserved | T2, T3, T4 |
| `missingFields` hint | T1 + T3 |
| File upload (TXT/MD/DOCX) | T1 + T2 |
| Clipboard detection | T1 + T2 |
| RichEditor seam note | T2 |
| `npm run test:components` TDD loop | All tasks |
| `npm run test:e2e` passes | T6 (first run) + T9 + T10 |
| `npm run build` passes | T9 |

### Placeholder Scan

No "TBD", "TODO", "add error handling later", or "similar to Task N" in any code step. All code steps include complete implementation directives or copy source line ranges from the existing codebase.

### Type Consistency

- `UseScoreFormReturn` defined in `app/hooks/useScoreForm.ts`; all step components accept props typed against that interface.
- `SubmitState` exported from `app/hooks/useScoreForm.ts`; `StepResult` imports it.
- `DraftSnapshot` imported from `app/lib/storage` — used in `StepEssay` props type.
- `RevisionEntry` imported from `app/lib/storage` — used in `StepResult` and `ScoreWizard`.
- `F3Output`, `Assignment` from `app/data/scoring` — used in `SubmitState.result` phase.
- `computeProgress` return type referenced via `ReturnType<typeof computeProgress>` in `StepEssay` and `StepInfo` props.

---

## Risk Notes for Executor

1. **`handleResubmit` callback vs step control**: The hook's `handleResubmit` must NOT call `setStep` directly (step state lives in `ScoreWizard`). The hook accepts `opts.onResubmit` callback. In Task 1, verify this wiring carefully — if `handleResubmit` in ScoreForm (line 589–595) called `setStep(1)` directly, that call must be replaced with `opts.onResubmit?.()`.

2. **`useEffect` scroll-on-result**: ScoreForm's `useEffect` (lines 164–169) called `setStep(3)` when phase became loading/error/result. In the new architecture, `step` lives in `ScoreWizard`, not in the hook. The wizard must add its own `useEffect` watching `submitState.phase` to call `setStep(3)`. Do not put `setStep` in the hook.

3. **`StepResult` always rendered (not step===3 gated)**: In the original `ScoreForm`, block C (loading/error/result) was always rendered below step 1 and 2 JSX (not conditionally hidden by step number). The `useEffect` scroll moved the viewport to it. `ScoreWizard` should preserve this: `StepResult` is rendered unconditionally (idle phase returns null), so the scroll-into-view in the `useEffect` works. If `StepResult` is gated behind `step===3`, the scroll has no element to scroll to during the transition. **Keep `StepResult` outside the step conditional blocks.**

4. **e2e heading selectors**: `try-flow.spec.ts` line 53 expects `getByRole("heading", { name: "1. 글을 넣어 주세요" })` and line 81 expects `"2. 과제 정보를 알려 주세요"`. These heading texts must be exactly preserved in `StepEssay` and `StepInfo`.

5. **`missingFields` ordering**: The e2e test (try-flow.spec.ts line 139) checks for `"학교·학년"`, `"과목"`, `"장르"` in the hint text. The `missingFields` array must produce these in the same order as ScoreForm lines 951–955 (`school_level` → `subject` → `genre` → `promptOk` → `body`).

6. **TokenGate `children` API unchanged**: `TokenGate` accepts `children?: (onAuthExpired: () => void) => React.ReactNode` for other gated pages (`/coach`). This API must remain unchanged in Task 6 — only the default (no-children) path is modified to render `ScoreWizard` instead of `ScoreForm`.
