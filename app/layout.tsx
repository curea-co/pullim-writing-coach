import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "./components/app-shell";

export const metadata: Metadata = {
  title: "Pullim Writing Coach",
  description:
    "수행평가 글, AI가 5가지 기준으로 채점하고 잘한 점·고칠 점·수정 가이드를 코칭 말투로 보여드려요.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" data-theme="pullim-os" className="h-full antialiased">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
        {/* Pullim 브랜드 폰트(U6) — Bai Jamjuree(브랜드/헤딩) + JetBrains Mono(라벨/모노).
            Pretendard와 동일하게 CDN <link> 패턴으로 로드(next/font 미사용, additive).
            preconnect로 핸드셰이크 비용 절감. globals.css @theme의 --font-brand/--font-mono가 사용. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bai+Jamjuree:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
        />
      </head>
      <body className="bg-background text-foreground min-h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
