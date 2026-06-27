// /about — 서비스 소개. 실제 화면 캡처 + 기능별·페이지별 상세 안내.
//   서버 컴포넌트 — 상태 없음, SSG/prerender. 캡처는 public/screens/*.
//   기능 블록(스크린샷+상세) → 페이지 안내 → 채점 기준 → 데이터·한계·프로젝트.

import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import Breadcrumb from "../components/Breadcrumb";

export const metadata: Metadata = {
  title: "서비스 소개 — Pullim Writing Coach",
  description:
    "Pullim Writing Coach는 학생 글을 AI가 5가지 기준(과제 이해·내용 충실도·구조·논리·표현·문장·성장 가능성)으로 채점·코치해 주는 글쓰기 도구예요. 직접 채점·과정 코치·샘플 결과를 실제 화면으로 소개해요.",
};

type Feature = {
  tag: string;
  title: string;
  href: string;
  lead: string;
  points: string[];
  shot: { src: string; w: number; h: number; alt: string };
};

const FEATURES: Feature[] = [
  {
    tag: "실시간",
    title: "직접 채점받기",
    href: "/try",
    lead: "글을 붙여넣으면 1분 안에 5영역으로 채점하고, 영역별 잘한 점·고칠 점과 수정 가이드를 보여줘요.",
    points: [
      "단계별 위저드 — 과제 정보(학년·과목·장르·안내) → 글 입력 → 결과까지 한 흐름.",
      "5영역 점수와 영역별 진단·우선순위, 수정 전/후 비교를 한 화면에서 확인.",
      "결과는 PDF·스크린샷으로 저장해 선생님과 공유.",
    ],
    shot: { src: "/screens/try.png", w: 672, h: 1009, alt: "직접 채점받기 — 글 입력 위저드 화면" },
  },
  {
    tag: "베타",
    title: "과정 코치",
    href: "/coach",
    lead: "결과가 아니라 '과정'을 코치해요. 학생이 직접 쓰고, 코치는 답을 주지 않고 질문으로 끌어내요(대필 0).",
    points: [
      "세 가지 작성 모드 — 자유 쓰기 · 가이드(질문 따라) · 개요 먼저.",
      "리치 에디터 캔버스에서 쓰고 [봐줘]로 점검 → 우선순위 넛지 한 호흡씩.",
      "고칠수록 영역 막대가 차고, 고쳐쓰기 과정이 성취 서사(돌파 배지·과정 타임라인·공유 카드)로 남아요.",
    ],
    shot: { src: "/screens/coach.png", w: 432, h: 626, alt: "과정 코치 — 작성 캔버스 화면" },
  },
  {
    tag: "미리보기",
    title: "샘플·결과 조회",
    href: "/samples",
    lead: "점수대별 5케이스로 채점 분포를 미리 보고, 내가 받은 채점 결과는 다시 꺼내 볼 수 있어요.",
    points: [
      "중·고등학생 글 5종(40~86점) 고정 anchor로 채점 결과 미리보기.",
      "영역별 점수 막대와 구간(토대 보강~보완하면 좋은 글)을 시각화.",
      "내 채점 결과는 기기에 최대 20건 저장 — /results에서 다시 보기.",
    ],
    shot: { src: "/screens/samples.png", w: 680, h: 955, alt: "샘플 채점 결과 — 5케이스 목록 화면" },
  },
];

const PAGES: { path: string; name: string; what: string }[] = [
  { path: "/", name: "홈", what: "서비스 한눈에 보기 + 바로 시작 타일." },
  { path: "/try", name: "직접 채점받기", what: "글 붙여넣고 1분 채점·첨삭(위저드)." },
  { path: "/coach", name: "과정 코치", what: "직접 쓰며 단계별 코칭받기(대필 0)." },
  { path: "/samples", name: "샘플 채점 결과", what: "점수대 5케이스 채점 결과 미리보기." },
  { path: "/results", name: "채점 결과 조회", what: "저장된 내 채점 결과 다시 보기." },
  { path: "/me", name: "내 정보", what: "프로필·사용 현황, 저장 데이터 일괄 삭제." },
  { path: "/about", name: "서비스 소개", what: "지금 이 페이지 — 기능·데이터·한계 안내." },
];

export default function AboutPage() {
  return (
    <main className="w-full max-w-3xl px-4 py-6 md:px-5 md:py-12">
      <Breadcrumb items={[{ label: "홈", href: "/" }, { label: "서비스 소개" }]} />

      <header className="mb-10">
        <h1 className="text-foreground break-keep text-2xl font-bold tracking-tight md:text-3xl">
          Pullim Writing Coach
        </h1>
        <p className="text-muted-foreground break-keep mt-3 text-base leading-relaxed">
          수행평가 글을 AI가 5가지 기준으로 채점·코치해 주는 글쓰기 도구예요. 결과가 아니라{" "}
          <strong className="text-foreground">과정</strong>을 돕고, 글은 전부 학생이 직접 써요(대필 0).
        </p>
      </header>

      {/* 기능 소개 — 실제 화면 캡처 + 상세 */}
      <section className="mb-12">
        <h2 className="text-foreground mb-5 text-lg font-semibold">무엇을 할 수 있나요?</h2>
        <div className="space-y-6">
          {FEATURES.map((f) => (
            <FeatureBlock key={f.href} feature={f} />
          ))}
        </div>
      </section>

      {/* 페이지 안내 */}
      <Section title="페이지 안내">
        <div className="border-border overflow-hidden rounded-xl border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-3.5 py-2.5 font-semibold">페이지</th>
                <th className="px-3.5 py-2.5 font-semibold">무엇을 하나요</th>
              </tr>
            </thead>
            <tbody>
              {PAGES.map((p) => (
                <tr key={p.path} className="border-border border-t">
                  <td className="px-3.5 py-2.5 align-top">
                    <Link href={p.path} className="text-primary font-semibold underline-offset-2 hover:underline">
                      {p.name}
                    </Link>
                    <span className="text-subtle-foreground ml-1.5 font-mono text-[11px]">{p.path}</span>
                  </td>
                  <td className="text-foreground px-3.5 py-2.5 align-top">{p.what}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="채점 5영역 (rubric v0.5)">
        <ul className="ml-1 list-disc space-y-1.5 pl-5">
          <li><strong className="text-foreground">과제 이해</strong> — 과제 조건·질문에 정확히 답했는가</li>
          <li><strong className="text-foreground">내용 충실도</strong> — 근거·예시·배경지식이 충분한가</li>
          <li><strong className="text-foreground">구조·논리</strong> — 서론-본론-결론·문단 연결·전개가 자연스러운가</li>
          <li><strong className="text-foreground">표현·문장</strong> — 문장 호흡·어휘·맞춤법·표현 다양성이 적절한가</li>
          <li><strong className="text-foreground">성장 가능성</strong> — 한 번의 수정으로 완성도가 오를 수 있는 상태인가</li>
        </ul>
        <p className="text-subtle-foreground mt-3 text-sm">각 영역 0~20점, 총 100점. 색상: 0~9 주의 / 10~14 보통 / 15~20 양호.</p>
      </Section>

      <Section title="데이터는 어떻게 다뤄지나요?">
        <ul className="ml-1 list-disc space-y-2 pl-5">
          <li>
            프로필(닉네임·학년·과목·학교명), 본문 임시 저장본, 수정 이력, 채점 결과(최대 20건),
            자주 쓰는 메타는 모두 <strong className="text-foreground">학생 기기의 브라우저 저장소</strong>에만
            남아요. 서버에 전송·저장하지 않아요.
          </li>
          <li>채점·코치 요청 시 본문은 AI 모델 호출을 위해 일시 전송되며 저장하지 않아요.</li>
          <li>
            <Link href="/me" className="text-primary underline-offset-2 hover:underline">내 정보</Link>에서
            언제든 저장된 모든 데이터를 한 번에 삭제할 수 있어요.
          </li>
        </ul>
      </Section>

      <Section title="알아 두세요 — AI 채점의 한계">
        <div className="border-accent-mid-surface bg-accent-mid-surface rounded-xl border p-4">
          <p className="text-foreground break-keep text-sm font-semibold">AI가 본 한 가지 시선이에요</p>
          <p className="text-muted-foreground break-keep mt-2 text-sm leading-relaxed">
            5영역 루브릭은 객관적인 기준이지만, 표현·맥락·의도 같은 섬세한 판단은
            담임·교과 선생님의 시선이 함께 있을 때 가장 정확해요. 절대 점수가 아니라
            글을 읽는 방향을 제안하는 도구로 활용해 주세요.
          </p>
        </div>
      </Section>

      <Section title="함께하는 프로젝트">
        <p>
          Pullim Writing Coach는 학생의 학습을 돕는{" "}
          <strong className="text-foreground">Pullim 프로젝트</strong>의 일부예요. 전체 비전과 다른 도구는
          메인 사이트에서 확인할 수 있어요.
        </p>
        <a
          href="https://pullim.ai/"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary mt-3 inline-flex items-center gap-1 text-sm font-semibold underline-offset-2 hover:underline"
        >
          Pullim 프로젝트 소개 <span aria-hidden>↗</span>
        </a>
      </Section>

      <div className="mt-12 flex flex-wrap items-center gap-3">
        <Link
          href="/try"
          className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          직접 채점받기 →
        </Link>
        <Link href="/coach" className="text-muted-foreground hover:text-foreground text-sm font-medium">
          과정 코치 체험 →
        </Link>
        <Link href="/" className="text-muted-foreground hover:text-foreground text-sm">
          ← 홈으로
        </Link>
      </div>
    </main>
  );
}

function FeatureBlock({ feature }: { feature: Feature }) {
  return (
    <article className="border-border bg-surface grid gap-5 rounded-2xl border p-5 sm:grid-cols-[1fr_240px] sm:items-start">
      <div className="order-2 sm:order-1">
        <div className="flex items-center gap-2">
          <span className="bg-accent-mid-surface text-primary rounded-full px-2 py-0.5 text-[11px] font-bold">
            {feature.tag}
          </span>
          <h3 className="text-foreground text-lg font-bold tracking-tight">{feature.title}</h3>
        </div>
        <p className="text-foreground mt-2 break-keep text-sm leading-relaxed">{feature.lead}</p>
        <ul className="text-muted-foreground mt-3 space-y-1.5 text-[13px] leading-relaxed">
          {feature.points.map((p) => (
            <li key={p} className="break-keep pl-4 -indent-4 before:font-bold before:content-['·_']">
              {p}
            </li>
          ))}
        </ul>
        <Link
          href={feature.href}
          className="text-primary mt-3.5 inline-flex items-center gap-1 text-sm font-semibold underline-offset-2 hover:underline"
        >
          {feature.title} 보기 →
        </Link>
      </div>
      <div className="border-border bg-muted order-1 overflow-hidden rounded-xl border sm:order-2">
        <Image
          src={feature.shot.src}
          width={feature.shot.w}
          height={feature.shot.h}
          alt={feature.shot.alt}
          className="h-auto w-full"
          sizes="(max-width: 640px) 100vw, 240px"
        />
      </div>
    </article>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-foreground break-keep mb-3 text-lg font-semibold">{title}</h2>
      <div className="text-foreground break-keep space-y-2 text-sm leading-relaxed">{children}</div>
    </section>
  );
}
