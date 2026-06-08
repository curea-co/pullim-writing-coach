// Pullim Writing Coach — Anthropic 서버 헬퍼 (공유, EPIC2 T2.3)
// app/api/score/route.ts 의 private 헬퍼(timingSafeEqualStr·isAuthorized·callModel·ModelError·jsonError)를
// /api/score 와 /api/coach 가 함께 재사용할 수 있도록 server 전용 모듈로 추출했다.
//
// 모듈 경계: 이 파일은 **순수가 아니다**. node:crypto·env·fetch(부수효과)를 사용한다.
//   → app/lib/server/* 만 server 전용 부수효과를 가질 수 있다. app/lib/*.ts(grading.ts 등)는 순수 유지.
//   FE/노드 테스트는 이 파일을 import하지 않는다 (server-only 경계).
//
// ⚠️ 계약 §6 divergence(route.ts와 동일): 계약은 `@anthropic-ai/sdk`(timeout/maxRetries=0)를 명시하나,
//    본 구현은 verify.mjs와 동일하게 raw fetch + AbortController로 이식했다. 의미는 동일 —
//    timeout(AbortController), 업스트림 429/5xx·네트워크 자동재시도 없음(=maxRetries:0).
//    신규 의존성을 추가하지 않고 grading.ts/prompt.ts 순수성(§9 S4)을 유지하기 위함.

import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import type { ErrorCode } from "@/app/lib/grading";

// ── 모델 호출 엔드포인트 (12 §6) ─────────────────────────────────────
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

// ════════════════════════════════════════════════════════════════════
// G1 토큰 게이트 (12 §7) — x-demo-token 상수시간 비교, fail-closed
// ════════════════════════════════════════════════════════════════════

// 길이 누설 방지: 양쪽을 고정 길이 해시로 비교 (timingSafeEqual은 길이 다르면 throw).
function timingSafeEqualStr(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a, "utf8").digest();
  const hb = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(ha, hb);
}

/**
 * x-demo-token 헤더를 env DEMO_ACCESS_TOKEN 과 상수시간 비교한다.
 * 비밀이 미설정이면 fail-closed(전부 거부) — 익명 인터넷 차단.
 * 호출부(route)는 false면 E-AUTH(401)로 응답한다.
 *
 * @param routeTag 로그 식별용 라우트 태그 (예: "/api/score", "/api/coach")
 */
export function isAuthorized(req: Request, routeTag = "/api"): boolean {
  const expected = process.env.DEMO_ACCESS_TOKEN;
  if (!expected) {
    console.warn(`[${routeTag}] DEMO_ACCESS_TOKEN 미설정 — 모든 요청 401 처리`);
    return false;
  }
  const provided = req.headers.get("x-demo-token") ?? "";
  return timingSafeEqualStr(provided, expected);
}

// ════════════════════════════════════════════════════════════════════
// 모델 단일 호출 (verify.mjs callApi 이식, 자동재시도 제거 = maxRetries:0)
//   /api/score 와 /api/coach 가 공유. system/prefill/budget을 파라미터화했다.
// ════════════════════════════════════════════════════════════════════

export type ModelError = { code: Extract<ErrorCode, "E4" | "E8">; detail: string };

export function isModelError(e: unknown): e is ModelError {
  return typeof e === "object" && e !== null && "code" in e;
}

export type CallModelParams = {
  /** user 메시지 본문 (buildUserPrompt 결과 등) */
  userPrompt: string;
  /** system 프롬프트 단일 소스 (SYSTEM_PROMPT 등). ephemeral 캐시로 전송. */
  systemPrompt: string;
  /** max_tokens (score=2000) */
  maxTokens: number;
  /** temperature (score=0.2) */
  temperature: number;
  /** AbortController 타임아웃(ms). 남은 예산을 넘긴다. */
  timeoutMs: number;
  /**
   * assistant 프리필 문자열(예: "{"). 지정 시:
   *  - messages에 { role:"assistant", content: prefill } 를 덧붙여 출력 형식을 강제
   *  - 응답엔 프리필이 echo되지 않으므로 반환 텍스트 앞에 prefill을 prepend(복원)
   * 미지정 시 assistant 메시지 없이 호출하고 본문을 그대로 반환.
   */
  prefill?: string;
};

/**
 * Anthropic Messages API 단일 호출. 자동재시도 없음(maxRetries:0).
 * 실패 매핑: abort→E4(타임아웃), 그 외 fetch 실패·업스트림 429/5xx→E8. (둘 다 ModelError throw)
 * 성공 시 text 블록 join 결과(프리필 지정 시 prepend 복원)를 반환.
 */
export async function callModel(params: CallModelParams): Promise<string> {
  const { userPrompt, systemPrompt, maxTokens, temperature, timeoutMs, prefill } = params;

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw { code: "E8", detail: "ANTHROPIC_API_KEY 미설정" } satisfies ModelError;
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  const messages: Array<{ role: "user" | "assistant"; content: string }> = [
    { role: "user", content: userPrompt },
  ];
  // JSON 강제 프리필 (12 §6 / S2) — 응답엔 echo되지 않으므로 호출부에서 prepend 복원.
  if (prefill !== undefined) messages.push({ role: "assistant", content: prefill });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(timeoutMs, 1));
  let res: Response;
  try {
    res = await fetch(ANTHROPIC_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        // system 캐싱 (12 §6) — 데모 트래픽은 산발적이라 적중률 낮지만 정합 목적.
        system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
        messages,
      }),
    });
  } catch (e) {
    // AbortController abort → 타임아웃(E4), 그 외 fetch 실패 → 네트워크(E8). 자동재시도 없음.
    if (e instanceof Error && e.name === "AbortError")
      throw { code: "E4", detail: "model timeout" } satisfies ModelError;
    throw { code: "E8", detail: e instanceof Error ? e.message : "network" } satisfies ModelError;
  } finally {
    clearTimeout(timer);
  }

  // 업스트림 429/5xx → 503(E8). 자동 백오프 재시도 안 함 (maxDuration 예산 보호).
  if (!res.ok) {
    throw { code: "E8", detail: `upstream HTTP ${res.status}` } satisfies ModelError;
  }

  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const body = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("");
  // 프리필 지정 시 prepend 복원, 아니면 본문 그대로.
  return prefill !== undefined ? `${prefill}${body}` : body;
}
