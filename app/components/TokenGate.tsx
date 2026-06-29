"use client";

// Pullim Writing Coach — 인가 게이트 (Phase 3: 데모비번 화면 → 중앙 SSO 로그인)
//
// 전환(ITEM 1): useAuth(중앙 SSO /me 소비)로 게이팅한다.
//   - status='loading' → null(깜박임 방지: SSR/하이드레이션과 동일하게 아무것도 렌더 안 함).
//   - status='authed'  → children(위저드) 또는 ScoreWizard 렌더.
//   - status='guest'   → "로그인하고 시작" CTA(loginUrl()로 이동).
//
// ★ 로컬 데모 경로 보존(로컬 한정): 로컬(pullim.local)은 access 쿠키가 host-only on api 호스트라
//   writing-coach 서버에 도달하지 않아 /me가 항상 guest다. 그래서 NEXT_PUBLIC_DEMO_TOKEN(빌드 inline)
//   자동 입장 또는 sessionStorage에 데모 토큰이 있으면 guest여도 폼을 렌더한다. AI fetch는 이 토큰을
//   x-demo-token 헤더로 보내고(useScoreForm·CoachClient·extract-client), 서버 verifyWritingAccess가
//   비prod 한정 데모 fallback으로 통과시킨다. DEMO_TOKEN_KEY export는 그 송신부가 import한다.

import { useEffect, useSyncExternalStore } from "react";
import { useAuth } from "@/app/lib/use-auth";
import { loginUrl } from "@/app/lib/pullim-login";
import ScoreWizard from "./ScoreWizard";

export const DEMO_TOKEN_KEY = "pwc-demo-token"; // sessionStorage 키 — AI fetch 송신부(x-demo-token)와 공유

// NEXT_PUBLIC_DEMO_TOKEN — 빌드 시점 inline. 설정 시 로컬 첫 진입에서 자동 입장(데모 토큰 자동 저장).
const AUTO_TOKEN = process.env.NEXT_PUBLIC_DEMO_TOKEN || "";

// sessionStorage를 외부 스토어로 구독 — useSyncExternalStore로 SSR 안전(서버 스냅샷 null) +
// 우리 자신의 변경(자동 입장)에도 반응.
const TOKEN_EVENT = "pwc-token-change";
function subscribeToken(cb: () => void) {
  window.addEventListener(TOKEN_EVENT, cb);
  return () => window.removeEventListener(TOKEN_EVENT, cb);
}
function readToken(): string | null {
  return sessionStorage.getItem(DEMO_TOKEN_KEY);
}
function writeToken(v: string | null) {
  if (v === null) sessionStorage.removeItem(DEMO_TOKEN_KEY);
  else sessionStorage.setItem(DEMO_TOKEN_KEY, v);
  window.dispatchEvent(new Event(TOKEN_EVENT));
}

export default function TokenGate({
  defaults,
  children,
}: {
  // ScoreForm 폼 필드 프리필 — TryClient가 프로필에서 주입.
  defaults?: { school_level?: string; subject?: string; genre?: string };
  // 코치 등 다른 게이티드 화면을 자식으로 받는다. 제공 시 ScoreWizard 대신 렌더.
  //   onAuthExpired는 서버 401(E-AUTH) 시 호출 — 로컬 데모 토큰 폐기용으로 보존.
  children?: (onAuthExpired: () => void) => React.ReactNode;
} = {}) {
  const { status } = useAuth();

  // 서버/하이드레이션 스냅샷은 null → 이후 실제 토큰으로 전환. 로컬 데모 토큰 존재 여부.
  const demoToken = useSyncExternalStore(subscribeToken, readToken, () => null);

  // 로컬 데모 자동 입장 — AUTO_TOKEN이 있고 저장된 토큰이 없으면 1회 자동 저장.
  useEffect(() => {
    if (!AUTO_TOKEN) return;
    if (readToken() !== null) return;
    writeToken(AUTO_TOKEN);
  }, []);

  // 서버 401(E-AUTH) 시 로컬 데모 토큰 폐기 — children/ScoreWizard가 호출. (로컬 한정 잔존)
  function handleAuthExpired() {
    writeToken(null);
  }

  // 인가 판정: 중앙 SSO authed 이거나, 로컬 데모 토큰 보유(로컬 한정 폼 진입).
  const allowed = status === "authed" || demoToken !== null;

  if (allowed) {
    return (
      <div className="space-y-4">
        {children ? (
          children(handleAuthExpired)
        ) : (
          <ScoreWizard defaults={defaults} onAuthExpired={handleAuthExpired} />
        )}
      </div>
    );
  }

  // 로딩 중(또는 /me 장애 상태에서 토큰 없음) — 깜박임 방지 위해 CTA/폼 모두 렌더 안 함.
  if (status === "loading") return null;

  // 게스트 — 중앙 SSO 로그인 CTA.
  return (
    <section className="border-border bg-surface rounded-2xl border p-6 shadow-sm">
      <h2 className="text-foreground text-base font-semibold">🔒 로그인이 필요해요</h2>
      <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
        풀림 라이팅 코치는 풀림 계정으로 이용할 수 있어요. 로그인하고 글쓰기를
        시작해 주세요.
      </p>
      <button
        type="button"
        onClick={() => window.location.assign(loginUrl())}
        className="bg-primary text-primary-foreground mt-4 rounded-lg px-5 py-2.5 text-sm font-semibold transition hover:opacity-90"
      >
        로그인하고 시작
      </button>
    </section>
  );
}
