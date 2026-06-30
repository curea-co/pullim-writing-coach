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

// Helper: inject body text via hidden file input (reliable in jsdom — bypasses TipTap contenteditable).
// #body is a TipTap contenteditable div; user.type on it triggers unhandled jsdom errors from
// ProseMirror's posAtCoords/getClientRects. The file-upload path (handleFileInput → setBody/setBodyHtml)
// is the robust jsdom approach: it directly updates hook state without touching the ProseMirror DOM.
async function fillBody(user: ReturnType<typeof userEvent.setup>, text: string) {
  const fileInput = document.getElementById("body-file-upload") as HTMLInputElement;
  await user.upload(fileInput, new File([text], "essay.txt", { type: "text/plain" }));
}

// Helper: assert body editor content. #body is a TipTap contenteditable (no `value` prop).
// Use textContent to verify its text — toHaveValue() only works on <input>/<textarea>/<select>.
function expectBodyContent(text: string) {
  const bodyEl = document.getElementById("body");
  expect(bodyEl).toBeInTheDocument();
  expect(bodyEl?.textContent?.trim()).toBe(text.trim());
}

function expectBodyEmpty() {
  const bodyEl = document.getElementById("body");
  expect(bodyEl?.textContent?.trim() ?? "").toBe("");
}

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

  // a11y semantic smoke (Codex 리뷰): 본문 에디터가 접근성 textbox로 노출되는지 검증.
  //   파일업로드 우회 헬퍼가 가린 'role=textbox + 접근명' 회귀를 이 한 케이스가 잡는다.
  it("본문 에디터가 role=textbox + aria-label '학생 글 본문'으로 노출된다 (a11y)", () => {
    render(<ScoreWizard />);
    const editor = screen.getByRole("textbox", { name: "학생 글 본문" });
    expect(editor).toBeInTheDocument();
    expect(editor).toHaveAttribute("id", "body");
    expect(editor).toHaveAttribute("aria-multiline", "true");
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
    await fillBody(user, MOCK_BODY);
    const nextBtn = screen.getByRole("button", { name: /다음 단계/ });
    await waitFor(() => expect(nextBtn).toBeEnabled());
    await user.click(nextBtn);
    expect(screen.getByRole("heading", { name: /2\. 과제 정보/ })).toBeInTheDocument();
    expect(screen.getByText("내 글 미리보기")).toBeInTheDocument();
  });

  it("Step 2 [수정] → Step 1 restored, body preserved", async () => {
    const user = userEvent.setup();
    render(<ScoreWizard />);
    await fillBody(user, MOCK_BODY);
    await waitFor(() => expect(screen.getByRole("button", { name: /다음 단계/ })).toBeEnabled());
    await user.click(screen.getByRole("button", { name: /다음 단계/ }));
    await user.click(screen.getByText("내 글 미리보기"));
    await user.click(screen.getByRole("button", { name: /수정/ }));
    expect(screen.getByRole("heading", { name: "1. 글을 넣어 주세요" })).toBeInTheDocument();
    expectBodyContent(MOCK_BODY);
  });

  it("full flow Step 1→2→3: submit → result shown (#result-score)", async () => {
    const user = userEvent.setup();
    render(<ScoreWizard />);
    await fillBody(user, MOCK_BODY);
    await waitFor(() => expect(screen.getByRole("button", { name: /다음 단계/ })).toBeEnabled());
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
    await fillBody(user, MOCK_BODY);
    await waitFor(() => expect(screen.getByRole("button", { name: /다음 단계/ })).toBeEnabled());
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
    expectBodyContent(MOCK_BODY);
  });

  it("Stepper hidden in step 3 (result/loading/error phase)", async () => {
    const user = userEvent.setup();
    render(<ScoreWizard />);
    await fillBody(user, MOCK_BODY);
    await waitFor(() => expect(screen.getByRole("button", { name: /다음 단계/ })).toBeEnabled());
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
    await fillBody(user, MOCK_BODY);
    await waitFor(() => expect(screen.getByRole("button", { name: /다음 단계/ })).toBeEnabled());
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
    // loadDraft가 async — 복원 배너는 마운트 effect 완료 후 노출.
    expect(await screen.findByText("📝 이전에 쓰던 작업이 있어요")).toBeInTheDocument();
    expectBodyEmpty();
    await user.click(screen.getByRole("button", { name: "이어 쓰기" }));
    expectBodyContent(MOCK_BODY);
    expect(screen.queryByText("📝 이전에 쓰던 작업이 있어요")).not.toBeInTheDocument();
  });

  // ── Migrated from ScoreForm.test.tsx (unique integration behaviors) ──────────

  it("[migrated] Step 2 empty meta → AI 첨삭 받기 disabled + 누락 hint 노출", async () => {
    const user = userEvent.setup();
    render(<ScoreWizard />);
    await fillBody(user, MOCK_BODY);
    await waitFor(() => expect(screen.getByRole("button", { name: /다음 단계/ })).toBeEnabled());
    await user.click(screen.getByRole("button", { name: /다음 단계/ }));
    const submit = screen.getByRole("button", { name: "AI 첨삭 받기" });
    expect(submit).toBeDisabled();
    const hint = screen.getByText(/다음을 채우면 채점을 받을 수 있어요/);
    expect(hint).toHaveTextContent("학교·학년");
    expect(hint).toHaveTextContent("과목");
    expect(hint).toHaveTextContent("장르");
  });

  it("[migrated] 결과 후 resubmit → Step 1 복귀 + body·meta 모두 유지", async () => {
    const user = userEvent.setup();
    render(<ScoreWizard />);
    await fillBody(user, MOCK_BODY);
    await waitFor(() => expect(screen.getByRole("button", { name: /다음 단계/ })).toBeEnabled());
    await user.click(screen.getByRole("button", { name: /다음 단계/ }));
    await user.selectOptions(screen.getByLabelText("학교·학년"), "중2");
    await user.selectOptions(screen.getByLabelText("과목"), "국어");
    await user.selectOptions(screen.getByLabelText("어떤 글인가요?"), "논설문·주장하는 글");
    await user.type(screen.getByLabelText("과제 내용"), "충분히 긴 과제 내용입니다");
    await user.click(screen.getByRole("button", { name: "AI 첨삭 받기" }));
    await waitFor(() => expect(screen.getByText("75")).toBeInTheDocument(), { timeout: 5000 });
    const resubmitBtn = screen.getByRole("button", { name: /고쳐쓰기 시작|한 번 더 고쳐쓰기/ });
    await user.click(resubmitBtn);
    // Step 1 복귀 + body 유지
    expect(screen.getByRole("heading", { name: "1. 글을 넣어 주세요" })).toBeInTheDocument();
    expectBodyContent(MOCK_BODY);
    // Step 2 진입해 meta 5필드 유지 검증
    await waitFor(() => expect(screen.getByRole("button", { name: /다음 단계/ })).toBeEnabled());
    await user.click(screen.getByRole("button", { name: /다음 단계/ }));
    expect(screen.getByLabelText("학교·학년")).toHaveValue("중2");
    expect(screen.getByLabelText("과목")).toHaveValue("국어");
    expect(screen.getByLabelText("어떤 글인가요?")).toHaveValue("논설문·주장하는 글");
    expect(screen.getByLabelText("과제 내용")).toHaveValue("충분히 긴 과제 내용입니다");
  });

  it("[migrated] draft [이어 쓰기] → Step 2 진입 시 meta 복원", async () => {
    localStorage.setItem(
      "pwc_draft_v1",
      JSON.stringify({
        body: MOCK_BODY,
        school_level: "중2",
        subject: "국어",
        genre: "논설문·주장하는 글",
        target_raw: "600",
        prompt_text: "이전 과제 내용",
        saved_at: "2026-06-02T10:00:00+09:00",
      }),
    );
    const user = userEvent.setup();
    render(<ScoreWizard />);
    await user.click(await screen.findByRole("button", { name: "이어 쓰기" }));
    expectBodyContent(MOCK_BODY);
    // Step 2 진입해 meta 검증
    await waitFor(() => expect(screen.getByRole("button", { name: /다음 단계/ })).toBeEnabled());
    await user.click(screen.getByRole("button", { name: /다음 단계/ }));
    expect(screen.getByLabelText("학교·학년")).toHaveValue("중2");
    expect(screen.getByLabelText("과목")).toHaveValue("국어");
    expect(screen.getByLabelText("과제 내용")).toHaveValue("이전 과제 내용");
  });
});
