"use client";
// 다크/라이트 토글 — localStorage 저장, FOUC 없는 동작.
//   초기 테마는 layout.tsx의 inline script가 HTML 렌더 직전에 적용(SSR mismatch + 깜빡임 회피).
//   여기서는 mount 후 현재 dataset.theme 값 읽어 버튼 상태에 반영, 클릭 시 토글.
//   pullim.ai 톤 참고 — 다크는 navy, 라이트는 기존 유지.

import { useEffect, useState } from "react";

const THEME_KEY = "pwc_theme_v1";
type Theme = "light" | "dark";

function readTheme(): Theme {
  if (typeof document === "undefined") return "light";
  const t = document.documentElement.dataset.theme;
  return t === "dark" ? "dark" : "light";
}

export default function ThemeToggle() {
  // SSR 일관성 위해 mount 전에는 null — 버튼 자체를 렌더하지 않음(깜빡임 방지).
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(readTheme());
  }, []);

  const toggle = () => {
    if (!theme) return;
    const next: Theme = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    setTheme(next);
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      /* 시크릿 모드 등 — UI 동작은 유지, 저장만 실패 */
    }
  };

  if (theme === null) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "light" ? "다크 모드로 전환" : "라이트 모드로 전환"}
      title={theme === "light" ? "다크 모드로 전환" : "라이트 모드로 전환"}
      className="border-border text-muted-foreground hover:text-foreground hover:bg-muted inline-flex h-8 w-full items-center justify-center gap-2 rounded-lg border text-xs font-medium transition"
    >
      {theme === "light" ? (
        <>
          <MoonIcon /> 다크 모드
        </>
      ) : (
        <>
          <SunIcon /> 라이트 모드
        </>
      )}
    </button>
  );
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M16.5 12.5A6.5 6.5 0 1 1 7.5 3.5a5.5 5.5 0 0 0 9 9z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden>
      <circle cx="10" cy="10" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 2v2M10 16v2M2 10h2M16 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
