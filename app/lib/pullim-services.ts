// Pullim Writing Coach — 헤더 서비스 전환(드롭다운) 서비스 목록·핸드오프 URL.
//   풀림 OS(pullim-web)의 ServiceSwitcher/os-services.ts를 이식. 티어 파생 로직은 OS와 동일하게
//   **자기 origin이 아니라 NEXT_PUBLIC_OS_URL**에서 dev/prod/local을 뽑는다(앱별 핸드오프 env가
//   누락돼도 티어가 유지되는 OS의 검증된 규칙). NEXT_PUBLIC_* 는 빌드타임 인라인 → 런타임 분기 없음.

import type { ServiceIconName } from "@/components/ui/service-icon";
import { osHubUrl } from "@/app/lib/pullim-login";

// 배포 티어를 OS origin(NEXT_PUBLIC_OS_URL)에서 파생:
//   dev-os.pullim.ai → 'dev' · os.pullim.ai → 'prod' · os.localhost/.pullim.local/미설정 → 'local'.
function osTier(): "dev" | "prod" | "local" {
  const os = process.env.NEXT_PUBLIC_OS_URL ?? "";
  if (!os || os.includes("localhost") || os.includes(".local")) return "local";
  return os.replace(/^https?:\/\//, "").startsWith("dev-") ? "dev" : "prod";
}

// 앱별 명시 origin override(OS siblingAppUrl의 explicit 분기 정합). **최우선** — 있으면 티어 파생을 건너뛴다.
//   OS가 로컬에서 앱별 핸드오프를 검증하는 방식과 동일: .env.local에 로컬 앱 origin을 넣으면 서비스 전환이
//   그 로컬 앱으로 실제 위임된다(Codex #135: 로컬에서 전 항목이 OS 허브 하나로 붕괴하지 않게 하는 경로).
//   NEXT_PUBLIC_* 는 빌드타임 인라인 → 리터럴 접근이어야 하므로 동적 키 조회 대신 정적 맵.
const APP_ORIGIN_OVERRIDE: Record<string, string | undefined> = {
  planner: process.env.NEXT_PUBLIC_PLANNER_URL,
  classbot: process.env.NEXT_PUBLIC_CLASSBOT_URL,
  q: process.env.NEXT_PUBLIC_Q_URL,
  games: process.env.NEXT_PUBLIC_GAMES_URL,
  admissions: process.env.NEXT_PUBLIC_ADMISSIONS_URL,
  store: process.env.NEXT_PUBLIC_STORE_URL,
  studio: process.env.NEXT_PUBLIC_STUDIO_URL,
  jr: process.env.NEXT_PUBLIC_JR_URL,
  arcade: process.env.NEXT_PUBLIC_ARCADE_URL,
};

// 독립 앱 핸드오프 URL. 우선순위:
//   1) 앱별 명시 override(NEXT_PUBLIC_<APP>_URL) — 로컬에서 서비스별 핸드오프 검증에 사용(위 맵).
//   2) dev-os 표면 → https://dev-<app>.pullim.ai · prod-os → https://<app>.pullim.ai (+path).
//   3) override 없는 **로컬**은 실서비스 도메인으로 새지 않게 OS 허브(osHubUrl, os.pullim.local)로 위임 —
//      로컬 SSO 검증 중 운영 도메인으로 튀어 쿠키/세션 조건이 달라지는 회귀(Codex #135) 차단. path 미부착.
function appHref(app: string, path = ""): string {
  const override = APP_ORIGIN_OVERRIDE[app];
  if (override) return `${override.replace(/\/$/, "")}${path}`;
  const tier = osTier();
  if (tier === "local") return osHubUrl();
  const base = tier === "dev" ? `https://dev-${app}.pullim.ai` : `https://${app}.pullim.ai`;
  return `${base}${path}`;
}

export type SwitcherService = {
  slug: string;
  name: string;
  icon: ServiceIconName; // 인라인 SVG(ServiceIcon) — 아이콘 파일/next Image 불필요
  href: string;
  desc: string; // 태그라인(OS os-services 정합)
};

// 노출 목록(pullim-planner 정합, 사용자 확정 2026-07-12) — 개통된 5개 서비스만 노출한다:
//   플래너·문제큐(q)·라이팅 코치(writing)·스튜디오(studio)·아케이드(arcade).
// 숨김(완전 비노출): 클래스봇·게임즈·입시 코치·스토어·주니어 — soon 배지가 아니라 목록에서 제외.
//   개통·노출 결정 시 아래 항목 복원: classbot(app 'classbot'), games(app 'games'+path '/games'),
//   exam(app 'admissions'), store(app 'store'), junior(app 'jr', icon 'pullim').
export const CURRENT_SLUG = "writing";

export function switcherServices(): SwitcherService[] {
  return [
    { slug: "planner", name: "플래너", icon: "planner", href: appHref("planner", "/planner"), desc: "내 공부, 내가 설계한다." },
    { slug: "q", name: "문제큐", icon: "q", href: appHref("q"), desc: "풀고, 틀리고, 다시 자라난다." },
    { slug: "writing", name: "라이팅 코치", icon: "writing", href: "/", desc: "한 줄, 한 단락이 더 좋아진다." },
    { slug: "studio", name: "스튜디오", icon: "studio", href: appHref("studio"), desc: "제작은 AI가, 검증은 사람이." },
    { slug: "arcade", name: "아케이드", icon: "games", href: appHref("arcade"), desc: "무료로 즐기는 학습 아케이드." },
  ];
}
