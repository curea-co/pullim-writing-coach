// Pullim Writing Coach — 닫는 CTA 밴드 (2026-06-05: floating bottom으로 전환)
//   스크롤 내려도 항상 viewport 하단에 고정 노출 → 사용자가 어디서든 1-click으로 /try 진입.
//   호출하는 페이지에만 spacer 자동 삽입 → 호출 안 하는 페이지(/try 등)는 영향 0.
//   sidebar(데스크톱 w-60) 너비만큼 left offset, 모바일은 full width.

import Link from "next/link";

export default function CtaBand({
  title = "직접 쓴 글로 채점받아 보세요",
  description = "과제 정보와 글을 넣으면 AI Coach가 5영역으로 첨삭해 드려요.",
  href = "/try",
  cta = "직접 채점받기",
}: {
  title?: string;
  description?: string;
  href?: string;
  cta?: string;
}) {
  return (
    <>
      {/* 정상 흐름의 spacer — fixed bar에 가려질 만큼 페이지 끝에 여백 확보.
          CtaBand 호출 안 하는 페이지는 spacer도 없음(컴포넌트 호출 자체가 트리거). */}
      <div aria-hidden className="h-32 md:h-24" />
      <section
        className="border-border bg-zinc-700 fixed right-0 bottom-0 left-0 z-30 flex flex-col items-start gap-3 border-t px-5 py-4 text-white shadow-2xl md:left-60 md:flex-row md:items-center md:justify-between md:gap-4 md:px-8 md:py-5"
        role="complementary"
        aria-label="채점 받기 안내"
      >
        <div>
          <h2 className="text-base font-bold tracking-tight md:text-lg">{title}</h2>
          <p className="mt-0.5 text-xs opacity-90 md:text-sm">{description}</p>
        </div>
        <Link
          href={href}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:opacity-90"
        >
          {cta}
          <span aria-hidden>→</span>
        </Link>
      </section>
    </>
  );
}
