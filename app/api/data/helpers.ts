// /api/data route 내부 helpers — 노드 테스트 가능 위해 relative import만 사용.
import { ERROR_HTTP, type ErrorCode, errorEnvelope } from "../../lib/grading";

export function jsonError(code: ErrorCode): Response {
  return Response.json(errorEnvelope(code), { status: ERROR_HTTP[code] });
}

// 자격증명·payload 본문 로깅 금지 — 사실(event·route·상태)만.
export function logMetric(event: string, extra: Record<string, unknown> = {}): void {
  console.warn(`[/api/data][metric] ${JSON.stringify({ event, ...extra })}`);
}
