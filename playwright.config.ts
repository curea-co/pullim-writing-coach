import { defineConfig, devices } from "@playwright/test";

// Playwright 설정 — /try E2E 회귀 트랙 A.
//   webServer로 next dev 자동 기동 (CI에서도 동일). Chromium headless 1개로 시작.
//   /try는 토큰 게이트 뒤이므로 테스트에서 sessionStorage에 mock 토큰 주입 + API mock.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "line" : "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  // 멀티 브라우저 회귀 (#12 UX polish) — chromium·firefox·webkit 3종 매트릭스.
  //   로컬: `npm run test:e2e` 모두 실행 (~45초). `--project=chromium`으로 단일 필터.
  //   CI: 캐시 미스 시 첫 run에서 firefox + webkit 추가 다운로드 (~250MB).
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
