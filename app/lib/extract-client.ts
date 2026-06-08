// extract-client — 안내서 캡처 ↔ 실제 /api/extract 연결 (FE 전용).
//   안내서 원문 → 구조화된 ExtractedAssignment. 채점(score-client)과 같은 토큰·에러·토글 규약.
//
// 2026-06-08 v2 이식 (Phase 1 PR A) — ExtractedAssignment를 컴포넌트가 아니라 lib/extract에서 import.
// Codex PR #67: 성공 경로 JSON 파싱·스키마 방어 + 추출 전용 메시지 맵 분리.

import { type ExtractedAssignment } from "./extract";
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

// 응답이 ExtractedAssignment 모양인지 최소 검증 — server가 형식 어긋난 200 응답 시 UI 보호.
function looksLikeExtractedAssignment(v: unknown): v is ExtractedAssignment {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.prompt_text === "object" &&
    typeof o.genre === "object" &&
    typeof o.target_char_count === "object" &&
    Array.isArray(o.conditions) &&
    typeof o.teacher_rubric_present === "boolean"
  );
}

// 안내서 원문 → /api/extract 호출 → 검증된 ExtractedAssignment. 실패는 ExtractError로 throw.
export async function extractAssignment(
  rawText: string,
  channel: string,
  token: string,
): Promise<ExtractedAssignment> {
  let res: Response;
  try {
    res = await fetch("/api/extract", {
      method: "POST",
      headers: { "content-type": "application/json", "x-demo-token": token },
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
