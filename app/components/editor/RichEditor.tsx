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
  onToggleSpellcheck?: () => void;
}

export default function RichEditor({
  valueHtml, onChange, spellcheck = false, disabled = false, placeholder, editorRef, ariaLabel, onToggleSpellcheck,
}: RichEditorProps) {
  const editor = useEditor({
    immediatelyRender: false, // SSR 안전
    editable: !disabled,
    extensions: [StarterKit.configure({ heading: { levels: [1, 2] } }), TextStyle, FontSize],
    content: valueHtml || "",
    editorProps: {
      attributes: {
        class: "tiptap min-h-40 w-full px-3 py-2 text-sm leading-relaxed focus:outline-none",
        spellcheck: spellcheck ? "true" : "false",
        ...(ariaLabel ? { "aria-label": ariaLabel } : {}),
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      onChange({ html, text: htmlToPlain(html) });
    },
  });

  useImperativeHandle(editorRef, () => ({ focus: () => editor?.commands.focus() }), [editor]);

  // disabled prop 변화 반영 — 렌더 중 뮤테이션 방지, useEffect로 처리.
  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled);
    }
  }, [editor, disabled]);

  return (
    <div className="border-border bg-background rounded-lg border">
      <EditorToolbar editor={editor} spellcheck={spellcheck} onToggleSpellcheck={onToggleSpellcheck} />
      <EditorContent editor={editor} aria-label={ariaLabel} />
      {placeholder && editor?.isEmpty ? (
        <div className="text-subtle-foreground pointer-events-none -mt-9 px-3 text-sm" aria-hidden>{placeholder}</div>
      ) : null}
    </div>
  );
}
