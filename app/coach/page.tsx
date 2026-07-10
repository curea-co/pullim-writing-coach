import type { Metadata } from "next";
import CoachGate from "../components/coach/CoachGate";

export const metadata: Metadata = {
  title: "쓰기 과정 코칭 — Pullim Writing Coach",
  description:
    "코치는 답을 주지 않고 질문으로 끌어냅니다. 학생이 직접 고쳐 쓰고, 그 과정이 그대로 남아요.",
};

export default function CoachPage() {
  return <CoachGate />;
}
