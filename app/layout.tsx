import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "./components/Sidebar";

export const metadata: Metadata = {
  title: "Pullim Writing Coach — 데모",
  description:
    "수행평가 글, AI가 5가지 기준으로 첨삭해 드려요. Week 1 산출물 — 5개 학생 글 샘플의 채점 결과 미리보기.",
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
        {/* 데스크톱: 좌측 사이드바 + 콘텐츠 / 모바일: 상단바(Sidebar 내부) 아래 콘텐츠 */}
        <div className="md:flex md:min-h-screen">
          <Sidebar />
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </body>
    </html>
  );
}
