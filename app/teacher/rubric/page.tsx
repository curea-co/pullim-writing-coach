"use client";

// Pullim Writing Coach — EPIC5 교사 무료 도구 ①: 커스텀 루브릭 등록 (/teacher/rubric)
//
// 분배 쐐기(distribution wedge): 교사가 "내 채점 기준"을 한 번 등록하면, 코치가 그 기준에 맞춰
//   질문한다. **채점 자동화가 아니다** — 점수를 매기는 화면이 아니라, '코칭을 내 기준에 맞춘다'.
//   순수 로직(타입·검증·직렬화)은 app/lib/teacher-rubric.ts. 이 화면은 입력·저장(localStorage)만.
//
// SSR 가드: localStorage는 클라에서만 접근. 초기 마운트(useEffect)에서만 읽고, hydration 깜박임을
//   막기 위해 ready 플래그 전까지 폼을 빈 상태(emptyTeacherRubric)로 둔다. /try TryClient 패턴 답습.

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  emptyTeacherRubric,
  serializeRubricForPrompt,
  validateTeacherRubric,
  type TeacherRubric,
} from "@/app/lib/teacher-rubric";
import { AREA_CRITERIA } from "@/app/lib/rubric-criteria";
import styles from "@/app/coach/coach.module.css";
import { AREA_ICON_NAME, BlockIcon, MastGlyph } from "@/app/components/coach/icons";

const STORAGE_KEY = "pwc-teacher-rubric-v1";

// 영역별 입력 도우미 placeholder — rubric-criteria의 평가 의도를 톤 다운해 예시로.
function placeholderFor(area: TeacherRubric["perArea"][number]["area"]): string {
  return `예: ${AREA_CRITERIA[area].meaning}`;
}

export default function TeacherRubricPage() {
  const [rubric, setRubric] = useState<TeacherRubric>(emptyTeacherRubric);
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // 초기 로드 — 저장된 루브릭이 있으면 복원(SSR 가드: 클라에서만).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as TeacherRubric;
        // 구조 방어: perArea가 5영역이 아니면 빈 루브릭에 제목만 흡수.
        const base = emptyTeacherRubric();
        const next: TeacherRubric = {
          title: typeof parsed?.title === "string" ? parsed.title : "",
          perArea: base.perArea.map((row) => {
            const found = Array.isArray(parsed?.perArea)
              ? parsed.perArea.find((p) => p?.area === row.area)
              : undefined;
            return { area: row.area, criterion: found?.criterion ?? "" };
          }),
        };
        setRubric(next);
      }
    } catch {
      // 파싱 실패 — 빈 루브릭 유지.
    }
    setReady(true);
  }, []);

  const errors = ready ? validateTeacherRubric(rubric) : [];
  const promptPreview = ready ? serializeRubricForPrompt(rubric) : "";

  const setTitle = (title: string) => {
    setRubric((r) => ({ ...r, title }));
    setSaved(false);
  };
  const setCriterion = (idx: number, criterion: string) => {
    setRubric((r) => ({
      ...r,
      perArea: r.perArea.map((row, i) => (i === idx ? { ...row, criterion } : row)),
    }));
    setSaved(false);
  };

  const handleSave = () => {
    setSaveError(null);
    const errs = validateTeacherRubric(rubric);
    if (errs.length > 0) {
      setSaveError(errs[0]);
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rubric));
      setSaved(true);
    } catch {
      setSaveError(
        "브라우저 저장 공간이 가득 찼거나 저장이 막혀 있어요. 시크릿 모드라면 일반 창에서 시도해 주세요.",
      );
    }
  };

  const handleClear = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* 무시 */
    }
    setRubric(emptyTeacherRubric());
    setSaved(false);
    setSaveError(null);
  };

  // 저장 가능 = 제목·순서 위반 없음(경고만 있으면 저장 허용 — 부분 허용 정책).
  const blocked = validateTeacherRubric(rubric).some(
    (e) => e.includes("제목") || e.includes("순서") || e.includes("영역은"),
  );

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
            <BlockIcon name="decode" size={18} /> 교사 도구 · 루브릭
          </span>
          <span className="flex-1" />
          <span
            className={`${styles.monoFont} inline-block rounded bg-[var(--pullim-lemon)] px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-[var(--pullim-ink)]`}
          >
            무료
          </span>
        </div>
      </header>

      <main className="w-full max-w-[760px] px-[22px] pb-20 pt-7">
        {/* 리드 — '채점 자동화 아님' 프레이밍 */}
        <div className="flex items-start gap-[13px]">
          <BlockIcon name="decode" size={44} className="rounded-[var(--r-md)]" />
          <div>
            <h1 className={`${styles.brandFont} text-[26px] font-bold leading-tight tracking-[-0.02em]`}>
              내 채점 기준에 코치를 맞추세요
            </h1>
            <p className="mt-2 max-w-[58ch] text-[14px] leading-[1.7] text-[var(--ink-3)]">
              여기서 점수를 매기지 않습니다. 선생님이 5영역에서 <b className="text-[var(--pullim-ink)]">무엇을 보는지</b>{" "}
              한 번 적어 두면, 학생을 코칭하는 풀림 코치가 <b className="text-[var(--pullim-ink)]">그 기준에 맞춰</b>{" "}
              질문해요. 코치는 답을 주지 않고, 학생이 직접 고쳐 쓰게 합니다.
            </p>
          </div>
        </div>

        {/* 제목 */}
        <section className="mt-7 rounded-[var(--r-lg)] border border-[var(--line)] bg-white p-[18px] shadow-[var(--sh-1)]">
          <label htmlFor="rubric-title" className={`${styles.monoFont} text-[11px] tracking-[0.08em] text-[var(--pullim-blue)]`}>
            루브릭 제목
          </label>
          <input
            id="rubric-title"
            type="text"
            value={rubric.title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 2학년 1학기 과학 설명문 수행평가"
            className="mt-2 w-full rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--pb-1)] px-3.5 py-3 text-[15px] text-[var(--pullim-ink)] outline-none transition focus:border-[var(--pullim-blue)] focus:bg-white"
          />
        </section>

        {/* 영역별 기준 */}
        <section className="mt-4 flex flex-col gap-3">
          {rubric.perArea.map((row, idx) => (
            <div
              key={row.area}
              className="rounded-[var(--r-lg)] border border-[var(--line)] bg-white p-[18px] shadow-[var(--sh-1)]"
            >
              <div className="flex items-center gap-[9px]">
                <BlockIcon name={AREA_ICON_NAME[row.area]} size={30} />
                <div>
                  <div className={`${styles.monoFont} text-[10.5px] tracking-[0.06em] text-[var(--pullim-blue)]`}>
                    채점 5영역 · {String(idx + 1).padStart(2, "0")}
                  </div>
                  <div className={`${styles.brandFont} mt-px text-[16px] font-bold tracking-[-0.01em]`}>
                    {row.area}
                  </div>
                </div>
              </div>
              <textarea
                value={row.criterion}
                onChange={(e) => setCriterion(idx, e.target.value)}
                placeholder={placeholderFor(row.area)}
                rows={2}
                className="mt-3 w-full resize-y rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--pb-1)] px-3.5 py-3 text-[14px] leading-[1.6] text-[var(--pullim-ink)] outline-none transition focus:border-[var(--pullim-blue)] focus:bg-white"
              />
            </div>
          ))}
        </section>

        {/* 안내/경고 */}
        {ready && errors.length > 0 && (
          <div
            role="status"
            className="mt-4 rounded-[var(--r-md)] border border-[var(--line)] bg-[var(--pb-1)] px-4 py-3 text-[13px] leading-[1.6] text-[var(--ink-3)]"
          >
            {errors.map((e) => (
              <p key={e}>· {e}</p>
            ))}
          </div>
        )}

        {saveError && (
          <div
            role="alert"
            className="mt-4 rounded-[var(--r-md)] border border-[#E5484D]/40 bg-[#E5484D]/[0.06] px-4 py-3 text-[13px] leading-[1.6] text-[#B42318]"
          >
            {saveError}
          </div>
        )}

        {/* 코치 주입 미리보기 — 채점 자동화가 아니라 '코칭 정렬' 증거 */}
        {promptPreview && (
          <section className="mt-5 overflow-hidden rounded-[var(--r-lg)] border border-[var(--line)] bg-white shadow-[var(--sh-1)]">
            <div className={`${styles.monoFont} flex items-center gap-[7px] border-b border-[var(--line-2)] bg-[var(--pb-1)] px-4 py-2.5 text-[11px] tracking-[0.08em] text-[var(--pullim-blue)]`}>
              <BlockIcon name="ask" size={16} />
              코치가 이렇게 정렬돼요 (미리보기)
            </div>
            <pre className="whitespace-pre-wrap px-4 py-3.5 text-[12.5px] leading-[1.7] text-[var(--ink-3)]">
              {promptPreview}
            </pre>
          </section>
        )}

        {/* 액션 */}
        <div className="mt-6 flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleSave}
            disabled={blocked}
            className={`${styles.brandFont} inline-flex items-center justify-center gap-1.5 rounded-xl border-0 bg-[var(--pullim-lemon)] px-5 py-3 text-[14px] font-semibold tracking-[-0.01em] text-[var(--pullim-ink)] shadow-[0_4px_14px_rgba(230,255,76,0.5)] transition hover:brightness-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {saved ? "저장됨 ✓" : "이 기준으로 저장"}
          </button>
          <button
            type="button"
            onClick={handleClear}
            className={`${styles.brandFont} inline-flex items-center justify-center rounded-xl border border-[var(--line)] bg-white px-4 py-3 text-[14px] font-semibold text-[var(--ink-2)] transition hover:border-[var(--ink-4)] hover:bg-[var(--pb-1)]`}
          >
            비우기
          </button>
          <span className="flex-1" />
          <Link
            href="/teacher/log"
            className={`${styles.brandFont} inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[var(--pullim-blue)] underline-offset-2 hover:underline`}
          >
            학생 과정 로그 보기 ▸
          </Link>
        </div>

        {saved && (
          <p className={`${styles.monoFont} mt-3 text-[11.5px] text-[var(--ok)]`}>
            저장됨 — 이 브라우저의 코치 세션이 위 기준에 맞춰 질문합니다.
          </p>
        )}

        <p className={`${styles.monoFont} mt-8 text-[10.5px] leading-[1.7] text-[var(--ink-5)]`}>
          이 도구는 점수를 매기지 않습니다 · 코치는 설계상 학생 문장을 대신 쓰지 않습니다 · 풀림 OS 디자인 시스템 적용
        </p>
      </main>
    </div>
  );
}
