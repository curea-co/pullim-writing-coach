// Novel 글 스팟체크 — 09 v.2 §5.1 hold-out 발견(novel 고품질 글 −6~−10점 보수 편향) 후속 (P2.4).
//   실행: VERIFY_LIVE=1 node --env-file=.env.local scripts/novel-spotcheck.mjs
//   anchor 외 입력 1건을 v0.2 prompt로 채점해 보수 편향 잔존 여부 1점 데이터 수집.
//   결과는 docs/17_novel_spotcheck_2026-05-31.md에 추가. 5종 anchor·verify.mjs와 별개 트랙.

import { writeFileSync, existsSync, readFileSync } from "node:fs";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompts.mjs";

const KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
const LIVE = process.env.VERIFY_LIVE === "1";

if (!LIVE) {
  console.error("FAIL: VERIFY_LIVE=1 + --env-file=.env.local 필요 (novel은 실호출 1건 전용)");
  process.exit(1);
}
if (!KEY) {
  console.error("FAIL: ANTHROPIC_API_KEY 미설정");
  process.exit(1);
}

// ── Novel 입력 (anchor 외) ─────────────────────────────────────
// 5종 anchor 주제(자율과 책임/시계/화산/광야/영해)와 겹치지 않는 주제 + 학년·과목·장르.
// 고품질(보완하면 좋은 글, 75~89 기대)에서 보수 편향이 더 잘 드러난다는 hold-out 가설.
const NOVEL_INPUT = {
  assignment: {
    school_level: "중3",
    subject: "사회",
    genre: "설명문",
    target_char_count: 700,
    prompt_text:
      "재생 가능 에너지의 종류와 우리나라의 활용 현황을 설명하고, 일상에서 학생이 실천할 수 있는 에너지 절약 방법을 함께 제시하시오.",
  },
  submission: {
    body:
      "재생 가능 에너지란 태양·바람·물·지열처럼 자연에서 끊임없이 다시 만들어지는 에너지를 말한다. 화석 연료와 달리 사용해도 고갈되지 않고, 이산화탄소 배출이 적어 기후 변화에 대응하는 핵심 수단으로 꼽힌다. 대표적으로 태양광은 햇빛을 전기로 바꾸는 방식이고, 풍력은 바람으로 발전기를 돌려 전기를 만든다. 수력은 강·댐의 물 흐름을 이용하고, 지열은 땅속 열을 끌어 올려 난방과 발전에 쓴다.\n\n우리나라는 2030년까지 신·재생 에너지 비중을 전체 발전량의 약 20%로 늘리는 목표를 세웠다. 전라남도와 충청남도 해안에는 대규모 풍력 단지가 들어서고, 새만금에는 세계 최대 규모의 수상 태양광 단지가 추진되고 있다. 다만 일조량·풍속 같은 자연 조건에 따라 발전량이 불안정한 점, 부지 확보가 어려운 점이 한계로 지적된다.\n\n학생이 일상에서 실천할 수 있는 방법은 의외로 많다. 첫째, 사용하지 않는 가전의 플러그를 뽑아 대기 전력을 줄인다. 둘째, 가까운 거리는 걷거나 자전거를 이용한다. 셋째, 학교·집의 LED 전구 사용을 권한다. 작은 실천이 모이면 발전소 한 곳을 덜 돌리는 효과가 난다.\n\n재생 가능 에너지는 미래 세대의 환경권을 지키는 가장 현실적인 선택이다. 정책·기술의 진보와 개인의 작은 실천이 함께 갈 때 진정한 에너지 전환이 가능하다.",
    char_count: 0, // 아래에서 자동 계산
  },
};
NOVEL_INPUT.submission.char_count = Array.from(NOVEL_INPUT.submission.body).length;

console.log(`novel-spotcheck: char_count=${NOVEL_INPUT.submission.char_count}, model=${MODEL}`);

const t0 = Date.now();
const res = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-api-key": KEY,
    "anthropic-version": "2023-06-01",
  },
  body: JSON.stringify({
    model: MODEL,
    max_tokens: 2000,
    temperature: 0.2,
    system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: buildUserPrompt(NOVEL_INPUT.assignment, NOVEL_INPUT.submission) }],
  }),
});
const ms = Date.now() - t0;

if (!res.ok) {
  const err = await res.text();
  console.error(`FAIL status=${res.status}: ${err.slice(0, 400)}`);
  process.exit(1);
}

const json = await res.json();
const text = (json.content?.[0]?.text ?? "").trim();
const cleanText = text.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();

let parsed;
try {
  parsed = JSON.parse(cleanText);
} catch (e) {
  console.error("FAIL JSON parse:", e.message);
  console.error("raw:", text.slice(0, 500));
  process.exit(1);
}

const total = parsed.total_score;
const areas = parsed.scores?.map((s) => `${s.area}=${s.score}`).join(", ");
const band =
  total >= 90 ? "완성 단계"
  : total >= 75 ? "보완하면 좋은 글"
  : total >= 55 ? "기본 토대는 있음"
  : total >= 35 ? "토대 보강 필요"
  : "다시 쓰기 권장";

console.log(`\nresult: total=${total} (${band}), ms=${ms}`);
console.log(`areas: ${areas}`);
console.log(`fix_count: ${parsed.revision_guides?.length ?? 0}`);

// 결과를 docs/17_novel_spotcheck_2026-05-31.md에 append (있으면 새 run 추가, 없으면 새 파일).
const docPath = "docs/17_novel_spotcheck_2026-05-31.md";
const header = `# Novel 글 스팟체크 — 2026-05-31 (P2.4 후속)

> 근거: 09 v.2 §5.1 hold-out에서 novel 고품질 글에 −6~−10점 보수 편향 발견(2주 이월).
> 방법: anchor 외 입력 1건을 v0.2 prompt(Haiku)로 채점. 5종 회로적 게이트와 별개 트랙.
> 입력: ${NOVEL_INPUT.assignment.school_level} ${NOVEL_INPUT.assignment.subject} ${NOVEL_INPUT.assignment.genre} (${NOVEL_INPUT.submission.char_count}자, 목표 ${NOVEL_INPUT.assignment.target_char_count}자)
> 주제: 재생 가능 에너지 + 실천 (5종 anchor 주제와 무관)

---

## Run 1 — ${new Date().toISOString()}

- **총점: ${total} / 100 (${band})**
- 영역: ${areas}
- 응답시간: ${ms}ms
- 수정 가이드: ${parsed.revision_guides?.length ?? 0}건
- 모델: ${MODEL}

### Raw output (JSON)
\`\`\`json
${JSON.stringify(parsed, null, 2)}
\`\`\`

---
`;

const docExists = existsSync(docPath);
if (docExists) {
  const prev = readFileSync(docPath, "utf8");
  writeFileSync(docPath, prev + "\n" + header);
} else {
  writeFileSync(docPath, header);
}

writeFileSync(`scripts/novel-spotcheck-result.json`, JSON.stringify({ input: NOVEL_INPUT, output: parsed, ms, model: MODEL }, null, 2));

console.log(`\nsaved: ${docPath}, scripts/novel-spotcheck-result.json`);
