import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="ko" className="h-full antialiased">
      <body className="bg-background text-foreground flex min-h-full flex-col">
        {children}
      </body>
    </html>
  );
}
