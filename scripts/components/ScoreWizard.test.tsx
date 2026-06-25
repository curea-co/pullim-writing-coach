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
