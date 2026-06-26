import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockHook = { supported: true, listening: false, interim: "", error: null as string | null, start: vi.fn(), stop: vi.fn() };
vi.mock("@/app/lib/use-speech", () => ({
  useSpeechRecognition: (opts: { onResult: (t: string) => void }) => { (globalThis as Record<string, unknown>).__voiceOnResult = opts.onResult; return mockHook; },
}));
import VoicePanel from "@/app/components/coach/VoicePanel";

describe("VoicePanel", () => {
  beforeEach(() => { mockHook.supported = true; mockHook.listening = false; mockHook.interim = ""; mockHook.error = null; mockHook.start.mockClear(); mockHook.stop.mockClear(); });

  it("마이크 토글 — 시작 버튼 클릭 시 start 호출", async () => {
    const user = userEvent.setup();
    render(<VoicePanel onInsert={() => {}} />);
    await user.click(screen.getByTestId("voice-mic"));
    expect(mockHook.start).toHaveBeenCalledOnce();
  });
  it("마이크 토글 — 듣는 중이면 클릭 시 stop 호출", async () => {
    mockHook.listening = true;
    const user = userEvent.setup();
    render(<VoicePanel onInsert={() => {}} />);
    await user.click(screen.getByTestId("voice-mic"));
    expect(mockHook.stop).toHaveBeenCalledOnce();
    expect(mockHook.start).not.toHaveBeenCalled();
  });
  it("final 전사가 누적되고 '본문에 넣기'가 onInsert(text) 호출", async () => {
    const onInsert = vi.fn();
    const user = userEvent.setup();
    render(<VoicePanel onInsert={onInsert} />);
    // 훅의 onResult 콜백으로 final 줄 주입
    (globalThis as unknown as { __voiceOnResult: (t: string) => void }).__voiceOnResult("화산은 위험하다");
    const insertBtn = await screen.findByTestId("voice-insert-0");
    await user.click(insertBtn);
    expect(onInsert).toHaveBeenCalledWith("화산은 위험하다");
  });
  it("미지원 브라우저 — 안내 + 마이크 버튼 없음", () => {
    mockHook.supported = false;
    render(<VoicePanel onInsert={() => {}} />);
    expect(screen.getByText(/지원하지 않아요/)).toBeInTheDocument();
    expect(screen.queryByTestId("voice-mic")).not.toBeInTheDocument();
  });
});
