// scripts/components/useScoreForm.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useScoreForm } from "@/app/hooks/useScoreForm";
import { DEMO_TOKEN_KEY } from "@/app/components/TokenGate";

const MOCK_OUTPUT = {
  total_score: 75,
  scores: [
    { area: "과제 이해", score: 16, max: 20, feedback_good: "g", feedback_fix: "f" },
    { area: "내용 충실도", score: 15, max: 20, feedback_good: "g", feedback_fix: "f" },
    { area: "구조·논리", score: 14, max: 20, feedback_good: "g", feedback_fix: "f" },
    { area: "표현·문장", score: 15, max: 20, feedback_good: "g", feedback_fix: "f" },
    { area: "성장 가능성", score: 15, max: 20, feedback_good: "g", feedback_fix: "f" },
  ],
  revision_guides: [{ priority: 1, action: "결론 보강", reason: "마지막 단락" }],
  meta: { model_version: "v1", generated_at: "2026-06-02T10:00:00+09:00", is_verified: false, disclaimer: "AI 채점" },
};

describe("useScoreForm", () => {
  let originalClipboardDescriptor: PropertyDescriptor | undefined;

  beforeEach(() => {
    sessionStorage.setItem(DEMO_TOKEN_KEY, "test-mock");
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn(() =>
      Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(MOCK_OUTPUT) } as Response)
    ));
    originalClipboardDescriptor = Object.getOwnPropertyDescriptor(window.navigator, "clipboard");
    Object.defineProperty(window.navigator, "clipboard", {
      configurable: true,
      value: { readText: () => Promise.reject(new Error("no-clipboard")) },
    });
  });

  afterEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    if (originalClipboardDescriptor) {
      Object.defineProperty(window.navigator, "clipboard", originalClipboardDescriptor);
    } else {
      delete (window.navigator as { clipboard?: unknown }).clipboard;
    }
  });

  it("initial state: bodyOk=false, submitState.phase=idle, canSubmit=false", () => {
    const { result } = renderHook(() => useScoreForm({}));
    expect(result.current.bodyOk).toBe(false);
    expect(result.current.submitState.phase).toBe("idle");
    expect(result.current.canSubmit).toBe(false);
  });

  it("setBody to 50+ chars → bodyOk=true", () => {
    const { result } = renderHook(() => useScoreForm({}));
    act(() => {
      result.current.onEditorChange({ html: "<p>오늘 학교에서 친구들과 점심을 먹으며 교복 자율화에 대해 토론했다. 나는 교복이 학생의 개성을 제한한다고 생각한다.</p>", text: "오늘 학교에서 친구들과 점심을 먹으며 교복 자율화에 대해 토론했다. 나는 교복이 학생의 개성을 제한한다고 생각한다." });
    });
    expect(result.current.bodyOk).toBe(true);
  });

  it("all fields filled → canSubmit=true", () => {
    const { result } = renderHook(() => useScoreForm({}));
    act(() => {
      result.current.onEditorChange({ html: "<p>오늘 학교에서 친구들과 점심을 먹으며 교복 자율화에 대해 토론했다. 나는 교복이 학생의 개성을 제한한다고 생각한다.</p>", text: "오늘 학교에서 친구들과 점심을 먹으며 교복 자율화에 대해 토론했다. 나는 교복이 학생의 개성을 제한한다고 생각한다." });
      result.current.setSchoolLevel("중2");
      result.current.setSubject("국어");
      result.current.setGenre("논설문·주장하는 글");
      result.current.setPromptText("교복 자율화에 대한 자신의 주장을 근거 2개 이상으로 쓰시오.");
    });
    expect(result.current.canSubmit).toBe(true);
  });

  it("handleSubmit with canSubmit=true → fetch called + phase=result", async () => {
    const { result } = renderHook(() => useScoreForm({}));
    act(() => {
      result.current.onEditorChange({ html: "<p>오늘 학교에서 친구들과 점심을 먹으며 교복 자율화에 대해 토론했다. 나는 교복이 학생의 개성을 제한한다고 생각한다.</p>", text: "오늘 학교에서 친구들과 점심을 먹으며 교복 자율화에 대해 토론했다. 나는 교복이 학생의 개성을 제한한다고 생각한다." });
      result.current.setSchoolLevel("중2");
      result.current.setSubject("국어");
      result.current.setGenre("논설문·주장하는 글");
      result.current.setPromptText("교복 자율화에 대한 자신의 주장을 근거 2개 이상으로 쓰시오.");
    });
    act(() => { result.current.handleSubmit({ preventDefault: () => {} } as React.FormEvent); });
    await waitFor(() => expect(result.current.submitState.phase).toBe("result"));
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/score",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "x-demo-token": "test-mock" }),
      }),
    );
  });

  it("SSO authed + 데모토큰 없음 → 단락 없이 fetch 발생 (x-demo-token 미부착)", async () => {
    // prod authed 사용자는 데모토큰이 없다(데모토큰은 로컬 전용). 토큰 부재가 곧 차단이 되어선 안 됨.
    sessionStorage.removeItem(DEMO_TOKEN_KEY);
    const onAuthExpired = vi.fn();
    const { result } = renderHook(() => useScoreForm({ onAuthExpired }));
    act(() => {
      result.current.onEditorChange({ html: "<p>오늘 학교에서 친구들과 점심을 먹으며 교복 자율화에 대해 토론했다. 나는 교복이 학생의 개성을 제한한다고 생각한다.</p>", text: "오늘 학교에서 친구들과 점심을 먹으며 교복 자율화에 대해 토론했다. 나는 교복이 학생의 개성을 제한한다고 생각한다." });
      result.current.setSchoolLevel("중2");
      result.current.setSubject("국어");
      result.current.setGenre("논설문·주장하는 글");
      result.current.setPromptText("교복 자율화에 대한 자신의 주장을 근거 2개 이상으로 쓰시오.");
    });
    act(() => { result.current.handleSubmit({ preventDefault: () => {} } as React.FormEvent); });
    await waitFor(() => expect(result.current.submitState.phase).toBe("result"));
    // 토큰 부재로 단락되지 않고 fetch가 발생해야 한다(인가는 서버 쿠키/me가 권위).
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/score",
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
    // 데모토큰이 없으므로 x-demo-token 헤더는 부착되지 않아야 한다.
    const callArgs = (globalThis.fetch as unknown as { mock: { calls: unknown[][] } }).mock.calls[0];
    const headers = (callArgs[1] as { headers: Record<string, string> }).headers;
    expect(headers["x-demo-token"]).toBeUndefined();
    // 토큰 부재만으로 onAuthExpired가 호출돼선 안 된다(서버 401일 때만).
    expect(onAuthExpired).not.toHaveBeenCalled();
  });

  // 게이트키퍼 SSO 계약(2026-07-10): access 만료(401) → refresh(onAuthRefresh) → 성공 시 **같은 요청 자동 재시도**.
  it("401 → onAuthRefresh true → 같은 요청 자동 재시도 → 200 result (onAuthExpired 미호출)", async () => {
    // 1번째 /api/score = 401(만료), 2번째 = 200 — 게이트키퍼 테스트 시나리오 그대로.
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 401, json: () => Promise.reject() } as unknown as Response)
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(MOCK_OUTPUT) } as Response);
    vi.stubGlobal("fetch", fetchMock);
    const onAuthExpired = vi.fn();
    const onAuthRefresh = vi.fn(async () => "authed" as const); // 토큰 회전 성공
    const { result } = renderHook(() => useScoreForm({ onAuthExpired, onAuthRefresh }));
    act(() => {
      result.current.onEditorChange({ html: "<p>오늘 학교에서 친구들과 점심을 먹으며 교복 자율화에 대해 토론했다. 나는 교복이 학생의 개성을 제한한다고 생각한다.</p>", text: "오늘 학교에서 친구들과 점심을 먹으며 교복 자율화에 대해 토론했다. 나는 교복이 학생의 개성을 제한한다고 생각한다." });
      result.current.setSchoolLevel("중2");
      result.current.setSubject("국어");
      result.current.setGenre("논설문·주장하는 글");
      result.current.setPromptText("교복 자율화에 대한 자신의 주장을 근거 2개 이상으로 쓰시오.");
    });
    act(() => { result.current.handleSubmit({ preventDefault: () => {} } as React.FormEvent); });
    await waitFor(() => expect(result.current.submitState.phase).toBe("result"));
    expect(onAuthRefresh).toHaveBeenCalledOnce();
    // /api/score 2회(원 호출 + 재시도) — 재인증 유도(onAuthExpired)로 낙하하지 않음.
    const scoreCalls = fetchMock.mock.calls.filter(([u]) => u === "/api/score");
    expect(scoreCalls.length).toBe(2);
    expect(onAuthExpired).not.toHaveBeenCalled();
  });

  it("401 반복(refresh 성공에도 재401) → 1회만 재시도 후 onAuthExpired 낙하(무한루프 방지)", async () => {
    vi.stubGlobal("fetch", vi.fn(() =>
      Promise.resolve({ ok: false, status: 401, json: () => Promise.reject() } as unknown as Response)
    ));
    const onAuthExpired = vi.fn();
    const onAuthRefresh = vi.fn(async () => "authed" as const);
    const { result } = renderHook(() => useScoreForm({ onAuthExpired, onAuthRefresh }));
    act(() => {
      result.current.onEditorChange({ html: "<p>오늘 학교에서 친구들과 점심을 먹으며 교복 자율화에 대해 토론했다. 나는 교복이 학생의 개성을 제한한다고 생각한다.</p>", text: "오늘 학교에서 친구들과 점심을 먹으며 교복 자율화에 대해 토론했다. 나는 교복이 학생의 개성을 제한한다고 생각한다." });
      result.current.setSchoolLevel("중2");
      result.current.setSubject("국어");
      result.current.setGenre("논설문·주장하는 글");
      result.current.setPromptText("교복 자율화에 대한 자신의 주장을 근거 2개 이상으로 쓰시오.");
    });
    act(() => { result.current.handleSubmit({ preventDefault: () => {} } as React.FormEvent); });
    await waitFor(() => expect(onAuthExpired).toHaveBeenCalledOnce());
    expect(onAuthRefresh).toHaveBeenCalledOnce(); // 재시도 1회 한정
    expect(result.current.submitState.phase).toBe("idle");
  });

  it("401 → refresh 'error'(인증 서버 장애) → 재인증 유도가 아니라 일시 오류 UI(E8, 재시도 가능)", async () => {
    vi.stubGlobal("fetch", vi.fn(() =>
      Promise.resolve({ ok: false, status: 401, json: () => Promise.reject() } as unknown as Response)
    ));
    const onAuthExpired = vi.fn();
    const onAuthRefresh = vi.fn(async () => "error" as const); // 인증 서버 5xx/네트워크
    const { result } = renderHook(() => useScoreForm({ onAuthExpired, onAuthRefresh }));
    act(() => {
      result.current.onEditorChange({ html: "<p>오늘 학교에서 친구들과 점심을 먹으며 교복 자율화에 대해 토론했다. 나는 교복이 학생의 개성을 제한한다고 생각한다.</p>", text: "오늘 학교에서 친구들과 점심을 먹으며 교복 자율화에 대해 토론했다. 나는 교복이 학생의 개성을 제한한다고 생각한다." });
      result.current.setSchoolLevel("중2");
      result.current.setSubject("국어");
      result.current.setGenre("논설문·주장하는 글");
      result.current.setPromptText("교복 자율화에 대한 자신의 주장을 근거 2개 이상으로 쓰시오.");
    });
    act(() => { result.current.handleSubmit({ preventDefault: () => {} } as React.FormEvent); });
    await waitFor(() => expect(result.current.submitState.phase).toBe("error"));
    // 장애를 세션 만료로 위장하지 않는다(use-auth error 분리 계약) — 재인증 유도 미발생 + 재시도 가능.
    expect(onAuthExpired).not.toHaveBeenCalled();
    const st = result.current.submitState as { code: string; retryable: boolean };
    expect(st.code).toBe("E8");
    expect(st.retryable).toBe(true);
  });

  it("401 response → onAuthExpired called, phase back to idle", async () => {
    vi.stubGlobal("fetch", vi.fn(() =>
      Promise.resolve({ ok: false, status: 401, json: () => Promise.reject() } as unknown as Response)
    ));
    const onAuthExpired = vi.fn();
    const { result } = renderHook(() => useScoreForm({ onAuthExpired }));
    act(() => {
      result.current.onEditorChange({ html: "<p>오늘 학교에서 친구들과 점심을 먹으며 교복 자율화에 대해 토론했다. 나는 교복이 학생의 개성을 제한한다고 생각한다.</p>", text: "오늘 학교에서 친구들과 점심을 먹으며 교복 자율화에 대해 토론했다. 나는 교복이 학생의 개성을 제한한다고 생각한다." });
      result.current.setSchoolLevel("중2");
      result.current.setSubject("국어");
      result.current.setGenre("논설문·주장하는 글");
      result.current.setPromptText("교복 자율화에 대한 자신의 주장을 근거 2개 이상으로 쓰시오.");
    });
    act(() => { result.current.handleSubmit({ preventDefault: () => {} } as React.FormEvent); });
    await waitFor(() => expect(onAuthExpired).toHaveBeenCalledOnce());
    expect(result.current.submitState.phase).toBe("idle");
  });

  it("draft in LS → restoredDraft set on mount, body stays empty", async () => {
    localStorage.setItem("pwc_draft_v1", JSON.stringify({
      body: "이전에 작성한 글입니다. 충분히 길어요.", school_level: "중2",
      subject: "국어", genre: "논설문·주장하는 글", saved_at: "2026-06-02T10:00:00+09:00"
    }));
    const { result } = renderHook(() => useScoreForm({}));
    // loadDraft가 async — 복원은 마운트 effect 완료 후.
    await waitFor(() => expect(result.current.restoredDraft).not.toBeNull());
    expect(result.current.body).toBe("");
  });

  it("applyRestore → body filled, restoredDraft null", async () => {
    const draftBody = "이전에 작성한 글입니다. 충분히 길어요.";
    localStorage.setItem("pwc_draft_v1", JSON.stringify({
      body: draftBody, saved_at: "2026-06-02T10:00:00+09:00"
    }));
    const { result } = renderHook(() => useScoreForm({}));
    await waitFor(() => expect(result.current.restoredDraft).not.toBeNull());
    act(() => { result.current.applyRestore(); });
    expect(result.current.body).toBe(draftBody);
    expect(result.current.restoredDraft).toBeNull();
  });

  it("dismissRestore → restoredDraft null, LS cleared", async () => {
    localStorage.setItem("pwc_draft_v1", JSON.stringify({
      body: "이전 글.", saved_at: "2026-06-02T10:00:00+09:00"
    }));
    const { result } = renderHook(() => useScoreForm({}));
    await waitFor(() => expect(result.current.restoredDraft).not.toBeNull());
    act(() => { result.current.dismissRestore(); });
    expect(result.current.restoredDraft).toBeNull();
    await waitFor(() => expect(localStorage.getItem("pwc_draft_v1")).toBeNull());
  });

  it("retryable error → retry() re-calls fetch with same payload", async () => {
    let callCount = 0;
    vi.stubGlobal("fetch", vi.fn(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve({ ok: false, status: 503, json: () => Promise.resolve({ error: { code: "E8" } }) } as unknown as Response);
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(MOCK_OUTPUT) } as Response);
    }));
    const { result } = renderHook(() => useScoreForm({}));
    act(() => {
      result.current.onEditorChange({ html: "<p>오늘 학교에서 친구들과 점심을 먹으며 교복 자율화에 대해 토론했다. 나는 교복이 학생의 개성을 제한한다고 생각한다.</p>", text: "오늘 학교에서 친구들과 점심을 먹으며 교복 자율화에 대해 토론했다. 나는 교복이 학생의 개성을 제한한다고 생각한다." });
      result.current.setSchoolLevel("중2"); result.current.setSubject("국어");
      result.current.setGenre("논설문·주장하는 글");
      result.current.setPromptText("교복 자율화에 대한 자신의 주장을 근거 2개 이상으로 쓰시오.");
    });
    act(() => { result.current.handleSubmit({ preventDefault: () => {} } as React.FormEvent); });
    await waitFor(() => expect(result.current.submitState.phase).toBe("error"));
    expect((result.current.submitState as { retryable: boolean }).retryable).toBe(true);
    act(() => { result.current.retry(); });
    await waitFor(() => expect(result.current.submitState.phase).toBe("result"));
    expect(callCount).toBe(2);
  });

  it("defaults prop → schoolLevel/subject/genre pre-filled", () => {
    const { result } = renderHook(() =>
      useScoreForm({ defaults: { school_level: "고3", subject: "국어", genre: "감상문·독후감" } })
    );
    expect(result.current.schoolLevel).toBe("고3");
    expect(result.current.subject).toBe("국어");
    expect(result.current.genre).toBe("감상문·독후감");
  });
});
