// Pullim Writing Coach — 계층 브레드크럼 (depth 명시)
//   레퍼런스의 "명확한 2-depth 계층" 패턴 차용. 서버 컴포넌트(훅 없음).
//   마지막 항목(현재 위치)은 링크 없이 강조.

import Link from "next/link";

export type Crumb = { label: string; href?: string };

export default function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="현재 위치" className="mb-6">
      <ol className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm">
        {items.map((c, i) => {
          const last = i === items.length - 1;
          return (
            <li key={i} className="flex items-center gap-1.5">
              {c.href && !last ? (
                <Link href={c.href} className="hover:text-foreground transition">
                  {c.label}
                </Link>
              ) : (
                <span
                  className={last ? "text-foreground font-medium" : undefined}
                  aria-current={last ? "page" : undefined}
                >
                  {c.label}
                </span>
              )}
              {!last && (
                <span className="text-subtle-foreground" aria-hidden>
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
