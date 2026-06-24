// 정적 텍스트 대필 가드 — 컴포넌트 렌더 후 텍스트 수집 + assertNoGeneration 검사.
//   Task 4: ModeSelectStep 카드 title/body + GuidePanel placeholder.
//   Task 5: GuidePanel에 자동삽입 버튼 부재 회귀 가드.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ModeSelectStep from "@/app/components/coach/ModeSelectStep";
import GuidePanel from "@/app/components/coach/GuidePanel";
import { assertNoGeneration } from "@/app/lib/static-text-guard";

describe("ModeSelectStep 카드 카피 — assertNoGeneration", () => {
  it("모드 카드 전체의 렌더된 텍스트가 대필 신호 없음", () => {
    const { container } = render(<ModeSelectStep onSelect={() => {}} onBack={() => {}} />);

    // 하드코딩 금지: data-testid="mode-*" 카드를 DOM에서 동적으로 전부 수집한다.
    //   모드 ID를 고정 나열하면 새 카드가 추가돼도 검사 누락 → 회귀 가드가 무력. 접두 셀렉터로 전체 포착.
    const cards = Array.from(container.querySelectorAll('[data-testid^="mode-"]'));
    const cardTexts = cards.map((c) => c.textContent ?? "");

    // 현재 4개 모드(자유/가이드/개요/말하기) 이상이 렌더되고 각 카드에 텍스트가 있는지 확인
    expect(cards.length).toBeGreaterThanOrEqual(4);
    for (const text of cardTexts) {
      expect(text.trim().length).toBeGreaterThan(0);
    }

    // 대필 가드 — 실제 렌더된 카드 텍스트 전체
    assertNoGeneration(cardTexts, "ModeSelectStep 카드 전체(DOM)");
  });
});

describe("GuidePanel placeholder — assertNoGeneration", () => {
  it("모든 메모 textarea placeholder가 대필 신호 없음", () => {
    render(<GuidePanel genre="설명문" />);
    // 현재 안전 문구로 필터링하지 않는다: 모든 textarea의 placeholder를 수집해야
    //   일부 카드 placeholder만 대필성 문구로 바뀌어도 가드가 잡는다(회귀 가드 실효).
    const placeholders = screen
      .getAllByRole("textbox")
      .map((el) => (el as HTMLTextAreaElement).placeholder)
      .filter((p) => p.trim().length > 0);
    expect(placeholders.length).toBeGreaterThan(0);
    assertNoGeneration(placeholders, "GuidePanel placeholder");
  });

  it("자동삽입 버튼(캔버스에 넣기|본문에 넣기|복사|붙여넣기)이 DOM에 없음 (대필 가드)", () => {
    render(<GuidePanel genre="설명문" />);
    expect(screen.queryByText(/캔버스에 넣기|본문에 넣기|복사|붙여넣기/)).toBeNull();
  });
});
