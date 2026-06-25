// scripts/components/StepInfo.test.tsx
// StepInfo 컴포넌트 단위 테스트 — Vitest + RTL.
// 실행: npm run test:components

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
    expect(document.getElementById("target")).toBeInTheDocument();
    expect(document.getElementById("prompt")).toBeInTheDocument();
  });
});
