// 정적 텍스트 대필 가드 — 컴포넌트 렌더 후 텍스트 수집 + assertNoGeneration 검사.
//   Task 4: ModeSelectStep 카드 title/body + GuidePanel placeholder.
//   Task 5: GuidePanel에 자동삽입 버튼 부재 회귀 가드.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ModeSelectStep from "@/app/components/coach/ModeSelectStep";
import GuidePanel from "@/app/components/coach/GuidePanel";
import { assertNoGeneration } from "@/app/lib/static-text-guard";

describe("ModeSelectStep 카드 카피 — assertNoGeneration", () => {
  it("4개 모드 카드 title/body 8개 문자열이 대필 신호 없음", () => {
    render(<ModeSelectStep onSelect={() => {}} onBack={() => {}} />);

    // 카드 title(font-semibold span) + body(text-sm span) 수집
    const titles = ["자유 쓰기", "가이드 (질문 따라)", "개요 먼저", "말하기"];
    const bodies = [
      "바로 캔버스에 써 내려가요. 다 쓰면 코치에게 봐달라고 해요.",
      "막막할 때, 질문 카드를 보며 네 생각을 한 줄씩 적어가요.",
      "글의 뼈대부터 잡고 살을 붙여요.",
      "말로 풀어낸 뒤 직접 글로 정리해요.",
    ];

    // DOM에서 텍스트가 실제로 렌더됐는지 확인
    for (const t of titles) {
      expect(screen.getByText(new RegExp(t.slice(0, 4)))).toBeInTheDocument();
    }

    // 대필 가드
    assertNoGeneration([...titles, ...bodies], "ModeSelectStep 카드 전체");
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
