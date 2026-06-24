// 정적 텍스트 대필 가드 — 컴포넌트 렌더 후 텍스트 수집 + assertNoGeneration 검사.
//   Task 4: ModeSelectStep 카드 title/body + GuidePanel placeholder.
//   Task 5: GuidePanel에 자동삽입 버튼 부재 회귀 가드.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ModeSelectStep from "@/app/components/coach/ModeSelectStep";
import GuidePanel from "@/app/components/coach/GuidePanel";
import { assertNoGeneration } from "@/app/lib/static-text-guard";

describe("ModeSelectStep 카드 카피 — assertNoGeneration", () => {
  it("4개 모드 카드의 렌더된 텍스트가 대필 신호 없음", () => {
    render(<ModeSelectStep onSelect={() => {}} onBack={() => {}} />);

    // 하드코딩 금지: 실제 렌더된 각 카드 노드의 텍스트(title+body+배지)를 DOM에서 수집한다.
    //   카피가 나중에 대필성 문구로 바뀌면 이 가드가 자동으로 잡도록(회귀 가드 실효성).
    const modes = ["free", "guide", "outline", "voice"] as const;
    const cardTexts = modes.map((m) => screen.getByTestId(`mode-${m}`).textContent ?? "");

    // 각 카드에 텍스트가 실제로 렌더됐는지(빈 노드 아님) 확인
    for (const text of cardTexts) {
      expect(text.trim().length).toBeGreaterThan(0);
    }

    // 대필 가드 — 실제 렌더된 카드 텍스트
    assertNoGeneration(cardTexts, "ModeSelectStep 카드 전체(DOM)");
  });
});

describe("GuidePanel placeholder — assertNoGeneration", () => {
  it("textarea placeholder가 대필 신호 없음", () => {
    render(<GuidePanel genre="설명문" />);
    const placeholders = screen.getAllByPlaceholderText(/네 생각을 한 줄로/).map(
      (el) => (el as HTMLTextAreaElement).placeholder
    );
    expect(placeholders.length).toBeGreaterThan(0);
    assertNoGeneration(placeholders, "GuidePanel placeholder");
  });

  it("자동삽입 버튼(캔버스에 넣기|본문에 넣기|복사|붙여넣기)이 DOM에 없음 (대필 가드)", () => {
    render(<GuidePanel genre="설명문" />);
    expect(screen.queryByText(/캔버스에 넣기|본문에 넣기|복사|붙여넣기/)).toBeNull();
  });
});
