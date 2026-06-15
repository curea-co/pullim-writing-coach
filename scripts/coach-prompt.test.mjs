// 과정 코치 프롬프트 단일 소스 테스트 (EPIC2 T2.1). 순수 모듈을 번들 없이 직접 import.
// 실행: node --import ./scripts/register-ts.mjs --test scripts/coach-prompt.test.mjs
// 회귀 고정: 생성 차단 문구 포함 / 5영역 전부 포함·순서 / CoachOutput JSON 스키마 언급 /
//   buildCoachPrompt가 과제·문단·톤·P-번호를 주입 / 순수성(외부 부수효과 import 없음).

import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import {
  COACH_SYSTEM_PROMPT,
  COACH_PROMPT_VERSION,
  buildCoachPrompt,
} from "../app/lib/coach-prompt.ts";
import { AREAS } from "../app/lib/grading.ts";
import { getCoachProfile } from "../app/lib/coach-profile.ts";
import { splitParagraphs } from "../app/lib/paragraphs.ts";

// ── 시스템 프롬프트: 생성 차단(대필 금지) 문구 ──
test("시스템 프롬프트에 생성 차단(GENERATION BLOCK) 지시가 있다", () => {
  assert.ok(COACH_SYSTEM_PROMPT.includes("GENERATION BLOCK"));
  assert.ok(COACH_SYSTEM_PROMPT.includes("학생 문장을 대신 쓰지 않는다"));
});

test("시스템 프롬프트가 완성 문장·예시 문장 제공을 명시적으로 금지한다", () => {
  assert.ok(COACH_SYSTEM_PROMPT.includes("완성 문장"));
  assert.ok(COACH_SYSTEM_PROMPT.includes("예시 문장"));
  // 대표 금지 어법 중 하나 이상이 명시되어 있어야 한다.
  assert.ok(
    COACH_SYSTEM_PROMPT.includes("이렇게 써") &&
      COACH_SYSTEM_PROMPT.includes("다음과 같이 작성"),
  );
});

test("시스템 프롬프트에 대필 금지 few-shot(좋은 예/나쁜 예)이 있다", () => {
  assert.ok(COACH_SYSTEM_PROMPT.includes("좋은 예"));
  assert.ok(COACH_SYSTEM_PROMPT.includes("나쁜 예"));
});

// ── 시스템 프롬프트: 5영역 전부 + 5단계 철학 ──
test("시스템 프롬프트에 5영역이 모두 포함되어 있다", () => {
  for (const area of AREAS) {
    assert.ok(COACH_SYSTEM_PROMPT.includes(area), `누락된 영역: ${area}`);
  }
});

test("시스템 프롬프트에 5단계 코칭 철학 키워드가 있다", () => {
  for (const kw of ["과제·루브릭 해독", "소크라테스", "문단 발판", "고쳐쓰기", "성찰"]) {
    assert.ok(COACH_SYSTEM_PROMPT.includes(kw), `누락된 단계: ${kw}`);
  }
});

// ── 시스템 프롬프트: CoachOutput JSON 스키마 언급 ──
test("시스템 프롬프트가 CoachOutput JSON 스키마(area_scores·nudges 필드)를 언급한다", () => {
  assert.ok(COACH_SYSTEM_PROMPT.includes("area_scores"));
  assert.ok(COACH_SYSTEM_PROMPT.includes("nudges"));
  assert.ok(COACH_SYSTEM_PROMPT.includes("paragraph_index"));
  assert.ok(COACH_SYSTEM_PROMPT.includes("rubric_area"));
  assert.ok(COACH_SYSTEM_PROMPT.includes("diagnosis"));
  assert.ok(COACH_SYSTEM_PROMPT.includes("guiding_question"));
  assert.ok(COACH_SYSTEM_PROMPT.includes("quick_win_rank"));
});

test("시스템 프롬프트가 JSON만 출력하고 다른 텍스트는 금지한다고 지시한다", () => {
  assert.ok(COACH_SYSTEM_PROMPT.includes("JSON"));
  assert.ok(/금지/.test(COACH_SYSTEM_PROMPT));
});

test("COACH_PROMPT_VERSION이 비어있지 않은 문자열이다", () => {
  assert.equal(typeof COACH_PROMPT_VERSION, "string");
  assert.ok(COACH_PROMPT_VERSION.length > 0);
});

// ── buildCoachPrompt: 입력 주입 ──
const sampleAssignment = () => ({
  school_level: "중2",
  subject: "국어",
  genre: "논설문·주장하는 글",
  target_char_count: 500,
  prompt_text: "환경 보호가 왜 중요한지 자신의 경험을 들어 주장하는 글을 쓰세요.",
});

const sampleDraft = "환경 보호는 중요하다.\n\n우리는 노력해야 한다. 그래서 좋다.";

test("buildCoachPrompt가 과제 정보(과제문·학년·장르)를 주입한다", () => {
  const draft = sampleDraft;
  const prompt = buildCoachPrompt({
    assignment: sampleAssignment(),
    draft,
    paragraphs: splitParagraphs(draft),
    profile: getCoachProfile("middle_high"),
  });
  assert.ok(prompt.includes("환경 보호가 왜 중요한지"));
  assert.ok(prompt.includes("중2"));
  assert.ok(prompt.includes("논설문·주장하는 글"));
});

test("buildCoachPrompt가 문단을 P-번호로 분해해 넣는다", () => {
  const draft = sampleDraft;
  const prompt = buildCoachPrompt({
    assignment: sampleAssignment(),
    draft,
    paragraphs: splitParagraphs(draft),
    profile: getCoachProfile("middle_high"),
  });
  assert.ok(prompt.includes("[P0]"));
  assert.ok(prompt.includes("[P1]"));
});

test("buildCoachPrompt가 프로필 톤 지시(연령 분기)를 주입한다", () => {
  const draft = sampleDraft;
  const mh = buildCoachPrompt({
    assignment: sampleAssignment(),
    draft,
    paragraphs: splitParagraphs(draft),
    profile: getCoachProfile("middle_high"),
  });
  const jr = buildCoachPrompt({
    assignment: { ...sampleAssignment(), school_level: "초5" },
    draft,
    paragraphs: splitParagraphs(draft),
    profile: getCoachProfile("junior"),
  });
  assert.ok(mh.includes(getCoachProfile("middle_high").toneDirective));
  assert.ok(jr.includes(getCoachProfile("junior").toneDirective));
  // 주니어는 마스코트 푸리 말투 표기가 추가된다.
  assert.ok(jr.includes("푸리"));
});

test("buildCoachPrompt가 추가 루브릭 텍스트를 넣는다(있을 때만)", () => {
  const draft = sampleDraft;
  const withRubric = buildCoachPrompt({
    assignment: sampleAssignment(),
    rubricText: "반론을 한 번 이상 고려할 것.",
    draft,
    paragraphs: splitParagraphs(draft),
    profile: getCoachProfile("middle_high"),
  });
  assert.ok(withRubric.includes("반론을 한 번 이상 고려할 것."));

  const without = buildCoachPrompt({
    assignment: sampleAssignment(),
    draft,
    paragraphs: splitParagraphs(draft),
    profile: getCoachProfile("middle_high"),
  });
  assert.ok(!without.includes("교사/과제 추가 루브릭"));
});

test("buildCoachPrompt가 문단 0개여도 안전하게 안내 문구를 넣는다", () => {
  const prompt = buildCoachPrompt({
    assignment: sampleAssignment(),
    draft: "",
    paragraphs: splitParagraphs(""),
    profile: getCoachProfile("middle_high"),
  });
  assert.ok(prompt.includes("막 시작"));
});

// ── 순수성: 부수효과 import 금지 (소스 텍스트 검사) ──
test("coach-prompt.ts는 부수효과 모듈을 import하지 않는다(순수)", () => {
  const src = readFileSync(new URL("../app/lib/coach-prompt.ts", import.meta.url), "utf8");
  // 주석(모듈 경계 설명)에는 모듈명이 등장하므로, 실제 import 문(from "...")만 검사한다.
  const imports = [...src.matchAll(/^\s*import[^\n]*\sfrom\s+["']([^"']+)["']/gm)].map((m) => m[1]);
  assert.ok(!imports.some((p) => p === "@anthropic-ai/sdk"));
  assert.ok(!imports.some((p) => p === "server-only"));
  assert.ok(!imports.some((p) => p.startsWith("next/") || p === "next"));
  // fetch는 import가 아닌 전역 호출 — 코드에 직접 호출이 없어야 한다.
  assert.ok(!/\bfetch\s*\(/.test(src));
});
