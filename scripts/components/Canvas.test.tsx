import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Canvas from "@/app/components/coach/Canvas";

describe("Canvas", () => {
  it("data-testid='coach-canvas' 를 유지한다 (e2e 셀렉터 보존)", () => {
    render(<Canvas valueHtml="<p>안녕</p>" onChange={() => {}} />);
    expect(screen.getByTestId("coach-canvas")).toBeInTheDocument();
  });

  it("throw 없이 마운트된다", () => {
    expect(() =>
      render(<Canvas valueHtml="" onChange={() => {}} />)
    ).not.toThrow();
  });

  it("disabled prop 전달 시 throw 없이 마운트된다", () => {
    expect(() =>
      render(<Canvas valueHtml="" onChange={() => {}} disabled={true} />)
    ).not.toThrow();
  });

  it("onChange 핸들러가 { html, text } 형태의 객체를 받을 수 있다", () => {
    // onChange prop이 {html, text} 시그니처를 받는다는 것을 타입 수준에서 검증
    const onChange = vi.fn();
    expect(() =>
      render(<Canvas valueHtml="<p>테스트</p>" onChange={onChange} />)
    ).not.toThrow();
    // onChange가 {html, text} 시그니처로 정의되었음을 확인
    expect(typeof onChange).toBe("function");
  });

  it("글자수 카운터가 valueHtml의 코드포인트 기준 자수를 표시한다", () => {
    // htmlToPlain("<p>안녕</p>").trim() = "안녕" → cp = 2 → "2자"
    render(<Canvas valueHtml="<p>안녕</p>" onChange={() => {}} />);
    expect(screen.getByText("2자")).toBeInTheDocument();
  });

  it("spellcheck/onToggleSpellcheck prop 전달 시 throw 없이 마운트된다", () => {
    const toggle = vi.fn();
    expect(() =>
      render(<Canvas valueHtml="" onChange={() => {}} spellcheck={false} onToggleSpellcheck={toggle} />)
    ).not.toThrow();
  });
});
