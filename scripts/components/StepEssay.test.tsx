// StepEssay 컴포넌트 단위 테스트 — Vitest + RTL.
// 실행: npm run test:components

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
