"use client";
// ExportableResultFrame — ResultView 캡처·내보내기·복사 UI를 감싸는 client wrapper (Codex PR #13).
//   ResultView 자체는 server 컴포넌트로 두고, captureRef + CopyButton + ExportButtons만 client.
//   /samples/[id] (server)에서 ResultView 호출 시 본문 JSX가 client 번들에 안 실림 → hydration 비용 ↓.
//
// 캡처 대상: children prop으로 들어오는 결과 본문(C1~C3, banners, sectionnav, growthcard 등).
// 액션 영역: CopyButton + ExportButtons + actions slot. 캡처 영역 밖 — 스크린샷에 자기 자신 제외.
// 면책(C5): 캡처 영역 밖, 액션 영역 아래.

import { useRef, type ReactNode } from "react";
import CopyButton from "./CopyButton";
import ExportButtons from "./ExportButtons";

export type ExportableResultFrameProps = {
  children: ReactNode;          // 캡처 대상 결과 본문
  copyText: string;             // CopyButton에 전달할 텍스트
  filenameBase: string;         // PDF/PNG 파일명 기본(과제 기반)
  actions?: ReactNode;          // 페이지별 부가 액션 ("다른 샘플 보기" / "글 고치고 다시 받기")
  disclaimer: string;           // C5 면책 문구
};

export default function ExportableResultFrame({
  children,
  copyText,
  filenameBase,
  actions,
  disclaimer,
}: ExportableResultFrameProps) {
  // #16 PDF·스크린샷 캡처 대상. children이 채우는 div에 ref 부여 — server에서 받은 콘텐츠도 캡처 가능.
  const captureRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <div ref={captureRef} className="space-y-5">
        {children}
      </div>

      {/* C4. 결과 복사·내보내기(F7) + 부가 액션 + C5. 면책 */}
      <div className="border-border bg-surface space-y-4 rounded-xl border p-5">
        <div className="flex flex-wrap items-center gap-3">
          <CopyButton text={copyText} />
          <ExportButtons targetRef={captureRef} filenameBase={filenameBase} />
          {actions}
        </div>
        <p className="bg-muted text-muted-foreground rounded-md px-3 py-2 text-xs">
          ※ {disclaimer}
        </p>
      </div>
    </>
  );
}
