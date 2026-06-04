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
    <html lang="ko" className="h-full antialiased">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css"
        />
        {/* 다크/라이트 FOUC 가드 — DOM 페인트 직전에 documentElement.dataset.theme 적용.
            localStorage 우선, 없으면 OS prefers-color-scheme. SSR HTML과 CSS variable
            소스를 같은 timing에 동기화해 깜빡임/SSR mismatch 모두 회피. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('pwc_theme_v1');if(t!=='dark'&&t!=='light'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.dataset.theme=t;}catch(e){document.documentElement.dataset.theme='light';}})();`,
          }}
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
