// 프롬프트/출력 meta 버전 단일 상수 (12 §4.2).
// 이 leaf 모듈로 분리한 이유 (issue #4 / 계약 §9 S4):
//   grading.ts(FE-importable 순수 모듈)가 MODEL_VERSION 하나 때문에 prompt.ts를 런타임 import하면,
//   prompt.ts → SAMPLES(전체 시스템 프롬프트 + few-shot 샘플 에세이) 가 클라 번들에 끌려온다.
//   상수를 여기 두고 grading.ts·prompt.ts 양쪽이 import하면 그 의존을 끊어 누수를 차단한다.
// 프롬프트 버전이 바뀌면 여기만 갱신.
export const MODEL_VERSION = "writing-coach-prompt-v0.2";
