// Anthropic API 키·결제·모델 접근 점검용 1회 테스트 호출.
// 실행: node --env-file=.env.local scripts/test-call.mjs
// 키 값은 절대 출력하지 않는다.

const key = process.env.ANTHROPIC_API_KEY;
const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

if (!key || !key.startsWith("sk-ant-")) {
  console.error("FAIL: ANTHROPIC_API_KEY 미설정 또는 형식 오류 (sk-ant- 로 시작해야 함)");
  process.exit(1);
}
console.log(`키 형식 OK (sk-ant-…, 길이 ${key.length}) · 모델 ${model}`);

const started = Date.now();
try {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 16,
      messages: [{ role: "user", content: "정확히 'OK'라고만 답하세요." }],
    }),
  });

  const ms = Date.now() - started;
  const data = await res.json();

  if (!res.ok) {
    console.error(`FAIL: HTTP ${res.status} (${ms}ms)`);
    console.error(`type: ${data?.error?.type ?? "?"} / message: ${data?.error?.message ?? JSON.stringify(data)}`);
    process.exit(1);
  }

  const text = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();

  console.log("PASS: 호출 성공");
  console.log(`- 응답 시간: ${ms}ms`);
  console.log(`- 응답 모델: ${data.model}`);
  console.log(`- stop_reason: ${data.stop_reason}`);
  console.log(`- usage: in ${data.usage?.input_tokens} / out ${data.usage?.output_tokens} tokens`);
  console.log(`- 응답 내용: "${text}"`);
} catch (e) {
  console.error(`FAIL: 네트워크/예외 — ${e.message}`);
  process.exit(1);
}
