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

  // 게이트키퍼 SSO 계약(2026-07-10): /api/coach 401 → onAuthRefresh(토큰 회전) → 같은 요청 1회 자동 재시도.
  it("[봐줘] 401 → onAuthRefresh true → /api/coach 자동 재시도 (onAuthExpired 미호출)", async () => {
    const VALID_COACH_OUTPUT = {
      area_scores: [
        { area: "과제 이해", score: 14 },
        { area: "내용 충실도", score: 10 },
        { area: "구조·논리", score: 12 },
        { area: "표현·문장", score: 13 },
        { area: "성장 가능성", score: 11 },
      ],
      nudges: [
        {
          paragraph_index: 1,
          rubric_area: "내용 충실도",
          diagnosis: "주장만 있고 근거가 없어요.",
          guiding_question: "네 경험에서 왜 그런지 하나 떠올려볼까?",
          quick_win_rank: 1,
        },
      ],
    };
    // 1번째 /api/coach = 401(만료), 2번째 = 200 — 게이트키퍼 테스트 시나리오 그대로.
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 401, json: () => Promise.reject() })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(VALID_COACH_OUTPUT) });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("sessionStorage", {
      getItem: () => null,
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });
    const onAuthExpired = vi.fn();
    const onAuthRefresh = vi.fn(async () => true);

    render(
      <CoachClient
        assignment={DEMO_ASSIGNMENT}
        mode="free"
        onAuthExpired={onAuthExpired}
        onAuthRefresh={onAuthRefresh}
      />,
    );
    act(() => { screen.getByTestId("canvas-trigger-insert").click(); });
    await act(async () => { screen.getByTestId("coach-ask").click(); });

    // 401 → refresh 1회 → 같은 요청 재시도(총 2회 호출), 재인증 유도(onAuthExpired)로 낙하하지 않음.
    expect(onAuthRefresh).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onAuthExpired).not.toHaveBeenCalled();
    // 재시도 성공 → nudge 단계 진입(넛지 카드 stub 렌더).
    expect(screen.getByTestId("nudge-card-stub")).toBeInTheDocument();

    vi.unstubAllGlobals();
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

  it("SSO authed + 데모토큰 없음 → [봐줘] 시 단락 없이 /api/coach fetch 발생 (x-demo-token 미부착)", async () => {
    // prod authed 사용자는 데모토큰이 없다(데모토큰은 로컬 전용). 토큰 부재가 곧 차단이 되어선 안 됨 —
    //   인가는 서버 verifyWritingAccess(쿠키/me)가 권위. fetch 자체는 발생해야 한다.
    const fetchMock = vi.fn(() => new Promise(() => {})); // never resolves — checking 유지
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("sessionStorage", {
      getItem: () => null, // 데모토큰 없음
      setItem: vi.fn(),
      removeItem: vi.fn(),
    });

    render(<CoachClient assignment={DEMO_ASSIGNMENT} mode="voice" />);
    act(() => { screen.getByTestId("canvas-trigger-insert").click(); });
    await act(async () => { screen.getByTestId("coach-ask").click(); });

    // 토큰 부재로 단락되지 않고 /api/coach fetch가 발생해야 한다.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, { headers: Record<string, string>; credentials?: string }];
    expect(url).toBe("/api/coach");
    expect(init.credentials).toBe("include");
    // 데모토큰이 없으므로 x-demo-token 헤더는 부착되지 않아야 한다.
    expect(init.headers["x-demo-token"]).toBeUndefined();

    vi.unstubAllGlobals();
  });
});
