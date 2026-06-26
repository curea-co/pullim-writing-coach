"use client";
// /results — 채점 결과 조회 목록 (#11 + #M3 ④ 폴리시 2026-06-01).
//   필터(과목) + 정렬(점수·날짜) + 검색(과제문 키워드) + 개별 삭제.
//   localStorage["pwc_results_v1"]을 읽어 처리. 데이터는 단일 디바이스(브라우저 내).
//
//   순수 클라 — 외부 API·서버 0. 모든 필터·정렬은 메모리에서.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { loadResults, removeResult, type ResultEntry } from "../lib/storage";
import { getTotalScoreBand } from "../data/scoring";
import { cn } from "../lib/utils";
import Breadcrumb from "../components/Breadcrumb";
import CtaBand from "../components/CtaBand";

type LoadState = "loading" | "empty" | "loaded";
type SortKey = "date_desc" | "date_asc" | "score_desc" | "score_asc";

export default function ResultsListPage() {
  const [state, setState] = useState<LoadState>("loading");
  const [items, setItems] = useState<ResultEntry[]>([]);
  const [subjectFilter, setSubjectFilter] = useState<string>("");
  const [query, setQuery] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("date_desc");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  useEffect(() => {
    const list = loadResults();
    setItems(list);
    setState(list.length === 0 ? "empty" : "loaded");
  }, []);

  // 유니크 과목 — 필터 옵션 만들기 (현 데이터 기반 동적 옵션).
  const subjects = useMemo(() => {
    const set = new Set<string>();
    items.forEach((r) => set.add(r.assignment.subject));
    return Array.from(set).sort();
  }, [items]);

  // 필터 + 검색 + 정렬 적용 (memoized).
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = items.filter((r) => {
      if (subjectFilter && r.assignment.subject !== subjectFilter) return false;
      if (q) {
        const haystack = [
          r.assignment.prompt_text,
          r.assignment.genre,
          r.assignment.school_level,
          r.assignment.subject,
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
    arr = [...arr];
    switch (sortKey) {
      case "date_desc":
        arr.reverse(); // 저장 순 = 시간 순이므로 reverse가 최신순
        break;
      case "date_asc":
        // 저장 순 그대로
        break;
      case "score_desc":
        arr.sort((a, b) => b.output.total_score - a.output.total_score);
        break;
      case "score_asc":
        arr.sort((a, b) => a.output.total_score - b.output.total_score);
        break;
    }
    return arr;
  }, [items, subjectFilter, query, sortKey]);

  function handleDelete(id: string) {
    const result = removeResult(id);
    if (result.ok && result.removed) {
      const next = items.filter((r) => r.id !== id);
      setItems(next);
      setPendingDelete(null);
      if (next.length === 0) setState("empty");
    }
  }

  return (
    <main className="w-full max-w-4xl px-5 py-8 md:py-12">
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
        <section className="border-border bg-surface rounded-xl border p-8 text-left">
          <p className="text-foreground text-base font-semibold">아직 받은 채점 결과가 없어요</p>
          <p className="text-muted-foreground break-keep mt-2 text-sm">
            글 한 편을 채점받으면 여기에 자동으로 쌓여요. 최대 20건 보관돼요.
          </p>
          <Link
            href="/try"
            className="bg-primary text-primary-foreground mt-5 inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold transition hover:opacity-90"
          >
            직접 채점받기
            <span aria-hidden>→</span>
          </Link>
        </section>
      )}

      {state === "loaded" && (
        <section>
          {/* #M3 ④ 필터·검색·정렬 툴바 */}
          <div className="border-border bg-surface mb-4 grid gap-3 rounded-xl border p-4 md:grid-cols-3">
            <div>
              <label
                htmlFor="filter-subject"
                className="text-muted-foreground mb-1 block text-xs font-medium"
              >
                과목 필터
              </label>
              <select
                id="filter-subject"
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="border-border bg-background text-foreground w-full rounded-md border px-2 py-1.5 text-sm"
              >
                <option value="">전체 ({items.length}건)</option>
                {subjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="filter-sort"
                className="text-muted-foreground mb-1 block text-xs font-medium"
              >
                정렬
              </label>
              <select
                id="filter-sort"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="border-border bg-background text-foreground w-full rounded-md border px-2 py-1.5 text-sm"
              >
                <option value="date_desc">최신순</option>
                <option value="date_asc">오래된순</option>
                <option value="score_desc">점수 높은 순</option>
                <option value="score_asc">점수 낮은 순</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="filter-query"
                className="text-muted-foreground mb-1 block text-xs font-medium"
              >
                검색
              </label>
              <input
                id="filter-query"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="과제문·장르·학년 키워드"
                className="border-border bg-background text-foreground w-full rounded-md border px-2 py-1.5 text-sm"
              />
            </div>
          </div>

          <div className="text-subtle-foreground mb-3 text-xs">
            {visible.length === items.length
              ? `총 ${items.length}건`
              : `${visible.length}건 / 전체 ${items.length}건`}
          </div>

          {visible.length === 0 ? (
            <div className="border-border bg-surface text-muted-foreground rounded-xl border p-6 text-left text-sm">
              조건에 맞는 결과가 없어요. 필터·검색어를 조정해 보세요.
            </div>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {visible.map((r) => {
                const band = getTotalScoreBand(r.output.total_score);
                const dateLabel = formatKstDate(r.created_at);
                const isPending = pendingDelete === r.id;
                return (
                  <li
                    key={r.id}
                    className="border-border bg-surface group relative flex flex-col rounded-xl border p-4 transition hover:shadow-sm"
                  >
                    {/* 카드 본문 — Link로 상세 진입 */}
                    <Link
                      href={`/results/${r.id}`}
                      className="flex flex-col gap-1"
                      aria-label={`${dateLabel} · ${r.assignment.school_level} ${r.assignment.subject} ${r.assignment.genre} · ${r.output.total_score}점`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-subtle-foreground text-xs">{dateLabel}</span>
                        <div className="text-right">
                          <div className="text-foreground text-xl font-bold tabular-nums">
                            {r.output.total_score}
                            <span className="text-subtle-foreground text-xs font-normal">
                              {" "}
                              / 100
                            </span>
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
                        <span
                          className={cn(
                            "bg-muted rounded-md px-2 py-0.5 text-xs",
                            band.textClass,
                          )}
                        >
                          {band.label}
                        </span>
                        <span className="text-subtle-foreground text-xs">
                          {r.submission.char_count}자
                        </span>
                      </div>
                    </Link>
                    {/* 삭제 버튼 — 2단계 확인 */}
                    <div className="border-border mt-3 flex items-center justify-end gap-2 border-t pt-2">
                      {isPending ? (
                        <>
                          <span className="text-band-warn-foreground break-keep text-[11px]">
                            삭제할까요?
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDelete(r.id)}
                            className="bg-band-warn text-white hover:opacity-90 rounded-md px-2 py-0.5 text-xs font-semibold"
                          >
                            삭제
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDelete(null)}
                            className="border-border text-muted-foreground hover:bg-muted rounded-md border px-2 py-0.5 text-xs"
                          >
                            취소
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPendingDelete(r.id)}
                          aria-label="이 결과 삭제"
                          className="text-subtle-foreground hover:text-band-warn-foreground text-xs"
                        >
                          🗑 삭제
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
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
