"use client";

// 헤더 서비스 전환 드롭다운 — 풀림 OS(pullim-web ServiceSwitcher) 이식.
//   OS는 os-tokens.css(.switcher-*)로 스타일하지만 writing-coach엔 그 토큰이 없어, 기존 헤더
//   아바타 드롭다운과 동일한 Tailwind(하드코딩 hex = OS 토큰 정합)로 자립 구현한다.
//   아이콘은 인라인 SVG(ServiceIcon) — 아이콘 파일/next Image·dangerouslyAllowSVG 불필요.
//   외부 클릭·Escape 닫기는 HeaderActions 아바타 메뉴와 동형.

import { useEffect, useRef, useState } from "react";
import { ServiceIcon } from "@/components/ui/service-icon";
import { osHubUrl } from "@/app/lib/pullim-login";
import { CURRENT_SLUG, switcherServices } from "@/app/lib/pullim-services";

export default function ServiceSwitcher() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const services = switcherServices();
  const current = services.find((s) => s.slug === CURRENT_SLUG);

  // 외부 클릭·Escape로 닫기(HeaderActions 아바타 메뉴 정합).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  return (
    <div ref={ref} className="relative ml-0.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="서비스 전환"
        title="서비스 전환"
        className="flex h-[38px] items-center gap-1.5 rounded-[11px] border border-[var(--line,#e6eaf0)] bg-white pl-1.5 pr-2 text-[#45555c] transition-colors hover:border-[#bcd7f7] hover:bg-[var(--surface-sunken,#eef1f6)]"
      >
        <span className="flex h-[26px] w-[26px] items-center justify-center overflow-hidden rounded-[8px]">
          <ServiceIcon name={current?.icon ?? "pullim"} size={26} />
        </span>
        <span className="hidden text-[13px] font-bold tracking-[-0.02em] text-[var(--text-primary,#1a1f27)] sm:inline">
          {current?.name ?? "서비스"}
        </span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div role="listbox" aria-label="서비스 전환" className="absolute right-0 top-[calc(100%+8px)] z-[120] w-[min(330px,92vw)] overflow-hidden rounded-[14px] border border-[var(--line,#e6eaf0)] bg-[var(--surface,#fff)] p-1.5 shadow-[0_8px_28px_rgba(13,26,31,.14)]">
          <div className="px-2.5 pb-1.5 pt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary,#8a94a3)]">
            서비스 전환
          </div>

          {/* OS 홈 */}
          <a
            href={osHubUrl()}
            role="option"
            aria-selected={false}
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 rounded-[12px] p-2.5 no-underline transition-colors hover:bg-[var(--surface-sunken,#eef1f6)]"
          >
            <span className="grid h-[34px] w-[34px] flex-none place-items-center rounded-[10px] bg-[var(--color-action-primary)] text-[15px] text-white" aria-hidden="true">⌂</span>
            <div className="min-w-0">
              <div className="text-[14px] font-bold tracking-[-0.02em] text-[var(--text-primary,#1a1f27)]">OS 홈</div>
              <div className="text-[12px] text-[var(--text-tertiary,#8a94a3)]">{services.length}개 서비스 한 곳에서</div>
            </div>
          </a>

          {/* 서비스 항목 */}
          {services.map((svc) => {
            const isCurrent = svc.slug === CURRENT_SLUG;
            return (
              <a
                key={svc.slug}
                href={svc.href}
                role="option"
                aria-selected={isCurrent}
                aria-current={isCurrent ? "page" : undefined}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-[12px] p-2.5 no-underline transition-colors ${isCurrent ? "bg-[#f4faff]" : "hover:bg-[var(--surface-sunken,#eef1f6)]"}`}
              >
                <span className="grid h-[34px] w-[34px] flex-none place-items-center overflow-hidden rounded-[10px]">
                  <ServiceIcon name={svc.icon} size={34} />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 text-[14px] font-bold tracking-[-0.02em] text-[var(--text-primary,#1a1f27)]">
                    {svc.name}
                    {isCurrent && (
                      <span className="rounded-full bg-[#e6f1ff] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#0362da]">현재</span>
                    )}
                  </div>
                  <div className="truncate text-[12px] text-[var(--text-tertiary,#8a94a3)]">{svc.desc}</div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
