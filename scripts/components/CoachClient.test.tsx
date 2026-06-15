// CoachClient 스모크 테스트 — Vitest + RTL.
//   상태머신 전체 흐름(write→봐줘→nudge…)은 /api/coach 모킹이 필요해 E2E/통합 영역.
//   여기선 "마운트가 깨지지 않고, 첫 페인트가 write(캔버스) 단계를 띄운다"만 최소 검증한다.
//   ⚠️ 현재 CoachClient는 데모 과제(ASSIGNMENT="화산의 형성과 영향")를 하드코딩하고 phase="write"로
//      바로 마운트한다(AssignmentSetup은 아직 어디에도 배선되지 않음 — 학생 본인 과제 입력은 Plan 3 범위).
//      이전 어서션("학교·학년"·"이 과제로 시작하기" = AssignmentSetup 폼)은 ResizeObserver 크래시에
//      가려져 한 번도 실행된 적이 없던 stale 어서션이었다. 실제 마운트 동작에 맞게 정정.
// 실행: npm run test:components

import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import CoachClient from "@/app/components/coach/CoachClient";

describe("CoachClient 스모크", () => {
  afterEach(() => {
    // 세션 복원 useEffect가 읽는 localStorage를 테스트 간 격리.
    localStorage.clear();
  });

  it("마운트 시 write(캔버스) 단계 — 토픽바 + 데모 과제 제목 + 글쓰기 캔버스 노출", () => {
    render(<CoachClient />);
    // OS 토픽바(라이팅 코치)
    expect(screen.getByText("라이팅 코치")).toBeInTheDocument();
    // 하드코딩 데모 과제 제목이 보인다
    expect(screen.getByText("화산의 형성과 영향")).toBeInTheDocument();
    // write 단계 = 학생이 직접 쓰는 캔버스(textarea)가 들어 있어야 함
    expect(
      screen.getByPlaceholderText("여기에 직접 글을 써 보세요."),
    ).toBeInTheDocument();
  });

  it("저장 세션이 없으면 onAuthExpired 미호출(마운트만으로 부수효과 없음)", () => {
    const onAuthExpired = vi.fn();
    render(<CoachClient onAuthExpired={onAuthExpired} />);
    expect(onAuthExpired).not.toHaveBeenCalled();
  });
});
