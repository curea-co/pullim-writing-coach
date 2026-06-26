import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ModeSelectStep from "@/app/components/coach/ModeSelectStep";

describe("ModeSelectStep", () => {
  it("4개 모드 카드 렌더", () => {
    render(<ModeSelectStep onSelect={() => {}} onBack={() => {}} />);
    expect(screen.getByText(/자유 쓰기/)).toBeInTheDocument();
    expect(screen.getByText(/가이드/)).toBeInTheDocument();
    expect(screen.getByText(/개요 먼저/)).toBeInTheDocument();
    expect(screen.getByText(/말하기/)).toBeInTheDocument();
  });

  it("자유 쓰기 선택 시 onSelect('free')", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<ModeSelectStep onSelect={onSelect} onBack={() => {}} />);
    await user.click(screen.getByTestId("mode-free"));
    expect(onSelect).toHaveBeenCalledWith("free");
  });

  it("개요 카드는 활성(클릭 시 onSelect('outline') 호출)", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<ModeSelectStep onSelect={onSelect} onBack={() => {}} />);
    expect(screen.getByTestId("mode-outline")).not.toBeDisabled();
    await user.click(screen.getByTestId("mode-outline"));
    expect(onSelect).toHaveBeenCalledWith("outline");
  });

  it("말하기 카드 활성 — 클릭 시 onSelect('voice') 호출", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<ModeSelectStep onSelect={onSelect} onBack={() => {}} />);
    expect(screen.getByTestId("mode-voice")).not.toBeDisabled();
    await user.click(screen.getByTestId("mode-voice"));
    expect(onSelect).toHaveBeenCalledWith("voice");
  });
});
