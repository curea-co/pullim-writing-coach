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
          setPhase("ready");
        }}
      />
    );
  }

  return (
    <AssignmentStep
      initial={assignment ?? undefined}
      onSubmit={(a) => {
        setAssignment(a);
        setPhase("mode");
      }}
    />
  );
}
