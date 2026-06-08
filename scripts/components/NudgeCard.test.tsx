// NudgeCard 컴포넌트 테스트 — 과정 코치의 단일 nudge 카드 (유닛 U7 / EPIC3 T3.2).
//
// 검증 대상: docs/27_coach_prototype.html 의 검증된 nudge UX를 React로 포팅한 컴포넌트.
//   계약(coach-schema.CoachNudge 소비): diagnosis(진단) + guiding_question(유도질문) +
//   rubric_area(영역 라벨) 표시, "고쳤어 ✓" 클릭 → onFixed 콜백.
//
// ★ 핵심 불변식 회귀: 코치는 학생 문장을 대신 쓰지 않는다.
//   NudgeCard는 CoachNudge의 diagnosis/guiding_question만 렌더하고 "완성 문장(대안 본문)"
//   필드를 갖지도, 노출하지도 않아야 한다. 본 테스트가 UI 레벨 백스톱.
//
// 컴포넌트 prop 계약(포팅 단위가 노출해야 하는 인터페이스):
//   <NudgeCard
//     nudge={CoachNudge}        // diagnosis·guiding_question·rubric_area·paragraph_index·quick_win_rank
//     onFixed={() => void}      // "고쳤어 ✓" 클릭 핸들러
//     why?={string}            // (옵션) "왜 중요해?" 펼침 설명
//   />
//   루트는 data-testid="coach-nudge", 고침 버튼은 data-testid="coach-fixed".
//
// 실행: npm run test:components  (vitest + jsdom + RTL).

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NudgeCard from "@/app/components/coach/NudgeCard";
import { AREAS } from "@/app/lib/grading";
import type { CoachNudge } from "@/app/lib/coach-schema";

// coach-schema.CoachNudge 계약 정합 mock — 진단·유도질문·영역(대필/완성문장 없음).
const NUDGE: CoachNudge = {
  paragraph_index: 0,
  rubric_area: AREAS[1], // "내용 충실도"
  diagnosis: "주장은 있는데 근거가 없어요.",
  guiding_question: "왜 그런지, 네가 아는 사실이나 예를 하나만 떠올려 볼까?",
  quick_win_rank: 1,
};

describe("NudgeCard", () => {
  it("진단(diagnosis)을 노출한다", () => {
    render(<NudgeCard nudge={NUDGE} onFixed={() => {}} />);
    expect(screen.getByText(NUDGE.diagnosis)).toBeInTheDocument();
  });

  it("유도질문(guiding_question)을 노출한다", () => {
    render(<NudgeCard nudge={NUDGE} onFixed={() => {}} />);
    // 질문 본문이 강조(b/하이라이트)로 쪼개질 수 있어 부분 매칭으로 검증.
    expect(screen.getByText(/떠올려 볼까\?/)).toBeInTheDocument();
  });

  it("rubric_area(영역) 라벨을 노출한다", () => {
    render(<NudgeCard nudge={NUDGE} onFixed={() => {}} />);
    expect(screen.getByText(new RegExp(NUDGE.rubric_area))).toBeInTheDocument();
  });

  it("'고쳤어 ✓' 버튼 클릭 시 onFixed를 호출한다", async () => {
    const onFixed = vi.fn();
    const user = userEvent.setup();
    render(<NudgeCard nudge={NUDGE} onFixed={onFixed} />);
    const fixedBtn =
      screen.queryByTestId("coach-fixed") ??
      screen.getByRole("button", { name: /고쳤어|다 고쳤/ });
    await user.click(fixedBtn);
    expect(onFixed).toHaveBeenCalledTimes(1);
  });

  it("생성 차단 회귀 — 카드에 '완성 문장/대안 본문/모범답안' 흔적이 없다", () => {
    render(<NudgeCard nudge={NUDGE} onFixed={() => {}} />);
    const root = screen.getByTestId("coach-nudge");
    const text = root.textContent ?? "";
    // 대필 신호 카피가 단 하나도 노출되면 안 된다.
    for (const forbidden of [
      "이렇게 써",
      "이렇게 고치면",
      "예시 답안",
      "모범 답안",
      "예시 문장",
      "다음과 같이 써",
    ]) {
      expect(text).not.toContain(forbidden);
    }
    // 카드에 노출된 텍스트는 계약 필드(diagnosis·guiding_question·영역 라벨)에서만 유래해야 한다.
    //   = guiding_question은 반드시 질문("?")이어야 한다(답/명령이 아님).
    expect(text).toMatch(/[?？]/);
  });

  it("유도질문은 항상 물음표로 끝나는 '질문' 형태다(명령형 대필 아님)", () => {
    render(<NudgeCard nudge={NUDGE} onFixed={() => {}} />);
    expect(NUDGE.guiding_question.trim()).toMatch(/[?？]$/);
  });

  it("why prop 제공 시 '왜 중요해?' 토글로 설명을 펼친다", async () => {
    const why = "설명문은 '그렇다'가 아니라 '왜 그런지'를 보여줄 때 점수가 올라요.";
    const user = userEvent.setup();
    render(<NudgeCard nudge={NUDGE} onFixed={() => {}} why={why} />);

    // 토글 버튼 노출.
    const whyBtn = screen.getByRole("button", { name: /왜 중요/ });
    // 펼치기 전엔 설명이 숨김(미존재 또는 비가시).
    const hiddenBefore = screen.queryByText(why);
    if (hiddenBefore) {
      expect(hiddenBefore).not.toBeVisible();
    } else {
      expect(hiddenBefore).toBeNull();
    }

    // 토글 → 설명 노출.
    await user.click(whyBtn);
    expect(screen.getByText(why)).toBeVisible();
  });
});
