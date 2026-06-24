import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AssignmentStep from "@/app/components/coach/AssignmentStep";

describe("AssignmentStep", () => {
  it("미입력 시 다음 버튼 비활성", () => {
    render(<AssignmentStep onSubmit={() => {}} />);
    expect(screen.getByRole("button", { name: /다음/ })).toBeDisabled();
  });

  it("필수 입력 후 onSubmit이 과제 객체로 호출", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<AssignmentStep onSubmit={onSubmit} />);
    await user.selectOptions(screen.getByLabelText(/학년/), "중2");
    await user.selectOptions(screen.getByLabelText(/과목/), "과학");
    await user.selectOptions(screen.getByLabelText(/어떤 글/), "설명문");
    await user.type(screen.getByLabelText(/과제 내용/), "화산의 형성 과정을 설명하라");
    await user.click(screen.getByRole("button", { name: /다음/ }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      school_level: "중2",
      subject: "과학",
      genre: "설명문",
      prompt_text: "화산의 형성 과정을 설명하라",
    });
  });
});
