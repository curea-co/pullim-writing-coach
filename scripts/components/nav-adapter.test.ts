import { describe, it, expect } from "vitest";
import { NAV, railItems, tabItems } from "../../app/components/nav-adapter";

describe("nav-adapter", () => {
  it("NAV lists the writing-coach routes", () => {
    expect(NAV.map((n) => n.href)).toEqual(["/", "/try", "/coach", "/results", "/samples", "/me", "/about"]);
  });
  it("railItems marks home active only on exact /", () => {
    const items = railItems("/");
    expect(items.find((i) => i.href === "/")?.active).toBe(true);
    expect(items.find((i) => i.href === "/try")?.active).toBe(false);
  });
  it("railItems uses prefix match for /samples", () => {
    const items = railItems("/samples/a");
    expect(items.find((i) => i.href === "/samples")?.active).toBe(true);
    expect(items.find((i) => i.href === "/")?.active).toBe(false);
  });
  it("tabItems: 5개 주요 라우트 — 홈이 중앙(3번째) (2026-07-10 소유자 확정 순서)", () => {
    expect(tabItems("/try").map((i) => i.href)).toEqual(["/try", "/coach", "/", "/results", "/samples"]);
    expect(tabItems("/try").find((i) => i.href === "/try")?.active).toBe(true);
  });
});
