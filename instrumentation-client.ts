// Next.js 16 client instrumentation — Sentry 브라우저 초기화.
//   NEXT_PUBLIC_SENTRY_DSN 미설정 시 no-op.
//   Hydration 전 실행되므로 초기 에러도 캡처. sendDefaultPii=false — 학생 PII 보호.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV || "development",
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0.1,
    sendDefaultPii: false,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
