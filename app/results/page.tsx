"use client";
// /results — 채점 결과 조회 목록 (#11 신규, 2026-05-31).
//   localStorage["pwc_results_v1"]을 읽어 최신순으로 정렬·표시.
//   빈 상태 = /try CTA. /try 채점 성공 시 자동 저장.
//
// 데이터는 단일 디바이스(localStorage). 데이터 삭제는 /me에서.

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadResults, type ResultEntry } from "../lib/storage";
import { getTotalScoreBand } from "../data/scoring";
import { cn } from "../lib/utils";
import Breadcrumb from "../components/Breadcrumb";
import CtaBand from "../components/CtaBand";

type LoadState = "loading" | "empty" | "loaded";

export default function ResultsListPage() {
  const [state, setState] = useState<LoadState>("loading");
  const [items, setItems] = useState<ResultEntry[]>([]);

  useEffect(() => {
    const list = loadResults();
    // 최신순(created_at desc) — 저장 순서가 곧 시간순이므로 reverse.
    const sorted = [...list].reverse();
    setItems(sorted);
    setState(sorted.length === 0 ? "empty" : "loaded");
  }, []);

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-8 md:py-12">
      <Breadcrumb items={[{ label: "홈", href: "/" }, { label: "채점 결과 조회" }]} />

      <header className="mb-6">
        <h1 className="text-foreground text-2xl font-bold md:text-3xl">채점 결과 조회</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          내가 받은 채점 결과를 모아 봐요. 최대 20건까지 자동 저장돼요. 데이터는 이 브라우저에만 있어요(서버 X).
        </p>
      </header>

      {state === "loading" && (
        <p className="text-muted-foreground text-sm">불러오는 중…</p>
      )}

      {state === "empty" && (
        <section className="border-border bg-surface rounded-xl border p-6 text-center">
          <p className="text-foreground text-base font-semibold">아직 받은 채점 결과가 없어요.</p>
          <p className="text-muted-foreground mt-2 text-sm">
            글 한 편을 채점받으면 여기에 자동으로 쌓여요.
          </p>
          <Link
            href="/try"
            className="bg-primary text-primary-foreground mt-4 inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold"
          >
            직접 채점받기
            <span aria-hidden>→</span>
          </Link>
        </section>
      )}

      {state === "loaded" && (
        <section>
          <div className="text-subtle-foreground mb-3 text-xs">
            총 {items.length}건 · 최신순
          </div>
          <ul className="grid gap-3 md:grid-cols-2">
            {items.map((r) => {
              const band = getTotalScoreBand(r.output.total_score);
              const dateLabel = formatKstDate(r.created_at);
              return (
                <li key={r.id}>
                  <Link
                    href={`/results/${r.id}`}
                    className="border-border bg-surface group flex flex-col rounded-xl border p-4 transition hover:shadow-sm"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-subtle-foreground text-xs">{dateLabel}</span>
                      <div className="text-right">
                        <div className="text-foreground text-xl font-bold tabular-nums">
                          {r.output.total_score}
                          <span className="text-subtle-foreground text-xs font-normal"> / 100</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-foreground text-sm font-semibold">
                      {r.assignment.school_level} · {r.assignment.subject} · {r.assignment.genre}
                    </p>
                    <p className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-relaxed">
                      {r.assignment.prompt_text}
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className={cn("bg-muted rounded-md px-2 py-0.5 text-xs", band.textClass)}>
                        {band.label}
                      </span>
                      <span className="text-subtle-foreground text-xs">
                        {r.submission.char_count}자
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <CtaBand
        title="다시 한 편 채점받아 볼래요?"
        description="실시간 채점으로 또 다른 글을 평가받을 수 있어요."
      />
    </main>
  );
}

// ISO 8601 +09:00 → "2026-05-31 14:30" 형태
function formatKstDate(iso: string): string {
  // 이미 +09:00이 박힌 ISO. Date 파싱은 잘 되지만 표시는 원문에서 직접 추출이 안전.
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return iso;
  return `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}`;
}
