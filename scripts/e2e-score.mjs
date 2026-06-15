// E2E 자체 테스트 — 실행 중인 /api/score에 대해 인수기준(12 §10) 스팟체크.
// 사전: 서버 기동 (DEMO_ACCESS_TOKEN·ANTHROPIC_API_KEY env 등록). 기본 http://localhost:3100
// 실행: node scripts/e2e-score.mjs  [BASE_URL] [TOKEN]
//
// 검사: E-AUTH(401) · E2(422) · E10(400) · E-PARSE(400) · 200+스키마(M1 인수기준 #1, 실모델 1콜).
// 200 1건만 모델을 호출하고(유료), 에러 경로는 모델 호출 전 단계라 무료.

const BASE = process.argv[2] || process.env.E2E_BASE_URL || "http://localhost:3100";
const TOKEN = process.argv[3] || process.env.DEMO_ACCESS_TOKEN || "pwc-e2e-test";
const URL = `${BASE}/api/score`;
const AREAS = ["과제 이해", "내용 충실도", "구조·논리", "표현·문장", "성장 가능성"];

const VALID = {
  assignment: {
    school_level: "중2",
    subject: "국어",
    genre: "논설문·주장하는 글",
    target_char_count: 600,
    prompt_text: "교복 자율화에 대한 자신의 주장을 근거 2가지 이상을 들어 쓰시오.",
  },
  submission: {
    body: "나는 교복 자율화에 찬성한다. 첫째, 학생도 자기 개성을 옷차림으로 표현할 권리가 있다. 매일 같은 옷을 입으면 자기다움을 드러낼 기회가 줄어든다. 둘째, 계절과 날씨에 맞춰 편한 옷을 고르면 학습에 더 집중할 수 있다. 한여름에도 두꺼운 교복을 입으면 수업에 집중하기 어렵다. 물론 매일 무엇을 입을지 고민하는 부담이 생길 수 있다. 그러나 그 부담은 스스로 선택하고 책임지는 연습이 되기도 한다. 따라서 나는 학생의 자율과 책임을 함께 기르기 위해 교복 자율화가 필요하다고 생각한다.",
  },
  meta: { client_version: "e2e", attempt_no: 1 },
};

let pass = 0;
let fail = 0;
const log = (ok, name, detail) => {
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (ok) pass++;
  else fail++;
};

async function post(body, headers = {}) {
  const res = await fetch(URL, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* 비 JSON 응답 */
  }
  return { status: res.status, json };
}

function checkSchema(o) {
  const errs = [];
  if (typeof o?.total_score !== "number") errs.push("total_score 비숫자");
  if (!Array.isArray(o?.scores) || o.scores.length !== 5) errs.push("scores 5개 아님");
  else {
    o.scores.forEach((s, i) => {
      if (s.area !== AREAS[i]) errs.push(`area[${i}] 순서`);
      if (typeof s.score !== "number" || s.score < 0 || s.score > 20) errs.push(`score[${i}] 범위`);
      if (!s.feedback_good?.trim()) errs.push(`good[${i}] 빈값`);
      if (!s.feedback_fix?.trim()) errs.push(`fix[${i}] 빈값`);
    });
    const sum = o.scores.reduce((a, s) => a + (s.score || 0), 0);
    if (sum !== o.total_score) errs.push(`total≠합 (${o.total_score}≠${sum})`);
  }
  if (!Array.isArray(o?.revision_guides) || o.revision_guides.length < 1 || o.revision_guides.length > 3)
    errs.push("revision_guides 1~3 아님");
  if (o?.meta?.model_version !== "writing-coach-prompt-v0.2") errs.push("meta.model_version 미주입");
  if (o?.meta?.is_verified !== false) errs.push("meta.is_verified ≠ false");
  if (!o?.meta?.generated_at?.includes("+09:00")) errs.push("meta.generated_at +09:00 아님");
  return errs;
}

async function main() {
  console.log(`E2E /api/score @ ${URL}\n`);

  // 1) 토큰 없음 → 401 E-AUTH
  {
    const { status, json } = await post(VALID);
    log(status === 401 && json?.error?.code === "E-AUTH", "토큰 없음 → 401 E-AUTH", `status ${status}, code ${json?.error?.code}`);
  }
  // 2) 잘못된 토큰 → 401
  {
    const { status, json } = await post(VALID, { "x-demo-token": "wrong-token" });
    log(status === 401 && json?.error?.code === "E-AUTH", "잘못된 토큰 → 401 E-AUTH", `status ${status}`);
  }
  // 3) 깨진 JSON → 400 E-PARSE
  {
    const { status, json } = await post("{not json", { "x-demo-token": TOKEN });
    log(status === 400 && json?.error?.code === "E-PARSE", "깨진 JSON → 400 E-PARSE", `status ${status}, code ${json?.error?.code}`);
  }
  // 4) 본문 50자 미만 → 422 E2
  {
    const body = { ...VALID, submission: { body: "너무 짧다." } };
    const { status, json } = await post(body, { "x-demo-token": TOKEN });
    log(status === 422 && json?.error?.code === "E2", "본문 < 50자 → 422 E2", `status ${status}, code ${json?.error?.code}`);
  }
  // 5) target 범위 밖 → 400 E10
  {
    const body = { ...VALID, assignment: { ...VALID.assignment, target_char_count: 5 } };
    const { status, json } = await post(body, { "x-demo-token": TOKEN });
    log(status === 400 && json?.error?.code === "E10", "target 범위 밖 → 400 E10", `status ${status}, code ${json?.error?.code}`);
  }
  // 6) 정상 입력 → 200 + 스키마 (M1 인수기준 #1, 실모델 호출)
  {
    const t0 = Date.now();
    const { status, json } = await post(VALID, { "x-demo-token": TOKEN });
    const ms = Date.now() - t0;
    if (status !== 200) {
      log(false, "정상 입력 → 200", `status ${status}, code ${json?.error?.code ?? "?"} (${ms}ms)`);
    } else {
      const errs = checkSchema(json);
      log(errs.length === 0, "정상 입력 → 200 + 스키마 만족", `총점 ${json.total_score}, ${ms}ms${errs.length ? ", 위반: " + errs.join("; ") : ""}`);
      if (errs.length === 0) {
        console.log(`    영역: ${json.scores.map((s) => `${s.area} ${s.score}`).join(" / ")}`);
        console.log(`    revision_guides ${json.revision_guides.length}개 · meta ${json.meta.model_version}`);
      }
    }
  }

  console.log(`\n결과: ${pass} pass / ${fail} fail`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("E2E FATAL:", e);
  process.exit(1);
});
