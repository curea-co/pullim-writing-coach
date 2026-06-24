// Pullim Writing Coach — 정적 텍스트 대필 가드 헬퍼 (Wave2 Slice 2).
//
// 모듈 경계(절대 제약): 순수. @anthropic-ai/sdk·server-only·fetch·next/* 미import.
//   → node:test·vitest 양쪽이 .ts 그대로 import 가능. React 비의존.
//
// 설계 결정:
//   checkGenerationBlock 휴리스틱 #5(questionFieldIsDeclarative)는 guiding_question 슬롯의
//   평서문을 위반으로 잡는다. UI 카드 카피·placeholder 같은 정당한 평서문을 guiding_question으로
//   감싸면 거짓 양성이 발생하므로, assertNoGeneration은 각 문자열을 `diagnosis` 슬롯으로 감싼다
//   (평서문 허용 슬롯). 이렇게 하면 실제 대필 신호(WRITE_DIRECTIVE·LONG_QUOTE·콜론 완성문장
//   떠먹임·목록 떠먹임, 휴리스틱 1~4)는 잡히고 정상 평서문은 통과한다.
//   질문다움(평서문 금지)은 assertQuestionsAreQuestions가 별도로 담당한다.

import { checkGenerationBlock } from "./coach-schema";
import { AREAS } from "./grading";

// SOFT_TAIL: coach-schema.ts:118과 동등한 꼬리 패턴.
//   출처: coach-schema.ts const SOFT_TAIL = /(요|죠|네요|군요|까요|을까|ㄹ까|래|볼래|볼까|보자|해보자|보세요|봐|어때|예요|이에요|세요)[.!?]?$/
const SOFT_TAIL_RE = /(요|죠|네요|군요|까요|을까|ㄹ까|래|볼래|볼까|보자|해보자|보세요|봐|어때|예요|이에요|세요)[.!?]?$/;

/**
 * 문자열 배열에 대필 신호가 없음을 단언한다.
 *
 * 각 문자열을 `diagnosis` 슬롯으로 감싸 checkGenerationBlock에 위임 — 재구현 금지.
 * 위반이 있으면 throw. 없으면 void.
 *
 * @param strings - 검사할 문자열 배열 (카드 카피, placeholder 등)
 * @param label   - 오류 메시지에 포함할 식별자 (선택)
 */
export function assertNoGeneration(strings: string[], label?: string): void {
  if (strings.length === 0) return;

  const nudges = strings.map((s, i) => ({
    paragraph_index: 0,
    rubric_area: AREAS[0],
    diagnosis: s,
    guiding_question: "", // 질문칸 평서문 검사(#5)를 우회 — 빈 문자열은 length<10으로 통과
    quick_win_rank: i + 1,
  }));

  const violations = checkGenerationBlock({ area_scores: [], nudges });

  if (violations.length > 0) {
    const tag = label ? `[${label}] ` : "";
    throw new Error(
      `${tag}대필 신호 위반 (${violations.length}건):\n${violations.join("\n")}`
    );
  }
}

/**
 * 문자열 배열이 모두 "질문다움"(물음표 종결 또는 SOFT_TAIL 요청형 꼬리)을 단언한다.
 *
 * 질문칸에 평서문 단정형을 박아넣는 것을 별도로 막는다.
 * (assertNoGeneration는 diagnosis 슬롯을 쓰므로 heuristic #5를 검사하지 않음 — 이 함수가 보완.)
 *
 * @param strings - 검사할 질문 문자열 배열
 * @param label   - 오류 메시지에 포함할 식별자 (선택)
 */
export function assertQuestionsAreQuestions(strings: string[], label?: string): void {
  const declarative: string[] = [];

  for (const s of strings) {
    const t = s.trim();
    if (t.endsWith("?") || t.endsWith("？")) continue;
    if (SOFT_TAIL_RE.test(t)) continue;
    declarative.push(s);
  }

  if (declarative.length > 0) {
    const tag = label ? `[${label}] ` : "";
    throw new Error(
      `${tag}질문칸 평서문 감지 (${declarative.length}건):\n${declarative.map((s) => `  "${s}"`).join("\n")}`
    );
  }
}
