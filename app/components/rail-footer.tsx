"use client";

// 레일(사이드바) 하단 고정 문의 카드 — pullim-web RailFooter(PR #140·#141) 이식.
//   사용자가 어느 화면에서든 문의 경로를 찾을 수 있게 support@curea.co mailto를 상시 노출한다.
//   mt-auto로 레일 목록 아래 바닥에 고정 — 부모가 flex-col h-full이어야 함(app-shell rail 래퍼).
//   토큰 매핑: 정본(--paper-2·--line·--sh-1·--pullim-blue)은 라이트 raw 값이라, 다크 테마가 있는
//   이 앱에선 레일(OsRail)과 동일한 의미 토큰(--muted·--border·--fg류·--primary — 다크 자동 반전)
//   으로 옮겼다. 라이트에서 시각 결과는 정본과 동일 계열.
//   pullim-web과 다른 점: 이 앱 레일은 접기(아이콘 전용 68px)가 있어, 접힘 상태에선 카드 대신
//   같은 mailto의 아이콘 버튼으로 축소한다(레일 접기 컨텍스트 공유 — OsRail 동형).

import { useRailCollapsed } from "@/components/ui/rail-collapse-context";

const CONTACT_EMAIL = "support@curea.co";

const mailIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>
);

export default function RailFooter() {
  const collapsed = useRailCollapsed();

  if (collapsed) {
    return (
      <div className="mt-auto flex justify-center p-3 pt-4">
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          title={`문의하기 — ${CONTACT_EMAIL}`}
          aria-label={`문의하기 — ${CONTACT_EMAIL}`}
          className="flex h-[42px] w-[42px] items-center justify-center rounded-[11px] border border-[var(--border)] bg-[var(--muted)] text-[var(--fg-muted)] transition-colors duration-150 hover:border-[var(--pb-2)] hover:text-[var(--primary)] [&_svg]:h-[17px] [&_svg]:w-[17px]"
        >
          {mailIcon}
        </a>
      </div>
    );
  }

  return (
    <div className="mt-auto p-3 pt-4">
      <a
        href={`mailto:${CONTACT_EMAIL}`}
        className="group block rounded-[12px] border border-[var(--border)] bg-[var(--muted)] px-[13px] py-[11px] no-underline transition-[background-color,border-color,box-shadow] duration-150 hover:border-[var(--pb-2)] hover:bg-[var(--surface)] hover:shadow-[var(--sh-1)]"
      >
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--fg-subtle)] [&_svg]:h-[13px] [&_svg]:w-[13px]">
          {mailIcon}
          문의하기
        </span>
        <span className="mt-1 block break-all text-[13px] font-semibold tracking-[-0.01em] text-[var(--fg)] transition-colors duration-150 group-hover:text-[var(--primary)]">
          {CONTACT_EMAIL}
        </span>
      </a>
    </div>
  );
}
