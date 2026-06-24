# 고급 글쓰기 에디터(TipTap) + 맞춤법 토글 + 전 페이지 좌정렬 — Design

> 2026-06-25 · 상태: 승인됨(brainstorming) → 구현계획 대기
> repo: `pullim-writing-coach` (Next 16 + React 19 + Tailwind v4, npm, PUDS shell). 구현은 `main` 기준 feature 브랜치.

## 목표
학생 글쓰기 표면(`/try` ScoreForm, `/coach` Canvas)을 **공용 고급 에디터(TipTap)**로 교체한다 — 헤더(H1/H2)·볼드·폰트크기 서식을 화면에 반영하고, 비파괴 맞춤법 토글(네이티브)을 제공한다. 더불어 전 페이지 콘텐츠를 좌정렬한다. **AI 채점/코치 계약은 평문(plain text)으로 불변**, 검증된 코치 reducer는 byte-for-byte 무수정.

## 결정 (brainstorming 합의, 2026-06-25)
1. **두 표면 모두** — 공용 `RichEditor` 컴포넌트를 만들어 `/try`·`/coach`에 이식.
2. **서식은 쓰기 경험용, 채점/코치는 평문 투영** — 화면엔 헤더·볼드·폰트크기, AI엔 `htmlToPlain(html)` 평문만. 기존 채점·맞춤법·대필 파이프라인 무수정.
3. **리치 영속(가산적)** — 기존 평문 `body`는 유지하고 `body_html`을 나란히 저장(ScoreForm draft·코치 세션 스키마에 옵셔널 필드 가산). 새로고침·드래프트·세션 복원에서 서식 보존. 평문은 항상 html에서 파생.
4. **맞춤법 = 네이티브 spellcheck 토글, 비파괴, 기본 OFF** — 브라우저 밑줄만(텍스트 절대 안 고침). 커스텀 한국어 엔진은 범위 밖(무겁고 '직접 발견' 철학과 충돌). 한국어 커버리지는 브라우저 의존(제한적, 문서화).
5. **전 페이지 좌정렬** — `mx-auto` 가운데 정렬 제거(콘텐츠 좌측 정렬), max-width 유지. /coach 특수 레이아웃은 별도 판단.
6. **에디터 프레임워크 = TipTap(ProseMirror)** — StarterKit + TextStyle + 커스텀 FontSize, SSR 안전(`immediatelyRender:false`).

## 제품 불변식 (절대 지킴)
- **대필 0**: 에디터 콘텐츠는 항상 학생 소유. 코치는 문장을 대신 쓰지 않음("코치가 준 문장 0개"·authorIsStudent 무영향).
- **맞춤법·오탈자는 채점 대상**(표현·문장): 평문 투영은 학생 텍스트/오탈자/띄어쓰기를 **보존**(정규화 안 함 — 서버 `normalizeBody`가 담당). 맞춤법 토글은 비파괴.
- **검증된 코치 reducer/Phase 무수정**: `state.body`는 평문 유지. `body_html`은 reducer 밖 client state + 가산 영속.

## 1. 아키텍처 & 컴포넌트
```
app/components/editor/RichEditor.tsx     신규 "use client"  TipTap useEditor 래퍼 + 툴바 + spellcheck 토글
app/components/editor/EditorToolbar.tsx   신규              H1/H2 · Bold · 폰트크기 · 맞춤법 표시 on/off
app/components/editor/editor-doc.ts       신규 순수         htmlToPlain(html) 등 투영/직렬화 (단위 테스트)
app/components/ScoreForm.tsx              수정              body textarea → RichEditor (평문 body state 유지)
app/components/coach/Canvas.tsx           수정              textarea → RichEditor (코치 reducer 무관)
app/components/coach/CoachClient.tsx      수정(가산)         bodyHtml client state + 세션 html 영속/복원
app/**/page.tsx                           수정              mx-auto 제거(좌정렬)
```
- **RichEditor 코어** props: `valueHtml`, `onChange({ html, text })`, `spellcheck`, `disabled`, `placeholder`, `editorRef`(포커스). 호스트는 감싸기만.
- TipTap 확장(최소): StarterKit(문단·Bold·Heading H1/H2), `TextStyle`+커스텀 `FontSize` 마크. 붙여넣기 sanitize·IME는 TipTap 기본.

## 2. 평문 투영 & 데이터 계약
- `editor-doc.htmlToPlain(html)`(순수): 헤더→독립 줄, 볼드/폰트 마크 제거, 문단→개행. 학생 텍스트·오탈자·띄어쓰기 보존(정규화 X). 결과 평문 = 예전 textarea value 동치.
- 글자수·검증: `charCount(normalizeBody(htmlToPlain(html)))` — 기존 흐름 그대로.
- AI 계약 불변: `/api/score`·`/api/coach` `submission.body = htmlToPlain(html)`(평문). 라우트·프롬프트·가드·추출 무수정.
- 빈 문서/손상 html → `""`(방어적).

## 3. /try (ScoreForm) 통합
- body `<textarea>` → `<RichEditor valueHtml={bodyHtml} onChange={({html,text}) => { setBodyHtml(html); setBody(text); }} spellcheck={spellcheckOn} />`. **`body`(평문) state 유지** → 검증·글자수·진척바·제출 payload 기존 코드 그대로.
- 파일 업로드/클립보드: 추출 텍스트 → 에디터에 평문 문단 주입(`setContent`). 기존 .txt/.md/.docx·EUC-KR·캡 로직 유지.
- 자동저장/드래프트: `saveDraft`에 `body_html` 옵셔널 가산(키 보존). 복원 배너 → html 로드(서식 복원).
- 결과/리비전: 평문 `body` 사용(파생) — 스키마·동작 불변.
- 미리보기(TextPreviewCard): 렌더된 html 표시(서식 보임).

## 4. /coach (Canvas) 통합 — reducer 무수정
- Canvas `<textarea>` → `<RichEditor>`. 에디터 `onChange({html,text})` → `dispatch({type:"EDIT", body:text})`(기존) + `setBodyHtml(html)`(reducer 밖 로컬 state, `outlineCollapsed` 패턴).
- 코치 루프(`runCheck`/`runRecheck`) `state.body`(평문) 전송 — 무수정. `coach-session` draftHistory 평문 — 무수정.
- 서식 영속: `body_html`을 코치 세션에 가산 저장(또는 `pwc-coach-body-html-v1`). 마운트 effect에서 html 주입(RESTORE는 평문 body만 — reducer 불변).
- `editorRef`(포커스) — outline→body "이제 본문 쓰기" 포커스 이동 보존. `disabled`(busy/done) → 에디터 `editable=false`. 글자수 평문 기준.

## 5. 맞춤법 토글 (네이티브, 비파괴)
- RichEditor가 contentEditable `spellcheck` 속성 토글(TipTap `editorProps.attributes.spellcheck`). 툴바 "맞춤법 표시" on/off.
- 기본 OFF(양 표면; 코치는 '직접 발견' 보존). 켜면 브라우저 밑줄만 — 비파괴(텍스트 불변). 커스텀 사전 0. 한국어 커버리지 브라우저 의존(문서화).

## 6. 좌정렬 (전 페이지)
- 표준 page `<main>`의 `mx-auto w-full max-w-X` → `mx-auto` 제거(좌측 정렬), max-width 유지. Hero/Closing CTA `text-center`·`items-center`·`justify-center` → 좌정렬.
- 대상: `grep "mx-auto" app/**/page.tsx` 전수(home·try·about·onboarding·me·results(/[id])·samples(/[id])·teacher/*).
- /coach 특수 레이아웃(디바이스 프레임 등)은 별도 판단(표준 main만 일괄, /coach 검토 후).

## 7. 테스트
- 유닛(node): `editor-doc.htmlToPlain` — 헤더→줄·볼드/폰트 제거·문단→개행·오탈자 보존·빈/손상→"".
- 컴포넌트(vitest): RichEditor 렌더·툴바 포맷·`onChange({html,text})`·spellcheck 속성 토글; ScoreForm 배선·평문 파생·파일주입·드래프트 html 복원; Canvas EDIT dispatch·disabled. *TipTap jsdom 렌더 제한 가능 → 순수 editor-doc 두텁게 + 컴포넌트 스모크 + e2e 보강.*
- e2e(Playwright): 타이핑·볼드/헤더·렌더; /try 제출→평문 채점; 코치 write→봐줘 루프; 새로고침 서식 복원; 맞춤법 토글.
- 빌드·typecheck·시각 점검(좌정렬 전 페이지).

## 8. 슬라이스 (PR 경계)
1. **좌정렬** — 독립·소규모. 첫 PR.
2. **RichEditor 코어 + editor-doc + 맞춤법 토글 + 유닛/컴포넌트 테스트** — 호스트 통합 전 공용 컴포넌트(+TipTap 의존성 추가).
3. **/try 통합** — ScoreForm 에디터화 + `body_html` 드래프트 + 파일/클립보드/미리보기.
4. **/coach 통합** — Canvas 에디터화 + `body_html` 세션 영속(reducer 무수정).
5. **최종 검증** — 빌드·e2e·시각.

## 9. 비범위
- 커스텀 한국어 맞춤법 엔진(네이티브만) · 표·이미지·링크 등 그 외 서식(YAGNI; H1/H2·Bold·폰트크기만) · 협업/실시간 · 에디터 콘텐츠를 AI에 서식째 전달(평문만) · /coach 디바이스 프레임 재설계.

## 10. 수용 기준
- [ ] /try·/coach 모두 RichEditor로 글쓰기, H1/H2·Bold·폰트크기 화면 반영.
- [ ] AI 채점/코치엔 평문만 전송(서식 제거) — 기존 채점·대필가드·맞춤법 채점 동작 회귀 0.
- [ ] 서식이 새로고침·드래프트·세션 복원에서 보존(`body_html` 영속).
- [ ] 맞춤법 토글 — 비파괴 밑줄, 기본 OFF, 텍스트 불변.
- [ ] 검증된 코치 reducer/Phase byte-for-byte 무수정, `state.body` 평문 유지.
- [ ] 전 페이지 콘텐츠 좌정렬, 시각 점검 통과.
- [ ] typecheck + test:all + build 그린.

## 11. 위험
- ScoreForm은 가장 복잡(자동저장·파일·리비전) — 슬라이스 분리·회귀 테스트.
- 코치 통합은 검증된 reducer/세션 인접 — `state.body` 평문 유지·reducer 무수정·html은 reducer 밖.
- TipTap jsdom 컴포넌트 테스트 제한 가능 → 순수 모듈+e2e로 보강.
- TipTap 의존성 무게(번들) — 코어 슬라이스에서 한 번 도입.
- 좌정렬 전 페이지 스윕 — 시각 회귀 점검.
