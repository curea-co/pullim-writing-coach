// /about — 서비스 소개 (정적 페이지, LNB 진입).
//   "무엇·어떻게·누구·데이터·한계" 5섹션. 학생/교사가 한 화면에서 mental model 정착.
//   서버 컴포넌트 — 상태 없음, SSG/prerender. #19 TrustLabel과 톤 일치(중립·격려).
//   2026-05-29 LNB 추가 시 신규.

import Link from "next/link";
import type { Metadata } from "next";
import Breadcrumb from "../components/Breadcrumb";

export const metadata: Metadata = {
  title: "서비스 소개 — Pullim Writing Coach",
  description:
    "Pullim Writing Coach는 학생 글을 AI가 5가지 기준(과제 이해·내용 충실도·구조·논리·표현·문장·성장 가능성)으로 첨삭해 주는 글쓰기 도구예요.",
};

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 py-8 md:py-12">
      <Breadcrumb items={[{ label: "홈", href: "/" }, { label: "서비스 소개" }]} />

      <header className="mb-10">
        <h1 className="text-foreground break-keep text-2xl font-bold tracking-tight md:text-3xl">
          Pullim Writing Coach
        </h1>
        <p className="text-muted-foreground break-keep mt-3 text-base leading-relaxed">
          수행평가 글을 AI가 5가지 기준으로 첨삭해 주는 글쓰기 도구예요.
        </p>
      </header>

      <Section title="무엇을 해 주나요?">
        <p>
          학생이 쓴 글을 붙여넣으면 1분 안에 5영역 루브릭 기준으로 채점하고,
          영역별 잘한 점·고칠 점과 우선순위 가이드를 보여줘요. 결과는 PDF·스크린샷으로
          저장해 선생님과 공유할 수 있어요.
        </p>
      </Section>

      <Section title="어떻게 작동하나요?">
        <ol className="ml-1 list-decimal space-y-2 pl-5">
          <li>학교·학년, 과목, 장르, 과제 내용을 입력해요.</li>
          <li>학생이 쓴 글 전체를 그대로 붙여넣어요.</li>
          <li>AI가 5영역 루브릭으로 채점해 영역 점수·피드백·수정 가이드를 만들어요.</li>
          <li>결과 화면에서 첨삭·점수 설명 토글·수정 전/후 비교를 확인해요.</li>
        </ol>
        <p className="text-subtle-foreground mt-3 text-sm">
          5영역: <strong className="text-foreground">과제 이해 · 내용 충실도 · 구조·논리 · 표현·문장 · 성장 가능성</strong>.
          각 영역 20점 만점, 총 100점.
        </p>
      </Section>

      <Section title="누구를 위한 도구인가요?">
        <ul className="ml-1 list-disc space-y-2 pl-5">
          <li>
            <strong className="text-foreground">학생</strong> — 수행평가 글을 제출 전에 스스로 점검하고
            방향을 잡고 싶을 때.
          </li>
          <li>
            <strong className="text-foreground">교사</strong> — 다수 학생 글을 검토하기 전 1차
            검토와 고칠 방향 정리.
          </li>
        </ul>
      </Section>

      <Section title="데이터는 어떻게 다뤄지나요?">
        <ul className="ml-1 list-disc space-y-2 pl-5">
          <li>
            프로필(닉네임·학년·과목·학교명), 본문 임시 저장본, 수정 이력, 채점 결과(최대 20건),
            자주 쓰는 메타는 모두 <strong className="text-foreground">학생 기기의 브라우저 저장소</strong>에만
            남아요. 서버에 전송·저장하지 않아요.
          </li>
          <li>
            채점 요청 시 본문은 AI 모델 호출을 위해 일시 전송되며 저장하지 않아요.
          </li>
          <li>
            <Link href="/me" className="text-primary underline-offset-2 hover:underline">내 정보</Link>에서
            언제든 저장된 모든 데이터를 한 번에 삭제할 수 있어요.
          </li>
        </ul>
      </Section>

      <Section title="알아 두세요 — AI 채점의 한계">
        <div className="border-accent-mid-surface bg-accent-mid-surface rounded-xl border p-4">
          <p className="text-foreground break-keep text-sm font-semibold">
            AI가 본 한 가지 시선이에요
          </p>
          <p className="text-muted-foreground break-keep mt-2 text-sm leading-relaxed">
            5영역 루브릭은 객관적인 기준이지만, 표현·맥락·의도 같은 섬세한 판단은
            담임·교과 선생님의 시선이 함께 있을 때 가장 정확해요. 절대 점수가 아니라
            글을 읽는 방향을 제안하는 도구로 활용해 주세요.
          </p>
        </div>
      </Section>

      {/* P1-#11 부모 도메인 링크 — Pullim 프로젝트의 일부임을 명시(2026-06-02). */}
      <Section title="함께하는 프로젝트">
        <p>
          Pullim Writing Coach는 학생의 학습을 돕는{" "}
          <strong className="text-foreground">Pullim 프로젝트</strong>의 일부예요.
          전체 비전과 다른 도구는 메인 사이트에서 확인할 수 있어요.
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
        <Link
          href="/"
          className="text-muted-foreground hover:text-foreground text-sm"
        >
          ← 홈으로
        </Link>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-foreground break-keep mb-3 text-lg font-semibold">{title}</h2>
      <div className="text-foreground break-keep space-y-2 text-sm leading-relaxed">
        {children}
      </div>
    </section>
  );
}
