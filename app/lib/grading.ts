// Pullim Writing Coach — 채점 순수 모듈 (12 §9 S4)
// scripts/verify.mjs의 코어(정규화·입력검증·파싱·스키마검증·후처리 가드)를 이식한 단일 소스.
//
// 모듈 경계(12 §9 S4): 이 파일은 **순수**다. @anthropic-ai/sdk·server-only·fetch·next/* 를 import하지 않는다.
//   → FE 클라이언트가 타입·검증·포맷 헬퍼를 그대로 import할 수 있고, 노드 테스트(scripts/normalize.test.mjs)가
//     번들 없이 직접 import한다. 모델 호출(부수효과)은 app/api/score/route.ts가 전담한다.

import type { AreaName, F3Output, RevisionGuide, Score } from "../data/samples";
import { MODEL_VERSION } from "./model-version";

// 5영역 고정 순서 (12 §4.3 / verify.mjs). 스키마 검증의 권위 기준.
export const AREAS: readonly AreaName[] = [
  "과제 이해",
  "내용 충실도",
  "구조·논리",
  "표현·문장",
  "성장 가능성",
];

export const DISCLAIMER =
  "이 채점은 AI 자동 채점입니다. 학교 교사의 실제 채점과 다를 수 있습니다.";

// ── 입력 enum (12 §3.2) ───────────────────────────────────────────────
export const SCHOOL_LEVELS = ["중1", "중2", "중3", "고1", "고2", "고3"] as const;
export const SUBJECTS = ["국어", "사회", "역사", "도덕·윤리", "과학", "기타"] as const;
export const GENRES = [
  "설명문",
  "논설문·주장하는 글",
  "감상문·독후감",
  "성찰문·수필",
  "보고서",
  "요약문",
  "기타",
] as const;

// ── 본문 길이 정책 (12 §3.2) ─────────────────────────────────────────
export const BODY_MIN = 50;
export const BODY_MAX = 2000;
export const TARGET_MIN = 50;
export const TARGET_MAX = 2000;
export const PROMPT_MIN = 10;
export const PROMPT_MAX = 1000;

// 분량을 작성·채점 가능 범위(50~2,000)로 캡하는 단일 소스 (추출·mock·수동수정 공용).
//   value = 실효 목표(50~2,000 또는 null). 원본이 범위를 벗어나 캡됐으면 requested에 원본 보존.
//   9 이하('5문단'→'5' 같은 분량 아닌 숫자 오인식)·null·비수치는 목표 없음(null).
//   2026-06-08 v2 이식 (Phase 1 PR A) — 안내서 추출 결과를 채점 가능 범위로 정규화.
export function capTargetToWritable(raw: number | null): { value: number | null; requested?: number } {
  if (raw === null || !Number.isFinite(raw)) return { value: null };
  const n = Math.round(raw);
  if (n <= 9) return { value: null };
  if (n > TARGET_MAX) return { value: TARGET_MAX, requested: n };
  if (n < TARGET_MIN) return { value: TARGET_MIN, requested: n };
  return { value: n };
}

// ════════════════════════════════════════════════════════════════════
// 에러 모델 (12 §5) — code → HTTP status / 기본 한국어 메시지
// ════════════════════════════════════════════════════════════════════

export type ErrorCode =
  | "E-PARSE"
  | "E1"
  | "E3"
  | "E10"
  | "E-AUTH"
  | "E2"
  | "E11"
  | "E5"
  | "E6"
  | "E4"
  | "E8"
  | "E-CAP";

export const ERROR_HTTP: Record<ErrorCode, number> = {
  "E-PARSE": 400,
  E1: 400,
  E3: 400,
  E10: 400,
  "E-AUTH": 401,
  E2: 422,
  E11: 422,
  E5: 502,
  E6: 502,
  E4: 504,
  E8: 503,
  "E-CAP": 429,
};

// FE는 code로 wireframe §7 마이크로카피를 매핑(서버 message는 폴백). 12 §5.2 정합.
export const ERROR_MESSAGE: Record<ErrorCode, string> = {
  "E-PARSE": "결과를 다시 만들어야 해요. 다시 시도해 주세요.",
  E1: "과제 정보를 모두 올바르게 입력해 주세요.",
  E3: "2,000자까지 첨삭할 수 있어요.",
  E10: "목표 글자 수는 50~2,000자로 입력해 주세요.",
  "E-AUTH": "로그인이 필요해요. 다시 로그인해 주세요.",
  E2: "본문을 50자 이상 입력해 주세요.",
  E11: "글에 본문이 충분히 들어 있지 않아요. 학생이 쓴 글 전체를 붙여넣어 주세요.",
  E5: "결과를 다시 만들어야 해요. 다시 시도해 주세요.",
  E6: "결과를 다시 만들어야 해요. 다시 시도해 주세요.",
  E4: "지금 첨삭이 지연되고 있어요. 다시 시도해 주세요.",
  // E8 = 업스트림 Anthropic 429/5xx(서버 측 장애) → 503. 사용자 인터넷 탓이 아니므로 그렇게 말하지 않는다.
  // 진짜 클라이언트 오프라인은 서버 응답이 아니라 FE의 fetch reject 경로에서 따로 안내(EPO 2026-05-26 ①).
  E8: "일시적 오류예요. 잠시 후 다시 시도해 주세요.",
  "E-CAP": "오늘 사용량이 많아요. 잠시 후 다시 시도해 주세요.",
};

export type ErrorEnvelope = { error: { code: ErrorCode; message: string } };

export function errorEnvelope(code: ErrorCode, message?: string): ErrorEnvelope {
  return { error: { code, message: message ?? ERROR_MESSAGE[code] } };
}

// ════════════════════════════════════════════════════════════════════
// 글자 수 (서버 권위) — 코드포인트 기준. 한글 BMP라 대개 .length와 같지만 surrogate 안전.
// ════════════════════════════════════════════════════════════════════
export function charCount(s: string): number {
  return Array.from(s).length;
}

// ════════════════════════════════════════════════════════════════════
// normalizeBody — §4.1.1 / 12 §3.3 입력 정규화 (멱등)
//   "학생이 쓴 글이 아닌 표기"만 제거하고, 학생 글 자체(맞춤법·오탈자·비문)는 보존한다.
// ════════════════════════════════════════════════════════════════════
const JOIN = ""; // 자연 연결 마커 (<중략> 등 → 마침표 보강 + 공백 1칸)
const SENT_END = /[.!?。…]$/; // 문장 종결부 판정

export function normalizeBody(raw: unknown): string {
  if (typeof raw !== "string") return "";
  let s = raw.replace(/\r\n?/g, "\n"); // 1) 개행 정규화 (CRLF/CR → LF)

  // 2) 자연 연결형 발췌 표기 → JOIN 마커
  //    <중략> 【생략】 [중략] (꺾쇠·대괄호) / 생략부호로 감싼 괄호형 …(중략)…
  //    생략부호 양변은 각각 … (U+2026) 또는 ASCII 점 3개 이상(...)을 독립적으로 허용하며,
  //    혼합(…(중략)... / ...(중략)…)도 자연 연결한다 — 실사용 빈도가 높다(EPO 2026-05-26 결정:
  //    §3.3 문자 표기를 dot-ellipsis까지 확장). 단 (중략)의 '양쪽 모두'가 생략부호로 감싸일 때만
  //    연결하고, 한쪽만 점이면 자연 연결이 아니라 row 1의 단순 제거로 처리한다.
  //    인접 공백·개행을 함께 흡수해 한 문장으로 잇는다 (12 §3.3 row 2).
  s = s.replace(
    /\s*(?:[<【[]\s*(?:중략|생략|전략|이하\s*생략)\s*[>】\]]|(?:…|\.{3,})\s*[（(]\s*중략\s*[)）]\s*(?:…|\.{3,}))\s*/g,
    JOIN,
  );

  // 3) 괄호형 부분발췌 표기 → 표기 + 인접 공백 제거 (12 §3.3 row 1)
  //    (하략) (중략) (전략) (이하 생략) — 자연 연결이 아니라 단순 제거.
  //    양쪽 공백을 공백 1칸으로 축약(문장 사이에 끼면 한 칸 유지, 끝이면 trim이 정리).
  s = s.replace(/[ \t]*[（(]\s*(?:하략|중략|전략|이하\s*생략)\s*[)）][ \t]*/g, " ");

  // 4) JOIN 마커 해소 — 앞 종결부에 마침표 없으면 보강, 뒤 첫 글자 앞 공백 1칸
  if (s.includes(JOIN)) {
    const parts = s.split(JOIN);
    let out = parts[0];
    for (let i = 1; i < parts.length; i++) {
      const left = out.replace(/\s+$/, "");
      const right = parts[i].replace(/^\s+/, "");
      if (left === "") {
        out = right;
      } else if (right === "") {
        out = SENT_END.test(left) ? left : `${left}.`;
      } else {
        out = `${left}${SENT_END.test(left) ? " " : ". "}${right}`;
      }
    }
    s = out;
  }

  // 5) 줄 끝 줄바꿈(전송 wrap) → 공백 1칸. 단, 빈 줄(\n\n = 문단 구분)은 보존.
  const PARA = "";
  s = s.replace(/\n[ \t]*\n+/g, PARA); // 문단 구분 보호
  s = s.replace(/\n/g, " "); // 남은 단일 줄바꿈 → 공백
  s = s.split(PARA).join("\n\n"); // 문단 구분 복원

  // 6) 연속 공백/탭 3개 이상 → 1개 (12 §3.3 row 5)
  s = s.replace(/[ \t]{3,}/g, " ");

  // 7) 앞뒤 공백·탭·개행 trim
  return s.trim();
}

// ════════════════════════════════════════════════════════════════════
// 입력 검증 (12 §3.2 / V1·N1) — 클라이언트 입력 불신, 서버가 정규화·char_count 재산출
// ════════════════════════════════════════════════════════════════════

export type ValidatedRequest = {
  assignment: {
    school_level: string;
    subject: string;
    genre: string;
    target_char_count: number | null;
    prompt_text: string;
  };
  submission: {
    body: string; // 정규화 후
    char_count: number; // 서버 재계산
  };
};

export type ValidationResult =
  | { ok: true; value: ValidatedRequest }
  | { ok: false; code: ErrorCode; message?: string };

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function validateRequest(raw: unknown): ValidationResult {
  if (!isObject(raw)) return { ok: false, code: "E1" };
  const assignment = raw.assignment;
  const submission = raw.submission;
  if (!isObject(assignment)) return { ok: false, code: "E1" };
  if (!isObject(submission)) return { ok: false, code: "E1" };

  // 필수 enum 4종 + prompt_text (위반 → E1)
  const school = assignment.school_level;
  const subject = assignment.subject;
  const genre = assignment.genre;
  const promptText = assignment.prompt_text;

  if (typeof school !== "string" || !(SCHOOL_LEVELS as readonly string[]).includes(school))
    return { ok: false, code: "E1", message: "학년을 선택해 주세요." };
  if (typeof subject !== "string" || !(SUBJECTS as readonly string[]).includes(subject))
    return { ok: false, code: "E1", message: "과목을 선택해 주세요." };
  if (typeof genre !== "string" || !(GENRES as readonly string[]).includes(genre))
    return { ok: false, code: "E1", message: "장르를 선택해 주세요." };
  if (typeof promptText !== "string")
    return { ok: false, code: "E1", message: "과제문을 입력해 주세요." };
  const promptLen = charCount(promptText.trim());
  if (promptLen < PROMPT_MIN || promptLen > PROMPT_MAX)
    return { ok: false, code: "E1", message: `과제문은 ${PROMPT_MIN}~${PROMPT_MAX}자로 입력해 주세요.` };

  // target_char_count: null 또는 정수 50~2,000 (위반 → E10)
  const target = assignment.target_char_count;
  let normTarget: number | null;
  if (target === null || target === undefined) {
    normTarget = null;
  } else if (typeof target === "number" && Number.isInteger(target)) {
    if (target < TARGET_MIN || target > TARGET_MAX) return { ok: false, code: "E10" };
    normTarget = target;
  } else {
    return { ok: false, code: "E10" };
  }

  // body 존재·타입 (위반 → E1)
  const rawBody = submission.body;
  if (typeof rawBody !== "string") return { ok: false, code: "E1", message: "본문을 입력해 주세요." };

  // N1 정규화 후 길이 게이트
  const body = normalizeBody(rawBody);
  const len = charCount(body);
  if (len < BODY_MIN) {
    // 원본은 충분했는데 정규화로 50자 미만이 되면 E11(거의 표기뿐), 원본부터 짧으면 E2
    const rawLen = charCount(rawBody.trim());
    return { ok: false, code: rawLen >= BODY_MIN ? "E11" : "E2" };
  }
  if (len > BODY_MAX) return { ok: false, code: "E3" };

  return {
    ok: true,
    value: {
      assignment: {
        school_level: school,
        subject,
        genre,
        target_char_count: normTarget,
        prompt_text: promptText.trim(),
      },
      submission: { body, char_count: len },
    },
  };
}

// ════════════════════════════════════════════════════════════════════
// 모델 출력 파싱 — 코드펜스 제거 후 JSON.parse (12 §8.1 / verify.mjs parseJson)
//   assistant 프리필 "{" 사용 시 호출부에서 "{"를 prepend한 전체 텍스트를 넘긴다.
// ════════════════════════════════════════════════════════════════════
export function parseModelJson(text: string): unknown {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) t = fence[1].trim();
  return JSON.parse(t); // 실패 시 throw → 호출부에서 E5 매핑
}

// ════════════════════════════════════════════════════════════════════
// 스키마 검증 (12 §4.3 / verify.mjs checkSchema) — 위반 목록 반환(빈 배열 = 통과)
//   모델 meta는 검증하지 않는다(서버가 §4.2로 덮어쓰므로).
// ════════════════════════════════════════════════════════════════════
export function validateOutput(o: unknown): string[] {
  const errs: string[] = [];
  if (!isObject(o)) return ["출력이 객체가 아님"];

  if (typeof o.total_score !== "number") errs.push("total_score 비숫자");

  const scores = o.scores;
  if (!Array.isArray(scores) || scores.length !== 5) {
    errs.push("scores 5개 아님");
  } else {
    scores.forEach((s: unknown, i: number) => {
      if (!isObject(s)) {
        errs.push(`scores[${i}] 객체 아님`);
        return;
      }
      if (s.area !== AREAS[i]) errs.push(`area 순서 오류 [${i}] ${String(s.area)}`);
      if (typeof s.score !== "number" || s.score < 0 || s.score > 20)
        errs.push(`score 범위 [${i}]`);
      if (typeof s.feedback_good !== "string" || !s.feedback_good.trim())
        errs.push(`feedback_good 빈값 [${i}]`); // E6 성격
      if (typeof s.feedback_fix !== "string" || !s.feedback_fix.trim())
        errs.push(`feedback_fix 빈값 [${i}]`); // E6 성격
    });
    const sum = scores.reduce(
      (a: number, s: unknown) => a + (isObject(s) && typeof s.score === "number" ? s.score : 0),
      0,
    );
    if (sum !== o.total_score) errs.push(`total≠합 (${String(o.total_score)}≠${sum})`);
  }

  const guides = o.revision_guides;
  if (!Array.isArray(guides) || guides.length < 1 || guides.length > 3) {
    errs.push("revision_guides 1~3 아님");
  } else {
    const ps = guides.map((g: unknown) => (isObject(g) ? g.priority : undefined));
    // priority는 1~3 범위 + 오름차순(비감소). 계약 §4.1 "priority: 1..3, 오름차순".
    const prioOk = ps.every(
      (p, i) =>
        typeof p === "number" &&
        p >= 1 &&
        p <= 3 &&
        (i === 0 || p >= (ps[i - 1] as number)),
    );
    if (!prioOk) errs.push("priority 1~3 오름차순 아님");
  }
  return errs;
}

// ════════════════════════════════════════════════════════════════════
// 후처리 가드 (12 §8 / WBS P2.2) — 모델 출력 파싱·검증 통과 후 결정적 백스톱
//   프롬프트가 1차로 강제하고(POSITION/FIX_COUNT/DUPLICATION), 본 가드는 코드 백스톱(09 §4.2 #4).
//   verify.mjs의 검출 로직을 이식 — 검출(flag)을 권위로 두고, 텍스트 mutate는 보수적으로만.
// ════════════════════════════════════════════════════════════════════

// FIX_COUNT (mechanical): 한 feedback_fix의 '→' 정정 4개 이상 → 위반
export function checkFixCount(o: F3Output): string[] {
  const v: string[] = [];
  o.scores?.forEach((s, i) => {
    const arrows = (s.feedback_fix.match(/→/g) || []).length;
    if (arrows >= 4) v.push(`${AREAS[i]}: 정정 ${arrows}개`);
  });
  return v;
}

// DUPLICATION (heuristic): fix 내 'X→' 따옴표 정정 토큰이 revision_guides.action에도 등장
export function checkDuplication(o: F3Output): string[] {
  const flags: string[] = [];
  const guideText = (o.revision_guides || []).map((g) => g.action).join(" ");
  o.scores?.forEach((s, i) => {
    const quoted = [...s.feedback_fix.matchAll(/'([^']{2,20})→/g)].map((m) => m[1]);
    for (const q of quoted) {
      if (guideText.includes(q)) flags.push(`${AREAS[i]}: '${q}' fix·guide 중복`);
    }
  });
  return flags;
}

export type GuardReport = {
  output: F3Output;
  flags: { fixCount: string[]; duplication: string[] };
};

// 가드 적용. 현재 백스톱은 **검출 + 로깅**이 권위다 (텍스트 surgery는 한국어 문장을 깨뜨릴 위험이
// 이득보다 커, M1에서는 mutate하지 않는다 — 프롬프트가 1차 강제, verify v0.2에서 위반 0).
// 코드펜스 제거는 parseModelJson에서 이미 결정적으로 처리. 향후 P5에서 안전한 자동 보정 검토.
export function runGuards(o: F3Output): GuardReport {
  return {
    output: o,
    flags: { fixCount: checkFixCount(o), duplication: checkDuplication(o) },
  };
}

// ════════════════════════════════════════════════════════════════════
// meta 주입 (12 §4.2) — 서버가 권위 있게 전부 덮어씀. 모델 meta는 신뢰하지 않음.
// ════════════════════════════════════════════════════════════════════
export function kstNowIso(now: Date = new Date()): string {
  // 서버 시각을 +09:00 벽시계로 표기 (ISO 8601). 환경 TZ에 의존하지 않음.
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().replace(/\.\d{3}Z$/, "+09:00").replace(/Z$/, "+09:00");
}

export function buildMeta(now: Date = new Date()): F3Output["meta"] {
  return {
    model_version: MODEL_VERSION,
    generated_at: kstNowIso(now),
    is_verified: false,
    disclaimer: DISCLAIMER,
  };
}

// 검증된 출력 + 서버 meta로 최종 200 응답 본문 조립.
//   score 객체는 계약 §4.1 5필드로 정규화하고 max=20을 **서버가 보장**한다 — 모델이 max를
//   빠뜨려도 FE 바 width(score/max)가 NaN이 되지 않게 한다. 모델 출력의 군더더기 필드도 제거.
export function finalizeOutput(o: F3Output, now: Date = new Date()): F3Output {
  const { output } = runGuards(o);
  const scores: Score[] = (output.scores ?? []).map((s) => ({
    area: s.area,
    score: s.score,
    max: 20,
    feedback_good: s.feedback_good,
    feedback_fix: s.feedback_fix,
  }));
  const revision_guides: RevisionGuide[] = (output.revision_guides ?? []).map((g) => ({
    priority: g.priority,
    action: g.action,
    reason: g.reason,
  }));
  return {
    total_score: output.total_score,
    scores,
    revision_guides,
    meta: buildMeta(now),
  };
}
