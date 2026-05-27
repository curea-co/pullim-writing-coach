// Pullim Writing Coach — 인라인 첨삭 매칭 (P1, 2026-05-27 CEO/디자인 리뷰 수락분)
//
// 목적: 영역별 피드백(feedback_good·feedback_fix)이 인용부호로 학생 글의 실제 표현을 인용할 때
//   ('자율이 있으면 책임감도 생긴다' 처럼), 그 인용구를 본문에서 verbatim 매치해 하이라이트한다.
//   "첨삭받는 내 글" 경험. 매치 실패 시 조용히 무표시(절대 잘못된 span을 칠하지 않음).
//
// 모듈 경계: 이 파일은 순수(부수효과·UI·next/* import 없음) — 노드 테스트가 직접 import.
//   AnnotatedBody(컴포넌트)가 이 함수들을 호출해 렌더한다.

// 인용부호: 한글 ' '(U+2018/2019) · ASCII ' ' · 낫표 「」.
//   길이 2~40자(너무 짧으면 오매치, 너무 길면 통문장 인용이라 하이라이트 의미 적음).
const QUOTE_RE = /[‘'「]([^’'」]{2,40})[’'」]/g;

// feedback 텍스트들에서 인용구를 추출(중복 제거). 입력은 신뢰하지 않는다(비문자열 방어).
export function extractQuotedPhrases(texts: readonly unknown[]): string[] {
  const set = new Set<string>();
  for (const t of texts) {
    if (typeof t !== "string") continue;
    for (const m of t.matchAll(QUOTE_RE)) {
      const p = m[1].trim();
      if (p.length >= 2) set.add(p);
    }
  }
  return [...set];
}

export type Segment = { text: string; highlight: boolean };

// 본문을 인용구 매치 기준으로 세그먼트로 쪼갠다. 하이라이트 세그먼트는 highlight:true.
//   - 각 인용구는 본문에서 겹치지 않는 첫 매치 1곳만 잡는다(다중 매치는 첫 곳).
//   - 긴 인용구 우선(짧은 부분문자열이 긴 인용구를 깨지 않게).
//   - 매치 0건이면 [{text: body, highlight:false}] (= plain, 조용한 폴백).
export function computeSegments(body: string, phrases: readonly string[]): Segment[] {
  if (typeof body !== "string" || body.length === 0) return [];
  type Range = { start: number; end: number };
  const ranges: Range[] = [];
  // 긴 것부터 — 부분문자열 충돌 시 긴 인용구가 자리를 먼저 차지.
  const sorted = [...new Set(phrases)].filter((p) => p.length >= 2).sort((a, b) => b.length - a.length);

  for (const p of sorted) {
    let from = 0;
    while (from <= body.length - p.length) {
      const idx = body.indexOf(p, from);
      if (idx === -1) break;
      const end = idx + p.length;
      const overlaps = ranges.some((r) => idx < r.end && end > r.start);
      if (!overlaps) {
        ranges.push({ start: idx, end });
        break; // 인용구당 첫 비충돌 매치 1곳만
      }
      from = idx + 1;
    }
  }

  if (ranges.length === 0) return [{ text: body, highlight: false }];

  ranges.sort((a, b) => a.start - b.start);
  const segs: Segment[] = [];
  let cursor = 0;
  for (const r of ranges) {
    if (r.start > cursor) segs.push({ text: body.slice(cursor, r.start), highlight: false });
    segs.push({ text: body.slice(r.start, r.end), highlight: true });
    cursor = r.end;
  }
  if (cursor < body.length) segs.push({ text: body.slice(cursor), highlight: false });
  return segs;
}
