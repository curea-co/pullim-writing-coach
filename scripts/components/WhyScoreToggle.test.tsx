// WhyScoreToggle 단위 테스트 — 영역별 점수 설명, 현재 구간 강조.

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WhyScoreToggle from "@/app/components/WhyScoreToggle";

describe("WhyScoreToggle", () => {
  it("'왜 이 점수예요?' 트리거 표시 (접힘 기본)", () => {
    render(<WhyScoreToggle area="과제 이해" score={15} />);
    expect(screen.getByText("왜 이 점수예요?")).toBeInTheDocument();
    const details = screen.getByText("왜 이 점수예요?").closest("details");
    expect(details).not.toHaveAttribute("open");
  });

  it("펼치면 영역 의미 표시 (§ sectionRef 노출 안 함 — #18 컨벤션)", async () => {
    const user = userEvent.setup();
    render(<WhyScoreToggle area="과제 이해" score={15} />);
    const summary = screen.getByText("왜 이 점수예요?").closest("summary")!;
    await user.click(summary);
    // meaning 텍스트가 노출
    expect(screen.getByText(/과제가 묻는 핵심에 답했는지/)).toBeInTheDocument();
    // § 표기 학생 화면 노출 금지 검증
    expect(screen.queryByText(/§3/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\[§/)).not.toBeInTheDocument();
  });

  it("펼치면 4구간 anchor 표 모두 노출 (미흡·보통·양호·우수)", async () => {
    const user = userEvent.setup();
    render(<WhyScoreToggle area="내용 충실도" score={12} />);
    await user.click(screen.getByText("왜 이 점수예요?"));
    expect(screen.getByText("미흡")).toBeInTheDocument();
    expect(screen.getByText("보통")).toBeInTheDocument();
    expect(screen.getByText("양호")).toBeInTheDocument();
    expect(screen.getByText("우수")).toBeInTheDocument();
  });

  it("현재 점수의 밴드에 aria-current='true' 부여 (점수 15 → 양호)", async () => {
    const user = userEvent.setup();
    render(<WhyScoreToggle area="과제 이해" score={15} />);
    await user.click(screen.getByText("왜 이 점수예요?"));
    // 양호 구간 항목이 aria-current
    const list = screen.getByLabelText("영역 점수 4구간");
    const items = list.querySelectorAll("li");
    const currentItem = Array.from(items).find((li) => li.getAttribute("aria-current") === "true");
    expect(currentItem).toBeDefined();
    expect(currentItem?.textContent).toMatch(/양호/);
  });

  it("점수 7 → 미흡 구간 강조", async () => {
    const user = userEvent.setup();
    render(<WhyScoreToggle area="구조·논리" score={7} />);
    await user.click(screen.getByText("왜 이 점수예요?"));
    const items = screen.getByLabelText("영역 점수 4구간").querySelectorAll("li");
    const current = Array.from(items).find((li) => li.getAttribute("aria-current") === "true");
    expect(current?.textContent).toMatch(/미흡/);
  });

  it("점수 20 → 우수 구간 강조", async () => {
    const user = userEvent.setup();
    render(<WhyScoreToggle area="성장 가능성" score={20} />);
    await user.click(screen.getByText("왜 이 점수예요?"));
    const items = screen.getByLabelText("영역 점수 4구간").querySelectorAll("li");
    const current = Array.from(items).find((li) => li.getAttribute("aria-current") === "true");
    expect(current?.textContent).toMatch(/우수/);
  });

  it("AI 한계 카피 마지막 줄에 노출 (#19 TrustLabel 톤 일관)", async () => {
    const user = userEvent.setup();
    render(<WhyScoreToggle area="표현·문장" score={14} />);
    await user.click(screen.getByText("왜 이 점수예요?"));
    expect(screen.getByText(/AI가 본 한 시선이에요/)).toBeInTheDocument();
  });

  it("summary aria-label에 점수·영역 컨텍스트 포함", () => {
    render(<WhyScoreToggle area="과제 이해" score={15} />);
    const summary = screen.getByLabelText("과제 이해 영역 점수 15/20 근거 보기");
    expect(summary).toBeInTheDocument();
  });
});
