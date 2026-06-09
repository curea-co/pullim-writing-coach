"use client";

// Pullim Writing Coach — U5 nudge 카드 (docs/27 .nrow/.diag/.q/.why/.acts 포팅 · U7 테스트 계약)
//
// 한 호흡에 한 nudge(킥 UX). 진단(diagnosis) + 유도질문(guiding_question)만 — 대안 문장 없음(불변식).
//   "왜 중요해?"는 선택적 근거 = why prop(부모가 영역별로 주입). guiding_question은 서버 텍스트라
//   dangerouslySetInnerHTML을 쓰지 않고 평문으로 렌더(대필·XSS 표면 차단).
//
// prop 계약(scripts/components/NudgeCard.test.tsx): nudge·onFixed·why?(옵션).
//   루트 data-testid="coach-nudge", 고침 버튼 data-testid="coach-fixed".

import { useId, useState } from "react";
import type { CoachNudge } from "@/app/lib/coach-schema";
import type { AreaName } from "@/app/data/scoring";
import styles from "@/app/coach/coach.module.css";
import { AREA_ICON_NAME, BlockIcon } from "./icons";

// 영역별 코칭 단계 번호(표현용). nudgeable 4영역만 — 성장 가능성은 nudge 대상 아님.
const STEP_NO: Partial<Record<AreaName, string>> = {
  "과제 이해": "①",
  "내용 충실도": "②",
  "구조·논리": "③",
  "표현·문장": "④",
};

export default function NudgeCard({
  nudge,
  onFixed,
  why,
  busy = false,
}: {
  nudge: CoachNudge;
  onFixed: () => void; // "고쳤어 ✓" — 재점검 트리거
  why?: string; // (옵션) "왜 중요해?" 펼침 설명(메타 근거 — 대안 문장 아님)
  busy?: boolean;
}) {
  const [whyOpen, setWhyOpen] = useState(false);
  const whyId = useId();
  const area = nudge.rubric_area;
  const step = STEP_NO[area] ?? "•";

  return (
    <div data-testid="coach-nudge">
      <div className="flex items-center gap-[9px]">
        <BlockIcon name={AREA_ICON_NAME[area]} size={30} />
        <div className="min-w-0">
          <div className={`${styles.monoFont} text-[10.5px] tracking-[0.06em] text-[var(--pullim-blue)]`}>
            {area} <span className="text-[var(--ink-4)]">· 코칭 {step}</span>
          </div>
          <div
            className={`${styles.brandFont} mb-1.5 mt-[9px] text-[17px] font-bold leading-snug tracking-[-0.01em]`}
          >
            {nudge.diagnosis}
          </div>
        </div>
      </div>

      {/* 유도질문 — 대안 문장 아님. 평문 렌더(서버 텍스트 신뢰 안 함). */}
      <p className="text-[14px] leading-[1.65] text-[var(--ink-3)]">{nudge.guiding_question}</p>

      {why && (
        <div
          id={whyId}
          role="note"
          hidden={!whyOpen}
          className="mt-2.5 rounded-[var(--r-sm)] bg-[var(--pb-1)] px-3 py-2.5 text-[12.5px] text-[var(--ink-3)]"
        >
          {why}
        </div>
      )}

      <div className="mt-3.5 flex gap-2">
        {why && (
          <button
            type="button"
            onClick={() => setWhyOpen((v) => !v)}
            aria-expanded={whyOpen}
            aria-controls={whyId}
            className={`${styles.brandFont} inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-[14px] font-semibold tracking-[-0.01em] text-[var(--ink-2)] transition hover:border-[var(--ink-4)] hover:bg-[var(--pb-1)]`}
          >
            왜 중요해?
          </button>
        )}
        <button
          type="button"
          data-testid="coach-fixed"
          onClick={onFixed}
          disabled={busy}
          className={`${styles.brandFont} inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border-0 bg-[var(--pullim-lemon)] px-4 py-3 text-[14px] font-semibold tracking-[-0.01em] text-[var(--pullim-ink)] shadow-[0_4px_14px_rgba(230,255,76,0.5)] transition hover:brightness-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60`}
        >
          고쳤어 ✓
        </button>
      </div>
    </div>
  );
}
