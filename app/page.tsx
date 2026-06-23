import Link from "next/link";
import CtaBand from "./components/CtaBand";
import HomeWelcomeBanner from "./components/HomeWelcomeBanner";

// 홈 리뉴얼(2026-06-02) — qanda.ai/ko 톤 참고 medium depth.
//   Hero(헤드라인 + CTA) → Bento(4-up 기능 시각화) → 통계(4가지 지표) → Closing CTA.
//   학생 글 샘플 5종 카드는 /samples 인덱스로 분리, 여기는 진입 버튼만.

// Bento 4-up — 5영역 채점 / 코칭 톤 / 1분 채점 / 점수대 시연.
const FEATURES = [
  {
    title: "5영역 루브릭 자동 채점",
    body: "과제 이해 · 내용 충실도 · 구조·논리 · 표현·문장 · 성장 가능성. 각 영역 20점, 총 100점으로 객관적인 기준에 맞춰요.",
    visual: "rubric",
  },
  {
    title: "잘한 점부터 짚어주는 코칭 톤",
    body: "비판이 아니라 다음 단계를 안내해요. 영역별 잘한 점 → 고칠 점 → 우선순위 가이드 순서로 보여줘요.",
    visual: "coaching",
  },
  {
    title: "1분 안에 첨삭과 리포트",
    body: "글을 붙여넣으면 영역 점수, 인라인 첨삭, 수정 가이드, PDF 출력까지 한 번에. 선생님께 공유하기 좋아요.",
    visual: "speed",
  },
  {
    title: "점수대 5케이스 미리보기",
    body: "저점 · 편차 · 중점 · 중상 · 고점 — 점수대마다 채점 결과가 어떻게 나오는지 샘플 글 5종으로 시연해요.",
    visual: "samples",
  },
] as const;

// 통계 — qanda 그래프 자리 대체. 우리는 데모라서 핵심 지표 4가지.
const STATS = [
  { value: "5", unit: "영역", label: "루브릭 기준" },
  { value: "100", unit: "점 만점", label: "총점 환산" },
  { value: "1", unit: "분", label: "채점 + 첨삭" },
  { value: "5", unit: "케이스", label: "점수대 샘플" },
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-10 md:py-16">
      {/* Hero — 큰 헤드라인 + 부제 + 두 CTA(직접 채점 / 샘플 보기). */}
      <header className="mb-12 md:mb-16">
        <div className="mb-3 flex items-center gap-2">
          <span className="bg-accent-mid-surface text-accent-mid inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold">
            데모 · Week 1 산출물
          </span>
          <span className="text-subtle-foreground text-xs">rubric v0.5</span>
        </div>
        <h1 className="text-foreground break-keep text-3xl font-bold tracking-tight md:text-5xl md:leading-tight">
          수행평가 글, AI가 5가지 기준으로
          <br />
          <span className="text-accent-mid">첨삭해 드려요.</span>
        </h1>
        <p className="text-muted-foreground break-keep mt-5 text-base leading-relaxed md:text-lg">
          학생이 쓴 글을 1분 안에 5영역으로 채점하고, 잘한 점·고칠 점·수정 가이드를 코칭
          말투로 보여줘요. PDF·스크린샷으로 저장해 선생님과 공유할 수 있어요.
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link
            href="/try"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
          >
            직접 채점받기 →
          </Link>
          <Link
            href="/samples"
            className="border-border text-foreground hover:bg-muted inline-flex items-center justify-center rounded-lg border px-5 py-3 text-sm font-semibold transition"
          >
            샘플 5종 보기
          </Link>
        </div>
      </header>

      {/* 개인화 배너 — hero 직후. CtaBand는 floating fixed라 페이지 맨 끝에서 호출. */}
      <HomeWelcomeBanner />

      {/* Bento 4-up — 기능 시각화. qanda 'bento card' 톤. */}
      <section className="mt-14">
        <div className="mb-6">
          <p className="text-accent-mid text-xs font-semibold tracking-wider uppercase">
            How it works
          </p>
          <h2 className="text-foreground break-keep mt-2 text-2xl font-bold md:text-3xl">
            이 데모가 보여 주는 것
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {FEATURES.map((f, i) => (
            <article
              key={f.title}
              className="border-border bg-surface relative flex flex-col overflow-hidden rounded-2xl border p-6 md:p-7"
            >
              <div className="text-subtle-foreground mb-3 text-xs font-semibold tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </div>
              <h3 className="text-foreground break-keep text-base font-semibold md:text-lg">
                {f.title}
              </h3>
              <p className="text-muted-foreground break-keep mt-2 text-sm leading-relaxed">
                {f.body}
              </p>
              <div className="mt-5 flex-1">
                <FeatureVisual kind={f.visual} />
              </div>
            </article>
          ))}
        </div>
        <p className="bg-muted text-muted-foreground mt-5 rounded-md px-3 py-2 text-xs">
          ※ 이 채점은 AI 자동 채점입니다. 학교 교사의 실제 채점과 다를 수 있습니다.
        </p>
      </section>

      {/* 통계 — 4가지 핵심 지표. qanda '학습 효과' 자리. */}
      <section className="mt-14">
        <div className="border-border bg-surface grid gap-6 rounded-2xl border p-8 sm:grid-cols-4 md:p-10">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-foreground text-3xl font-bold tabular-nums md:text-4xl">
                {s.value}
                <span className="text-muted-foreground ml-1 text-base font-medium">
                  {s.unit}
                </span>
              </div>
              <div className="text-muted-foreground mt-2 text-xs md:text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="mt-14 mb-4">
        <div className="border-border bg-surface flex flex-col items-center gap-4 rounded-2xl border p-8 text-center md:p-12">
          <h2 className="text-foreground break-keep text-xl font-bold md:text-2xl">
            지금 글을 가지고 있다면, 바로 채점받아 보세요.
          </h2>
          <p className="text-muted-foreground break-keep max-w-xl text-sm leading-relaxed">
            본문을 붙여넣고 학년·과목만 알려주시면 1분 안에 채점·첨삭·수정 가이드까지
            받아볼 수 있어요. 결과는 PDF로 저장해 선생님과 공유하기 좋아요.
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/try"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
            >
              직접 채점받기 →
            </Link>
            <Link
              href="/about"
              className="text-muted-foreground hover:text-foreground text-sm font-medium"
            >
              서비스 소개 더 보기
            </Link>
          </div>
        </div>
      </section>

      {/* Floating CTA — 페이지 마지막에 호출해야 spacer가 페이지 끝에 들어가 fixed bar가
          마지막 콘텐츠를 가리지 않음(Codex PR #66 정정). */}
      <CtaBand />
    </main>
  );
}

// Bento 카드 안 4종 시각화 — 텍스트만으로 보여주기 부족한 부분을 작은 mini-viz로.
function FeatureVisual({ kind }: { kind: (typeof FEATURES)[number]["visual"] }) {
  if (kind === "rubric") {
    // 5영역 점수 막대 mini
    const areas = [
      { name: "과제 이해", score: 17, color: "bg-band-good" },
      { name: "내용 충실도", score: 15, color: "bg-band-good" },
      { name: "구조·논리", score: 13, color: "bg-band-normal" },
      { name: "표현·문장", score: 16, color: "bg-band-good" },
      { name: "성장 가능성", score: 14, color: "bg-band-normal" },
    ];
    return (
      <div className="space-y-2">
        {areas.map((a) => (
          <div key={a.name} className="flex items-center gap-3">
            <span className="text-muted-foreground w-20 shrink-0 text-[11px]">{a.name}</span>
            <div className="bg-muted relative h-1.5 flex-1 overflow-hidden rounded-full">
              <div
                className={`${a.color} h-full rounded-full`}
                style={{ width: `${(a.score / 20) * 100}%` }}
              />
            </div>
            <span className="text-subtle-foreground w-7 shrink-0 text-right text-[11px] tabular-nums">
              {a.score}
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (kind === "coaching") {
    // 잘한 점 / 고칠 점 두 카드
    return (
      <div className="grid gap-2">
        <div className="bg-band-good-surface text-band-good-foreground rounded-lg px-3 py-2 text-[11px] leading-relaxed">
          <span className="font-semibold">잘한 점</span> · 주장과 근거의 연결이 매끄럽습니다.
        </div>
        <div className="bg-accent-mid-surface text-accent-mid rounded-lg px-3 py-2 text-[11px] leading-relaxed">
          <span className="font-semibold">고칠 점</span> · 마지막 단락에서 결론을 한 줄 더 정리해 보세요.
        </div>
      </div>
    );
  }

  if (kind === "speed") {
    // 1분 타이머 + 단계
    return (
      <div className="flex items-center gap-4">
        <div className="border-accent-mid bg-accent-mid-surface text-accent-mid flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-full border-2">
          <span className="text-xl font-bold tabular-nums leading-none">1</span>
          <span className="text-[9px] font-medium">분</span>
        </div>
        <ol className="text-muted-foreground space-y-1 text-[11px]">
          <li>1. 본문 붙여넣기</li>
          <li>2. 학년·과목 선택</li>
          <li>3. AI 채점·첨삭 받기</li>
        </ol>
      </div>
    );
  }

  // samples — 점수대 칩 5개 + 점수
  const cases = [
    { label: "저점", score: 40, cls: "bg-band-warn-surface text-band-warn-foreground" },
    { label: "편차", score: 61, cls: "bg-accent-gap-surface text-accent-gap" },
    { label: "중점", score: 74, cls: "bg-band-normal-surface text-band-normal-foreground" },
    { label: "중상", score: 85, cls: "bg-accent-mid-surface text-accent-mid" },
    { label: "고점", score: 86, cls: "bg-band-good-surface text-band-good-foreground" },
  ];
  return (
    <div className="space-y-1.5">
      {cases.map((c) => (
        <div key={c.label} className={`${c.cls} flex items-center justify-between rounded-md px-3 py-1.5 text-[11px] font-semibold`}>
          <span>{c.label}</span>
          <span className="tabular-nums">{c.score} / 100</span>
        </div>
      ))}
    </div>
  );
}
