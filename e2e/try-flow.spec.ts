// /try 동선 E2E 회귀 — Playwright (트랙 A PR B).
//   목표: Step 1(글 입력) → 다음 단계 → Step 2(메타 입력) → AI 첨삭 받기
//   → loading → result 흐름 끝까지 검증. API는 route intercept로 mock — 백엔드/토큰 무관.
//
// 실행: npm run test:e2e (Playwright config로 dev 서버 자동 기동).

import { expect, test } from "@playwright/test";

const MOCK_BODY =
  "오늘 학교에서 친구들과 점심을 먹으며 교복 자율화에 대해 토론했다. " +
  "나는 교복이 학생의 개성을 제한한다고 생각한다. 첫째, 같은 옷만 입으면 자기 표현의 기회가 줄어든다. " +
  "둘째, 다양한 옷을 입는 경험이 사회생활에 도움이 된다.";

const MOCK_OUTPUT = {
  total_score: 75,
  scores: [
    { area: "과제 이해", score: 16, max: 20, feedback_good: "주장 명확", feedback_fix: "더 구체적으로" },
    { area: "내용 충실도", score: 15, max: 20, feedback_good: "근거 2건", feedback_fix: "사례 추가" },
    { area: "구조·논리", score: 14, max: 20, feedback_good: "흐름 양호", feedback_fix: "결론 보강" },
    { area: "표현·문장", score: 15, max: 20, feedback_good: "문장 깔끔", feedback_fix: "어휘 다양화" },
    { area: "성장 가능성", score: 15, max: 20, feedback_good: "토대 OK", feedback_fix: "한 단계 위로" },
  ],
  revision_guides: [
    { priority: 1, action: "결론 보강", reason: "마지막 단락 짧음" },
  ],
  meta: {
    model_version: "writing-coach-prompt-v0.2",
    generated_at: "2026-06-02T10:00:00+09:00",
    is_verified: false,
    disclaimer: "이 채점은 AI 자동 채점입니다. 학교 교사의 실제 채점과 다를 수 있습니다.",
  },
};

test.describe("/try 동선 happy path (paradigm v1 wizard)", () => {
  test.beforeEach(async ({ context, page }) => {
    // /api/score를 mock — 백엔드·토큰 무관하게 E2E 가능.
    await page.route("**/api/score", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_OUTPUT),
      });
    });
    // TokenGate 우회 — sessionStorage에 mock token. 페이지 로드 후 set이라야 함.
    await context.addInitScript(() => {
      window.sessionStorage.setItem("pwc-demo-token", "e2e-mock");
    });
  });

  test("Step 1 → 다음 단계 비활성(50자 미만) → 본문 채움 → 활성화", async ({ page }) => {
    await page.goto("/try");
    // Step 1 헤딩 노출
    await expect(page.getByRole("heading", { name: "1. 글을 넣어 주세요" })).toBeVisible();

    const nextButton = page.getByRole("button", { name: /다음 단계/ });
    await expect(nextButton).toBeDisabled();

    // 본문 채움 — id="body"
    await page.locator("#body").fill(MOCK_BODY);
    await expect(nextButton).toBeEnabled();
  });

  test("Step 1 → Step 2 → Step 3 (loading → result) full path", async ({ page }) => {
    await page.goto("/try");

    // Step 1
    await page.locator("#body").fill(MOCK_BODY);
    await page.getByRole("button", { name: /다음 단계/ }).click();

    // Step 2 — 글 미리보기 + 메타 폼
    await expect(page.getByRole("heading", { name: "2. 과제 정보를 알려 주세요" })).toBeVisible();
    await expect(page.getByText("내 글 미리보기")).toBeVisible();

    // 메타 채움
    await page.locator("#school-level").selectOption("중2");
    await page.locator("#subject").selectOption("국어");
    await page.locator("#genre").selectOption("논설문·주장하는 글");
    await page
      .locator("#prompt")
      .fill("교복 자율화에 대한 자신의 주장을 근거 2개 이상으로 쓰시오.");

    // 제출
    const submitBtn = page.getByRole("button", { name: "AI 첨삭 받기" });
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Step 3 — 결과 표시 (mock API 즉시 응답). 총점은 #result-score 안의 큰 숫자.
    await expect(page.locator("#result-score")).toBeVisible({ timeout: 10_000 });
    await expect(page.locator("#result-score").getByText("75").first()).toBeVisible();
    // 5영역 + 수정 가이드 노출 — guide 섹션은 스크롤 아래 있어 scrollIntoView 후 검증.
    const guideSection = page.locator("#result-guide");
    await guideSection.scrollIntoViewIfNeeded();
    await expect(guideSection).toBeVisible();
    await expect(guideSection.getByText("결론 보강")).toBeVisible();
  });

  test("Step 2 → [수정] 클릭 시 Step 1 복귀(body 유지)", async ({ page }) => {
    await page.goto("/try");

    // Step 1 → Step 2 진입
    await page.locator("#body").fill(MOCK_BODY);
    await page.getByRole("button", { name: /다음 단계/ }).click();
    await expect(page.getByText("내 글 미리보기")).toBeVisible();

    // 미리보기 펼침 → [수정] 클릭
    await page.getByText("내 글 미리보기").click();
    await page.getByRole("button", { name: /수정/ }).click();

    // Step 1으로 복귀, body 유지
    await expect(page.getByRole("heading", { name: "1. 글을 넣어 주세요" })).toBeVisible();
    await expect(page.locator("#body")).toHaveValue(MOCK_BODY);
  });

  test("Step 2 disabled hint — 누락 필드 동적 나열", async ({ page }) => {
    await page.goto("/try");
    await page.locator("#body").fill(MOCK_BODY);
    await page.getByRole("button", { name: /다음 단계/ }).click();

    // 메타 비어 있음 — AI 첨삭 받기 disabled + 안내
    const submitBtn = page.getByRole("button", { name: "AI 첨삭 받기" });
    await expect(submitBtn).toBeDisabled();
    // 누락 필드 동적 나열 — "다음을 채우면 ... 학교·학년 · 과목 · 장르 · ..."
    const hint = page.getByText(/다음을 채우면 채점을 받을 수 있어요/);
    await expect(hint).toBeVisible();
    await expect(hint).toContainText("학교·학년");
    await expect(hint).toContainText("과목");
    await expect(hint).toContainText("장르");
  });
});
