// /try 추가 채널·복원 E2E 회귀 (M3 W2 P2 ⑤ — 트랙 A 회귀 확장).
//   TXT 파일 업로드 + Draft 복원 + handleResubmit Step 3→1 + autosave 인디케이터.

import { expect, test } from "@playwright/test";

const VALID_DRAFT_BODY =
  "이전에 작성하던 글입니다. 50자 이상의 충분한 본문이어서 복원 후 바로 다음 단계로 갈 수 있어야 합니다. 50자 검증 통과.";

const MOCK_OUTPUT = {
  total_score: 80,
  scores: [
    { area: "과제 이해", score: 17, max: 20, feedback_good: "g", feedback_fix: "f" },
    { area: "내용 충실도", score: 16, max: 20, feedback_good: "g", feedback_fix: "f" },
    { area: "구조·논리", score: 15, max: 20, feedback_good: "g", feedback_fix: "f" },
    { area: "표현·문장", score: 16, max: 20, feedback_good: "g", feedback_fix: "f" },
    { area: "성장 가능성", score: 16, max: 20, feedback_good: "g", feedback_fix: "f" },
  ],
  revision_guides: [{ priority: 1, action: "더 다듬기", reason: "마지막 단락" }],
  meta: {
    model_version: "writing-coach-prompt-v0.2",
    generated_at: "2026-06-02T10:00:00+09:00",
    is_verified: false,
    disclaimer: "이 채점은 AI 자동 채점입니다. 학교 교사의 실제 채점과 다를 수 있습니다.",
  },
};

test.describe("/try 채널·복원·resubmit (트랙 A 회귀 확장)", () => {
  test.beforeEach(async ({ context, page }) => {
    await page.route("**/api/score", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_OUTPUT),
      });
    });
    await context.addInitScript(() => {
      window.sessionStorage.setItem("pwc-demo-token", "e2e-mock");
    });
  });

  test("TXT 파일 업로드 — 본문 자동 채움 + 다음 단계 활성", async ({ page }) => {
    await page.goto("/try");
    const fileContent =
      "TXT 파일에서 읽어온 본문입니다. 학생이 메모장에 쓴 글을 그대로 업로드한 시나리오. " +
      "50자 이상의 충분한 본문으로 다음 단계 활성 조건을 충족합니다.";
    // 숨김 input에 직접 set — 표시된 버튼이 file picker 트리거하지만, 테스트엔 input 직접 조작 가능.
    await page.locator("#body-file-upload").setInputFiles({
      name: "test.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(fileContent, "utf-8"),
    });
    // body textarea가 파일 내용으로 채워짐
    await expect(page.locator("#body")).toHaveValue(fileContent);
    // 다음 단계 활성
    await expect(page.getByRole("button", { name: /다음 단계/ })).toBeEnabled();
  });

  test("Draft 복원 배너 — 마운트 시 LS 발견 + [이어 쓰기] 적용", async ({ page, context }) => {
    // beforeEach의 setItem 다음에 draft 추가 주입
    await context.addInitScript((body: string) => {
      window.localStorage.setItem(
        "pwc_draft_v1",
        JSON.stringify({
          body,
          school_level: "중2",
          subject: "국어",
          genre: "논설문·주장하는 글",
          target_raw: "600",
          prompt_text: "교복 자율화에 대한 자신의 주장을 근거 2개 이상으로 쓰시오.",
          saved_at: "2026-06-02T10:00:00+09:00",
        }),
      );
    }, VALID_DRAFT_BODY);

    await page.goto("/try");
    // 복원 배너 노출 (Step 1 위)
    await expect(page.getByText("📝 이전에 쓰던 작업이 있어요")).toBeVisible();
    // body는 비어 있어야 함(아직 복원 전)
    await expect(page.locator("#body")).toHaveValue("");

    // [이어 쓰기] 클릭
    await page.getByRole("button", { name: "이어 쓰기" }).click();
    await expect(page.locator("#body")).toHaveValue(VALID_DRAFT_BODY);
    // 배너 사라짐
    await expect(page.getByText("📝 이전에 쓰던 작업이 있어요")).not.toBeVisible();

    // Codex PR #52: applyRestore가 함께 복원하는 메타·target·promptText 모두 검증.
    // Step 2 진입해 MetaForm 필드 확인.
    await page.getByRole("button", { name: /다음 단계/ }).click();
    await expect(page.locator("#school-level")).toHaveValue("중2");
    await expect(page.locator("#subject")).toHaveValue("국어");
    await expect(page.locator("#genre")).toHaveValue("논설문·주장하는 글");
    await expect(page.locator("#target")).toHaveValue("600");
    await expect(page.locator("#prompt")).toHaveValue(
      "교복 자율화에 대한 자신의 주장을 근거 2개 이상으로 쓰시오.",
    );
  });

  test("Draft 복원 배너 — [새로 시작] 클릭 시 LS clear + 배너 닫힘", async ({ page, context }) => {
    await context.addInitScript((body: string) => {
      window.localStorage.setItem(
        "pwc_draft_v1",
        JSON.stringify({ body, saved_at: "2026-06-02T10:00:00+09:00" }),
      );
    }, VALID_DRAFT_BODY);

    await page.goto("/try");
    await expect(page.getByText("📝 이전에 쓰던 작업이 있어요")).toBeVisible();
    await page.getByRole("button", { name: "새로 시작" }).click();
    await expect(page.getByText("📝 이전에 쓰던 작업이 있어요")).not.toBeVisible();
    await expect(page.locator("#body")).toHaveValue("");
    // LS도 비어 있어야 함
    const draftAfter = await page.evaluate(() => window.localStorage.getItem("pwc_draft_v1"));
    expect(draftAfter).toBeNull();
  });

  test("결과 후 handleResubmit — Step 3 → Step 1 복귀 + body·meta 유지", async ({ page }) => {
    await page.goto("/try");
    const body = "오늘 학교에서 글을 썼고, 충분히 긴 본문이라 채점 받을 수 있습니다. 50자 이상 검증 OK.";
    const prompt = "주장을 근거 2개로 쓰시오 — 충분한 길이";
    const target = "800";
    await page.locator("#body").fill(body);
    await page.getByRole("button", { name: /다음 단계/ }).click();

    // Step 2
    await page.locator("#school-level").selectOption("중2");
    await page.locator("#subject").selectOption("국어");
    await page.locator("#genre").selectOption("논설문·주장하는 글");
    await page.locator("#target").fill(target);
    await page.locator("#prompt").fill(prompt);

    await page.getByRole("button", { name: "AI 첨삭 받기" }).click();

    // Step 3 (결과) — score 80 노출
    await expect(page.locator("#result-score")).toBeVisible({ timeout: 10_000 });

    // "고쳐쓰기 시작" / "한 번 더 고쳐쓰기" 버튼 클릭 (페이지별 actions)
    const resubmitBtn = page.getByRole("button", { name: /고쳐쓰기 시작|한 번 더 고쳐쓰기/ });
    await resubmitBtn.scrollIntoViewIfNeeded();
    await resubmitBtn.click();

    // Step 1으로 복귀 — body 유지
    await expect(page.getByRole("heading", { name: "1. 글을 넣어 주세요" })).toBeVisible();
    await expect(page.locator("#body")).toHaveValue(body);
    // Codex PR #52: Step 2 진입해 모든 메타 필드(school·subject·genre·target·prompt) 유지 검증.
    await page.getByRole("button", { name: /다음 단계/ }).click();
    await expect(page.locator("#school-level")).toHaveValue("중2");
    await expect(page.locator("#subject")).toHaveValue("국어");
    await expect(page.locator("#genre")).toHaveValue("논설문·주장하는 글");
    await expect(page.locator("#target")).toHaveValue(target);
    await expect(page.locator("#prompt")).toHaveValue(prompt);
  });

  test("자동저장 인디케이터 — 800ms debounce 후 'M/D HH:MM' 포맷 표시", async ({ page }) => {
    await page.goto("/try");
    const body = "자동저장 테스트 본문입니다. 충분히 길게 작성하여 BODY_MIN 50자를 넘기도록 합니다.";
    await page.locator("#body").fill(body);

    // Codex PR #52: waitForTimeout(고정 1200ms) 대신 toBeVisible 자동 대기 — flaky 회피.
    // 인디케이터 포맷 "자동 저장됨 · M/D HH:MM" 직접 매칭(formatSavedAt 회귀 동시 검증).
    const indicator = page.getByText(/자동 저장됨 · \d{1,2}\/\d{1,2} \d{2}:\d{2}/);
    await expect(indicator).toBeVisible({ timeout: 5_000 });
  });
});
