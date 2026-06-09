"use client";

// Pullim Writing Coach — U5 코치 캔버스 (docs/27 .canvas + .countbar 포팅)
//
// 학생이 직접 쓰는 노트형 textarea. 코치는 답을 대신 쓰지 않으므로 이 입력은 항상 학생 소유.
//   글자수는 코드포인트 기준(grading.charCount과 동일한 의도) — 이모지·한글 1자 처리.
//   하단 패딩은 바텀시트가 캔버스를 가려도 끝줄이 보이도록 크게 둔다.

import { useId } from "react";
import styles from "@/app/coach/coach.module.css";

// 코드포인트 기준 길이(서버 char_count 의도와 동일).
function cp(s: string): number {
  return Array.from(s).length;
}

export default function Canvas({
  value,
  onChange,
  disabled = false,
  textareaRef,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  textareaRef?: React.Ref<HTMLTextAreaElement>;
}) {
  const id = useId();
  const count = cp(value.trim());

  return (
    <div className="relative flex-1 overflow-hidden">
      <span
        className={`${styles.monoFont} absolute right-3.5 top-2 z-10 text-[10.5px] text-[var(--ink-5)]`}
        aria-hidden="true"
      >
        {count.toLocaleString("ko-KR")}자
      </span>
      <label htmlFor={id} className="sr-only">
        글쓰기 캔버스
      </label>
      <textarea
        id={id}
        ref={textareaRef}
        data-testid="coach-canvas"
        className={`${styles.canvas} h-full w-full resize-none border-0 bg-transparent px-[18px] pb-[130px] pt-[18px] text-[16px] outline-none`}
        spellCheck={false}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        placeholder="여기에 직접 글을 써 보세요."
        aria-describedby={`${id}-count`}
      />
      <span id={`${id}-count`} className="sr-only">
        현재 {count}자
      </span>
    </div>
  );
}
