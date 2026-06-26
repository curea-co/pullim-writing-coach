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
test("자유입력 title/genre 정규화: 줄바꿈/임의 길이가 카드를 깨거나 비허용 텍스트를 흘리지 못함", () => {
  const evil = "줄1\n줄2\t긴 제목".padEnd(120, "가"); // 줄바꿈 + 과길이 자유입력
  const s = formatStoryText({ title: evil, genre: "설\n명문", revisions: 3, breakthroughs: [] });
  const headline = s.split("\n")[0]; // 첫 줄(📝 …)만 차지해야 함
  assert.equal(headline.includes("줄2"), true); // 공백으로 접혀 한 줄에 들어옴
  assert.equal(/\n/.test(headline), false); // headline 내부엔 줄바꿈 없음
  assert.ok(headline.length <= 64); // 절단되어 카드 한 줄 유지(📝 + 40 + 장르20 여유)
  // 줄 수는 고정 구조(헤드라인+고쳐쓰기+인장) — 자유입력이 줄을 늘리지 못함
  assert.equal(s.split("\n").length, 3);
});

test("비문자열 title(손상 데이터)에도 oneLine이 String 강제로 throw 없이 처리(방어 심층)", () => {
  // parseSetup이 1차로 막지만, formatStoryText 직접 호출 시에도 안전해야 함.
  assert.doesNotThrow(() => formatStoryText({ title: 123, genre: "설명문", revisions: 1, breakthroughs: [] }));
});
