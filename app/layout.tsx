import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import { SAMPLES } from "./data/samples";

// 사이드바용 경량 메타데이터만 서버에서 추출 → client 번들에 SAMPLES 전체(본문·피드백)가
// 실리지 않게 한다(curea-review-ai 지적). 라벨/카테고리/총점만 직렬화해 전달.
const NAV_SAMPLES = SAMPLES.map((s) => ({
  id: s.id,
  label: s.label,
  category: s.category,
  total: s.output.total_score,
}));

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
      </head>
      <body className="bg-background text-foreground min-h-full">
        {/* 데스크톱: 좌측 사이드바 + 콘텐츠 / 모바일: 상단바(Sidebar 내부) 아래 콘텐츠 */}
        <div className="md:flex md:min-h-screen">
          <Sidebar samples={NAV_SAMPLES} />
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </body>
    </html>
  );
}
