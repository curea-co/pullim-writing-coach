// 리치 html → 채점/코치용 평문 투영. 블록(p/h1~h6/div)은 줄 경계, 인라인 마크는 텍스트만 남김.
//   학생 텍스트·오탈자·띄어쓰기는 보존(정규화 X — 서버 normalizeBody가 담당). 채점 계약의 단일 소스.
const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " " };

export function htmlToPlain(html: string): string {
  if (!html) return "";
  // 블록 종료 태그를 개행으로, 나머지 태그 제거.
  const withBreaks = html
    .replace(/<\/(p|h[1-6]|div|li)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "");
  const decoded = withBreaks.replace(/&[a-zA-Z#0-9]+;/g, (m) => ENTITIES[m] ?? m);
  // 끝의 잉여 개행만 정리(내부 공백/오탈자는 보존).
  return decoded.replace(/\n+$/g, "").replace(/^\n+/g, "");
}

// 평문 → 리치 html 투영. 채점·코치 결과를 RichEditor에 로드할 때 사용.
//   각 줄을 <p>…</p>로 감싸고 HTML 특수문자를 이스케이프한다. 빈 입력 → "<p></p>".
export function plainToHtml(text: string): string {
  if (!text) return "<p></p>";
  const lines = text.split("\n");
  return lines
    .map((line) => {
      const escaped = line
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      return `<p>${escaped}</p>`;
    })
    .join("");
}
