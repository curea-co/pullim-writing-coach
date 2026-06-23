# 물결 1 첫 PR — 코치 토대 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 검증된 코치 reducer를 보존하면서 `/coach`에 과제 입력·모드 선택·가이드 모드 최소버전·인증 게이트를 추가하고 브랜드 토큰을 통합한다 (C1/C2/C3 흡수).

**Architecture:** Approach B — 신규 진입 게이트(`CoachSetupFlow`)가 과제·모드 선택을 reducer 밖에서 처리하고 영속한 뒤, `CoachClient`를 `assignment`·`mode` prop으로 마운트한다. `CoachClient`의 useReducer 상태머신은 무수정(하드코딩 `ASSIGNMENT`→prop, `mode` prop 추가만). 가이드 질문은 정적 풀, 메모는 참조용 분리 저장.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS v4 (`@theme`), 테스트 = `node --test`(순수 모듈, `scripts/*.test.mjs`) + `vitest`(컴포넌트) + `playwright`(e2e).

## Global Constraints

- **불변식(최우선):** 코치/UI는 학생 문장을 단 하나도 대신 쓰지 않는다. 가이드 질문·placeholder·카피는 답·예시·완성문장 금지. 메모→캔버스 자동삽입 경로 0. Canvas 첫 페인트는 항상 빈 상태.
- **순수 모듈 규칙:** `app/lib/*.ts` 신규 순수 모듈은 `@anthropic-ai/sdk`·`server-only`·`fetch`·`next/*` 미import (FE·node 테스트가 직접 import). 부수효과(localStorage·window)는 `"use client"` 파일에만.
- **검증 재사용:** 과제 검증은 `app/lib/grading.ts`의 `SCHOOL_LEVELS`·`SUBJECTS`·`GENRES`·`PROMPT_MIN=10`·`PROMPT_MAX=1000`·`TARGET_MIN=50`·`TARGET_MAX=2000`을 재사용. 중복 enum/규칙 정의 금지.
- **영속 패턴:** localStorage 접근은 기존 `storage.ts`/`CoachClient` 방어 패턴(SSR 가드 `typeof window === "undefined"`, try/catch swallow, 손상 시 null) 답습.
- **색 의미:** `--color-primary`=파랑(행동/1차 액션), `--color-ok`=초록(상승/성공), `--color-lemon`=레몬(성취). 하드코딩 `#24D39E`/`#1FBE8C` 0건이 목표.
- **테스트 실행:** 순수 모듈 = `npm run test:unit` (`node --import ./scripts/register-ts.mjs --test scripts/*.test.mjs`). 컴포넌트 = `npm run test:components` (vitest). 전체 = `npm run test:all`. 타입 = `npm run typecheck`.
- **커밋:** 각 Task 끝에서 커밋. 커밋 메시지 끝에 `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.

---

## File Structure

| 파일 | 책임 | Task |
|---|---|---|
| `app/lib/coach-setup.ts` (신규, 순수) | WritingMode·CoachAssignment·CoachSetup 타입 + `emptyAssignment`/`validateAssignment`/`isModeEnabled`/직렬화 | T2 |
| `app/lib/guide-prompts.ts` (신규, 순수) | 5영역 렌즈별 정적 개방형 질문 풀 + `guideQuestionsFor` | T3 |
| `app/components/TokenGate.tsx` (수정) | `children` render-prop 추가(ScoreForm 경로 무영향) | T1 |
| `app/components/coach/CoachGate.tsx` (신규, client) | TokenGate로 CoachSetupFlow 래핑 | T1 |
| `app/coach/page.tsx` (수정) | `<CoachGate/>` 렌더 | T1 |
| `app/components/coach/AssignmentStep.tsx` (신규, client) | 과제 입력 폼(MetaForm 재사용)·검증·프로필 prefill | T4 |
| `app/components/coach/ModeSelectStep.tsx` (신규, client) | 4모드 카드 선택 | T5 |
| `app/components/coach/CoachSetupFlow.tsx` (신규, client) | setup 오케스트레이션·영속, CoachClient 마운트 | T6 |
| `app/components/coach/GuidePanel.tsx` (신규, client) | 가이드 질문 카드·메모 scratchpad(참조용) | T7 |
| `app/components/coach/CoachClient.tsx` (수정) | `ASSIGNMENT`→prop, `mode` prop, GuidePanel 렌더 분기 | T7 |
| `app/components/Sidebar.tsx` (수정) | `/coach` 진입 링크(C1) | T8 |
| `app/onboarding/page.tsx` (수정) | Step3에 코치 진입 CTA(C1) | T8 |
| `app/globals.css` (수정) | `--color-primary`=blue, `--color-ok`, `--ease` 토큰 정렬 | T9 |
| `app/**/*.tsx` (수정) | `#24D39E`/`#1FBE8C` → 시맨틱 토큰 | T9 |
| `scripts/coach-setup.test.mjs` (신규) | coach-setup 유닛 | T2 |
| `scripts/guide-prompts.test.mjs` (신규) | 불변식 게이트 | T3 |
| `scripts/components/*.test.tsx` (신규) | 컴포넌트 테스트 | T4-T7 |
| `e2e/coach-foundation.spec.ts` (신규) | C2·자유·가이드 e2e | T7 |

---

## Task 1: TokenGate 일반화 + CoachGate + `/coach` 래핑 (C2)

**Files:**
- Modify: `app/components/TokenGate.tsx:42-47` (props), `:177-186` (render), 신규 핸들러 추출
- Create: `app/components/coach/CoachGate.tsx`
- Modify: `app/coach/page.tsx:1-18`

**Interfaces:**
- Produces: `TokenGate`가 `children?: (onAuthExpired: () => void) => React.ReactNode` prop을 받음. children 제공 시 ScoreForm 대신 children 렌더, 동일 401 핸들러 전달.
- Consumes(임시): T6 완료 전까지 CoachGate는 기존 `CoachClient`를 직접 마운트(props 없이). T7에서 CoachSetupFlow로 교체.

- [ ] **Step 1: TokenGate에 401 핸들러 추출 + children prop 추가**

`app/components/TokenGate.tsx` props 시그니처(42-47행)를 교체:

```tsx
export default function TokenGate({
  defaults,
  children,
}: {
  // ScoreForm 폼 필드 프리필 — TryClient가 프로필에서 주입.
  defaults?: { school_level?: string; subject?: string; genre?: string };
  // 코치 등 다른 게이티드 화면을 자식으로 받는다. 제공 시 ScoreForm 대신 렌더.
  children?: (onAuthExpired: () => void) => React.ReactNode;
} = {}) {
```

`leave()` 함수 직후(85행 이후)에 핸들러를 추출:

```tsx
  // 401(E-AUTH) 공통 핸들러 — ScoreForm·children 양쪽이 공유.
  function handleAuthExpired() {
    setEntered(true);
    writeToken(null);
    setAuthError("비밀번호가 올바르지 않아요. 다시 입력해 주세요.");
  }
```

- [ ] **Step 2: TokenGate 본문 렌더에서 children 분기**

`app/components/TokenGate.tsx`의 마지막 `<ScoreForm .../>`(177-186행)를 교체:

```tsx
      {children ? (
        children(handleAuthExpired)
      ) : (
        <ScoreForm defaults={defaults} onAuthExpired={handleAuthExpired} />
      )}
```

- [ ] **Step 3: CoachGate 생성**

Create `app/components/coach/CoachGate.tsx`:

```tsx
"use client";

// Pullim Writing Coach — /coach 인증 게이트 (C2)
//   서버 컴포넌트(coach/page)에서 render-prop 함수를 넘길 수 없으므로 얇은 client 래퍼로 분리.
//   TokenGate의 검증·세션 보관·401 재입력 배너를 /try와 동일하게 재사용한다.
//   T6에서 CoachClient 직접 마운트를 CoachSetupFlow로 교체한다.

import TokenGate from "@/app/components/TokenGate";
import CoachClient from "@/app/components/coach/CoachClient";

export default function CoachGate() {
  return <TokenGate>{(onAuthExpired) => <CoachClient onAuthExpired={onAuthExpired} />}</TokenGate>;
}
```

- [ ] **Step 4: coach/page.tsx가 CoachGate 렌더**

`app/coach/page.tsx`의 import와 본문 교체:

```tsx
import type { Metadata } from "next";
import CoachGate from "../components/coach/CoachGate";

export const metadata: Metadata = {
  title: "과정 코치 — Pullim Writing Coach",
  description:
    "코치는 답을 주지 않고 질문으로 끌어냅니다. 학생이 직접 고쳐 쓰고, 그 과정이 그대로 남아요.",
};

export default function CoachPage() {
  return <CoachGate />;
}
```

- [ ] **Step 5: 타입체크 + 기존 테스트 회귀**

Run: `npm run typecheck && npm run test:components`
Expected: PASS (TokenGate 기존 ScoreForm 경로 무영향, 신규 children 경로 컴파일)

- [ ] **Step 6: Commit**

```bash
git add app/components/TokenGate.tsx app/components/coach/CoachGate.tsx app/coach/page.tsx
git commit -m "$(printf 'fix(coach): /coach에 TokenGate 래핑 — 인증 무반응 dead-end 제거 (C2)\n\nTokenGate를 children render-prop로 일반화하고 CoachGate로 /coach를 래핑.\n토큰 미보유 진입 시 비밀번호 입력 화면 노출, 401 시 재입력 배너.\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 2: `coach-setup.ts` 순수 모듈 + 유닛

**Files:**
- Create: `app/lib/coach-setup.ts`
- Test: `scripts/coach-setup.test.mjs`

**Interfaces:**
- Produces:
  - `type WritingMode = "free" | "guide" | "outline" | "voice"`
  - `type CoachAssignment = { school_level: string; subject: string; genre: string; target_char_count: number | null; prompt_text: string; title?: string }`
  - `type CoachSetup = { assignment: CoachAssignment; mode: WritingMode }`
  - `emptyAssignment(): CoachAssignment`
  - `validateAssignment(a: CoachAssignment): string[]` (빈 배열 = 통과)
  - `isModeEnabled(mode: WritingMode): boolean` (free·guide=true)
  - `serializeSetup(s: CoachSetup): string` / `parseSetup(raw: string | null): CoachSetup | null`

- [ ] **Step 1: 실패 테스트 작성**

Create `scripts/coach-setup.test.mjs`:

```js
// 물결1 — 코치 셋업(과제+모드) 순수 모듈 테스트.
// 실행: node --import ./scripts/register-ts.mjs --test scripts/coach-setup.test.mjs

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  emptyAssignment,
  validateAssignment,
  isModeEnabled,
  serializeSetup,
  parseSetup,
} from "../app/lib/coach-setup.ts";

test("emptyAssignment — 빈 과제, target null", () => {
  const a = emptyAssignment();
  assert.equal(a.school_level, "");
  assert.equal(a.subject, "");
  assert.equal(a.genre, "");
  assert.equal(a.prompt_text, "");
  assert.equal(a.target_char_count, null);
});

test("validateAssignment — 필수 미입력 시 위반", () => {
  const errs = validateAssignment(emptyAssignment());
  assert.ok(errs.length >= 1);
});

test("validateAssignment — enum 밖 학년/과목/장르 위반", () => {
  const a = { school_level: "대학", subject: "체육", genre: "랩", target_char_count: null, prompt_text: "화산을 설명하라" };
  const errs = validateAssignment(a);
  assert.ok(errs.some((e) => e.includes("학년")));
  assert.ok(errs.some((e) => e.includes("과목")));
  assert.ok(errs.some((e) => e.includes("장르")));
});

test("validateAssignment — prompt 길이 경계(10자 미만 위반)", () => {
  const a = { school_level: "중2", subject: "과학", genre: "설명문", target_char_count: null, prompt_text: "짧음" };
  const errs = validateAssignment(a);
  assert.ok(errs.some((e) => e.includes("과제")));
});

test("validateAssignment — target 범위 밖(49) 위반, null은 허용", () => {
  const base = { school_level: "중2", subject: "과학", genre: "설명문", prompt_text: "화산의 형성을 설명하라" };
  assert.ok(validateAssignment({ ...base, target_char_count: 49 }).some((e) => e.includes("목표")));
  assert.equal(validateAssignment({ ...base, target_char_count: null }).length, 0);
});

test("validateAssignment — 정상 과제 통과", () => {
  const a = { school_level: "중2", subject: "과학", genre: "설명문", target_char_count: 800, prompt_text: "화산의 형성 과정을 설명하라" };
  assert.equal(validateAssignment(a).length, 0);
});

test("isModeEnabled — free·guide 활성, outline·voice 비활성", () => {
  assert.equal(isModeEnabled("free"), true);
  assert.equal(isModeEnabled("guide"), true);
  assert.equal(isModeEnabled("outline"), false);
  assert.equal(isModeEnabled("voice"), false);
});

test("serializeSetup/parseSetup — 왕복", () => {
  const setup = { assignment: { school_level: "중2", subject: "과학", genre: "설명문", target_char_count: 800, prompt_text: "화산의 형성을 설명하라", title: "화산" }, mode: "guide" };
  const round = parseSetup(serializeSetup(setup));
  assert.deepEqual(round, setup);
});

test("parseSetup — null/손상 입력은 null", () => {
  assert.equal(parseSetup(null), null);
  assert.equal(parseSetup("{not json"), null);
  assert.equal(parseSetup(JSON.stringify({ assignment: null, mode: "free" })), null);
  assert.equal(parseSetup(JSON.stringify({ assignment: { school_level: "중2" }, mode: "rap" })), null);
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --import ./scripts/register-ts.mjs --test scripts/coach-setup.test.mjs`
Expected: FAIL — `Cannot find module '../app/lib/coach-setup.ts'`

- [ ] **Step 3: 모듈 구현**

Create `app/lib/coach-setup.ts`:

```ts
// Pullim Writing Coach — 코치 셋업(과제 + 작성 모드) 순수 모듈 (물결1).
//   grading.ts와 동일하게 순수: @anthropic-ai/sdk·server-only·fetch·next/* 미import.
//   부수효과(localStorage)는 CoachSetupFlow("use client")가 전담. 여기는 타입·검증·직렬화만.

import {
  SCHOOL_LEVELS,
  SUBJECTS,
  GENRES,
  PROMPT_MIN,
  PROMPT_MAX,
  TARGET_MIN,
  TARGET_MAX,
} from "./grading";

export type WritingMode = "free" | "guide" | "outline" | "voice";

export type CoachAssignment = {
  school_level: string;
  subject: string;
  genre: string;
  target_char_count: number | null;
  prompt_text: string;
  title?: string;
};

export type CoachSetup = { assignment: CoachAssignment; mode: WritingMode };

// 이번 물결에 실제 동작하는 모드 화이트리스트. outline/voice는 카드 '준비 중'(비활성).
const ENABLED_MODES: readonly WritingMode[] = ["free", "guide"];
const ALL_MODES: readonly WritingMode[] = ["free", "guide", "outline", "voice"];

export function emptyAssignment(): CoachAssignment {
  return { school_level: "", subject: "", genre: "", target_char_count: null, prompt_text: "" };
}

export function isModeEnabled(mode: WritingMode): boolean {
  return ENABLED_MODES.includes(mode);
}

// 위반 목록 반환(빈 배열 = 통과). 검증 규칙은 grading.ts 단일 소스 재사용.
export function validateAssignment(a: CoachAssignment): string[] {
  const v: string[] = [];
  if (!(SCHOOL_LEVELS as readonly string[]).includes(a.school_level)) v.push("학년을 선택해 주세요");
  if (!(SUBJECTS as readonly string[]).includes(a.subject)) v.push("과목을 선택해 주세요");
  if (!(GENRES as readonly string[]).includes(a.genre)) v.push("장르를 선택해 주세요");
  const prompt = (a.prompt_text ?? "").trim();
  if (prompt.length < PROMPT_MIN || prompt.length > PROMPT_MAX) {
    v.push(`과제 내용을 ${PROMPT_MIN}~${PROMPT_MAX}자로 입력해 주세요`);
  }
  if (a.target_char_count !== null) {
    const t = a.target_char_count;
    if (!Number.isInteger(t) || t < TARGET_MIN || t > TARGET_MAX) {
      v.push(`목표 글자 수는 ${TARGET_MIN}~${TARGET_MAX} 사이여야 해요`);
    }
  }
  return v;
}

export function serializeSetup(s: CoachSetup): string {
  return JSON.stringify(s);
}

// 방어적 파싱 — 모양이 안 맞으면 null(손상·schema 변화 대비).
export function parseSetup(raw: string | null): CoachSetup | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Partial<CoachSetup>;
    if (typeof o !== "object" || o === null) return null;
    if (typeof o.mode !== "string" || !ALL_MODES.includes(o.mode as WritingMode)) return null;
    const a = o.assignment;
    if (typeof a !== "object" || a === null) return null;
    if (typeof a.school_level !== "string" || typeof a.subject !== "string") return null;
    if (typeof a.genre !== "string" || typeof a.prompt_text !== "string") return null;
    if (!(a.target_char_count === null || typeof a.target_char_count === "number")) return null;
    return o as CoachSetup;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: 통과 확인**

Run: `node --import ./scripts/register-ts.mjs --test scripts/coach-setup.test.mjs`
Expected: PASS (10 tests)

- [ ] **Step 5: Commit**

```bash
git add app/lib/coach-setup.ts scripts/coach-setup.test.mjs
git commit -m "$(printf 'feat(coach): coach-setup 순수 모듈 — 과제+모드 타입·검증·직렬화\n\ngrading.ts enum/길이 규칙 재사용. free/guide만 활성. 방어적 파싱.\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 3: `guide-prompts.ts` 순수 모듈 + 불변식 게이트

**Files:**
- Create: `app/lib/guide-prompts.ts`
- Test: `scripts/guide-prompts.test.mjs`

**Interfaces:**
- Consumes: `checkGenerationBlock` from `app/lib/coach-schema.ts`, `AREAS`/`AreaName` from grading/samples.
- Produces:
  - `GUIDE_QUESTIONS: Record<AreaName, readonly string[]>`
  - `guideQuestionsFor(genre: string): { area: AreaName; question: string }[]` — 영역별 1문항씩 순서대로(장르 무관 동일 풀 v1, genre는 후속 확장 seam).

- [ ] **Step 1: 실패 테스트 작성 (불변식 게이트 포함)**

Create `scripts/guide-prompts.test.mjs`:

```js
// 물결1 — 가이드 모드 정적 질문 풀. 핵심: 대필 불변식 게이트(checkGenerationBlock 위반 0건).
// 실행: node --import ./scripts/register-ts.mjs --test scripts/guide-prompts.test.mjs

import assert from "node:assert/strict";
import { test } from "node:test";
import { AREAS } from "../app/lib/grading.ts";
import { checkGenerationBlock } from "../app/lib/coach-schema.ts";
import { GUIDE_QUESTIONS, guideQuestionsFor } from "../app/lib/guide-prompts.ts";

test("GUIDE_QUESTIONS — 5영역 모두 1문항 이상", () => {
  for (const area of AREAS) {
    assert.ok(Array.isArray(GUIDE_QUESTIONS[area]), `${area} 풀 없음`);
    assert.ok(GUIDE_QUESTIONS[area].length >= 1, `${area} 비어 있음`);
  }
});

test("guideQuestionsFor — 영역당 1문항, AREAS 순서", () => {
  const qs = guideQuestionsFor("설명문");
  assert.equal(qs.length, AREAS.length);
  qs.forEach((q, i) => assert.equal(q.area, AREAS[i]));
});

test("불변식 게이트 — 모든 질문이 checkGenerationBlock 위반 0건", () => {
  // 각 질문을 nudge.guiding_question으로 감싸 코치 출력 가드에 그대로 통과시킨다.
  const allQuestions = AREAS.flatMap((a) => GUIDE_QUESTIONS[a]);
  const fakeOutput = {
    area_scores: [],
    nudges: allQuestions.map((q, i) => ({
      paragraph_index: 0,
      rubric_area: AREAS[0],
      diagnosis: "",
      guiding_question: q,
      quick_win_rank: i + 1,
    })),
  };
  const violations = checkGenerationBlock(fakeOutput);
  assert.deepEqual(violations, [], `대필 의심 질문: ${violations.join(", ")}`);
});

test("불변식 — 모든 질문은 물음표로 끝남(질문칸 평서문 금지)", () => {
  for (const area of AREAS) {
    for (const q of GUIDE_QUESTIONS[area]) {
      assert.ok(q.trim().endsWith("?"), `평서문 의심: ${q}`);
    }
  }
});
```

- [ ] **Step 2: 실패 확인**

Run: `node --import ./scripts/register-ts.mjs --test scripts/guide-prompts.test.mjs`
Expected: FAIL — `Cannot find module '../app/lib/guide-prompts.ts'`

- [ ] **Step 3: 모듈 구현 (순수 개방형 질문만)**

Create `app/lib/guide-prompts.ts`:

```ts
// Pullim Writing Coach — 가이드 모드 정적 질문 풀 (물결1, 순수 모듈).
//   불변식: 질문은 '끌어내는 물음'만 — 답·예시·완성문장·연결어 템플릿 금지.
//   coach-schema.checkGenerationBlock 단위 테스트(scripts/guide-prompts.test.mjs)가 머지 게이트.
//   동적 서버 질문 생성은 물결2(범위 외). genre 인자는 후속 장르별 분기 seam(v1은 동일 풀).

import type { AreaName } from "../data/samples";
import { AREAS } from "./grading";

export const GUIDE_QUESTIONS: Record<AreaName, readonly string[]> = {
  "과제 이해": [
    "이 과제가 너한테 묻는 핵심은 한마디로 뭐야?",
    "과제가 요구한 것 중에 아직 안 다룬 게 있을까?",
  ],
  "내용 충실도": [
    "그렇게 생각하는 이유를 하나만 더 댈 수 있어?",
    "읽는 사람이 '왜?'라고 물으면 뭐라고 답할래?",
  ],
  "구조·논리": [
    "이 문단과 다음 문단은 어떻게 이어진다고 보면 될까?",
    "가장 먼저 말하고 싶은 건 무엇이고, 마지막에 남길 건 뭐야?",
  ],
  "표현·문장": [
    "이 문장을 소리 내어 읽으면 어디서 숨이 막혀?",
    "같은 말을 네 식대로 다르게 표현하면 어떻게 될까?",
  ],
  "성장 가능성": [
    "딱 한 군데만 고친다면 어디를 손보고 싶어?",
    "지금 글에서 네가 제일 마음에 드는 부분은 어디야?",
  ],
};

// 영역별 첫 질문 1개씩, AREAS 권위 순서로. genre는 후속 확장용(현재 미사용).
export function guideQuestionsFor(_genre: string): { area: AreaName; question: string }[] {
  return AREAS.map((area) => ({ area, question: GUIDE_QUESTIONS[area][0] }));
}
```

- [ ] **Step 4: 통과 확인**

Run: `node --import ./scripts/register-ts.mjs --test scripts/guide-prompts.test.mjs`
Expected: PASS (4 tests). 위반 시 질문 문구를 개방형으로 수정 후 재실행.

- [ ] **Step 5: Commit**

```bash
git add app/lib/guide-prompts.ts scripts/guide-prompts.test.mjs
git commit -m "$(printf 'feat(coach): guide-prompts 정적 질문 풀 + 대필 불변식 게이트\n\n5영역 개방형 질문. checkGenerationBlock 위반 0건을 머지 차단 테스트로 강제.\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 4: AssignmentStep 컴포넌트 (C3 입력)

**Files:**
- Create: `app/components/coach/AssignmentStep.tsx`
- Test: `scripts/components/AssignmentStep.test.tsx`

**Interfaces:**
- Consumes: `CoachAssignment`/`validateAssignment` (T2), `MetaForm` (기존), `loadProfile` (storage), `SUBJECTS`/`GENRES`/`SCHOOL_LEVELS` (grading).
- Produces: `<AssignmentStep onSubmit={(a: CoachAssignment) => void} />` — 내부 state로 입력 보관, 검증 통과 시 onSubmit 호출.

- [ ] **Step 1: 실패 테스트 작성**

Create `scripts/components/AssignmentStep.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AssignmentStep from "@/app/components/coach/AssignmentStep";

describe("AssignmentStep", () => {
  it("미입력 시 다음 버튼 비활성", () => {
    render(<AssignmentStep onSubmit={() => {}} />);
    expect(screen.getByRole("button", { name: /다음/ })).toBeDisabled();
  });

  it("필수 입력 후 onSubmit이 과제 객체로 호출", async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();
    render(<AssignmentStep onSubmit={onSubmit} />);
    await user.selectOptions(screen.getByLabelText(/학년/), "중2");
    await user.selectOptions(screen.getByLabelText(/과목/), "과학");
    await user.selectOptions(screen.getByLabelText(/장르/), "설명문");
    await user.type(screen.getByLabelText(/과제 내용/), "화산의 형성 과정을 설명하라");
    await user.click(screen.getByRole("button", { name: /다음/ }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      school_level: "중2",
      subject: "과학",
      genre: "설명문",
      prompt_text: "화산의 형성 과정을 설명하라",
    });
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm run test:components -- AssignmentStep`
Expected: FAIL — cannot resolve `./AssignmentStep`

- [ ] **Step 3: 컴포넌트 구현 (MetaForm 재사용)**

Create `app/components/coach/AssignmentStep.tsx`:

```tsx
"use client";

// 코치 진입 — 과제 입력 단계 (C3). MetaForm을 그대로 재사용하고 검증은 coach-setup.validateAssignment.
//   프로필 있으면 학년·과목·장르 prefill. 데모 기본값(화산)으로 "바로 체험" 유지.

import { useMemo, useState } from "react";
import MetaForm from "@/app/components/MetaForm";
import { type CoachAssignment, validateAssignment } from "@/app/lib/coach-setup";
import { TARGET_MIN, TARGET_MAX } from "@/app/lib/grading";
import { loadProfile } from "@/app/lib/storage";

const DEMO_PROMPT = "화산의 형성 과정과 그것이 우리 삶에 미치는 영향을 설명하는 글을 쓰시오.";

export default function AssignmentStep({ onSubmit }: { onSubmit: (a: CoachAssignment) => void }) {
  const profile = useMemo(() => loadProfile(), []);
  const [schoolLevel, setSchoolLevel] = useState(profile?.school_level ?? "중2");
  const [subject, setSubject] = useState(
    profile?.primary_subject && profile.primary_subject !== "기타" ? profile.primary_subject : "과학",
  );
  const [genre, setGenre] = useState(profile?.frequent_genre ?? "설명문");
  const [targetRaw, setTargetRaw] = useState("");
  const [promptText, setPromptText] = useState(DEMO_PROMPT);

  const targetTrimmed = targetRaw.trim();
  const targetNum = targetTrimmed === "" ? null : Number(targetTrimmed);
  const targetInvalid =
    targetTrimmed !== "" &&
    (!Number.isInteger(targetNum) || (targetNum as number) < TARGET_MIN || (targetNum as number) > TARGET_MAX);

  const assignment: CoachAssignment = {
    school_level: schoolLevel,
    subject,
    genre,
    target_char_count: targetNum,
    prompt_text: promptText.trim(),
  };
  const errors = validateAssignment(assignment);
  const canSubmit = errors.length === 0;

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-8 md:py-12">
      <header className="mb-6">
        <h1 className="text-foreground text-2xl font-bold tracking-tight md:text-3xl">어떤 글을 써볼까요?</h1>
        <p className="text-muted-foreground mt-3 text-sm">
          선생님이 내준 과제 조건을 알려주면, 코치가 그 기준으로 질문해요.
        </p>
      </header>
      <section className="border-border bg-surface rounded-xl border p-5">
        <MetaForm
          schoolLevel={schoolLevel}
          subject={subject}
          genre={genre}
          targetRaw={targetRaw}
          promptText={promptText}
          targetInvalid={targetInvalid}
          locked={false}
          onChangeSchoolLevel={setSchoolLevel}
          onChangeSubject={setSubject}
          onChangeGenre={setGenre}
          onChangeTargetRaw={setTargetRaw}
          onChangePromptText={setPromptText}
        />
      </section>
      <button
        type="button"
        onClick={() => canSubmit && onSubmit(assignment)}
        disabled={!canSubmit}
        className="bg-primary text-primary-foreground mt-6 w-full rounded-lg px-4 py-3 text-base font-semibold transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        다음 — 어떻게 쓸지 고르기 →
      </button>
    </main>
  );
}
```

> 주의: `MetaForm`의 라벨이 "학년/과목/장르/과제 내용"인지 확인하고, 테스트의 `getByLabelText` 정규식이 실제 라벨과 일치하도록 맞춘다(불일치 시 테스트의 정규식을 실제 라벨로 수정).

- [ ] **Step 4: 통과 확인**

Run: `npm run test:components -- AssignmentStep`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add app/components/coach/AssignmentStep.tsx scripts/components/AssignmentStep.test.tsx
git commit -m "$(printf 'feat(coach): AssignmentStep — 학생 과제 직접 입력 (C3)\n\nMetaForm 재사용 + validateAssignment. 프로필 prefill, 데모 기본값 유지.\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 5: ModeSelectStep 컴포넌트

**Files:**
- Create: `app/components/coach/ModeSelectStep.tsx`
- Test: `scripts/components/ModeSelectStep.test.tsx`

**Interfaces:**
- Consumes: `WritingMode`/`isModeEnabled` (T2).
- Produces: `<ModeSelectStep onSelect={(mode: WritingMode) => void} onBack={() => void} />` — 활성 카드 클릭 시 onSelect, 비활성 카드는 클릭 불가.

- [ ] **Step 1: 실패 테스트 작성**

Create `scripts/components/ModeSelectStep.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ModeSelectStep from "@/app/components/coach/ModeSelectStep";

describe("ModeSelectStep", () => {
  it("4개 모드 카드 렌더", () => {
    render(<ModeSelectStep onSelect={() => {}} onBack={() => {}} />);
    expect(screen.getByText(/자유 쓰기/)).toBeInTheDocument();
    expect(screen.getByText(/가이드/)).toBeInTheDocument();
    expect(screen.getByText(/개요 먼저/)).toBeInTheDocument();
    expect(screen.getByText(/말하기/)).toBeInTheDocument();
  });

  it("자유 쓰기 선택 시 onSelect('free')", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<ModeSelectStep onSelect={onSelect} onBack={() => {}} />);
    await user.click(screen.getByTestId("mode-free"));
    expect(onSelect).toHaveBeenCalledWith("free");
  });

  it("개요/말하기 카드는 비활성(클릭해도 onSelect 미호출)", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<ModeSelectStep onSelect={onSelect} onBack={() => {}} />);
    expect(screen.getByTestId("mode-outline")).toBeDisabled();
    expect(screen.getByTestId("mode-voice")).toBeDisabled();
    await user.click(screen.getByTestId("mode-outline"));
    expect(onSelect).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm run test:components -- ModeSelectStep`
Expected: FAIL — cannot resolve `./ModeSelectStep`

- [ ] **Step 3: 컴포넌트 구현**

Create `app/components/coach/ModeSelectStep.tsx`:

```tsx
"use client";

// 코치 진입 — 작성 모드 선택. 자유/가이드 활성, 개요/말하기 '준비 중'(isModeEnabled=false).

import { type WritingMode, isModeEnabled } from "@/app/lib/coach-setup";

type Card = { mode: WritingMode; title: string; body: string };

const CARDS: readonly Card[] = [
  { mode: "free", title: "자유 쓰기", body: "바로 캔버스에 써 내려가요. 다 쓰면 코치에게 봐달라고 해요." },
  { mode: "guide", title: "가이드 (질문 따라)", body: "막막할 때, 질문 카드를 보며 네 생각을 한 줄씩 적어가요." },
  { mode: "outline", title: "개요 먼저", body: "글의 뼈대부터 잡고 살을 붙여요." },
  { mode: "voice", title: "말하기", body: "말로 풀어낸 뒤 직접 글로 정리해요." },
];

export default function ModeSelectStep({
  onSelect,
  onBack,
}: {
  onSelect: (mode: WritingMode) => void;
  onBack: () => void;
}) {
  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-8 md:py-12">
      <button type="button" onClick={onBack} className="text-muted-foreground hover:text-foreground mb-6 text-sm">
        ← 과제 다시 입력
      </button>
      <header className="mb-6">
        <h1 className="text-foreground text-2xl font-bold tracking-tight md:text-3xl">어떻게 써볼까요?</h1>
        <p className="text-muted-foreground mt-3 text-sm">나에게 맞는 방식을 골라요. 코치는 어느 방식이든 답을 주지 않고 질문으로 도와요.</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        {CARDS.map((c) => {
          const enabled = isModeEnabled(c.mode);
          return (
            <button
              key={c.mode}
              type="button"
              data-testid={`mode-${c.mode}`}
              disabled={!enabled}
              onClick={() => enabled && onSelect(c.mode)}
              className="border-border bg-surface relative flex flex-col rounded-2xl border p-5 text-left transition hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="text-foreground text-base font-semibold">{c.title}</span>
              <span className="text-muted-foreground mt-1.5 text-sm leading-relaxed">{c.body}</span>
              {!enabled && (
                <span className="bg-muted text-subtle-foreground absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-semibold">
                  준비 중
                </span>
              )}
            </button>
          );
        })}
      </div>
    </main>
  );
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm run test:components -- ModeSelectStep`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add app/components/coach/ModeSelectStep.tsx scripts/components/ModeSelectStep.test.tsx
git commit -m "$(printf 'feat(coach): ModeSelectStep — 4모드 선택(자유/가이드 활성, 개요/말하기 준비중)\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 6: CoachSetupFlow 오케스트레이션 + 영속

**Files:**
- Create: `app/components/coach/CoachSetupFlow.tsx`
- Test: `scripts/components/CoachSetupFlow.test.tsx`
- Modify: `app/components/coach/CoachGate.tsx` (CoachClient 직접 마운트 → CoachSetupFlow)

**Interfaces:**
- Consumes: `CoachSetup`/`serializeSetup`/`parseSetup` (T2), AssignmentStep (T4), ModeSelectStep (T5), CoachClient (T7에서 props 받도록 수정).
- Produces: `<CoachSetupFlow onAuthExpired={() => void} />` — setup 완료 시 `<CoachClient assignment mode onAuthExpired />` 마운트.
- 영속 키: `pwc-coach-setup-v1`.

- [ ] **Step 1: 실패 테스트 작성**

Create `scripts/components/CoachSetupFlow.test.tsx`:

```tsx
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// CoachClient는 무거우므로(useReducer+fetch) 마운트 신호만 검증하는 mock로 대체.
vi.mock("@/app/components/coach/CoachClient", () => ({
  default: (props: { assignment: { prompt_text: string }; mode: string }) => (
    <div data-testid="coach-client">{`${props.mode}:${props.assignment.prompt_text}`}</div>
  ),
}));

import CoachSetupFlow from "@/app/components/coach/CoachSetupFlow";

beforeEach(() => window.localStorage.clear());

describe("CoachSetupFlow", () => {
  it("setup 없으면 과제 입력부터 시작", () => {
    render(<CoachSetupFlow />);
    expect(screen.getByText(/어떤 글을 써볼까요/)).toBeInTheDocument();
  });

  it("과제 입력 → 모드 선택 → CoachClient 마운트(assignment·mode 전달)", async () => {
    const user = userEvent.setup();
    render(<CoachSetupFlow />);
    await user.selectOptions(screen.getByLabelText(/학년/), "중2");
    await user.selectOptions(screen.getByLabelText(/과목/), "과학");
    await user.selectOptions(screen.getByLabelText(/장르/), "설명문");
    await user.clear(screen.getByLabelText(/과제 내용/));
    await user.type(screen.getByLabelText(/과제 내용/), "화산의 형성 과정을 설명하라");
    await user.click(screen.getByRole("button", { name: /다음/ }));
    await user.click(screen.getByTestId("mode-free"));
    expect(screen.getByTestId("coach-client")).toHaveTextContent("free:화산의 형성 과정을 설명하라");
  });

  it("저장된 setup 있으면 CoachClient 직행", () => {
    window.localStorage.setItem(
      "pwc-coach-setup-v1",
      JSON.stringify({ assignment: { school_level: "중2", subject: "과학", genre: "설명문", target_char_count: null, prompt_text: "저장된 과제 설명" }, mode: "guide" }),
    );
    render(<CoachSetupFlow />);
    expect(screen.getByTestId("coach-client")).toHaveTextContent("guide:저장된 과제 설명");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm run test:components -- CoachSetupFlow`
Expected: FAIL — cannot resolve `./CoachSetupFlow`

- [ ] **Step 3: 컴포넌트 구현**

Create `app/components/coach/CoachSetupFlow.tsx`:

```tsx
"use client";

// 코치 진입 게이트 — 과제 입력 → 모드 선택 → CoachClient 마운트. reducer 밖에서 setup 보관·영속.
//   영속: pwc-coach-setup-v1 (CoachClient의 세션 키와 분리). 새로고침 시 setup 복원해 직행.

import { useEffect, useState } from "react";
import {
  type CoachAssignment,
  type CoachSetup,
  type WritingMode,
  parseSetup,
  serializeSetup,
} from "@/app/lib/coach-setup";
import AssignmentStep from "@/app/components/coach/AssignmentStep";
import ModeSelectStep from "@/app/components/coach/ModeSelectStep";
import CoachClient from "@/app/components/coach/CoachClient";

const SETUP_KEY = "pwc-coach-setup-v1";

type Phase = "loading" | "assignment" | "mode" | "ready";

function loadSetup(): CoachSetup | null {
  if (typeof window === "undefined") return null;
  try {
    return parseSetup(window.localStorage.getItem(SETUP_KEY));
  } catch {
    return null;
  }
}

function saveSetup(s: CoachSetup): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SETUP_KEY, serializeSetup(s));
  } catch {
    /* swallow — quota/denied. 영속 실패가 흐름을 막지 않는다. */
  }
}

export default function CoachSetupFlow({ onAuthExpired }: { onAuthExpired?: () => void }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [assignment, setAssignment] = useState<CoachAssignment | null>(null);
  const [mode, setMode] = useState<WritingMode>("free");

  // 마운트 후 복원(SSR/hydration 일치 위해 첫 페인트는 loading).
  useEffect(() => {
    const saved = loadSetup();
    if (saved) {
      setAssignment(saved.assignment);
      setMode(saved.mode);
      setPhase("ready");
    } else {
      setPhase("assignment");
    }
  }, []);

  if (phase === "loading") return null;

  if (phase === "ready" && assignment) {
    return <CoachClient assignment={assignment} mode={mode} onAuthExpired={onAuthExpired} />;
  }

  if (phase === "mode" && assignment) {
    return (
      <ModeSelectStep
        onBack={() => setPhase("assignment")}
        onSelect={(m) => {
          setMode(m);
          saveSetup({ assignment, mode: m });
          setPhase("ready");
        }}
      />
    );
  }

  return (
    <AssignmentStep
      onSubmit={(a) => {
        setAssignment(a);
        setPhase("mode");
      }}
    />
  );
}
```

- [ ] **Step 4: CoachGate가 CoachSetupFlow 사용**

`app/components/coach/CoachGate.tsx`의 import·본문 교체:

```tsx
"use client";

import TokenGate from "@/app/components/TokenGate";
import CoachSetupFlow from "@/app/components/coach/CoachSetupFlow";

export default function CoachGate() {
  return <TokenGate>{(onAuthExpired) => <CoachSetupFlow onAuthExpired={onAuthExpired} />}</TokenGate>;
}
```

- [ ] **Step 5: 통과 확인 (T7 전이라 CoachClient는 mock로 통과)**

Run: `npm run test:components -- CoachSetupFlow`
Expected: PASS (3 tests). (실제 CoachClient props는 T7에서 배선)

- [ ] **Step 6: Commit**

```bash
git add app/components/coach/CoachSetupFlow.tsx scripts/components/CoachSetupFlow.test.tsx app/components/coach/CoachGate.tsx
git commit -m "$(printf 'feat(coach): CoachSetupFlow — 과제→모드→코치 진입 오케스트레이션 + 영속\n\npwc-coach-setup-v1에 과제+모드 영속(세션 키와 분리). 새로고침 복원 직행.\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 7: CoachClient 파라미터화 + GuidePanel

**Files:**
- Modify: `app/components/coach/CoachClient.tsx` (ASSIGNMENT 상수 → prop, mode prop, GuidePanel 렌더)
- Create: `app/components/coach/GuidePanel.tsx`
- Test: `scripts/components/GuidePanel.test.tsx`
- Create: `e2e/coach-foundation.spec.ts`

**Interfaces:**
- Consumes: `CoachAssignment`/`WritingMode` (T2), `guideQuestionsFor` (T3).
- Produces: `CoachClient`가 `{ assignment: CoachAssignment; mode: WritingMode; onAuthExpired?: () => void }` props를 받음(기존 onAuthExpired만 받던 시그니처 확장). `<GuidePanel genre={string} />`.

- [ ] **Step 1: GuidePanel 실패 테스트 작성 (대필 통로 부재 단언)**

Create `scripts/components/GuidePanel.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import GuidePanel from "@/app/components/coach/GuidePanel";

beforeEach(() => window.localStorage.clear());

describe("GuidePanel", () => {
  it("질문 카드를 렌더한다", () => {
    render(<GuidePanel genre="설명문" />);
    expect(screen.getByText(/이 과제가 너한테 묻는 핵심/)).toBeInTheDocument();
  });

  it("메모 입력칸의 placeholder는 중립 안내(예시 문장 금지)", () => {
    render(<GuidePanel genre="설명문" />);
    const memo = screen.getAllByPlaceholderText(/네 생각을 한 줄로/)[0];
    expect(memo).toBeInTheDocument();
  });

  it("'캔버스에 넣기'·복사 등 본문 자동삽입 경로가 DOM에 없다 (대필 가드)", () => {
    render(<GuidePanel genre="설명문" />);
    expect(screen.queryByText(/캔버스에 넣기|본문에 넣기|복사|붙여넣기/)).toBeNull();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm run test:components -- GuidePanel`
Expected: FAIL — cannot resolve `./GuidePanel`

- [ ] **Step 3: GuidePanel 구현 (참조용 메모, 캔버스 이관 경로 0)**

Create `app/components/coach/GuidePanel.tsx`:

```tsx
"use client";

// 가이드 모드 — write 단계 직교 패널. 정적 질문 카드 + 참조용 메모(scratchpad).
//   불변식: 메모→캔버스 자동삽입 경로 없음('넣기'/복사 버튼 0). 메모는 pwc-guide-memos-v1에만 저장.
//   CoachSession·process-log에 미합류(대필 증거 오염 방지).

import { useEffect, useState } from "react";
import { guideQuestionsFor } from "@/app/lib/guide-prompts";

const MEMOS_KEY = "pwc-guide-memos-v1";

function loadMemos(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(MEMOS_KEY);
    const o = raw ? (JSON.parse(raw) as unknown) : {};
    return o && typeof o === "object" && !Array.isArray(o) ? (o as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function saveMemos(m: Record<string, string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MEMOS_KEY, JSON.stringify(m));
  } catch {
    /* swallow */
  }
}

export default function GuidePanel({ genre }: { genre: string }) {
  const questions = guideQuestionsFor(genre);
  const [memos, setMemos] = useState<Record<string, string>>({});

  useEffect(() => {
    setMemos(loadMemos());
  }, []);

  function setMemo(area: string, value: string) {
    const next = { ...memos, [area]: value };
    setMemos(next);
    saveMemos(next);
  }

  return (
    <section aria-label="가이드 질문" className="border-border bg-surface rounded-xl border p-4">
      <p className="text-subtle-foreground mb-3 text-[11px] font-semibold tracking-wide">
        막힐 때 — 아래 질문에 네 말로 메모해 봐 (참고용, 본문은 캔버스에 직접 써요)
      </p>
      <ul className="space-y-3">
        {questions.map((q) => (
          <li key={q.area}>
            <p className="text-foreground text-sm font-medium">{q.question}</p>
            <textarea
              aria-label={`${q.area} 메모`}
              value={memos[q.area] ?? ""}
              onChange={(e) => setMemo(q.area, e.target.value)}
              placeholder="네 생각을 한 줄로…"
              rows={2}
              className="border-border bg-background text-foreground mt-1.5 w-full resize-y rounded-lg border px-2.5 py-1.5 text-sm"
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 4: GuidePanel 통과 확인**

Run: `npm run test:components -- GuidePanel`
Expected: PASS (3 tests)

- [ ] **Step 5: CoachClient props 시그니처 변경**

`app/components/coach/CoachClient.tsx`의 import에 추가:

```tsx
import type { CoachAssignment, WritingMode } from "@/app/lib/coach-setup";
import GuidePanel from "@/app/components/coach/GuidePanel";
```

컴포넌트 시그니처(455행)를 교체:

```tsx
export default function CoachClient({
  assignment: assignmentProp,
  mode = "free",
  onAuthExpired,
}: {
  assignment?: CoachAssignment;
  mode?: WritingMode;
  onAuthExpired?: () => void;
}) {
```

> `assignment?`를 optional로 둬 기존 호출부(없이 마운트)와 테스트가 깨지지 않게 한다. 기본값은 아래 상수.

- [ ] **Step 6: 하드코딩 ASSIGNMENT를 prop으로 대체**

`app/components/coach/CoachClient.tsx`의 모듈 상수 `ASSIGNMENT`(54-62행)와 `ASSIGNMENT_TITLE`(62행)을 데모 기본값으로 이름만 유지하고, 컴포넌트 내부에서 prop 우선으로 해석한다. 상수 선언을 교체:

```tsx
// 데모 기본 과제 — prop 미주입(직접 마운트·테스트) 시 폴백.
const DEMO_ASSIGNMENT: CoachAssignment = {
  school_level: "중2",
  subject: "과학",
  genre: "설명문",
  target_char_count: null,
  prompt_text: "화산의 형성 과정과 그것이 우리 삶에 미치는 영향을 설명하는 글을 쓰시오.",
  title: "화산의 형성과 영향",
};
```

컴포넌트 본문 상단(reducer 선언 직후, `const busy = ...` 부근)에 추가:

```tsx
  const assignment = assignmentProp ?? DEMO_ASSIGNMENT;
  const assignmentTitle = assignment.title ?? assignment.prompt_text.slice(0, 24);
```

그리고 `callCoach`로 보내는 payload와 `sessionAssignment()`, 헤더 표시가 모듈 상수 `ASSIGNMENT`/`ASSIGNMENT_TITLE` 대신 이 `assignment`/`assignmentTitle`를 쓰도록 교체한다:
- `payload.assignment`(callCoach): `assignment`의 5필드(`school_level/subject/genre/target_char_count/prompt_text`)를 전달. `callCoach`를 컴포넌트 내부 클로저로 옮기거나 `assignment`를 인자로 받도록 시그니처 확장.
- `sessionAssignment()`: `assignment.school_level/subject/genre/prompt_text` 사용.
- 헤더 JSX(665행 `{ASSIGNMENT_TITLE}` → `{assignmentTitle}`, 668행 `{ASSIGNMENT.genre}` → `{assignment.genre}`).

> 구현 메모: `callCoach`/`sessionAssignment`가 현재 모듈 스코프 함수다. `assignment`는 컴포넌트 state/prop이므로, 두 함수를 컴포넌트 내부로 이동하거나 `assignment`를 명시 인자로 전달한다. reducer·phase 로직은 건드리지 않는다(불변).

- [ ] **Step 7: mode='guide'일 때 GuidePanel을 write 단계에 동반 렌더**

`app/components/coach/CoachClient.tsx`의 캔버스(`<Canvas .../>`, 696-701행) 직후, BottomSheet 위에 조건부 렌더 추가:

```tsx
          {mode === "guide" && state.phase === "write" && (
            <div className="px-[18px] pb-2">
              <GuidePanel genre={assignment.genre} />
            </div>
          )}
```

- [ ] **Step 8: 타입체크 + 기존 코치 테스트 회귀**

Run: `npm run typecheck && npm run test:components`
Expected: PASS. 기존 CoachClient 테스트(있다면)·CoachSetupFlow 테스트(mock 해제 후 실제 props)도 통과.

- [ ] **Step 9: E2E 작성 (C2 회귀 + 자유/가이드 흐름)**

Create `e2e/coach-foundation.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

// 데모 토큰: NEXT_PUBLIC_DEMO_TOKEN 미설정 환경에서는 입력 화면이 뜬다.
// CI에서 DEMO_ACCESS_TOKEN/NEXT_PUBLIC_DEMO_TOKEN이 설정돼 있으면 자동 입장한다.
test.describe("코치 토대 (물결1)", () => {
  test("C2: /coach 직접 진입 시 토큰 게이트 또는 과제 입력이 보인다 (무반응 아님)", async ({ page }) => {
    await page.goto("/coach");
    const tokenGate = page.getByText("데모 접근");
    const assignment = page.getByText("어떤 글을 써볼까요");
    await expect(tokenGate.or(assignment)).toBeVisible();
  });

  test("자유 모드: 과제 입력 → 자유 선택 → 캔버스 진입", async ({ page }) => {
    await page.goto("/coach");
    // 토큰 게이트가 보이면 건너뛴다(자동 입장 환경 가정). 과제 입력이 보일 때까지 대기.
    const assignmentHeading = page.getByText("어떤 글을 써볼까요");
    if (!(await assignmentHeading.isVisible().catch(() => false))) test.skip(true, "데모 토큰 미설정 — 게이트 통과 불가");
    await page.getByLabel(/학년/).selectOption("중2");
    await page.getByLabel(/과목/).selectOption("과학");
    await page.getByLabel(/장르/).selectOption("설명문");
    await page.getByLabel(/과제 내용/).fill("화산의 형성 과정을 설명하라");
    await page.getByRole("button", { name: /다음/ }).click();
    await page.getByTestId("mode-free").click();
    await expect(page.getByTestId("coach-ask")).toBeVisible();
  });
});
```

- [ ] **Step 10: Commit**

```bash
git add app/components/coach/CoachClient.tsx app/components/coach/GuidePanel.tsx scripts/components/GuidePanel.test.tsx e2e/coach-foundation.spec.ts
git commit -m "$(printf 'feat(coach): 과제 prop 파라미터화(C3) + 가이드 모드 패널\n\nCoachClient 하드코딩 ASSIGNMENT를 prop으로. mode=guide 시 정적 질문 패널\n동반(메모 참조용, 캔버스 자동삽입 0). reducer/phase 로직 무수정.\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 8: C1 진입점 노출 (Sidebar + onboarding)

**Files:**
- Modify: `app/components/Sidebar.tsx:34-43` (NavLinks, `/try` 직후)
- Modify: `app/onboarding/page.tsx:372-389` (Step3 CTA 영역)

**Interfaces:** 없음(링크 추가만).

- [ ] **Step 1: Sidebar에 /coach 링크 추가**

`app/components/Sidebar.tsx`의 `/try` `<Link>` 블록(34-43행) 직후에 삽입:

```tsx
      <Link
        href="/coach"
        onClick={onNavigate}
        className={itemCls(pathname === "/coach")}
      >
        과정 코치
        <span className="bg-accent-mid-surface text-accent-mid ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold">
          베타
        </span>
      </Link>
```

- [ ] **Step 2: onboarding Step3에 코치 진입 CTA 추가**

`app/onboarding/page.tsx`의 Step3 버튼 그룹(372-389행)에서 "내 글 바로 채점받을래요" 버튼 다음에 코치 진입 버튼을 추가:

```tsx
        <button
          type="button"
          onClick={() => go("/coach")}
          disabled={!ready}
          className="border-border bg-surface text-foreground hover:bg-muted inline-flex h-12 w-full items-center justify-center rounded-xl border text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          과정 코치로 직접 고쳐 써볼래요
        </button>
```

- [ ] **Step 3: 타입체크 + 빌드 스모크**

Run: `npm run typecheck`
Expected: PASS

- [ ] **Step 4: 수동 확인**

`npm run dev` 후 사이드바에 "과정 코치(베타)"가 보이고 클릭 시 `/coach` 이동, `/onboarding?force=1` Step3에 코치 CTA가 보이는지 확인.

- [ ] **Step 5: Commit**

```bash
git add app/components/Sidebar.tsx app/onboarding/page.tsx
git commit -m "$(printf 'feat(coach): /coach 진입점 노출 — 사이드바·온보딩 (C1)\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 9: 브랜드 토큰 통합

**Files:**
- Modify: `app/globals.css` (`@theme` + `:root`/`[data-theme]` 변수)
- Modify: `#24D39E`/`#1FBE8C` 사용 12개 파일 (grep 목록)
- Modify: `app/components/coach/coach.module.css` (토큰 정렬)

**Interfaces:** 없음(시각 변경만).

- [ ] **Step 1: globals.css에 색 의미 토큰 정렬**

`app/globals.css`의 `:root`(또는 `[data-theme="light"]`) 변수 블록에서 `--primary`를 파랑으로 재매핑하고 `--ok`·`--ease` 확인/추가. 정확한 변수명은 파일을 열어 확인 후:

```css
  /* 색 의미 확정: primary=행동(blue), ok=상승(green), lemon=성취 */
  --primary: #0362da;        /* 기존 green(#24D39E)에서 blue로 재매핑 */
  --primary-fg: #ffffff;
  /* --ok 는 기존 값(#10b987) 유지. */
```

`@theme` 블록에 `--ease` 승격(없으면 추가):

```css
  --ease: cubic-bezier(0.32, 0.72, 0, 1);
```

> 다크 테마(`[data-theme="dark"]`)에도 `--primary` 대응 값을 동일 의미로 맞춘다(대비 확인).

- [ ] **Step 2: 하드코딩 색 치환**

다음 12개 파일에서 `bg-[#24D39E]`→`bg-primary`, `hover:bg-[#1FBE8C]`→`hover:opacity-90`(또는 `hover:bg-primary/90`), `ring-[#24D39E]`→`ring-primary`, `text-white`(primary 버튼 한정)→`text-primary-foreground`로 치환:

```
app/page.tsx · app/about/page.tsx · app/onboarding/page.tsx · app/me/page.tsx
app/components/TryClient.tsx · app/components/ScoreForm.tsx · app/components/ProfileForm.tsx
app/components/ConsentNotice.tsx · app/components/CtaBand.tsx(있다면) · app/components/HomeWelcomeBanner.tsx
app/components/GrowthCard.tsx · app/components/RevisionToggle.tsx · app/components/AnnotatedBody.tsx
```

각 파일에서 `grep -n "#24D39E\|#1FBE8C"` 결과를 한 줄씩 치환. 색상 외 의미(성장/성공 막대)는 `--color-ok`로 분리.

- [ ] **Step 3: GrowthCard 동률 막대 회귀 확인**

`app/components/GrowthCard.tsx`에서 'neutral/동률' 막대가 `primary`(이제 blue)를 참조하면, '상승=green(ok)'과 충돌하지 않도록 중립색(예: `bg-muted-foreground/40`)으로 분리. 막대 의미: 상승=`ok`(green), 새 칸=`lemon`, 동률/중립=muted.

- [ ] **Step 4: coach.module.css 정렬**

`app/components/coach/coach.module.css`의 `--pullim-blue`·`--pullim-lemon`이 globals 토큰과 같은 값을 참조하도록 정렬(값 중복 시 globals var 참조). 색 값 변경 없이 일관화.

- [ ] **Step 5: 하드코딩 0건 확인 + 타입체크 + 테스트**

Run: `grep -rn "#24D39E\|#1FBE8C" app || echo "OK: 하드코딩 0건"`
Expected: `OK: 하드코딩 0건` (또는 의도적으로 남긴 곳만)

Run: `npm run typecheck && npm run test:all`
Expected: PASS

- [ ] **Step 6: 시각 회귀 수동 확인**

`npm run dev` 후 home·`/try`·`/onboarding`·`/coach` 4화면 스크린샷으로 CTA가 파랑, 성장 막대 green, 액센트 레몬인지 확인(green CTA 잔존 0).

- [ ] **Step 7: Commit**

```bash
git add app/globals.css app/components/coach/coach.module.css app/**/*.tsx
git commit -m "$(printf 'refactor(ui): 브랜드 토큰 통합 — primary=blue/ok=green/lemon=성취\n\n#24D39E 하드코딩 제거, 색 의미 확정. GrowthCard 동률 막대 중립색 분리.\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## 최종 검증

- [ ] `npm run typecheck` 그린
- [ ] `npm run test:all` 그린 (순수 모듈 유닛 + 컴포넌트)
- [ ] `npm run test:e2e -- coach-foundation` 그린 (또는 토큰 환경 미설정 시 skip 사유 확인)
- [ ] 수용 기준(스펙 §수용 기준) 8개 항목 수동 체크
- [ ] PR 생성: base `main` ← `feat/wave1-coach-foundation`, 본문에 C1/C2/C3 해결·불변식 가드·시각 회귀 스크린샷 첨부
