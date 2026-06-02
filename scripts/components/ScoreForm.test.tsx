// ScoreForm 통합 테스트 — full wizard state machine (#11 UX polish).
//   Step 1 → Step 2 → Step 3 흐름 + handleResubmit + draft 복원.
//   순수 모듈 154 + 컴포넌트 36 + E2E 9 위에 ScoreForm host state 자체 검증.

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ScoreForm from "@/app/components/ScoreForm";
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
  meta: {
    model_version: "writing-coach-prompt-v0.2",
    generated_at: "2026-06-02T10:00:00+09:00",
    is_verified: false,
    disclaimer: "이 채점은 AI 자동 채점입니다.",
  },
};

describe("ScoreForm 통합 — full wizard state machine", () => {
  beforeEach(() => {
    // sessionStorage mock 토큰 (fetch headers x-demo-token)
    sessionStorage.setItem(DEMO_TOKEN_KEY, "test-mock");
    localStorage.clear();
    // fetch /api/score mock
    globalThis.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(MOCK_OUTPUT),
      } as Response),
    );
    // navigator.clipboard stub — 마운트 시 read 시도 안 함(reject로 silent)
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: {
        readText: () => Promise.reject(new Error("test-no-clipboard")),
      },
    });
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("초기 마운트 — Step 1 visible, 다음 단계 disabled", () => {
    render(<ScoreForm />);
    expect(screen.getByRole("heading", { name: "1. 글을 넣어 주세요" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /다음 단계/ })).toBeDisabled();
    // Step 2 헤딩은 미노출
    expect(screen.queryByRole("heading", { name: /2\. 과제 정보/ })).not.toBeInTheDocument();
  });

  it("body fill → 다음 단계 enabled → click → Step 2 진입", async () => {
    const user = userEvent.setup();
    render(<ScoreForm />);
    const body = screen.getByRole("textbox", { name: "학생 글 본문" });
    await user.type(body, MOCK_BODY);
    const nextBtn = screen.getByRole("button", { name: /다음 단계/ });
    expect(nextBtn).toBeEnabled();
    await user.click(nextBtn);
    // Step 2 진입
    expect(screen.getByRole("heading", { name: /2\. 과제 정보/ })).toBeInTheDocument();
    expect(screen.getByText("내 글 미리보기")).toBeInTheDocument();
  });

  it("Step 2 [수정] 클릭 → Step 1 복귀 + body 유지", async () => {
    const user = userEvent.setup();
    render(<ScoreForm />);
    const body = screen.getByRole("textbox", { name: "학생 글 본문" });
    await user.type(body, MOCK_BODY);
    await user.click(screen.getByRole("button", { name: /다음 단계/ }));
    // Step 2 미리보기 펼침
    await user.click(screen.getByText("내 글 미리보기"));
    // [수정] 클릭
    await user.click(screen.getByRole("button", { name: /수정/ }));
    // Step 1 복귀
    expect(screen.getByRole("heading", { name: "1. 글을 넣어 주세요" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "학생 글 본문" })).toHaveValue(MOCK_BODY);
  });

  it("Step 2 메타 미입력 → AI 첨삭 받기 disabled + 누락 hint 노출", async () => {
    const user = userEvent.setup();
    render(<ScoreForm />);
    await user.type(screen.getByRole("textbox", { name: "학생 글 본문" }), MOCK_BODY);
    await user.click(screen.getByRole("button", { name: /다음 단계/ }));
    const submit = screen.getByRole("button", { name: "AI 첨삭 받기" });
    expect(submit).toBeDisabled();
    // 누락 hint — 라벨 텍스트("학교·학년"만)와 모호하지 않도록 hint 문장 전체로 scope.
    const hint = screen.getByText(/다음을 채우면 채점을 받을 수 있어요/);
    expect(hint).toHaveTextContent("학교·학년");
    expect(hint).toHaveTextContent("과목");
    expect(hint).toHaveTextContent("장르");
  });

  it("full flow Step 1→2→3: submit → fetch 호출 + 결과 노출", async () => {
    const user = userEvent.setup();
    render(<ScoreForm />);
    await user.type(screen.getByRole("textbox", { name: "학생 글 본문" }), MOCK_BODY);
    await user.click(screen.getByRole("button", { name: /다음 단계/ }));
    // 메타 채움
    await user.selectOptions(screen.getByLabelText("학교·학년"), "중2");
    await user.selectOptions(screen.getByLabelText("과목"), "국어");
    await user.selectOptions(screen.getByLabelText("어떤 글인가요?"), "논설문·주장하는 글");
    await user.type(
      screen.getByLabelText("과제 내용"),
      "교복 자율화에 대한 자신의 주장을 근거 2개 이상으로 쓰시오.",
    );
    // 제출
    const submit = screen.getByRole("button", { name: "AI 첨삭 받기" });
    expect(submit).toBeEnabled();
    await user.click(submit);
    // fetch가 /api/score로 호출됐는지
    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "/api/score",
        expect.objectContaining({ method: "POST" }),
      );
    });
    // 결과 표시 — total_score 75 노출 (#result-score 안의 큰 숫자)
    await waitFor(() => {
      expect(screen.getByText("75")).toBeInTheDocument();
    });
  });

  it("결과 후 handleResubmit — Step 1 복귀 + body·meta 모두 유지", async () => {
    const user = userEvent.setup();
    render(<ScoreForm />);
    await user.type(screen.getByRole("textbox", { name: "학생 글 본문" }), MOCK_BODY);
    await user.click(screen.getByRole("button", { name: /다음 단계/ }));
    await user.selectOptions(screen.getByLabelText("학교·학년"), "중2");
    await user.selectOptions(screen.getByLabelText("과목"), "국어");
    await user.selectOptions(screen.getByLabelText("어떤 글인가요?"), "논설문·주장하는 글");
    await user.type(screen.getByLabelText("과제 내용"), "충분히 긴 과제 내용입니다");
    await user.click(screen.getByRole("button", { name: "AI 첨삭 받기" }));
    // 결과 노출 대기
    await waitFor(() => expect(screen.getByText("75")).toBeInTheDocument());
    // "고쳐쓰기 시작" 또는 "한 번 더 고쳐쓰기" 버튼 — actions slot
    const resubmitBtn = await screen.findByRole("button", { name: /고쳐쓰기 시작|한 번 더 고쳐쓰기/ });
    await user.click(resubmitBtn);
    // Step 1 복귀
    expect(screen.getByRole("heading", { name: "1. 글을 넣어 주세요" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "학생 글 본문" })).toHaveValue(MOCK_BODY);
    // Step 2 진입해 메타 5필드 유지 검증
    await user.click(screen.getByRole("button", { name: /다음 단계/ }));
    expect(screen.getByLabelText("학교·학년")).toHaveValue("중2");
    expect(screen.getByLabelText("과목")).toHaveValue("국어");
    expect(screen.getByLabelText("어떤 글인가요?")).toHaveValue("논설문·주장하는 글");
    expect(screen.getByLabelText("과제 내용")).toHaveValue("충분히 긴 과제 내용입니다");
  });

  it("Draft 복원 — LS에 draft 있으면 마운트 시 배너 노출, body는 빈 상태", () => {
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
    render(<ScoreForm />);
    expect(screen.getByText("📝 이전에 쓰던 작업이 있어요")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "학생 글 본문" })).toHaveValue("");
  });

  it("Draft 복원 — [이어 쓰기] 클릭 시 body·메타 모두 복원 + 배너 닫힘", async () => {
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
    render(<ScoreForm />);
    await user.click(screen.getByRole("button", { name: "이어 쓰기" }));
    expect(screen.getByRole("textbox", { name: "학생 글 본문" })).toHaveValue(MOCK_BODY);
    expect(screen.queryByText("📝 이전에 쓰던 작업이 있어요")).not.toBeInTheDocument();
    // Step 2 진입해 메타 검증
    await user.click(screen.getByRole("button", { name: /다음 단계/ }));
    expect(screen.getByLabelText("학교·학년")).toHaveValue("중2");
    expect(screen.getByLabelText("과목")).toHaveValue("국어");
    expect(screen.getByLabelText("과제 내용")).toHaveValue("이전 과제 내용");
  });

  it("defaults prop — Step 2 진입 시 학년·과목·장르 prefill", async () => {
    const user = userEvent.setup();
    render(
      <ScoreForm
        defaults={{ school_level: "고3", subject: "국어", genre: "감상문·독후감" }}
      />,
    );
    // Step 1 — 초기 메타 안 보임. body 채워서 Step 2 진입.
    await user.type(screen.getByRole("textbox", { name: "학생 글 본문" }), MOCK_BODY);
    await user.click(screen.getByRole("button", { name: /다음 단계/ }));
    // Step 2 — defaults가 초기 state로 적용됐는지 확인
    expect(screen.getByLabelText("학교·학년")).toHaveValue("고3");
    expect(screen.getByLabelText("과목")).toHaveValue("국어");
    expect(screen.getByLabelText("어떤 글인가요?")).toHaveValue("감상문·독후감");
  });
});
