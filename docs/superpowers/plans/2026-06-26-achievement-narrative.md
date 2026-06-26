# 성취 서사 (Achievement Narrative) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 코치 완료 화면(CompletionView)에 학생용 **성취 서사** 4종을 추가 — 돌파 배지·끈기 스트릭·과정 타임라인·성장 스토리 공유 카드. 모두 **기존 메타데이터(draftHistory·stuckAreas·perArea)의 순수 시각화**이며 **신규 텍스트 생성 0**.

**Architecture:** 데이터는 이미 존재(`CoachSession.draftHistory/nudgeHistory`, `buildProcessLog`의 `stuckAreas`/`perArea`). 각 기능은 **순수 셀렉터/빌더(노드 테스트)** + 표현 컴포넌트(vitest) + `CompletionView` 마운트. CoachClient가 done 시 `sessionRef.current`(CoachSession)를 CompletionView에 전달해 파생. 검증된 reducer/세션 무수정.

**Tech Stack:** Next 16, React 19, Tailwind v4, vitest(컴포넌트), node:test(순수), 기존 `app/lib/{process-log,coach-session,storage,revision}.ts` 재사용.

## Global Constraints (spec: docs 30 — 성취 서사)
- **draft 본문 미출력(절대):** 타임라인·공유 카드·어떤 성취 UI도 학생 draft 본문 텍스트를 노출하지 않는다 — n·charCount·delta·영역명·횟수 같은 **메타데이터만**. (draftHistory[].body는 화면/클립보드에 절대 미도달.)
- **대필 0 불변식 리터럴 고정:** `ProcessLog.coachWroteSentences:false`·`authorIsStudent:true`는 런타임 분기로 바꾸지 않는다.
- **ShareStory 안전(하드가드):** `formatStoryText`는 **화이트리스트 토큰만**(과제명·장르·`고쳐쓰기 N회`·`돌파 영역: …`·고정 인장). **블랙리스트**(draft 본문·nudge 텍스트·점수 정수) 미포함을 **차단 회귀 테스트**로 고정 + `checkGenerationBlock` 백스톱(출력을 nudge로 감싸 통과 확인).
- **시각 언어:** lemon(`--pullim-lemon`/`#e6ff4c`) = '새로 자란 것/성취' 전용 액센트. green = '상승/성공'. 수치(원점수) 숨김 — 개선 여부(improved)만.
- **데이터 신규 생성 0:** 순수 메타데이터 환원만. 검증된 코치 reducer/Phase/세션 무수정.
- 커밋 끝: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. 검증: `npm run test:unit`·`test:components`·`typecheck`·`build`.

## File Structure
| 상태 | 경로 | 책임 | Task |
|---|---|---|---|
| 수정 | `app/lib/process-log.ts` | `selectBreakthroughs`·`buildTimeline` 순수 함수 가산 | T1·T3 |
| 신규 | `app/components/coach/BreakthroughBadge.tsx` | 돌파 영역 레몬 배지 | T1 |
| 수정 | `app/components/coach/CoachClient.tsx` | CompletionView에 session 전달 + 4종 마운트 | T1~T4 |
| 수정 | `app/lib/storage.ts` | `pwc_done_count_v1` load/increment | T2 |
| 신규 | `app/components/coach/PersistDots.tsx` | 완료 스트릭 점 행 | T2 |
| 신규 | `app/components/coach/ProcessTimeline.tsx` | '내가 해냈다' 타임라인(본문 미출력) | T3 |
| 신규 | `app/lib/story.ts` | `formatStoryText` 화이트리스트 직렬화(순수) | T4 |
| 신규 | `app/components/coach/ShareStory.tsx` | 복사 버튼 + 미리보기 | T4 |
| 신규 | `scripts/story.test.mjs`, `scripts/process-log-extra.test.mjs` | 순수 함수 테스트 | T1·T3·T4 |
| 신규 | `scripts/components/{BreakthroughBadge,PersistDots,ProcessTimeline,ShareStory}.test.tsx` | 컴포넌트 테스트 | T1~T4 |

---

## Task 1: BreakthroughBadge (돌파 배지) + session 배선

**Files:** Modify `app/lib/process-log.ts`, `app/components/coach/CoachClient.tsx`; Create `app/components/coach/BreakthroughBadge.tsx`, `scripts/process-log-extra.test.mjs`, `scripts/components/BreakthroughBadge.test.tsx`

**Produces:** `export function selectBreakthroughs(log: ProcessLog): AreaName[]`; `BreakthroughBadge({ areas }: { areas: AreaName[] })`.

- [ ] **Step 1: 순수 셀렉터 실패 테스트** — `scripts/process-log-extra.test.mjs`:
```js
import assert from "node:assert/strict";
import { test } from "node:test";
import { selectBreakthroughs } from "../app/lib/process-log.ts";

const log = (stuck, perArea) => ({ revisions: 1, finalCharCount: 100, coachWroteSentences: false, authorIsStudent: true, perArea, stuckAreas: stuck });

test("돌파 = 막혔던 영역(stuck) 중 개선된(improved) 영역", () => {
  const r = selectBreakthroughs(log(["내용 충실도", "구조·논리"], [
    { area: "내용 충실도", baseline: 8, final: 15, improved: true },
    { area: "구조·논리", baseline: 9, final: 9, improved: false },
  ]));
  assert.deepEqual(r, ["내용 충실도"]); // 막혔지만 개선된 것만
});
test("막힌 영역 없거나 개선 없으면 빈 배열", () => {
  assert.deepEqual(selectBreakthroughs(log([], [])), []);
  assert.deepEqual(selectBreakthroughs(log(["표현·문장"], [{ area: "표현·문장", baseline: 5, final: 5, improved: false }])), []);
});
```

- [ ] **Step 2: 실패 확인** — `node --import ./scripts/register-ts.mjs --test scripts/process-log-extra.test.mjs` → FAIL.

- [ ] **Step 3: 구현** — `app/lib/process-log.ts` 끝에 추가:
```ts
// 돌파: nudge가 반복돼 '막혔던' 영역(stuckAreas) 중 끝내 개선된(improved) 영역.
//   '방어 증거(막힘 기록) = 성취 증거(뚫음)'의 이중가치. 신규 데이터 0 — perArea·stuckAreas 환원.
export function selectBreakthroughs(log: ProcessLog): AreaName[] {
  const improved = new Set(log.perArea.filter((p) => p.improved).map((p) => p.area));
  return log.stuckAreas.filter((a) => improved.has(a));
}
```

- [ ] **Step 4: 통과** — 같은 명령 PASS.

- [ ] **Step 5: BreakthroughBadge 컴포넌트 + 테스트** — `app/components/coach/BreakthroughBadge.tsx`:
```tsx
"use client";
import type { AreaName } from "@/app/data/samples";

export default function BreakthroughBadge({ areas }: { areas: AreaName[] }) {
  if (areas.length === 0) return null;
  return (
    <div data-testid="breakthrough" className="mt-[18px] rounded-[var(--r-lg)] border border-[var(--line)] bg-white p-[18px] shadow-[var(--sh-1)]">
      <div className="mb-2.5 text-[11px] font-bold tracking-[0.08em] text-[var(--pullim-blue)]">🔓 막혔다 뚫은 순간</div>
      <div className="flex flex-wrap gap-2">
        {areas.map((a) => (
          <span key={a} className="inline-flex items-center gap-1.5 rounded-[var(--r-pill)] bg-[var(--pullim-lemon)] px-3 py-1.5 text-[12.5px] font-bold text-[var(--pullim-ink)]">
            {a} 돌파
          </span>
        ))}
      </div>
    </div>
  );
}
```
`scripts/components/BreakthroughBadge.test.tsx`:
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import BreakthroughBadge from "@/app/components/coach/BreakthroughBadge";

describe("BreakthroughBadge", () => {
  it("돌파 영역을 레몬 배지로 노출", () => {
    render(<BreakthroughBadge areas={["내용 충실도"]} />);
    expect(screen.getByTestId("breakthrough")).toBeInTheDocument();
    expect(screen.getByText("내용 충실도 돌파")).toBeInTheDocument();
  });
  it("돌파 없으면 렌더 안 함", () => {
    const { container } = render(<BreakthroughBadge areas={[]} />);
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 6: CompletionView에 session 전달 + 배지 마운트** — `CoachClient.tsx`:
  - `<CompletionView state={state} ... />`(:880) 호출에 `session={sessionRef.current}` prop 추가(sessionRef는 CoachClient의 세션 ref — grep `sessionRef`로 확인, `CoachSession | null`).
  - `CompletionView` 시그니처에 `session: CoachSession | null` 추가. import `buildProcessLog`, `selectBreakthroughs`, `BreakthroughBadge`.
  - `GrowthBars` 직후(:1040)에:
```tsx
{session ? <BreakthroughBadge areas={selectBreakthroughs(buildProcessLog(session))} /> : null}
```
  - reducer/State/Action/세션 무수정 — `session`은 read-only prop.

- [ ] **Step 7: 검증** — `npm run test:unit`·`npx vitest run scripts/components/BreakthroughBadge.test.tsx`·`npm run typecheck` 그린. `git diff` reducer 영역 무변경.

- [ ] **Step 8: Commit**
```bash
git add app/lib/process-log.ts app/components/coach/BreakthroughBadge.tsx app/components/coach/CoachClient.tsx scripts/process-log-extra.test.mjs scripts/components/BreakthroughBadge.test.tsx
git commit -m "$(printf 'feat(coach): 성취 서사 — 돌파 배지(BreakthroughBadge) + session 배선\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 2: PersistDots (끈기 스트릭)

**Files:** Modify `app/lib/storage.ts`, `app/components/coach/CoachClient.tsx`; Create `app/components/coach/PersistDots.tsx`, `scripts/components/PersistDots.test.tsx`

**Produces:** `export function loadDoneCount(): number`; `export function bumpDoneCount(): number`; `PersistDots({ count }: { count: number })`.

- [ ] **Step 1: storage 키 + 헬퍼** — `app/lib/storage.ts`에 가산(기존 키 패턴 답습):
```ts
// 완료(통과)한 과제 누적 수 — 세션 간 끈기 스트릭. 메타데이터(정수 1개)만, 본문/점수 무관.
const DONE_COUNT_KEY = "pwc_done_count_v1";
export function loadDoneCount(): number {
  if (typeof window === "undefined") return 0;
  try { const n = Number(window.localStorage.getItem(DONE_COUNT_KEY)); return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0; } catch { return 0; }
}
export function bumpDoneCount(): number {
  if (typeof window === "undefined") return 0;
  try { const next = loadDoneCount() + 1; window.localStorage.setItem(DONE_COUNT_KEY, String(next)); return next; } catch { return loadDoneCount(); }
}
```

- [ ] **Step 2: storage 테스트** — 기존 `scripts/*.test.mjs`(storage 테스트 파일이 있으면 거기, 없으면 `scripts/storage-done.test.mjs` 신규)에:
```js
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";
// jsdom 없는 node 환경: window 가짜 주입
globalThis.window = { localStorage: (() => { let s = {}; return { getItem: (k) => s[k] ?? null, setItem: (k, v) => { s[k] = String(v); }, removeItem: (k) => { delete s[k]; }, clear: () => { s = {}; } }; })() };
const { loadDoneCount, bumpDoneCount } = await import("../app/lib/storage.ts");
beforeEach(() => window.localStorage.clear());
test("bumpDoneCount 누적 + load 반영", () => {
  assert.equal(loadDoneCount(), 0);
  assert.equal(bumpDoneCount(), 1);
  assert.equal(bumpDoneCount(), 2);
  assert.equal(loadDoneCount(), 2);
});
```
(주: 기존 storage 테스트가 jsdom 폴리필을 쓰면 그 패턴을 따를 것. 핵심은 누적·load 반영 단언.)

- [ ] **Step 3: 완료 시 1회 증가(중복 방지)** — `CoachClient.tsx`: done phase 진입 시 `bumpDoneCount()`를 **과제당 1회만** 호출. 기존 done 전환 effect(또는 process-log 저장 :356 부근)에 `useRef` 가드로:
```tsx
const doneCountedRef = useRef(false);
useEffect(() => {
  if (state.phase === "done" && !doneCountedRef.current) {
    doneCountedRef.current = true;
    setDoneStreak(bumpDoneCount());
  }
}, [state.phase]);
```
`const [doneStreak, setDoneStreak] = useState(0)`. reset/handleNewAssignment에서 `doneCountedRef.current = false`(새 과제는 다시 카운트 가능). reducer 무수정.

- [ ] **Step 4: PersistDots 컴포넌트 + 테스트** — `app/components/coach/PersistDots.tsx`:
```tsx
"use client";
export default function PersistDots({ count }: { count: number }) {
  if (count <= 0) return null;
  const dots = Math.min(count, 10);
  return (
    <div data-testid="persist-dots" className="mt-3 flex items-center gap-2 text-[12px] text-[var(--ink-3)]">
      <span className="font-semibold text-[var(--pullim-blue)]">끝까지 해낸 글 {count}편</span>
      <span className="flex gap-1" aria-hidden="true">
        {Array.from({ length: dots }).map((_, i) => (
          <i key={i} className="h-2 w-2 rounded-full bg-[var(--pullim-lemon)]" />
        ))}
      </span>
    </div>
  );
}
```
`scripts/components/PersistDots.test.tsx`: count=3 → "끝까지 해낸 글 3편" + 3 dots; count=0 → null.

- [ ] **Step 5: 마운트** — CompletionView에서 BreakthroughBadge 직후 `<PersistDots count={doneStreak} />`. (doneStreak는 CoachClient state → CompletionView prop으로 전달.)

- [ ] **Step 6: 검증 + Commit** — `npm run test:unit`·`test:components`·`typecheck` 그린.
```bash
git add app/lib/storage.ts app/components/coach/PersistDots.tsx app/components/coach/CoachClient.tsx scripts/storage-done.test.mjs scripts/components/PersistDots.test.tsx
git commit -m "$(printf 'feat(coach): 성취 서사 — 끈기 스트릭(PersistDots) + pwc_done_count_v1\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 3: ProcessTimeline (과정 타임라인 — 본문 미출력)

**Files:** Modify `app/lib/process-log.ts`, `app/components/coach/CoachClient.tsx`; Create `app/components/coach/ProcessTimeline.tsx`, test in `scripts/process-log-extra.test.mjs`

**Produces:** `export type TimelineNode = { n: number; charCount: number; delta: number }`; `export function buildTimeline(session: CoachSession): TimelineNode[]`.

- [ ] **Step 1: 순수 빌더 실패 테스트(본문 미출력 가드)** — `scripts/process-log-extra.test.mjs`에 추가:
```js
import { buildTimeline } from "../app/lib/process-log.ts";
test("buildTimeline: draftHistory → n·charCount·delta (본문 절대 미포함)", () => {
  const session = { assignment: {}, baseline: [], areaScores: [], nudgeHistory: [],
    draftHistory: [ { n: 1, body: "비밀 초고 본문", charCount: 7 }, { n: 2, body: "더 긴 고친 본문 텍스트", charCount: 12 } ] };
  const t = buildTimeline(session);
  assert.deepEqual(t, [ { n: 1, charCount: 7, delta: 0 }, { n: 2, charCount: 12, delta: 5 } ]);
  // 본문 문자열이 결과 어디에도 없어야 한다
  assert.equal(JSON.stringify(t).includes("본문"), false);
});
```

- [ ] **Step 2: 실패 확인** → FAIL.

- [ ] **Step 3: 구현** — `app/lib/process-log.ts`:
```ts
// 과정 타임라인: draftHistory를 n·글자수·증감으로 환원. **body는 절대 포함하지 않는다**(대필 방어 + 사생활).
export type TimelineNode = { n: number; charCount: number; delta: number };
export function buildTimeline(session: CoachSession): TimelineNode[] {
  return session.draftHistory.map((d, i) => ({
    n: d.n,
    charCount: d.charCount,
    delta: i === 0 ? 0 : d.charCount - session.draftHistory[i - 1].charCount,
  }));
}
```

- [ ] **Step 4: 통과** → PASS.

- [ ] **Step 5: ProcessTimeline 컴포넌트 + 테스트** — `app/components/coach/ProcessTimeline.tsx`:
```tsx
"use client";
import type { TimelineNode } from "@/app/lib/process-log";

export default function ProcessTimeline({ nodes }: { nodes: TimelineNode[] }) {
  if (nodes.length === 0) return null;
  return (
    <ol data-testid="process-timeline" className="mt-[18px] space-y-2.5">
      {nodes.map((node) => (
        <li key={node.n} className="flex items-baseline gap-2 text-[13px] text-[var(--ink-3)]">
          <span className="text-[var(--pullim-blue)] font-semibold">{node.n}번째 글</span>
          <span>{node.charCount.toLocaleString("ko-KR")}자 직접 씀</span>
          {node.delta > 0 ? <span className="font-bold text-[var(--pullim-ink)]">+{node.delta.toLocaleString("ko-KR")}자 더 채움</span> : null}
        </li>
      ))}
    </ol>
  );
}
```
`scripts/components/ProcessTimeline.test.tsx`: nodes 2개 → "1번째 글"·"2번째 글"·"+5자 더 채움" 노출; [] → null. **본문 미노출**(어떤 body 텍스트도 없음)은 순수 빌더 테스트가 보증.

- [ ] **Step 6: 마운트** — CompletionView에 `import { buildTimeline }`·ProcessTimeline. PersistDots 직후 `{session ? <ProcessTimeline nodes={buildTimeline(session)} /> : null}`.

- [ ] **Step 7: 검증 + Commit** — 그린 후:
```bash
git add app/lib/process-log.ts app/components/coach/ProcessTimeline.tsx app/components/coach/CoachClient.tsx scripts/process-log-extra.test.mjs scripts/components/ProcessTimeline.test.tsx
git commit -m "$(printf 'feat(coach): 성취 서사 — 과정 타임라인(ProcessTimeline, 본문 미출력)\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 4: ShareStory (성장 스토리 공유 카드 — 화이트리스트 직렬화)

**Files:** Create `app/lib/story.ts`, `app/components/coach/ShareStory.tsx`, `scripts/story.test.mjs`, `scripts/components/ShareStory.test.tsx`; Modify `app/components/coach/CoachClient.tsx`

**Produces:** `export function formatStoryText(input: { title: string; genre: string; revisions: number; breakthroughs: AreaName[] }): string`; `ShareStory({ text }: { text: string })`.

- [ ] **Step 1: 화이트리스트 직렬화 + 차단 회귀 테스트(RED)** — `scripts/story.test.mjs`:
```js
import assert from "node:assert/strict";
import { test } from "node:test";
import { formatStoryText } from "../app/lib/story.ts";
import { checkGenerationBlock } from "../app/lib/coach-schema.ts";

const input = { title: "화산의 형성", genre: "설명문", revisions: 3, breakthroughs: ["내용 충실도"] };

test("formatStoryText: 화이트리스트 토큰만(과제명·장르·횟수·돌파·인장)", () => {
  const s = formatStoryText(input);
  assert.ok(s.includes("화산의 형성"));
  assert.ok(s.includes("설명문"));
  assert.ok(s.includes("고쳐쓰기 3회"));
  assert.ok(s.includes("내용 충실도"));
  assert.ok(s.includes("코치 문장 0개")); // 고정 인장
});
test("블랙리스트 미포함: draft 본문·nudge·점수 정수 흔적 없음", () => {
  // draft 본문/nudge 같은 텍스트나 점수 숫자(0~20)가 출력에 섞이면 안 됨.
  const s = formatStoryText({ ...input, title: "화산", genre: "설명문" });
  // 점수 정수 라벨(예: '15점', '/20')이 없어야 함
  assert.equal(/\d+\s*점|\/\s*20/.test(s), false);
});
test("checkGenerationBlock 백스톱: story 텍스트를 nudge로 감싸도 위반 0", () => {
  const s = formatStoryText(input);
  const out = { area_scores: [], nudges: [{ paragraph_index: 0, rubric_area: "내용 충실도", diagnosis: s, guiding_question: "어땠어?", quick_win_rank: 1 }] };
  assert.equal(checkGenerationBlock(out).length, 0); // 대필 신호 없어야 함
});
```

- [ ] **Step 2: 실패 확인** → FAIL.

- [ ] **Step 3: 구현(순수)** — `app/lib/story.ts`:
```ts
import type { AreaName } from "@/app/data/samples";

// 성장 스토리 공유 텍스트 — **화이트리스트 토큰만**. draft 본문·nudge·점수 정수는 절대 미포함(대필 누출 차단).
//   클립보드로 학생이 복사할 유일한 산출물 → 본문/점수 한 글자도 새면 불변식 위반.
export function formatStoryText(input: { title: string; genre: string; revisions: number; breakthroughs: AreaName[] }): string {
  const lines = [
    `📝 ${input.title} (${input.genre})`,
    `고쳐쓰기 ${input.revisions}회 — 내 손으로 끝까지 다듬었어요.`,
  ];
  if (input.breakthroughs.length > 0) lines.push(`막힌 곳을 뚫은 영역: ${input.breakthroughs.join(", ")}`);
  lines.push(`🔒 코치 문장 0개 · 작성 주체 학생 본인`);
  return lines.join("\n");
}
```

- [ ] **Step 4: 통과** → PASS (3 테스트 모두).

- [ ] **Step 5: ShareStory 컴포넌트 + 테스트** — `app/components/coach/ShareStory.tsx`:
```tsx
"use client";
import { useState } from "react";

export default function ShareStory({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* 권한 거부 — 조용히 폴백 */ }
  };
  return (
    <div data-testid="share-story" className="mt-[18px] rounded-[var(--r-lg)] border border-[var(--line)] bg-white p-[18px] shadow-[var(--sh-1)]">
      <div className="mb-2.5 text-[11px] font-bold tracking-[0.08em] text-[var(--pullim-blue)]">📤 성장 스토리</div>
      <pre className="mb-3 whitespace-pre-wrap text-[12.5px] text-[var(--ink-3)]">{text}</pre>
      <button type="button" data-testid="share-copy" onClick={onCopy} className="rounded-lg bg-[var(--pullim-blue)] px-4 py-2 text-[13px] font-semibold text-white">
        {copied ? "복사됨 ✓" : "복사하기"}
      </button>
    </div>
  );
}
```
`scripts/components/ShareStory.test.tsx`: 텍스트 렌더 + 복사 버튼 클릭 시 `navigator.clipboard.writeText`가 그 텍스트로 호출(clipboard 목).

- [ ] **Step 6: 마운트** — CompletionView에서 `import { formatStoryText }`·ShareStory. assignment(title/genre)는 CompletionView가 받는 state/prop에서(없으면 CoachClient가 `assignment`를 CompletionView prop으로 전달 — grep CompletionView 호출부). breakthroughs = `selectBreakthroughs(buildProcessLog(session))`, revisions = `state.revisions`. ProcessTimeline 직후:
```tsx
{session ? <ShareStory text={formatStoryText({ title: assignment.title ?? assignment.prompt_text, genre: assignment.genre, revisions: state.revisions, breakthroughs: selectBreakthroughs(buildProcessLog(session)) })} /> : null}
```
(assignment를 CompletionView가 못 받으면 prop 추가.)

- [ ] **Step 7: 검증 + Commit** — `npm run test:unit`(story 백스톱 포함)·`test:components`·`typecheck` 그린.
```bash
git add app/lib/story.ts app/components/coach/ShareStory.tsx app/components/coach/CoachClient.tsx scripts/story.test.mjs scripts/components/ShareStory.test.tsx
git commit -m "$(printf 'feat(coach): 성취 서사 — 성장 스토리 공유 카드(ShareStory, 화이트리스트+checkGenerationBlock 백스톱)\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 5: 최종 검증
- [ ] **Step 1: typecheck** — `npm run typecheck` 클린.
- [ ] **Step 2: test:all** — `npm run test:all` 그린(순수 셀렉터/빌더/story 백스톱 + 4 컴포넌트).
- [ ] **Step 3: build** — `npm run build` PASS.
- [ ] **Step 4: reducer 무수정 확인** — `git diff main -- app/components/coach/CoachClient.tsx`로 reducer 함수/Action/State/Phase/case 영역 무변경(추가는 import·CompletionView 마운트·doneCount effect·props뿐).
- [ ] **Step 5: dev 시각 점검** — /coach done 화면에 GrowthBars → 돌파 배지 → 끈기 스트릭 → 과정 타임라인 → 성장 스토리(복사) → 과정 로그 순으로 렌더, 본문 텍스트 미노출 확인. 스크린샷.

---

## Self-Review
**Spec coverage(doc 30 gamification):** 돌파 하이라이트→T1, 끈기 스트릭→T2, 과정 타임라인→T3, 공유 카드(화이트리스트)→T4. AreaProgressRail(영역별 진척 타임라인)은 본 1차에서 제외(완료화면 4종 우선; revising 단계 레일은 후속). 전부 신규 텍스트 생성 0.
**Placeholder scan:** 순수 함수·컴포넌트·테스트 모두 완전 코드. session 배선(T1 Step6)·assignment prop(T4 Step6)은 "grep으로 호출부 확인 후 prop 추가"로 명시.
**Type consistency:** `selectBreakthroughs(ProcessLog)→AreaName[]`·`buildTimeline(CoachSession)→TimelineNode[]`·`formatStoryText({title,genre,revisions,breakthroughs})→string`·`loadDoneCount/bumpDoneCount→number`가 T1→T4에서 일관. CompletionView는 `session: CoachSession|null` + `doneStreak`/`assignment` props로 4종에 데이터 공급.
**안전 핵심:** ShareStory 차단 회귀 테스트(블랙리스트 미포함) + checkGenerationBlock 백스톱(T4 Step1)·ProcessTimeline 본문 미출력 가드(T3 Step1)가 대필/사생활 불변식을 고정.
**Executor 위험:** (a) sessionRef 변수명/타입 — grep으로 정확히(`CoachSession|null`). (b) reducer 무수정 — 모든 추가는 CompletionView/effect/props. (c) done 카운트 중복 방지(useRef 가드 + reset 초기화). (d) jsdom 없는 node storage 테스트는 기존 폴리필 패턴 따를 것.
