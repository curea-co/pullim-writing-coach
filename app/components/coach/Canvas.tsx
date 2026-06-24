"use client";

// Pullim Writing Coach — U5 코치 캔버스 (docs/27 .canvas + .countbar 포팅)
//
// 학생이 직접 쓰는 리치 에디터. 코치는 답을 대신 쓰지 않으므로 이 입력은 항상 학생 소유.
//   글자수는 코드포인트 기준(grading.charCount과 동일한 의도) — 이모지·한글 1자 처리.
//   부모(CoachClient)는 onChange { html, text }를 받아 html은 외부 state에, text는 reducer로 전달.

import styles from "@/app/coach/coach.module.css";
import RichEditor, { type RichEditorHandle } from "@/app/components/editor/RichEditor";
import { htmlToPlain } from "@/app/lib/editor-doc";

// 코드포인트 기준 길이(서버 char_count 의도와 동일).
function cp(s: string): number {
  return Array.from(s).length;
}

export default function Canvas({
  valueHtml,
  onChange,
  disabled = false,
  spellcheck = false,
  onToggleSpellcheck,
  editorRef,
}: {
  valueHtml: string;
  onChange: (c: { html: string; text: string }) => void;
  disabled?: boolean;
  spellcheck?: boolean;
  onToggleSpellcheck?: () => void;
  editorRef?: React.Ref<RichEditorHandle>;
}) {
  const count = cp(htmlToPlain(valueHtml).trim());
  const charCountId = "canvas-char-count-live";

  return (
    <div className="relative flex-1 overflow-hidden">
      {/* 시각 글자수 배지 — 스크린리더에서는 숨김. pointer-events-none: 위에 떠도 툴바 클릭을 가로채지 않음 */}
      <span
        className={`${styles.monoFont} pointer-events-none absolute right-3.5 top-2 z-10 text-[10.5px] text-[var(--ink-5)]`}
        aria-hidden="true"
      >
        {count.toLocaleString("ko-KR")}자
      </span>
      {/* 스크린리더용 글자수 — aria-describedby 정적 설명(매 타이핑 낭독 방지: live region 아님) */}
      <span id={charCountId} className="sr-only">
        현재 {count.toLocaleString("ko-KR")}자
      </span>
      <div className="h-full w-full overflow-auto px-[18px] pb-[130px] pt-[18px]">
        <RichEditor
          valueHtml={valueHtml}
          onChange={onChange}
          disabled={disabled}
          spellcheck={spellcheck}
          onToggleSpellcheck={onToggleSpellcheck}
          editorRef={editorRef}
          placeholder="여기에 직접 글을 써 보세요."
          ariaLabel="글쓰기 캔버스"
          ariaDescribedby={charCountId}
          dataTestid="coach-canvas"
          editableClassName={styles.canvas}
        />
      </div>
    </div>
  );
}
