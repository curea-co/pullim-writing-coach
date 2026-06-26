import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import HeroMotion3D from "@/app/components/HeroMotion3D";
import { ServiceHero } from "@/components/ui/service-hero";

describe("HeroMotion3D", () => {
  it("장식 레이어를 렌더하고 스크린리더에는 숨긴다(aria-hidden)", () => {
    render(<HeroMotion3D />);
    const el = screen.getByTestId("hero-motion-3d");
    expect(el).toBeInTheDocument();
    expect(el).toHaveAttribute("aria-hidden", "true");
  });

  it("ServiceHero의 decoration 슬롯에 렌더되며 본문(제목)과 공존한다", () => {
    render(<ServiceHero title="라이팅 코치" decoration={<HeroMotion3D />} />);
    expect(screen.getByTestId("hero-motion-3d")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "라이팅 코치" })).toBeInTheDocument();
  });
});
