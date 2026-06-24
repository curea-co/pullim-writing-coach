import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import GuidePanel from "@/app/components/coach/GuidePanel";

beforeEach(() => window.localStorage.clear());

describe("GuidePanel", () => {
  it("질문 카드를 렌더한다", () => {
    render(<GuidePanel genre="설명문" />);
    expect(screen.getByText(/이 과제가 너한테 묻는 핵심/)).toBeInTheDocument();
  });

  it("메모 입력칸의 placeholder는 중립 안내(예시 문장 금지)", () => {
    render(<GuidePanel genre="설명문" />);
    const memo = screen.getAllByPlaceholderText(/네 생각을 한 줄로/)[0];
    expect(memo).toBeInTheDocument();
  });

  it("'캔버스에 넣기'·복사 등 본문 자동삽입 경로가 DOM에 없다 (대필 가드)", () => {
    render(<GuidePanel genre="설명문" />);
    expect(screen.queryByText(/캔버스에 넣기|본문에 넣기|복사|붙여넣기/)).toBeNull();
  });
});
