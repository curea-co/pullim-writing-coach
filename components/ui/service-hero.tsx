import * as React from "react";
import { cn } from "@/lib/cn";

export interface ServiceHeroProps {
  icon?: React.ReactNode;
  title: string;
  tagline?: string;
  badges?: React.ReactNode;
  cta?: React.ReactNode;
  className?: string;
}

export function ServiceHero({ icon, title, tagline, badges, cta, className }: ServiceHeroProps) {
  return (
    <section
      className={cn(
        "mb-7 overflow-hidden rounded-[var(--radius-xl)] p-[clamp(28px,4vw,40px)] text-white",
        className,
      )}
      style={{ background: "linear-gradient(135deg, var(--color-primary-700), var(--color-primary-900))" }}
    >
      {(icon || badges) && (
        <div className="mb-4 flex items-center gap-[14px]">
          {icon}
          {badges && <div className="flex items-center gap-1.5">{badges}</div>}
        </div>
      )}
      <h1 className="mb-2.5 text-[clamp(26px,4vw,34px)] font-extrabold leading-[1.15] tracking-[-.04em]">
        {title}
      </h1>
      {tagline && <p className="max-w-[560px] text-[15px] leading-[1.5] text-white/85">{tagline}</p>}
      {cta && <div className="mt-5">{cta}</div>}
    </section>
  );
}
