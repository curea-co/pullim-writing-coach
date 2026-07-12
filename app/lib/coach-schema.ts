// Pullim Writing Coach — 과정 코치 출력 순수 모듈 (구현계획 T1.1·T1.2 / docs/25)
//
// 모듈 경계: grading.ts와 동일하게 **순수**다. @anthropic-ai/sdk·server-only·fetch·next/* 미import.
//   → FE·노드 테스트(scripts/coach-schema.test.mjs)가 번들 없이 직접 import. 모델 호출은
//     app/api/coach/route.ts(예정)가 전담한다. 주니어(초등) 글쓰기 모드가 이 검증을 공유한다.
//
// 채점(grading.ts)이 "다 쓴 글 → 5영역 점수"라면, 코치는 "쓰는 중 → 문단별 nudge(진단+유도질문)".
// 핵심 불변식: 코치 출력은 진단·질문·발판만 — 학생 문장을 대신 쓰지 않는다(checkGenerationBlock).

import type { AreaName } from "../data/samples";
import { AREAS } from "./grading";

// 재점검 1회의 코치 출력. area_scores=성장 막대용(내부 수치, 화면엔 막대만), nudges=후보 nudge들.
export type CoachAreaScore = { area: AreaName; score: number };

export type CoachNudge = {
  paragraph_index: number; // 0-based, nudge가 가리키는 문단
  rubric_area: AreaName; // 5영역 중 하나
  diagnosis: string; // 무엇이 약한지 (대안 문장 X)
  guiding_question: string; // 끌어내는 질문 (대필 X)
  quick_win_rank: number; // 모델이 매긴 우선순위 힌트 (1=먼저)
};

export type CoachOutput = {
  area_scores: CoachAreaScore[];
  nudges: CoachNudge[];
};

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isNonEmptyString(v: unknown): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

// ════════════════════════════════════════════════════════════════════
// 스키마 검증 (grading.validateOutput 패턴) — 위반 목록 반환(빈 배열 = 통과).
// ════════════════════════════════════════════════════════════════════
export function validateCoachOutput(o: unknown): string[] {
  const errs: string[] = [];
  if (!isObject(o)) return ["출력이 객체가 아님"];

  const scores = o.area_scores;
  if (!Array.isArray(scores) || scores.length !== 5) {
    errs.push("area_scores 5개 아님");
  } else {
    scores.forEach((s: unknown, i: number) => {
      if (!isObject(s)) {
        errs.push(`area_scores[${i}] 객체 아님`);
        return;
      }
      if (s.area !== AREAS[i]) errs.push(`area 순서 오류 [${i}] ${String(s.area)}`);
      if (typeof s.score !== "number" || s.score < 0 || s.score > 20)
        errs.push(`score 범위 [${i}]`);
    });
  }

  const nudges = o.nudges;
  if (!Array.isArray(nudges)) {
    errs.push("nudges 배열 아님");
  } else {
    nudges.forEach((n: unknown, i: number) => {
      if (!isObject(n)) {
        errs.push(`nudges[${i}] 객체 아님`);
        return;
      }
      if (
        typeof n.paragraph_index !== "number" ||
        !Number.isInteger(n.paragraph_index) ||
        n.paragraph_index < 0
      )
        errs.push(`paragraph_index 비정수/음수 [${i}]`);
      if (!(AREAS as readonly string[]).includes(n.rubric_area as string))
        errs.push(`rubric_area 5영역 아님 [${i}]`);
      if (!isNonEmptyString(n.diagnosis)) errs.push(`diagnosis 빈값 [${i}]`);
      if (!isNonEmptyString(n.guiding_question)) errs.push(`guiding_question 빈값 [${i}]`);
      if (typeof n.quick_win_rank !== "number") errs.push(`quick_win_rank 비숫자 [${i}]`);
    });
  }

  return errs;
}

// ════════════════════════════════════════════════════════════════════
// 생성 차단 가드 (T1.2 → v2) — 코치가 "학생 문장을 대신 써주는" 출력을 결정적으로 잡아낸다.
//   불변식(전략 §4): 코치 출력은 진단·질문·발판만. 무너지면 ChatGPT와 동일 → 교사 인정·자유 사용 붕괴.
//   호출부(/api/coach)는 위반 시 채점 가드와 달리 **권위적으로** 처리한다(재호출→그래도 위반이면 에러,
//   생성 문장 누출 금지). 텍스트 분석만 하는 순수 함수 — 주니어 공유·단위테스트 직접 import.
//
//   v2 강화(생성차단 eval gap 승격): 콜론 뒤 완성문장·질문칸의 서술 완성문장·번호목록 내용제공을
//   잡는다. ★단 정당한 코칭(순수질문·'고쳐 써 볼까'·짧은 학생단어 인용·발판·서술형 진단)을
//   오차단하면 안 된다 — 오차단 0이 통과 조건이라, 휴리스틱은 보수적으로 "떠먹여주는" 신호만 노린다.
// ════════════════════════════════════════════════════════════════════

// (1) 대필 지시 어구 + 예시 제공 라벨(내용을 떠먹여주는 신호). R1 eval로 보강.
//   "이렇게 써 / 다음과 같이 작성 / …라고 쓰면 / 예시문장 / 예문 / 추천 문장·표현 / 모범 답안·문장·글 /
//    이런 식으로 써 / 대신 써". (단순 "고쳐 써"·"써 볼래" 같은 발판은 내용을 안 주므로 제외 — 오차단 방지.)
//   v2: "고쳐"도 동사군에 추가해 '이렇게 고쳐:' 류를 콜론 휴리스틱과 함께 잡되, 단독 '고쳐 써 볼까'는
//   '이렇게/다음과 같이' 선행어 또는 콜론이 없으므로 여전히 통과한다.
const WRITE_DIRECTIVE =
  /이렇게\s*(써|쓰|적|작성|고쳐)|다음과\s*같이\s*(써|쓰|적|작성|고쳐)|라고\s*(써|쓰|적)|예시\s*문장|예문|추천\s*(문장|표현)|모범\s*(답안|문장|글)|이런\s*식으로\s*(써|적|고쳐)|대신\s*(써|작성)/;

// 학생 자기 문장 echo 면제(아래 (2))의 안전 범위를 좁히는 지시 패턴(Codex #155 4R) — echo 면제는
//   "학생이 쓴 문장을 되짚어 질문"하는 문맥에만 해당해야 하는데, 인용 뒤에 "다시 써/고쳐 써/바꿔 써/
//   그대로 옮겨" 류가 붙으면 "이 문장을 그대로(또는 손봐서) 다른 자리에 다시 쓰라"는 **지시**가 되어
//   기계적 복붙/재작성을 유도한다 — 대필은 아니어도 스스로 고쳐 쓰게 만드는 코칭 취지에 어긋난다.
const QUOTE_REWRITE_DIRECTIVE =
  /다시\s*(써|쓰|적)|고쳐\s*(써|쓰|보자|볼까|보아)|바꿔\s*(써|쓰|보자|볼까)|옮겨\s*(써|쓰)|그대로\s*(써|쓰|사용|옮기|옮겨)/;

// 인용부호 종류(ASCII·스마트·낫표·겹낫표)
const QUOTE_CHARS = "'\"‘’“”「」『』";
// (2) 붙여넣기용 완성문장 신호: 인용 안 내용이 15자 이상이고 문장부호 또는 한국어 종결어미로 끝남.
//   짧은 학생 단어 인용(<15자)은 영향 없음. (다/요/죠/까/라/자/네/군/음 = 흔한 종결)
const LONG_QUOTE = new RegExp(`[${QUOTE_CHARS}]([^${QUOTE_CHARS}]{15,})[${QUOTE_CHARS}]`, "g");
const SENTENCE_END = /([.!?。…]|[다요죠까라자네군음])$/;

// (3) 한국어 서술(평서문) 종결어미 — 떠먹여주는 "완성된 문장"의 꼬리.
//   주의: '요./네요/어요' 등 진단·설명 말투는 제외하지 않으면 서술형 진단을 오차단한다.
//   → 이 패턴은 "선언/단정형(…다/…된다/…한다/…이다/…necessary다)"만 노린다.
//   '습니다'는 보고체라 학생 결과물보다 설명문에 더 흔하므로 제외(오차단 방지).
const DECLARATIVE_END = /(?:[다]\.?|[가-힣]된다\.?|[가-힣]한다\.?|[가-힣]이다\.?|필요하다\.?)$/;

// 부드러운 종결/요청형 꼬리 — 코칭 발판·질문·서술형 진단 말투(오차단 금지 대상).
const SOFT_TAIL = /(요|죠|네요|군요|까요|을까|ㄹ까|래|볼래|볼까|보자|해보자|보세요|봐|어때|예요|이에요|세요)[.!?]?$/;

// 콜론(또는 줄표) 뒤에 "완성문장"을 떠먹이는지 검사.
//   '이렇게 고쳐: 화산은 위험하다' / '모범답안은 다음과 같다: 화산은 위험하다' 류.
//   콜론 뒤 조각이 (a)서술 단정형으로 끝나거나 (b)긴 완성문장 종결이면 대필로 본다.
//   단, 콜론 뒤가 짧은 라벨/질문이면 통과(예: '한 가지: 왜?').
function colonHandsOverSentence(text: string): boolean {
  const m = text.match(/[:：\-—–]\s*([^:：]+)$/);
  if (!m) return false;
  const tail = m[1].trim();
  if (tail.length < 6) return false; // 너무 짧으면 라벨/조각 — 떠먹임 아님
  if (tail.includes("?") || tail.includes("？")) return false; // 콜론 뒤가 질문이면 코칭
  if (SOFT_TAIL.test(tail)) return false; // 요청·질문형 꼬리면 통과
  return DECLARATIVE_END.test(tail) || (tail.length >= 12 && SENTENCE_END.test(tail));
}

// 번호/불릿 목록으로 "내용"을 나열해 떠먹이는지 검사.
//   '1) 화산은 위험하다 2) 대비가 필요하다' / '- 화산은 위험하다' 류.
//   목록 마커 2개 이상 + 항목 중 하나라도 서술 단정형이면 대필로 본다(질문 나열은 통과).
function listHandsOverContent(text: string): boolean {
  const markers = text.match(/(?:^|\s)(?:\d+[).．.]|[-•·▪]|[가나다라]\))\s*/g);
  if (!markers || markers.length < 2) return false;
  if (text.includes("?") || text.includes("？")) return false; // 질문 목록이면 코칭
  // 마커 뒤 조각들을 떼어내 단정형 종결이 있는지 확인.
  const items = text.split(/(?:^|\s)(?:\d+[).．.]|[-•·▪]|[가나다라]\))\s*/).filter(Boolean);
  return items.some((it) => {
    const t = it.trim();
    if (t.length < 4) return false;
    if (SOFT_TAIL.test(t)) return false;
    return DECLARATIVE_END.test(t);
  });
}

// 질문칸(guiding_question)에 "?"도 요청형 꼬리도 없이 서술 완성문장을 그대로 박아넣었는지.
//   '화산 폭발은 인명과 재산에 큰 피해를 준다' 류 — 질문이어야 할 칸에 평서문 = 떠먹임.
//   ★서술형 진단(diagnosis)에는 적용하지 않는다(진단은 평서문이 정상 → 오차단 방지).
function questionFieldIsDeclarative(q: string): boolean {
  const t = q.trim();
  if (t.length < 10) return false; // 짧은 메모/라벨은 제외
  if (t.includes("?") || t.includes("？")) return false; // 실제 질문이면 통과
  if (SOFT_TAIL.test(t)) return false; // 요청·제안형 발판이면 통과('…해 볼까/볼래/보자')
  return DECLARATIVE_END.test(t);
}

// (6) 질문형 covert 대필: 모델이 '완성 문장다운' 후보를 인용하고 **그 인용을 직접 목적어로** 글에 넣으라고 제안.
//   "'화산은 위험하다'를 넣어보면 어때?" 류 — 짧은 인용+물음표라 #1~#5를 우회하는 사각을 닫는다.
//   핵심 정밀화: 인용 **직후** 목적격 조사(를/을) + (그대로) + 삽입동사(넣/추가/포함/붙여/집어넣)가 와야 한다.
//     · 인용이 주어(는/은)이거나 사이에 다른 말이 끼면 코칭으로 보고 통과 — 학생 자기 문장을 인용해 "더 자세히
//       넣어 설명해 볼까?"(echo+보강)나 "…'는 좋은 장면이야, 더 넣어 볼까?"는 오차단하지 않는다.
//     · 코치 mock의 연결어 템플릿("'먼저 ~, 그래서 ~'처럼 … 넣어 볼까요?")도 인용 뒤가 '처럼'이라 자동 통과
//       (별도 '~' 예외 불필요 — 인용 안에 '~'를 끼워 우회하던 구멍도 동시에 제거).
//   인용이 '문장다움'(서술 종결/다어절/≥10자)일 때만 — 개념어 단일 인용('예시'/'주장')은 제외(오차단 방지).
function quotedInsertionSuggestion(text: string): boolean {
  const re = new RegExp(
    `[${QUOTE_CHARS}]([^${QUOTE_CHARS}]{2,})[${QUOTE_CHARS}]\\s*(?:를|을)\\s*(?:그대로\\s*)?(?:넣|추가|붙여|포함|집어넣)`,
  );
  const m = re.exec(text);
  if (!m) return false;
  const quoted = m[1].trim();
  return DECLARATIVE_END.test(quoted) || /\s/.test(quoted) || quoted.length >= 10;
}

// 공백만 제거한 비교키 — 인용문이 학생 원고를 "그대로" 인용했는지(echo) 판정할 때, 줄바꿈·띄어쓰기
//   차이로 오탐/누락되지 않게 한다. 문자 순서·내용은 그대로라 실질적 왜곡(패러프레이즈)은 안 걸러진다.
function collapseWhitespace(s: string): string {
  return s.replace(/\s+/g, "");
}

// 문장 경계 문자(공백 제거 후 기준) — 인용 echo가 "문장 전체"인지 확인할 때 시작 위치가 이 뒤이거나
//   원고 맨 앞이어야 한다(Codex #155 1R — 단순 부분 문자열 포함만으로는 두 문장에 걸친 15자+ 조각이나
//   문장 중간에서 잘라낸 조각도 통과해 가드에 구멍이 생긴다).
const SENTENCE_BOUNDARY = /[.!?。…]/;

// quoted(공백 제거·정규화됨)가 draftKey(공백 제거된 학생 원고) 안에서 **정확히 한 문장**으로 등장하는지.
//   시작 = 문두 또는 마침표 직후. 끝 = quoted 자체가 문장부호로 끝나거나(스스로 종결) — 아니면(예:
//   "다"류 어미만으로 SENTENCE_END를 통과한 경우) **원고에서 quoted 바로 다음 글자가 문서 끝이거나
//   문장부호**여야 한다(Codex #155 3R — 안 그러면 "…위험하다고 생각한다"의 "다"까지만 잘라 "위험하다"를
//   인용해도 문장 시작+어미 조건만으로 echo로 오인된다. "다고"의 "다"는 종결어미가 아니라 인용격 조사
//   앞부분이라 실제 문장 끝이 아님 — 다음 글자가 "고"처럼 이어지면 차단). 내부(마지막 글자 제외)에
//   문장 경계 문자가 있으면 여러 문장을 이어 붙인 것으로 보고 면제 안 함(Codex #155 2R).
//   원고에 같은 조각이 여러 번 나올 수 있어 모든 등장 위치를 확인 — 하나라도 조건을 만족하면 echo로 인정.
function isWholeSentenceEcho(quoted: string, draftKey: string): boolean {
  const interior = quoted.slice(0, -1); // 마지막 글자(종결 문장부호일 수 있음) 제외한 나머지
  if (SENTENCE_BOUNDARY.test(interior)) return false; // 내부에 문장 경계 있음 = 여러 문장 이어붙임
  const selfTerminated = SENTENCE_BOUNDARY.test(quoted[quoted.length - 1]); // quoted 자체가 문장부호로 끝남
  let from = 0;
  for (;;) {
    const idx = draftKey.indexOf(quoted, from);
    if (idx === -1) return false;
    const prevOk = idx === 0 || SENTENCE_BOUNDARY.test(draftKey[idx - 1]);
    if (prevOk) {
      if (selfTerminated) return true;
      const next = draftKey[idx + quoted.length];
      if (next === undefined || SENTENCE_BOUNDARY.test(next)) return true;
    }
    from = idx + 1;
  }
}

// 한 nudge(진단+유도질문)에 대필 신호가 있으면 위반. 위반 메시지는 nudge 인덱스를 포함.
//   studentDraft(선택) — 넘기면 "학생이 이미 쓴 문장을 그대로 되짚어 질문"하는 정당한 코칭을
//   (2) 긴 인용 가드에서 면제한다(2026-07-12, 실사용 발견 — 코치가 학생 원고를 인용해 되묻는
//   흔한 정상 패턴이 "완성문장 인용(대필)"로 오탐돼 재호출 후에도 계속 502였음). 면제는 **인용문이
//   학생 원고의 문장 시작 지점(문두 또는 마침표 직후)에 공백 무시 정확히 존재할 때만**(Codex #155 —
//   단순 부분 문자열 포함이면 두 문장에 걸친 조각·문장 중간에서 잘라낸 조각도 통과해 구멍이 생김).
//   모델이 패러프레이즈/신규 작성한 문장은 원문에 없으므로 여전히 차단된다(불변식 유지). 미전달 시
//   기존 동작과 100% 동일(하위 호환).
export function checkGenerationBlock(o: CoachOutput, studentDraft?: string): string[] {
  const v: string[] = [];
  const draftKey = studentDraft ? collapseWhitespace(studentDraft) : null;
  const nudges = isObject(o as unknown) ? (o.nudges ?? []) : [];
  (Array.isArray(nudges) ? nudges : []).forEach((n, i) => {
    if (!isObject(n as unknown)) return;
    const diagnosis = typeof n.diagnosis === "string" ? n.diagnosis : "";
    const question = typeof n.guiding_question === "string" ? n.guiding_question : "";
    const text = `${diagnosis} ${question}`;

    // (1) 노골적 대필 지시·예시 라벨
    if (WRITE_DIRECTIVE.test(text)) {
      v.push(`[${i}] 대필 지시 감지`);
      return;
    }
    // (2) 붙여넣기용 완성문장 인용 — 단, 학생 원고에 그대로 있는 인용(echo)은 정당한 코칭이라 면제.
    let quoteHit = false;
    for (const m of text.matchAll(LONG_QUOTE)) {
      const quoted = m[1].trim();
      if (!SENTENCE_END.test(quoted)) continue;
      if (
        draftKey &&
        isWholeSentenceEcho(collapseWhitespace(quoted), draftKey) &&
        !QUOTE_REWRITE_DIRECTIVE.test(text) // 재작성 지시 동반 시 면제 안 함(Codex #155 4R)
      ) continue; // 학생 자기 문장 전체 echo(되짚어 묻기) — 통과
      quoteHit = true;
      break;
    }
    if (quoteHit) {
      v.push(`[${i}] 완성문장 인용(대필) 감지`);
      return;
    }
    // (3) 콜론 뒤 완성문장 떠먹임 (진단·질문 어느 칸이든)
    if (colonHandsOverSentence(diagnosis) || colonHandsOverSentence(question)) {
      v.push(`[${i}] 콜론 뒤 완성문장 제공(대필) 감지`);
      return;
    }
    // (4) 번호·불릿 목록으로 내용 떠먹임 (칸별로 검사 — 다른 칸의 '?' 때문에 빠져나가지 않게)
    if (listHandsOverContent(diagnosis) || listHandsOverContent(question)) {
      v.push(`[${i}] 목록 내용 제공(대필) 감지`);
      return;
    }
    // (5) 질문칸에 서술 완성문장(평서문)을 그대로 박아넣음 — 질문칸 한정(진단 평서문은 허용)
    if (questionFieldIsDeclarative(question)) {
      v.push(`[${i}] 질문칸 서술 완성문장(대필) 감지`);
      return;
    }
    // (6) 질문형 covert 대필: '완성 문장다운' 후보를 인용하고 글에 넣으라고 제안
    //   "'화산은 위험하다'를 넣어보면 어때?" 류 — 짧은 인용+물음표라 #1~#5를 우회하는 사각을 닫는다.
    if (quotedInsertionSuggestion(text)) {
      v.push(`[${i}] 인용 문장 삽입 제안(대필) 감지`);
      return;
    }
  });
  return v;
}

// 코치 출력 후처리 가드 집계. 현재는 생성 차단 단일 — 확장 지점.
//   studentDraft — checkGenerationBlock의 학생 자기 문장 echo 면제로 그대로 전달(선택, 하위 호환).
export function runCoachGuards(o: CoachOutput, studentDraft?: string): string[] {
  return checkGenerationBlock(o, studentDraft);
}
