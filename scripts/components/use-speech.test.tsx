import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSpeechRecognition } from "@/app/lib/use-speech";

class MockRec {
  lang = ""; continuous = false; interimResults = false;
  onresult: ((e: unknown) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn(() => { this.onend?.(); });
  // 테스트에서 결과 주입
  emit(finalText: string, interimText: string) {
    this.onresult?.({ resultIndex: 0, results: [
      { 0: { transcript: finalText }, isFinal: true, length: 1 },
      { 0: { transcript: interimText }, isFinal: false, length: 1 },
    ] });
  }
}

describe("useSpeechRecognition", () => {
  let mock: MockRec;
  beforeEach(() => { mock = new MockRec(); (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition = function MockCtor() { return mock; } as unknown as new () => MockRec; });
  afterEach(() => { delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition; delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition; });

  it("supported=true when SpeechRecognition exists", () => {
    const { result } = renderHook(() => useSpeechRecognition({ onResult: () => {} }));
    expect(result.current.supported).toBe(true);
  });
  it("start → listening, final 결과는 onResult, interim은 state", () => {
    const onResult = vi.fn();
    const { result } = renderHook(() => useSpeechRecognition({ onResult }));
    act(() => result.current.start());
    expect(result.current.listening).toBe(true);
    expect(mock.lang).toBe("ko-KR");
    act(() => mock.emit("화산은 위험하다", "그리고"));
    expect(onResult).toHaveBeenCalledWith("화산은 위험하다");
    expect(result.current.interim).toBe("그리고");
    act(() => result.current.stop());
    expect(result.current.listening).toBe(false);
  });
  it("supported=false when no SpeechRecognition", () => {
    delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
    const { result } = renderHook(() => useSpeechRecognition({ onResult: () => {} }));
    expect(result.current.supported).toBe(false);
  });
});
