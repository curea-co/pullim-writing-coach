// /api/extract route 내부 helpers — 단위 테스트 가능 위해 분리.
//   Node test runner는 Next.js `@/app/...` path alias 미지원 → relative import만 사용하는
//   helpers.ts에 분리. route.ts는 helpers.ts에서 import.
//   2026-06-09 Codex PR #69 — route 통합 테스트(callAnthropic mock + DI 리팩토링)는 별도 PR.

import { createHash, timingSafeEqual } from "node:crypto";
import { ERROR_HTTP, type ErrorCode, errorEnvelope } from "../../lib/grading";

// ── 토큰 게이트 (x-demo-token 상수시간 비교) ─────────────────────────────
export function timingSafeEqualStr(a: string, b: string): boolean {
  // 길이 누설 방지: 양쪽을 고정 길이 해시로 비교 (timingSafeEqual은 길이 다르면 throw).
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

export function isAuthorized(req: Request): boolean {
  const expected = process.env.DEMO_ACCESS_TOKEN;
  if (!expected) {
    // fail-closed: 비밀이 등록 안 됐으면 아무도 통과시키지 않는다 (익명 인터넷 차단).
    console.warn("[/api/extract] DEMO_ACCESS_TOKEN 미설정 — 모든 요청 401 처리");
    return false;
  }
  const provided = req.headers.get("x-demo-token") ?? "";
  return timingSafeEqualStr(provided, expected);
}

// Codex PR #69: grading.ts errorEnvelope 기본 카피는 채점 컨텍스트("결과를 다시 만들어야 해요"·
//   "지금 첨삭이 지연되고 있어요"). extract 컨텍스트와 다름. 서버 응답에 추출 전용 메시지
//   명시해 FE의 EXTRACT_MESSAGE 분리 의도 실효 (extract-client는 server message 우선 사용).
//
//   예외 (Codex PR #69):
//   - E1·E2·E3: validateExtractRequest가 컨텍스트 메시지 자체 제공 → jsonError는 그 외 코드용
//   - E-CAP: docs/27 정책상 /api/score와 동일 envelope 통일 → 본 맵 제외 (grading.ts 기본 사용)
export const EXTRACT_MESSAGE: Partial<Record<ErrorCode, string>> = {
  "E-PARSE": "추출 결과 형식이 올바르지 않아요. 다시 시도해 주세요.",
  "E-AUTH": "데모 비밀번호를 다시 확인해 주세요.",
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

// EXTRACT_MESSAGE에 카피 있으면 그것, 없으면 grading.ts errorEnvelope 기본(E-CAP 등 공유 코드).
export function jsonError(code: ErrorCode): Response {
  const customMessage = EXTRACT_MESSAGE[code];
  return Response.json(errorEnvelope(code, customMessage), { status: ERROR_HTTP[code] });
}

// ── 메트릭 로깅 (12 §4.3 · /api/score 동일 패턴) ──────────────────────────
export function logMetric(event: string, extra: Record<string, unknown> = {}): void {
  console.warn(`[/api/extract][metric] ${JSON.stringify({ event, ...extra })}`);
}
