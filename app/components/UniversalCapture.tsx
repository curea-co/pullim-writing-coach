"use client";
// UniversalCapture — 단일 캡처 존 6채널 (사진·파일·붙여넣기·링크·말·타이핑).
//   "붙여넣지 말고 던져라. 정리는 코치가 한다." — 카메라/OCR 우선, 복붙은 강요 X.
//
// 2026-06-08 v2 이식 (Phase 1 PR C):
//   - CaptureChannel = ExtractChannel (lib/extract 화이트리스트와 단일 source). PR A에서 정의.
//   - link/voice는 시각 프로토타입(mock). 실제 server fetch + 받아쓰기는 출시 후 단계.

import { useRef, useState } from "react";
import { cn } from "@/app/lib/utils";
import { type ExtractChannel } from "@/app/lib/extract";

export type CaptureChannel = ExtractChannel;

export type CaptureResult = {
  channel: CaptureChannel;
  text: string;
  filename?: string;
  url?: string;
};

const CHANNELS: { id: CaptureChannel; icon: string; label: string; help: string }[] = [
  { id: "photo", icon: "📷", label: "사진/스캔", help: "공책·종이 답안지를 폰으로 촬영" },
  { id: "file", icon: "📄", label: "파일", help: "HWP · DOCX · PDF · 이미지" },
  { id: "paste", icon: "📋", label: "붙여넣기", help: "이미 복사해 둔 글" },
  { id: "link", icon: "🔗", label: "링크", help: "구글 독스 · 노션 공개 링크" },
  { id: "voice", icon: "🎤", label: "말로 불러주기", help: "받아쓰기 — 보강용" },
  { id: "type", icon: "⌨️", label: "직접 타이핑", help: "여기에 바로 작성" },
];

export default function UniversalCapture({
  variant,
  title,
  hint,
  onCapture,
}: {
  variant: "assignment" | "writing"; // 안내서 / 결과물
  title: string;
  hint: string;
  onCapture: (result: CaptureResult) => void;
}) {
  const [text, setText] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = (
    channel: CaptureChannel,
    payload: string,
    meta?: { filename?: string; url?: string },
  ) => {
    if (!payload.trim() && channel !== "file" && channel !== "photo") return;
    onCapture({ channel, text: payload, ...meta });
  };

  const submitLink = () => {
    const url = linkUrl.trim();
    if (!url) return;
    // Codex PR #70: 링크 본문 fetch + readability 미구현 — mock 본문을 onCapture에 넘기면
    //   상위가 실제 본문으로 추출/채점 진행해 잘못된 결과. 사용자에게 안내만, onCapture 호출 X.
    //   fetch + readability 도입은 별도 PR (W3 또는 출시 후).
    window.alert(
      "링크 본문 자동 추출은 아직 준비 중이에요. 링크된 문서의 본문을 직접 복사해 붙여넣어 주세요.",
    );
    setLinkUrl("");
    setLinkOpen(false);
  };

  // Codex PR #70: 파일 드래그만 가로채기. 일반 텍스트(다른 앱/탭에서 드래그) 드롭은
  //   브라우저 기본 동작(textarea에 텍스트 삽입) 유지 — 회귀 방지 (ScoreForm PR #37 패턴).
  const hasFilesInDataTransfer = (dt: DataTransfer): boolean =>
    Array.from(dt.types || []).includes("Files");

  const handleFile = async (channel: "file" | "photo", f: File) => {
    // Codex PR #70: mock placeholder 본문을 onCapture에 넘기면 상위가 그걸 실제 본문으로
    //   추출/채점 → 잘못된 결과. 지원 형식(txt/md/docx)만 실제 파싱, 그 외(hwp·pdf·이미지)는
    //   alert + return. PDF·HWP·이미지 OCR 파싱은 별도 PR (W3 또는 출시 후).
    const isText = /\.(txt|md)$/i.test(f.name);
    const isDocx = /\.docx$/i.test(f.name);

    if (isText) {
      // ScoreForm PR #37 패턴: UTF-8 fatal 시도 → 실패 시 EUC-KR fallback.
      const buffer = await f.arrayBuffer();
      let text: string;
      try {
        text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
      } catch {
        try {
          text = new TextDecoder("euc-kr").decode(buffer);
        } catch {
          window.alert(
            "파일 인코딩을 알아보지 못했어요. UTF-8로 다시 저장하거나 본문을 직접 붙여넣어 주세요.",
          );
          return;
        }
      }
      submit(channel, text, { filename: f.name });
      return;
    }

    if (isDocx) {
      // ScoreForm 패턴 — mammoth lazy import (초기 번들 영향 0).
      try {
        const mammoth = await import("mammoth");
        const arrayBuffer = await f.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        const text = result.value?.trim() ?? "";
        if (!text) {
          window.alert("DOCX에서 본문을 찾지 못했어요. 파일이 비어 있거나 손상됐을 수 있어요.");
          return;
        }
        submit(channel, text, { filename: f.name });
      } catch {
        window.alert(
          "DOCX 파일을 읽지 못했어요. 다른 .docx 파일로 시도하거나 본문을 직접 붙여넣어 주세요.",
        );
      }
      return;
    }

    // HWP·PDF·이미지 — 파싱·OCR 미구현. 사용자에게 직접 입력 안내, mock 본문은 넘기지 않음.
    const guidance = /\.hwp/i.test(f.name)
      ? "HWP 파싱은 아직 준비 중이에요. PDF나 텍스트로 변환해 다시 올리거나 본문을 직접 붙여넣어 주세요."
      : /\.pdf/i.test(f.name)
        ? "PDF 파싱은 아직 준비 중이에요. 본문을 복사해 붙여넣거나 텍스트 파일로 변환해 주세요."
        : "사진/이미지 OCR은 아직 준비 중이에요. 본문을 직접 타이핑하거나 텍스트로 붙여넣어 주세요.";
    window.alert(guidance);
  };

  return (
    <div className="space-y-4">
      <div className="text-center">
        <h2 className="text-foreground text-xl font-bold tracking-tight md:text-2xl">{title}</h2>
        <p className="text-muted-foreground mt-2 text-sm">{hint}</p>
      </div>

      {/* 큰 캡처 존 — 스마트폰 액정 스타일(베젤 + 노치 + 인셋 디스플레이). 드래그·타이핑·붙여넣기 동시. */}
      <div
        className={cn(
          "border-border bg-surface relative mx-auto max-w-md rounded-[2rem] border p-3 shadow-xl transition",
          dragOver && "ring-accent-mid ring-2",
        )}
        onDragOver={(e) => {
          // Codex PR #70: 파일 드래그만 가로채기 — 일반 텍스트 드래그는 기본 textarea 삽입 유지.
          if (!hasFilesInDataTransfer(e.dataTransfer)) return;
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          if (!hasFilesInDataTransfer(e.dataTransfer)) {
            setDragOver(false);
            return;
          }
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files[0];
          if (f) void handleFile("file", f);
        }}
      >
        {/* 상단 스피커·전면 카메라 (노치 느낌) */}
        <div className="mb-2.5 flex items-center justify-center gap-1.5" aria-hidden>
          <span className="bg-muted-foreground/30 h-1.5 w-12 rounded-full" />
          <span className="bg-muted-foreground/40 h-1.5 w-1.5 rounded-full" />
        </div>

        {/* 액정 화면 — 안쪽으로 들어간 디스플레이 */}
        <div className="bg-background ring-border/60 rounded-[1.5rem] px-5 py-5 ring-1">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              variant === "assignment"
                ? "여기에 안내서를 던지거나, 직접 타이핑하거나, 복사한 텍스트를 붙여넣으세요."
                : "여기에 글을 던지거나, 직접 타이핑하거나, 복사한 텍스트를 붙여넣으세요."
            }
            rows={8}
            className="text-foreground placeholder:text-subtle-foreground w-full resize-none bg-transparent text-sm leading-relaxed outline-none"
          />
          <div className="text-subtle-foreground mt-2 flex items-center justify-between text-xs">
            <span>{text.length}자 · 글이 짧아도 괜찮아요 — 코치가 정리해요</span>
            {text.trim().length > 0 && (
              <button
                type="button"
                onClick={() => submit("type", text)}
                className="bg-primary text-primary-foreground rounded-md px-3 py-1 text-xs font-semibold"
              >
                이대로 보내기 →
              </button>
            )}
          </div>
        </div>

        {/* 하단 홈 인디케이터 */}
        <div className="bg-muted-foreground/25 mx-auto mt-3 h-1 w-24 rounded-full" aria-hidden />
      </div>

      {/* 채널 버튼 — 카메라·파일·링크·말·붙여넣기 (큰 영역과 별개의 한 줄)
          Codex PR #70: 미구현 채널(photo OCR · link fetch · voice STT)은 disabled + "준비 중"
          뱃지. 사진 채널의 "추천" 강조는 실제 OCR 미구현이라 misleading — 제거. */}
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {CHANNELS.map((c) => {
          const isPhoto = c.id === "photo";
          const isFile = c.id === "file";
          const isVoice = c.id === "voice";
          const isLink = c.id === "link";
          const isPaste = c.id === "paste";
          // 미구현 채널 disabled — UX dead-end 차단. file은 .txt/.md/.docx만 실제 처리되지만
          // 그건 UI에서 미리 알 수 없으므로 enabled 유지 (handleFile이 미지원 형식 alert).
          const isDisabled = isPhoto || isLink || isVoice;
          return (
            <button
              key={c.id}
              type="button"
              title={c.help}
              disabled={isDisabled}
              onClick={() => {
                if (isFile) fileRef.current?.click();
                else if (isPaste) {
                  // Codex PR #70 (ScoreForm 패턴): clipboard API 없는 환경 가드.
                  if (!navigator.clipboard?.readText) {
                    window.alert(
                      "이 브라우저는 클립보드 자동 읽기를 지원하지 않아요. 큰 입력창에 직접 붙여넣어(Ctrl/⌘+V) 주세요.",
                    );
                    return;
                  }
                  navigator.clipboard
                    .readText()
                    .then((t) => {
                      if (t) submit("paste", t);
                      else window.alert("클립보드가 비어 있어요. 복사한 뒤 다시 눌러 주세요.");
                    })
                    .catch(() =>
                      window.alert(
                        "클립보드 읽기 권한이 없어요. 큰 입력창에 직접 붙여넣어(Ctrl/⌘+V) 주세요.",
                      ),
                    );
                } else {
                  // type — 큰 영역에 포커스 (querySelector 대신 ref 사용 — Codex PR #67 학습)
                  textareaRef.current?.focus();
                }
              }}
              className={cn(
                "border-border bg-surface text-foreground flex flex-col items-center gap-1 rounded-xl border px-2 py-3 transition",
                !isDisabled && "hover:bg-muted",
                isDisabled && "cursor-not-allowed opacity-50",
              )}
            >
              <span className="text-xl" aria-hidden>
                {c.icon}
              </span>
              <span className="text-xs font-medium leading-tight text-center">{c.label}</span>
              {isDisabled && (
                <span className="bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 text-[9px] font-semibold">
                  준비 중
                </span>
              )}
            </button>
          );
        })}
        <input
          ref={photoRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => {
            if (e.target.files?.[0]) void handleFile("photo", e.target.files[0]);
            // Codex PR #70: 같은 파일 재선택 시 onChange 재발화 위해 value 비움 (ScoreForm 패턴).
            e.target.value = "";
          }}
          className="hidden"
        />
        <input
          ref={fileRef}
          type="file"
          accept=".hwp,.hwpx,.docx,.pdf,.txt,.md,image/*"
          onChange={(e) => {
            if (e.target.files?.[0]) void handleFile("file", e.target.files[0]);
            e.target.value = "";
          }}
          className="hidden"
        />
      </div>

      {/* 링크 채널 — 인라인 URL 입력 (native prompt 대신 카드 UI) */}
      {linkOpen && (
        <div className="border-accent-mid bg-accent-mid-surface space-y-2 rounded-xl border p-3">
          <label className="text-foreground block text-xs font-semibold">
            🔗 공개 링크 붙여넣기
            <span className="text-subtle-foreground font-normal"> — 구글 독스 · 노션 · 블로그</span>
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="url"
              autoFocus
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitLink();
                else if (e.key === "Escape") {
                  setLinkOpen(false);
                  setLinkUrl("");
                }
              }}
              placeholder="https://docs.google.com/..."
              className="border-border bg-surface text-foreground placeholder:text-subtle-foreground flex-1 rounded-lg border px-3 py-2 text-sm outline-none"
            />
            <button
              type="button"
              onClick={submitLink}
              disabled={!linkUrl.trim()}
              className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-40"
            >
              가져오기 →
            </button>
          </div>
          <p className="text-subtle-foreground text-[11px] leading-relaxed">
            ※ 시각 프로토타입 — 링크 본문 추출은 mock입니다. 다음 단계서 미리보기·수정 가능.
          </p>
        </div>
      )}
    </div>
  );
}
