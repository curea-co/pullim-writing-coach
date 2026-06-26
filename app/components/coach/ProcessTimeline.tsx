"use client";
import type { TimelineNode } from "@/app/lib/process-log";

export default function ProcessTimeline({ nodes }: { nodes: TimelineNode[] }) {
  if (nodes.length === 0) return null;
  return (
    <ol data-testid="process-timeline" className="mt-[18px] space-y-2.5">
      {nodes.map((node) => (
        <li key={node.n} className="flex items-baseline gap-2 text-[13px] text-[var(--ink-3)]">
          <span className="text-[var(--pullim-blue)] font-semibold">{node.n}번째 글</span>
          <span>{node.charCount.toLocaleString("ko-KR")}자 직접 씀</span>
          {node.delta > 0 ? <span className="font-bold text-[var(--pullim-ink)]">+{node.delta.toLocaleString("ko-KR")}자 더 채움</span> : null}
        </li>
      ))}
    </ol>
  );
}
