// Pullim Writing Coach — 첨삭 결과 뷰 (C1~C5). 정적 샘플(/samples/[id])과
// 라이브 채점 결과(ScoreForm) 양쪽이 공유하는 단일 UI (WBS P3.3 "결과 화면 재사용").
//
// "use client" 없음 = 범용 컴포넌트: 서버(samples 페이지)·클라이언트(ScoreForm) 양쪽에서 렌더.
//   자체 훅 없음, CopyButton만 client. assignment+output(계약 §4.2 F3Output)을 받아 렌더.

import type { ReactNode } from "react";
import { cn } from "@/app/lib/utils";
// SAMPLES와 분리된 scoring.ts에서 타입·헬퍼만 import → 클라 번들에 샘플 본문 미포함(curea-review-ai 지적).
import {
  type Assignment,
  type F3Output,
  type Sample,
  getScoreColor,
  getTotalScoreBand,
  hasLargeAreaGap,
} from "../data/scoring";
import CopyButton from "./CopyButton";
import SectionNav from "./SectionNav";

// 결과 섹션 — sticky 번호 내비(SectionNav)와 카드 헤더가 공유하는 단일 소스.
const RESULT_SECTIONS = [
  { id: "result-score", num: "01", label: "점수" },
  { id: "result-feedback", num: "02", label: "영역별 피드백" },
  { id: "result-guide", num: "03", label: "수정 가이드" },
];

// 결과 복사 텍스트 (functional_spec §5 포맷). 화면·복사 동일 disclaimer.
export function buildCopyText(assignment: Assignment, output: F3Output): string {
  const a = assignment;
  const o = output;
  const lines: string[] = [];
  lines.push("[Pullim Writing Coach 첨삭 결과]");
  lines.push(`과제: ${a.school_level} ${a.subject} / ${a.genre}`);
  lines.push(`총점: ${o.total_score} / 100`);
  lines.push("");
  lines.push("■ 영역별 점수");
  for (const sc of o.scores) lines.push(`- ${sc.area}: ${sc.score}/${sc.max}`);
  lines.push("");
  lines.push("■ 영역별 피드백");
  for (const sc of o.scores) {
    lines.push(`[${sc.area}]`);
    lines.push(`잘한 점: ${sc.feedback_good}`);
    lines.push(`고칠 점: ${sc.feedback_fix}`);
    lines.push("");
  }
  lines.push("■ 수정 가이드");
  for (const g of o.revision_guides) {
    lines.push(`${g.priority}. ${g.action}`);
    lines.push(`   → ${g.reason}`);
  }
  lines.push("");
  lines.push(`※ ${o.meta.disclaimer}`);
  return lines.join("\n");
}

export default function ResultView({
  assignment,
  output,
  actions,
  className,
}: {
  assignment: Assignment | Sample["assignment"];
  output: F3Output;
  actions?: ReactNode; // C4의 부가 버튼 (페이지별: "다른 샘플 보기" / "글 고치고 다시 받기")
  className?: string;
}) {
  const band = getTotalScoreBand(output.total_score);
  const gap = hasLargeAreaGap(output.scores);
  const copyText = buildCopyText(assignment, output);

  // 영역 편차 강조용 — 최고·최저 영역 인덱스
  const scoreVals = output.scores.map((s) => s.score);
  const maxIdx = scoreVals.indexOf(Math.max(...scoreVals));
  const minIdx = scoreVals.indexOf(Math.min(...scoreVals));

  return (
    <div className={cn("space-y-5", className)}>
      <SectionNav items={RESULT_SECTIONS} />

      {/* C1. 점수 (F4) */}
      <div
        id="result-score"
        className="border-border bg-surface scroll-mt-20 rounded-xl border p-5"
      >
        <h2 className="text-foreground mb-4 flex items-center gap-2 text-sm font-semibold">
          <span className="text-subtle-foreground tabular-nums">01</span>
          점수
        </h2>
        <div className="mb-2 flex items-baseline gap-3">
          <div className="text-foreground text-5xl font-bold tracking-tight">
            {output.total_score}
            <span className="text-subtle-foreground text-xl font-normal">
              {" "}
              / 100
            </span>
          </div>
          <span className={cn("text-sm font-medium", band.textClass)}>
            {band.label}
          </span>
        </div>
        <p className="text-muted-foreground mb-4 text-xs">{band.message}</p>

        {gap && (
          <div className="border-accent-gap-surface bg-accent-gap-surface text-accent-gap mb-4 rounded-lg border px-3 py-2 text-xs">
            ⚠ 영역 편차가 큽니다 — 총점보다 영역별 피드백을 먼저 보세요.
          </div>
        )}

        <ul className="space-y-2">
          {output.scores.map((sc, i) => {
            const sty = getScoreColor(sc.score);
            const widthPct = (sc.score / sc.max) * 100;
            const isMax = gap && i === maxIdx;
            const isMin = gap && i === minIdx;
            return (
              <li
                key={sc.area}
                className={cn(
                  "flex items-center gap-3",
                  (isMax || isMin) && "font-medium"
                )}
              >
                <div
                  className={cn(
                    "w-24 shrink-0 text-sm",
                    isMin
                      ? "text-band-warn-foreground"
                      : isMax
                        ? "text-band-good-foreground"
                        : "text-foreground"
                  )}
                >
                  {sc.area}
                </div>
                <div className="flex-1">
                  <div className="bg-muted h-2.5 w-full overflow-hidden rounded-full">
                    {/* 동적 width는 데이터 기반이라 Tailwind 정적 클래스로 표현 불가 — 인라인 style 정당 예외 (audit D3) */}
                    <div
                      className={cn("score-bar h-full", sty.bar)}
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
                <div
                  className={cn(
                    "w-12 shrink-0 text-right text-sm tabular-nums",
                    sty.text
                  )}
                >
                  {sc.score}/{sc.max}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* C2. 영역별 피드백 (F5) */}
      <div
        id="result-feedback"
        className="border-border bg-surface scroll-mt-20 rounded-xl border p-5"
      >
        <h2 className="text-foreground mb-4 flex items-center gap-2 text-sm font-semibold">
          <span className="text-subtle-foreground tabular-nums">02</span>
          영역별 피드백
        </h2>
        <div className="space-y-4">
          {output.scores.map((sc) => {
            const sty = getScoreColor(sc.score);
            return (
              <div key={sc.area} className="border-border border-l-2 pl-3">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-foreground text-sm font-semibold">
                    ▸ {sc.area}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-medium tabular-nums",
                      sty.text
                    )}
                  >
                    {sc.score}/{sc.max}
                  </span>
                </div>
                <div className="mt-1.5 space-y-1.5">
                  <p className="text-foreground text-sm leading-relaxed">
                    <span className="bg-band-good-surface text-band-good-foreground mr-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold">
                      잘한 점
                    </span>
                    {sc.feedback_good}
                  </p>
                  <p className="text-foreground text-sm leading-relaxed">
                    <span className="bg-band-normal-surface text-band-normal-foreground mr-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold">
                      고칠 점
                    </span>
                    {sc.feedback_fix}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* C3. 수정 가이드 (F6) */}
      <div
        id="result-guide"
        className="border-border bg-surface scroll-mt-20 rounded-xl border p-5"
      >
        <h2 className="text-foreground mb-4 flex items-center gap-2 text-sm font-semibold">
          <span className="text-subtle-foreground tabular-nums">03</span>
          이렇게 고쳐 보세요
        </h2>
        <ol className="space-y-3">
          {output.revision_guides.map((g) => (
            <li key={g.priority} className="flex gap-3">
              <div className="bg-primary text-primary-foreground flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                {g.priority}
              </div>
              <div className="flex-1">
                <p className="text-foreground text-sm font-medium">
                  {g.action}
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  → {g.reason}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* C4. 결과 복사 (F7) + 부가 액션 + C5. 면책 */}
      <div className="border-border bg-surface rounded-xl border p-5">
        <div className="flex flex-wrap items-center gap-3">
          <CopyButton text={copyText} />
          {actions}
        </div>
        <p className="bg-muted text-muted-foreground mt-4 rounded-md px-3 py-2 text-xs">
          ※ {output.meta.disclaimer}
        </p>
      </div>
    </div>
  );
}
