"use client";

// Pullim Writing Coach — /coach 인증 게이트 (C2)
//   서버 컴포넌트(coach/page)에서 render-prop 함수를 넘길 수 없으므로 얇은 client 래퍼로 분리.
//   TokenGate의 검증·세션 보관·401 재입력 배너를 /try와 동일하게 재사용한다.
//   T6에서 CoachClient 직접 마운트를 CoachSetupFlow로 교체한다.

import TokenGate from "@/app/components/TokenGate";
import CoachClient from "./CoachClient";

export default function CoachGate() {
  return <TokenGate>{(onAuthExpired) => <CoachClient onAuthExpired={onAuthExpired} />}</TokenGate>;
}
