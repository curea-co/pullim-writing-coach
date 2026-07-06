"use client";

// writing-coach OS-SSO 인증 컨텍스트.
//
// pullim-planner `lib/auth/auth-context.tsx` 패턴 이식(간소화 — planner 온보딩/프로필 로직 제외).
// 마운트 시 `GET /me/entitlements`로 세션 복원 → 게스트/인증/이용권미보유 판정. 로그인은 OS(os.pullim.local)
// 진입으로 위임(중앙 로그인 SoT: os.pullim.ai/login?next=). 자체 데모 토큰(TokenGate)과 별개의 신원 레이어.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { ApiError } from "./pullim-http";
import { hasWritingEntitlement, pullimSession } from "./pullim-session";

export type AuthStatus =
  | "loading" // 세션 복원 중
  | "authenticated" // 인증 + writing 보유
  | "entitlement-missing" // 인증O, writing flag X → /login 금지, 이용권 안내
  | "unauthenticated" // 401 = 게스트(미로그인)
  | "session-error"; // transport/5xx — 비로그인 확정 아님(로그인 강제 금지)

export interface AuthContextValue {
  status: AuthStatus;
  /** OS 중앙 로그인으로 이동(현재 URL을 ?next=로 복귀). */
  loginRedirect: () => void;
  /** 세션 종료 후 상태 갱신. */
  logout: () => Promise<void>;
  /** 세션 재확인(예: 포커스 복귀). */
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// 로컬 dev 전용 — SSO 게이트 우회(.env.local: NEXT_PUBLIC_DEV_AUTH_BYPASS=1).
const DEV_AUTH_BYPASS = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === "1";

const OS_URL = process.env.NEXT_PUBLIC_OS_URL ?? "http://os.pullim.local:3001";

/** 401 = 미인증(게스트) 판정 — ApiError(statusCode 401). */
function isUnauthenticated(error: unknown): boolean {
  return error instanceof ApiError && error.statusCode === 401;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(
    DEV_AUTH_BYPASS ? "authenticated" : "loading",
  );

  const refresh = useCallback(async () => {
    if (DEV_AUTH_BYPASS) {
      setStatus("authenticated");
      return;
    }
    try {
      const { flags } = await pullimSession.entitlements();
      setStatus(
        hasWritingEntitlement(flags) ? "authenticated" : "entitlement-missing",
      );
    } catch (error) {
      if (isUnauthenticated(error)) {
        setStatus("unauthenticated");
      } else {
        // 네트워크/5xx — 게스트 확정 아님(로그인으로 튕기지 않음).
        setStatus("session-error");
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loginRedirect = useCallback(() => {
    if (typeof window === "undefined") return;
    const next = encodeURIComponent(window.location.href);
    window.location.href = `${OS_URL}/login?next=${next}`;
  }, []);

  const logout = useCallback(async () => {
    if (DEV_AUTH_BYPASS) {
      setStatus("unauthenticated");
      return;
    }
    try {
      await pullimSession.logout();
    } finally {
      // BE 성패 무관하게 FE 상태는 항상 미인증으로.
      setStatus("unauthenticated");
    }
  }, []);

  return (
    <AuthContext.Provider value={{ status, loginRedirect, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
