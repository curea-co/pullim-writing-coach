import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import OutlinePanel from "@/app/components/coach/OutlinePanel";

beforeEach(() => window.localStorage.clear());

describe("OutlinePanel", () => {
  it("개요 뼈대 질문 카드를 렌더한다", () => {
    render(<OutlinePanel genre="설명문" />);
    expect(screen.getByText(/이 글에서 꼭 다뤄야 하는 핵심 내용/)).toBeInTheDocument();
  });

  it("메모 입력칸의 placeholder는 중립 안내('예:' 시작·완성문장 톤 금지)", () => {
    render(<OutlinePanel genre="설명문" />);
    const memo = screen.getAllByPlaceholderText(/네 생각을 한 줄로/)[0];
    expect(memo).toBeInTheDocument();
    // placeholder가 '예:' 시작 완성문장 예시 금지
    expect(memo).not.toHaveAttribute("placeholder", expect.stringMatching(/^예:/));
  });

  it("'캔버스에 넣기'·복사 등 본문 자동삽입 경로가 DOM에 없다 (대필 가드)", () => {
    render(<OutlinePanel genre="설명문" />);
    expect(screen.queryByText(/캔버스에 넣기|본문에 넣기|복사|붙여넣기/)).toBeNull();
  });
});
