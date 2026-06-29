import { it, expect, vi, beforeEach } from "vitest";
import * as storage from "@/app/lib/storage";
import { loadConsent, saveConsent, clearConsent } from "@/app/lib/consent-store";
import { emptyConsent } from "@/app/lib/consent";

const TS = "2026-06-09T00:00:00+09:00";

beforeEach(() => {
  storage.setAccountMode({ authed: false, local: false });
  window.localStorage.clear();
  globalThis.fetch = vi.fn();
});

it("guest(localStorage) — save → load 라운드트립", async () => {
  const state = { serviceConsentAt: TS, aiTrainingOptInAt: null, guardianConsentAt: TS };
  expect(await saveConsent(state)).toEqual({ ok: true });
  expect(await loadConsent()).toEqual(state);
  expect(globalThis.fetch).not.toHaveBeenCalled();
});

it("guest — 미존재 → emptyConsent 폴백", async () => {
  expect(await loadConsent()).toEqual(emptyConsent());
});

it("account mode — loadConsent는 GET /api/data/consent", async () => {
  storage.setAccountMode({ authed: true, local: false });
  const state = { serviceConsentAt: TS, aiTrainingOptInAt: null, guardianConsentAt: null };
  (globalThis.fetch as any).mockResolvedValue({ status: 200, json: async () => ({ payload: state }) });
  expect(await loadConsent()).toEqual(state);
  expect(globalThis.fetch).toHaveBeenCalledWith(
    "/api/data/consent",
    expect.objectContaining({ method: "GET", credentials: "include" }),
  );
});

it("account mode — saveConsent는 PUT /api/data/consent", async () => {
  storage.setAccountMode({ authed: true, local: false });
  (globalThis.fetch as any).mockResolvedValue({ status: 200, json: async () => ({ ok: true }) });
  const state = { serviceConsentAt: TS, aiTrainingOptInAt: TS, guardianConsentAt: null };
  expect(await saveConsent(state)).toEqual({ ok: true });
  const putCall = (globalThis.fetch as any).mock.calls.find((c: any[]) => c[1]?.method === "PUT");
  expect(putCall[0]).toBe("/api/data/consent");
  expect(JSON.parse(putCall[1].body).payload).toEqual(state);
});

it("saveConsent — invalid state는 invalid (write 미발생)", async () => {
  const r = await saveConsent({ serviceConsentAt: 123 } as any);
  expect(r).toEqual({ ok: false, reason: "invalid" });
  expect(globalThis.fetch).not.toHaveBeenCalled();
});

it("clearConsent — guest는 localStorage 제거", async () => {
  await saveConsent({ serviceConsentAt: TS, aiTrainingOptInAt: null, guardianConsentAt: null });
  await clearConsent();
  expect(await loadConsent()).toEqual(emptyConsent());
});
