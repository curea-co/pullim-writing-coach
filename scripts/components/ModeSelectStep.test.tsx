import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Web Speech 지원 여부를 테스트별로 제어(jsdom엔 SpeechRecognition이 없어 기본 false라 voice가 비활성됨).
const speech = { supported: true };
vi.mock("@/app/lib/use-speech", () => ({ isSpeechSupported: () => speech.supported }));
import ModeSelectStep from "@/app/components/coach/ModeSelectStep";

describe("ModeSelectStep", () => {
  beforeEach(() => { speech.supported = true; });
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

  it("말하기 카드 활성(지원 브라우저) — 클릭 시 onSelect('voice') 호출", async () => {
    speech.supported = true;
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<ModeSelectStep onSelect={onSelect} onBack={() => {}} />);
    expect(screen.getByTestId("mode-voice")).not.toBeDisabled();
    await user.click(screen.getByTestId("mode-voice"));
    expect(onSelect).toHaveBeenCalledWith("voice");
  });

  it("말하기 카드 비활성(미지원 브라우저) — 클릭해도 onSelect 미호출 + '미지원' 표시", async () => {
    speech.supported = false;
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<ModeSelectStep onSelect={onSelect} onBack={() => {}} />);
    expect(await screen.findByTestId("mode-voice")).toBeDisabled();
    expect(screen.getByText(/이 브라우저 미지원/)).toBeInTheDocument();
    await user.click(screen.getByTestId("mode-voice"));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
