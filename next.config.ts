import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  // Source map 업로드용. SENTRY_AUTH_TOKEN·SENTRY_ORG·SENTRY_PROJECT 미설정 시 build에 영향 없음(no-op).
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  disableLogger: true,
  // /monitoring 경로로 Sentry 이벤트 터널링 — ad-block·corp proxy로 sentry.io 차단된 환경 우회.
  tunnelRoute: "/monitoring",
});
