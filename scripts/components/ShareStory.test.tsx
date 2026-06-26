import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import ShareStory from "@/app/components/coach/ShareStory";

describe("ShareStory", () => {
  const sampleText = "📝 화산의 형성 (설명문)\n고쳐쓰기 3회 — 내 손으로 끝까지 다듬었어요.\n막힌 곳을 뚫은 영역: 내용 충실도\n🔒 코치 문장 0개 · 작성 주체 학생 본인";

  beforeEach(() => {
    // clipboard API mock
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("story 텍스트를 pre 안에 표시", () => {
    render(<ShareStory text={sampleText} />);
    const card = screen.getByTestId("share-story");
    expect(card).toBeInTheDocument();
    const pre = card.querySelector("pre");
    expect(pre).not.toBeNull();
    expect(pre?.textContent).toBe(sampleText);
  });

  it("복사 버튼 클릭 시 navigator.clipboard.writeText가 텍스트로 호출됨", async () => {
    render(<ShareStory text={sampleText} />);
    const btn = screen.getByTestId("share-copy");
    await act(async () => { fireEvent.click(btn); });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(sampleText);
  });

  it("복사 후 버튼 텍스트가 '복사됨 ✓'로 바뀜", async () => {
    render(<ShareStory text={sampleText} />);
    const btn = screen.getByTestId("share-copy");
    await act(async () => { fireEvent.click(btn); });
    expect(screen.getByTestId("share-copy")).toHaveTextContent("복사됨 ✓");
  });
});
