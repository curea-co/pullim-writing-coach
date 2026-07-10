// TokenGate 컴포넌트 테스트 (Phase 3 — 데모비번 화면 → SSO 로그인 게이트).
//   status='guest'→로그인 CTA(loginUrl 이동) · status='authed'→children/ScoreWizard · status='loading'→null.
//   로컬 데모 경로: NEXT_PUBLIC_DEMO_TOKEN 또는 stored 토큰 있으면 guest여도 폼 렌더(로컬 한정).
import { it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

// useAuth를 mock으로 주입 — AuthProvider 없이 status를 직접 제어.
let mockStatus: "loading" | "authed" | "guest" | "error" = "guest";
// refresh mock이 mockStatus를 바꾼 뒤 반환 — handleAuthExpired의 재동기화(#151 4R)를 재현하기 위함.
const mockRefresh = vi.fn(async () => mockStatus);
vi.mock("@/app/lib/use-auth", () => ({
  useAuth: () => ({ user: null, status: mockStatus, refresh: mockRefresh }),
}));

// ScoreWizard는 무거운 의존(에디터 등) — 가벼운 stub.
vi.mock("@/app/components/ScoreWizard", () => ({
  default: () => <div data-testid="score-wizard">SCORE_WIZARD</div>,
}));

// loginUrl을 mock — 클릭 시 window.location.assign(jsdom 미구현)을 spy로 가로채기 위해
//   ScoreWizard와 무관하게 이동 인자를 확인.
const assignSpy = vi.fn();
vi.mock("@/app/lib/pullim-login", () => ({
  loginUrl: () => "https://pullim.ai/login?next=x",
}));

// AUTO_TOKEN(NEXT_PUBLIC_DEMO_TOKEN)은 vitest.config의 env로 빈값 고정 — 자동 데모 입장이
//   게이트 테스트를 오염시키지 않는다.
import TokenGate from "@/app/components/TokenGate";

beforeEach(() => {
  mockStatus = "guest";
  sessionStorage.clear();
  assignSpy.mockClear();
  // jsdom window.location은 read-only — 전체를 spy 포함 객체로 교체.
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { ...window.location, assign: assignSpy, href: window.location.href },
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

it("status=guest → 로그인 CTA 렌더 (데모 토큰 없음)", async () => {
  mockStatus = "guest";
  render(<TokenGate />);
  await waitFor(() => expect(screen.getByRole("button", { name: /로그인/ })).toBeInTheDocument());
  // 데모 비밀번호 입력폼은 더 이상 기본 노출 안 함
  expect(screen.queryByLabelText("데모 비밀번호")).not.toBeInTheDocument();
});

it("status=guest + 로그인 CTA 클릭 → loginUrl로 이동", async () => {
  mockStatus = "guest";
  render(<TokenGate />);
  const btn = await screen.findByRole("button", { name: /로그인/ });
  btn.click();
  await waitFor(() => expect(assignSpy).toHaveBeenCalledWith("https://pullim.ai/login?next=x"));
});

it("status=authed → ScoreWizard 렌더 (children 없음)", async () => {
  mockStatus = "authed";
  render(<TokenGate />);
  await waitFor(() => expect(screen.getByTestId("score-wizard")).toBeInTheDocument());
  expect(screen.queryByRole("button", { name: /로그인/ })).not.toBeInTheDocument();
});

it("status=authed → children 렌더 (제공 시)", async () => {
  mockStatus = "authed";
  render(<TokenGate>{() => <div data-testid="coach-child">COACH</div>}</TokenGate>);
  await waitFor(() => expect(screen.getByTestId("coach-child")).toBeInTheDocument());
});

it("status=loading → 로그인 CTA·폼 모두 미렌더 (깜박임 방지)", () => {
  mockStatus = "loading";
  render(<TokenGate />);
  expect(screen.queryByRole("button", { name: /로그인/ })).not.toBeInTheDocument();
  expect(screen.queryByTestId("score-wizard")).not.toBeInTheDocument();
});

it("status=error → 로그인 CTA·폼 모두 미렌더 (인증서버 장애를 미로그인으로 오인 표시 안 함)", () => {
  // use-auth는 error(/me·refresh 5xx/네트워크)를 guest와 의도적으로 분리한다. 게이트가 error를
  //   게스트 CTA로 떨어뜨리면 일시적 5xx 동안 실제 로그인 사용자에게 '로그인 필요'를 오인 노출.
  mockStatus = "error";
  render(<TokenGate />);
  expect(screen.queryByRole("button", { name: /로그인/ })).not.toBeInTheDocument();
  expect(screen.queryByTestId("score-wizard")).not.toBeInTheDocument();
});

// Codex #152: 진입(entered) 후 서버 401 → onAuthExpired가 refresh() 재동기화 → 인증 서버 장애로
//   status="error"가 되는 케이스. needsReauth를 status==="guest"로 좁히지 않으면 error도 "세션 만료"
//   배너로 오인 노출된다(자식이 이미 일시 오류 UI를 띄운 위에 잘못된 재로그인 CTA가 겹쳐짐).
it("진입 후 401→refresh가 'error'로 귀결 → '세션 만료' 배너 미노출(장애를 재로그인으로 위장 안 함)", async () => {
  mockStatus = "authed";
  let capturedOnAuthExpired: (() => void) | null = null;
  const { rerender } = render(
    <TokenGate>
      {(onAuthExpired) => {
        capturedOnAuthExpired = onAuthExpired;
        return <div data-testid="coach-child">COACH</div>;
      }}
    </TokenGate>,
  );
  await waitFor(() => expect(screen.getByTestId("coach-child")).toBeInTheDocument());

  // 서버 401 발생 → 인증 서버 장애로 refresh가 "error" 귀결(재동기화).
  mockStatus = "error";
  await (async () => { capturedOnAuthExpired!(); await Promise.resolve(); })();
  rerender(
    <TokenGate>
      {(onAuthExpired) => {
        capturedOnAuthExpired = onAuthExpired;
        return <div data-testid="coach-child">COACH</div>;
      }}
    </TokenGate>,
  );

  // entered=true라 자식은 계속 렌더(글 보존)되지만, "세션이 만료됐어요" 배너는 뜨지 않아야 한다.
  expect(screen.getByTestId("coach-child")).toBeInTheDocument();
  expect(screen.queryByText(/세션이 만료됐어요/)).not.toBeInTheDocument();
});

it("로컬 데모: 저장된 토큰 있으면 guest여도 폼 렌더(로그인 CTA 아님)", async () => {
  mockStatus = "guest";
  sessionStorage.setItem("pwc-demo-token", "secret");
  render(<TokenGate />);
  await waitFor(() => expect(screen.getByTestId("score-wizard")).toBeInTheDocument());
  expect(screen.queryByRole("button", { name: /로그인/ })).not.toBeInTheDocument();
});
