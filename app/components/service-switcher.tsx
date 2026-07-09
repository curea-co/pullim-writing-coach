"use client";

// 헤더 서비스 전환 드롭다운 — 풀림 OS(pullim-web ServiceSwitcher) 이식.
//   OS는 os-tokens.css(.switcher-*)로 스타일하지만 writing-coach엔 그 토큰이 없어, 기존 헤더
//   아바타 드롭다운과 동일한 Tailwind(하드코딩 hex = OS 토큰 정합)로 자립 구현한다.
//   아이콘은 인라인 SVG(ServiceIcon) — 아이콘 파일/next Image·dangerouslyAllowSVG 불필요.
//   외부 클릭·Escape 닫기는 HeaderActions 아바타 메뉴와 동형.

import { useEffect, useId, useRef, useState } from "react";
import { ServiceIcon } from "@/components/ui/service-icon";
import { osHubUrl } from "@/app/lib/pullim-login";
import { CURRENT_SLUG, switcherServices } from "@/app/lib/pullim-services";

export default function ServiceSwitcher() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();
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
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="서비스 전환"
        title="서비스 전환"
        className="flex h-[38px] items-center gap-1.5 rounded-[11px] border border-[var(--line,#e6eaf0)] bg-white pl-1.5 pr-2 text-[#45555c] transition-colors hover:border-[#bcd7f7] hover:bg-[var(--surface-sunken,#eef1f6)]"
      >
        <span className="flex h-[26px] w-[26px] items-center justify-center overflow-hidden rounded-[8px]">
          <ServiceIcon name={current?.icon ?? "pullim"} size={26} />
        </span>
        {/* 현재 서비스명 — OS 스위처 트리거(.sn) 정합: 아이콘+이름+셰브론. 브랜드 sub 배지는 제거(중복).
            초협폭(<380px)은 숨김 — 옛 배지의 min-[380px] 규칙 승계(우측 버튼과 수평 overflow 방지, #125). */}
        <span className="hidden whitespace-nowrap text-[13px] font-bold tracking-[-0.02em] text-[var(--text-primary,#1a1f27)] min-[380px]:inline">
          {current?.name ?? "서비스"}
        </span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        // 실제 동작은 '링크 목록'이라 listbox/option 대신 nav+링크로 둔다(Codex #135): listbox는 화살표 이동·
        //   roving tabindex·active descendant를 기대시키는데 이 UI엔 그 계약이 없어 보조기기 사용성이 깨진다.
        // 헤더 좌측(브랜드 옆) 배치라 sm+는 트리거 기준 좌측 정렬(OS .switcher-menu left:0 정합).
        //   모바일은 트리거가 이미 브랜드 폭만큼 안쪽이라 left-0 + 92vw 메뉴가 우측으로 잘림(Codex #136)
        //   → viewport 고정(fixed inset-x-3, 헤더 60px 아래)으로 화면 안에 전폭 표시.
        //   항목 11개(OS 홈+10 서비스)라 낮은 기기(iPhone SE급)에선 메뉴가 남은 화면 높이를 넘음(Codex #136)
        //   → max-h(100dvh − top 68px − 하단 여백 12px) + 세로 스크롤로 하단 항목 접근 보장.
        <nav id={menuId} aria-label="서비스 전환" className="fixed inset-x-3 top-[68px] z-[120] max-h-[calc(100dvh-80px)] overflow-y-auto overflow-x-hidden rounded-[14px] border border-[var(--line,#e6eaf0)] bg-[var(--surface,#fff)] p-1.5 shadow-[0_8px_28px_rgba(13,26,31,.14)] sm:absolute sm:inset-x-auto sm:left-0 sm:top-[calc(100%+8px)] sm:w-[330px]">
          <div className="px-2.5 pb-1.5 pt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[var(--text-tertiary,#8a94a3)]">
            서비스 전환
          </div>

          {/* OS 홈 */}
          <a
            href={osHubUrl()}
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
        </nav>
      )}
    </div>
  );
}
