"use client";
// Codex PR #60: App Router error boundary가 흡수하는 클라/서버 컴포넌트 렌더 에러는
// instrumentation.ts의 onRequestError로 못 잡힘 — global-error.tsx에서 직접 Sentry로 송신.
// Next.js App Router 규약상 이 파일은 root layout 자체가 깨졌을 때 fallback.
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="ko">
      <body>
        <main className="mx-auto w-full max-w-md px-5 py-12 text-center">
          <h1 className="text-foreground text-xl font-bold">
            문제가 생겼어요
          </h1>
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
            잠시 후 다시 시도해 주세요.
          </p>
        </main>
      </body>
    </html>
  );
}
