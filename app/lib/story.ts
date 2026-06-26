import type { AreaName } from "@/app/data/scoring";

// 자유입력(과제명·장르)을 한 줄 라벨로 정규화 — 줄바꿈/공백 폭주를 단일 공백으로 접고 40자로 절단.
//   호출부 신뢰가 아니라 이 함수가 직접 '한 줄 토큰' 불변식을 보장(임의 문구/줄바꿈이 카드를 깨지 못함).
function oneLine(s: string, max = 40): string {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

// 성장 스토리 공유 텍스트 — **화이트리스트 토큰만**. draft 본문·nudge·점수 정수는 절대 미포함(대필 누출 차단).
//   클립보드로 학생이 복사할 유일한 산출물 → 본문/점수 한 글자도 새면 불변식 위반.
//   title/genre는 검증 없는 자유입력이므로 oneLine으로 정규화·절단해 비허용 텍스트/줄바꿈 유입을 차단한다.
export function formatStoryText(input: { title: string; genre: string; revisions: number; breakthroughs: AreaName[] }): string {
  const title = oneLine(input.title);
  const genre = oneLine(input.genre, 20);
  const lines = [
    `📝 ${title}${genre ? ` (${genre})` : ""}`,
    `고쳐쓰기 ${Math.max(0, Math.floor(input.revisions))}회 — 내 손으로 끝까지 다듬었어요.`,
  ];
  if (input.breakthroughs.length > 0) lines.push(`막힌 곳을 뚫은 영역: ${input.breakthroughs.join(", ")}`);
  lines.push(`🔒 코치 문장 0개 · 작성 주체 학생 본인`);
  return lines.join("\n");
}
