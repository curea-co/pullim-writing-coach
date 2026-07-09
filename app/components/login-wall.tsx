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
import { loginUrl, signupUrl, osHubUrl } from "@/app/lib/pullim-login";
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

// 중앙 로그인 페이지(pullim.local:3001/login) UI 정합 — 스크린샷 레퍼런스(2026-07-09):
//   연회색 캔버스 위 큰 라운드(24px)의 여백 넉넉한 흰 카드(아이콘 없음), 28px/800 좌정렬 제목 +
//   muted 부제, 플랫한 큰 파란 버튼(라운드 14px), 하단 텍스트 링크("계정이 …? 회원가입" 패턴),
//   가운데 "← OS 홈으로 돌아가기".
export function LoginWall() {
  // returnTo: 로그인/가입 후 지금 보던 경로로 복귀(중앙 SSO next 파라미터).
  const returnTo = typeof window !== "undefined" ? window.location.href : undefined;
  return (
    <div data-testid="login-wall" className="grid min-h-[75vh] place-items-center p-6">
      <div className="w-full max-w-[480px] rounded-[24px] bg-white px-10 py-12 shadow-[0_8px_40px_rgba(13,26,31,.06)]">
        <h1 className="mb-3 text-[28px] font-extrabold tracking-[-0.02em] text-[var(--text-primary,#1a1f27)]">
          풀림 라이팅 코치
        </h1>
        <p className="mb-9 text-[16px] leading-relaxed text-[var(--text-secondary,#45555c)]">
          풀림 회원 전용 서비스예요.
        </p>
        {/* 회원가입 우선(QA: 회원가입 유도) — 레퍼런스의 플랫한 큰 파란 버튼 */}
        <a
          href={signupUrl(returnTo)}
          className="flex h-[54px] items-center justify-center rounded-[14px] bg-[var(--color-action-primary,#0362da)] text-[16px] font-bold text-white no-underline transition hover:brightness-105"
        >
          회원가입하고 시작하기
        </a>
        {/* 중앙 로그인 푸터 링크 패턴("계정이 없으신가요? 회원가입") 동형 — 여기선 로그인이 보조 */}
        <p className="mt-6 text-[15px] text-[var(--text-secondary,#45555c)]">
          이미 계정이 있으신가요?{" "}
          <a href={loginUrl(returnTo)} className="font-bold text-[var(--text-primary,#1a1f27)]">
            로그인
          </a>
        </p>
        <p className="mt-5 text-center text-[15px]">
          <a href={osHubUrl()} className="text-[var(--text-secondary,#45555c)] no-underline">
            ← OS 홈으로 돌아가기
          </a>
        </p>
      </div>
    </div>
  );
}

// 페이지 콘텐츠 게이트 — AppShell(AuthProvider 내부)에서 children을 감싼다.
export function MemberGate({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  // 판별 전엔 콘텐츠/벽 어느 쪽도 플래시하지 않는다(회원 전용 표면 — 게스트에게 콘텐츠 선노출 금지).
  //   빈 화면 대신 스피너로 "확인 중" 상태를 고지(Codex #142 — /me 지연 시 긴 공백 오인 방지).
  if (status === "loading")
    return (
      <div role="status" aria-label="로그인 상태 확인 중" className="flex min-h-[40vh] items-center justify-center">
        <span aria-hidden className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-[var(--color-action-primary,#0362da)] border-t-transparent" />
      </div>
    );
  if (status === "guest" && !demoBypass()) return <LoginWall />;
  // authed · error(위 주석: 장애를 벽으로 위장하지 않는다 — 헤더 '연결 오류'가 상태 고지)
  //   · guest+데모(비프로덕션 한정 — 하위 TokenGate·서버 x-demo-token 폴백이 이어받는 로컬 런북)
  return <>{children}</>;
}
