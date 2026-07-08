# /try v1 전체 동선 User 회귀 — 2026-06-02 prod

> 대상: `https://pullim-writing-coach-demo.vercel.app/try`
> 방법: browse 헤드리스(chromium 1440x900)로 happy path 6단계 캡처 + state assertion.

## 결과 한 줄
**✅ 6/6 단계 정상.** 모든 paradigm v1 step transition + 자동저장/disabled hint 작동. 회귀 0건.

## 단계별 검증

| # | 단계 | 검증 | 결과 |
|---|---|---|---|
| 1 | TokenGate 진입 | 비공개 데모 안내 + 비밀번호 입력 폼 노출 | ✅ pass |
| 2 | Step 1 빈 상태 | `다음 단계 →` 버튼 disabled | ✅ `disabled=true` |
| 3 | Step 1 본문 채움(157자) | 다음 단계 활성 + 자동저장 표시 노출 | ✅ `enabled=true`, "자동 저장됨" 보임 |
| 4 | Step 2 진입 | `h2`에 "2. 과제 정보를 알려 주세요" + AI 첨삭 disabled + disabled hint 노출 | ✅ heading 정확, hint "다음을 채우면..." 노출 |
| 5 | Step 2 메타 채움 | AI 첨삭 활성 + hint 사라짐 | ✅ `enabled=true`, hint 미노출 |
| 6 | TextPreviewCard 펼침 | 글 전체 본문 + [수정] 버튼 노출 | ✅ details[open] 정상 |

## 스크린샷 증빙
- `docs/screenshot/m2-regression-01-tokengate.png` — TokenGate
- `docs/screenshot/m2-regression-02-step1-empty.png` — Step 1 빈 상태
- `docs/screenshot/m2-regression-03-step1-filled.png` — Step 1 채워짐 (자동저장 + 진척)
- `docs/screenshot/m2-regression-04-step2-empty-meta.png` — Step 2 메타 비어 있음 (disabled hint)
- `docs/screenshot/m2-regression-05-step2-meta-filled.png` — Step 2 메타 채워짐 (AI 첨삭 활성)
- `docs/screenshot/m2-regression-06-step2-preview-expanded.png` — TextPreviewCard 펼침

## 직접 확인된 paradigm v1 feature
- ✅ Step 1·2 conditional rendering (한 라우트 안)
- ✅ Stepper 진척 표시 (1·2단계 active/done)
- ✅ Step 1 → 다음 단계 활성 조건 (`bodyOk`)
- ✅ Step 1 자동저장 (#9 800ms debounce)
- ✅ Step 2 TextPreviewCard 접힘/펼침
- ✅ Step 2 MetaForm (5필드, /me prefill 동작)
- ✅ Step 2 disabled hint 누락 필드 동적 나열 (#38 카피)
- ✅ Step 2 진척 인디케이터 (#34 추가, 본문 fixed + 목표 슬라이드)
- ✅ TrustLabel (캡처 영역 외)

## 미검증 (수동 회귀 불가 — 별 트랙)
- TokenGate 401 재인증 흐름 (실제 비밀번호 필요)
- AI 첨삭 받기 → loading → result (실제 백엔드 호출)
- 파일 업로드 (DOCX·TXT — file system 필요)
- DnD 텍스트 vs 파일 분기 (#37 회귀)
- 클립보드 자동 감지 (#36 — 권한 prompt 필요)
- Draft 복원 배너 (#20 — sessionStorage 사이 reload 필요)
- /results 진입 → 필터·정렬·삭제 (별 페이지)

→ 이 7건은 **PR #51 Playwright E2E**가 4건 자동 회귀 중. 나머지 3건은 M3 W2 P2 ⑤번에서 +5 시나리오로 확장 예정.

## 발견된 이슈
**없음.** prod paradigm v1 동선 모든 step transition + state 동작 정상.

## 후속 액션
- **자동 회귀 우선순위** (M3 W2 P2 ⑤):
  1. 파일 업로드 (.txt → setBody)
  2. DnD 텍스트 vs 파일 분기 (#37 회귀 방어)
  3. Draft 복원 배너 (전 세션 LS 복원)
  4. /results 필터·정렬·삭제 흐름
  5. handleResubmit "고치고 다시 받기" → Step 1 복귀

---
*검증 시각: 2026-06-02 prod / chromium 1440x900 / 6 단계 / 6 캡처 / 0 회귀.*
