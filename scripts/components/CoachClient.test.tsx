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
vi.mock("@/app/components/coach/Canvas", () => ({
  default: ({ onChange }: { onChange: (v: { html: string; text: string }) => void }) => (
    <div data-testid="canvas-stub">
      <button
        data-testid="canvas-trigger-insert"
        onClick={() => onChange({ html: "<p>캔버스 입력</p>", text: "캔버스 입력" })}
      >
        캔버스 입력 트리거
      </button>
    </div>
  ),
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

  it("handleVoiceInsert: 빈 본문에 첫 줄 삽입 시 선행 개행 없이 그대로 설정된다", () => {
    render(<CoachClient assignment={DEMO_ASSIGNMENT} mode="voice" />);
    expect(capturedOnInsert).not.toBeNull();
    // 빈 본문 → 삽입 텍스트가 그대로 body가 되어야 함 (앞에 \n 없이)
    act(() => {
      capturedOnInsert!("화산은 위험하다");
    });
    // localStorage에 body_html이 저장됐는지 확인 (saveBodyHtml이 호출됐다는 증거)
    const raw = window.localStorage.getItem("pwc-coach-body-html-v1");
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!) as { sig: string; html: string };
    expect(parsed.html).toContain("화산은 위험하다");
    // html이 \n으로 시작하지 않음 (빈 본문 → text가 선행 개행 없음)
    expect(parsed.html).not.toMatch(/^\s*\n/);
  });

  it("handleVoiceInsert: 기존 본문이 있으면 \\n으로 이어붙인다", () => {
    render(<CoachClient assignment={DEMO_ASSIGNMENT} mode="voice" />);
    expect(capturedOnInsert).not.toBeNull();
    // 첫 번째 삽입
    act(() => { capturedOnInsert!("첫 번째 줄"); });
    // 두 번째 삽입
    act(() => { capturedOnInsert!("두 번째 줄"); });
    const raw = window.localStorage.getItem("pwc-coach-body-html-v1");
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!) as { sig: string; html: string };
    // 두 줄이 별개 문단으로 반영(= \n 구분자 보존) — 구분자 누락 회귀를 잡는다.
    expect(parsed.html).toContain("<p>첫 번째 줄</p><p>두 번째 줄</p>");
  });
});
