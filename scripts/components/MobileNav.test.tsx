import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MobileNav from "@/app/components/nav/MobileNav";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

describe("MobileNav", () => {
  it("open=true면 다이얼로그와 모든 앱 링크를 노출한다", () => {
    render(<MobileNav open onClose={() => {}} />);
    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "코치" })).toHaveAttribute(
      "href",
      "/coach",
    );
    expect(screen.getByRole("link", { name: "샘플" })).toHaveAttribute(
      "href",
      "/samples",
    );
  });

  it("닫기 버튼 클릭 시 onClose를 호출한다", async () => {
    const onClose = vi.fn();
    render(<MobileNav open onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: "메뉴 닫기" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("open=false면 다이얼로그를 렌더하지 않는다", () => {
    render(<MobileNav open={false} onClose={() => {}} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
