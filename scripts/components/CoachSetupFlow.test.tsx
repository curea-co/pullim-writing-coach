import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// CoachClient는 무거우므로(useReducer+fetch) 마운트 신호만 검증하는 mock로 대체.
vi.mock("@/app/components/coach/CoachClient", () => ({
  default: (props: { assignment: { prompt_text: string }; mode: string }) => (
    <div data-testid="coach-client">{`${props.mode}:${props.assignment.prompt_text}`}</div>
  ),
}));

import CoachSetupFlow from "@/app/components/coach/CoachSetupFlow";

beforeEach(() => window.localStorage.clear());

describe("CoachSetupFlow", () => {
  it("setup 없으면 과제 입력부터 시작", () => {
    render(<CoachSetupFlow />);
    expect(screen.getByText(/어떤 글을 써볼까요/)).toBeInTheDocument();
  });

  it("과제 입력 → 모드 선택 → CoachClient 마운트(assignment·mode 전달)", async () => {
    const user = userEvent.setup();
    render(<CoachSetupFlow />);
    await user.selectOptions(screen.getByLabelText(/학년/), "중2");
    await user.selectOptions(screen.getByLabelText(/과목/), "과학");
    await user.selectOptions(screen.getByLabelText(/어떤 글/), "설명문");
    await user.clear(screen.getByLabelText(/과제 내용/));
    await user.type(screen.getByLabelText(/과제 내용/), "화산의 형성 과정을 설명하라");
    await user.click(screen.getByRole("button", { name: /다음/ }));
    await user.click(screen.getByTestId("mode-free"));
    expect(screen.getByTestId("coach-client")).toHaveTextContent("free:화산의 형성 과정을 설명하라");
  });

  it("저장된 setup 있으면 CoachClient 직행", () => {
    window.localStorage.setItem(
      "pwc-coach-setup-v1",
      JSON.stringify({ assignment: { school_level: "중2", subject: "과학", genre: "설명문", target_char_count: null, prompt_text: "저장된 과제 설명" }, mode: "guide" }),
    );
    render(<CoachSetupFlow />);
    expect(screen.getByTestId("coach-client")).toHaveTextContent("guide:저장된 과제 설명");
  });
});
