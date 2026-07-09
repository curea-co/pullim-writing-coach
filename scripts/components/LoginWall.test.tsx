// LoginWall/MemberGate 단위 테스트 — QA WRITING-ACCESS-001(게스트 진입 차단) 계약.
//   벽은 자체 UI가 아니라 중앙 로그인(`${WEB}/login?next=…`)으로 리다이렉트한다(2026-07-09 소유자 결정).
// 실행: npm run test:components

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

// useAuth 상태를 케이스별로 주입 — 게이트 분기(guest 리다이렉트 / authed 콘텐츠 / error 콘텐츠 / loading 스피너) 검증.
const auth = { status: "guest" as string };
vi.mock("@/app/lib/use-auth", () => ({ useAuth: () => auth }));

import { LoginWall, MemberGate } from "@/app/components/login-wall";

// jsdom은 실제 내비게이션 미지원 — location.replace를 스텁해 호출 인자(리다이렉트 목적지)만 검증.
const replaceSpy = vi.fn();
beforeEach(() => {
  replaceSpy.mockClear();
  const orig = window.location;
  Object.defineProperty(window, "location", {
    value: { ...orig, href: "http://writing.pullim.local:3008/coach", origin: "http://writing.pullim.local:3008", replace: replaceSpy },
    writable: true,
    configurable: true,
  });
});

describe("LoginWall", () => {
  it("중앙 로그인으로 리다이렉트(next=현재 주소) + 이동 중 스피너", () => {
    render(<LoginWall />);
    expect(screen.getByTestId("login-wall")).toBeInTheDocument();
    expect(screen.getByRole("status", { name: "로그인 페이지로 이동 중" })).toBeInTheDocument();
    expect(replaceSpy).toHaveBeenCalledOnce();
    const dest = replaceSpy.mock.calls[0][0] as string;
    expect(dest).toContain("/login?next=");
    expect(dest).toContain(encodeURIComponent("http://writing.pullim.local:3008/coach"));
  });
});

describe("MemberGate", () => {
  it("guest: 콘텐츠 대신 중앙 로그인 리다이렉트 (게스트 사용 불가)", () => {
    auth.status = "guest";
    render(<MemberGate><div data-testid="page">content</div></MemberGate>);
    expect(screen.getByTestId("login-wall")).toBeInTheDocument();
    expect(screen.queryByTestId("page")).not.toBeInTheDocument();
    expect(replaceSpy).toHaveBeenCalledOnce();
  });

  it("authed: 콘텐츠 렌더, 리다이렉트 없음", () => {
    auth.status = "authed";
    render(<MemberGate><div data-testid="page">content</div></MemberGate>);
    expect(screen.getByTestId("page")).toBeInTheDocument();
    expect(replaceSpy).not.toHaveBeenCalled();
  });

  it("error: 리다이렉트 대신 콘텐츠 — 장애를 '로그인하세요'로 위장하지 않는다", () => {
    auth.status = "error";
    render(<MemberGate><div data-testid="page">content</div></MemberGate>);
    expect(screen.getByTestId("page")).toBeInTheDocument();
    expect(replaceSpy).not.toHaveBeenCalled();
  });

  it("loading: 콘텐츠 없이 스피너(플래시 방지), 리다이렉트 없음", () => {
    auth.status = "loading";
    render(<MemberGate><div data-testid="page">content</div></MemberGate>);
    expect(screen.getByRole("status", { name: "로그인 상태 확인 중" })).toBeInTheDocument();
    expect(screen.queryByTestId("page")).not.toBeInTheDocument();
    expect(replaceSpy).not.toHaveBeenCalled();
  });

  // Codex #142 — 비프로덕션 데모 예외: 로컬 데모 토큰이 있으면 guest여도 차단하지 않는다
  //   (하위 TokenGate·서버 x-demo-token 폴백 런북 보존). NODE_ENV=test ≠ production 경로.
  it("guest + 데모 토큰(비프로덕션): 리다이렉트 없이 콘텐츠 — 로컬 데모 런북 보존", () => {
    auth.status = "guest";
    window.sessionStorage.setItem("pwc-demo-token", "local-demo");
    try {
      render(<MemberGate><div data-testid="page">content</div></MemberGate>);
      expect(screen.getByTestId("page")).toBeInTheDocument();
      expect(replaceSpy).not.toHaveBeenCalled();
    } finally {
      window.sessionStorage.removeItem("pwc-demo-token");
    }
  });
});
