"use client";
// #1 수정 전/후 비교 — 본문 영역 wrapper.
//   RevisionToggle(v1/v2) + 활성 버전의 AnnotatedBody. 기본 v2.
//   ResultView가 revisionMode prop으로 RevisionEntry 두 개를 받았을 때 사용.

import { useState } from "react";
import type { RevisionEntry } from "../lib/storage";
import AnnotatedBody from "./AnnotatedBody";
import RevisionToggle, { type RevisionView } from "./RevisionToggle";

export default function RevisionBodyView({
  v1,
  v2,
}: {
  v1: RevisionEntry;
  v2: RevisionEntry;
}) {
  const [active, setActive] = useState<RevisionView>("v2");
  const current = active === "v2" ? v2 : v1;

  return (
    <section
      id="result-body"
      aria-label="학생 글 본문"
      className="border-border bg-surface scroll-mt-20 space-y-3 rounded-xl border p-5"
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-foreground text-sm font-semibold">학생 글</h2>
        <RevisionToggle active={active} onChange={setActive} />
      </div>
      <AnnotatedBody body={current.submission.body} scores={current.output.scores} />
      <p className="text-subtle-foreground border-border border-t pt-2 text-[11px]">
        {active === "v2" ? "방금 쓴 글" : "이전 글"} · {current.submission.char_count}자 ·{" "}
        {new Date(current.created_at).toLocaleString("ko-KR", { hour12: false })}
      </p>
    </section>
  );
}
