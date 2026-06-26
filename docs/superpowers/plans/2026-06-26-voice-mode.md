# voice 모드(말하기) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** /coach의 voice("말하기") 모드를 활성화 — Web Speech로 실시간 전사를 아이디어 보조로 제공하고, 학생이 직접 쓰거나 "본문에 넣기"로 삽입한다.

**Architecture:** `useSpeechRecognition`(Web Speech 래퍼) + `VoicePanel`(전사 UI)을 Guide/Outline 패널과 동일한 가산 패턴으로 CoachClient에 붙인다. 삽입은 기존 `EDIT` 디스패치 + `setBodyHtml`/`saveBodyHtml`(#86 경로)를 재사용 → **검증된 reducer 무수정**. voice는 `ENABLED_MODES`에 추가해 활성화.

**Tech Stack:** Next 16, React 19, Tailwind v4, Web Speech API(`webkitSpeechRecognition || SpeechRecognition`, ko-KR), vitest(컴포넌트/훅), node:test(순수), Playwright(e2e).

## Global Constraints
- **브랜치:** `main`에서 `feat/voice-mode`. 무관 워킹트리/`.claude` 커밋 금지 — 각 task가 명시한 파일만 `git add`.
- **대필 0 / 채점 평문 불변:** 전사는 학생 발화. 코치 출력에 아무것도 추가 안 함. 삽입 텍스트도 평문 body → `/api/score`. 라우트·프롬프트·`checkGenerationBlock` 무수정.
- **검증된 코치 reducer/Phase byte-for-byte 무수정:** `state.body` 평문 유지. voice 삽입은 기존 `{type:"EDIT", body}` 디스패치만 호출(새 액션/case 없음). `bodyHtml`은 reducer 밖.
- **우리 서버 오디오 수신 0:** 전사는 클라이언트에만. 미지원/권한거부는 그레이스풀 폴백.
- 커밋 메시지 끝: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. 검증: `npm run typecheck`·`npm run test:unit`·`npm run test:components`·`npm run build`·`npm run test:e2e`.

## File Structure
| 상태 | 경로 | 책임 | Task |
|---|---|---|---|
| 수정 | `app/lib/coach-setup.ts` | `ENABLED_MODES`에 `"voice"` | T1 |
| 수정 | `scripts/coach-setup.test.mjs` | voice 활성 단언 | T1 |
| 수정 | `scripts/components/ModeSelectStep.test.tsx` | voice 카드 활성·클릭 | T1 |
| 신규 | `app/lib/use-speech.ts` | `useSpeechRecognition` 훅 | T2 |
| 신규 | `scripts/components/use-speech.test.tsx` | 훅 유닛(SpeechRecognition 목) | T2 |
| 신규 | `app/components/coach/VoicePanel.tsx` | 마이크·전사·"본문에 넣기" | T3 |
| 신규 | `scripts/components/VoicePanel.test.tsx` | VoicePanel 컴포넌트 | T3 |
| 수정 | `app/components/coach/CoachClient.tsx` | voice 분기 + `handleVoiceInsert`(가산) | T4 |
| 수정 | `scripts/components/CoachClient.test.tsx`(있으면) | voice 분기·삽입 | T4 |
| 수정 | `e2e/coach.spec.ts` | voice 목 STT 플로우 | T5 |

---

## Task 1: voice 모드 활성화

**Files:** Modify `app/lib/coach-setup.ts`, `scripts/coach-setup.test.mjs`, `scripts/components/ModeSelectStep.test.tsx`

- [ ] **Step 1: 테스트 갱신(RED)** — `scripts/coach-setup.test.mjs`의 voice-비활성 테스트(현재 `assert.equal(isModeEnabled("voice"), false)`)를 활성으로:
```js
test("isModeEnabled — free·guide·outline·voice 모두 활성", () => {
  assert.equal(isModeEnabled("free"), true);
  assert.equal(isModeEnabled("guide"), true);
  assert.equal(isModeEnabled("outline"), true);
  assert.equal(isModeEnabled("voice"), true);
});
```
(기존 `isModeEnabled — voice 비활성(별도 보존)` 테스트는 위로 통합·삭제.) `parseSetup` 라운드트립 테스트가 voice를 쓰면 유효 통과를 단언.
`scripts/components/ModeSelectStep.test.tsx`의 `말하기 카드는 비활성` 테스트(:32)를 활성으로:
```tsx
it("말하기 카드 활성 — 클릭 시 onSelect('voice') 호출", async () => {
  const onSelect = vi.fn();
  const user = userEvent.setup();
  render(<ModeSelectStep onSelect={onSelect} />);
  expect(screen.getByTestId("mode-voice")).not.toBeDisabled();
  await user.click(screen.getByTestId("mode-voice"));
  expect(onSelect).toHaveBeenCalledWith("voice");
});
```
(ModeSelectStep onSelect 시그니처는 기존 카드와 동일 — 실제 prop명은 컴포넌트 확인 후 일치시킬 것.)

- [ ] **Step 2: 실패 확인** — `npm run test:unit` + `npx vitest run scripts/components/ModeSelectStep.test.tsx` → voice 관련 RED.

- [ ] **Step 3: 활성화** — `app/lib/coach-setup.ts:29`:
```ts
const ENABLED_MODES: readonly WritingMode[] = ["free", "guide", "outline", "voice"];
```
:28 주석의 "voice는 카드 '준비 중'(비활성)" 및 :76 부근 "비활성 모드(outline/voice)" 표현을 현재 상태에 맞게 갱신(voice 활성). `parseSetup`/`isModeEnabled` 로직 자체는 무변경(ENABLED_MODES만으로 voice가 유효해짐).

- [ ] **Step 4: 통과 확인** — `npm run test:unit`(coach-setup) + ModeSelectStep 컴포넌트 테스트 그린. `npm run typecheck` 클린.

- [ ] **Step 5: Commit**
```bash
git add app/lib/coach-setup.ts scripts/coach-setup.test.mjs scripts/components/ModeSelectStep.test.tsx
git commit -m "$(printf 'feat(coach): voice 모드 활성화 — ENABLED_MODES에 voice 추가\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 2: useSpeechRecognition 훅

**Files:** Create `app/lib/use-speech.ts`, `scripts/components/use-speech.test.tsx`

**Produces:**
```ts
export interface UseSpeechRecognition {
  supported: boolean; listening: boolean; interim: string; error: string | null;
  start: () => void; stop: () => void;
}
export function useSpeechRecognition(opts: { lang?: string; onResult: (finalText: string) => void }): UseSpeechRecognition;
```

- [ ] **Step 1: 실패 테스트** — `scripts/components/use-speech.test.tsx` (vitest, jsdom). SpeechRecognition을 목으로 주입:
```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSpeechRecognition } from "@/app/lib/use-speech";

class MockRec {
  lang = ""; continuous = false; interimResults = false;
  onresult: ((e: unknown) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn(() => { this.onend?.(); });
  // 테스트에서 결과 주입
  emit(finalText: string, interimText: string) {
    this.onresult?.({ resultIndex: 0, results: [
      { 0: { transcript: finalText }, isFinal: true, length: 1 },
      { 0: { transcript: interimText }, isFinal: false, length: 1 },
    ] });
  }
}

describe("useSpeechRecognition", () => {
  let mock: MockRec;
  beforeEach(() => { mock = new MockRec(); (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition = vi.fn(() => mock); });
  afterEach(() => { delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition; delete (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition; });

  it("supported=true when SpeechRecognition exists", () => {
    const { result } = renderHook(() => useSpeechRecognition({ onResult: () => {} }));
    expect(result.current.supported).toBe(true);
  });
  it("start → listening, final 결과는 onResult, interim은 state", () => {
    const onResult = vi.fn();
    const { result } = renderHook(() => useSpeechRecognition({ onResult }));
    act(() => result.current.start());
    expect(result.current.listening).toBe(true);
    expect(mock.lang).toBe("ko-KR");
    act(() => mock.emit("화산은 위험하다", "그리고"));
    expect(onResult).toHaveBeenCalledWith("화산은 위험하다");
    expect(result.current.interim).toBe("그리고");
    act(() => result.current.stop());
    expect(result.current.listening).toBe(false);
  });
  it("supported=false when no SpeechRecognition", () => {
    delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
    const { result } = renderHook(() => useSpeechRecognition({ onResult: () => {} }));
    expect(result.current.supported).toBe(false);
  });
});
```

- [ ] **Step 2: 실패 확인** — `npx vitest run scripts/components/use-speech.test.tsx` → FAIL(모듈 없음).

- [ ] **Step 3: 구현** — `app/lib/use-speech.ts`:
```ts
"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type Ctor = new () => SpeechRecognition;
function getCtor(): Ctor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: Ctor; webkitSpeechRecognition?: Ctor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface UseSpeechRecognition {
  supported: boolean; listening: boolean; interim: string; error: string | null;
  start: () => void; stop: () => void;
}

export function useSpeechRecognition(opts: { lang?: string; onResult: (finalText: string) => void }): UseSpeechRecognition {
  const { lang = "ko-KR", onResult } = opts;
  const [supported] = useState(() => getCtor() !== null);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognition | null>(null);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  const stop = useCallback(() => { recRef.current?.stop(); }, []);

  const start = useCallback(() => {
    const C = getCtor();
    if (!C) { setError("unsupported"); return; }
    setError(null);
    const rec = new C();
    rec.lang = lang; rec.continuous = true; rec.interimResults = true;
    rec.onresult = (e: SpeechRecognitionEvent) => {
      let it = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) { const t = r[0].transcript.trim(); if (t) onResultRef.current(t); }
        else it += r[0].transcript;
      }
      setInterim(it);
    };
    rec.onerror = (e: SpeechRecognitionErrorEvent) => setError(e.error);
    rec.onend = () => { setListening(false); setInterim(""); };
    recRef.current = rec;
    rec.start();
    setListening(true);
  }, [lang]);

  useEffect(() => () => { recRef.current?.stop(); }, []);

  return { supported, listening, interim, error, start, stop };
}
```
(주: `SpeechRecognition`/`SpeechRecognitionEvent`/`SpeechRecognitionErrorEvent`는 lib.dom에 존재. `webkitSpeechRecognition` 전역만 캐스팅으로 접근.)

- [ ] **Step 4: 통과 확인** — `npx vitest run scripts/components/use-speech.test.tsx` 그린. `npm run typecheck` 클린.

- [ ] **Step 5: Commit**
```bash
git add app/lib/use-speech.ts scripts/components/use-speech.test.tsx
git commit -m "$(printf 'feat(coach): useSpeechRecognition — Web Speech 래퍼(ko-KR, interim/final, 지원감지)\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 3: VoicePanel 컴포넌트

**Files:** Create `app/components/coach/VoicePanel.tsx`, `scripts/components/VoicePanel.test.tsx`

**Consumes:** `useSpeechRecognition`(T2). **Produces:** `export default function VoicePanel({ onInsert }: { onInsert: (text: string) => void }): JSX.Element`.

- [ ] **Step 1: 실패 테스트** — `scripts/components/VoicePanel.test.tsx` (vitest). `useSpeechRecognition`을 `vi.mock`으로 대체:
```tsx
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockHook = { supported: true, listening: false, interim: "", error: null as string | null, start: vi.fn(), stop: vi.fn() };
vi.mock("@/app/lib/use-speech", () => ({
  useSpeechRecognition: (opts: { onResult: (t: string) => void }) => { (globalThis as Record<string, unknown>).__voiceOnResult = opts.onResult; return mockHook; },
}));
import VoicePanel from "@/app/components/coach/VoicePanel";

describe("VoicePanel", () => {
  beforeEach(() => { mockHook.supported = true; mockHook.listening = false; mockHook.interim = ""; mockHook.error = null; mockHook.start.mockClear(); mockHook.stop.mockClear(); });

  it("마이크 토글 — 시작 버튼 클릭 시 start 호출", async () => {
    const user = userEvent.setup();
    render(<VoicePanel onInsert={() => {}} />);
    await user.click(screen.getByTestId("voice-mic"));
    expect(mockHook.start).toHaveBeenCalledOnce();
  });
  it("final 전사가 누적되고 '본문에 넣기'가 onInsert(text) 호출", async () => {
    const onInsert = vi.fn();
    const user = userEvent.setup();
    render(<VoicePanel onInsert={onInsert} />);
    // 훅의 onResult 콜백으로 final 줄 주입
    (globalThis as Record<string, () => void> & { __voiceOnResult: (t: string) => void }).__voiceOnResult("화산은 위험하다");
    const insertBtn = await screen.findByTestId("voice-insert-0");
    await user.click(insertBtn);
    expect(onInsert).toHaveBeenCalledWith("화산은 위험하다");
  });
  it("미지원 브라우저 — 안내 + 마이크 버튼 없음", () => {
    mockHook.supported = false;
    render(<VoicePanel onInsert={() => {}} />);
    expect(screen.getByText(/지원하지 않아요/)).toBeInTheDocument();
    expect(screen.queryByTestId("voice-mic")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 실패 확인** — `npx vitest run scripts/components/VoicePanel.test.tsx` → FAIL(모듈 없음).

- [ ] **Step 3: 구현** — `app/components/coach/VoicePanel.tsx`:
```tsx
"use client";
import { useState } from "react";
import { useSpeechRecognition } from "@/app/lib/use-speech";

export default function VoicePanel({ onInsert }: { onInsert: (text: string) => void }) {
  const [lines, setLines] = useState<string[]>([]);
  const { supported, listening, interim, error, start, stop } = useSpeechRecognition({
    onResult: (t) => setLines((prev) => [...prev, t]),
  });

  if (!supported) {
    return (
      <div className="border-border bg-surface text-muted-foreground rounded-lg border p-3 text-sm" role="note">
        이 브라우저는 음성 입력을 지원하지 않아요 — 직접 타이핑하거나 다른 모드를 써 주세요.
      </div>
    );
  }
  return (
    <div className="border-border bg-surface rounded-lg border p-3 text-sm">
      <p className="text-subtle-foreground mb-2 text-xs leading-relaxed">
        음성 인식은 브라우저 기능을 쓰며, 일부 브라우저는 음성을 외부(클라우드)로 보낼 수 있어요. 마이크는 직접 켤 때만 작동해요.
      </p>
      <button type="button" data-testid="voice-mic" aria-pressed={listening}
        onClick={listening ? stop : start}
        className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-semibold">
        {listening ? "■ 멈추기" : "🎤 말하기 시작"}
      </button>
      {listening && interim ? <p data-testid="voice-interim" className="text-subtle-foreground mt-2 italic">{interim}</p> : null}
      {error ? <p role="alert" className="text-destructive mt-2 text-xs">마이크를 쓸 수 없어요 ({error}). 권한을 확인해 주세요.</p> : null}
      {lines.length > 0 && (
        <ul className="mt-3 space-y-2">
          {lines.map((line, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="text-foreground flex-1">{line}</span>
              <button type="button" data-testid={`voice-insert-${i}`} onClick={() => onInsert(line)}
                className="text-primary shrink-0 text-xs font-medium underline underline-offset-2">
                본문에 넣기 →
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 통과 확인** — `npx vitest run scripts/components/VoicePanel.test.tsx` 그린 + `npm run test:components` 전체 그린 + `npm run typecheck` 클린.

- [ ] **Step 5: Commit**
```bash
git add app/components/coach/VoicePanel.tsx scripts/components/VoicePanel.test.tsx
git commit -m "$(printf 'feat(coach): VoicePanel — 마이크 토글·라이브 전사·본문에 넣기\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 4: CoachClient voice 분기 + 삽입 배선 (reducer 무수정)

**Files:** Modify `app/components/coach/CoachClient.tsx` (+ 코치 컴포넌트 테스트가 있으면 갱신)

**Consumes:** `VoicePanel`(T3). 기존 `plainToHtml`(import:30)·`setBodyHtml`(:513)·`assignmentSig`/`saveBodyHtml`(#86)·`dispatch({type:"EDIT"})`.

- [ ] **Step 1: import + 삽입 핸들러** — `CoachClient.tsx` 상단 import에 `import VoicePanel from "./VoicePanel";`. 컴포넌트 본문(예: onChange 핸들러 :807 근처)에 `handleVoiceInsert` 추가:
```tsx
const handleVoiceInsert = (text: string) => {
  const next = state.body ? `${state.body}\n${text}` : text;
  dispatch({ type: "EDIT", body: next });
  const html = plainToHtml(next);
  setBodyHtml(html);
  saveBodyHtml(assignmentSig(assignment), html);
};
```
(에디터 onChange(:807)와 동일한 본문 갱신 3종 — `EDIT` 디스패치 + `setBodyHtml` + `saveBodyHtml(assignmentSig(...))`. 새 액션/case 없음 → reducer 무수정.)

- [ ] **Step 2: voice 분기 렌더** — outline 분기(:822~) 형제로 추가:
```tsx
{mode === "voice" && state.phase === "write" && (
  <div className="px-[18px] pb-2">
    <VoicePanel onInsert={handleVoiceInsert} />
  </div>
)}
```

- [ ] **Step 3: 테스트** — 코치 컴포넌트 테스트 파일(`scripts/components/CoachClient.test.tsx` 존재 시)에 voice 케이스 추가; 없으면 신규 최소 테스트로 `mode==="voice"` 진입 시 VoicePanel(예: `voice-mic`) 렌더 + `handleVoiceInsert` 경로(VoicePanel mock의 onInsert 호출 → body append) 확인. CoachClient는 setup→write 흐름을 타므로, 기존 코치 테스트의 셋업 헬퍼를 재사용(mode="voice"로). VoicePanel은 `vi.mock`으로 가짜화해 onInsert 트리거만 검증해도 됨.

- [ ] **Step 4: 검증 + reducer 무수정 확인** — `npm run typecheck` 클린, `npm run test:components` 그린, `npm run test:unit`(코치 reducer/세션 테스트 무영향) 그린. `git diff app/components/coach/CoachClient.tsx`로 reducer 함수/Action/State/case 영역 **무변경** 확인(추가는 import·handleVoiceInsert·voice 분기 JSX뿐).

- [ ] **Step 5: Commit**
```bash
git add app/components/coach/CoachClient.tsx
git commit -m "$(printf 'feat(coach): voice 분기 + 본문 삽입 배선 (reducer 무수정)\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Task 5: e2e(목 STT) + 최종 검증

**Files:** Modify `e2e/coach.spec.ts`

- [ ] **Step 1: voice e2e (목 SpeechRecognition)** — `e2e/coach.spec.ts`에 voice 시나리오 추가. 페이지 진입 전 `page.addInitScript`로 `window.SpeechRecognition`을 가짜로 주입(start 시 즉시 final 결과 1건 발화):
```ts
test("voice 모드 — 목 STT 전사 → 본문에 넣기", async ({ page }) => {
  await page.addInitScript(() => {
    class FakeRec {
      lang = ""; continuous = false; interimResults = false;
      onresult: ((e: unknown) => void) | null = null; onend: (() => void) | null = null; onerror: unknown = null;
      start() { setTimeout(() => { this.onresult?.({ resultIndex: 0, results: [{ 0: { transcript: "화산은 위험하다" }, isFinal: true, length: 1 }] }); }, 10); }
      stop() { this.onend?.(); }
    }
    (window as unknown as { SpeechRecognition: unknown }).SpeechRecognition = FakeRec;
  });
  // 코치 진입 → 셋업(과제) → 모드선택에서 '말하기'(mode-voice) 선택 → write 진입
  // ...(기존 completeSetup 흐름 재사용, 모드만 voice)
  // 마이크 시작 → 전사 줄 노출 → '본문에 넣기' → 캔버스(#coach-canvas)에 텍스트 반영 확인
  await page.getByTestId("voice-mic").click();
  await expect(page.getByTestId("voice-insert-0")).toBeVisible();
  await page.getByTestId("voice-insert-0").click();
  await expect(page.locator("[data-testid=coach-canvas]")).toContainText("화산은 위험하다");
});
```
(기존 `coach.spec.ts`의 셋업 헬퍼/셀렉터를 읽고 모드 선택만 voice로 바꿔 재사용. mode 선택 단계 셀렉터는 `mode-voice`.)

- [ ] **Step 2: e2e 실행** — `npm run test:e2e -- coach` chromium+webkit 그린(firefox 바이너리 없음은 무시·보고).

- [ ] **Step 3: 최종 검증** — `npm run typecheck` 클린 · `npm run test:all` 그린 · `npm run build` PASS.

- [ ] **Step 4: Commit**
```bash
git add e2e/coach.spec.ts
git commit -m "$(printf 'test(coach): voice 모드 e2e(목 STT) — 전사→본문 삽입\n\nCo-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>')"
```

---

## Self-Review
**Spec coverage:** §1 컴포넌트→T2/T3, ENABLED_MODES→T1, CoachClient 가산→T4. §2 삽입 흐름(onInsert→EDIT+bodyHtml)→T4. §3 프라이버시 고지·미지원 폴백→T3. §4 테스트→각 task+T5. 수용기준 전 항목 매핑.
**Placeholder scan:** 코드 스텝은 실제 코드 포함. T3/T5의 셋업 헬퍼 재사용은 "기존 파일 확인 후 일치"로 명시(구체 셀렉터 `mode-voice`/`voice-mic`/`voice-insert-N`/`coach-canvas` 제공).
**Type consistency:** `useSpeechRecognition`/`UseSpeechRecognition`·`VoicePanel({onInsert})`·`handleVoiceInsert`·data-testid(`voice-mic`/`voice-insert-N`)가 T2→T3→T4→T5에서 일관. 삽입은 기존 EDIT/setBodyHtml/saveBodyHtml(assignmentSig) 재사용.
**Executor 위험:** (a) Web Speech 타입 — lib.dom 존재, webkit 전역만 캐스팅. (b) reducer 무수정 — EDIT만 호출. (c) jsdom에서 SpeechRecognition 목 주입 필수. (d) e2e는 addInitScript로 STT 목.
