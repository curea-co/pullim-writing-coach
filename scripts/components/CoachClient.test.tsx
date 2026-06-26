/**
 * CoachClient — voice 분기 + 본문 삽입 배선 테스트 (Task 4)
 *
 * 전략: CoachClient는 TipTap(Canvas)·fetch·localStorage 등 무거운 의존성이 많으므로
 * Canvas를 경량 stub으로 대체하고, VoicePanel을 vi.mock으로 onInsert를 노출하는
 * 가짜로 교체한다. 실제 useReducer 루프(EDIT dispatch → state.body)는 그대로 실행한다.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";

// ── Canvas stub — TipTap/ProseMirror 없이 마운트 가능하게 ──────────────────
let capturedInsertBlock: ((text: string) => void) | null = null;
vi.mock("@/app/components/coach/Canvas", () => ({
  default: ({ onChange, editorRef }: { onChange: (v: { html: string; text: string }) => void; editorRef?: React.Ref<{ focus: () => void; insertBlock: (text: string) => void }> }) => {
    React.useEffect(() => {
      if (editorRef && typeof editorRef === "object" && "current" in editorRef) {
        const insertBlock = vi.fn((t: string) => { capturedInsertBlock = insertBlock; void t; });
        capturedInsertBlock = insertBlock;
        (editorRef as React.MutableRefObject<{ focus: () => void; insertBlock: (text: string) => void }>).current = {
          focus: vi.fn(),
          insertBlock,
        };
      }
    });
    return (
      <div data-testid="canvas-stub">
        <button
          data-testid="canvas-trigger-insert"
          onClick={() => onChange({ html: "<p>캔버스 입력</p>", text: "캔버스 입력" })}
        >
          캔버스 입력 트리거
        </button>
      </div>
    );
  },
}));

// ── VoicePanel stub — onInsert 콜백을 외부에서 트리거할 수 있게 노출 ─────────
let capturedOnInsert: ((text: string) => void) | null = null;
vi.mock("@/app/components/coach/VoicePanel", () => ({
  default: ({ onInsert }: { onInsert: (text: string) => void }) => {
    capturedOnInsert = onInsert;
    return <div data-testid="voice-panel-stub">음성 패널 stub</div>;
  },
}));

// ── GuidePanel / OutlinePanel / BottomSheet / NudgeCard / GrowthBars / icons stub ──
vi.mock("@/app/components/coach/GuidePanel", () => ({
  default: () => <div data-testid="guide-panel-stub" />,
}));
vi.mock("@/app/components/coach/OutlinePanel", () => ({
  default: () => <div data-testid="outline-panel-stub" />,
}));
vi.mock("@/app/components/coach/BottomSheet", () => ({
  default: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="bottom-sheet-stub">{children}</div>
  ),
}));
vi.mock("@/app/components/coach/NudgeCard", () => ({
  default: () => <div data-testid="nudge-card-stub" />,
}));
vi.mock("@/app/components/coach/GrowthBars", () => ({
  default: () => <div data-testid="growth-bars-stub" />,
  GrowthRow: () => <div />,
}));
vi.mock("@/app/components/coach/icons", () => ({
  BlockIcon: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
  MastGlyph: () => <span />,
}));

import React from "react";
import CoachClient from "@/app/components/coach/CoachClient";
import type { CoachAssignment } from "@/app/lib/coach-setup";

const DEMO_ASSIGNMENT: CoachAssignment = {
  school_level: "중2",
  subject: "과학",
  genre: "설명문",
  target_char_count: null,
  prompt_text: "화산의 형성 과정을 설명하라",
  title: "화산의 형성",
};

beforeEach(() => {
  window.localStorage.clear();
  capturedOnInsert = null;
  capturedInsertBlock = null;
});

describe("CoachClient voice 분기", () => {
  it("mode='voice' + write 단계에서 VoicePanel이 렌더된다", () => {
    render(<CoachClient assignment={DEMO_ASSIGNMENT} mode="voice" />);
    expect(screen.getByTestId("voice-panel-stub")).toBeInTheDocument();
  });

  it("mode='free'에서는 VoicePanel이 렌더되지 않는다", () => {
    render(<CoachClient assignment={DEMO_ASSIGNMENT} mode="free" />);
    expect(screen.queryByTestId("voice-panel-stub")).not.toBeInTheDocument();
  });

  it("mode='guide'에서는 VoicePanel이 렌더되지 않는다", () => {
    render(<CoachClient assignment={DEMO_ASSIGNMENT} mode="guide" />);
    expect(screen.queryByTestId("voice-panel-stub")).not.toBeInTheDocument();
  });

  it("mode='outline'에서는 VoicePanel이 렌더되지 않는다", () => {
    render(<CoachClient assignment={DEMO_ASSIGNMENT} mode="outline" />);
    expect(screen.queryByTestId("voice-panel-stub")).not.toBeInTheDocument();
  });

  it("handleVoiceInsert: editorRef.current.insertBlock(text)를 호출한다 (서식 보존 + stale closure 없음)", () => {
    render(<CoachClient assignment={DEMO_ASSIGNMENT} mode="voice" />);
    expect(capturedOnInsert).not.toBeNull();
    act(() => {
      capturedOnInsert!("화산은 위험하다");
    });
    // insertBlock이 호출됐어야 한다 (에디터 경유 삽입 → 서식 보존)
    expect(capturedInsertBlock).not.toBeNull();
    expect(capturedInsertBlock).toHaveBeenCalledWith("화산은 위험하다");
  });

  it("handleVoiceInsert: 연속 삽입 시 각각 insertBlock을 호출한다 (stale closure 없음)", () => {
    render(<CoachClient assignment={DEMO_ASSIGNMENT} mode="voice" />);
    expect(capturedOnInsert).not.toBeNull();
    act(() => { capturedOnInsert!("첫 번째 줄"); });
    act(() => { capturedOnInsert!("두 번째 줄"); });
    // 두 번 모두 insertBlock이 호출됐어야 한다
    expect(capturedInsertBlock).toHaveBeenCalledTimes(2);
    expect(capturedInsertBlock).toHaveBeenNthCalledWith(1, "첫 번째 줄");
    expect(capturedInsertBlock).toHaveBeenNthCalledWith(2, "두 번째 줄");
  });

  it("checking 단계(busy)에서도 VoicePanel이 마운트 유지된다 (전사 데이터 손실 없음)", async () => {
    // Mock fetch to never resolve (keeps phase in 'checking')
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    // Stub sessionStorage to return a demo token
    vi.stubGlobal("sessionStorage", {
      getItem: (k: string) => k === "pwc-demo-token" ? "test-token" : null,
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });

    render(<CoachClient assignment={DEMO_ASSIGNMENT} mode="voice" />);
    // Panel present before busy
    expect(screen.getByTestId("voice-panel-stub")).toBeInTheDocument();

    // Trigger CHECK_START (봐줘) by simulating a canvas input then clicking ask
    act(() => {
      // Use canvas stub to set body text so runCheck doesn't guard
      const trigger = screen.getByTestId("canvas-trigger-insert");
      trigger.click();
    });
    // Find and click coach-ask button (inside BottomSheet stub)
    const askBtn = screen.getByTestId("coach-ask");
    await act(async () => { askBtn.click(); });

    // Phase is now 'checking' (busy=true) — panel must still be mounted
    expect(screen.getByTestId("voice-panel-stub")).toBeInTheDocument();

    vi.unstubAllGlobals();
  });
});
