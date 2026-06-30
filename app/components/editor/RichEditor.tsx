"use client";
import { useEffect, useImperativeHandle, useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextStyle from "@tiptap/extension-text-style";
import { FontSize } from "./font-size";
import EditorToolbar from "./EditorToolbar";
import { htmlToPlain } from "@/app/lib/editor-doc";

export interface RichEditorChange { html: string; text: string }
export interface RichEditorHandle { focus: () => void; insertBlock: (text: string) => void }
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
  // ★ PR #115 결함 4: 에디터 ↔ 호스트 desync 방지.
  //   immediatelyRender:false로 에디터가 비동기 마운트되며 webkit에서 "빈 초기 onUpdate"를 늦게
  //   발사하는데, 그 echo가 파일 업로드·복원·클립보드로 막 채운 호스트 body를 ""로 되돌려 desync
  //   시켰다(E2E flaky: 에디터엔 본문 보이는데 '다음 단계' 비활성).
  //   가드: 사용자 입력이 한 번이라도 들어오기 전(userTyped=false)에 발사되는 "빈 내용" onUpdate는
  //   사용자 편집이 아니라 마운트/프로그램적 echo다 → host onChange를 발사하지 않는다. 사용자가
  //   실제로 입력하기 시작하면(비어있지 않은 onUpdate 1회) 이후 전체 삭제(빈 onUpdate)는 정상 전파.
  const userTyped = useRef<boolean>(false);
  const isEmptyText = (t: string) => t.trim().length === 0;

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
      const text = htmlToPlain(html);
      // 비어있지 않은 onUpdate면 사용자 입력이 시작된 것으로 표시(이후 빈 onUpdate는 정상 전파).
      if (!isEmptyText(text)) userTyped.current = true;
      // 사용자 입력 전의 빈 echo(마운트/프로그램적)는 호스트를 ""로 덮지 않게 차단.
      else if (!userTyped.current) return;
      onChange({ html, text });
    },
  });

  useImperativeHandle(editorRef, () => ({
    focus: () => editor?.commands.focus(),
    insertBlock: (text: string) => {
      if (!editor) return;
      const para = { type: "paragraph", content: text ? [{ type: "text", text }] : [] };
      // 빈 문서(TipTap 기본 빈 <p>)에 append하면 선행 빈 문단이 남아 평문이 "\n…"로 시작한다.
      //   → 비어 있으면 기본 빈 문단을 '대체'하고, 내용이 있을 때만 끝에 append한다.
      if (editor.isEmpty) {
        // setContent 2번째 인자 emitUpdate=true — onUpdate를 발사해 호스트(body/bodyHtml)로 전파.
        editor.chain().focus().setContent(para, true).run();
      } else {
        editor.chain().focus().insertContentAt(editor.state.doc.content.size, para).run();
      }
    },
  }), [editor, editorRef]);

  // valueHtml prop 변화를 에디터에 동기화 (복원/리셋·파일 업로드·클립보드 시 반영).
  // 타이핑 중엔 호스트가 getHTML()을 valueHtml에 저장하므로 값이 같아 setContent 스킵 → 커서 유지.
  // emitUpdate=false로 onChange를 재발사하지 않음(호스트가 이미 body/bodyHtml을 함께 세팅).
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
      <div className="relative flex-1 overflow-auto">
        <EditorContent editor={editor} className="h-full" />
        {placeholder && editor?.isEmpty ? (
          <div className="text-subtle-foreground pointer-events-none absolute left-0 top-0 px-3 py-2 text-sm" aria-hidden>{placeholder}</div>
        ) : null}
      </div>
    </div>
  );
}
