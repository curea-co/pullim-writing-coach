import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

  it("onStartBody 미전달 시 '이제 본문 쓰기' 버튼이 렌더되지 않는다", () => {
    render(<OutlinePanel genre="설명문" />);
    expect(screen.queryByRole("button", { name: /이제 본문 쓰기/ })).toBeNull();
  });

  it("onStartBody 전달 시 '이제 본문 쓰기 →' 버튼이 렌더된다", () => {
    const onStartBody = vi.fn();
    render(<OutlinePanel genre="설명문" onStartBody={onStartBody} />);
    expect(screen.getByRole("button", { name: /이제 본문 쓰기/ })).toBeInTheDocument();
  });

  it("'이제 본문 쓰기 →' 클릭 시 onStartBody를 1회 호출하며 메모·문자열 인자를 전달하지 않는다", async () => {
    const user = userEvent.setup();
    const onStartBody = vi.fn();
    render(<OutlinePanel genre="설명문" onStartBody={onStartBody} />);
    const btn = screen.getByRole("button", { name: /이제 본문 쓰기/ });
    await user.click(btn);
    expect(onStartBody).toHaveBeenCalledTimes(1);
    // 메모 텍스트 등 문자열을 인자로 전달하지 않는다 (대필 0 가드)
    const firstArg = onStartBody.mock.calls[0]?.[0];
    expect(typeof firstArg).not.toBe("string");
  });

  it("'이제 본문 쓰기' 버튼은 자동삽입 정규식에 걸리지 않는다 (대필 가드 호환)", () => {
    const onStartBody = vi.fn();
    render(<OutlinePanel genre="설명문" onStartBody={onStartBody} />);
    // '이제 본문 쓰기'는 /캔버스에 넣기|본문에 넣기|복사|붙여넣기/ 에 매치되지 않아야 함
    expect(screen.queryByText(/캔버스에 넣기|본문에 넣기|복사|붙여넣기/)).toBeNull();
  });
});
