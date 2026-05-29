// #19 신뢰 라벨 (축소) — CEO 리뷰 2026-05-28.
//   모델 응답에 영역별 신뢰도 데이터 없음 → "AI 자동 채점" 명시 + 교사 검토 권장 카피로 mental model 정착.
//   목적: 학생/평가관이 결과 보기 전에 "절대 점수가 아니라 한 시선"이라는 frame을 받음.
//   톤: 너무 강한 경고색 X(학생 신뢰 잃음) → muted/accent 중립 톤. 격려 카피.
//   서버 호환(상태 없음).

import { cn } from "@/app/lib/utils";

export default function TrustLabel({ className }: { className?: string }) {
  return (
    <aside
      aria-label="AI 자동 채점 안내"
      className={cn(
        "border-accent-mid-surface bg-accent-mid-surface text-foreground flex items-start gap-3 rounded-xl border p-4",
        className,
      )}
    >
      {/* 작은 아이콘 — 이모지 대신 의미 명확한 SVG (디자인 톤 통일) */}
      <span
        aria-hidden
        className="bg-accent-mid text-white inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
      >
        AI
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-foreground break-keep text-sm font-semibold">
          AI 자동 채점 결과예요 · 최종 판단은 선생님과 함께
        </p>
        <p className="text-muted-foreground break-keep mt-1 text-xs leading-relaxed">
          이 결과는 5영역 루브릭 기준으로 AI가 본 <strong className="text-foreground">한 가지 시선</strong>
          이에요. 절대 점수가 아니라 글을 읽는 방향을 제안하는 것 — 표현·맥락·의도는
          담임·교과 선생님과 함께 살펴보세요.
        </p>
      </div>
    </aside>
  );
}
