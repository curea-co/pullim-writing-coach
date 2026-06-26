import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import PersistDots from "@/app/components/coach/PersistDots";

describe("PersistDots", () => {
  it("count=3 → 텍스트 + 3개 도트 렌더", () => {
    render(<PersistDots count={3} />);
    expect(screen.getByTestId("persist-dots")).toBeInTheDocument();
    expect(screen.getByText("끝까지 해낸 글 3편")).toBeInTheDocument();
    const dotsContainer = screen.getByTestId("persist-dots").querySelector("span[aria-hidden='true']");
    expect(dotsContainer?.children.length).toBe(3);
  });

  it("count=0 → null(렌더 안 함)", () => {
    const { container } = render(<PersistDots count={0} />);
    expect(container.firstChild).toBeNull();
  });

  it("count 음수 → null(렌더 안 함)", () => {
    const { container } = render(<PersistDots count={-1} />);
    expect(container.firstChild).toBeNull();
  });

  it("count=10 → 10개 도트 렌더", () => {
    render(<PersistDots count={10} />);
    expect(screen.getByText("끝까지 해낸 글 10편")).toBeInTheDocument();
    const dotsContainer = screen.getByTestId("persist-dots").querySelector("span[aria-hidden='true']");
    expect(dotsContainer?.children.length).toBe(10);
  });

  it("count=15 → 도트는 10개 캡, 텍스트는 15편", () => {
    render(<PersistDots count={15} />);
    expect(screen.getByText("끝까지 해낸 글 15편")).toBeInTheDocument();
    const dotsContainer = screen.getByTestId("persist-dots").querySelector("span[aria-hidden='true']");
    expect(dotsContainer?.children.length).toBe(10);
  });
});
