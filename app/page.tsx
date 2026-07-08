import Link from "next/link";
import HomeWelcomeBanner from "./components/HomeWelcomeBanner";
import HeroMotion3D from "./components/HeroMotion3D";
import TileGlyph3D from "./components/TileGlyph3D";
import { IconPen, IconRoute, IconChart, IconArchive } from "./components/tile-icons";
import { ServiceHero } from "@/components/ui/service-hero";
import { ServiceIcon } from "@/components/ui/service-icon";
import { SectionHead } from "@/components/ui/section-head";
import { ServiceTile } from "@/components/ui/service-tile";
import { StatCard, Card, CardTitle, CardDescription } from "@/components/ui/card";

// 대시보드 홈(2026-06-24) — OS/classbot 스타일 재편.
//   ServiceHero → HomeWelcomeBanner → 바로 시작(ServiceTile 4-up)
//   → 한눈에(StatCard 4-up) → 어떻게 채점하나요(Card+FeatureVisual 4-up) + disclaimer
//   → 닫는 CTA → CtaBand

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
    body: "상 · 중상 · 중 · 중하 · 하 — 점수대마다 채점 결과가 어떻게 나오는지 샘플 글 5종으로 시연해요.",
    visual: "samples",
  },
] as const;

// 통계 — 핵심 지표 4가지.
const STATS = [
  { value: "5", unit: "영역", label: "루브릭 기준" },
  { value: "100", unit: "점 만점", label: "총점 환산" },
  { value: "1", unit: "분", label: "채점 + 첨삭" },
  { value: "5", unit: "케이스", label: "점수대 샘플" },
];

// 바로 시작 타일
const TILES = [
  {
    title: "직접 채점받기",
    description: "글 붙여넣고 1분 안에 5영역 채점·첨삭",
    href: "/try",
    cta: "실시간",
    icon: <IconPen />,
  },
  {
    title: "과정 코치",
    description: "개요→본문 단계별 코칭",
    href: "/coach",
    cta: "베타",
    icon: <IconRoute />,
  },
  {
    title: "샘플 채점 결과",
    description: "점수대 5케이스 미리보기",
    href: "/samples",
    icon: <IconChart />,
  },
  {
    title: "채점 결과 조회",
    description: "저장된 채점 결과 다시 보기",
    href: "/results",
    icon: <IconArchive />,
  },
];

export default function Home() {
  return (
    <main className="w-full max-w-5xl px-4 py-6 md:px-5 md:py-12">
      {/* 1. ServiceHero — 우측에 순수 CSS 3D 모션(글 시트) 데코 */}
      <ServiceHero
        icon={<ServiceIcon name="writing" size={56} />}
        title="라이팅 코치"
        tagline="학생이 쓴 글을 1분 안에 5영역으로 채점하고, 잘한 점·고칠 점·수정 가이드를 코칭 말투로 보여줘요."
        decoration={<HeroMotion3D />}
        cta={
          <Link
            href="/try"
            className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
          >
            직접 채점받기 →
          </Link>
        }
      />

      {/* 2. 개인화 배너 — 프로필 인지 기능 보존, storage 로직 무수정 */}
      <HomeWelcomeBanner />

      {/* 3. 바로 시작 — ServiceTile 2×2 그리드 */}
      <SectionHead title="바로 시작" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TILES.map((tile) => (
          <ServiceTile
            key={tile.href}
            title={tile.title}
            description={tile.description}
            href={tile.href}
            cta={tile.cta}
            glyph={<TileGlyph3D icon={tile.icon} />}
          />
        ))}
      </div>

      {/* 4. 한눈에 — StatCard 4-up */}
      <SectionHead title="한눈에" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((s) => (
          <StatCard
            key={s.label}
            label={s.label}
            value={
              <>
                {s.value}
                <span className="ml-1 text-[length:var(--text-base)] font-medium text-[var(--text-secondary)]">
                  {s.unit}
                </span>
              </>
            }
          />
        ))}
      </div>

      {/* 5. 어떻게 채점하나요 — Card+FeatureVisual 4-up + disclaimer */}
      <SectionHead title="어떻게 채점하나요" />
      <div className="grid gap-4 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <Card key={f.title} className="flex flex-col">
            <CardTitle className="mb-2">{f.title}</CardTitle>
            <CardDescription className="mb-5">{f.body}</CardDescription>
            <div className="mt-auto">
              <FeatureVisual kind={f.visual} />
            </div>
          </Card>
        ))}
      </div>
      <p className="bg-muted text-muted-foreground mt-5 rounded-md px-3 py-2 text-xs">
        ※ 이 채점은 AI 자동 채점입니다. 학교 교사의 실제 채점과 다를 수 있습니다.
      </p>

      {/* 6. 닫는 CTA */}
      <div className="mt-8 mb-4">
        <Card className="flex flex-col items-start gap-4 p-8 text-left md:p-12">
          <CardTitle className="break-keep text-xl md:text-2xl">
            지금 글을 가지고 있다면, 바로 채점받아 보세요.
          </CardTitle>
          <CardDescription className="max-w-xl text-sm">
            본문을 붙여넣고 학년·과목만 알려주시면 1분 안에 채점·첨삭·수정 가이드까지 받아볼 수 있어요.
            결과는 PDF로 저장해 선생님과 공유하기 좋아요.
          </CardDescription>
          <div className="mt-2 flex flex-wrap items-center justify-start gap-3">
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
        </Card>
      </div>

      {/* Floating CTA — 페이지 마지막에 호출해야 spacer가 페이지 끝에 들어가 fixed bar가
          마지막 콘텐츠를 가리지 않음(Codex PR #66 정정). */}
    </main>
  );
}

// Bento 카드 안 4종 시각화 — 텍스트만으로 보여주기 부족한 부분을 작은 mini-viz로.
// 도메인 토큰(--band-*/--accent-*) 유지.
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
    { label: "하", score: 40, cls: "bg-band-warn-surface text-band-warn-foreground" },
    { label: "중하", score: 61, cls: "bg-accent-gap-surface text-accent-gap" },
    { label: "중", score: 74, cls: "bg-band-normal-surface text-band-normal-foreground" },
    { label: "중상", score: 85, cls: "bg-accent-mid-surface text-accent-mid" },
    { label: "상", score: 86, cls: "bg-band-good-surface text-band-good-foreground" },
  ];
  return (
    <div className="space-y-1.5">
      {cases.map((c) => (
        <div
          key={c.label}
          className={`${c.cls} flex items-center justify-between rounded-md px-3 py-1.5 text-[11px] font-semibold`}
        >
          <span>{c.label}</span>
          <span className="tabular-nums">{c.score} / 100</span>
        </div>
      ))}
    </div>
  );
}
