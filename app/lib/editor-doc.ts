// 리치 html → 채점/코치용 평문 투영. 블록(p/h1~h6/div)은 줄 경계, 인라인 마크는 텍스트만 남김.
//   학생 텍스트·오탈자·띄어쓰기는 보존(정규화 X — 서버 normalizeBody가 담당). 채점 계약의 단일 소스.
const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&nbsp;": " " };

export function htmlToPlain(html: string): string {
  if (!html) return "";
  // 블록 종료 태그와 <br>을 센티널(\x00)로 치환 → 나머지 태그 제거 → 엔티티 디코드.
  const withSentinels = html
    .replace(/<\/(p|h[1-6]|div|li)>/gi, "\x00")
    .replace(/<br\s*\/?>/gi, "\x00")
    .replace(/<[^>]+>/g, "");
  // 명명 엔티티(ENTITIES) + 숫자(&#NNN;)·16진(&#xHH;) 엔티티까지 디코드.
  //   브라우저·클립보드 HTML이 &#x27;·&#160; 형태를 자주 내보내므로, 평문 단일 소스가 리터럴로 새지 않게 한다.
  const decoded = withSentinels.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (m, body: string) => {
    if (ENTITIES[m] !== undefined) return ENTITIES[m];
    if (body[0] === "#") {
      const code =
        body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      if (Number.isFinite(code) && code >= 0 && code <= 0x10ffff) {
        try {
          return String.fromCodePoint(code);
        } catch {
          return m;
        }
      }
      return m;
    }
    return m; // 알 수 없는 명명 엔티티는 원문 보존
  });
  // 센티널로 분할 → 마지막 블록 종료 태그 뒤의 빈 아티팩트 요소만 제거 → "\n"으로 조인.
  // 내부·선행·후행 빈 요소(의도적 빈 문단)는 보존한다.
  const parts = decoded.split("\x00");
  if (parts.length > 1 && parts[parts.length - 1] === "") {
    parts.pop();
  }
  return parts.join("\n");
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
