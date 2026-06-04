// Next.js 16 client instrumentation — Sentry 브라우저 초기화.
//   NEXT_PUBLIC_SENTRY_DSN 미설정 시 no-op.
//   Hydration 전 실행되므로 초기 에러도 캡처. sendDefaultPii=false — 학생 PII 보호.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    // Codex PR #60: Vercel이 아닌 prod 배포에서 NEXT_PUBLIC_VERCEL_ENV가 비면 실 prod 에러가
    // development로 들어감. 서버(VERCEL_ENV || NODE_ENV)와 일치하게 NODE_ENV fallback 추가.
    environment:
      process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || "development",
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,
    sendDefaultPii: false,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
