import type { AreaName } from "@/app/data/scoring";

// 성장 스토리 공유 텍스트 — **화이트리스트 토큰만**. draft 본문·nudge·점수 정수는 절대 미포함(대필 누출 차단).
//   클립보드로 학생이 복사할 유일한 산출물 → 본문/점수 한 글자도 새면 불변식 위반.
export function formatStoryText(input: { title: string; genre: string; revisions: number; breakthroughs: AreaName[] }): string {
  const lines = [
    `📝 ${input.title} (${input.genre})`,
    `고쳐쓰기 ${input.revisions}회 — 내 손으로 끝까지 다듬었어요.`,
  ];
  if (input.breakthroughs.length > 0) lines.push(`막힌 곳을 뚫은 영역: ${input.breakthroughs.join(", ")}`);
  lines.push(`🔒 코치 문장 0개 · 작성 주체 학생 본인`);
  return lines.join("\n");
}
