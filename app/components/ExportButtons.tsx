"use client";
// #16 PDF / 스크린샷 이미지 내보내기.
//   targetRef = 캡처 대상 DOM. html2canvas-pro로 canvas → PNG / jsPDF로 A4 단일페이지 PDF.
//   원조 html2canvas는 oklch()/lab() 색 함수 미지원이라 globals.css 토큰과 충돌 — pro 포크 사용.
//   lib는 dynamic import — 초기 번들 영향 0 (사용자가 버튼 누를 때만 로드).
//   M3 단순화: 결과가 A4 1페이지 넘어가면 그대로 박음(잘림). 멀티페이지 분할은 별 폴리시.

import { useState } from "react";
import { cn } from "@/app/lib/utils";

type Mode = "idle" | "image" | "pdf";

export default function ExportButtons({
  targetRef,
  filenameBase = "pullim-writing-coach",
}: {
  targetRef: React.RefObject<HTMLElement | null>;
  filenameBase?: string;
}) {
  const [mode, setMode] = useState<Mode>("idle");
  const [error, setError] = useState<string | null>(null);

  const safeFilename = (ext: string) => {
    const dt = new Date().toISOString().slice(0, 10);
    // 윈도/맥/리눅스 모두 안전한 문자만
    const clean = filenameBase.replace(/[/\\?%*:|"<>]+/g, "-").replace(/\s+/g, "_");
    return `${clean}-${dt}.${ext}`;
  };

  async function capture(): Promise<HTMLCanvasElement> {
    const node = targetRef.current;
    if (!node) throw new Error("캡처할 영역을 찾지 못했어요.");
    // html2canvas-pro dynamic import — 초기 번들 영향 0. oklch/lab 색 함수 지원.
    const html2canvas = (await import("html2canvas-pro")).default;
    return html2canvas(node, {
      backgroundColor: "#ffffff",
      // 레티나/고해상도 디스플레이는 2x, 일반은 1.5x로 가독성 확보(파일 크기 절충).
      scale: typeof window !== "undefined" && window.devicePixelRatio > 1 ? 2 : 1.5,
      logging: false,
      useCORS: true,
    });
  }

  async function downloadImage() {
    setError(null);
    setMode("image");
    try {
      const canvas = await capture();
      await new Promise<void>((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("이미지 생성 실패"));
            return;
          }
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = safeFilename("png");
          document.body.appendChild(a);
          a.click();
          a.remove();
          // Codex PR #13: 즉시 revoke 시 Safari/Firefox에서 간헐적으로 다운로드 실패.
          // setTimeout으로 next tick 이후 revoke — 다운로드 시작 후 안전한 정리.
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          resolve();
        }, "image/png");
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "이미지 저장에 실패했어요");
    } finally {
      setMode("idle");
    }
  }

  async function downloadPdf() {
    setError(null);
    setMode("pdf");
    try {
      const canvas = await capture();
      const { jsPDF } = await import("jspdf");
      // A4 세로(210x297mm), 좌우상하 10mm 여백 → 콘텐츠 영역 190x277mm.
      const pdfWidth = 190;
      const pageContentHeight = 277;
      const aspect = canvas.height / canvas.width;
      const imgHeightMm = pdfWidth * aspect;
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });

      if (imgHeightMm <= pageContentHeight) {
        // 단일 페이지 — 원본 그대로.
        pdf.addImage(canvas.toDataURL("image/png"), "PNG", 10, 10, pdfWidth, imgHeightMm);
      } else {
        // #10 멀티페이지 캔버스 슬라이싱 — 페이지마다 해당 구간만 잘라 addImage.
        //   이전 negative y-offset 방식(PR #48)은 같은 이미지를 N번 embed → 파일 사이즈 N배.
        //   슬라이싱은 각 페이지가 고유 PNG라 사이즈 1배. 메모리 비용은 페이지 수×슬라이스 캔버스.
        const pageHeightPx = Math.floor(pageContentHeight * (canvas.width / pdfWidth));
        let yPx = 0;
        let pageNum = 0;
        while (yPx < canvas.height) {
          const sliceHeightPx = Math.min(pageHeightPx, canvas.height - yPx);
          const sliceCanvas = document.createElement("canvas");
          sliceCanvas.width = canvas.width;
          sliceCanvas.height = sliceHeightPx;
          const ctx = sliceCanvas.getContext("2d");
          if (!ctx) throw new Error("Canvas 2D context not available");
          // 원본 캔버스의 (0, yPx, width, sliceHeightPx) 영역을 sliceCanvas의 (0, 0)에 복사.
          ctx.drawImage(
            canvas,
            0, yPx, canvas.width, sliceHeightPx,
            0, 0, canvas.width, sliceHeightPx,
          );
          const sliceData = sliceCanvas.toDataURL("image/png");
          const sliceHeightMm = (sliceHeightPx / canvas.width) * pdfWidth;
          if (pageNum > 0) pdf.addPage();
          pdf.addImage(sliceData, "PNG", 10, 10, pdfWidth, sliceHeightMm);
          yPx += pageHeightPx;
          pageNum++;
        }
      }
      pdf.save(safeFilename("pdf"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF 저장에 실패했어요");
    } finally {
      setMode("idle");
    }
  }

  const busy = mode !== "idle";
  const btnBase =
    "inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground transition";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={downloadPdf}
        disabled={busy}
        aria-busy={mode === "pdf"}
        className={cn(btnBase, busy ? "cursor-not-allowed opacity-60" : "hover:bg-muted")}
      >
        {mode === "pdf" ? (
          <>
            <Spinner /> PDF 생성 중…
          </>
        ) : (
          <>📄 PDF 저장</>
        )}
      </button>
      <button
        type="button"
        onClick={downloadImage}
        disabled={busy}
        aria-busy={mode === "image"}
        className={cn(btnBase, busy ? "cursor-not-allowed opacity-60" : "hover:bg-muted")}
      >
        {mode === "image" ? (
          <>
            <Spinner /> 이미지 생성 중…
          </>
        ) : (
          <>🖼 스크린샷 저장</>
        )}
      </button>
      {error && (
        <span
          role="alert"
          className="text-band-warn-foreground break-keep text-xs"
        >
          {error}
        </span>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <span
      aria-hidden
      className="border-primary inline-block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-t-transparent"
    />
  );
}
