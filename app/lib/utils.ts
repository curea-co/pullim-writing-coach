import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// fe-styling 기준: 조건부 클래스 조합 시 항상 cn() 사용
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Codex PR #12: prefers-reduced-motion 사용자에게는 smooth 스크롤도 큰 모션이라 회피.
// matchMedia 결과 true면 "auto", 아니면 "smooth". SSR/구버전 가드 포함.
export function scrollBehavior(): ScrollBehavior {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "auto";
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}
