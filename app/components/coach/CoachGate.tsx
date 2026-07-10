"use client";

import TokenGate from "@/app/components/TokenGate";
import CoachSetupFlow from "@/app/components/coach/CoachSetupFlow";

export default function CoachGate() {
  return (
    <TokenGate>
      {(onAuthExpired, onAuthRefresh) => (
        <CoachSetupFlow onAuthExpired={onAuthExpired} onAuthRefresh={onAuthRefresh} />
      )}
    </TokenGate>
  );
}
