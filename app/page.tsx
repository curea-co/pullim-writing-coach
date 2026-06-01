import Link from "next/link";
import { cn } from "@/app/lib/utils";
import { SAMPLES, getTotalScoreBand, hasLargeAreaGap } from "./data/samples";
import CtaBand from "./components/CtaBand";
import HomeWelcomeBanner from "./components/HomeWelcomeBanner";

// 홈 3-up 피처 카드 (레퍼런스 3-up 패턴). 색·폰트는 기존 토큰 유지.
const FEATURES = [
  {
    title: "5영역 채점",
    body: "과제 이해 · 내용 충실도 · 구조·논리 · 표현·문장 · 성장 가능성을 각 20점으로.",
  },
  {
    title: "코칭 톤 피드백",
    body: "잘한 점 · 고칠 점 · 수정 가이드를 학생 눈높이의 코칭 말투로.",
  },
  {
    title: "점수대 5케이스",
    body: "저점(40) · 편차(61) · 중점(74) · 중상(85) · 고점(86) — 구간별 시연.",
  },
];

// 카테고리 칩 — 시맨틱 밴드/액센트 토큰 사용(fe-styling)
const CATEGORY_CHIP: Record<string, string> = {
  저점: "bg-band-warn-surface text-band-warn-foreground",
  편차: "bg-accent-gap-surface text-accent-gap",
  중점: "bg-band-normal-surface text-band-normal-foreground",
  중상: "bg-accent-mid-surface text-accent-mid",
  고점: "bg-band-good-surface text-band-good-foreground",
};

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-10 md:py-14">
      <header className="mb-10">
        <div className="flex items-baseline gap-3">
          <h1 className="text-foreground text-3xl font-bold tracking-tight md:text-4xl">
            Pullim Writing Coach
          </h1>
          <span className="text-muted-foreground text-sm font-medium">데모</span>
        </div>
        <p className="text-muted-foreground mt-3 text-base md:text-lg">
          수행평가 글, AI가 5가지 기준으로 첨삭해 드려요.
        </p>
        <p className="text-muted-foreground mt-2 text-sm">
          Week 1 산출물 — 5개 학생 글 샘플의 채점 결과 미리보기 · rubric v0.5
          적용
        </p>
      </header>

      {/* 헤더 직후 = 개인화 우선(HomeWelcomeBanner). 그 다음에 main #8 결정 위치의 CtaBand. */}
      <HomeWelcomeBanner />

      {/* 닫는 CTA 밴드 — 타이틀·안내 텍스트 아래로 이동 (UI 요청, PR #8) */}
      <CtaBand />

      <section className="mt-10 mb-8">
        <h2 className="text-foreground mb-3 text-sm font-semibold">
          이 데모가 보여 주는 것
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="border-border bg-surface rounded-xl border p-4"
            >
              <div className="text-subtle-foreground mb-2 text-xs font-semibold tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </div>
              <h3 className="text-foreground text-sm font-semibold">
                {f.title}
              </h3>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                {f.body}
              </p>
            </div>
          ))}
        </div>
        <p className="bg-muted text-muted-foreground mt-3 rounded-md px-3 py-2 text-xs">
          ※ 이 채점은 AI 자동 채점입니다. 학교 교사의 실제 채점과 다를 수
          있습니다.
        </p>
        <Link
          href="/try"
          className="border-border text-foreground hover:bg-muted mt-3 inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium"
        >
          직접 글 입력해 채점받기
          <span className="bg-accent-mid-surface text-accent-mid rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
            실시간
          </span>
        </Link>
      </section>

      <section>
        <h2 className="text-foreground mb-4 text-lg font-semibold">
          학생 글 샘플 5종
        </h2>
        <div className="grid gap-3 md:grid-cols-2">
          {SAMPLES.map((s) => {
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
                {/* sample.intent는 내부 PM/루브릭 메모(§ 표기 포함) — 학생 화면 노출 금지.
                    Codex PR #15 지적: E만 비우고 A-D는 그대로 노출되어 컨벤션 위반. 전부 비표시. */}
              </Link>
            );
          })}
        </div>
      </section>

      <footer className="border-border text-subtle-foreground mt-12 space-y-1 border-t pt-6 text-xs">
        <p>
          짝 문서: functional_spec v0.3 · rubric v0.5 · samples v.3 · AI prompt
          v0.1
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
