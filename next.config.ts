import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // 로컬 SSO: *.pullim.local 호스트 접속 시 dev 리소스(HMR·청크) 허용(dev 전용 — prod 무관).
  //   미설정 시 Next 16이 cross-origin dev 리소스를 차단해 hydrate 실패 → 인증 상태가 loading에 멈춤.
  allowedDevOrigins: ["writing.pullim.local", "pullim.local", "os.pullim.local", "api.pullim.local"],
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
