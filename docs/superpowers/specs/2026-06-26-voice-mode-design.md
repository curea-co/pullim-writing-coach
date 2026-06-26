# voice 모드 (말하기) — Design

> 2026-06-26 · 상태: 승인됨(brainstorming) → 구현계획 대기
> repo: `pullim-writing-coach` (Next 16 + React 19 + Tailwind v4, npm). 구현은 `main` 기준 `feat/voice-mode`.

## 목표
/coach의 네 번째 작성 모드 **voice("말하기")**를 활성화한다. 학생이 **말로 생각을 풀어내면 실시간 전사**되고, 그 전사를 **보며 직접 글을 쓰거나** 줄별로 **본문에 넣는다**. 전사는 **아이디어 보조**이지 최종 본문이 아니다 — 학생이 직접 쓴다는 불변식을 보존한다.

## 결정 (brainstorming 합의, 2026-06-26)
1. **저작성 모델 = 둘 다(학생이 삽입/정리 선택).** 전사는 별도 '말풍기' 패널에 쌓이고, 학생은 그것을 보며 에디터에 직접 쓰거나 "본문에 넣기"로 삽입한다. 자동 삽입 없음.
2. **STT 엔진 = 브라우저 네이티브 Web Speech API**(`webkitSpeechRecognition || SpeechRecognition`, ko-KR). 서버 0·실시간·무료. 미지원 브라우저는 그레이스풀 폴백. 우리 서버는 오디오를 받지 않는다.
3. voice는 다른 모드(Guide/Outline)와 **동일한 가산 패턴**으로 CoachClient에 붙고 **검증된 reducer는 무수정**.

## 제품 불변식 (절대 지킴)
- **대필 0**: 전사 = 학생 본인의 발화. 코치 출력에 아무것도 추가하지 않음 — "코치가 준 문장 0개"·authorIsStudent·`checkGenerationBlock` 무영향.
- **reducer/Phase byte-for-byte 무수정**: `state.body` 평문 유지. `onInsert`는 기존 `EDIT` 디스패치를 호출할 뿐(새 액션/case 없음). `bodyHtml`은 reducer 밖(#86 패턴).
- **채점 평문 계약 불변**: 삽입된 텍스트도 결국 평문 body → `/api/score`. 라우트·프롬프트·가드 무수정.

## 1. 아키텍처 & 컴포넌트
```
app/lib/coach-setup.ts               수정       ENABLED_MODES에 "voice" 추가(활성화)
app/lib/use-speech.ts                신규 클라  useSpeechRecognition 훅 — Web Speech 래퍼
app/components/coach/VoicePanel.tsx  신규       마이크 토글 + 라이브 전사 + "본문에 넣기"
app/components/coach/CoachClient.tsx 수정(가산)  mode==="voice"&&phase==="write" → <VoicePanel onInsert=…>
app/components/coach/ModeSelectStep.tsx (자동)  isModeEnabled(voice)=true → 카드 활성
```
- **`useSpeechRecognition`** (클라이언트 훅, 순수 로직): `webkitSpeechRecognition || SpeechRecognition` 래핑. 반환 `{ supported, listening, interim, error, start(), stop(), reset() }`. `lang="ko-KR"`, `continuous=true`, `interimResults=true`. final 결과는 콜백(`onResult(text)`)으로 부모에 전달(누적은 VoicePanel이 소유). 미지원 → `supported=false`.
- **`VoicePanel`**: 마이크 토글 버튼(듣는 중 표시 + interim 미리보기) + 누적 transcript 목록 + 줄별 **"본문에 넣기 →"** + 1회 프라이버시 고지 + 미지원 안내. GuidePanel/OutlinePanel과 동일 위치(`mode==="voice"&&phase==="write"`)로 가산. 코치 루프(봐줘/state.body)와 독립.
- **CoachClient 가산**: voice 분기 + `onInsert(text)` 핸들러(본문 append) + bodyHtml 동기화. `outlineCollapsed`처럼 reducer 밖.

## 2. 저작성 · 삽입 흐름
- 전사는 VoicePanel 클라이언트 state(reducer 밖, 자동 삽입 X). 말하면 interim 실시간 표시, 멈추면 final 줄이 누적 목록에 쌓임.
- 학생은 전사를 보며 RichEditor에 직접 쓰거나, 줄/블록별 "본문에 넣기 →"로 본문에 덧붙임(선택).
- **삽입 경로**: VoicePanel `onInsert(text)` → CoachClient가 `dispatch({type:"EDIT", body: state.body + "\n" + text})` + `setBodyHtml(plainToHtml(다음 body))`(이미 #86의 평문↔html 경로 재사용). 빈 본문이면 개행 없이.
- 기본은 아무것도 자동 삽입 안 함(아이디어 보조). 전사는 학생 본인의 말.

## 3. 프라이버시 · 브라우저
- **명시 고지 + 직접 켜기**: 마이크는 학생이 버튼을 눌러야만 작동(기본 OFF). VoicePanel 고지: "음성 인식은 브라우저 기능을 쓰며, 일부 브라우저는 음성을 외부(클라우드)로 보낼 수 있어요. 마이크는 직접 켤 때만 작동해요."
- **우리 서버는 오디오를 받지 않음**: 전사는 클라이언트에만 머묾. 학생이 "본문에 넣기"로 넣은 텍스트만 평문 body로 기존 /api/score 경로. 오디오 저장 0.
- **미지원 폴백**: `supported=false`(Firefox·구형 Safari 등) → "이 브라우저는 음성 입력을 지원하지 않아요 — 직접 타이핑하거나 다른 모드를 써 주세요" 안내. 에디터는 그대로 동작. 마이크 권한 거부/에러도 그레이스풀 메시지.

## 4. 테스트
- **유닛(node)**: `useSpeechRecognition`(SpeechRecognition 목 — 지원감지·interim/final·start/stop/reset·미지원). `coach-setup`: voice `isModeEnabled=true` + `parseSetup`이 voice 셋업 유효 처리(기존 비활성-거부 테스트 갱신).
- **컴포넌트(vitest)**: VoicePanel(훅 목 — 마이크 토글·전사 표시·"본문에 넣기"가 `onInsert(text)` 호출·미지원 안내·고지). CoachClient(`mode==="voice"&&phase==="write"`에 VoicePanel 렌더 + onInsert가 본문 append: EDIT 디스패치+bodyHtml).
- **e2e(Playwright)**: 실제 Web Speech 불가 → `window.SpeechRecognition` 목 주입으로 패널 렌더 + 가짜 전사 → "본문에 넣기" → 본문 반영 검증. 라이브 STT는 수동 점검(문서화).
- typecheck + test:all + build 그린.

## 5. 비범위
- 서버 STT(Whisper 등)·오디오 저장/업로드 · 음성 명령(코치 제어) · 외국어 STT(ko-KR만) · 음성→자동 본문(딕테이션) · 전사 자동 교정/요약(학생 본인 말 그대로).

## 6. 수용 기준
- [ ] ModeSelectStep에서 "말하기" 카드 활성, 선택 시 voice 모드로 코치 진입.
- [ ] 지원 브라우저: 마이크 토글 → 실시간 전사(interim) → 멈추면 누적. "본문에 넣기"로 에디터 본문에 텍스트 반영.
- [ ] 미지원 브라우저/권한 거부: 그레이스풀 안내, 에디터 정상.
- [ ] 우리 서버로 오디오 전송 0. 삽입 텍스트만 평문 body로 채점 경로.
- [ ] 검증된 코치 reducer/Phase byte-for-byte 무수정, state.body 평문, 대필 0 유지.
- [ ] typecheck + test:all + build 그린.

## 7. 위험
- Web Speech 브라우저 편차(Chrome 양호, Safari 부분, Firefox 없음) → 지원감지 + 폴백 필수.
- Chrome의 클라우드 전송(미성년자 음성) → 명시 고지 + 직접 켜기 + 오디오 미저장으로 완화. 후속: 학교/보호자 동의 정책 검토(범위 밖).
- e2e에서 실제 STT 검증 불가 → 목 + 수동 점검.
- VoicePanel은 reducer 인접 → onInsert는 기존 EDIT만 호출, reducer 무수정 엄수.
