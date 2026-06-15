// AssignmentSetup 컴포넌트 테스트 — Vitest + RTL.
//   ① 해독 진입 단계(학생이 자기 과제·루브릭을 입력 → onStart로 코치 시작) 런타임 검증.
//   계약: 학년/과목/장르 + 과제문(MetaForm 재사용) + (선택)루브릭. 제출은 canStart일 때만 onStart 호출.
//   제출 버튼은 disabled가 아니라 aria-disabled — 짧은 과제문으로 눌러도 onStart 미호출 + 경고 노출이 계약.
// 실행: npm run test:components

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AssignmentSetup from "@/app/components/coach/AssignmentSetup";
import { PROMPT_MIN, PROMPT_MAX } from "@/app/lib/grading";

const VALID_PROMPT =
  "화산의 형성 과정과 그것이 우리 삶에 미치는 영향을 설명하는 글을 쓰시오.";

describe("AssignmentSetup", () => {
  it("학년·과목·장르 + 과제문 입력칸을 모두 보여 준다", () => {
    render(<AssignmentSetup onStart={vi.fn()} />);
    expect(screen.getByLabelText("학교·학년")).toBeInTheDocument();
    expect(screen.getByLabelText("과목")).toBeInTheDocument();
    expect(screen.getByLabelText("어떤 글인가요?")).toBeInTheDocument();
    expect(screen.getByLabelText("과제 내용")).toBeInTheDocument();
    // 시작 버튼 노출
    expect(screen.getByRole("button", { name: /이 과제로 시작하기/ })).toBeInTheDocument();
  });

  it("메타 미입력 상태로 제출하면 onStart 미호출 + 경고 노출", async () => {
    const onStart = vi.fn();
    const user = userEvent.setup();
    render(<AssignmentSetup onStart={onStart} />);
    await user.click(screen.getByRole("button", { name: /이 과제로 시작하기/ }));
    expect(onStart).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("학년·과목·글 종류를 모두 선택해 주세요.");
  });

  it("과제문이 너무 짧으면(메타는 채워도) 제출이 막히고 글자수 경고 노출", async () => {
    const onStart = vi.fn();
    const user = userEvent.setup();
    render(<AssignmentSetup onStart={onStart} />);
    await user.selectOptions(screen.getByLabelText("학교·학년"), "중2");
    await user.selectOptions(screen.getByLabelText("과목"), "과학");
    await user.selectOptions(screen.getByLabelText("어떤 글인가요?"), "설명문");
    // PROMPT_MIN(10) 미만의 짧은 과제문
    await user.type(screen.getByLabelText("과제 내용"), "짧음");
    await user.click(screen.getByRole("button", { name: /이 과제로 시작하기/ }));
    expect(onStart).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      `과제 내용을 ${PROMPT_MIN}~${PROMPT_MAX}자로 입력해 주세요.`,
    );
  });

  it("유효 입력으로 제출하면 onStart가 assignment와 함께 호출된다", async () => {
    const onStart = vi.fn();
    const user = userEvent.setup();
    render(<AssignmentSetup onStart={onStart} />);
    await user.selectOptions(screen.getByLabelText("학교·학년"), "중2");
    await user.selectOptions(screen.getByLabelText("과목"), "과학");
    await user.selectOptions(screen.getByLabelText("어떤 글인가요?"), "설명문");
    await user.type(screen.getByLabelText("과제 내용"), VALID_PROMPT);
    await user.click(screen.getByRole("button", { name: /이 과제로 시작하기/ }));

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStart).toHaveBeenCalledWith(
      expect.objectContaining({
        assignment: {
          school_level: "중2",
          subject: "과학",
          genre: "설명문",
          prompt_text: VALID_PROMPT,
        },
      }),
    );
    // 루브릭 미입력 시 studentRubric은 미포함(undefined → 키 자체 없음)
    expect(onStart.mock.calls[0][0]).not.toHaveProperty("studentRubric");
  });

  it("루브릭을 적으면 onStart 결과에 studentRubric(trim)으로 포함된다", async () => {
    const onStart = vi.fn();
    const user = userEvent.setup();
    render(<AssignmentSetup onStart={onStart} />);
    await user.selectOptions(screen.getByLabelText("학교·학년"), "중2");
    await user.selectOptions(screen.getByLabelText("과목"), "과학");
    await user.selectOptions(screen.getByLabelText("어떤 글인가요?"), "설명문");
    await user.type(screen.getByLabelText("과제 내용"), VALID_PROMPT);
    await user.type(screen.getByLabelText(/채점기준표·루브릭/), "근거 2개 이상");
    await user.click(screen.getByRole("button", { name: /이 과제로 시작하기/ }));

    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStart.mock.calls[0][0]).toMatchObject({ studentRubric: "근거 2개 이상" });
  });

  it("'예시로 채우기'를 누르면 데모 과제가 프리필되고 그대로 제출 가능하다", async () => {
    const onStart = vi.fn();
    const user = userEvent.setup();
    render(<AssignmentSetup onStart={onStart} />);
    await user.click(screen.getByRole("button", { name: "예시로 채우기" }));
    // 데모값 프리필 확인
    expect(screen.getByLabelText("학교·학년")).toHaveValue("중2");
    expect(screen.getByLabelText("과목")).toHaveValue("과학");
    expect(screen.getByLabelText("어떤 글인가요?")).toHaveValue("설명문");
    expect((screen.getByLabelText("과제 내용") as HTMLTextAreaElement).value.length).toBeGreaterThan(
      PROMPT_MIN,
    );
    // 프리필 상태로 바로 시작 가능
    await user.click(screen.getByRole("button", { name: /이 과제로 시작하기/ }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });
});
