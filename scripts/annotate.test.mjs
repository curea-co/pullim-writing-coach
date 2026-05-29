// 인라인 첨삭 매칭 테스트 (P1, 2026-05-27). 순수 모듈을 번들 없이 직접 import.
// 실행: node --import ./scripts/register-ts.mjs --test scripts/annotate.test.mjs
// 회귀 고정: 인용구 추출 / 본문 verbatim 매치 / 겹침·중복 / 매치0 폴백 / 잘못된 span 미생성.

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  computeSegments,
  extractQuotedPhrases,
  extractQuotedPhrasesWithSource,
} from "../app/lib/annotate.ts";

const join = (segs) => segs.map((s) => s.text).join("");
const highlights = (segs) => segs.filter((s) => s.highlight).map((s) => s.text);

test("한글 인용부호 ' '에서 인용구 추출", () => {
  const got = extractQuotedPhrases(["근거가 '자율이 중요하다'는 반복이에요."]);
  assert.deepEqual(got, ["자율이 중요하다"]);
});

test("ASCII '' · 낫표「」도 추출, 중복 제거", () => {
  const got = extractQuotedPhrases(["'가나다' 좋아요", "또 '가나다' 「라마」"]);
  assert.deepEqual(new Set(got), new Set(["가나다", "라마"]));
});

test("비문자열 입력 방어 — 무시", () => {
  assert.deepEqual(extractQuotedPhrases([null, undefined, 42, "'좋다'"]), ["좋다"]);
});

test("2자 미만 인용은 제외", () => {
  assert.deepEqual(extractQuotedPhrases(["'가' 짧음"]), []);
});

test("본문에 인용구가 있으면 하이라이트 세그먼트 생성", () => {
  const body = "나는 자율이 있으면 책임감도 생긴다고 본다.";
  const segs = computeSegments(body, ["자율이 있으면 책임감도 생긴다"]);
  assert.equal(join(segs), body); // 무손실 재조립
  assert.deepEqual(highlights(segs), ["자율이 있으면 책임감도 생긴다"]);
});

test("매치 0건 → plain 단일 세그먼트 (조용한 폴백)", () => {
  const body = "전혀 다른 내용입니다.";
  const segs = computeSegments(body, ["없는 표현"]);
  assert.deepEqual(segs, [{ text: body, highlight: false }]);
});

test("잘못된 span을 만들지 않는다 — 매치 없는 인용구는 무시", () => {
  const body = "가나다라마바사";
  const segs = computeSegments(body, ["없음1", "없음2"]);
  assert.equal(highlights(segs).length, 0);
  assert.equal(join(segs), body);
});

test("여러 인용구 — 각각 첫 매치, 위치순 정렬, 무손실", () => {
  const body = "처음 ABC 중간 XYZ 끝";
  const segs = computeSegments(body, ["XYZ", "ABC"]);
  assert.equal(join(segs), body);
  assert.deepEqual(highlights(segs), ["ABC", "XYZ"]); // 본문 등장 순
});

test("겹치는 인용구 — 긴 것 우선, 짧은 부분문자열은 겹치면 버림", () => {
  const body = "자율이 있으면 책임감도 생긴다";
  const segs = computeSegments(body, ["자율이", "자율이 있으면 책임감도 생긴다"]);
  // 긴 인용구가 전체를 차지 → 짧은 '자율이'는 그 안이라 겹쳐서 별도 하이라이트 안 됨
  assert.deepEqual(highlights(segs), ["자율이 있으면 책임감도 생긴다"]);
});

test("같은 인용구 중복 입력 — 첫 매치 1곳만", () => {
  const body = "AAA 중간 AAA";
  const segs = computeSegments(body, ["AAA", "AAA"]);
  assert.equal(highlights(segs).length, 1);
});

test("빈 본문 → 빈 세그먼트", () => {
  assert.deepEqual(computeSegments("", ["x"]), []);
  assert.deepEqual(computeSegments(null, ["x"]), []);
});

// ── #2 인라인 첨삭 클릭 — phrase별 source area 추적 ─────────────────
test("extractQuotedPhrasesWithSource: 각 phrase에 가장 첫 areaIndex 부여", () => {
  const scores = [
    { feedback_good: "'좋은 표현'이 보여요", feedback_fix: "x" },
    { feedback_good: "y", feedback_fix: "'다음 문장'을 다시 보세요" },
    { feedback_good: "'좋은 표현' 또 등장", feedback_fix: "z" },
  ];
  const result = extractQuotedPhrasesWithSource(scores);
  assert.equal(result.length, 2);
  // 첫 등장한 area가 source — '좋은 표현'은 area 0, '다음 문장'은 area 1
  const map = new Map(result.map((r) => [r.phrase, r.areaIndex]));
  assert.equal(map.get("좋은 표현"), 0);
  assert.equal(map.get("다음 문장"), 1);
});

test("computeSegments: PhraseSource[] 입력 시 segment에 areaIndex 동행", () => {
  const body = "이 글의 좋은 표현은 다음 문장에서 잘 드러난다";
  const segs = computeSegments(body, [
    { phrase: "좋은 표현", areaIndex: 0 },
    { phrase: "다음 문장", areaIndex: 1 },
  ]);
  const highlighted = segs.filter((s) => s.highlight);
  assert.equal(highlighted.length, 2);
  // 본문 순서대로
  assert.equal(highlighted[0].text, "좋은 표현");
  assert.equal(highlighted[0].areaIndex, 0);
  assert.equal(highlighted[1].text, "다음 문장");
  assert.equal(highlighted[1].areaIndex, 1);
});

test("computeSegments: string[] (기존) 입력은 areaIndex 없이 동작 — 하위호환", () => {
  const body = "가나다라마바사";
  const segs = computeSegments(body, ["가나다"]);
  const h = segs.find((s) => s.highlight);
  assert.equal(h.text, "가나다");
  assert.equal(h.areaIndex, undefined);
});
