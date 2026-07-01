"use client";

// Pullim Writing Coach — EPIC5 교사 무료 도구 ②: 학생 과정 로그 열람 (/teacher/log)
//
// 분배 쐐기: 교사가 학생의 '과정 로그'를 읽고 → "이 학생은 직접 썼다"를 신뢰할 수 있게 한다.
//   읽기 전용. 점수 자동화가 아니라, 고쳐쓰기 N회·코치가 준 문장 0개·작성=학생 본인이라는
//   **'직접 썼다'는 증거**를 보여준다. 다른 AI(베끼는 AI)와의 차이가 곧 교사 신뢰 메시지.
//
// 데이터 출처(SSR 가드):
//   1) localStorage("pwc-process-log-v1")에 저장된 ProcessLog가 있으면 그것을,
//   2) 없으면 데모 샘플(DEMO_LOG)로 화면을 채워 교사가 형식을 미리 본다.
//   ProcessLog 형태는 EPIC4 buildProcessLog(session)의 반환 계약을 그대로 따른다(병렬 작업이라
//   lib import 대신 동일 shape를 로컬 타입으로 받는다 — 저장된 JSON을 읽기 전용으로 렌더만).

import Link from "next/link";
import { useEffect, useState } from "react";
import type { AreaName } from "@/app/data/scoring";
import { AREAS } from "@/app/lib/grading";
import styles from "@/app/coach/coach.module.css";
import { AREA_ICON_NAME, BlockIcon, MastGlyph } from "@/app/components/coach/icons";

const STORAGE_KEY = "pwc-process-log-v1";

// EPIC4 buildProcessLog(session) 반환 계약.
type ProcessLog = {
  revisions: number;
  finalCharCount: number;
  coachWroteSentences: false;
  authorIsStudent: true;
  perArea: { area: AreaName; baseline: number; final: number; improved: boolean }[];
  stuckAreas: AreaName[];
};

// 데모 샘플 — 저장된 로그가 없을 때 형식을 보여준다(중2 과학 설명문 시나리오).
const DEMO_LOG: ProcessLog = {
  revisions: 4,
  finalCharCount: 612,
  coachWroteSentences: false,
  authorIsStudent: true,
  perArea: [
    { area: "과제 이해", baseline: 12, final: 16, improved: true },
    { area: "내용 충실도", baseline: 8, final: 14, improved: true },
    { area: "구조·논리", baseline: 10, final: 15, improved: true },
    { area: "표현·문장", baseline: 11, final: 11, improved: false },
    { area: "성장 가능성", baseline: 13, final: 17, improved: true },
  ],
  stuckAreas: ["표현·문장"],
};

// 저장된 JSON을 계약 형태로 방어적 정규화(읽기 전용 — 깨진 데이터로 화면 깨지지 않게).
function coerceLog(raw: unknown): ProcessLog | null {
  if (typeof raw !== "object" || raw === null) return null;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.perArea)) return null;
  const perArea = AREAS.map((area) => {
    const found = (o.perArea as Record<string, unknown>[]).find((p) => p?.area === area);
    const baseline = typeof found?.baseline === "number" ? found.baseline : 0;
    const final = typeof found?.final === "number" ? found.final : 0;
    return { area, baseline, final, improved: final > baseline };
  });
  const stuckAreas = Array.isArray(o.stuckAreas)
    ? (o.stuckAreas as unknown[]).filter((a): a is AreaName =>
        (AREAS as readonly string[]).includes(a as string),
      )
    : [];
  return {
    revisions: typeof o.revisions === "number" ? o.revisions : 0,
    finalCharCount: typeof o.finalCharCount === "number" ? o.finalCharCount : 0,
    coachWroteSentences: false,
    authorIsStudent: true,
    perArea,
    stuckAreas,
  };
}

export default function TeacherLogPage() {
  const [log, setLog] = useState<ProcessLog | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? coerceLog(JSON.parse(raw)) : null;
      if (parsed) {
        setLog(parsed);
        setIsDemo(false);
      } else {
        setLog(DEMO_LOG);
        setIsDemo(true);
      }
    } catch {
      setLog(DEMO_LOG);
      setIsDemo(true);
    }
    setReady(true);
  }, []);

  return (
    <div className={`${styles.root} ${styles.stageBg} flex min-h-dvh w-full flex-col items-center`}>
      {/* OS 토픽바 */}
      <header className="sticky top-0 z-[60] w-full border-b border-[var(--line)] bg-white/[0.82] backdrop-blur-md backdrop-saturate-150">
        <div className="mx-auto flex h-[60px] max-w-[1280px] items-center gap-3.5 px-[22px]">
          <span className="flex items-center gap-[9px]">
            <span className="grid h-[30px] w-[30px] place-items-center rounded-[9px] bg-[var(--pullim-blue)] shadow-[inset_0_0_0_2px_rgba(255,255,255,0.2)]">
              <MastGlyph size={20} />
            </span>
            <span className={`${styles.brandFont} text-[18px] font-bold tracking-[-0.02em]`}>풀림</span>
            <span className={`${styles.monoFont} -ml-[3px] text-[11px] text-[var(--ink-4)]`}>OS</span>
          </span>
          <span className="flex items-center gap-2 rounded-[var(--r-pill)] bg-[var(--pb-1)] px-3 py-1.5 text-[13px] font-semibold text-[var(--pullim-blue)]">
            <BlockIcon name="seal" size={18} /> 교사 도구 · 과정 로그
          </span>
          <span className="flex-1" />
          <span
            className={`${styles.monoFont} inline-block rounded bg-[var(--pullim-lemon)] px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--pullim-ink)]`}
          >
            읽기전용
          </span>
        </div>
      </header>

      <main className="w-full max-w-[680px] px-[22px] pb-20 pt-7">
        {/* 리드 — '직접 썼다' 증거 = 교사 신뢰 메시지 */}
        <div className="flex items-start gap-[13px]">
          <BlockIcon name="seal" size={44} className="rounded-[var(--r-md)]" />
          <div>
            <h1 className={`${styles.brandFont} text-[26px] font-bold leading-tight tracking-[-0.02em]`}>
              이 학생은 직접 썼습니다
            </h1>
            <p className="mt-2 max-w-[58ch] text-[14px] leading-[1.7] text-[var(--ink-3)]">
              풀림 코치는 답을 주지 않고 질문만 합니다. 아래 과정 로그는 학생이{" "}
              <b className="text-[var(--pullim-ink)]">몇 번 고쳐 썼는지</b>, 코치가 문장을{" "}
              <b className="text-[var(--pullim-ink)]">대신 써 줬는지</b>를 그대로 보여줘요. 점수가 아니라{" "}
              <b className="text-[var(--pullim-ink)]">'어떻게 도달했는지'</b>를 확인하세요.
            </p>
          </div>
        </div>

        {ready && isDemo && (
          <div
            role="note"
            className="mt-5 rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--pb-1)] px-4 py-3 text-[13px] leading-[1.6] text-[var(--ink-3)]"
          >
            아직 연결된 학생 세션이 없어요. 아래는 형식을 보여드리는{" "}
            <b className="text-[var(--pullim-ink)]">예시 샘플</b>입니다 (중2 과학 설명문).
          </div>
        )}

        {ready && log && (
          <>
            {/* 핵심 증거 카드 */}
            <section className="mt-5 rounded-[var(--r-lg)] border border-[var(--line)] bg-white p-[20px] shadow-[var(--sh-1)]">
              <div className={`${styles.monoFont} mb-3 flex items-center gap-[7px] text-[11px] tracking-[0.08em] text-[var(--pullim-blue)]`}>
                <BlockIcon name="seal" size={15} />
                과정 로그 — 교사가 확인하는 증거
              </div>
              <LogRow k="고쳐쓰기 횟수" v={`${log.revisions}회`} />
              <LogRow k="최종 분량" v={`${log.finalCharCount.toLocaleString("ko-KR")}자`} />
              <LogRow k="코치가 준 문장" v="0개" highlight />
              <LogRow k="작성 주체" v="학생 본인" highlight />

              <span className="mt-4 inline-flex items-center gap-2 rounded-[var(--r-pill)] bg-[var(--pullim-lemon)] px-3.5 py-2 text-[12.5px] font-bold text-[var(--pullim-ink)]">
                🔒 직접 쓴 글 — 표절·대필 우려 없음
              </span>
            </section>

            {/* 영역별 성장 */}
            <section className="mt-4 rounded-[var(--r-lg)] border border-[var(--line)] bg-white p-[20px] shadow-[var(--sh-1)]">
              <div className={`${styles.monoFont} mb-3.5 flex items-center gap-[7px] text-[11px] tracking-[0.08em] text-[var(--pullim-blue)]`}>
                <BlockIcon name="grow" size={15} />
                영역별 성장 (코칭 전 → 후)
              </div>
              <div className="flex flex-col gap-3">
                {log.perArea.map((row) => (
                  <AreaGrowthRow
                    key={row.area}
                    area={row.area}
                    baseline={row.baseline}
                    final={row.final}
                    improved={row.improved}
                    stuck={log.stuckAreas.includes(row.area)}
                  />
                ))}
              </div>
            </section>

            {/* 막힌 영역 */}
            {log.stuckAreas.length > 0 && (
              <section className="mt-4 rounded-[var(--r-lg)] border border-[var(--line)] bg-white p-[20px] shadow-[var(--sh-1)]">
                <div className={`${styles.monoFont} mb-2.5 flex items-center gap-[7px] text-[11px] tracking-[0.08em] text-[var(--pullim-blue)]`}>
                  <BlockIcon name="mark" size={15} />
                  아직 막힌 영역 — 수업에서 함께 봐 주세요
                </div>
                <div className="flex flex-wrap gap-2">
                  {log.stuckAreas.map((a) => (
                    <span
                      key={a}
                      className="inline-flex items-center gap-[5px] rounded-[var(--r-pill)] bg-white px-3 py-1.5 text-[12.5px] font-semibold text-[var(--pullim-blue)] shadow-[inset_0_0_0_1.5px_var(--pb-3)]"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-[var(--pullim-lemon)]" aria-hidden />
                      {a}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-[13px] leading-[1.6] text-[var(--ink-3)]">
                  코치 질문만으로는 학생이 아직 끌어내지 못한 영역이에요. 점수가 아니라 '무엇에서 막혔는지'가
                  교사 피드백의 출발점이 됩니다.
                </p>
              </section>
            )}

            {/* 다른 AI 대비 신뢰 메시지 */}
            <section className="mt-4 overflow-hidden rounded-[var(--r-lg)] border border-[var(--line)] bg-white shadow-[var(--sh-1)]">
              <div className="px-5 py-[15px] text-[13px] leading-relaxed">
                <p className="text-[#E5484D]">
                  ❌ 베끼는 AI: 완성 문장을 통째로 만들어 붙여넣기 — 과정이 남지 않아 신뢰할 수 없어요.
                </p>
                <p className="mt-2 font-semibold text-[var(--ok)]">
                  ✓ 풀림: 같은 결론도 학생이 직접 끌어내 썼고, 위 과정 로그가 그걸 증명합니다.
                </p>
              </div>
            </section>
          </>
        )}

        <div className="mt-6">
          <Link
            href="/teacher/rubric"
            className={`${styles.brandFont} inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[var(--pullim-blue)] underline-offset-2 hover:underline`}
          >
            ◂ 내 채점 기준 등록하기
          </Link>
        </div>

        <p className={`${styles.monoFont} mt-8 text-[10.5px] leading-[1.7] text-[var(--ink-5)]`}>
          읽기 전용 · 이 도구는 점수를 매기지 않습니다 · 코치는 설계상 학생 문장을 대신 쓰지 않습니다 · 풀림 OS 디자인 시스템 적용
        </p>
      </main>
    </div>
  );
}

function LogRow({ k, v, highlight }: { k: string; v: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-dashed border-[var(--line)] py-[9px] text-[13.5px] last:border-0">
      <span className="text-[var(--ink-3)]">{k}</span>
      <b className={`${styles.brandFont} ${highlight ? "text-[var(--ok)]" : "text-[var(--pullim-ink)]"}`}>{v}</b>
    </div>
  );
}

// 영역별 전/후 막대(읽기 전용). max=20 기준. 성장분은 레몬, 도달분은 블루.
function AreaGrowthRow({
  area,
  baseline,
  final,
  improved,
  stuck,
}: {
  area: AreaName;
  baseline: number;
  final: number;
  improved: boolean;
  stuck: boolean;
}) {
  const MAX = 20;
  const basePct = Math.max(0, Math.min(100, (baseline / MAX) * 100));
  const finalPct = Math.max(0, Math.min(100, (final / MAX) * 100));
  const gain = Math.max(0, finalPct - basePct);
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-[7px]">
        <BlockIcon name={AREA_ICON_NAME[area]} size={22} />
        <span className={`${styles.brandFont} text-[13.5px] font-semibold`}>{area}</span>
        <span className="flex-1" />
        <span className={`${styles.monoFont} text-[11.5px] text-[var(--ink-4)]`}>
          {baseline} → {final}
          {improved ? (
            <b className="ml-1 text-[var(--ok)]">▲{final - baseline}</b>
          ) : stuck ? (
            <b className="ml-1 text-[var(--ink-4)]">―</b>
          ) : null}
        </span>
      </div>
      <div className="relative h-[12px] w-full overflow-hidden rounded-[var(--r-xs)] bg-[var(--line-2)]">
        {/* 도달분(블루) */}
        <div
          className="absolute inset-y-0 left-0 bg-[var(--pullim-blue)]"
          style={{ width: `${basePct}%` }}
          aria-hidden
        />
        {/* 성장분(레몬) */}
        {gain > 0 && (
          <div
            className="absolute inset-y-0 bg-[var(--pullim-lemon)]"
            style={{ left: `${basePct}%`, width: `${gain}%` }}
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}
