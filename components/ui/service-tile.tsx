import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

export interface ServiceTileProps {
  title: string;
  description: string;
  href: string;
  glyph?: React.ReactNode;
  cta?: string;
  soon?: boolean;
  className?: string;
}

export function ServiceTile({
  title,
  description,
  href,
  glyph,
  cta = "바로가기",
  soon = false,
  className,
}: ServiceTileProps) {
  const sharedClassName = cn(
    "group relative flex min-h-[188px] flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--border-default)] bg-[var(--surface-raised)] p-[22px] text-inherit no-underline transition-transform duration-200",
    soon
      ? "pointer-events-none bg-[var(--surface-sunken)]"
      : "hover:-translate-y-1 hover:border-transparent hover:shadow-[var(--shadow-lg)]",
    className,
  );

  const content = (
    <>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-[.12]"
        style={{
          background:
            "radial-gradient(360px 160px at 80% -10%, var(--color-action-primary), transparent 70%)",
        }}
      />
      <div className="relative flex items-center justify-between">
        <span
          className={cn(
            "grid h-[46px] w-[46px] place-items-center overflow-hidden rounded-[var(--radius-md)] text-white shadow-[inset_0_0_0_2px_rgba(255,255,255,.2)]",
            soon ? "bg-[var(--text-tertiary)]" : "bg-[var(--color-action-primary)]",
          )}
        >
          {glyph}
        </span>
      </div>
      <h3 className="relative mt-4 text-[18px] font-extrabold tracking-[-.03em]">
        {title}
      </h3>
      <p className="relative mt-[7px] flex-1 text-[13px] leading-[1.5] text-[var(--text-secondary)]">
        {description}
      </p>
      <div
        className={cn(
          "relative mt-4 flex items-center justify-between text-[13px] font-bold",
          soon ? "text-[var(--text-tertiary)]" : "text-[var(--color-primary-800)]",
        )}
      >
        <span>{cta}</span>
        <span className="grid h-[30px] w-[30px] place-items-center rounded-[var(--radius-full)] bg-[var(--color-action-secondary)] text-[var(--color-primary-800)] transition-transform duration-200 group-hover:translate-x-[3px]">
          →
        </span>
      </div>
    </>
  );

  if (soon) {
    return (
      <div className={sharedClassName} aria-disabled="true">
        {content}
      </div>
    );
  }

  return (
    <Link href={href} className={sharedClassName}>
      {content}
    </Link>
  );
}
