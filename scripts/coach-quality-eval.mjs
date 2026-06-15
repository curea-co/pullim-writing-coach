// Pullim Writing Coach — 과정 코치 *품질* eval (docs/28)
//
// 실행: node --import ./scripts/register-ts.mjs scripts/coach-quality-eval.mjs
//   (.env.local의 ANTHROPIC_API_KEY를 직접 읽는다 — --env-file 불필요. 유료 호출 ~16건)
//
// 무엇을 측정하나: verify.mjs는 채점 하네스의 *회귀*(파싱·스키마·점수합)만 본다. 이 eval은 다르다 —
//   코치가 실제로 "잘 보조"하는가, 즉 코칭 *품질*을 LLM-judge로 측정한다.
//
// 파이프라인 (케이스별):
//   (a) 코치 호출 — route.ts와 동일한 호출 모양: Haiku, COACH_SYSTEM_PROMPT(system), buildCoachPrompt(user),
//       프리필 "{". → parseModelJson → CoachOutput.
//   (b) checkGenerationBlock(생성차단 가드) 실행 — 대필 누출 정규식 가드.
//   (c) LLM-JUDGE — 두 번째 Anthropic 호출(Opus). 코칭을 1~5로 채점:
//         끌어내는질문(소크라테스) / 대필없음 / 과제·루브릭정렬 / 난이도·톤적정 / 진단정확
//       + 한 줄 근거 + boolean would_a_teacher_endorse.
//   집계: 케이스 표 + 평균 + (생성차단 발동 OR judge<3 OR 대필문장) 케이스 전수 나열.
//
// 정직성 원칙: 실패를 부풀리지 말고 드러낸다. judge가 후하면 그것도 결과의 일부.
//
// 강건성: 모델 JSON 파싱 실패 시 1회 재시도, 그래도 실패면 케이스 errored 처리.
//   429/529/5xx는 백오프 재시도. 호출 간 작은 지연으로 RPM 예우.

import { readFileSync, writeFileSync } from "node:fs";
import { COACH_SYSTEM_PROMPT, buildCoachPrompt } from "../app/lib/coach-prompt.ts";
import { checkGenerationBlock, validateCoachOutput } from "../app/lib/coach-schema.ts";
import { parseModelJson } from "../app/lib/grading.ts";
import { getAgeBand, getCoachProfile } from "../app/lib/coach-profile.ts";
import { splitParagraphs } from "../app/lib/paragraphs.ts";
import { CASES } from "./coach-eval-cases.mjs";

// ── .env.local 직접 읽기 (dotenv-style) ──────────────────────────────
function loadEnvLocal() {
  let txt = "";
  try {
    txt = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
  } catch {
    return {};
  }
  const out = {};
  for (const line of txt.split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    out[m[1]] = v;
  }
  return out;
}

const ENV = loadEnvLocal();
const KEY = process.env.ANTHROPIC_API_KEY || ENV.ANTHROPIC_API_KEY;
if (!KEY) {
  console.error("FAIL: ANTHROPIC_API_KEY 미설정 (.env.local 또는 환경변수)");
  process.exit(1);
}

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const COACH_MODEL = "claude-haiku-4-5"; // route.ts와 동일 계열(코치 = Haiku)
const JUDGE_MODEL = "claude-opus-4-8"; // judge는 강한 모델로
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── 공통 호출 (백오프 재시도) ─────────────────────────────────────────
async function callAnthropic(body, attempt = 0) {
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });
  if ((res.status === 429 || res.status === 529 || res.status >= 500) && attempt < 6) {
    const ra = Number(res.headers.get("retry-after"));
    const wait = ra ? ra * 1000 : Math.min(2000 * 2 ** attempt, 30000);
    await sleep(wait);
    return callAnthropic(body, attempt + 1);
  }
  const data = await res.json();
  if (!res.ok)
    throw new Error(`HTTP ${res.status}: ${data?.error?.message || JSON.stringify(data)}`);
  const text = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("");
  return { text, usage: data.usage };
}

// ── (a) 코치 호출 — route.ts callModel 모양 그대로 ──────────────────────
async function callCoach(userPrompt) {
  const { text, usage } = await callAnthropic({
    model: COACH_MODEL,
    max_tokens: 3000,
    temperature: 0.3,
    system: [{ type: "text", text: COACH_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [
      { role: "user", content: userPrompt },
      { role: "assistant", content: "{" }, // JSON 강제 프리필
    ],
  });
  return { raw: `{${text}`, usage }; // 프리필 "{" 복원
}

// ── (c) LLM-JUDGE ─────────────────────────────────────────────────────
const JUDGE_SYSTEM = `당신은 한국 중·고등 글쓰기 교육 전문가이자 엄정한 평가자다.
"풀림 과정 코치"라는 AI가 학생의 *쓰는 중* 초안에 대해 돌려준 nudge(진단+유도질문)들의 **코칭 품질**을 평가한다.

이 코치의 존재 이유: 학생 문장을 대신 써 주지 않고(=대필 금지), 소크라테스식 질문으로 학생이 스스로
약점을 발견·보완하게 '끌어내는' 것. 채점기가 아니라 과정 코치다.

다섯 항목을 각 1~5점(정수)으로 채점하라(1=매우 나쁨, 3=보통/합격선, 5=탁월):
1. socratic_questioning(끌어내는질문): 답을 주지 않고 학생 사고를 끌어내는 질문인가.
2. no_ghostwriting(대필없음): 학생이 그대로 베껴 쓸 완성 문장·예시·모범 답안을 제공하지 않았는가.
   (제공했다면 1~2점. 가드가 못 잡은 미묘한 떠먹임도 여기서 감점.)
3. assignment_alignment(과제·루브릭정렬): 과제문(+있으면 교사 루브릭)이 요구한 것을 정확히 겨냥했는가.
4. difficulty_tone_fit(난이도·톤적정): 학년·연령에 맞는 난이도와 담백한 톤인가. 위압·유아틱·과잉 모두 감점.
5. diagnosis_accuracy(진단정확): 글의 실제 약점/강점을 정확히 짚었는가. 헛다리·과잉진단은 감점.

추가 신호:
- 이미 강한 글에 약점을 억지로 만들어 다수 nudge를 쏟으면 = 과도 넛지 → difficulty_tone_fit & diagnosis_accuracy 감점.
- 매우 약한 글을 '통과'시키거나 nudge가 없으면 → diagnosis_accuracy 감점.

출력은 아래 JSON 1개만. 다른 텍스트·코드펜스 금지.
{
  "scores": {
    "socratic_questioning": <1-5>,
    "no_ghostwriting": <1-5>,
    "assignment_alignment": <1-5>,
    "difficulty_tone_fit": <1-5>,
    "diagnosis_accuracy": <1-5>
  },
  "rationale": "<한 줄 근거, 한국어>",
  "would_a_teacher_endorse": <true|false>,
  "ghostwritten_sentence_found": <true|false>
}`;

function buildJudgeUserPrompt(c, coachOutput) {
  const rubricLine = c.rubric ? `\n교사 추가 루브릭: ${c.rubric}` : "";
  return `[과제 정보]
- 학년: ${c.assignment.school_level} / 과목: ${c.assignment.subject} / 장르: ${c.assignment.genre}
- 추정 실력대: ${c.skill}
- 과제문: ${c.assignment.prompt_text}${rubricLine}

[학생 초안]
"""
${c.draft}
"""

[좋은 코치라면(맥락 힌트, 채점표 아님)]
${c.expectations}

[코치가 돌려준 출력(CoachOutput JSON)]
${JSON.stringify(coachOutput, null, 2)}

위 코칭 품질을 system이 정의한 5항목으로 채점하고 JSON 1개만 출력하라.`;
}

async function callJudge(c, coachOutput) {
  const { text, usage } = await callAnthropic({
    model: JUDGE_MODEL,
    max_tokens: 1500,
    thinking: { type: "adaptive" },
    system: [{ type: "text", text: JUDGE_SYSTEM }],
    messages: [{ role: "user", content: buildJudgeUserPrompt(c, coachOutput) }],
  });
  return { raw: text, usage };
}

function parseJudge(text) {
  // judge에는 프리필을 안 걸었으므로 일반 파싱(코드펜스 허용은 parseModelJson가 처리).
  return parseModelJson(text);
}

// ── 한 케이스 처리 ─────────────────────────────────────────────────────
async function runCase(c) {
  const draftParas = splitParagraphs(c.draft);
  const profile = getCoachProfile(getAgeBand(c.assignment.school_level));
  const userPrompt = buildCoachPrompt({
    assignment: { ...c.assignment, target_char_count: null },
    rubricText: c.rubric,
    draft: c.draft,
    paragraphs: draftParas,
    profile,
  });

  // (a) 코치 호출 + 파싱 (1회 재시도)
  let coachOutput = null;
  let coachErr = null;
  for (let attempt = 0; attempt < 2 && coachOutput == null; attempt++) {
    try {
      const { raw } = await callCoach(userPrompt);
      const parsed = parseModelJson(raw);
      const schemaErrs = validateCoachOutput(parsed);
      if (schemaErrs.length > 0) {
        coachErr = `스키마 위반: ${schemaErrs.join("; ")}`;
        if (attempt === 1) break;
        await sleep(800);
        continue;
      }
      coachOutput = parsed;
      coachErr = null;
    } catch (e) {
      coachErr = `코치 호출/파싱 실패: ${e.message}`;
      if (attempt === 0) await sleep(800);
    }
  }

  if (!coachOutput) {
    return { id: c.id, skill: c.skill, assignment: c.assignment, errored: true, error: coachErr };
  }

  // (b) 생성차단 가드
  const guardViolations = checkGenerationBlock(coachOutput);

  // (c) LLM-judge (1회 재시도)
  let judge = null;
  let judgeErr = null;
  for (let attempt = 0; attempt < 2 && judge == null; attempt++) {
    try {
      await sleep(700); // RPM 예우
      const { raw } = await callJudge(c, coachOutput);
      judge = parseJudge(raw);
    } catch (e) {
      judgeErr = `judge 실패: ${e.message}`;
      if (attempt === 0) await sleep(1000);
    }
  }

  if (!judge) {
    return {
      id: c.id,
      skill: c.skill,
      assignment: c.assignment,
      errored: true,
      error: judgeErr,
      coachOutput,
      guardViolations,
    };
  }

  const s = judge.scores || {};
  const judgeVals = [
    s.socratic_questioning,
    s.no_ghostwriting,
    s.assignment_alignment,
    s.difficulty_tone_fit,
    s.diagnosis_accuracy,
  ].filter((v) => typeof v === "number");
  const judgeAvg = judgeVals.length ? judgeVals.reduce((a, b) => a + b, 0) / judgeVals.length : null;

  return {
    id: c.id,
    skill: c.skill,
    assignment: c.assignment,
    hasRubric: !!c.rubric,
    errored: false,
    nudgeCount: Array.isArray(coachOutput.nudges) ? coachOutput.nudges.length : 0,
    guardViolations,
    guardFired: guardViolations.length > 0,
    judge,
    judgeAvg,
    coachOutput,
  };
}

// ── main ──────────────────────────────────────────────────────────────
const FIELDS = [
  ["socratic_questioning", "끌어내는질문"],
  ["no_ghostwriting", "대필없음"],
  ["assignment_alignment", "과제정렬"],
  ["difficulty_tone_fit", "난이도·톤"],
  ["diagnosis_accuracy", "진단정확"],
];

async function main() {
  console.log(
    `코치 품질 eval · 코치=${COACH_MODEL} judge=${JUDGE_MODEL} · 케이스 ${CASES.length}건 (호출 ~${CASES.length * 2}건)\n`,
  );
  const results = [];
  for (const c of CASES) {
    process.stdout.write(`[${c.id}] (${c.skill}) … `);
    const r = await runCase(c);
    results.push(r);
    if (r.errored) {
      process.stdout.write(`ERRORED — ${r.error}\n`);
    } else {
      const flag = r.guardFired ? "🚨가드" : "";
      process.stdout.write(
        `nudge ${r.nudgeCount} · judge평균 ${r.judgeAvg?.toFixed(2)} · 교사인정 ${r.judge.would_a_teacher_endorse ? "Y" : "N"} ${flag}\n`,
      );
    }
    await sleep(600);
  }

  // 집계
  const ok = results.filter((r) => !r.errored);
  const fieldAvgs = {};
  for (const [key] of FIELDS) {
    const vals = ok.map((r) => r.judge?.scores?.[key]).filter((v) => typeof v === "number");
    fieldAvgs[key] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }
  const overallAvg = ok.length
    ? ok.reduce((a, r) => a + (r.judgeAvg || 0), 0) / ok.length
    : null;
  const endorseCount = ok.filter((r) => r.judge?.would_a_teacher_endorse).length;
  const guardCount = ok.filter((r) => r.guardFired).length;
  const ghostCount = ok.filter((r) => r.judge?.ghostwritten_sentence_found).length;

  // 실패/주의 케이스: 가드 발동 OR judge<3(어느 항목이든 또는 평균) OR 대필문장
  const failures = ok.filter((r) => {
    const anyLow = FIELDS.some(([k]) => (r.judge?.scores?.[k] ?? 5) < 3);
    return r.guardFired || anyLow || r.judge?.ghostwritten_sentence_found || (r.judgeAvg ?? 5) < 3;
  });

  console.log("\n══════════ 항목별 평균(1~5) ══════════");
  for (const [key, label] of FIELDS)
    console.log(`  ${label.padEnd(8)} : ${fieldAvgs[key]?.toFixed(2) ?? "—"}`);
  console.log(`  ────────`);
  console.log(`  전체 평균 : ${overallAvg?.toFixed(2) ?? "—"}`);
  console.log(`  교사 인정 : ${endorseCount}/${ok.length}`);
  console.log(`  가드 발동 : ${guardCount}/${ok.length}`);
  console.log(`  대필문장(judge) : ${ghostCount}/${ok.length}`);
  console.log(`  errored : ${results.length - ok.length}/${results.length}`);

  if (failures.length) {
    console.log("\n══════════ 실패/주의 케이스 ══════════");
    for (const r of failures) {
      console.log(
        `  [${r.id}] judge평균 ${r.judgeAvg?.toFixed(2)} · 가드 ${r.guardFired ? r.guardViolations.join(",") : "—"} · 대필 ${r.judge?.ghostwritten_sentence_found ? "Y" : "N"}`,
      );
      console.log(`     근거: ${r.judge?.rationale}`);
    }
  }

  writeFileSync(
    new URL("./coach-quality-eval-results.json", import.meta.url),
    JSON.stringify(
      {
        coachModel: COACH_MODEL,
        judgeModel: JUDGE_MODEL,
        generatedAt: new Date().toISOString(),
        results,
        aggregate: { fieldAvgs, overallAvg, endorseCount, guardCount, ghostCount, total: results.length, ok: ok.length },
        failures: failures.map((r) => r.id),
      },
      null,
      2,
    ),
    "utf8",
  );
  console.log("\n결과 저장: scripts/coach-quality-eval-results.json");
}

main().catch((e) => {
  console.error("FATAL:", e);
  process.exit(1);
});
