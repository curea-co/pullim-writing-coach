"use client";
// Codex PR #60: global-error.tsx는 root layout 버블만 처리 — 일반 page/segment의
// Server/Client Component 렌더 예외는 이 파일이 받아 Sentry로 송신.
// Next.js App Router 규약: app/error.tsx는 모든 하위 segment의 에러 바운더리.
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main className="mx-auto w-full max-w-md px-5 py-12">
      <h1 className="text-foreground text-xl font-bold">문제가 생겼어요</h1>
      <p className="text-muted-foreground break-keep mt-3 text-justify text-sm leading-relaxed">
        예상치 못한 오류가 발생했어요. 잠시 후 다시 시도해 주세요.
      </p>
      <button
        type="button"
        onClick={reset}
        className="bg-primary text-primary-foreground mt-6 inline-flex h-11 items-center rounded-xl px-5 text-sm font-semibold"
      >
        다시 시도
      </button>
    </main>
  );
}
