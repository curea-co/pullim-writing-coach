import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// fe-styling 기준: 조건부 클래스 조합 시 항상 cn() 사용
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
