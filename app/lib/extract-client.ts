// extract-client — 안내서 캡처 ↔ 실제 /api/extract 연결 (FE 전용).
//   안내서 원문 → 구조화된 ExtractedAssignment. 채점(score-client)과 같은 토큰·에러·토글 규약.
//
// 2026-06-08 v2 이식 (Phase 1 PR A) — ExtractedAssignment를 컴포넌트가 아니라 lib/extract에서 import.
// Codex PR #67: 성공 경로 JSON 파싱·스키마 방어 + 추출 전용 메시지 맵 분리.

import { type ExtractChannel, type ExtractedAssignment } from "./extract";
import { type ErrorCode } from "./grading";

export type ExtractErrorCode = ErrorCode | "E-NETWORK" | "E-PARSE";

// Codex PR #67: ERROR_MESSAGE는 채점용 카피. extract는 E2/E3가 안내서 길이 의미라 별도 맵.
//   server가 message 없이 code만 보내거나 errorEnvelope 기본값 사용 시 추출 컨텍스트 카피 노출.
const EXTRACT_MESSAGE: Record<ExtractErrorCode, string> = {
  "E-PARSE": "추출 결과 형식이 올바르지 않아요. 다시 시도해 주세요.",
  "E-AUTH": "데모 비밀번호를 다시 확인해 주세요.",
  "E-CAP": "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.",
  "E-NETWORK": "인터넷 연결을 확인하고 다시 시도해 주세요.",
  E1: "안내서 정보가 올바르지 않아요. 다시 입력해 주세요.",
  E2: "안내서 내용이 너무 짧아요. 좀 더 입력해 주세요.",
  E3: "안내서가 너무 길어요. 8,000자 이내로 줄여 주세요.",
  E4: "지금 추출이 지연되고 있어요. 다시 시도해 주세요.",
  E5: "추출 결과를 다시 만들어야 해요. 잠시 후 다시 시도해 주세요.",
  E6: "추출 결과를 다시 만들어야 해요. 잠시 후 다시 시도해 주세요.",
  E8: "일시적 오류예요. 잠시 후 다시 시도해 주세요.",
  E10: "분량 정보가 올바르지 않아요.",
  E11: "안내서가 비어 있어요. 내용을 입력해 주세요.",
};

function msgFor(code: ExtractErrorCode): string {
  return EXTRACT_MESSAGE[code] ?? EXTRACT_MESSAGE.E8;
}

export class ExtractError extends Error {
  code: ExtractErrorCode;
  userMessage: string;
  constructor(code: ExtractErrorCode, userMessage: string) {
    super(`${code}: ${userMessage}`);
    this.name = "ExtractError";
    this.code = code;
    this.userMessage = userMessage;
  }
}

// 응답이 ExtractedAssignment 모양인지 깊이 검증 — Codex PR #67: typeof "object"만 보면
//   null·배열·{value:123} 같은 값도 통과. 각 중첩 필드 value/confidence 타입까지 확인.
function isConf(v: unknown): boolean {
  return v === "confirmed" || v === "inferred";
}

function looksLikeExtractedAssignment(v: unknown): v is ExtractedAssignment {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;

  const pt = o.prompt_text;
  if (!pt || typeof pt !== "object" || Array.isArray(pt)) return false;
  const ptObj = pt as Record<string, unknown>;
  if (typeof ptObj.value !== "string" || !isConf(ptObj.confidence)) return false;

  const g = o.genre;
  if (!g || typeof g !== "object" || Array.isArray(g)) return false;
  const gObj = g as Record<string, unknown>;
  if (typeof gObj.value !== "string" || !isConf(gObj.confidence)) return false;

  const t = o.target_char_count;
  if (!t || typeof t !== "object" || Array.isArray(t)) return false;
  const tObj = t as Record<string, unknown>;
  if (!(tObj.value === null || typeof tObj.value === "number")) return false;
  if (!isConf(tObj.confidence)) return false;

  if (!Array.isArray(o.conditions) || o.conditions.some((c) => typeof c !== "string"))
    return false;
  if (typeof o.teacher_rubric_present !== "boolean") return false;
  return true;
}

// 안내서 원문 → /api/extract 호출 → 검증된 ExtractedAssignment. 실패는 ExtractError로 throw.
//   SSO 정합: 인가는 서버 verifyWritingAccess(쿠키/me)가 권위. token은 로컬 데모 fallback 전용이라
//   선택값이며, 있을 때만 x-demo-token을 부착한다(부재가 곧 차단이 되지 않게 — prod authed 사용자는
//   데모토큰이 없다). 동일 출처 요청이라 access 쿠키(Domain=.pullim.ai)는 자동 전송된다.
export async function extractAssignment(
  rawText: string,
  channel: ExtractChannel,
  token?: string,
): Promise<ExtractedAssignment> {
  let res: Response;
  try {
    res = await fetch("/api/extract", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(token ? { "x-demo-token": token } : {}),
      },
      credentials: "include",
      body: JSON.stringify({ raw_text: rawText, channel }),
    });
  } catch {
    throw new ExtractError("E-NETWORK", msgFor("E-NETWORK"));
  }

  if (!res.ok) {
    let code: ExtractErrorCode = "E8";
    let serverMsg: string | undefined;
    try {
      const j = (await res.json()) as { error?: { code?: ErrorCode; message?: string } };
      if (j?.error?.code) code = j.error.code;
      serverMsg = j?.error?.message;
    } catch {
      /* body 파싱 실패 → code/message 추출 못함, 기본 E8 */
    }
    throw new ExtractError(code, serverMsg ?? msgFor(code));
  }

  // Codex PR #67: 성공 응답도 JSON 파싱·스키마 방어. SyntaxError·잘못된 객체 UI 전파 차단.
  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new ExtractError("E-PARSE", msgFor("E-PARSE"));
  }
  if (!looksLikeExtractedAssignment(json)) {
    throw new ExtractError("E-PARSE", msgFor("E-PARSE"));
  }
  return json;
}
