import "server-only";
// anthropic — 단일 모델 호출 유틸 (서버 전용).
//   /api/score(route.ts)·/api/extract(route.ts)에서 공유하는 호출 표면.
//   raw fetch + AbortController, 자동재시도 없음(maxRetries:0), JSON 강제 프리필 "{".
//   계약 §6 정합 — 신규 SDK 의존 없이 verify.mjs와 같은 호출 방식.
//
// 이 모듈은 server-only 부수효과(env·fetch)를 담는다. FE에서 import 금지.
// 2026-06-08 v2 이식 (Phase 1 PR A).

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
export const DEFAULT_MODEL = "claude-haiku-4-5-20251001";

// 모델 호출 실패 — 라우트가 그대로 에러봉투로 변환(E4 타임아웃 / E8 네트워크·업스트림).
export type ModelCallError = { code: "E4" | "E8"; detail: string };

export function isModelCallError(e: unknown): e is ModelCallError {
  return typeof e === "object" && e !== null && "code" in e;
}

export type CallOptions = {
  system: string;
  userPrompt: string;
  timeoutMs: number;
  maxTokens: number;
  temperature?: number;
};

// system 캐싱 + assistant 프리필 "{" 사용. 응답엔 프리필이 echo되지 않으므로 "{"를 prepend해 반환.
export async function callAnthropic({
  system,
  userPrompt,
  timeoutMs,
  maxTokens,
  temperature = 0.2,
}: CallOptions): Promise<string> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw { code: "E8", detail: "ANTHROPIC_API_KEY 미설정" } satisfies ModelCallError;
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

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
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        messages: [
          { role: "user", content: userPrompt },
          { role: "assistant", content: "{" },
        ],
      }),
    });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError")
      throw { code: "E4", detail: "model timeout" } satisfies ModelCallError;
    throw { code: "E8", detail: e instanceof Error ? e.message : "network" } satisfies ModelCallError;
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    throw { code: "E8", detail: `upstream HTTP ${res.status}` } satisfies ModelCallError;
  }

  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const body = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("");
  return `{${body}`; // 프리필 "{" 복원
}
