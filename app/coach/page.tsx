// Pullim Writing Coach — /coach (U5, EPIC3)
//
// docs/27_coach_prototype.html의 검증된 "과정 코치" UX를 React로 포팅한 라우트.
//   서버 컴포넌트(메타데이터)만 두고, 상태머신·입력·호출은 CoachClient(클라)에 위임
//   (/try → TryClient 패턴 답습). 데모 접근 토큰은 CoachClient가 sessionStorage(TokenGate 공유)에서 읽는다.

import type { Metadata } from "next";
import CoachClient from "../components/coach/CoachClient";

export const metadata: Metadata = {
  title: "과정 코치 — Pullim Writing Coach",
  description:
    "코치는 답을 주지 않고 질문으로 끌어냅니다. 학생이 직접 고쳐 쓰고, 그 과정이 그대로 남아요.",
};

export default function CoachPage() {
  return <CoachClient />;
}
