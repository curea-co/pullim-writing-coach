// 과정 코치(/coach) E2E 회귀 — Playwright (트랙 A · EPIC2/3 검증, 유닛 U7).
//
// 목표(happy path): /coach 진입 → 캔버스에 글 입력 → "봐줘"(코치 호출)
//   → nudge(진단+유도질문+"고쳤어 ✓") 표시 → 학생이 직접 고침 → "고쳤어 ✓"
//   → 재점검 → 성장막대(블루=기존·레몬=새로 자란 칸) 표시 → 다음/완료 화면.
//
// 핵심 불변식 회귀: 코치는 학생 문장을 대신 쓰지 않는다.
//   서버 가드(runCoachGuards/checkGenerationBlock)가 1차 백스톱이지만, UI에서도
//   nudge 카드에 "완성 문장(대안 본문)"이 절대 노출되지 않아야 한다 → 본 스펙이 단언.
//
// 모드 전제(COACH_MOCK): /api/coach 를 Playwright route intercept로 mock(트랙 A 컨벤션,
//   try-flow.spec.ts와 동일). 네트워크 레벨 mock이 권위적이므로 서버 env·토큰·모델 무관.
//   추가로 window.__COACH_MOCK / sessionStorage COACH_MOCK 플래그도 주입 — 클라이언트
//   측 mock 단락(있다면)도 동시 활성. 어느 경로든 결정적으로 통과.
//
// 셀렉터 계약(UI 포팅 단위가 노출해야 하는 안정 훅):
//   - 캔버스 textarea:        data-testid="coach-canvas"
//   - "봐줘"(첫 점검) 버튼:    data-testid="coach-ask"     (없으면 prototype 카피 폴백)
//   - nudge 카드 컨테이너:     data-testid="coach-nudge"
//   - "고쳤어 ✓" 버튼:        data-testid="coach-fixed"   (없으면 카피 폴백)
//   - 성장막대 컨테이너:       data-testid="coach-growth"
//   - 새로 자란(레몬) 칸:      data-testid="coach-growth-gain"
//   - "다음" 버튼:            data-testid="coach-next"     (없으면 카피 폴백)
//   - 완료 화면:              data-testid="coach-done"
//   docs/27_coach_prototype.html 의 검증된 카피를 폴백 셀렉터로 함께 사용.
//
// 실행: npm run test:e2e (Playwright config로 dev 서버 자동 기동).

import { expect, test, type Page } from "@playwright/test";
import { AREAS } from "../app/lib/grading";

// ── mock 본문(설명문 시드, 약함 — 근거·연결 부족) ──────────────────────────
const SEED_BODY =
  "화산은 마그마가 분출하여 만들어진 지형이다. 화산은 위험하다. 그래서 조심해야 한다.";

// 학생이 직접 고친 뒤 본문(근거·연결어 추가) — 코치가 아니라 학생이 쓴 문장.
const REVISED_BODY =
  SEED_BODY +
  " 예를 들어 화산이 폭발하면 인명 피해가 생긴다. 하지만 화산은 비옥한 토양을 만들어 농사에 도움을 주기도 한다.";

// ── 코치 출력 mock (coach-schema.CoachOutput 계약 정합) ────────────────────
//   area_scores: AREAS 순서 5개, 0~20. nudges: 진단+유도질문+영역(대필/완성문장 X).
//   1차 점검: "내용 충실도" 약함(근거 없음) → nudge 1개 유도.
function coachOutputWeak() {
  return {
    area_scores: [
      { area: AREAS[0], score: 12 }, // 과제 이해
      { area: AREAS[1], score: 7 }, // 내용 충실도 (가장 약함 → top nudge)
      { area: AREAS[2], score: 9 }, // 구조·논리
      { area: AREAS[3], score: 11 }, // 표현·문장
      { area: AREAS[4], score: 10 }, // 성장 가능성
    ],
    nudges: [
      {
        paragraph_index: 0,
        rubric_area: AREAS[1], // 내용 충실도
        diagnosis: "주장은 있는데 근거가 없어요.",
        guiding_question: "왜 그런지, 네가 아는 사실이나 예를 하나만 떠올려 볼까?",
        quick_win_rank: 1,
      },
    ],
  };
}

//   2차 점검(학생이 고친 뒤): "내용 충실도" 점수 상승 → 성장막대 새 칸(레몬).
//     남은 약점이 없도록 모든 영역 PASS(>=14)로 올려 완료 화면까지 도달.
function coachOutputResolved() {
  return {
    area_scores: [
      { area: AREAS[0], score: 16 },
      { area: AREAS[1], score: 16 }, // 7 → 16 (자람)
      { area: AREAS[2], score: 15 },
      { area: AREAS[3], score: 14 },
      { area: AREAS[4], score: 15 },
    ],
    nudges: [], // 더 띄울 nudge 없음 → 완료
  };
}

// 코치가 절대 출력하면 안 되는 "대필/완성 문장" 흔적 — UI에 노출되면 회귀 실패.
//   prototype 의 "베끼는 AI" 예시 문장 + 따옴표로 감싼 완성 본문 패턴.
const FORBIDDEN_GENERATED = [
  "화산은 마그마가 분출하여 만들어진 지형으로, 폭발 시 인명·재산 피해를 주지만",
  "이렇게 써:",
  "이렇게 고치면 돼:",
  "예시 답안",
  "모범 답안",
];

// 카피 폴백 포함 안정 셀렉터 헬퍼 ─ testid 우선, 없으면 prototype 검증 카피.
function canvas(page: Page) {
  return page.getByTestId("coach-canvas");
}

// React controlled textarea에 값 주입 + onChange 트리거.
//   WebKit에서 Playwright의 `fill()`/`evaluate`+input dispatch가 React 19 onChange를 트리거하지
//   못해 controlled state(state.body)가 빈 채로 남는 회귀 관측(2026-06-09). 가장 native에 가까운
//   `keyboard.insertText` 경로로 모든 브라우저에서 동일하게 동작 보장.
//   (selectText로 기존 내용 선택 → insertText가 선택 영역을 대체. 한글 IME 회피.)
async function fillCanvas(page: Page, text: string) {
  const cv = canvas(page);
  await cv.click();
  await cv.selectText();
  await page.keyboard.insertText(text);
}
function askButton(page: Page) {
  // testid 우선, 폴백: "봐" 또는 prototype의 "봐달라"가 포함된 클릭 요소.
  return page
    .getByTestId("coach-ask")
    .or(page.getByRole("button", { name: /봐줘|봐 ?달|봐줄래|점검|코치에게/ }))
    .first();
}
function fixedButton(page: Page) {
  return page
    .getByTestId("coach-fixed")
    .or(page.getByRole("button", { name: /고쳤어|다 고쳤|고침 완료/ }))
    .first();
}
function nextButton(page: Page) {
  return page
    .getByTestId("coach-next")
    .or(page.getByRole("button", { name: /^다음|다음 ▸|계속/ }))
    .first();
}

// /coach 진입 후 새 셋업 흐름(과제 입력 → 모드 선택) 통과 → 캔버스 도달.
async function completeSetup(page: Page) {
  // AssignmentStep: 과제 입력 (학년·과목·장르는 기본값 prefill, 과제 내용만 채우면 됨)
  await expect(page.getByText("어떤 글을 써볼까요")).toBeVisible();
  await page.getByLabel(/학교·학년/).selectOption("중2");
  await page.getByLabel(/과목/).selectOption("과학");
  await page.getByLabel(/어떤 글/).selectOption("설명문");
  await page.getByLabel(/과제 내용/).fill("화산의 형성 과정과 영향을 설명하는 글을 쓰시오");
  await page.getByRole("button", { name: /다음/ }).click();
  // ModeSelectStep: 자유 쓰기 선택 → 캔버스 진입
  await page.getByTestId("mode-free").click();
}

test.describe("/coach 과정 코치 happy path (COACH_MOCK)", () => {
  test.beforeEach(async ({ context, page }) => {
    // ── 1) 토큰 게이트 우회 + COACH_MOCK 플래그(클라 측 mock 단락 동시 활성) ──
    await context.addInitScript(() => {
      window.sessionStorage.setItem("pwc-demo-token", "e2e-mock");
      window.sessionStorage.setItem("COACH_MOCK", "1");
      // 클라이언트에 mock seam이 있으면 잡도록 글로벌 플래그도 노출.
      (window as unknown as { __COACH_MOCK?: boolean }).__COACH_MOCK = true;
      // 셋업 흐름 저장값 초기화 — 테스트 간 bleeding 방지.
      window.localStorage.removeItem("pwc-coach-setup-v1");
    });

    // ── 2) /api/coach 네트워크 mock — 호출 순서로 weak → resolved 전환 ──
    //   첫 호출: 약점 nudge. 이후 호출(학생이 "고쳤어" 후 재점검): 해결.
    let callCount = 0;
    await page.route("**/api/coach", async (route) => {
      callCount += 1;
      const payload = callCount === 1 ? coachOutputWeak() : coachOutputResolved();
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(payload),
      });
    });
  });

  test("진입 → 글 입력 → 봐줘 → nudge → 고쳤어 → 성장막대 → 완료", async ({ page }) => {
    await page.goto("/coach");
    await completeSetup(page);

    // 캔버스 노출 + 시드 입력(학생이 직접 쓴 글).
    const cv = canvas(page);
    await expect(cv).toBeVisible();
    await fillCanvas(page, SEED_BODY);

    // "봐줘" — 코치 1차 점검 요청.
    await askButton(page).click();

    // ── nudge 표시: 진단 + 유도질문 + 영역 라벨 + "고쳤어 ✓" ──
    const nudge = page.getByTestId("coach-nudge");
    await expect(nudge).toBeVisible({ timeout: 10_000 });
    await expect(nudge).toContainText("주장은 있는데 근거가 없어요.");
    await expect(nudge).toContainText("떠올려 볼까?"); // 유도질문(물음표로 끝남)
    await expect(nudge).toContainText("내용 충실도"); // rubric_area 라벨

    // ── 생성 차단 회귀(UI): nudge 카드에 완성 문장/대안 본문 누출 없음 ──
    const nudgeText = (await nudge.innerText()).trim();
    for (const forbidden of FORBIDDEN_GENERATED) {
      expect(nudgeText, `nudge에 생성 문장 누출: "${forbidden}"`).not.toContain(forbidden);
    }
    // 유도질문은 "?"로 끝나야 한다(질문이지 답이 아님) — 명령형 대필 방지 신호.
    expect(nudgeText).toMatch(/[?？]/);

    // ── 학생이 직접 고침(코치는 손대지 않음) → "고쳤어 ✓" ──
    await fillCanvas(page, REVISED_BODY);
    await fixedButton(page).click();

    // ── 성장막대 표시: 기존(블루) + 새로 자란(레몬) 칸 ──
    //   CompletionView가 항상 마운트되어 있어 coach-growth가 SheetBody 1 + 완료 5 = 6개 매칭.
    //   이 단계에선 SheetBody 안의 첫 GrowthRow(현재 focus 영역)만 검증 — first()로 좁힌다.
    const growth = page.getByTestId("coach-growth").first();
    await expect(growth).toBeVisible({ timeout: 10_000 });
    // "새로 자란 칸"(레몬 gain) 최소 1개 — 점수 7 → 16 상승분.
    await expect(growth.getByTestId("coach-growth-gain").first()).toBeVisible();
    // 성장 신호 카피(prototype: "자람") 노출.
    await expect(growth).toContainText(/자람|좋아졌|통과|한 걸음/);

    // ── 다음 → 남은 nudge 없음(resolved) → 완료 화면 ──
    await nextButton(page).click();

    const done = page.getByTestId("coach-done");
    await expect(done).toBeVisible({ timeout: 10_000 });
    // 완료 화면 핵심 메시지(prototype: "네 손으로", "0개", "직접 쓴 글").
    await expect(done).toContainText(/네 손으로|직접 (쓴|작성)/);
    // 과정 로그: "코치가 준 문장 0개" — 생성 차단의 증거. (있으면 단언)
    await expect(done).toContainText(/0\s*개|코치가 (준|쓴)/);

    // 완료 화면 전체에도 생성 문장 누출 없음.
    const doneText = (await done.innerText()).trim();
    for (const forbidden of FORBIDDEN_GENERATED) {
      expect(doneText, `완료 화면에 생성 문장 누출: "${forbidden}"`).not.toContain(forbidden);
    }
  });

  test("코치 응답 전 과정 — 캔버스가 비면 '봐줘'로 점검 불가(가드)", async ({ page }) => {
    await page.goto("/coach");
    await completeSetup(page);
    const cv = canvas(page);
    await expect(cv).toBeVisible();

    // 빈 캔버스 — "봐줘" 비활성 또는 클릭해도 nudge 미표시.
    const ask = askButton(page);
    const disabled = await ask.isDisabled().catch(() => false);
    if (disabled) {
      await expect(ask).toBeDisabled();
    } else {
      // 활성이라면 빈 입력으로 클릭 시 nudge가 뜨지 않아야(또는 입력 유도).
      await ask.click();
      await expect(page.getByTestId("coach-nudge")).toHaveCount(0);
    }
  });
});

// ── voice 모드 e2e (목 STT) ──────────────────────────────────────────────────
//   실제 Web Speech API는 마이크 + 클라우드가 필요하므로 Playwright에서 작동하지 않는다.
//   page.addInitScript 로 FakeRec을 페이지 로드 전에 주입 → 컴포넌트가 window.SpeechRecognition을
//   감지하여 supported=true로 시작. start() 호출 시 10ms 후 final result 1건을 발화한다.
//   VoicePanel → onResult → lines state → voice-insert-0 → handleVoiceInsert → EDIT → 캔버스 반영.

test.describe("/coach voice 모드 e2e (목 STT)", () => {
  test("voice 모드 — 목 STT 전사 → 본문에 넣기", async ({ page }) => {
    // ── 1) FakeRec 주입 — navigation BEFORE: getCtor() 최초 호출 시점에 이미 존재해야 함 ──
    await page.addInitScript(() => {
      class FakeRec {
        lang = "";
        continuous = false;
        interimResults = false;
        onresult: ((e: unknown) => void) | null = null;
        onend: (() => void) | null = null;
        onerror: unknown = null;
        start() {
          setTimeout(() => {
            this.onresult?.({
              resultIndex: 0,
              results: [{ 0: { transcript: "화산은 위험하다" }, isFinal: true, length: 1 }],
            });
          }, 10);
        }
        stop() {
          this.onend?.();
        }
      }
      (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = FakeRec;
    });

    // ── 2) 토큰 게이트 우회 ──
    await page.addInitScript(() => {
      window.sessionStorage.setItem("pwc-demo-token", "e2e-mock");
      window.sessionStorage.setItem("COACH_MOCK", "1");
      (window as unknown as { __COACH_MOCK?: boolean }).__COACH_MOCK = true;
      window.localStorage.removeItem("pwc-coach-setup-v1");
    });

    // ── 3) 진입 ──
    await page.goto("/coach");

    // ── 4) 셋업: 과제 입력 → 모드 선택(voice) ──
    await expect(page.getByText("어떤 글을 써볼까요")).toBeVisible();
    await page.getByLabel(/학교·학년/).selectOption("중2");
    await page.getByLabel(/과목/).selectOption("과학");
    await page.getByLabel(/어떤 글/).selectOption("설명문");
    await page.getByLabel(/과제 내용/).fill("화산의 형성 과정과 영향을 설명하는 글을 쓰시오");
    await page.getByRole("button", { name: /다음/ }).click();
    await page.getByTestId("mode-voice").click();

    // ── 5) 마이크 버튼 클릭 → FakeRec.start() 호출 → 10ms 후 onresult 발화 ──
    //   VoicePanel은 Canvas 위(BottomSheet 밖)에 배치되므로 일반 .click()으로 동작한다.
    await page.getByTestId("voice-mic").waitFor({ state: "attached" });
    await page.getByTestId("voice-mic").click();

    // ── 6) 전사 줄 + "본문에 넣기" 버튼 노출 확인 ──
    await expect(page.getByTestId("voice-insert-0")).toBeVisible({ timeout: 10_000 });

    // ── 7) "본문에 넣기" 클릭 → handleVoiceInsert → EDIT dispatch → 캔버스 반영 ──
    await page.getByTestId("voice-insert-0").click();

    // ── 8) 캔버스(TipTap contenteditable)에 전사 텍스트 반영 확인 ──
    await expect(page.locator("[data-testid=coach-canvas]")).toContainText("화산은 위험하다", { timeout: 5_000 });
  });
});
