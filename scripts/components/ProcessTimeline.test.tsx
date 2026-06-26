import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ProcessTimeline from "@/app/components/coach/ProcessTimeline";
import type { TimelineNode } from "@/app/lib/process-log";

describe("ProcessTimeline", () => {
  const nodes: TimelineNode[] = [
    { n: 1, charCount: 7, delta: 0 },
    { n: 2, charCount: 12, delta: 5 },
  ];

  it("nodes 2개 → 1번째 글·2번째 글·+5자 더 채움 노출", () => {
    render(<ProcessTimeline nodes={nodes} />);
    expect(screen.getByTestId("process-timeline")).toBeInTheDocument();
    expect(screen.getByText("1번째 글")).toBeInTheDocument();
    expect(screen.getByText("2번째 글")).toBeInTheDocument();
    expect(screen.getByText("+5자 더 채움")).toBeInTheDocument();
  });

  it("첫 번째 노드(delta=0)에는 '+0자 더 채움' 없음", () => {
    render(<ProcessTimeline nodes={nodes} />);
    expect(screen.queryByText("+0자 더 채움")).toBeNull();
  });

  it("nodes=[] → null (렌더 안 함)", () => {
    const { container } = render(<ProcessTimeline nodes={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("charCount를 ko-KR 포맷으로 표시", () => {
    render(<ProcessTimeline nodes={nodes} />);
    expect(screen.getByText("7자 직접 씀")).toBeInTheDocument();
    expect(screen.getByText("12자 직접 씀")).toBeInTheDocument();
  });
});
