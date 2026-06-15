import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import Nav from "@/app/components/nav/Nav";

// usePathname/ThemeToggle가 next 훅을 쓰므로 가볍게 mock.
vi.mock("next/navigation", () => ({ usePathname: () => "/coach" }));
vi.mock("@/app/components/ThemeToggle", () => ({
  default: () => <button>테마</button>,
}));

describe("Nav", () => {
  it("로고(풀림)·제품 라벨·앱 링크·CTA를 렌더한다", () => {
    render(<Nav />);
    const header = screen.getByRole("banner");
    expect(screen.getByText("풀림")).toBeInTheDocument();
    expect(within(header).getByText("라이팅코치")).toBeInTheDocument();
    expect(within(header).getByRole("link", { name: "코치" })).toHaveAttribute(
      "href",
      "/coach",
    );
    expect(
      within(header).getByRole("link", { name: "내 글 보관함" }),
    ).toHaveAttribute("href", "/results");
    expect(
      within(header).getByRole("link", { name: /시작하기/ }),
    ).toHaveAttribute("href", "/coach");
  });

  it("로고 링크는 부모 pullim.ai를 가리킨다", () => {
    render(<Nav />);
    expect(screen.getByLabelText("풀림 홈")).toHaveAttribute(
      "href",
      "https://pullim.ai",
    );
  });
});
