import Link from "next/link";
import { notFound } from "next/navigation";
import { SAMPLES, getSample } from "../../data/samples";
import ResultView from "../../components/ResultView";
import AnnotatedBody from "../../components/AnnotatedBody";
import Breadcrumb from "../../components/Breadcrumb";
import CtaBand from "../../components/CtaBand";

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
    // intent는 내부 PM/루브릭 메모(§ 표기 포함) — 메타데이터·검색 노출 금지(Codex PR #15).
    description: `샘플 ${sample.label} · ${sample.category} · ${sample.assignment.school_level} ${sample.assignment.subject} ${sample.assignment.genre}`,
  };
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
  const isCited = ["a", "b", "c"].includes(sample.id);

  return (
    <main className="mx-auto w-full max-w-4xl px-5 py-8 md:py-12">
      <Breadcrumb
        items={[
          { label: "홈", href: "/" },
          { label: "샘플 채점 결과", href: "/" },
          { label: `${sample.label} · ${sample.category}` },
        ]}
      />

      <header className="mb-8">
        <div className="mb-2 flex items-center gap-2 text-xs">
          <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 font-semibold">
            샘플 {sample.label} · {sample.category}
          </span>
        </div>
        <h1 className="text-foreground text-2xl font-bold md:text-3xl">
          {sample.title}
        </h1>
        {/* sample.intent는 내부 PM/루브릭 메모로 학생 화면 미노출 (Codex PR #15). */}
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
            <AnnotatedBody body={submission.body} scores={output.scores} />
            <p className="border-border text-subtle-foreground mt-3 border-t pt-3 text-[11px] leading-relaxed">
              {isCited
                ? "출처: 본 학생 글은 김은태·정혜린(2024, 국어교육학연구 59(3)) 및 김경환(2021, 한국어문교육 37)에 수록된 중·고등학생 정보 전달 글(설명문)을 인용·발췌한 것입니다. 학년·과목·과제 맥락은 채점 시연용 메타데이터입니다."
                : "본 학생 글은 채점 시연용으로 새로 작성한 글입니다."}
            </p>
          </div>
        </section>

        {/* 오른쪽: 첨삭 결과 — 공유 ResultView (실시간 폼과 동일 UI, P3.3) */}
        <ResultView
          assignment={assignment}
          output={output}
          className="lg:col-span-3"
          actions={
            <Link
              href="/"
              className="border-border text-foreground hover:bg-muted inline-flex items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-semibold"
            >
              다른 샘플 보기
            </Link>
          }
        />
      </div>

      <CtaBand
        title="다른 글도 직접 넣어 보세요"
        description="이 샘플처럼, 직접 쓴 수행평가 글을 첨삭받을 수 있어요."
      />
    </main>
  );
}
