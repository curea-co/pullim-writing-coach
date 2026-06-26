import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import BreakthroughBadge from "@/app/components/coach/BreakthroughBadge";

describe("BreakthroughBadge", () => {
  it("돌파 영역을 레몬 배지로 노출", () => {
    render(<BreakthroughBadge areas={["내용 충실도"]} />);
    expect(screen.getByTestId("breakthrough")).toBeInTheDocument();
    expect(screen.getByText("내용 충실도 돌파")).toBeInTheDocument();
  });
  it("돌파 없으면 렌더 안 함", () => {
    const { container } = render(<BreakthroughBadge areas={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
