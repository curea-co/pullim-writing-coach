import type { Metadata } from "next";
import "./globals.css";
import Nav from "./components/nav/Nav";

export const metadata: Metadata = {
  title: "풀림 라이팅코치 — 대신 안 써주고, 네가 더 잘 쓰게",
  description:
    "수행평가 글쓰기 과정 코치. AI가 대신 써주지 않고, 5영역 루브릭으로 어디를 어떻게 고칠지 짚어 네가 직접 더 잘 쓰게 합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning — 아래 inline script가 <html data-theme="..."> 를
    //   클라이언트에서 추가하므로 SSR HTML(attribute 없음)과 mismatch가 발생한다.
    //   이 mismatch는 의도된 것(테마는 client 전용 상태)이므로 React에 무시 요청.
    //   warning은 <html> 한 단계에만 적용되며 자식 트리에는 영향 없음(next-themes 표준 패턴).
    <html lang="ko" className="h-full antialiased" suppressHydrationWarning>
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
        {/* 상단 frosted 네비(pullim.ai parity) + 콘텐츠. 좌측 Sidebar는 은퇴(top-nav로 일원화). */}
        <Nav />
        <div className="min-w-0">{children}</div>
      </body>
    </html>
  );
}
