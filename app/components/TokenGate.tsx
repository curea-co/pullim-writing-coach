"use client";

// Pullim Writing Coach — 데모 접근 토큰 입력 화면 (E-AUTH 401 플로우)
//
// 근거: 12_api_contract §7.1 (토큰 게이트) · EPO 결정 2026-05-26 ③ "401 전용 입력 화면 만들어"
//
// 흐름: 비공개 데모이므로 입력 폼 진입 전 데모 비밀번호를 받는다. 값은 **이 브라우저 세션에만**
//   보관(sessionStorage)하고, 채점 요청 시 `x-demo-token` 헤더로 보낸다. 비밀번호의 진위는
//   **서버가 판정**한다(클라이언트는 모름) — 틀리면 /api/score가 401 `E-AUTH`로 응답한다.
//
// 입력 화면 + 세션 보관 + "나가기" + 401 재노출(P3.2): 제출 시 서버가 401이면 ScoreForm이
//   onAuthExpired()를 호출 → 토큰 폐기 + 입력 화면 재노출 + 사유 안내.

import { useState, useSyncExternalStore } from "react";
import { cn } from "@/app/lib/utils";
import ScoreForm from "./ScoreForm";

export const DEMO_TOKEN_KEY = "pwc-demo-token"; // sessionStorage 키 — ScoreForm 제출(P3.2)과 공유

// sessionStorage를 외부 스토어로 구독 — useSyncExternalStore로 SSR 안전(서버 스냅샷 null) +
// 우리 자신의 변경(enter/leave)에도 반응. setState-in-effect 안티패턴 회피.
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

export default function TokenGate() {
  // 서버/하이드레이션 스냅샷은 null(미인증) → 입력 화면. 하이드레이션 후 실제 토큰으로 전환.
  const token = useSyncExternalStore(subscribeToken, readToken, () => null);
  const [input, setInput] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  function enter(e: React.FormEvent) {
    e.preventDefault();
    const t = input.trim();
    if (!t) return;
    writeToken(t);
    setAuthError(null);
  }

  function leave() {
    writeToken(null);
    setInput("");
  }

  if (!token) {
    return (
      <section className="border-border bg-surface rounded-xl border p-6">
        <h2 className="text-foreground text-base font-semibold">🔒 데모 접근</h2>
        <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
          이 입력 화면은 비공개 데모예요. 전달받은 <b>데모 비밀번호</b>를 입력해
          주세요.
        </p>
        <form onSubmit={enter} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="데모 비밀번호"
            autoComplete="off"
            className={cn(
              "border-border bg-background text-foreground flex-1 rounded-lg border px-3 py-2.5 text-sm",
              authError && "border-band-warn"
            )}
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className={cn(
              "bg-primary text-primary-foreground rounded-lg px-5 py-2.5 text-sm font-semibold transition hover:opacity-90",
              !input.trim() && "cursor-not-allowed opacity-40"
            )}
          >
            들어가기
          </button>
        </form>
        {authError && (
          <p className="text-band-warn-foreground mt-2 text-xs">{authError}</p>
        )}
        <p className="text-subtle-foreground mt-3 text-xs leading-relaxed">
          비밀번호는 이 브라우저 세션에만 저장되고, 채점 요청 시 서버가
          확인해요. (계약 §7.1)
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border-border text-muted-foreground flex items-center justify-between rounded-lg border px-3 py-2 text-xs">
        <span>🔓 데모 접근됨</span>
        <button
          type="button"
          onClick={leave}
          className="text-foreground hover:underline"
        >
          나가기
        </button>
      </div>
      <ScoreForm
        onAuthExpired={() => {
          // 제출 시 서버가 401(E-AUTH) → 토큰 폐기 + 입력 화면 재노출 + 사유 안내.
          writeToken(null);
          setAuthError("비밀번호가 올바르지 않아요. 다시 입력해 주세요.");
        }}
      />
    </div>
  );
}
