// LoginWall/MemberGate 단위 테스트 — QA WRITING-ACCESS-001(게스트 진입 차단) 계약.
// 실행: npm run test:components

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// useAuth 상태를 케이스별로 주입 — 게이트 분기(guest 벽 / authed 콘텐츠 / error 콘텐츠 / loading null) 검증.
const auth = { status: "guest" as string };
vi.mock("@/app/lib/use-auth", () => ({ useAuth: () => auth }));

import { LoginWall, MemberGate } from "@/app/components/login-wall";

describe("LoginWall", () => {
  it("회원가입(우선)·로그인 링크를 노출한다", () => {
    render(<LoginWall />);
    expect(screen.getByTestId("login-wall")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /회원가입하고 시작하기/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /로그인/ })).toBeInTheDocument();
  });
});

describe("MemberGate", () => {
  it("guest: 콘텐츠 대신 로그인 벽 (게스트 사용 불가)", () => {
    auth.status = "guest";
    render(<MemberGate><div data-testid="page">content</div></MemberGate>);
    expect(screen.getByTestId("login-wall")).toBeInTheDocument();
    expect(screen.queryByTestId("page")).not.toBeInTheDocument();
  });

  it("authed: 콘텐츠 렌더", () => {
    auth.status = "authed";
    render(<MemberGate><div data-testid="page">content</div></MemberGate>);
    expect(screen.getByTestId("page")).toBeInTheDocument();
    expect(screen.queryByTestId("login-wall")).not.toBeInTheDocument();
  });

  it("error: 벽 대신 콘텐츠 — 장애를 '가입하세요'로 위장하지 않는다", () => {
    auth.status = "error";
    render(<MemberGate><div data-testid="page">content</div></MemberGate>);
    expect(screen.getByTestId("page")).toBeInTheDocument();
    expect(screen.queryByTestId("login-wall")).not.toBeInTheDocument();
  });

  it("loading: 아무것도 렌더하지 않음(플래시 방지)", () => {
    auth.status = "loading";
    const { container } = render(<MemberGate><div data-testid="page">content</div></MemberGate>);
    expect(container.firstChild).toBeNull();
  });

  // Codex #142 — 비프로덕션 데모 예외: 로컬 데모 토큰이 있으면 guest여도 벽을 세우지 않는다
  //   (하위 TokenGate·서버 x-demo-token 폴백 런북 보존). NODE_ENV=test ≠ production 경로.
  it("guest + 데모 토큰(비프로덕션): 벽 대신 콘텐츠 — 로컬 데모 런북 보존", () => {
    auth.status = "guest";
    window.sessionStorage.setItem("pwc-demo-token", "local-demo");
    try {
      render(<MemberGate><div data-testid="page">content</div></MemberGate>);
      expect(screen.getByTestId("page")).toBeInTheDocument();
      expect(screen.queryByTestId("login-wall")).not.toBeInTheDocument();
    } finally {
      window.sessionStorage.removeItem("pwc-demo-token");
    }
  });
});
