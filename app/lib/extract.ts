// extract — 안내서 자동 추출 순수 모듈 (채점 grading.ts와 같은 경계 규칙: 순수, FE-importable).
//   안내서(수행평가 과제 안내) 원문 → 과제문·장르·분량·조건·선생님 루브릭 구조화.
//   부수효과(모델 호출)는 app/api/extract/route.ts. 프롬프트·검증·정규화는 여기.
//
// 2026-06-08 v2 이식 (Phase 1 PR A) — CEO doc §3-2 "안내서 한 장 → AI가 추출" 구현.
//   v1 변경: ExtractedAssignment 타입을 lib에 정의(컴포넌트 의존 끊음).
//   분량 표시 정책(대표님 결정 2026-06-04): 안내서에 적힌 목표 분량을 카드에 "그대로" 표시.
//   작성·채점 상한(2,000자)은 AssignmentCard가 별도 주석으로 안내하고, 채점 요청은 score-client가
//   경계로 클램프한다(표시는 교사값, 채점은 계약 범위). 여기선 정보를 지우지 않는다.

import { type ErrorCode, GENRES } from "./grading";

export const RAW_MIN = 5;
export const RAW_MAX = 8000;
const PROMPT_VALUE_MAX = 1000;
const CONDITIONS_MAX = 6;

type Confidence = "confirmed" | "inferred";

// 카드에 표시할 추출 결과 — 각 필드의 신뢰도(확정/추정) 포함.
//   v2에선 AssignmentCard.tsx에 정의돼 있었으나, lib 책임 분리 위해 여기로 이전.
//   Phase 1 PR C 컴포넌트 이식 시 AssignmentCard가 이 타입을 import.
export type ExtractedAssignment = {
  prompt_text: { value: string; confidence: Confidence };
  genre: { value: string; confidence: Confidence };
  // value: 안내서에 적힌 교사 의도값 그대로 (5000자도 5000으로). 채점 cap(50~2000)은 score-client 책임.
  target_char_count: {
    value: number | null;
    confidence: Confidence;
  };
  conditions: string[]; // 유의 조건 (근거 2개·개요·출처 등)
  teacher_rubric_present: boolean; // 선생님 루브릭 추출 여부 (CEO doc §3-2 게임체인저)
  raw_excerpt?: string; // 안내서 원문 일부 미리보기
};

// ── 시스템 프롬프트 ───────────────────────────────────────────────────
export const EXTRACT_SYSTEM_PROMPT = `You are "Pullim Writing Coach"의 안내서 분석기.
선생님이 학생에게 준 '수행평가 안내서' 원문을 읽고, 글쓰기에 필요한 메타데이터를 구조화한다.
모든 텍스트 출력은 한국어. JSON 객체 하나만 출력한다(설명·코드펜스 금지).

[추출 항목]
1. prompt_text: 학생이 무엇을 써야 하는지 한 문장~몇 문장으로 요약한 과제문. 안내서에 명시된
   핵심 지시를 그대로 살리되 군더더기(제출 방법·기한 등)는 뺀다.
2. genre: 다음 중 정확히 하나로 분류한다 —
   ${GENRES.map((g) => `"${g}"`).join(", ")}.
   안내서에 장르가 명시되면 그 값, 아니면 과제 성격으로 추론한다.
3. target_char_count: 목표 글자 수(정수). "800자 내외"면 800. 분량 언급이 없으면 null.
4. conditions: 글이 갖춰야 할 조건 목록(짧은 구). 예: "근거 2개 이상", "개요 포함", "출처 표기".
   없으면 빈 배열.
5. teacher_rubric_present: 안내서에 채점 기준·루브릭·배점·평가 요소가 포함되면 true, 아니면 false.

[confidence] 각 항목(prompt_text·genre·target_char_count)에 confidence를 매긴다.
- "confirmed": 안내서 본문에 명시적으로 적혀 있어 확신할 수 있을 때.
- "inferred": 본문에 없어 성격으로 추론했을 때(학생에게 확인을 요청할 값).

[출력 스키마]
{
  "prompt_text": { "value": string, "confidence": "confirmed"|"inferred" },
  "genre": { "value": string, "confidence": "confirmed"|"inferred" },
  "target_char_count": { "value": number|null, "confidence": "confirmed"|"inferred" },
  "conditions": string[],
  "teacher_rubric_present": boolean
}`;

export function buildExtractUserPrompt(rawText: string, channel?: string): string {
  const src = channel ? `입력 경로: ${channel}\n` : "";
  return `${src}다음은 선생님이 준 수행평가 안내서 원문이다. 위 스키마의 JSON으로 추출하라.\n\n---\n${rawText}\n---`;
}

// ── 입력 검증 ─────────────────────────────────────────────────────────
export type ExtractRequest = { raw_text: string; channel?: string };
export type ExtractValidation =
  | { ok: true; value: ExtractRequest }
  | { ok: false; code: ErrorCode; message?: string };

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function validateExtractRequest(raw: unknown): ExtractValidation {
  if (!isObject(raw)) return { ok: false, code: "E1", message: "요청 본문이 올바르지 않아요." };
  const rawText = raw.raw_text;
  if (typeof rawText !== "string")
    return { ok: false, code: "E1", message: "안내서 텍스트가 필요해요." };
  const trimmed = rawText.trim();
  if (trimmed.length < RAW_MIN)
    return { ok: false, code: "E2", message: "안내서 내용이 너무 짧아요. 좀 더 입력해 주세요." };
  if (trimmed.length > RAW_MAX)
    return { ok: false, code: "E3", message: `안내서는 ${RAW_MAX}자까지 분석할 수 있어요.` };
  const channel = typeof raw.channel === "string" ? raw.channel : undefined;
  return { ok: true, value: { raw_text: trimmed, channel } };
}

// ── 출력 스키마 검증 (위반 목록, 빈 배열 = 통과) ──────────────────────────
function isConf(v: unknown): v is Confidence {
  return v === "confirmed" || v === "inferred";
}

export function validateExtractOutput(o: unknown): string[] {
  const errs: string[] = [];
  if (!isObject(o)) return ["출력이 객체가 아님"];

  const pt = o.prompt_text;
  if (!isObject(pt) || typeof pt.value !== "string" || !pt.value.trim() || !isConf(pt.confidence))
    errs.push("prompt_text 형식 오류");

  const g = o.genre;
  if (!isObject(g) || typeof g.value !== "string" || !g.value.trim() || !isConf(g.confidence))
    errs.push("genre 형식 오류");

  const t = o.target_char_count;
  if (
    !isObject(t) ||
    !(t.value === null || typeof t.value === "number") ||
    !isConf(t.confidence)
  )
    errs.push("target_char_count 형식 오류");

  if (!Array.isArray(o.conditions) || o.conditions.some((c) => typeof c !== "string"))
    errs.push("conditions 형식 오류");

  if (typeof o.teacher_rubric_present !== "boolean") errs.push("teacher_rubric_present 형식 오류");

  return errs;
}

// ── 정규화 → ExtractedAssignment (서버 권위 후처리) ────────────────────────
//   Codex PR #67: 모델이 "설명문 " 같이 공백 섞인 값을 출력하면 enum 비교 실패 → "기타" 강등.
//   prompt_text/conditions와 일관되게 trim 후 비교.
//   confidence는 trim·정규화에 따라 격상하지 않음 — enum 일치는 원본 confidence 보존,
//   enum 외만 "기타" + inferred로 강등.
function normGenre(value: string, original: Confidence): { value: string; confidence: Confidence } {
  const trimmed = value.trim();
  if ((GENRES as readonly string[]).includes(trimmed))
    return { value: trimmed, confidence: original };
  return { value: "기타", confidence: "inferred" };
}

// 분량 정규화 — 표시 정책 (대표님 결정 2026-06-04 + Codex PR #67):
//   value = 안내서에 적힌 교사 의도값 그대로 (예: 5000자도 5000으로 유지).
//   작성·채점 가능 범위(50~2,000) cap은 score-client가 채점 호출 시점에 별도 처리.
//   오인식("5문단"→5 같은 ≤9 숫자)만 여기서 null로 차단 + altered=true(confidence inferred).
function normalizeTarget(raw: number | null): {
  value: number | null;
  altered: boolean;
} {
  if (raw === null || !Number.isFinite(raw)) return { value: null, altered: false };
  const n = Math.round(raw);
  if (n <= 9) return { value: null, altered: true }; // 오인식 차단
  return { value: n, altered: false }; // 5000도 표시·channel은 score-client 책임
}

// 검증 통과한 모델 출력 + 원문/채널 → 화면용 ExtractedAssignment.
//   raw_excerpt: 파일·사진·링크 채널은 원문 일부를 미리보기로 제공(타이핑·붙여넣기는 사용자가 이미 봄).
export function finalizeExtraction(
  parsed: {
    prompt_text: { value: string; confidence: Confidence };
    genre: { value: string; confidence: Confidence };
    target_char_count: { value: number | null; confidence: Confidence };
    conditions: string[];
    teacher_rubric_present: boolean;
  },
  rawText: string,
  channel?: string,
): ExtractedAssignment {
  const genre = normGenre(parsed.genre.value, parsed.genre.confidence);

  const conditions = Array.from(
    new Set(parsed.conditions.map((c) => c.trim()).filter(Boolean)),
  ).slice(0, CONDITIONS_MAX);

  const showExcerpt = channel === "file" || channel === "photo" || channel === "link";

  // 분량: 교사 의도값 그대로 (오인식 ≤9만 null로 차단). 채점 cap은 score-client 책임.
  const { value: targetValue, altered: targetAltered } = normalizeTarget(
    parsed.target_char_count.value,
  );
  const targetConfidence: Confidence = targetAltered
    ? "inferred"
    : parsed.target_char_count.confidence;

  return {
    prompt_text: {
      value: parsed.prompt_text.value.trim().slice(0, PROMPT_VALUE_MAX),
      confidence: parsed.prompt_text.confidence,
    },
    genre,
    target_char_count: {
      value: targetValue,
      confidence: targetConfidence,
    },
    conditions,
    teacher_rubric_present: parsed.teacher_rubric_present,
    raw_excerpt: showExcerpt ? rawText.slice(0, 400) : undefined,
  };
}
