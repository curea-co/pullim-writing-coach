// 바로시작 타일용 모던 라인 아이콘 — 단색 스트로크(currentColor=배지 흰색), 24px, 미니멀.
//   이모지 대신 일관된 라인 아이콘으로 톤을 모던하게.
import type { SVGProps } from "react";

const base = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

// 직접 채점받기 — 펜(작성/첨삭)
export function IconPen(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props} aria-hidden="true">
      <path d="M4 20.5l1-3.6L16 6a2.1 2.1 0 0 1 3 3L8 19.9l-4 .6Z" />
      <path d="M14 8l2 2" />
    </svg>
  );
}

// 과정 코치 — 단계 루트(개요→본문 단계별)
export function IconRoute(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props} aria-hidden="true">
      <circle cx="6" cy="18" r="2.2" />
      <circle cx="18" cy="6" r="2.2" />
      <path d="M8.2 18H13a3 3 0 0 0 3-3V8.2" />
    </svg>
  );
}

// 샘플 채점 결과 — 막대 그래프(점수대)
export function IconChart(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props} aria-hidden="true">
      <path d="M3.5 20.5h17" />
      <path d="M7 20.5v-6" />
      <path d="M12 20.5V8" />
      <path d="M17 20.5v-9" />
    </svg>
  );
}

// 채점 결과 조회 — 아카이브(저장 다시 보기)
export function IconArchive(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props} aria-hidden="true">
      <rect x="3.5" y="4.5" width="17" height="4" rx="1.2" />
      <path d="M5.5 8.5v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-9" />
      <path d="M10 12h4" />
    </svg>
  );
}
