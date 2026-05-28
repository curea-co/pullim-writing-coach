import Link from "next/link";
import type { Metadata } from "next";
import TryClient from "../components/TryClient";

export const metadata: Metadata = {
  title: "글 입력 — Pullim Writing Coach",
  description:
    "학생 글을 입력하면 AI가 5가지 기준으로 라이브 채점해 드려요 (WBS P3.1·P3.2).",
};

// 블록 A(헤더) = 서버 컴포넌트, 입력/검증/상태는 ScoreForm(클라이언트)에 위임.
export default function TryPage() {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-8 md:py-12">
      <nav className="mb-6">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          ← 샘플 목록으로
        </Link>
      </nav>

      {/* 블록 A — 헤더 (wireframe §2) */}
      <header className="mb-8">
        <div className="flex items-baseline gap-3">
          <h1 className="text-foreground text-2xl font-bold tracking-tight md:text-3xl">
            Pullim Writing Coach
          </h1>
          <span className="bg-accent-mid-surface text-accent-mid rounded-full px-2 py-0.5 text-xs font-semibold">
            라이브 채점
          </span>
        </div>
        <p className="text-muted-foreground mt-3 text-base">
          수행평가 글, AI가 5가지 기준으로 첨삭해 드려요.
        </p>
      </header>

      {/* 프로필 인사/인라인 폼(클라) + 데모 접근 게이트(E-AUTH) → ScoreForm */}
      <TryClient />
    </main>
  );
}
