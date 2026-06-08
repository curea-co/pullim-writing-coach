// extract — 안내서 추출 순수 모듈 단위 테스트 (Phase 1 PR A).
// 실행: node --import ./scripts/register-ts.mjs --test scripts/extract.test.mjs

import assert from "node:assert/strict";
import { test } from "node:test";

const {
  RAW_MIN,
  RAW_MAX,
  buildExtractUserPrompt,
  validateExtractRequest,
  validateExtractOutput,
  finalizeExtraction,
  EXTRACT_SYSTEM_PROMPT,
} = await import("../app/lib/extract.ts");

// ─── EXTRACT_SYSTEM_PROMPT 회귀 고정 ────────────────────────────────
test("EXTRACT_SYSTEM_PROMPT — 5개 추출 항목 + confidence 정책 + JSON 스키마 포함", () => {
  assert.match(EXTRACT_SYSTEM_PROMPT, /prompt_text/);
  assert.match(EXTRACT_SYSTEM_PROMPT, /genre/);
  assert.match(EXTRACT_SYSTEM_PROMPT, /target_char_count/);
  assert.match(EXTRACT_SYSTEM_PROMPT, /conditions/);
  assert.match(EXTRACT_SYSTEM_PROMPT, /teacher_rubric_present/);
  assert.match(EXTRACT_SYSTEM_PROMPT, /confirmed/);
  assert.match(EXTRACT_SYSTEM_PROMPT, /inferred/);
  // 코드펜스 금지 명시 (모델이 ```json 으로 감싸지 못하게).
  assert.match(EXTRACT_SYSTEM_PROMPT, /코드펜스 금지/);
});

// ─── buildExtractUserPrompt ────────────────────────────────────────
test("buildExtractUserPrompt — channel 없으면 입력 경로 생략", () => {
  const out = buildExtractUserPrompt("선생님이 준 안내서 본문");
  assert.match(out, /선생님이 준 안내서 본문/);
  assert.doesNotMatch(out, /입력 경로:/);
});

test("buildExtractUserPrompt — channel 있으면 입력 경로 첫줄에 포함", () => {
  const out = buildExtractUserPrompt("본문", "file");
  assert.match(out, /^입력 경로: file/);
});

// ─── validateExtractRequest ─────────────────────────────────────────
test("validateExtractRequest — 정상 입력 통과", () => {
  const r = validateExtractRequest({ raw_text: "수행평가 안내서 본문입니다.", channel: "type" });
  assert.equal(r.ok, true);
  assert.equal(r.value.raw_text, "수행평가 안내서 본문입니다.");
  assert.equal(r.value.channel, "type");
});

test("validateExtractRequest — 객체 아님 → E1", () => {
  assert.deepEqual(validateExtractRequest("string").code, "E1");
  assert.deepEqual(validateExtractRequest(null).code, "E1");
  assert.deepEqual(validateExtractRequest([1, 2]).code, "E1");
});

test("validateExtractRequest — raw_text 누락 → E1", () => {
  const r = validateExtractRequest({ channel: "file" });
  assert.equal(r.ok, false);
  assert.equal(r.code, "E1");
});

test(`validateExtractRequest — RAW_MIN(${RAW_MIN}) 미만 → E2`, () => {
  const tooShort = "1".repeat(RAW_MIN - 1);
  const r = validateExtractRequest({ raw_text: tooShort });
  assert.equal(r.ok, false);
  assert.equal(r.code, "E2");
});

test(`validateExtractRequest — RAW_MAX(${RAW_MAX}) 초과 → E3`, () => {
  const tooLong = "안".repeat(RAW_MAX + 1);
  const r = validateExtractRequest({ raw_text: tooLong });
  assert.equal(r.ok, false);
  assert.equal(r.code, "E3");
});

test("validateExtractRequest — trim 후 길이 평가 (공백만 → E2)", () => {
  const r = validateExtractRequest({ raw_text: "   \n\t  " });
  assert.equal(r.ok, false);
  assert.equal(r.code, "E2");
});

test("validateExtractRequest — channel이 string 아니면 undefined 처리", () => {
  const r = validateExtractRequest({ raw_text: "안내서 내용 적당히", channel: 123 });
  assert.equal(r.ok, true);
  assert.equal(r.value.channel, undefined);
});

// ─── validateExtractOutput ──────────────────────────────────────────
const VALID_OUTPUT = {
  prompt_text: { value: "교복 자율화에 대한 본인 생각을 논설문으로 쓰시오.", confidence: "confirmed" },
  genre: { value: "논설문·주장하는 글", confidence: "confirmed" },
  target_char_count: { value: 800, confidence: "confirmed" },
  conditions: ["근거 2개 이상", "개요 포함"],
  teacher_rubric_present: true,
};

test("validateExtractOutput — 정상 출력은 빈 배열 (errs 0)", () => {
  assert.deepEqual(validateExtractOutput(VALID_OUTPUT), []);
});

test("validateExtractOutput — 객체 아님 → 단일 에러", () => {
  assert.deepEqual(validateExtractOutput("not an object"), ["출력이 객체가 아님"]);
  assert.deepEqual(validateExtractOutput(null), ["출력이 객체가 아님"]);
});

test("validateExtractOutput — prompt_text confidence 누락 → 에러", () => {
  const broken = { ...VALID_OUTPUT, prompt_text: { value: "x" } };
  const errs = validateExtractOutput(broken);
  assert.ok(errs.includes("prompt_text 형식 오류"));
});

test("validateExtractOutput — target_char_count value가 string이면 에러", () => {
  const broken = {
    ...VALID_OUTPUT,
    target_char_count: { value: "800", confidence: "confirmed" },
  };
  const errs = validateExtractOutput(broken);
  assert.ok(errs.includes("target_char_count 형식 오류"));
});

test("validateExtractOutput — target_char_count value=null + confidence 있으면 통과", () => {
  const ok = {
    ...VALID_OUTPUT,
    target_char_count: { value: null, confidence: "inferred" },
  };
  assert.deepEqual(validateExtractOutput(ok), []);
});

test("validateExtractOutput — conditions에 비문자열 섞이면 에러", () => {
  const broken = { ...VALID_OUTPUT, conditions: ["ok", 123, "fine"] };
  const errs = validateExtractOutput(broken);
  assert.ok(errs.includes("conditions 형식 오류"));
});

test("validateExtractOutput — teacher_rubric_present 누락 → 에러", () => {
  const { teacher_rubric_present: _, ...broken } = VALID_OUTPUT;
  const errs = validateExtractOutput(broken);
  assert.ok(errs.includes("teacher_rubric_present 형식 오류"));
});

// ─── finalizeExtraction ─────────────────────────────────────────────
test("finalizeExtraction — 정상: 모든 필드 보존, 타이핑 채널은 raw_excerpt 미포함", () => {
  const out = finalizeExtraction(VALID_OUTPUT, "선생님 안내서 원문 본문 내용", "type");
  assert.equal(out.prompt_text.value, VALID_OUTPUT.prompt_text.value);
  assert.equal(out.prompt_text.confidence, "confirmed");
  assert.equal(out.genre.value, "논설문·주장하는 글");
  assert.equal(out.target_char_count.value, 800);
  assert.equal(out.target_char_count.confidence, "confirmed");
  assert.equal(out.target_char_count.requested, undefined);
  assert.deepEqual(out.conditions, ["근거 2개 이상", "개요 포함"]);
  assert.equal(out.teacher_rubric_present, true);
  assert.equal(out.raw_excerpt, undefined, "type 채널은 미리보기 미포함");
});

test("finalizeExtraction — file 채널은 raw_excerpt 400자까지 포함", () => {
  const rawText = "x".repeat(500);
  const out = finalizeExtraction(VALID_OUTPUT, rawText, "file");
  assert.equal(out.raw_excerpt.length, 400);
});

test("finalizeExtraction — 분량 5000 (TARGET_MAX 초과) → 2000으로 캡 + requested에 원본 보존", () => {
  const input = { ...VALID_OUTPUT, target_char_count: { value: 5000, confidence: "confirmed" } };
  const out = finalizeExtraction(input, "본문", "type");
  assert.equal(out.target_char_count.value, 2000, "2000으로 캡");
  assert.equal(out.target_char_count.requested, 5000, "원본 5000 requested에 보존");
});

test("finalizeExtraction — 분량 5(오인식, ≤9) → null + confidence inferred로 강등", () => {
  const input = { ...VALID_OUTPUT, target_char_count: { value: 5, confidence: "confirmed" } };
  const out = finalizeExtraction(input, "본문", "type");
  assert.equal(out.target_char_count.value, null);
  assert.equal(out.target_char_count.confidence, "inferred", "오인식은 신뢰도 강등");
});

test("finalizeExtraction — 장르가 enum 외 → '기타'로 정규화 + confidence inferred", () => {
  const input = { ...VALID_OUTPUT, genre: { value: "랩 가사", confidence: "confirmed" } };
  const out = finalizeExtraction(input, "본문", "type");
  assert.equal(out.genre.value, "기타");
  assert.equal(out.genre.confidence, "inferred");
});

test("finalizeExtraction — conditions 중복·공백 dedup + 6건 cap", () => {
  const input = {
    ...VALID_OUTPUT,
    conditions: [
      " 근거 2개 ",
      "근거 2개", // 중복 (trim 후)
      "개요 포함",
      "출처 표기",
      "서론 본론 결론",
      "구체적 사례",
      "맞춤법",
      "분량 준수", // 7번째 — drop
    ],
  };
  const out = finalizeExtraction(input, "본문", "type");
  assert.equal(out.conditions.length, 6);
  assert.equal(out.conditions[0], "근거 2개", "trim 적용 + 중복 제거");
});
