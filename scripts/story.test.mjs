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
