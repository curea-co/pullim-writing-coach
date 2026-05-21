import Link from "next/link";
import { notFound } from "next/navigation";
import { cn } from "@/app/lib/utils";
import {
  SAMPLES,
  getSample,
  getScoreColor,
  getTotalScoreBand,
  hasLargeAreaGap,
  type Sample,
} from "../../data/samples";
import CopyButton from "../../components/CopyButton";

export function generateStaticParams() {
  return SAMPLES.map((s) => ({ id: s.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sample = getSample(id);
  if (!sample) return { title: "샘플 없음" };
  return {
    title: `${sample.label}. ${sample.title} — Pullim Writing Coach`,
    description: sample.intent,
  };
}

function buildCopyText(s: Sample): string {
  const a = s.assignment;
  const o = s.output;
  const lines: string[] = [];
  lines.push("[Pullim Writing Coach 첨삭 결과]");
  lines.push(`과제: ${a.school_level} ${a.subject} / ${a.genre}`);
  lines.push(`총점: ${o.total_score} / 100`);
  lines.push("");
  lines.push("■ 영역별 점수");
  for (const sc of o.scores) {
    lines.push(`- ${sc.area}: ${sc.score}/${sc.max}`);
  }
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

// App Router는 params를 Promise로 받는다 (Next.js 15+)
export default async function SampleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sample = getSample(id);
  if (!sample) notFound();

  const { assignment, submission, output } = sample;
  const band = getTotalScoreBand(output.total_score);
  const gap = hasLargeAreaGap(output.scores);
  const copyText = buildCopyText(sample);
  const isCited = ["a", "b", "c"].includes(sample.id);

  // 영역 편차 강조용 — 최고·최저 영역 인덱스
  const scoreVals = output.scores.map((s) => s.score);
  const maxIdx = scoreVals.indexOf(Math.max(...scoreVals));
  const minIdx = scoreVals.indexOf(Math.min(...scoreVals));

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-8 md:py-12">
      <nav className="mb-6">
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          ← 샘플 목록으로
        </Link>
      </nav>

      <header className="mb-8">
        <div className="mb-2 flex items-center gap-2 text-xs">
          <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 font-semibold">
            샘플 {sample.label} · {sample.category}
          </span>
        </div>
        <h1 className="text-foreground text-2xl font-bold md:text-3xl">
          {sample.title}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">{sample.intent}</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* 왼쪽: 과제 정보 + 학생 글 */}
        <section className="space-y-5 lg:col-span-2">
          <div className="border-border bg-surface rounded-xl border p-5">
            <h2 className="text-foreground mb-3 text-sm font-semibold">
              과제 정보
            </h2>
            <dl className="grid grid-cols-3 gap-y-2 text-sm">
              <dt className="text-muted-foreground">학년</dt>
              <dd className="text-foreground col-span-2">
                {assignment.school_level}
              </dd>
              <dt className="text-muted-foreground">과목</dt>
              <dd className="text-foreground col-span-2">
                {assignment.subject}
              </dd>
              <dt className="text-muted-foreground">장르</dt>
              <dd className="text-foreground col-span-2">{assignment.genre}</dd>
              <dt className="text-muted-foreground">목표 분량</dt>
              <dd className="text-foreground col-span-2">
                {assignment.target_char_count
                  ? `${assignment.target_char_count}자`
                  : "제한 없음"}
              </dd>
            </dl>
            <div className="mt-4">
              <div className="text-muted-foreground mb-1 text-xs font-semibold">
                과제문
              </div>
              <p className="bg-muted text-foreground rounded-md px-3 py-2 text-sm leading-relaxed">
                {assignment.prompt_text}
              </p>
            </div>
          </div>

          <div className="border-border bg-surface rounded-xl border p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-foreground text-sm font-semibold">학생 글</h2>
              <span className="text-muted-foreground text-xs">
                현재 {submission.char_count}자
                {assignment.target_char_count
                  ? ` / 목표 ${assignment.target_char_count}자`
                  : ""}
              </span>
            </div>
            <p className="text-foreground text-sm leading-relaxed whitespace-pre-wrap">
              {submission.body}
            </p>
            <p className="border-border text-subtle-foreground mt-3 border-t pt-3 text-[11px] leading-relaxed">
              {isCited
                ? "출처: 본 학생 글은 김은태·정혜린(2024, 국어교육학연구 59(3)) 및 김경환(2021, 한국어문교육 37)에 수록된 중·고등학생 정보 전달 글(설명문)을 인용·발췌한 것입니다. 학년·과목·과제 맥락은 채점 시연용 메타데이터입니다."
                : "본 학생 글은 채점 시연용으로 새로 작성한 글입니다."}
            </p>
          </div>
        </section>

        {/* 오른쪽: 첨삭 결과 */}
        <section className="space-y-5 lg:col-span-3">
          {/* C1. 점수 (F4) */}
          <div className="border-border bg-surface rounded-xl border p-5">
            <h2 className="text-foreground mb-4 text-sm font-semibold">점수</h2>
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
          <div className="border-border bg-surface rounded-xl border p-5">
            <h2 className="text-foreground mb-4 text-sm font-semibold">
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
          <div className="border-border bg-surface rounded-xl border p-5">
            <h2 className="text-foreground mb-4 text-sm font-semibold">
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

          {/* C4. 결과 복사 (F7) + C5. 면책 */}
          <div className="border-border bg-surface rounded-xl border p-5">
            <div className="flex flex-wrap items-center gap-3">
              <CopyButton text={copyText} />
              <Link
                href="/"
                className="border-border text-foreground hover:bg-muted inline-flex items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-semibold"
              >
                다른 샘플 보기
              </Link>
            </div>
            <p className="bg-muted text-muted-foreground mt-4 rounded-md px-3 py-2 text-xs">
              ※ {output.meta.disclaimer}
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
