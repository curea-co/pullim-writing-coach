// Pullim Writing Coach — 닫는 CTA 밴드
//   레퍼런스의 페이지 하단 "닫는 CTA 밴드"("엔진은 라이선스로…") 패턴 차용. 서버 컴포넌트.
//   배경: zinc-700(진한 회색 ~75%). 기존 bg-primary는 너무 어두워 사용자 피드백 반영(2026-05-29).

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
    <section className="mt-12 flex flex-col items-start gap-4 rounded-2xl bg-zinc-700 px-6 py-7 text-white md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-lg font-bold tracking-tight md:text-xl">{title}</h2>
        <p className="mt-1 text-sm opacity-90">{description}</p>
      </div>
      <Link
        href={href}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 transition hover:opacity-90"
      >
        {cta}
        <span aria-hidden>→</span>
      </Link>
    </section>
  );
}
