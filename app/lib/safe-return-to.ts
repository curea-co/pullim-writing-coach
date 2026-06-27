// 로그인 후 이동할 returnTo — same-origin 경로만 허용(open redirect 방지).
//   "/path"만 통과. "//host"·"/\host"(프로토콜-상대)·"https://…"(절대 URL) 등 외부 이동은 거부하고 홈으로.
export function safeReturnTo(rt: string | null | undefined): string {
  if (typeof rt !== "string") return "/";
  if (!rt.startsWith("/")) return "/"; // 절대 URL·상대 경로 거부
  if (rt.startsWith("//") || rt.startsWith("/\\")) return "/"; // 프로토콜-상대(외부) 거부
  return rt;
}
