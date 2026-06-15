// MetaForm 컴포넌트 단위 테스트 — Vitest + RTL.
// 실행: npm run test:components

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MetaForm, { type MetaFormProps } from "@/app/components/MetaForm";

function makeProps(overrides: Partial<MetaFormProps> = {}): MetaFormProps {
  return {
    schoolLevel: "",
    subject: "",
    genre: "",
    targetRaw: "",
    promptText: "",
    targetInvalid: false,
    locked: false,
    onChangeSchoolLevel: vi.fn(),
    onChangeSubject: vi.fn(),
    onChangeGenre: vi.fn(),
    onChangeTargetRaw: vi.fn(),
    onChangePromptText: vi.fn(),
    ...overrides,
  };
}

describe("MetaForm", () => {
  it("5개 필드(학교·학년·과목·장르·목표·과제 내용) 모두 렌더링", () => {
    render(<MetaForm {...makeProps()} />);
    expect(screen.getByLabelText("학교·학년")).toBeInTheDocument();
    expect(screen.getByLabelText("과목")).toBeInTheDocument();
    expect(screen.getByLabelText("어떤 글인가요?")).toBeInTheDocument();
    expect(screen.getByLabelText(/목표 글자 수/)).toBeInTheDocument();
    expect(screen.getByLabelText("과제 내용")).toBeInTheDocument();
  });

  it("schoolLevel 변경 시 onChangeSchoolLevel 호출", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<MetaForm {...makeProps({ onChangeSchoolLevel: onChange })} />);
    await user.selectOptions(screen.getByLabelText("학교·학년"), "중2");
    expect(onChange).toHaveBeenCalledWith("중2");
  });

  it("promptText 변경 시 onChangePromptText 호출 (textarea 인풋)", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<MetaForm {...makeProps({ onChangePromptText: onChange })} />);
    await user.type(screen.getByLabelText("과제 내용"), "교복");
    // userEvent.type은 글자별로 onChange 발화 — 마지막 호출이 누적값
    expect(onChange).toHaveBeenCalled();
  });

  it("locked=true면 모든 인풋 disabled", () => {
    render(<MetaForm {...makeProps({ locked: true })} />);
    expect(screen.getByLabelText("학교·학년")).toBeDisabled();
    expect(screen.getByLabelText("과목")).toBeDisabled();
    expect(screen.getByLabelText("어떤 글인가요?")).toBeDisabled();
    expect(screen.getByLabelText(/목표 글자 수/)).toBeDisabled();
    expect(screen.getByLabelText("과제 내용")).toBeDisabled();
  });

  it("targetInvalid=true면 경고 메시지 노출", () => {
    render(<MetaForm {...makeProps({ targetInvalid: true, targetRaw: "9999" })} />);
    expect(screen.getByText(/50~2,000자/)).toBeInTheDocument();
  });

  it("targetInvalid=false면 경고 메시지 미노출", () => {
    render(<MetaForm {...makeProps({ targetInvalid: false })} />);
    expect(screen.queryByText(/50~2,000자/)).not.toBeInTheDocument();
  });

  it("promptText 길이 < PROMPT_MIN(10)이면 (최소 10자) 경고 노출", () => {
    render(<MetaForm {...makeProps({ promptText: "짧은 글" })} />);
    expect(screen.getByText(/최소 10자/)).toBeInTheDocument();
  });

  it("promptText 비어 있으면 (최소 10자) 경고 미노출 (빈 상태는 정상)", () => {
    render(<MetaForm {...makeProps({ promptText: "" })} />);
    expect(screen.queryByText(/최소 10자/)).not.toBeInTheDocument();
  });

  it("promptText ≥ PROMPT_MIN(10)자면 경고 미노출", () => {
    render(<MetaForm {...makeProps({ promptText: "충분히 긴 과제 내용입니다" })} />);
    expect(screen.queryByText(/최소 10자/)).not.toBeInTheDocument();
  });

  it("selects의 첫 옵션은 '선택해 주세요'", () => {
    render(<MetaForm {...makeProps()} />);
    const schoolSelect = screen.getByLabelText("학교·학년") as HTMLSelectElement;
    expect(schoolSelect.options[0].text).toBe("선택해 주세요");
  });

  it("name 속성은 id와 같음 (autocomplete 안전)", () => {
    render(<MetaForm {...makeProps()} />);
    expect(screen.getByLabelText("학교·학년")).toHaveAttribute("name", "school-level");
    expect(screen.getByLabelText("과목")).toHaveAttribute("name", "subject");
    expect(screen.getByLabelText("과제 내용")).toHaveAttribute("name", "prompt");
  });
});
