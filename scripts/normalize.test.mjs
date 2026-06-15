// normalizeBody 픽스처 테스트 (WBS P2.3 / 12 §10 인수기준 #4)
// 실행: node --test scripts/normalize.test.mjs
// 회귀 고정 대상: (하략) 제거 / <중략> 자연 연결 / 단어중간 줄바꿈→공백·\n\n 보존 / E2·E11 게이트.
// 순수 모듈을 번들 없이 직접 import (Node 24 네이티브 TS strip).

import assert from "node:assert/strict";
import { test } from "node:test";
import {
  charCount,
  finalizeOutput,
  normalizeBody,
  validateOutput,
  validateRequest,
} from "../app/lib/grading.ts";

// ── §3.3 row 1: 괄호형 부분발췌 (하략)·(중략)·(전략)·(이하 생략) → 제거 ──
test("(하략) 표기 + 인접 공백 제거", () => {
  assert.equal(
    normalizeBody("나는 자율이 필요하다고 생각한다. (하략)"),
    "나는 자율이 필요하다고 생각한다.",
  );
});

test("문장 중간 (중략) 제거 (꺾쇠 아닌 괄호형은 단순 제거)", () => {
  // 괄호형 (중략)은 자연연결이 아니라 제거 — 인접 공백도 함께.
  assert.equal(normalizeBody("앞 문장이다. (중략) 뒤 문장이다."), "앞 문장이다. 뒤 문장이다.");
});

test("(이하 생략) / (전략) 제거", () => {
  assert.equal(normalizeBody("(전략) 본론부터 시작한다. (이하 생략)"), "본론부터 시작한다.");
});

// ── §3.3 row 2: <중략>·<생략>·[중략]·…(중략)… → 자연 연결 ──
test("<중략> 자연 연결 — 앞 종결부 마침표 보강 + 공백 1칸", () => {
  assert.equal(normalizeBody("첫 문단입니다<중략>다음 문단입니다"), "첫 문단입니다. 다음 문단입니다");
});

test("<중략> — 앞이 이미 마침표면 공백 1칸만", () => {
  assert.equal(normalizeBody("첫 문단입니다.<중략>다음 문단입니다"), "첫 문단입니다. 다음 문단입니다");
});

test("[중략] 대괄호형도 자연 연결", () => {
  assert.equal(normalizeBody("앞부분 내용 [중략] 뒷부분 내용"), "앞부분 내용. 뒷부분 내용");
});

test("…(중략)… 생략부호 감싼 괄호형은 자연 연결", () => {
  assert.equal(normalizeBody("주장을 폈다…(중략)…결론을 맺는다"), "주장을 폈다. 결론을 맺는다");
});

test("...(중략)... ASCII 점3개 감싼 형도 자연 연결 (EPO 2026-05-26 dot-ellipsis 룰)", () => {
  assert.equal(normalizeBody("앞문장입니다...(중략)...뒷문장입니다"), "앞문장입니다. 뒷문장입니다");
});

test("…(중략)... 혼합(앞 …, 뒤 ...)도 자연 연결", () => {
  assert.equal(normalizeBody("앞문장입니다…(중략)...뒷문장입니다"), "앞문장입니다. 뒷문장입니다");
});

test("dot-ellipsis가 양쪽을 감쌀 때만 — 한쪽만 점이면 (중략)은 단순 제거", () => {
  // 앞에만 점(학생의 말줄임), (중략)에 뒤 점 없음 → 연결 아님, (중략)만 제거되고 앞 점은 보존
  assert.equal(normalizeBody("앞문장... (중략) 뒷문장"), "앞문장... 뒷문장");
});

test("<중략>가 줄바꿈에 걸쳐 있어도 자연 연결", () => {
  assert.equal(normalizeBody("첫 문단입니다\n<중략>\n다음 문단입니다"), "첫 문단입니다. 다음 문단입니다");
});

// ── §3.3 row 3: 단어 중간 줄바꿈 → 공백, 단 빈 줄(\n\n)은 문단으로 보존 ──
test("단어 중간 줄바꿈은 공백 1칸으로", () => {
  assert.equal(normalizeBody("자율에 관\n한 생각"), "자율에 관 한 생각");
});

test("여러 줄의 단일 줄바꿈은 모두 공백으로", () => {
  assert.equal(normalizeBody("한\n두\n세 줄"), "한 두 세 줄");
});

test("빈 줄(\\n\\n)은 문단 구분으로 보존", () => {
  assert.equal(normalizeBody("첫 문단\n\n둘째 문단"), "첫 문단\n\n둘째 문단");
});

test("문단 구분은 보존하고 그 안의 줄바꿈만 공백 (혼합)", () => {
  assert.equal(
    normalizeBody("첫 문단의\n이어진 줄\n\n둘째 문단의\n이어진 줄"),
    "첫 문단의 이어진 줄\n\n둘째 문단의 이어진 줄",
  );
});

test("빈 줄 3개 이상도 단일 문단 구분으로 축약", () => {
  assert.equal(normalizeBody("첫 문단\n\n\n\n둘째 문단"), "첫 문단\n\n둘째 문단");
});

// ── §3.3 row 4·5: trim / 연속 공백 3+ 축소 ──
test("앞뒤 공백·탭 trim", () => {
  assert.equal(normalizeBody("   가운데 글자 본문이다   "), "가운데 글자 본문이다");
});

test("연속 공백 3개 이상 → 1개", () => {
  assert.equal(normalizeBody("단어     사이     공백"), "단어 사이 공백");
});

// ── §3.3 row 6: 학생 mechanics 오류는 보존 (채점 대상) ──
test("맞춤법·오탈자·비문은 보존한다", () => {
  const raw = "시계가 작동하는 순서는 먼저 태엽이 감고 가김기 태엽이 풀리는 것으로 시작된다.";
  assert.equal(normalizeBody(raw), raw); // '가김기' 등 오탈자 변경 없음
});

// ── 멱등성: 정규화 결과를 다시 정규화해도 동일 ──
test("정규화는 멱등이다", () => {
  const inputs = [
    "첫 문단입니다<중략>다음 문단입니다",
    "자율에 관\n한 생각이 있다. (하략)",
    "첫 문단\n\n둘째 문단",
  ];
  for (const raw of inputs) {
    const once = normalizeBody(raw);
    assert.equal(normalizeBody(once), once, `멱등 실패: ${JSON.stringify(raw)}`);
  }
});

// ── 비문자열 입력 방어 ──
test("비문자열 입력은 빈 문자열", () => {
  assert.equal(normalizeBody(null), "");
  assert.equal(normalizeBody(undefined), "");
  assert.equal(normalizeBody(123), "");
});

// ════════════════════════════════════════════════════════════════════
// validateRequest — E2 / E11 / E3 / E10 / E1 게이트 (12 §3.2·§5.2)
// ════════════════════════════════════════════════════════════════════
const okAssignment = {
  school_level: "중2",
  subject: "국어",
  genre: "논설문·주장하는 글",
  target_char_count: 800,
  prompt_text: "교복 자율화에 대한 자신의 주장을 근거 2개 이상으로 쓰시오.",
};
const longBody =
  "교복 자율화는 학생의 표현의 자유를 넓힌다. 첫째, 학생은 자기 개성을 옷으로 드러낼 수 있다. 둘째, 계절과 활동에 맞춰 편한 옷을 고를 수 있어 학습 효율이 오른다. 그러므로 나는 교복 자율화에 찬성한다.";

test("정상 입력 → ok, 서버가 char_count 재산출", () => {
  const r = validateRequest({ assignment: okAssignment, submission: { body: longBody } });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.value.submission.char_count, charCount(normalizeBody(longBody)));
    assert.equal(r.value.assignment.target_char_count, 800);
  }
});

test("E2 — 원본부터 50자 미만", () => {
  const r = validateRequest({ assignment: okAssignment, submission: { body: "너무 짧은 글." } });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.code, "E2");
});

test("E11 — 원본은 충분하나 정규화 후 50자 미만 (거의 표기뿐)", () => {
  // 원본(trim)은 50자 이상이지만 표기 제거 후 본문이 거의 안 남는 케이스 → E11.
  const body = `짧은 도입. ${"(중략) ".repeat(15)}`;
  assert.ok(charCount(body.trim()) >= 50, "픽스처 전제: 원본 ≥ 50자");
  assert.ok(charCount(normalizeBody(body)) < 50, "픽스처 전제: 정규화 후 < 50자");
  const r = validateRequest({ assignment: okAssignment, submission: { body } });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.code, "E11");
});

test("E3 — 정규화 후 2,000자 초과", () => {
  const body = "가".repeat(2001);
  const r = validateRequest({ assignment: okAssignment, submission: { body } });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.code, "E3");
});

test("E10 — target_char_count 범위 밖", () => {
  const r = validateRequest({
    assignment: { ...okAssignment, target_char_count: 49 },
    submission: { body: longBody },
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.code, "E10");
});

test("target_char_count null 허용", () => {
  const r = validateRequest({
    assignment: { ...okAssignment, target_char_count: null },
    submission: { body: longBody },
  });
  assert.equal(r.ok, true);
});

test("E1 — enum 위반(잘못된 장르)", () => {
  const r = validateRequest({
    assignment: { ...okAssignment, genre: "소설" },
    submission: { body: longBody },
  });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.code, "E1");
});

test("E1 — 필수 필드 누락(assignment 없음)", () => {
  const r = validateRequest({ submission: { body: longBody } });
  assert.equal(r.ok, false);
  if (!r.ok) assert.equal(r.code, "E1");
});

// ════════════════════════════════════════════════════════════════════
// validateOutput — 스키마 검증 (12 §4.3) : 깨진 출력은 502로 가야 함
// ════════════════════════════════════════════════════════════════════
function goodOutput() {
  const areas = ["과제 이해", "내용 충실도", "구조·논리", "표현·문장", "성장 가능성"];
  const scores = areas.map((area) => ({
    area,
    score: 14,
    max: 20,
    feedback_good: "좋은 점이 있어요.",
    feedback_fix: "이렇게 고쳐 보세요.",
  }));
  return {
    total_score: 70,
    scores,
    revision_guides: [{ priority: 1, action: "결론을 보강하세요.", reason: "글이 닫히지 않아요." }],
    meta: {},
  };
}

test("정상 출력 → 위반 0", () => {
  assert.equal(validateOutput(goodOutput()).length, 0);
});

test("total≠합 → 위반 검출", () => {
  const o = goodOutput();
  o.total_score = 99;
  assert.ok(validateOutput(o).some((e) => e.includes("total≠합")));
});

test("area 순서 오류 → 위반 검출", () => {
  const o = goodOutput();
  o.scores[0].area = "표현·문장";
  assert.ok(validateOutput(o).some((e) => e.includes("area 순서")));
});

test("feedback 빈값(E6 성격) → 위반 검출", () => {
  const o = goodOutput();
  o.scores[2].feedback_fix = "  ";
  assert.ok(validateOutput(o).some((e) => e.includes("feedback_fix 빈값")));
});

test("revision_guides priority 역순 → 위반 검출", () => {
  const o = goodOutput();
  o.revision_guides = [
    { priority: 2, action: "a", reason: "b" },
    { priority: 1, action: "c", reason: "d" },
  ];
  assert.ok(validateOutput(o).some((e) => e.includes("priority")));
});

test("revision_guides priority 범위 밖(5) → 위반 검출 (검수 fix)", () => {
  const o = goodOutput();
  o.revision_guides = [{ priority: 5, action: "a", reason: "b" }];
  assert.ok(validateOutput(o).some((e) => e.includes("priority")));
});

// ════════════════════════════════════════════════════════════════════
// finalizeOutput — 서버가 max=20 보장 + score 5필드 정규화 (검수 fix)
// ════════════════════════════════════════════════════════════════════
test("max 누락 출력도 finalizeOutput이 max=20 보장 (FE 바 NaN 방지)", () => {
  const o = goodOutput();
  for (const s of o.scores) delete s.max; // 모델이 max를 빠뜨린 상황
  o.scores[0].군더더기 = "drop me"; // 군더더기 필드
  const out = finalizeOutput(o, new Date("2026-05-26T01:00:00.000Z"));
  for (const s of out.scores) {
    assert.equal(s.max, 20, "max=20 보장");
    assert.deepEqual(
      Object.keys(s).sort(),
      ["area", "feedback_fix", "feedback_good", "max", "score"].sort(),
      "score는 계약 5필드만",
    );
  }
});

test("finalizeOutput은 meta를 서버 권위값으로 덮어씀", () => {
  const o = goodOutput();
  o.meta = { model_version: "해커가-넣은-값", is_verified: true, generated_at: "가짜", disclaimer: "가짜" };
  const out = finalizeOutput(o, new Date("2026-05-26T01:00:00.000Z"));
  assert.equal(out.meta.model_version, "writing-coach-prompt-v0.2");
  assert.equal(out.meta.is_verified, false);
  assert.ok(out.meta.generated_at.includes("+09:00"));
});
