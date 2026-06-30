import { it, expect, vi, beforeEach } from "vitest";
import * as storage from "@/app/lib/storage";

// jsdom 환경 — window.localStorage가 이미 존재. 매 테스트 clear + accountMode 리셋.
beforeEach(() => {
  storage.setAccountMode({ authed: false, local: false });
  window.localStorage.clear();
  globalThis.fetch = vi.fn();
});

it("guest(미인증) — addResult/loadResults는 localStorage", async () => {
  await storage.addResult({
    assignment: { school_level: "중1", subject: "국어", genre: "설명문", prompt_text: "주제", target_char_count: null } as any,
    submission: { body: "x".repeat(60), char_count: 60 },
    output: { total_score: 80, scores: [{ area: "과제 이해", score: 16 }], revision_guides: [], meta: {} } as any,
  });
  expect(globalThis.fetch).not.toHaveBeenCalled();
  const list = await storage.loadResults();
  expect(list.length).toBe(1);
});

it("accountMode — loadResults는 GET /api/data/results", async () => {
  storage.setAccountMode({ authed: true, local: false });
  (globalThis.fetch as any).mockResolvedValue({
    status: 200,
    json: async () => ({
      payload: [
        {
          id: "r1",
          created_at: "2026-01-01T00:00:00+09:00",
          assignment: { school_level: "중1", subject: "국어", genre: "설명문", prompt_text: "p" },
          submission: { body: "b", char_count: 1 },
          output: { total_score: 80, scores: [{ area: "과제 이해", score: 16 }], revision_guides: [], meta: {} },
        },
      ],
    }),
  });
  const list = await storage.loadResults();
  expect(globalThis.fetch).toHaveBeenCalledWith(
    "/api/data/results",
    expect.objectContaining({ method: "GET", credentials: "include" }),
  );
  expect(list.length).toBe(1);
});

it("accountMode — addResult는 read-modify-write PUT (LRU 어댑터 유지)", async () => {
  storage.setAccountMode({ authed: true, local: false });
  (globalThis.fetch as any)
    .mockResolvedValueOnce({ status: 200, json: async () => ({ payload: [] }) }) // GET (load)
    .mockResolvedValueOnce({ status: 200, json: async () => ({ ok: true }) }); // PUT (write)
  const r = await storage.addResult({
    assignment: { school_level: "중1", subject: "국어", genre: "설명문", prompt_text: "p", target_char_count: null } as any,
    submission: { body: "b", char_count: 1 },
    output: { total_score: 80, scores: [{ area: "과제 이해", score: 16 }], revision_guides: [], meta: {} } as any,
  });
  expect(r.ok).toBe(true);
  const putCall = (globalThis.fetch as any).mock.calls.find((c: any[]) => c[1]?.method === "PUT");
  expect(putCall[0]).toBe("/api/data/results");
  expect(JSON.parse(putCall[1].body).payload.length).toBe(1);
});

it("accountMode — GET 401 → refresh 콜백 1회 → 재시도", async () => {
  const refresh = vi.fn().mockResolvedValue(true);
  storage.setAccountMode({ authed: true, local: false, onAuthExpired: refresh });
  (globalThis.fetch as any)
    .mockResolvedValueOnce({ status: 401, json: async () => ({}) })
    .mockResolvedValueOnce({ status: 200, json: async () => ({ payload: [] }) });
  await storage.loadResults();
  expect(refresh).toHaveBeenCalledTimes(1);
  expect((globalThis.fetch as any).mock.calls.length).toBe(2);
});

it("accountMode — GET 401 → refresh가 false면 재시도 없이 읽기 실패(throw)", async () => {
  // PR #115 결함 2: 중요 데이터(loadResults)는 401(읽기 실패)을 빈 상태로 뭉개지 않고 throw한다.
  //   ("데이터 없음"=200+payload null과 구분 — 소비자가 에러 UI를 띄울 수 있게.)
  const refresh = vi.fn().mockResolvedValue(false);
  storage.setAccountMode({ authed: true, local: false, onAuthExpired: refresh });
  (globalThis.fetch as any).mockResolvedValueOnce({ status: 401, json: async () => ({}) });
  await expect(storage.loadResults()).rejects.toThrow();
  expect(refresh).toHaveBeenCalledTimes(1);
  expect((globalThis.fetch as any).mock.calls.length).toBe(1);
});

it("accountMode — 비중요 데이터(loadDraft/loadRevisions)는 GET 401 읽기 실패를 안전 기본값으로", async () => {
  // PR #115 결함 2: loadDraft/loadMetaUsage/loadRevisions/loadConsentData는 일시 장애에 관대 — throw 흡수.
  const refresh = vi.fn().mockResolvedValue(false);
  storage.setAccountMode({ authed: true, local: false, onAuthExpired: refresh });
  (globalThis.fetch as any).mockResolvedValue({ status: 401, json: async () => ({}) });
  expect(await storage.loadDraft()).toBeNull();
  expect(await storage.loadRevisions()).toEqual([]);
});
