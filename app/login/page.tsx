import { redirect } from "next/navigation";
import { headers } from "next/headers";

// 호환 redirect — 기존 북마크/외부 링크로 /login 직접 진입 시 중앙 SSO 로그인(pullim-web)으로 보낸다.
//   ?next= / ?returnTo= 가 same-origin 경로면 현재 origin 전체 URL로 만들어 중앙 next 로 전달(복귀 보존).
const WEB_BASE = (process.env.NEXT_PUBLIC_WEB_URL ?? "https://pullim.ai").replace(/\/$/, "");

function safePath(v: string | string[] | undefined): string | null {
  const s = Array.isArray(v) ? v[0] : v;
  if (s && s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\")) return s;
  return null;
}

export default async function LoginCompatRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<never> {
  const sp = await searchParams;
  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  const origin = host ? `${proto}://${host}` : "";
  const path = safePath(sp.next) ?? safePath(sp.returnTo);
  const next = path && origin ? `${origin}${path}` : null;
  redirect(`${WEB_BASE}/login${next ? `?next=${encodeURIComponent(next)}` : ""}`);
}
