// Pullim Writing Coach — 닫는 CTA 밴드
//   레퍼런스의 페이지 하단 "닫는 CTA 밴드"("엔진은 라이선스로…") 패턴 차용. 서버 컴포넌트.
//   색·폰트는 기존 토큰(bg-primary/foreground) 재사용. 라이브 채점(/try)으로 유도.

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
    <section className="bg-primary text-primary-foreground mt-12 flex flex-col items-start gap-4 rounded-2xl px-6 py-7 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-lg font-bold tracking-tight md:text-xl">{title}</h2>
        <p className="mt-1 text-sm opacity-90">{description}</p>
      </div>
      <Link
        href={href}
        className="bg-primary-foreground text-primary inline-flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-semibold transition hover:opacity-90"
      >
        {cta}
        <span aria-hidden>→</span>
      </Link>
    </section>
  );
}
