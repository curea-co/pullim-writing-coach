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

const SETUP_KEY = "pwc-coach-setup-v1";
// 과제 임시 저장 — 모드 선택 전(아직 setup 미확정) 새로고침해도 입력 보존(curea-review-ai 지적).
const ASSIGNMENT_DRAFT_KEY = "pwc-coach-assignment-draft-v1";

type Phase = "loading" | "assignment" | "mode" | "ready";

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

export default function CoachSetupFlow({ onAuthExpired }: { onAuthExpired?: () => void }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [assignment, setAssignment] = useState<CoachAssignment | null>(null);
  const [mode, setMode] = useState<WritingMode>("free");

  // 마운트 후 복원(SSR/hydration 일치 위해 첫 페인트는 loading).
  useEffect(() => {
    const saved = loadSetup();
    if (saved) {
      setAssignment(saved.assignment);
      setMode(saved.mode);
      setPhase("ready");
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
          saveSetup({ assignment, mode: m });
          clearAssignmentDraft(); // 확정 setup에 포함됐으므로 draft 정리.
          setPhase("ready");
        }}
      />
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
