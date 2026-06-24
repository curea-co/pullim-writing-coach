"use client";
import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";

const BTN = "rounded px-2 py-1 text-xs font-medium hover:bg-muted disabled:opacity-40";
const ON = "bg-muted text-foreground";

export default function EditorToolbar({
  editor, spellcheck, onToggleSpellcheck, disabled = false,
}: { editor: Editor | null; spellcheck?: boolean; onToggleSpellcheck?: () => void; disabled?: boolean }) {
  // Bug 1 fix: subscribe to editor state changes so active-states and font-size
  // value stay in sync as the caret moves. useEditorState (tiptap v2.27) fires a
  // re-render only when the selected values actually change (deep-equal guard).
  const ed = useEditorState({
    editor: editor as Editor,
    selector: ({ editor: e }) => e ? {
      h1: e.isActive("heading", { level: 1 }),
      h2: e.isActive("heading", { level: 2 }),
      bold: e.isActive("bold"),
      fontSize: (e.getAttributes("textStyle").fontSize as string | undefined) ?? "",
    } : null,
  });

  if (!editor) return null;
  return (
    <div className="border-border flex flex-wrap items-center gap-1 border-b px-2 py-1.5" role="toolbar" aria-label="서식 도구">
      <button type="button" disabled={disabled} className={`${BTN} ${ed?.h1 ? ON : ""}`}
        onClick={() => { if (disabled) return; editor.chain().focus().toggleHeading({ level: 1 }).run(); }} aria-pressed={ed?.h1 ?? false}>제목1</button>
      <button type="button" disabled={disabled} className={`${BTN} ${ed?.h2 ? ON : ""}`}
        onClick={() => { if (disabled) return; editor.chain().focus().toggleHeading({ level: 2 }).run(); }} aria-pressed={ed?.h2 ?? false}>제목2</button>
      <button type="button" disabled={disabled} className={`${BTN} ${ed?.bold ? ON : ""}`}
        onClick={() => { if (disabled) return; editor.chain().focus().toggleBold().run(); }} aria-pressed={ed?.bold ?? false}>볼드</button>
      <select aria-label="폰트 크기" disabled={disabled} className="rounded border-border bg-background px-1 py-0.5 text-xs disabled:opacity-40"
        value={ed?.fontSize ?? ""}
        onChange={(e) => { if (disabled) return; const v = e.target.value; v ? editor.chain().focus().setFontSize(v).run() : editor.chain().focus().unsetFontSize().run(); }}>
        <option value="">기본</option><option value="14px">작게</option><option value="18px">크게</option><option value="24px">아주 크게</option>
      </select>
      {onToggleSpellcheck ? (
        // Bug 2 fix: add disabled prop and guard so the button is locked when
        // the editor is in checking/done state, consistent with other controls.
        <button type="button" disabled={disabled} className={`${BTN} ${spellcheck ? ON : ""}`}
          onClick={() => { if (disabled) return; onToggleSpellcheck(); }} aria-pressed={!!spellcheck}>맞춤법 표시</button>
      ) : null}
    </div>
  );
}
