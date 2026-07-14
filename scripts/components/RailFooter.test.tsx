// RailFooter 컴포넌트 테스트 — 레일(사이드바) 하단 고정 문의 카드 (pullim-web PR #140·#141 이식).
//
// 검증 대상: 사용자가 어느 화면에서든 문의 경로를 찾을 수 있게 support@curea.co mailto를
//   상시 노출한다. 펼침(기본) = 카드형("문의하기" 라벨 + 이메일, 전체가 mailto 링크),
//   접힘(레일 68px 아이콘 모드) = 같은 mailto의 아이콘 버튼으로 축소.
//
// 실행: npm run test:components  (vitest + jsdom + RTL).

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import RailFooter from "@/app/components/rail-footer";
import { RailCollapseProvider } from "@/components/ui/rail-collapse-context";

const MAILTO = "mailto:support@curea.co";

describe("RailFooter", () => {
  it("펼침: 카드 전체가 mailto 링크 — '문의하기' 라벨과 이메일 텍스트 노출", () => {
    render(
      <RailCollapseProvider collapsed={false}>
        <RailFooter />
      </RailCollapseProvider>,
    );
    const link = screen.getByRole("link", { name: /문의하기/ });
    expect(link).toHaveAttribute("href", MAILTO);
    expect(link).toHaveTextContent("support@curea.co");
  });

  it("접힘: 아이콘 전용 mailto 링크로 축소 — 이메일 텍스트 대신 접근성 라벨로 제공", () => {
    render(
      <RailCollapseProvider collapsed={true}>
        <RailFooter />
      </RailCollapseProvider>,
    );
    const link = screen.getByRole("link", { name: /문의하기 — support@curea\.co/ });
    expect(link).toHaveAttribute("href", MAILTO);
    // 아이콘 모드 — 본문 텍스트로는 이메일을 렌더하지 않는다(툴팁·aria-label로만).
    expect(link).not.toHaveTextContent("support@curea.co");
  });
});
