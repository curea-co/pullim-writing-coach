"use client";
import { useEffect, useImperativeHandle } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextStyle from "@tiptap/extension-text-style";
import { FontSize } from "./font-size";
import EditorToolbar from "./EditorToolbar";
import { htmlToPlain } from "@/app/lib/editor-doc";

export interface RichEditorChange { html: string; text: string }
export interface RichEditorHandle { focus: () => void }
export interface RichEditorProps {
  valueHtml: string;
  onChange: (c: RichEditorChange) => void;
  spellcheck?: boolean;        // default false
  disabled?: boolean;          // default false
  placeholder?: string;
  editorRef?: React.Ref<RichEditorHandle>;
  ariaLabel?: string;
  ariaDescribedby?: string;    // contenteditable의 aria-describedby (스크린리더 글자수 등)
  onToggleSpellcheck?: () => void;
  dataTestid?: string;
  editableClassName?: string;  // contenteditable 루트에 추가 클래스(예: styles.canvas 노트 배경)
  editableId?: string;         // contenteditable 요소의 id (e2e 셀렉터 + a11y 훅)
}

export default function RichEditor({
  valueHtml, onChange, spellcheck = false, disabled = false, placeholder, editorRef, ariaLabel, ariaDescribedby, onToggleSpellcheck, dataTestid, editableClassName, editableId,
}: RichEditorProps) {
  const editor = useEditor({
    immediatelyRender: false, // SSR 안전
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2] },
        bulletList: false,
        orderedList: false,
        listItem: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        strike: false,
        italic: false,
        horizontalRule: false,
        hardBreak: false, // Shift+Enter <br> 비활성 — 평문 왕복(\n↔<p>)에서 br→p 변환 불일치 제거(범위 밖)
      }),
      TextStyle,
      FontSize,
    ],
    content: valueHtml || "",
    editorProps: {
      attributes: {
        class: `tiptap min-h-40 h-full w-full px-3 py-2 text-sm leading-relaxed focus:outline-none${editableClassName ? ` ${editableClassName}` : ""}`,
        spellcheck: spellcheck ? "true" : "false",
        // contenteditable을 접근성 textbox로 노출 — 스크린리더가 다중행 입력으로 인식 + getByRole 검증 가능.
        role: "textbox",
        "aria-multiline": "true",
        ...(ariaLabel ? { "aria-label": ariaLabel } : {}),
        ...(ariaDescribedby ? { "aria-describedby": ariaDescribedby } : {}),
        ...(dataTestid ? { "data-testid": dataTestid } : {}),
        ...(editableId ? { id: editableId } : {}),
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange({ html, text: htmlToPlain(html) });
    },
  });

  useImperativeHandle(editorRef, () => ({ focus: () => editor?.commands.focus() }), [editor, editorRef]);

  // valueHtml prop 변화를 에디터에 동기화 (복원/리셋 시 반영).
  // 타이핑 중엔 호스트가 getHTML()을 valueHtml에 저장하므로 값이 같아 setContent 스킵 → 커서 유지.
  // emitUpdate=false로 onChange를 재발사하지 않음.
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (valueHtml !== current) {
      editor.commands.setContent(valueHtml || "", false);
    }
  }, [editor, valueHtml]);

  // disabled prop 변화 반영 — 렌더 중 뮤테이션 방지, useEffect로 처리.
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [editor, disabled]);

  // spellcheck prop 변화를 contenteditable DOM에 반영 (초기 속성은 editorProps에서도 설정).
  useEffect(() => {
    if (!editor) return;
    const dom = editor.view?.dom as HTMLElement | undefined;
    if (dom) dom.setAttribute("spellcheck", spellcheck ? "true" : "false");
  }, [editor, spellcheck]);

  return (
    <div className="border-border bg-background flex h-full flex-col rounded-lg border">
      <EditorToolbar editor={editor} spellcheck={spellcheck} onToggleSpellcheck={onToggleSpellcheck} disabled={disabled} />
      <div className="flex-1 overflow-auto">
        <EditorContent editor={editor} className="h-full" />
        {placeholder && editor?.isEmpty ? (
          <div className="text-subtle-foreground pointer-events-none -mt-9 px-3 text-sm" aria-hidden>{placeholder}</div>
        ) : null}
      </div>
    </div>
  );
}
