"use client";

// Pullim Writing Coach — 좌측 내비게이션 (반응형)
//   데스크톱(md+): 좌측 고정 사이드바 · 모바일(<md): 상단바 + 햄버거 드로어.
//   wireframe §0 "모바일 우선·세로 1방향"을 지키려고 모바일은 단일 컬럼 흐름을 깨지 않는 드로어로 접는다.
//   샘플 목록은 data/samples.ts 단일 소스로 렌더, 현재 경로를 활성 표시.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/app/lib/utils";

// 사이드바는 라벨/카테고리/총점만 필요하다. 전체 SAMPLES(본문·피드백)를 client 번들로
// 끌어오지 않도록, 서버 레이아웃에서 경량 메타데이터만 props로 받는다(curea-review-ai 지적).
export type NavSample = {
  id: string;
  label: string;
  category: string;
  total: number;
};

// 카테고리 점 색 — page.tsx 칩과 같은 시맨틱 밴드/액센트 토큰
const CATEGORY_DOT: Record<string, string> = {
  저점: "bg-band-warn",
  편차: "bg-accent-gap",
  중점: "bg-band-normal",
  중상: "bg-accent-mid",
  고점: "bg-band-good",
};

function NavLinks({
  samples,
  onNavigate,
}: {
  samples: NavSample[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const itemCls = (active: boolean) =>
    cn(
      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition",
      active
        ? "bg-muted text-foreground font-semibold"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    );

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
      {/* 2026-05-31 #11 채점 결과 조회 — 직접 채점받기 바로 아래(짝지어 노출) */}
      <Link
        href="/results"
        onClick={onNavigate}
        className={itemCls(pathname === "/results" || pathname.startsWith("/results/"))}
      >
        채점 결과 조회
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

      <div className="text-subtle-foreground mt-4 mb-1 px-3 text-[11px] font-semibold">
        샘플 채점 결과
      </div>
      {samples.map((s) => {
        const href = `/samples/${s.id}`;
        return (
          <Link
            key={s.id}
            href={href}
            onClick={onNavigate}
            className={itemCls(pathname === href)}
          >
            <span
              className={cn(
                "h-2 w-2 shrink-0 rounded-full",
                CATEGORY_DOT[s.category]
              )}
              aria-hidden
            />
            <span>
              {s.label} · {s.category}
            </span>
            <span className="text-subtle-foreground ml-auto text-xs tabular-nums">
              {s.total}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function Sidebar({ samples }: { samples: NavSample[] }) {
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
          <NavLinks samples={samples} />
        </div>
        <p className="border-border text-subtle-foreground border-t px-4 py-3 text-[10px] leading-relaxed">
          ※ AI 자동 채점 — 교사의 실제 채점과 다를 수 있어요.
        </p>
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
            <NavLinks samples={samples} onNavigate={close} />
          </aside>
        </div>
      )}
    </>
  );
}
