// 실행: node --import ./scripts/register-ts.mjs --test scripts/editor-doc.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { htmlToPlain, plainToHtml } from "../app/lib/editor-doc.ts";

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

// plainToHtml 테스트
test("plainToHtml: 빈 입력 → <p></p>", () => {
  assert.equal(plainToHtml(""), "<p></p>");
});
test("plainToHtml: 단일 줄", () => {
  assert.equal(plainToHtml("안녕"), "<p>안녕</p>");
});
test("plainToHtml: 여러 줄 → 여러 <p>", () => {
  assert.equal(plainToHtml("가\n나"), "<p>가</p><p>나</p>");
});
test("plainToHtml: HTML 특수문자 이스케이프", () => {
  assert.equal(plainToHtml("<태그> & 기호"), "<p>&lt;태그&gt; &amp; 기호</p>");
});

test("빈 문단 앞 선행 블록 보존", () => {
  assert.equal(htmlToPlain("<p></p><p>a</p>"), "\na");
});
test("빈 문단 뒤 후행 블록 보존", () => {
  assert.equal(htmlToPlain("<p>a</p><p></p>"), "a\n");
});
test("a·b 두 문단 조인", () => {
  assert.equal(htmlToPlain("<p>a</p><p>b</p>"), "a\nb");
});

// 라운드트립 테스트
test("roundtrip: htmlToPlain(plainToHtml(...))", () => {
  assert.equal(htmlToPlain(plainToHtml("가\n나")), "가\n나");
});
test("roundtrip: 오탈자·띄어쓰기 보존", () => {
  const original = "화산은  위험하다 됬다";
  assert.equal(htmlToPlain(plainToHtml(original)), original);
});
test("roundtrip: 선행 개행 보존 (\\na)", () => {
  assert.equal(htmlToPlain(plainToHtml("\na")), "\na");
});
test("roundtrip: 후행 개행 보존 (a\\n)", () => {
  assert.equal(htmlToPlain(plainToHtml("a\n")), "a\n");
});
test("roundtrip: 내부 빈 줄 보존 (a\\n\\nb)", () => {
  assert.equal(htmlToPlain(plainToHtml("a\n\nb")), "a\n\nb");
});
test("roundtrip: 빈 문자열", () => {
  assert.equal(htmlToPlain(plainToHtml("")), "");
});
