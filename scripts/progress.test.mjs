// #10 글자수 진척 인디케이터 — computeProgress / 클래스 매핑 단위 테스트.
// 실행: node --import ./scripts/register-ts.mjs --test scripts/progress.test.mjs

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  computeProgress,
  getProgressBarClass,
  getProgressTextClass,
} from "../app/lib/progress.ts";

const BODY_MAX = 2000;

test("target 미입력(null/0) → null 반환 — 인디케이터 비노출", () => {
  assert.equal(computeProgress(500, null, BODY_MAX), null);
  assert.equal(computeProgress(500, 0, BODY_MAX), null);
});

test("warmup (< 50%) — 시작 단계", () => {
  const r = computeProgress(100, 600, BODY_MAX);
  assert.ok(r);
  assert.equal(r.band, "warmup");
  assert.equal(r.rawPct, 16.7);
  assert.equal(r.pct, 16.7);
  assert.match(r.label, /시작 단계/);
});

test("approaching (50~89%) — 거의 다 왔어요", () => {
  const r = computeProgress(420, 600, BODY_MAX); // 70%
  assert.ok(r);
  assert.equal(r.band, "approaching");
  assert.equal(r.rawPct, 70);
  assert.match(r.label, /거의 다 왔어요/);
});

test("bullseye (90~110%) — 딱 좋은 분량", () => {
  // 경계: 정확히 90%
  let r = computeProgress(540, 600, BODY_MAX);
  assert.equal(r.band, "bullseye");
  // 정확히 100%
  r = computeProgress(600, 600, BODY_MAX);
  assert.equal(r.band, "bullseye");
  assert.equal(r.rawPct, 100);
  // 정확히 110%
  r = computeProgress(660, 600, BODY_MAX);
  assert.equal(r.band, "bullseye");
  assert.match(r.label, /딱 좋은 분량/);
});

test("over (111~130%) — 조금 길어요", () => {
  const r = computeProgress(720, 600, BODY_MAX); // 120%
  assert.ok(r);
  assert.equal(r.band, "over");
  assert.equal(r.pct, 100); // 시각 바는 100% 캡
  assert.equal(r.rawPct, 120);
  assert.match(r.label, /조금 길어요/);
});

test("way-over (>130%) — 줄여 보세요", () => {
  const r = computeProgress(900, 600, BODY_MAX); // 150%
  assert.ok(r);
  assert.equal(r.band, "way-over");
  assert.match(r.label, /줄여/);
});

test("BODY_MAX 하드 캡 — target 비율 무관하게 way-over로 강제", () => {
  // target 5000(과도) + current 2000 = 40%지만 BODY_MAX 도달이라 way-over
  const r = computeProgress(2000, 5000, BODY_MAX);
  assert.ok(r);
  assert.equal(r.band, "way-over");
  assert.match(r.label, /2000자까지만/);
});

test("BODY_MAX 직전(1999/2000) — way-over 아님(BODY_MAX 미도달)", () => {
  const r = computeProgress(1999, 1000, BODY_MAX);
  // 200%라 way-over지만, BODY_MAX 카피 아니라 일반 way-over("줄여")
  assert.equal(r.band, "way-over");
  assert.match(r.label, /줄여/);
  // BODY_MAX 카피는 아님
  assert.equal(/2000자까지만/.test(r.label), false);
});

test("getProgressBarClass — 5밴드 모두 Tailwind 정적 클래스 반환", () => {
  assert.match(getProgressBarClass("warmup"), /bg-muted-foreground/);
  assert.match(getProgressBarClass("approaching"), /bg-band-normal/);
  assert.match(getProgressBarClass("bullseye"), /bg-band-good/);
  assert.match(getProgressBarClass("over"), /bg-band-warn/);
  assert.match(getProgressBarClass("way-over"), /bg-band-warn/);
});

test("getProgressTextClass — 5밴드 모두 시맨틱 토큰 반환", () => {
  assert.match(getProgressTextClass("warmup"), /text-subtle-foreground/);
  assert.match(getProgressTextClass("approaching"), /text-band-normal-foreground/);
  assert.match(getProgressTextClass("bullseye"), /text-band-good-foreground/);
  assert.match(getProgressTextClass("over"), /text-band-warn-foreground/);
  assert.match(getProgressTextClass("way-over"), /text-band-warn-foreground/);
});
