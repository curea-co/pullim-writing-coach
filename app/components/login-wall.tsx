"use client";

// 로그인 벽 — QA WRITING-ACCESS-001: 게스트 진입 차단(회원가입 유도). 라이팅 코치는 회원 전용
//   (미리보기 무료/첨삭 유료 — 체험도 회원 writing:1 기준). 비로그인이면 페이지 콘텐츠 대신 이 벽을
//   렌더한다. 로그아웃 후 홈 복귀 시에도 status=guest → 벽 재노출(QA 요구).
//
// 게이트 기준(MemberGate):
//   guest → 벽. authed → 콘텐츠. loading → null(플래시 방지).
//   error(인증 서버 연결 실패·env 미설정) → 콘텐츠 — 회원 여부를 판별할 수 없는 상태에서 벽을 세우면
//   장애가 "가입하세요"로 위장된다(헤더가 이미 '연결 오류'를 노출). CI E2E(API env 미설정)도 이 경로.

import { useAuth } from "@/app/lib/use-auth";
import { loginUrl, signupUrl } from "@/app/lib/pullim-login";
import { ServiceIcon } from "@/components/ui/service-icon";

export function LoginWall() {
  // returnTo: 로그인 후 지금 보던 경로로 복귀(중앙 SSO next 파라미터).
  const returnTo = typeof window !== "undefined" ? window.location.href : undefined;
  return (
    <div data-testid="login-wall" className="flex min-h-[60vh] items-center justify-center px-5 py-16">
      <div className="w-full max-w-[420px] text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center">
          <ServiceIcon name="writing" size={64} />
        </div>
        <h1 className="text-[22px] font-extrabold tracking-[-0.02em] text-[var(--text-primary,#1a1f27)]">
          풀림 라이팅 코치
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--text-secondary,#45555c)]">
          라이팅 코치는 풀림 회원 전용 서비스예요.
          <br />
          가입하고 AI 글쓰기 코칭을 시작해 보세요.
        </p>
        <div className="mt-7 flex flex-col gap-2.5">
          {/* 회원가입 우선(QA: 회원가입 유도) — 로그인은 보조 */}
          <a
            href={signupUrl(returnTo)}
            className="flex h-12 items-center justify-center rounded-[12px] bg-[var(--color-action-primary,#0362da)] text-[15px] font-bold text-white no-underline transition hover:opacity-90"
          >
            회원가입하고 시작하기
          </a>
          <a
            href={loginUrl(returnTo)}
            className="flex h-12 items-center justify-center rounded-[12px] border border-[var(--line,#e6eaf0)] bg-white text-[15px] font-semibold text-[var(--text-primary,#1a1f27)] no-underline transition hover:bg-[var(--surface-sunken,#eef1f6)]"
          >
            이미 회원이에요 — 로그인
          </a>
        </div>
      </div>
    </div>
  );
}

// 페이지 콘텐츠 게이트 — AppShell(AuthProvider 내부)에서 children을 감싼다.
export function MemberGate({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  if (status === "loading") return null; // 판별 전 콘텐츠/벽 플래시 방지
  if (status === "guest") return <LoginWall />;
  // authed · error(위 주석: 장애를 벽으로 위장하지 않는다 — 헤더 '연결 오류'가 상태 고지)
  return <>{children}</>;
}
