import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Vitest 설정 — 컴포넌트 테스트(React + jsdom). 순수 모듈 테스트는 scripts/*.test.mjs (node:test) 유지.
//   분리 이유: pure 모듈은 jsdom 의존 없이 빠르게, 컴포넌트는 RTL+jsdom으로 인터랙션 검증.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./scripts/vitest.setup.ts"],
    // 컴포넌트 테스트만 scripts/components/*.test.tsx 패턴으로 분리.
    include: ["scripts/components/**/*.test.{ts,tsx}"],
    // node:test 파일은 제외(별 runner)
    exclude: ["scripts/*.test.mjs", "node_modules", ".next"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
