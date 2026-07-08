// /samples — 학생 글 샘플 5종 인덱스 (홈에서 분리, 2026-06-02).
//   기존 홈에 5종 카드가 노출됐으나 정보 구조 정리: 홈은 서비스 기능 소개,
//   /samples는 점수대 5케이스 카드 탐색. LNB '샘플 채점 결과' 헤더 클릭 진입점.
//   서버 컴포넌트 — SAMPLES 본문/피드백을 client 번들에 끌어오지 않음.

import Link from "next/link";
import type { Metadata } from "next";
import { cn } from "@/app/lib/utils";
import { SAMPLES, getTotalScoreBand, hasLargeAreaGap } from "../data/samples";
import Breadcrumb from "../components/Breadcrumb";

export const metadata: Metadata = {
  title: "샘플 채점 결과 — Pullim Writing Coach",
  description:
    "상·중상·중·중하·하 — 5개 점수대 학생 글 샘플의 AI 채점 결과 미리보기.",
};

// 카테고리 칩 — 시맨틱 밴드/액센트 토큰 (상→하, 색은 케이스별 유지)
const CATEGORY_CHIP: Record<string, string> = {
  상: "bg-band-good-surface text-band-good-foreground",
  중상: "bg-accent-mid-surface text-accent-mid",
  중: "bg-band-normal-surface text-band-normal-foreground",
  중하: "bg-accent-gap-surface text-accent-gap",
  하: "bg-band-warn-surface text-band-warn-foreground",
};

export default function SamplesIndexPage() {
  return (
    <main className="w-full max-w-4xl px-5 py-10 md:py-14">
      <Breadcrumb items={[{ label: "홈", href: "/" }, { label: "샘플 채점 결과" }]} />

      <header className="mb-8 mt-4">
        <h1 className="text-foreground break-keep text-2xl font-bold tracking-tight md:text-3xl">
          학생 글 샘플 5종
        </h1>
        <p className="text-muted-foreground break-keep mt-3 text-sm leading-relaxed md:text-base">
          상 · 중상 · 중 · 중하 · 하 — 점수대별 5케이스의 채점 결과를 확인할 수 있어요.
          각 카드를 누르면 영역별 점수, 잘한 점·고칠 점, 인라인 첨삭까지 보여줘요.
        </p>
      </header>

      <section className="mb-12">
        <div className="grid gap-3 md:grid-cols-2">
          {[...SAMPLES].sort((x, y) => x.label.localeCompare(y.label)).map((s) => {
            const band = getTotalScoreBand(s.output.total_score);
            const gap = hasLargeAreaGap(s.output.scores);
            return (
              <Link
                key={s.id}
                href={`/samples/${s.id}`}
                className="group border-border bg-surface flex flex-col rounded-xl border p-5 transition hover:shadow-sm"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      CATEGORY_CHIP[s.category]
                    )}
                  >
                    {s.label} · {s.category}
                  </span>
                  <div className="text-right">
                    <div className="text-foreground text-2xl font-bold">
                      {s.output.total_score}
                      <span className="text-subtle-foreground text-sm font-normal">
                        {" "}
                        / 100
                      </span>
                    </div>
                  </div>
                </div>
                <h3 className="text-foreground text-base font-semibold">
                  {s.title}
                </h3>
                <p className="text-muted-foreground mt-1 text-xs">
                  {s.assignment.school_level} · {s.assignment.subject} ·{" "}
                  {s.assignment.genre}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "bg-muted rounded-md px-2 py-0.5 text-xs",
                      band.textClass
                    )}
                  >
                    {band.label}
                  </span>
                  {gap && (
                    <span className="bg-accent-gap-surface text-accent-gap rounded-md px-2 py-0.5 text-xs">
                      ⚠ 영역 편차
                    </span>
                  )}
                </div>
                {/* sample.intent는 내부 PM/루브릭 메모 — 학생 화면 노출 금지 (Codex PR #15) */}
              </Link>
            );
          })}
        </div>
      </section>

      <footer className="border-border text-subtle-foreground space-y-1 border-t pt-6 text-xs">
        <p>
          짝 문서: functional_spec v0.3 · rubric v0.5 · samples v.3 · AI prompt v0.1
        </p>
        <p>
          AI 첨삭 결과는 06_ai_feedback_outputs_v.4의 EPO 자체 채점값을 그대로
          사용한 시뮬레이션입니다.
        </p>
        <p className="mt-2">
          샘플 출처: A·B·C 학생 글 본문은 아래 연구의 중·고등학생 정보 전달
          글(설명문)을 인용·발췌, D·E는 새로 작성한 글입니다.
        </p>
        <p>
          · 김은태 &amp; 정혜린. (2024). 설명문 쓰기 수업에 대한 국어 교사의
          실천적 지식 탐구. 국어교육학연구, 59(3), 5-38.
        </p>
        <p>
          · 김경환. (2021). 중ㆍ고등학생 글에 나타난 작문 능력 - 정보 전달 글을
          중심으로. 한국어문교육, 37, 89-129.
        </p>
      </footer>
    </main>
  );
}
