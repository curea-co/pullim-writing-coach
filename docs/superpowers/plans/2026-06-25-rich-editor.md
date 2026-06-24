# 고급 글쓰기 에디터(TipTap) + 맞춤법 토글 + 좌정렬 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** `/try`·`/coach` 글쓰기를 공용 TipTap `RichEditor`로 교체(헤더·볼드·폰트크기 + 비파괴 맞춤법 토글), 서식은 화면용·AI엔 평문 투영, 서식은 `body_html`로 영속. 더해 전 페이지 콘텐츠 좌정렬.

**Architecture:** 순수 `editor-doc.ts`(html↔plain)가 채점 계약(평문)을 책임지고, `RichEditor`(TipTap)가 두 호스트 공용 코어. ScoreForm은 평문 `body` state를 그대로 두고 에디터를 앞단에 둠(드래프트에 `body_html` 가산). CoachClient는 `state.body`(평문)·reducer byte-for-byte 무수정, `bodyHtml`는 reducer 밖 state + 별도 키 영속.

**Tech Stack:** Next 16, React 19, Tailwind v4, TipTap v2(@tiptap/react·starter-kit·extension-text-style + 커스텀 FontSize), npm, vitest(컴포넌트), node:test(순수), Playwright(e2e).

## Global Constraints
- **브랜치:** `main`에서 새 feature 브랜치. 무관한 워킹트리 변경(`package-lock.json` 등)·`.claude/`/`.mise.toml` 커밋 금지 — 각 task가 명시한 파일만 `git add`.
- **AI 계약 평문 불변:** `/api/score`·`/api/coach`로 가는 `submission.body`는 항상 `htmlToPlain(html)`. 라우트·프롬프트·가드·추출 무수정.
- **맞춤법·오탈자 보존:** 평문 투영은 학생 텍스트/오탈자/띄어쓰기를 보존(정규화 X — 서버 `normalizeBody` 담당). 맞춤법 토글은 비파괴(텍스트 불변), 기본 OFF.
- **검증된 코치 reducer/Phase byte-for-byte 무수정:** `state.body` 평문 유지. `bodyHtml`는 reducer 밖.
- **대필 0:** 에디터 콘텐츠는 학생 소유 — "코치가 준 문장 0개"·authorIsStudent 무영향.
- **서식 범위(YAGNI):** H1/H2·Bold·폰트크기만. 표/이미지/링크 등 제외.
- **테스트 실행:** 순수 `npm run test:unit`(`node --import ./scripts/register-ts.mjs --test`), 컴포넌트 `npm run test:components`(vitest, `scripts/components/**`), e2e `npm run test:e2e`, `npm run typecheck`, `npm run build`. 커밋 메시지 끝 `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

## File Structure
| 파일 | 책임 | Task |
|---|---|---|
| `app/**/page.tsx` (11개) | main 컨테이너 `mx-auto` 제거(좌정렬) | T1 |
| `app/lib/editor-doc.ts` (신규 순수) | `htmlToPlain` 등 평문 투영 | T2 |
| `scripts/editor-doc.test.mjs` (신규) | editor-doc 유닛 | T2 |
| `app/components/editor/font-size.ts` (신규) | TipTap FontSize 마크(TextStyle 확장) | T2 |
| `app/components/editor/RichEditor.tsx` (신규) | TipTap useEditor 래퍼 + spellcheck | T2 |
| `app/components/editor/EditorToolbar.tsx` (신규) | H1/H2·Bold·폰트크기·맞춤법 토글 | T2 |
| `scripts/components/RichEditor.test.tsx` (신규) | RichEditor 스모크 | T2 |
| `app/lib/storage.ts` (수정) | `DraftSnapshot.body_html?` 가산 | T3 |
| `app/components/ScoreForm.tsx` (수정) | textarea → RichEditor, bodyHtml | T3 |
| `app/components/TextPreviewCard.tsx` (수정) | html 렌더 미리보기 | T3 |
| `app/components/coach/Canvas.tsx` (수정) | textarea → RichEditor | T4 |
| `app/components/coach/CoachClient.tsx` (수정) | bodyHtml state + `pwc-coach-body-html-v1` 영속 | T4 |

---

## Task 1: 전 페이지 좌정렬

**Files:** Modify (11): `app/page.tsx`, `app/try/page.tsx`, `app/about/page.tsx`, `app/onboarding/page.tsx`, `app/me/page.tsx`, `app/results/page.tsx`, `app/results/[id]/page.tsx`, `app/samples/page.tsx`, `app/samples/[id]/page.tsx`, `app/teacher/log/page.tsx`, `app/teacher/rubric/page.tsx`

- [ ] **Step 1: 각 page의 main 컨테이너에서 `mx-auto` 제거**

각 파일에서 `grep -n "mx-auto" <file>`로 찾은 `<main className="mx-auto w-full max-w-… ">`(또는 유사 래퍼)에서 **`mx-auto`만 삭제**한다(나머지 `w-full max-w-…` 유지 → 콘텐츠가 좌측 정렬, 폭 제한 유지). 예: `app/page.tsx:75`
`className="mx-auto w-full max-w-5xl px-5 py-10 md:py-12"` → `className="w-full max-w-5xl px-5 py-10 md:py-12"`.

- [ ] **Step 2: 가운데 정렬 CTA 좌정렬 (home 등)**

`app/page.tsx`의 Closing CTA 카드 `flex flex-col items-center … text-center`(예: :147) → `items-start text-left`로, 그 안 버튼 래퍼 `justify-center`(:155) → `justify-start`로. 다른 페이지에 동일한 hero/CTA 가운데 정렬(`text-center`/`items-center`/`justify-center`)이 있으면 동일 규칙 적용. (콘텐츠 내부 의도적 가운데 요소 — 예: 통계 카드의 `text-center` 숫자 — 는 유지; **페이지/섹션 레벨 가운데 정렬만** 좌정렬.)

- [ ] **Step 3: /coach 확인** — `app/coach`는 `mx-auto` page main이 아님(디바이스/PUDS 셸 레이아웃). 이 task에서 건드리지 않는다. `grep -rn "mx-auto" app/coach` 결과가 page 레벨이면 보류(별도 판단).

- [ ] **Step 4: 검증** — `grep -rn "mx-auto" app --include=page.tsx`로 page main에 잔여 `mx-auto` 없음 확인(콘텐츠 내부 의도적 중앙 정렬 제외). `npm run typecheck` 클린. `npm run build` 통과. dev 스모크: `/`·`/try`·`/about`이 좌정렬.

- [ ] **Step 5: Commit**
```bash
git add app/page.tsx app/try/page.tsx app/about/page.tsx app/onboarding/page.tsx app/me/page.tsx app/results/page.tsx "app/results/[id]/page.tsx" app/samples/page.tsx "app/samples/[id]/page.tsx" app/teacher/log/page.tsx app/teacher/rubric/page.tsx
git commit -m "$(printf 'feat(ui): 전 페이지 콘텐츠 좌정렬(mx-auto 가운데 정렬 제거)\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 2: RichEditor 코어 (editor-doc + FontSize + RichEditor + Toolbar + spellcheck)

**Files:**
- Create: `app/lib/editor-doc.ts`, `scripts/editor-doc.test.mjs`, `app/components/editor/font-size.ts`, `app/components/editor/RichEditor.tsx`, `app/components/editor/EditorToolbar.tsx`, `scripts/components/RichEditor.test.tsx`

**Interfaces — Produces:**
```ts
// editor-doc.ts
export function htmlToPlain(html: string): string;
// RichEditor.tsx
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
}
export default function RichEditor(props: RichEditorProps): JSX.Element;
```

- [ ] **Step 1: 의존성 설치** (네트워크) — `npm install @tiptap/react@^2 @tiptap/starter-kit@^2 @tiptap/extension-text-style@^2`. (FontSize는 자체 작성 — 별도 패키지 불필요.) 설치 실패(네트워크/권한)면 BLOCKED 보고. `package.json`·`package-lock.json` 변경은 이 task 커밋에 포함.

- [ ] **Step 2: editor-doc 실패 테스트** — `scripts/editor-doc.test.mjs`:
```js
// 실행: node --import ./scripts/register-ts.mjs --test scripts/editor-doc.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { htmlToPlain } from "../app/lib/editor-doc.ts";

test("문단 → 개행", () => {
  assert.equal(htmlToPlain("<p>첫째 줄</p><p>둘째 줄</p>"), "첫째 줄\n둘째 줄");
});
test("헤더는 독립 줄로(텍스트 보존)", () => {
  assert.equal(htmlToPlain("<h1>제목</h1><p>본문</p>"), "제목\n본문");
});
test("볼드/폰트 마크 제거하되 텍스트 보존", () => {
  assert.equal(htmlToPlain('<p>이건 <strong>중요</strong>해</p>'), "이건 중요해");
  assert.equal(htmlToPlain('<p><span style="font-size:24px">큰</span> 글씨</p>'), "큰 글씨");
});
test("오탈자·띄어쓰기 보존(정규화 안 함)", () => {
  assert.equal(htmlToPlain("<p>화산은  위험하다 됬다</p>"), "화산은  위험하다 됬다");
});
test("빈/공백 문단 → 빈 문자열", () => {
  assert.equal(htmlToPlain("<p></p>"), "");
  assert.equal(htmlToPlain(""), "");
});
test("HTML 엔티티 디코드", () => {
  assert.equal(htmlToPlain("<p>&lt;태그&gt; &amp; 기호</p>"), "<태그> & 기호");
});
```

- [ ] **Step 3: 실패 확인** — `node --import ./scripts/register-ts.mjs --test scripts/editor-doc.test.mjs` → FAIL(모듈 없음).

- [ ] **Step 4: editor-doc 구현** — `app/lib/editor-doc.ts` (순수: sdk/server-only/fetch/next 미import):
```ts
// 리치 html → 채점/코치용 평문 투영. 블록(p/h1~h6/div)은 줄 경계, 인라인 마크는 텍스트만 남김.
//   학생 텍스트·오탈자·띄어쓰기는 보존(정규화 X — 서버 normalizeBody가 담당). 채점 계약의 단일 소스.
const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " " };

export function htmlToPlain(html: string): string {
  if (!html) return "";
  // 블록 종료 태그를 개행으로, 나머지 태그 제거.
  const withBreaks = html
    .replace(/<\/(p|h[1-6]|div|li)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  const decoded = withBreaks.replace(/&[a-zA-Z#0-9]+;/g, (m) => ENTITIES[m] ?? m);
  // 끝의 잉여 개행만 정리(내부 공백/오탈자는 보존).
  return decoded.replace(/\n+$/g, "").replace(/^\n+/g, "");
}
```

- [ ] **Step 5: editor-doc 통과 확인** — 같은 명령 → PASS(6+).

- [ ] **Step 6: FontSize 마크** — `app/components/editor/font-size.ts`:
```ts
import { Extension } from "@tiptap/react";
// TextStyle 위에 fontSize 속성을 얹는 최소 확장. setFontSize/unsetFontSize 커맨드 제공.
declare module "@tiptap/react" {
  interface Commands<ReturnType> {
    fontSize: { setFontSize: (size: string) => ReturnType; unsetFontSize: () => ReturnType };
  }
}
export const FontSize = Extension.create({
  name: "fontSize",
  addOptions() { return { types: ["textStyle"] }; },
  addGlobalAttributes() {
    return [{
      types: this.options.types,
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (el) => el.style.fontSize || null,
          renderHTML: (attrs) => (attrs.fontSize ? { style: `font-size:${attrs.fontSize}` } : {}),
        },
      },
    }];
  },
  addCommands() {
    return {
      setFontSize: (size) => ({ chain }) => chain().setMark("textStyle", { fontSize: size }).run(),
      unsetFontSize: () => ({ chain }) => chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run(),
    };
  },
});
```

- [ ] **Step 7: RichEditor** — `app/components/editor/RichEditor.tsx`:
```tsx
"use client";
import { useImperativeHandle } from "react";
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
  spellcheck?: boolean;
  disabled?: boolean;
  placeholder?: string;
  editorRef?: React.Ref<RichEditorHandle>;
  ariaLabel?: string;
}

export default function RichEditor({
  valueHtml, onChange, spellcheck = false, disabled = false, placeholder, editorRef, ariaLabel,
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
  // spellcheck/editable prop 변화 반영
  if (editor && editor.isEditable === disabled) editor.setEditable(!disabled);

  return (
    <div className="border-border bg-background rounded-lg border">
      <EditorToolbar editor={editor} spellcheck={spellcheck} />
      <EditorContent editor={editor} aria-label={ariaLabel} />
      {placeholder && editor?.isEmpty ? (
        <div className="text-subtle-foreground pointer-events-none -mt-9 px-3 text-sm" aria-hidden>{placeholder}</div>
      ) : null}
    </div>
  );
}
```
(주: spellcheck를 동적으로 바꾸려면 `editorProps.attributes`가 재평가되도록 `editor.setOptions`를 쓰거나, 토글 시 RichEditor를 `key={spellcheck}`로 remount. 단순화 위해 호스트가 `key={`rc-${spellcheck}`}`로 remount — Step 9 호스트에서 처리.)

- [ ] **Step 8: EditorToolbar** — `app/components/editor/EditorToolbar.tsx`:
```tsx
"use client";
import type { Editor } from "@tiptap/react";

const BTN = "rounded px-2 py-1 text-xs font-medium hover:bg-muted disabled:opacity-40";
const ON = "bg-muted text-foreground";

export default function EditorToolbar({
  editor, spellcheck, onToggleSpellcheck,
}: { editor: Editor | null; spellcheck?: boolean; onToggleSpellcheck?: () => void }) {
  if (!editor) return null;
  return (
    <div className="border-border flex flex-wrap items-center gap-1 border-b px-2 py-1.5" role="toolbar" aria-label="서식 도구">
      <button type="button" className={`${BTN} ${editor.isActive("heading", { level: 1 }) ? ON : ""}`}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} aria-pressed={editor.isActive("heading", { level: 1 })}>제목1</button>
      <button type="button" className={`${BTN} ${editor.isActive("heading", { level: 2 }) ? ON : ""}`}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} aria-pressed={editor.isActive("heading", { level: 2 })}>제목2</button>
      <button type="button" className={`${BTN} ${editor.isActive("bold") ? ON : ""}`}
        onClick={() => editor.chain().focus().toggleBold().run()} aria-pressed={editor.isActive("bold")}>볼드</button>
      <select aria-label="폰트 크기" className="rounded border-border bg-background px-1 py-0.5 text-xs"
        value={editor.getAttributes("textStyle").fontSize ?? ""}
        onChange={(e) => { const v = e.target.value; v ? editor.chain().focus().setFontSize(v).run() : editor.chain().focus().unsetFontSize().run(); }}>
        <option value="">기본</option><option value="14px">작게</option><option value="18px">크게</option><option value="24px">아주 크게</option>
      </select>
      {onToggleSpellcheck ? (
        <button type="button" className={`${BTN} ${spellcheck ? ON : ""}`} onClick={onToggleSpellcheck} aria-pressed={!!spellcheck}>맞춤법 표시</button>
      ) : null}
    </div>
  );
}
```
(맞춤법 토글은 호스트가 `onToggleSpellcheck`로 spellcheck state를 바꾸고 RichEditor를 remount. RichEditor가 EditorToolbar에 `onToggleSpellcheck`를 전달하도록 props로 받아 패스스루 — RichEditorProps에 `onToggleSpellcheck?: () => void` 추가하고 EditorToolbar에 전달.)

- [ ] **Step 9: RichEditor 스모크 테스트** — `scripts/components/RichEditor.test.tsx`:
```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import RichEditor from "@/app/components/editor/RichEditor";

describe("RichEditor", () => {
  it("초기 html을 렌더하고 툴바를 노출한다", () => {
    render(<RichEditor valueHtml="<p>안녕</p>" onChange={() => {}} ariaLabel="본문" />);
    expect(screen.getByText("안녕")).toBeInTheDocument();
    expect(screen.getByRole("toolbar", { name: "서식 도구" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "볼드" })).toBeInTheDocument();
  });
});
```
> TipTap이 jsdom에서 EditorContent를 마운트하지 못하면(ProseMirror DOM), 이 스모크는 `editor` null 경로로 빈 렌더가 될 수 있다. 그 경우 스모크를 "RichEditor가 throw 없이 마운트"로 축소하고, 실제 편집·포맷은 e2e(T5)로 검증한다고 주석. 순수 `editor-doc` 테스트(Step 2)가 채점 계약의 1차 보증.

- [ ] **Step 10: 검증** — `npm run test:unit`(editor-doc 포함) 그린, `npm run test:components`(RichEditor 스모크) 그린, `npm run typecheck` 클린.

- [ ] **Step 11: Commit**
```bash
git add package.json package-lock.json app/lib/editor-doc.ts scripts/editor-doc.test.mjs app/components/editor scripts/components/RichEditor.test.tsx
git commit -m "$(printf 'feat(editor): RichEditor(TipTap) 코어 + editor-doc 평문 투영 + 맞춤법 토글\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 3: /try (ScoreForm) 통합

**Files:** Modify: `app/lib/storage.ts`, `app/components/ScoreForm.tsx`, `app/components/TextPreviewCard.tsx`

**Interfaces — Consumes:** `RichEditor`(T2), `htmlToPlain`(T2). **Produces:** `DraftSnapshot.body_html?: string`.

- [ ] **Step 1: DraftSnapshot에 body_html 가산** — `app/lib/storage.ts`:
  - `DraftSnapshot` 타입(:248~)에 `body_html?: string;` 추가(`body` 아래).
  - `isDraftSnapshot`(:262~)에 가산 검증: `if (o.body_html !== undefined && typeof o.body_html !== "string") return false;` (기존 검증 보존).
  - `saveDraft`는 `Omit<DraftSnapshot,"saved_at">`라 자동 수용.

- [ ] **Step 2: ScoreForm 상태 + 에디터 배선** — `app/components/ScoreForm.tsx`:
  - `import RichEditor from "./editor/RichEditor";` `import { htmlToPlain } from "@/app/lib/editor-doc";`
  - `body` state 유지. 추가: `const [bodyHtml, setBodyHtml] = useState("");` `const [spellcheckOn, setSpellcheckOn] = useState(false);`
  - body `<textarea id="body">`(:700~718) 블록을 교체:
```tsx
<RichEditor
  key={`body-rc-${spellcheckOn}`}
  valueHtml={bodyHtml}
  onChange={({ html, text }) => { setBodyHtml(html); setBody(text); }}
  spellcheck={spellcheckOn}
  onToggleSpellcheck={() => setSpellcheckOn((v) => !v)}
  disabled={locked}
  placeholder="여기에 글을 써 보세요. 헤더·볼드·폰트크기를 쓸 수 있어요."
  ariaLabel="학생 글 본문"
/>
```
  (`locked`는 기존 변수. `body`(평문)는 onChange로 갱신되어 글자수·검증·payload 전부 기존 코드 그대로.)

- [ ] **Step 3: setBody 경유 지점에 html 동기화** — 파일 주입(:355)·클립보드(:269)·드래프트 복원(:250)은 `setBody(text)`만 호출하므로 에디터에 반영되도록 `setBodyHtml`도 함께 세팅한다. 평문→html은 문단 분리로 생성하는 헬퍼를 ScoreForm 내부에 둠:
```tsx
const plainToHtml = (t: string) => t.split(/\n/).map((line) => `<p>${line.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!))}</p>`).join("") || "<p></p>";
```
  - 파일 주입: `setBody(text); setBodyHtml(plainToHtml(text));`
  - 클립보드 적용: `setBody(clipboardPreview); setBodyHtml(plainToHtml(clipboardPreview));`
  - 드래프트 복원(`applyRestore`): `restoredDraft.body_html`가 있으면 `setBodyHtml(restoredDraft.body_html)`, 없으면 `setBodyHtml(plainToHtml(restoredDraft.body))`. `setBody(restoredDraft.body)` 유지.

- [ ] **Step 4: 자동저장에 body_html 포함** — `saveDraft({...})` 호출부(:226 부근)에 `body_html: bodyHtml`를 추가(나머지 필드 유지). 저장 조건(`body`/prompt) 기존대로.

- [ ] **Step 5: TextPreviewCard html 렌더** — `app/components/TextPreviewCard.tsx`가 `body`(평문)만 받으면, html 렌더용으로 `bodyHtml`도 옵셔널 prop으로 받아 있으면 `dangerouslySetInnerHTML`로 렌더(없으면 기존 평문 표시). ScoreForm 호출부(:871) `<TextPreviewCard body={body} bodyHtml={bodyHtml} onEdit={...} />`. (XSS: html은 자체 에디터 산출물 + StarterKit sanitize라 신뢰 범위; 그래도 prop명에 주석.)

- [ ] **Step 6: 검증** — `npm run typecheck` 클린. `npm run test:components`(기존 ScoreForm 테스트 — textarea 가정 테스트가 있으면 RichEditor/`ariaLabel` 기준으로 갱신; 깨지면 수정) 그린. `npm run build` 통과. 드래프트 복원/파일주입이 에디터에 반영되는지 dev 스모크.

- [ ] **Step 7: Commit**
```bash
git add app/lib/storage.ts app/components/ScoreForm.tsx app/components/TextPreviewCard.tsx
git commit -m "$(printf 'feat(try): ScoreForm 글 입력을 RichEditor로 + body_html 드래프트 영속\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 4: /coach (Canvas/CoachClient) 통합 — reducer 무수정

**Files:** Modify: `app/components/coach/Canvas.tsx`, `app/components/coach/CoachClient.tsx`

**Interfaces — Consumes:** `RichEditor`/`RichEditorHandle`(T2). 별도 키 `pwc-coach-body-html-v1`.

- [ ] **Step 1: Canvas를 RichEditor로** — `app/components/coach/Canvas.tsx`: `<textarea>`를 `<RichEditor>`로 교체. props 매핑: `valueHtml={valueHtml}`, `onChange`(부모가 {html,text} 처리), `disabled`, `spellcheck`, `editorRef`(focus). Canvas props 시그니처를 `{ valueHtml, onChange:(c:{html,text})=>void, disabled?, spellcheck?, onToggleSpellcheck?, editorRef? }`로 변경. 글자수 표시는 평문 기준 유지(부모가 text로 계산하거나 Canvas가 onChange text로). 기존 `data-testid="coach-canvas"`는 RichEditor 컨테이너에 부여(e2e 셀렉터 보존).

- [ ] **Step 2: CoachClient bodyHtml state + 영속** — `app/components/coach/CoachClient.tsx`:
  - `import RichEditor` 불필요(Canvas가 감쌈). 추가 state: `const [bodyHtml, setBodyHtml] = useState("");` `const [coachSpellcheck, setCoachSpellcheck] = useState(false);` (reducer 밖, `outlineCollapsed` 패턴).
  - 별도 키 헬퍼(파일 상단, 기존 load/save 패턴 답습):
```ts
const BODY_HTML_KEY = "pwc-coach-body-html-v1";
function loadBodyHtml(): string { if (typeof window === "undefined") return ""; try { return window.localStorage.getItem(BODY_HTML_KEY) ?? ""; } catch { return ""; } }
function saveBodyHtml(h: string): void { if (typeof window === "undefined") return; try { window.localStorage.setItem(BODY_HTML_KEY, h); } catch {} }
function clearBodyHtml(): void { if (typeof window === "undefined") return; try { window.localStorage.removeItem(BODY_HTML_KEY); } catch {} }
```
  - `<Canvas …>`(:754) 교체:
```tsx
<Canvas
  valueHtml={bodyHtml}
  onChange={({ html, text }) => { setBodyHtml(html); saveBodyHtml(html); dispatch({ type: "EDIT", body: text }); }}
  disabled={busy || state.phase === "done"}
  spellcheck={coachSpellcheck}
  onToggleSpellcheck={() => setCoachSpellcheck((v) => !v)}
  editorRef={editorRef}
/>
```
  - `textareaRef`(:483)를 `editorRef = useRef<RichEditorHandle>(null)`로 교체. outline→body 포커스(:775) `textareaRef.current?.focus()` → `editorRef.current?.focus()`.
  - **마운트 복원**(:500 effect): 저장 세션 복원 시 `setBodyHtml(loadBodyHtml() || plainToHtml(lastDraft.body))`도 함께(평문 RESTORE는 reducer 그대로). plainToHtml 헬퍼는 editor-doc 또는 로컬에 둠(ScoreForm과 동일 로직 — 공용으로 `editor-doc.ts`에 `plainToHtml` 추가 권장, T2에서 같이 export).
  - `reset`(:655)·`handleNewAssignment`(:663): `setBodyHtml(""); clearBodyHtml();` 추가(세션·메모 정리 형제).
  - **reducer/Phase/State/Action/RESTORE byte-for-byte 무수정** 확인. `state.body`는 계속 평문(EDIT의 body=text).

- [ ] **Step 3: plainToHtml 공용화** — `app/lib/editor-doc.ts`에 `export function plainToHtml(t: string): string`(T3 Step3의 로직) 추가 + editor-doc.test.mjs에 왕복 단언(`htmlToPlain(plainToHtml("a\nb")) === "a\nb"`). ScoreForm·CoachClient 모두 이 공용 함수 사용(중복 제거). *(T2에 넣는 게 이상적이나 T3에서 처음 필요 → T3에서 추가하고 T4가 재사용. 순서상 T3 Step3을 "editor-doc.plainToHtml 추가+테스트"로 승격.)*

- [ ] **Step 4: 검증** — `npm run typecheck` 클린. `npm run test:unit`(editor-doc 왕복) 그린. `npm run test:components`(코치 관련 기존 테스트 — Canvas textarea 가정 있으면 갱신) 그린. `npm run test:unit` 코치 reducer/세션 테스트 무영향. `git diff`로 CoachClient reducer 영역 무변경 확인(EDIT 호출은 text 전달, Phase/Action/State/RESTORE 불변).

- [ ] **Step 5: Commit**
```bash
git add app/components/coach/Canvas.tsx app/components/coach/CoachClient.tsx app/lib/editor-doc.ts scripts/editor-doc.test.mjs
git commit -m "$(printf 'feat(coach): Canvas를 RichEditor로 + body_html 세션 영속(reducer 무수정)\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 5: 최종 검증

- [ ] **Step 1: typecheck** — `npm run typecheck` 클린.
- [ ] **Step 2: 유닛+컴포넌트** — `npm run test:all` 그린(editor-doc·RichEditor·기존 전부).
- [ ] **Step 3: e2e** — `e2e/`에 리치 에디터 스모크 추가: `/try`에서 에디터에 타이핑→볼드/제목 적용→"AI 첨삭 받기"까지(채점 mock) 평문 전송 확인; `/coach`에서 에디터 입력→"봐줘" 루프; 새로고침 후 서식 복원(`body_html`); 맞춤법 토글로 spellcheck 속성 변화. `npm run test:e2e -- <spec>` 그린(또는 환경상 실행 불가면 사유 기록).
- [ ] **Step 4: build** — `npm run build` 통과(CSS @import 순서·TipTap SSR 무에러).
- [ ] **Step 5: dev 시각 점검** — `/`·`/try`·`/coach` 좌정렬 + RichEditor 서식(제목/볼드/폰트크기) 화면 반영 + 채점은 평문. 스크린샷.

---

## Self-Review
**Spec coverage:** §1 컴포넌트→T2. §2 평문 계약→T2(editor-doc)+T3/T4(payload는 기존 body=text). §3 /try→T3. §4 /coach reducer 무수정→T4. §5 맞춤법 토글→T2(RichEditor/Toolbar)+호스트 remount. §6 좌정렬→T1. §7 테스트→각 task+T5. §8 슬라이스=T1~T5. 수용기준 전 항목 매핑.
**Placeholder scan:** 코드 스텝은 실제 코드 포함. 좌정렬(T1)은 기계적 스윕이라 변환 규칙+grep 검증으로 명시. plainToHtml 중복은 T3에서 editor-doc로 공용화(T4 재사용)로 정리.
**Type consistency:** `RichEditorChange{html,text}`·`RichEditorHandle{focus}`·`htmlToPlain`·`plainToHtml`·`DraftSnapshot.body_html?`·`pwc-coach-body-html-v1`가 T2→T3→T4에서 일관.
**Executor 위험:** (a) `npm install @tiptap/*` 네트워크/권한 — 막히면 BLOCKED 보고(사용자 `!`로 설치 가능). (b) TipTap jsdom 컴포넌트 테스트 제한 — 순수 editor-doc + e2e로 보강. (c) 기존 ScoreForm/coach 컴포넌트 테스트가 textarea 가정 시 RichEditor 기준으로 갱신. (d) reducer 무수정 — EDIT는 평문 text만 전달, html은 reducer 밖.
