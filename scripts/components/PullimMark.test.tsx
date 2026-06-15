import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PullimMark } from "@/app/components/brand/PullimMark";

describe("PullimMark", () => {
  it("기본: 풀림 워드마크 텍스트와 로고 이미지를 렌더한다", () => {
    render(<PullimMark />);
    expect(screen.getByText("풀림")).toBeInTheDocument();
    // next/image는 <img>로 렌더 — alt는 빈 문자열(장식), aria-label은 wrapper에.
    expect(screen.getByLabelText("풀림 PULLIM")).toBeInTheDocument();
  });

  it("showWordmark=false면 워드마크 텍스트를 렌더하지 않는다", () => {
    render(<PullimMark showWordmark={false} />);
    expect(screen.queryByText("풀림")).not.toBeInTheDocument();
  });
});
