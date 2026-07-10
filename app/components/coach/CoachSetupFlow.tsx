"use client";

// 코치 진입 게이트 — 과제 입력 → 모드 선택 → CoachClient 마운트. reducer 밖에서 setup 보관·영속.
//   영속: pwc-coach-setup-v1 (CoachClient의 세션 키와 분리). 새로고침 시 setup 복원해 직행.

import { useEffect, useState } from "react";
import {
  type CoachAssignment,
  type CoachSetup,
  type WritingMode,
  parseSetup,
  serializeSetup,
} from "@/app/lib/coach-setup";
import AssignmentStep from "@/app/components/coach/AssignmentStep";
import ModeSelectStep from "@/app/components/coach/ModeSelectStep";
import CoachClient from "@/app/components/coach/CoachClient";
import OutlinePanel from "@/app/components/coach/OutlinePanel";
import GuidePanel from "@/app/components/coach/GuidePanel";

const SETUP_KEY = "pwc-coach-setup-v1";
// 과제 임시 저장 — 모드 선택 전(아직 setup 미확정) 새로고침해도 입력 보존(curea-review-ai 지적).
const ASSIGNMENT_DRAFT_KEY = "pwc-coach-assignment-draft-v1";

// plan = 개요/가이드 참고 메모 화면(별도 스텝) — 좁은 캔버스 프레임에 끼워 잘리던 걸 전용 화면으로 분리
//   (2026-07-08). 여기서 메모 후 '본문 쓰기 →'로 ready(캔버스)로 넘어간다. 새로고침 시엔 setup 복원이
//   바로 ready 로 보내 plan 을 건너뛴다(이미 지난 준비 단계).
type Phase = "loading" | "assignment" | "mode" | "plan" | "ready";
const NEEDS_PLAN = (m: WritingMode): boolean => m === "outline" || m === "guide";

function loadSetup(): CoachSetup | null {
  if (typeof window === "undefined") return null;
  try {
    return parseSetup(window.localStorage.getItem(SETUP_KEY));
  } catch {
    return null;
  }
}

function saveSetup(s: CoachSetup): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SETUP_KEY, serializeSetup(s));
  } catch {
    /* swallow — quota/denied. 영속 실패가 흐름을 막지 않는다. */
  }
}

// 과제 draft 영속 — 모드 미선택 상태의 새로고침 보호. 구조만 방어적으로 확인.
function loadAssignmentDraft(): CoachAssignment | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ASSIGNMENT_DRAFT_KEY);
    if (!raw) return null;
    const a = JSON.parse(raw) as Partial<CoachAssignment>;
    if (typeof a !== "object" || a === null) return null;
    if (typeof a.school_level !== "string" || typeof a.subject !== "string") return null;
    if (typeof a.genre !== "string" || typeof a.prompt_text !== "string") return null;
    // 코치는 목표 분량을 쓰지 않고 입력도 숨겼으므로(hideTarget), 손상·구버전 draft에 남은 값이
    // validateAssignment를 막아 진행 불가가 되지 않도록 항상 null로 강제(curea-review-ai 지적).
    return { ...(a as CoachAssignment), target_char_count: null };
  } catch {
    return null;
  }
}

function saveAssignmentDraft(a: CoachAssignment): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ASSIGNMENT_DRAFT_KEY, JSON.stringify(a));
  } catch {
    /* swallow */
  }
}

function clearAssignmentDraft(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ASSIGNMENT_DRAFT_KEY);
  } catch {
    /* swallow */
  }
}

export default function CoachSetupFlow({
  onAuthExpired,
  onAuthRefresh,
}: {
  onAuthExpired?: () => void;
  onAuthRefresh?: () => Promise<boolean>; // 401 → 토큰 회전 → 원 요청 자동 재시도(게이트키퍼 SSO 계약)
}) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [assignment, setAssignment] = useState<CoachAssignment | null>(null);
  const [mode, setMode] = useState<WritingMode>("free");

  // 마운트 후 복원(SSR/hydration 일치 위해 첫 페인트는 loading).
  useEffect(() => {
    const saved = loadSetup();
    if (saved) {
      setAssignment(saved.assignment);
      setMode(saved.mode);
      // plan(참고 메모)을 아직 안 끝냈으면 그 화면으로 복원 — 새 전용 단계의 refresh-resume(Codex #134).
      //   단, 실제 plan이 필요한 모드일 때만 — 손상 데이터({mode:free,phase:plan})나 voice→free 다운그레이드
      //   후 plan 진입을 막는다(NEEDS_PLAN 가드).
      setPhase(saved.phase === "plan" && NEEDS_PLAN(saved.mode) ? "plan" : "ready");
    } else {
      // setup 미확정 — 과제 draft가 있으면 복원해 입력 유실 방지(새로고침 후에도 보존).
      const draft = loadAssignmentDraft();
      if (draft) setAssignment(draft);
      setPhase("assignment");
    }
  }, []);

  if (phase === "loading") return null;

  if (phase === "ready" && assignment) {
    return (
      <CoachClient
        assignment={assignment}
        mode={mode}
        onAuthExpired={onAuthExpired}
        onAuthRefresh={onAuthRefresh}
        // 개요/가이드만 plan 화면이 있어 '메모 다시 보기' 복귀 가능. 본문은 영속되어 왕복해도 유지.
        //   복귀 시 setup의 phase도 "plan"으로 갱신 — 그 화면에서 새로고침해도 plan으로 복원되게(Codex #134).
        onBackToPlan={
          NEEDS_PLAN(mode)
            ? () => {
                saveSetup({ assignment, mode, phase: "plan" });
                setPhase("plan");
              }
            : undefined
        }
        // 자유/음성(plan 없는 모드)은 캔버스에서 바로 '모드 다시 선택'으로 복귀 — 개요/가이드의 '메모 다시
        //   보기'에 대응하는 back(사용자 요청 2026-07-10). plan 스텝의 '← 모드 다시 선택'과 동일 동작:
        //   SETUP_KEY 제거(새로고침 시 canvas 직행 회귀 방지) + 과제는 draft로 보존(유실 없이 재개). 본문은
        //   assignmentSig별 bodyHtml localStorage 영속이라 모드 재선택·재진입해도 유지.
        onBackToMode={
          !NEEDS_PLAN(mode)
            ? () => {
                try { window.localStorage.removeItem(SETUP_KEY); } catch { /* swallow */ }
                saveAssignmentDraft(assignment);
                setPhase("mode");
              }
            : undefined
        }
        onNewAssignment={() => {
          if (typeof window !== "undefined") {
            try {
              window.localStorage.removeItem(SETUP_KEY);
            } catch {
              /* swallow */
            }
          }
          clearAssignmentDraft();
          setAssignment(null);
          setMode("free");
          setPhase("assignment");
        }}
      />
    );
  }

  if (phase === "mode" && assignment) {
    return (
      <ModeSelectStep
        onBack={() => setPhase("assignment")}
        onSelect={(m) => {
          setMode(m);
          if (NEEDS_PLAN(m)) {
            // 개요/가이드는 참고 메모(plan) 단계를 거친 뒤 캔버스로. **phase:"plan"으로 저장**해 이 화면에서
            //   새로고침해도 plan으로 복원되게 한다(Codex #134). enterCanvas에서 phase:"ready"로 갱신.
            saveSetup({ assignment, mode: m, phase: "plan" });
            clearAssignmentDraft();
            setPhase("plan");
          } else {
            // 자유/음성은 plan 없이 바로 캔버스.
            saveSetup({ assignment, mode: m, phase: "ready" });
            clearAssignmentDraft();
            setPhase("ready");
          }
        }}
      />
    );
  }

  // 개요/가이드 참고 메모 — 전용 전체 화면(캔버스와 분리). '본문 쓰기 →'로 캔버스(ready)로 넘어간다.
  if (phase === "plan" && assignment) {
    // plan 완료 → 캔버스. **이 시점에 setup 확정 저장**(Codex #134): plan 전에 저장하면 plan 화면
    //   새로고침 시 loadSetup이 곧바로 ready(캔버스)로 보내 준비 단계를 건너뛴다. 여기서 저장해야 이후
    //   새로고침이 정상적으로 ready로 복원된다.
    const enterCanvas = () => {
      saveSetup({ assignment, mode, phase: "ready" }); // plan 완료 → ready 확정(새로고침 시 canvas로 복원).
      clearAssignmentDraft();
      setPhase("ready");
    };
    return (
      <div className="mx-auto w-full max-w-[560px] px-5 py-8 md:py-12">
        <button
          type="button"
          onClick={() => {
            // 저장된 setup을 지워 새로고침 시 canvas(ready)로 직행하는 회귀 방지(Codex #134). 과제는 draft로
            //   보존해 유실 없이 재개(loadSetup=null → loadAssignmentDraft로 과제 복원).
            try { window.localStorage.removeItem(SETUP_KEY); } catch { /* swallow */ }
            saveAssignmentDraft(assignment);
            setPhase("mode");
          }}
          className="text-subtle-foreground hover:text-foreground mb-4 text-sm"
        >
          ← 모드 다시 선택
        </button>
        {mode === "outline" ? (
          <OutlinePanel genre={assignment.genre} onStartBody={enterCanvas} />
        ) : (
          <>
            <GuidePanel genre={assignment.genre} />
            <button
              type="button"
              onClick={enterCanvas}
              className="border-border bg-surface text-foreground hover:bg-muted mt-3 w-full rounded-lg border px-3 py-2 text-sm font-medium"
            >
              이제 본문 쓰기 →
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <AssignmentStep
      initial={assignment ?? undefined}
      onDraftChange={saveAssignmentDraft} // 입력 중에도 디바운스 저장(작성 중 새로고침 보호).
      onSubmit={(a) => {
        setAssignment(a);
        saveAssignmentDraft(a); // 모드 선택 전 새로고침 대비 즉시 저장.
        setPhase("mode");
      }}
    />
  );
}
