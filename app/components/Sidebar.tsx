"use client";

// Pullim Writing Coach — 좌측 내비게이션 (반응형)
//   데스크톱(md+): 좌측 고정 사이드바 · 모바일(<md): 상단바 + 햄버거 드로어.
//   wireframe §0 "모바일 우선·세로 1방향"을 지키려고 모바일은 단일 컬럼 흐름을 깨지 않는 드로어로 접는다.
//   2026-06-02: '샘플 채점 결과' 헤더를 /samples 인덱스 진입점으로 만들고 A~E 개별 항목은
//   드로어 안에서 숨김 — sidebar는 IA 진입점, 카드 선택은 /samples에서.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/app/lib/utils";
import ThemeToggle from "./ThemeToggle";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const itemCls = (active: boolean) =>
    cn(
      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
      active
        ? "bg-muted text-foreground font-semibold"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    );
  const samplesActive = pathname === "/samples" || pathname.startsWith("/samples/");

  return (
    <nav className="flex flex-col gap-0.5">
      <div className="text-subtle-foreground mt-1 mb-1 px-3 text-[11px] font-semibold">
        둘러보기
      </div>
      <Link href="/" onClick={onNavigate} className={itemCls(pathname === "/")}>
        홈
      </Link>
      <Link
        href="/try"
        onClick={onNavigate}
        className={itemCls(pathname === "/try")}
      >
        직접 채점받기
        <span className="bg-accent-mid-surface text-accent-mid ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
          실시간
        </span>
      </Link>
      <Link
        href="/coach"
        onClick={onNavigate}
        className={itemCls(pathname === "/coach")}
      >
        과정 코치
        <span className="bg-accent-mid-surface text-accent-mid ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
          베타
        </span>
      </Link>
      {/* 2026-05-31 #11 채점 결과 조회 — 직접 채점받기 바로 아래(짝지어 노출) */}
      <Link
        href="/results"
        onClick={onNavigate}
        className={itemCls(pathname === "/results" || pathname.startsWith("/results/"))}
      >
        채점 결과 조회
      </Link>
      {/* 2026-06-02 '샘플 채점 결과' — 클릭 시 /samples 인덱스로. A~E 개별 항목 노출 X. */}
      <Link
        href="/samples"
        onClick={onNavigate}
        className={itemCls(samplesActive)}
      >
        샘플 채점 결과
      </Link>
      {/* 2026-05-29 LNB 확장 — 내 정보·서비스 소개 (둘러보기 섹션 끝에 추가) */}
      <Link href="/me" onClick={onNavigate} className={itemCls(pathname === "/me")}>
        내 정보
      </Link>
      <Link
        href="/about"
        onClick={onNavigate}
        className={itemCls(pathname === "/about")}
      >
        서비스 소개
      </Link>
    </nav>
  );
}

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      {/* 데스크톱: 좌측 고정 사이드바 */}
      <aside className="border-border bg-surface hidden w-60 shrink-0 border-r md:sticky md:top-0 md:flex md:h-screen md:flex-col">
        <Link
          href="/"
          className="border-border text-foreground block border-b px-4 py-4 text-sm font-bold tracking-tight"
        >
          Pullim Writing Coach
          <span className="text-muted-foreground ml-1.5 text-xs font-medium">
            데모
          </span>
        </Link>
        <div className="flex-1 overflow-y-auto p-3">
          <NavLinks />
        </div>
        <div className="border-border space-y-2 border-t px-3 py-3">
          <ThemeToggle />
          <p className="text-subtle-foreground text-[10px] leading-relaxed">
            ※ AI 자동 채점 — 교사의 실제 채점과 다를 수 있어요.
          </p>
        </div>
      </aside>

      {/* 모바일: 상단바 (햄버거) */}
      <div className="border-border bg-surface sticky top-0 z-30 flex items-center gap-3 border-b px-4 py-3 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="메뉴 열기"
          className="text-foreground hover:bg-muted -ml-1 rounded-lg p-1.5"
        >
          {/* 햄버거 아이콘 */}
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
            <path
              d="M3 5h14M3 10h14M3 15h14"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <Link href="/" className="text-foreground text-sm font-bold tracking-tight">
          Pullim Writing Coach
        </Link>
      </div>

      {/* 모바일: 드로어 (열림 시) */}
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="bg-foreground/30 absolute inset-0"
            onClick={close}
            aria-hidden
          />
          <aside className="bg-surface border-border absolute top-0 left-0 flex h-full w-64 flex-col border-r p-3 shadow-xl">
            <div className="mb-3 flex items-center justify-between px-1">
              <span className="text-foreground text-sm font-bold tracking-tight">
                Pullim Writing Coach
              </span>
              <button
                type="button"
                onClick={close}
                aria-label="메뉴 닫기"
                className="text-muted-foreground hover:bg-muted hover:text-foreground rounded-lg p-1.5"
              >
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <path
                    d="M5 5l10 10M15 5L5 15"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NavLinks onNavigate={close} />
            </div>
            {/* Codex PR #62: 모바일 드로어에도 ThemeToggle — 데스크톱과 동일 노출.
                OS 기본값 의존 회피 + 모바일 사용자가 수동 전환 가능. */}
            <div className="border-border mt-3 space-y-2 border-t pt-3">
              <ThemeToggle />
              <p className="text-subtle-foreground px-1 text-[10px] leading-relaxed">
                ※ AI 자동 채점 — 교사의 실제 채점과 다를 수 있어요.
              </p>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
