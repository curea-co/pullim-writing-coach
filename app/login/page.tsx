import { redirect } from "next/navigation";

// 호환 redirect — 기존 북마크/외부 링크로 /login 직접 진입 시 중앙 SSO 로그인(pullim-web)으로 보낸다.
//   (헤더 로그인 버튼은 loginUrl()로 next 포함 리다이렉트 — 이 페이지는 next 없는 진입점 404 방지용.)
const WEB_BASE = (process.env.NEXT_PUBLIC_WEB_URL ?? "https://pullim.ai").replace(/\/$/, "");

export default function LoginCompatRedirect(): never {
  redirect(`${WEB_BASE}/login`);
}
