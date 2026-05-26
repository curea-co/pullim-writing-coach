// 프롬프트 재현 검증 — 5종 샘플 × 5회 = 25건.
// 실행(기본 = MOCK, 토큰 무료): node scripts/verify.mjs
// 실호출(기록용 1회, 유료): VERIFY_LIVE=1 node --env-file=.env.local scripts/verify.mjs
// 정답: app/data/samples.ts (06 v.4) / 허용: 총점 ±3, 영역 ±2
// 강제 룰: FIX_COUNT(mechanical) / DUPLICATION·POSITION(heuristic 경고)
//
// ⚠️ 게이트 의미 (EPO 결정 2026-05-26): 5종 전부 anchor라 실호출 25건은 회로적이고(09 v.2 §5.2),
//    유료 토큰을 매번 태울 이유가 없다. **기본을 MOCK으로 전환** — anchor 정답을 그대로 재생해
//    파싱·스키마·FIX/DUP·점수합 등 **하네스 회귀**를 결정적·무료로 검증한다.
//    이 게이트는 더 이상 '모델 품질/일반화'를 측정하지 않는다 — 그 신호는 P2.4(임의 글)·P5(실학생)로
//    이관(09 v.2 §4·§5.1). 실모델 1회 기록이 필요하면 VERIFY_LIVE=1.

import { writeFileSync } from "node:fs";
import { SAMPLES } from "../app/data/samples.ts";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompts.mjs";

const LIVE = process.env.VERIFY_LIVE === "1"; // 기본 false = MOCK(무료)
const KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = LIVE ? process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6" : "mock";
const RUNS = 5;
const AREAS = ["과제 이해", "내용 충실도", "구조·논리", "표현·문장", "성장 가능성"];

if (LIVE && !KEY) {
  console.error("FAIL: VERIFY_LIVE=1 인데 ANTHROPIC_API_KEY 미설정");
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// MOCK: anchor 정답(sample.output)을 모델 응답으로 재생. 유료 호출·env 불필요.
//   하네스(파싱·checkSchema·checkFixCount 등)를 결정적으로 통과시켜 회귀를 잡는다.
//   일반화/모델 품질은 측정하지 않는다(이관됨). SYSTEM_PROMPT 미사용(주석 import 유지).
function callMock(sample) {
  return { text: JSON.stringify(sample.output), ms: 0, usage: { mock: true } };
}

async function callApi(userPrompt, attempt = 0) {
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
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  // 429/오버로드(529)/5xx → 백오프 재시도. Haiku는 빨라 호출 밀도가 높아 RPM에 걸리기 쉽다.
  if ((res.status === 429 || res.status === 529 || res.status >= 500) && attempt < 6) {
    const ra = Number(res.headers.get("retry-after"));
    const wait = ra ? ra * 1000 : Math.min(2000 * 2 ** attempt, 30000);
    await sleep(wait);
    return callApi(userPrompt, attempt + 1);
  }
  const ms = Date.now() - t0;
  const data = await res.json();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${data?.error?.message || JSON.stringify(data)}`);
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  return { text, ms, usage: data.usage };
}

function parseJson(text) {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  return JSON.parse(t);
}

// 스키마 검증
function checkSchema(o) {
  const errs = [];
  if (typeof o.total_score !== "number") errs.push("total_score 비숫자");
  if (!Array.isArray(o.scores) || o.scores.length !== 5) errs.push("scores 5개 아님");
  else {
    o.scores.forEach((s, i) => {
      if (s.area !== AREAS[i]) errs.push(`area 순서 오류 [${i}] ${s.area}`);
      if (typeof s.score !== "number" || s.score < 0 || s.score > 20) errs.push(`score 범위 [${i}]`);
      if (!s.feedback_good?.trim()) errs.push(`feedback_good 빈값 [${i}]`);
      if (!s.feedback_fix?.trim()) errs.push(`feedback_fix 빈값 [${i}]`);
    });
    const sum = o.scores.reduce((a, s) => a + (s.score || 0), 0);
    if (sum !== o.total_score) errs.push(`total≠합 (${o.total_score}≠${sum})`);
  }
  if (!Array.isArray(o.revision_guides) || o.revision_guides.length < 1 || o.revision_guides.length > 3)
    errs.push("revision_guides 1~3 아님");
  else {
    const ps = o.revision_guides.map((g) => g.priority);
    if (!ps.every((p, i) => i === 0 || p >= ps[i - 1])) errs.push("priority 오름차순 아님");
  }
  return errs;
}

// FIX_COUNT_CHECK (mechanical): feedback_fix 내 'A→B' 화살표 정정 ≥4 → 위반
function checkFixCount(o) {
  const v = [];
  o.scores?.forEach((s, i) => {
    const arrows = (s.feedback_fix.match(/→/g) || []).length;
    if (arrows >= 4) v.push(`${AREAS[i]}: 정정 ${arrows}개`);
  });
  return v;
}

// DUPLICATION_CHECK (heuristic): fix 내 따옴표 정정 토큰이 revision_guides action에도 등장
function checkDuplication(o) {
  const flags = [];
  const guideText = (o.revision_guides || []).map((g) => g.action).join(" ");
  o.scores?.forEach((s, i) => {
    const quoted = [...s.feedback_fix.matchAll(/'([^']{2,20})→/g)].map((m) => m[1]);
    for (const q of quoted) {
      if (guideText.includes(q)) flags.push(`${AREAS[i]}: '${q}' fix·guide 중복`);
    }
  });
  return flags;
}

// POSITION_CHECK (heuristic): fix/good 내 인용으로 보이는 따옴표 표현이 본문에 없으면 경고
// (화살표 치환 대상/제안 표현은 제외)
function checkPosition(o, body) {
  const flags = [];
  o.scores?.forEach((s, i) => {
    for (const fb of [s.feedback_good, s.feedback_fix]) {
      const quoted = [...fb.matchAll(/'([^'→]{3,25})'/g)].map((m) => m[1]);
      for (const q of quoted) {
        // 제안형 표현(예: ~한다/~다 류 치환 제시)은 본문에 없을 수 있어, 본문에 없을 때만 경고
        if (!body.includes(q)) flags.push(`${AREAS[i]}: '${q}' 본문에 없음(인용/제안 구분 필요)`);
      }
    }
  });
  return flags;
}

const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };

async function main() {
  console.log(
    `${LIVE ? "LIVE(유료)" : "MOCK(무료·회귀)"} · 모델 ${MODEL} · 샘플 ${SAMPLES.length}종 × ${RUNS}회 = ${SAMPLES.length * RUNS}건\n`
  );
  if (!LIVE)
    console.log("※ MOCK = anchor 정답 재생. 하네스 회귀만 검증. 일반화는 P2.4·P5 (09 v.2 §5.1).\n");
  const report = [];

  for (const sample of SAMPLES) {
    const expectedTotal = sample.output.total_score;
    const expectedAreas = sample.output.scores.map((s) => s.score);
    const userPrompt = buildUserPrompt(sample.assignment, sample.submission);
    const runs = [];
    process.stdout.write(`[${sample.label}] ${sample.title} (정답 ${expectedTotal})  `);

    for (let r = 0; r < RUNS; r++) {
      if (LIVE) await sleep(1200); // 호출 간격 — RPM 여유 확보 (MOCK은 불필요)
      try {
        const { text, ms, usage } = LIVE
          ? await callApi(userPrompt)
          : callMock(sample);
        const o = parseJson(text);
        const schemaErr = checkSchema(o);
        const areas = (o.scores || []).map((s) => s.score);
        runs.push({
          ok: schemaErr.length === 0,
          total: o.total_score,
          areas,
          ms,
          usage,
          schemaErr,
          fixCount: checkFixCount(o),
          dup: checkDuplication(o),
          pos: checkPosition(o, sample.submission.body),
        });
        process.stdout.write(schemaErr.length ? "✗" : `${o.total_score} `);
      } catch (e) {
        runs.push({ ok: false, error: e.message });
        process.stdout.write("E");
      }
    }
    process.stdout.write("\n");

    const valid = runs.filter((r) => r.ok);
    const totals = valid.map((r) => r.total);
    const totalRange = totals.length ? [Math.min(...totals), Math.max(...totals)] : [null, null];
    const totalSpread = totals.length ? totalRange[1] - totalRange[0] : null;
    // 영역별 분산
    const areaSpread = AREAS.map((_, ai) => {
      const vals = valid.map((r) => r.areas[ai]).filter((v) => typeof v === "number");
      return vals.length ? Math.max(...vals) - Math.min(...vals) : null;
    });
    const totalsWithinTol = totals.every((t) => Math.abs(t - expectedTotal) <= 3);
    const areasWithinTol = valid.every((r) => r.areas.every((v, ai) => Math.abs(v - expectedAreas[ai]) <= 2));
    const variancePass = totalSpread !== null && totalSpread <= 6 && areaSpread.every((s) => s !== null && s <= 4);
    const fixCountViol = runs.flatMap((r) => r.fixCount || []);
    const dupFlags = runs.flatMap((r) => r.dup || []);
    const posFlags = runs.flatMap((r) => r.pos || []);
    const lat = valid.map((r) => r.ms);

    report.push({
      label: sample.label, title: sample.title,
      expectedTotal, expectedAreas,
      validCount: valid.length, runs: runs.length,
      totals, totalRange, totalSpread, totalMedian: totals.length ? median(totals) : null,
      areaSpread,
      totalsWithinTol, areasWithinTol, variancePass,
      fixCountViol, dupFlags, posFlags,
      latencyMs: lat.length ? { min: Math.min(...lat), max: Math.max(...lat), median: median(lat) } : null,
    });
  }

  // 요약 출력
  console.log("\n══════════ 요약 ══════════");
  for (const r of report) {
    console.log(`\n[${r.label}] 정답 총점 ${r.expectedTotal} · 영역 ${r.expectedAreas.join("/")}`);
    console.log(`  유효 ${r.validCount}/${r.runs} · 총점 ${JSON.stringify(r.totals)} (범위 ${r.totalRange[0]}~${r.totalRange[1]}, 폭 ${r.totalSpread})`);
    console.log(`  영역 분산 폭 ${JSON.stringify(r.areaSpread)} (허용 ≤4)`);
    console.log(`  정답±허용: 총점 ${r.totalsWithinTol ? "✓" : "✗"} / 영역 ${r.areasWithinTol ? "✓" : "✗"} · 재현 분산: ${r.variancePass ? "✓" : "✗"}`);
    console.log(`  FIX_COUNT 위반: ${r.fixCountViol.length ? "✗ " + r.fixCountViol.join("; ") : "✓ 0건"}`);
    if (r.dupFlags.length) console.log(`  DUPLICATION(heuristic): ${r.dupFlags.join("; ")}`);
    if (r.posFlags.length) console.log(`  POSITION(heuristic 경고, 인용/제안 구분 필요): ${r.posFlags.slice(0, 6).join("; ")}${r.posFlags.length > 6 ? " …" : ""}`);
    if (r.latencyMs) console.log(`  응답시간 ms: median ${r.latencyMs.median} (${r.latencyMs.min}~${r.latencyMs.max})`);
  }

  const allFixOk = report.every((r) => r.fixCountViol.length === 0);
  const allTotalTol = report.every((r) => r.totalsWithinTol);
  const allAreaTol = report.every((r) => r.areasWithinTol);
  const allVariance = report.every((r) => r.variancePass);
  const allValid = report.every((r) => r.validCount === r.runs);

  console.log("\n══════════ 종합 판정 ══════════");
  console.log(`스키마 유효(25/25): ${allValid ? "✓" : "✗"}`);
  console.log(`총점 정답±3:        ${allTotalTol ? "✓" : "✗"}`);
  console.log(`영역 정답±2:        ${allAreaTol ? "✓" : "✗"}`);
  console.log(`재현 분산(총점폭≤6/영역폭≤4): ${allVariance ? "✓" : "✗"}`);
  console.log(`FIX_COUNT 위반 0(C-1 회귀): ${allFixOk ? "✓" : "✗"}`);
  const hardPass = allValid && allTotalTol && allVariance && allFixOk;
  console.log(`\n>>> HARD PASS(스키마+총점±3+분산+FIX_COUNT): ${hardPass ? "✅ PASS" : "❌ FAIL"}`);

  writeFileSync(
    new URL("./verify-results.json", import.meta.url),
    JSON.stringify({ model: MODEL, runs: RUNS, generatedAt: new Date().toISOString(), report, summary: { allValid, allTotalTol, allAreaTol, allVariance, allFixOk, hardPass } }, null, 2),
    "utf8"
  );
  console.log("\n결과 저장: scripts/verify-results.json");
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });
