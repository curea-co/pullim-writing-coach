"use client";

// 공통 상단 헤더의 OS-SSO 인증 컨트롤. DashboardShell `actions` 슬롯에 배치.
// 게스트 → 로그인 버튼(OS 중앙 로그인으로 이동) · 인증 → 로그아웃 · writing 미보유 → 이용권 안내.

import { useAuth } from "@/app/lib/auth/auth-context";

export function SsoAuthButton() {
  const { status, loginRedirect, logout } = useAuth();

  if (status === "loading") {
    return (
      <span className="text-muted-foreground text-sm" aria-busy="true">
        …
      </span>
    );
  }

  if (status === "authenticated") {
    return (
      <button
        type="button"
        onClick={() => void logout()}
        className="border-border text-foreground hover:bg-muted rounded-md border px-3 py-1.5 text-sm font-medium transition"
      >
        로그아웃
      </button>
    );
  }

  if (status === "entitlement-missing") {
    return (
      <span className="bg-muted text-subtle-foreground rounded-full px-3 py-1 text-xs font-semibold">
        라이팅코치 이용권 필요
      </span>
    );
  }

  if (status === "session-error") {
    // 게스트 확정 아님 — 로그인 강제하지 않고 조용히 둔다.
    return null;
  }

  // unauthenticated (게스트)
  return (
    <button
      type="button"
      onClick={loginRedirect}
      className="bg-primary text-primary-foreground hover:opacity-90 rounded-md px-3 py-1.5 text-sm font-semibold transition"
    >
      로그인
    </button>
  );
}
