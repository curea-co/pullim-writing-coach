// extract-client — 안내서 캡처 ↔ 실제 /api/extract 연결 (FE 전용).
//   안내서 원문 → 구조화된 ExtractedAssignment. 채점(score-client)과 같은 토큰·에러·토글 규약.
//
// 2026-06-08 v2 이식 (Phase 1 PR A) — ExtractedAssignment를 컴포넌트가 아니라 lib/extract에서 import.

import { type ExtractedAssignment } from "./extract";
import { ERROR_MESSAGE, type ErrorCode } from "./grading";

// 라이브/mock 토글 API는 Phase 1 PR D(페이지 통합) 시 도입.
//   여기는 fetch 래퍼만 — 호출자가 toggle 분기 책임.
//   예정 env: NEXT_PUBLIC_USE_LIVE_EXTRACTION (인벤토리 docs/26 §9).

export type ExtractErrorCode = ErrorCode | "E-NETWORK";

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

const NETWORK_MESSAGE = "인터넷 연결을 확인하고 다시 시도해 주세요.";

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
    throw new ExtractError("E-NETWORK", NETWORK_MESSAGE);
  }

  if (!res.ok) {
    let code: ErrorCode = "E8";
    try {
      const j = (await res.json()) as { error?: { code?: ErrorCode; message?: string } };
      if (j?.error?.code) code = j.error.code;
      throw new ExtractError(code, j?.error?.message ?? ERROR_MESSAGE[code]);
    } catch (e) {
      if (e instanceof ExtractError) throw e;
      throw new ExtractError(code, ERROR_MESSAGE[code]);
    }
  }

  return (await res.json()) as ExtractedAssignment;
}
