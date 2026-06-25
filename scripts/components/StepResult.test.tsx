// StepResult 컴포넌트 단위 테스트 — Vitest + RTL.
// 실행: npm run test:components

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StepResult from "@/app/components/StepResult";
import { createRef } from "react";
import type { F3Output } from "@/app/data/scoring";

const MOCK_OUTPUT: F3Output = {
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
