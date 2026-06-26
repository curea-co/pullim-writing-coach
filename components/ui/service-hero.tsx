import * as React from "react";
import { cn } from "@/lib/cn";

export interface ServiceHeroProps {
  icon?: React.ReactNode;
  title: string;
  tagline?: string;
  badges?: React.ReactNode;
  cta?: React.ReactNode;
  className?: string;
  /** 우측에 깔리는 장식 레이어(예: 3D 모션). 콘텐츠는 그 위(z-10)에 렌더되고 overflow-hidden로 클립된다. */
  decoration?: React.ReactNode;
}

export function ServiceHero({ icon, title, tagline, badges, cta, className, decoration }: ServiceHeroProps) {
  return (
    <section
      className={cn(
        "relative mb-7 overflow-hidden rounded-[var(--radius-xl)] p-[clamp(20px,4vw,40px)] text-white",
        className,
      )}
      style={{ background: "linear-gradient(135deg, var(--color-primary-700), var(--color-primary-900))" }}
    >
      {decoration}
      <div className="relative z-10">
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
      </div>
    </section>
  );
}
