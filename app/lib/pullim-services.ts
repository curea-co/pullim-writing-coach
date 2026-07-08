// Pullim Writing Coach — 헤더 서비스 전환(드롭다운) 서비스 목록·핸드오프 URL.
//   풀림 OS(pullim-web)의 ServiceSwitcher/os-services.ts를 이식. 티어 파생 로직은 OS와 동일하게
//   **자기 origin이 아니라 NEXT_PUBLIC_OS_URL**에서 dev/prod/local을 뽑는다(앱별 핸드오프 env가
//   누락돼도 티어가 유지되는 OS의 검증된 규칙). NEXT_PUBLIC_* 는 빌드타임 인라인 → 런타임 분기 없음.

import type { ServiceIconName } from "@/components/ui/service-icon";

// 배포 티어를 OS origin(NEXT_PUBLIC_OS_URL)에서 파생:
//   dev-os.pullim.ai → 'dev' · os.pullim.ai → 'prod' · os.localhost/.pullim.local/미설정 → 'local'.
function osTier(): "dev" | "prod" | "local" {
  const os = process.env.NEXT_PUBLIC_OS_URL ?? "";
  if (!os || os.includes("localhost") || os.includes(".local")) return "local";
  return os.replace(/^https?:\/\//, "").startsWith("dev-") ? "dev" : "prod";
}

// 독립 앱 핸드오프 origin. dev-os 표면 → https://dev-<app>.pullim.ai · 그 외(prod·local) → https://<app>.pullim.ai.
//   로컬은 앱별 독립 origin이 없으므로 prod로 폴백(OS도 앱별 .env.local 없으면 동일하게 동작).
function appUrl(app: string): string {
  return osTier() === "dev" ? `https://dev-${app}.pullim.ai` : `https://${app}.pullim.ai`;
}

export type SwitcherService = {
  slug: string;
  name: string;
  icon: ServiceIconName; // 인라인 SVG(ServiceIcon) — 아이콘 파일/next Image 불필요
  href: string;
  desc: string; // 태그라인(OS os-services 정합)
};

// OS_SERVICES_NAV(비숨김·카탈로그 순서) 이식. 현재 앱(writing)은 자기 origin('/')으로 두고 CURRENT_SLUG로 강조.
//   junior/arcade는 OS와 동일하게 전용 아이콘 미정(pullim/games 아이콘 공유).
export const CURRENT_SLUG = "writing";

export function switcherServices(): SwitcherService[] {
  return [
    { slug: "planner", name: "플래너", icon: "planner", href: `${appUrl("planner")}/planner`, desc: "내 공부, 내가 설계한다." },
    { slug: "classbot", name: "클래스봇", icon: "classbot", href: appUrl("classbot"), desc: "선생님의 분신을 만든다." },
    { slug: "q", name: "문제큐", icon: "q", href: appUrl("q"), desc: "풀고, 틀리고, 다시 자라난다." },
    { slug: "games", name: "게임즈", icon: "games", href: `${appUrl("games")}/games`, desc: "숙제 끝나고 30분 더 한다." },
    { slug: "writing", name: "라이팅 코치", icon: "writing", href: "/", desc: "한 줄, 한 단락이 더 좋아진다." },
    { slug: "exam", name: "입시 코치", icon: "exam", href: appUrl("admissions"), desc: "입시 준비를 데이터로 한다." },
    { slug: "store", name: "스토어", icon: "store", href: appUrl("store"), desc: "검증된 콘텐츠만 사고 판다." },
    { slug: "studio", name: "스튜디오", icon: "studio", href: appUrl("studio"), desc: "제작은 AI가, 검증은 사람이." },
    { slug: "junior", name: "주니어", icon: "pullim", href: appUrl("jr"), desc: "초등, 즐겁게 시작하는 첫 학습." },
    { slug: "arcade", name: "아케이드", icon: "games", href: appUrl("arcade"), desc: "무료로 즐기는 학습 아케이드." },
  ];
}
