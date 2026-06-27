import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TileGlyph3D from "@/app/components/TileGlyph3D";

describe("TileGlyph3D", () => {
  it("아이콘 노드를 렌더하고 장식이므로 스크린리더에는 숨긴다(aria-hidden)", () => {
    render(<TileGlyph3D icon={<svg data-testid="ico" />} />);
    const el = screen.getByTestId("tile-glyph-3d");
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute("aria-hidden", "true");
    expect(screen.getByTestId("ico")).toBeInTheDocument();
  });
});
