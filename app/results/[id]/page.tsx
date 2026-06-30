"use client";
// /results/[id] — 채점 결과 상세 (#11 신규, 2026-05-31).
//   localStorage에서 단건 조회 → 좌 학생 글 / 우 ResultView (공유 컴포넌트).
//   /samples/[id]와 동일 2단 레이아웃, 단 데이터 소스만 LS.
//   id 미발견 시 안내 + /results로 복귀 CTA.

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { getResult, type ResultEntry } from "../../lib/storage";
import { useAuth } from "../../lib/use-auth";
import Breadcrumb from "../../components/Breadcrumb";
import ResultView from "../../components/ResultView";
import CtaBand from "../../components/CtaBand";

// PR #115 결함 2: "id 미발견"(missing)과 "읽기 실패"(error)를 분리.
type LoadState = "loading" | "missing" | "loaded" | "error";

export default function ResultDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Next.js 16 — params는 Promise. use()로 client 컴포넌트에서 unwrap.
  const { id } = use(params);
  const { status } = useAuth();
  const [state, setState] = useState<LoadState>("loading");
  const [entry, setEntry] = useState<ResultEntry | null>(null);

  // PR #115 결함 1: status resolved 전 보류 + 전환 시 재로드. 결함 2: getResult throw → 에러 상태.
  useEffect(() => {
    if (status === "loading") return;
    let alive = true;
    void (async () => {
      try {
        const r = await getResult(id);
        if (!alive) return;
        if (r) {
          setEntry(r);
          setState("loaded");
        } else {
          setState("missing");
        }
      } catch {
        if (!alive) return;
        setState("error");
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, status]);

  if (state === "loading") {
    return (
      <main className="w-full max-w-4xl px-5 py-8 md:py-12">
        <p className="text-muted-foreground text-sm">불러오는 중…</p>
      </main>
    );
  }

  if (state === "error") {
    return (
      <main className="w-full max-w-4xl px-5 py-8 md:py-12">
        <Breadcrumb
          items={[
            { label: "홈", href: "/" },
            { label: "채점 결과 조회", href: "/results" },
            { label: "불러오기 실패" },
          ]}
        />
        <section
          role="alert"
          className="border-band-warn-surface bg-band-warn-surface/30 rounded-xl border p-6 text-left"
        >
          <p className="text-foreground text-base font-semibold">결과를 불러오지 못했어요</p>
          <p className="text-muted-foreground mt-2 text-sm">
            일시적인 연결 문제일 수 있어요. 잠시 후 다시 시도해 주세요.
          </p>
          <button
            type="button"
            onClick={() => {
              setState("loading");
              void (async () => {
                try {
                  const r = await getResult(id);
                  if (r) {
                    setEntry(r);
                    setState("loaded");
                  } else {
                    setState("missing");
                  }
                } catch {
                  setState("error");
                }
              })();
            }}
            className="bg-primary text-primary-foreground mt-4 inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold transition hover:opacity-90"
          >
            다시 시도
          </button>
        </section>
      </main>
    );
  }

  if (state === "missing" || !entry) {
    return (
      <main className="w-full max-w-4xl px-5 py-8 md:py-12">
        <Breadcrumb
          items={[
            { label: "홈", href: "/" },
            { label: "채점 결과 조회", href: "/results" },
            { label: "찾을 수 없음" },
          ]}
        />
        <section className="border-border bg-surface rounded-xl border p-6 text-left">
          <p className="text-foreground text-base font-semibold">
            이 채점 결과를 찾을 수 없어요.
          </p>
          <p className="text-muted-foreground mt-2 text-sm">
            데이터가 삭제됐거나 보관 한도(20건)를 넘어 정리됐을 수 있어요.
          </p>
          <Link
            href="/results"
            className="bg-primary text-primary-foreground mt-4 inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold"
          >
            목록으로
            <span aria-hidden>→</span>
          </Link>
        </section>
      </main>
    );
  }

  const { assignment, submission, output } = entry;
  const dateLabel = formatKstDate(entry.created_at);

  return (
    <main className="w-full max-w-4xl px-5 py-8 md:py-12">
      <Breadcrumb
        items={[
          { label: "홈", href: "/" },
          { label: "채점 결과 조회", href: "/results" },
          { label: dateLabel },
        ]}
      />

      <header className="mb-8">
        <div className="mb-2 flex items-center gap-2 text-xs">
          <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 font-semibold">
            내 채점 결과
          </span>
          <span className="text-subtle-foreground">{dateLabel}</span>
        </div>
        <h1 className="text-foreground text-2xl font-bold md:text-3xl">
          {assignment.school_level} · {assignment.subject} · {assignment.genre}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm line-clamp-2">
          {assignment.prompt_text}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* 좌: 학생 글 */}
        <section className="space-y-5 lg:col-span-2">
          <div className="border-border bg-surface rounded-xl border p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-foreground text-sm font-semibold">내 글</h2>
              <span className="text-muted-foreground text-xs">
                {submission.char_count}자
                {assignment.target_char_count
                  ? ` / 목표 ${assignment.target_char_count}자`
                  : ""}
              </span>
            </div>
            <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
              {submission.body}
            </p>
          </div>
        </section>

        {/* 우: 결과 (공유 ResultView) */}
        <ResultView
          assignment={assignment}
          output={output}
          className="lg:col-span-3"
          actions={
            <Link
              href="/results"
              className="border-border text-foreground hover:bg-muted inline-flex items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-semibold"
            >
              목록으로
            </Link>
          }
        />
      </div>

      <CtaBand
        title="또 한 편 써 보세요"
        description="새 글을 실시간으로 채점받을 수 있어요."
      />
    </main>
  );
}

function formatKstDate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return iso;
  return `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}`;
}
