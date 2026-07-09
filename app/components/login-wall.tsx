"use client";

// 로그인 벽 — QA WRITING-ACCESS-001: 게스트 진입 차단(회원가입 유도). 라이팅 코치는 회원 전용
//   (미리보기 무료/첨삭 유료 — 체험도 회원 writing:1 기준). 자체 벽 UI를 렌더하지 않고 **게스트를
//   중앙 로그인 페이지(`${WEB}/login?next=<현재 주소>`)로 즉시 리다이렉트**한다(2026-07-09 소유자
//   결정) — UI 통일이 완벽하고(중앙 페이지 자체 사용: 로그인 폼 + "계정이 없으신가요? 회원가입" 유도)
//   벽 화면을 별도 유지할 비용이 없다. 로그인 후 next 복귀는 pullim-web이 처리. 로그아웃 후 홈 복귀
//   시에도 status=guest → 재리다이렉트(QA 요구).
//
// 게이트 분기(MemberGate — DashboardShell 바깥, 게스트에겐 헤더·레일·탭바 미노출):
//   guest → 중앙 로그인으로 리다이렉트(이동 중 스피너). authed → 콘텐츠. loading → 스피너.
//   error(인증 서버 연결 실패·env 미설정) → 콘텐츠 — 회원 여부를 판별할 수 없는 상태에서 로그인으로
//   보내면 장애가 "로그인하세요"로 위장된다(헤더가 이미 '연결 오류'를 노출). CI E2E(API env 미설정 =
//   error 경로)도 이 경로.

import { useEffect } from "react";
import { useAuth } from "@/app/lib/use-auth";
import { loginUrl } from "@/app/lib/pullim-login";
import { DEMO_TOKEN_KEY } from "@/app/components/TokenGate";

// 비프로덕션 데모 예외(Codex #142) — TokenGate가 보존하는 로컬 데모 경로(sessionStorage 토큰 또는
//   NEXT_PUBLIC_DEMO_TOKEN)를 벽이 죽이지 않게 한다. 경계는 서버(pullim-session demoTokenAuthorized)와
//   동일하게 NODE_ENV !== "production" — prod 번들에선 상수 false로 죽은 코드(데모 구멍 0).
function demoBypass(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.NEXT_PUBLIC_DEMO_TOKEN) return true;
  if (typeof window === "undefined") return false;
  try {
    return !!window.sessionStorage.getItem(DEMO_TOKEN_KEY);
  } catch {
    return false;
  }
}

// 전체 화면 스피너 — 판별 중/리다이렉트 중 공통(중앙 /login 캔버스 --pullim-paper 정합).
function FullScreenSpinner({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="grid min-h-[100dvh] place-items-center bg-[#f0f6fb]">
      <span aria-hidden className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[#0362da] border-t-transparent" />
    </div>
  );
}

// 게스트 → 중앙 로그인 리다이렉트. replace(히스토리 대체) — 뒤로가기로 빈 벽에 갇히지 않게.
export function LoginWall() {
  useEffect(() => {
    try {
      window.location.replace(loginUrl(window.location.href));
    } catch {
      /* jsdom 등 내비게이션 미지원 환경 — 스피너 유지 */
    }
  }, []);
  return (
    <div data-testid="login-wall">
      <FullScreenSpinner label="로그인 페이지로 이동 중" />
    </div>
  );
}

// 페이지 콘텐츠 게이트 — AppShell(AuthProvider 내부)에서 DashboardShell 전체를 감싼다.
export function MemberGate({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  // 판별 전엔 콘텐츠를 플래시하지 않는다(회원 전용 표면 — 게스트에게 콘텐츠 선노출 금지).
  if (status === "loading") return <FullScreenSpinner label="로그인 상태 확인 중" />;
  if (status === "guest" && !demoBypass()) return <LoginWall />;
  // authed · error(상단 주석: 장애를 로그인 유도로 위장하지 않는다 — 헤더 '연결 오류'가 상태 고지)
  //   · guest+데모(비프로덕션 한정 — 하위 TokenGate·서버 x-demo-token 폴백이 이어받는 로컬 런북)
  return <>{children}</>;
}
