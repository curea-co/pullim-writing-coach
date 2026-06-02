// Stepper 단위 테스트 — Step 1·2·3 active/done/pending 시각 분기.

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Stepper from "@/app/components/Stepper";

describe("Stepper", () => {
  it("nav에 aria-label='진행 단계' 부여", () => {
    render(<Stepper current={1} />);
    expect(screen.getByLabelText("진행 단계")).toBeInTheDocument();
  });

  it("current=1 — 1단계가 active, 2단계는 pending", () => {
    render(<Stepper current={1} />);
    const step1Badge = screen.getByText("1");
    expect(step1Badge).toHaveAttribute("aria-current", "step");
    // 2단계 배지는 숫자 "2" 텍스트 — done이 아니라 pending
    const step2Badge = screen.getByText("2");
    expect(step2Badge).not.toHaveAttribute("aria-current");
  });

  it("current=2 — 1단계 done(✓), 2단계 active", () => {
    render(<Stepper current={2} />);
    // done 배지는 ✓
    expect(screen.getByText("✓")).toBeInTheDocument();
    const step2Badge = screen.getByText("2");
    expect(step2Badge).toHaveAttribute("aria-current", "step");
  });

  it("current=3 — 1·2단계 모두 done(✓)", () => {
    render(<Stepper current={3} />);
    const checks = screen.getAllByText("✓");
    expect(checks).toHaveLength(2);
    // current=3은 어떤 step도 active 아님 (3은 결과 단계)
    expect(screen.queryByText("1")).not.toBeInTheDocument();
    expect(screen.queryByText("2")).not.toBeInTheDocument();
  });

  it("라벨 텍스트 '글 입력', '과제 정보' 노출", () => {
    render(<Stepper current={1} />);
    expect(screen.getByText("글 입력")).toBeInTheDocument();
    expect(screen.getByText("과제 정보")).toBeInTheDocument();
  });

  it("active 라벨에 font-semibold + text-foreground 클래스", () => {
    render(<Stepper current={1} />);
    const label = screen.getByText("글 입력");
    expect(label).toHaveClass("font-semibold");
    expect(label).toHaveClass("text-foreground");
  });

  it("inactive 라벨에 text-muted-foreground 클래스", () => {
    render(<Stepper current={1} />);
    const label = screen.getByText("과제 정보");
    expect(label).toHaveClass("text-muted-foreground");
  });

  it("active 배지에 bg-primary 클래스", () => {
    render(<Stepper current={1} />);
    const badge = screen.getByText("1");
    expect(badge).toHaveClass("bg-primary");
  });

  it("done 배지에 bg-band-good 클래스", () => {
    render(<Stepper current={2} />);
    const doneBadge = screen.getByText("✓");
    expect(doneBadge).toHaveClass("bg-band-good");
  });
});
