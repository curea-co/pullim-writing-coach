import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockHook = { supported: true as boolean | null, listening: false, interim: "", error: null as string | null, start: vi.fn(), stop: vi.fn() };
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
  it("지우기 버튼 — lines 있을 때 클릭 시 모두 삭제", async () => {
    const user = userEvent.setup();
    render(<VoicePanel onInsert={() => {}} />);
    // 훅의 onResult 콜백으로 줄 주입
    const voiceOnResult = (globalThis as unknown as { __voiceOnResult: (t: string) => void }).__voiceOnResult;
    act(() => voiceOnResult("첫 번째 줄"));
    expect(await screen.findByTestId("voice-insert-0")).toBeInTheDocument();
    await user.click(screen.getByTestId("voice-clear"));
    expect(screen.queryByTestId("voice-insert-0")).not.toBeInTheDocument();
    expect(screen.queryByTestId("voice-clear")).not.toBeInTheDocument();
  });
  it("미지원 브라우저 — 안내 + 마이크 버튼 없음", () => {
    mockHook.supported = false;
    render(<VoicePanel onInsert={() => {}} />);
    expect(screen.getByText(/지원하지 않아요/)).toBeInTheDocument();
    expect(screen.queryByTestId("voice-mic")).not.toBeInTheDocument();
  });
  it("판정 전(supported=null) — 중립 표시(미지원 안내·마이크 둘 다 없음)", () => {
    mockHook.supported = null;
    render(<VoicePanel onInsert={() => {}} />);
    expect(screen.getByTestId("voice-checking")).toBeInTheDocument();
    expect(screen.queryByText(/지원하지 않아요/)).not.toBeInTheDocument();
    expect(screen.queryByTestId("voice-mic")).not.toBeInTheDocument();
  });
  it("녹음 중 disabled로 전환되면 stop()을 호출한다 (코치 처리 중 인식 정지)", () => {
    mockHook.listening = true;
    render(<VoicePanel onInsert={() => {}} disabled={true} />);
    expect(mockHook.stop).toHaveBeenCalled();
  });
  it("disabled=true — 마이크 버튼과 '본문에 넣기' 버튼이 disabled, 전사 텍스트는 여전히 노출", async () => {
    const user = userEvent.setup();
    render(<VoicePanel onInsert={() => {}} disabled={true} />);
    // Inject a transcript line first
    const voiceOnResult = (globalThis as unknown as { __voiceOnResult: (t: string) => void }).__voiceOnResult;
    act(() => voiceOnResult("화산은 위험하다"));
    // mic button disabled
    expect(screen.getByTestId("voice-mic")).toBeDisabled();
    // insert button disabled
    const insertBtn = await screen.findByTestId("voice-insert-0");
    expect(insertBtn).toBeDisabled();
    // transcript text still visible
    expect(screen.getByText("화산은 위험하다")).toBeInTheDocument();
  });
});
