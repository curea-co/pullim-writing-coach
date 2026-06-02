// TextPreviewCard 단위 테스트 — native <details> 접힘/펼침, [수정] 콜백.

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TextPreviewCard from "@/app/components/TextPreviewCard";

describe("TextPreviewCard", () => {
  const SHORT_BODY = "짧은 본문 50자 미만";
  const LONG_BODY = "오늘 학교에서 친구들과 점심을 먹으며 교복 자율화에 대해 토론했다. 나는 교복이 학생의 개성을 제한한다고 생각한다.";

  it("기본은 접힌 상태(<details>의 open=false)", () => {
    render(<TextPreviewCard body={LONG_BODY} onEdit={() => {}} />);
    const details = screen.getByText("내 글 미리보기").closest("details");
    expect(details).not.toHaveAttribute("open");
  });

  it("요약은 첫 120자 + … (긴 본문)", () => {
    const veryLong = "가".repeat(200);
    render(<TextPreviewCard body={veryLong} onEdit={() => {}} />);
    const summary = screen.getByText(/^가{120}…$/);
    expect(summary).toBeInTheDocument();
  });

  it("짧은 본문은 그대로 표시 (… 없음)", () => {
    render(<TextPreviewCard body={SHORT_BODY} onEdit={() => {}} />);
    // 접힘 상태 요약에 그대로 노출
    expect(screen.getAllByText(SHORT_BODY).length).toBeGreaterThan(0);
  });

  it("빈 본문은 '(빈 글)'로 표시", () => {
    render(<TextPreviewCard body="" onEdit={() => {}} />);
    expect(screen.getAllByText("(빈 글)").length).toBeGreaterThan(0);
  });

  it("자수 표시 — charCount(normalizeBody)", () => {
    // normalizeBody는 공백 정규화만 — "짧은 본문 50자 미만"은 일부 자수.
    render(<TextPreviewCard body={SHORT_BODY} onEdit={() => {}} />);
    // 자수 노출(여러 곳 가능 — 접힌·펼친 라벨 둘 다)이라 getAllByText 사용
    const matches = screen.getAllByText(/\d+자/);
    expect(matches.length).toBeGreaterThan(0);
  });

  it("summary 클릭 시 details 펼침 + [수정] 버튼 노출", async () => {
    const user = userEvent.setup();
    render(<TextPreviewCard body={LONG_BODY} onEdit={() => {}} />);
    const summary = screen.getByText("내 글 미리보기").closest("summary")!;
    await user.click(summary);
    const details = summary.closest("details");
    expect(details).toHaveAttribute("open");
    expect(screen.getByRole("button", { name: /수정/ })).toBeInTheDocument();
  });

  it("[수정] 버튼 클릭 시 onEdit 호출", async () => {
    const onEdit = vi.fn();
    const user = userEvent.setup();
    render(<TextPreviewCard body={LONG_BODY} onEdit={onEdit} />);
    // 먼저 펼침
    const summary = screen.getByText("내 글 미리보기").closest("summary")!;
    await user.click(summary);
    const editBtn = screen.getByRole("button", { name: /수정/ });
    await user.click(editBtn);
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it("className prop이 details 루트에 적용됨", () => {
    render(<TextPreviewCard body={LONG_BODY} onEdit={() => {}} className="custom-class" />);
    const details = screen.getByText("내 글 미리보기").closest("details");
    expect(details).toHaveClass("custom-class");
  });
});
