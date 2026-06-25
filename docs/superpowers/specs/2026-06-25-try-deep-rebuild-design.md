# /try Deep Rebuild — Guided OS-style Wizard — Design

> 2026-06-25 · 승인됨(brainstorming) → 구현계획 대기
> repo: `pullim-writing-coach` (Next 16 + React 19 + Tailwind v4, npm). branch `feat/try-deep-rebuild` (off `main`). 전제: PUDS 셸 + pullim-os 토큰 이미 적용.

## 목표
`/try`(직접 채점받기)를 OS-style 대시보드 **가이드형 멀티스텝 위저드**로 전면 재설계한다. **채점 로직은 보존**(API 계약·토큰 게이트·드래프트 자동저장·검증·리비전 비교·내보내기)하고, 1040줄 `ScoreForm`을 `useScoreForm` 훅 + 얇은 스텝 컴포넌트로 분해한다.

## 결정 (brainstorming 합의, 2026-06-25)
1. **가이드형 3-스텝 위저드** (단일 워크스페이스 아님): 글 입력 → 정보 확인 → 채점 결과. `/try wizard` e2e 명명과 일치.
2. **텍스트 우선** 스텝 순서(에세이 먼저, 메타데이터 다음).
3. **TokenGate는 위저드 진입 전 게이트로 유지**(스텝 아님), 리스킨만.
4. **로직 보존, 표현 재설계.** `ScoreForm`(1040줄) 분해 = `useScoreForm` 훅(상태/로직) + `StepEssay`/`StepInfo`(표현). `ResultView`는 대시보드 패턴으로 리팩터(데이터/리비전/내보내기 보존).

## 현황 (탐색)
- `app/try/page.tsx`(서버, 얇은 헤더) → `TryClient`(프로필 상태: with/no-profile, 인라인 ProfileForm) → `TokenGate`(데모 비번 게이트, sessionStorage `pwc-demo-token`, 서버 401 `E-AUTH` 판정 → `onAuthExpired` 재노출) → `ScoreForm`.
- `ScoreForm.tsx` **1040줄**: 에세이 textarea, 학년·과목·장르 메타데이터, 프로필 프리필, 드래프트 복원/자동저장(localStorage), 검증, `/api/score` 제출(`x-demo-token` 헤더), 401 재게이트, 결과 표시 토글.
- `ResultView.tsx`(303줄): 총점 밴드(`getTotalScoreBand`), 5영역 점수(`scores[]` area/score/max), 영역별 피드백, `WhyScoreToggle`, 리비전 비교(`GrowthCard`, `hasLargeAreaGap`), 텍스트/내보내기(`ExportableResultFrame`). 도메인 `band/accent` 토큰 사용.

## 아키텍처
```
app/try/page.tsx (server: PUDS PageHeader 헤더)
  → TryClient (프로필 게이트 — 유지)
     → TokenGate (리스킨, 게이트 유지)
        → ScoreWizard (NEW, client: 스텝 상태 + useScoreForm)
           ├ PageHeader stepper (글 입력 · 정보 확인 · 채점 결과)
           ├ StepEssay  (NEW: 에세이 Card + textarea + 드래프트 표시 + 길이 안내)
           ├ StepInfo   (NEW: 학년·과목·장르 Card, 프로필 프리필, "채점받기")
           └ StepResult (NEW: 리팩터된 ResultView 래핑)
useScoreForm (NEW hook: 드래프트/메타/검증/제출/자동저장/토큰만료 — ScoreForm에서 추출)
```
- **`useScoreForm`**: `ScoreForm`의 비표현 로직 전부 추출 — 상태(essay/메타/draft), 자동저장+복원(localStorage 키 동일), 검증 규칙, `submit()`(`/api/score`, `x-demo-token`, 로딩/에러/401→onAuthExpired), 결과(`output`), 리비전 상태. 반환 인터페이스로 스텝들이 소비.
- **`ScoreWizard`**: `step` 상태(essay|info|result), 스텝 전환 검증 게이트(글 비어있으면 다음 불가), `PageHeader`에 스텝퍼, 제출은 info→result에서. 401 시 `TokenGate` 재노출(TryClient/TokenGate의 기존 메커니즘 재사용).
- **스텝 컴포넌트**(표현 전용, 훅 값 소비): `StepEssay`(textarea + 자동저장 표시 + "다음"), `StepInfo`(메타 + "채점받기" 로딩), `StepResult`(ResultView).
- **`ResultView` 리팩터**: 총점 → `StatCard`/hero, 5영역 → `StatCard` 그리드(밴드색 보존), 영역 피드백 → `SectionHead`+`Card`, `WhyScoreToggle`/`GrowthCard`/`ExportableResultFrame` 보존. 데이터·계산(`getTotalScoreBand`/`hasLargeAreaGap`) 무변경.

## 보존 (로직 무변경)
- `/api/score` 계약 + `x-demo-token` 헤더 + 401 `E-AUTH` 재게이트.
- 드래프트 자동저장/복원(localStorage 키 동일), 검증 규칙(빈 글·메타 필수), 프로필 프리필.
- 리비전 비교(`GrowthCard`, `hasLargeAreaGap`, 최고/최저 영역 강조), 내보내기(`ExportableResultFrame`).
- 모든 카피/디스클레이머(AI 자동채점 안내), 도메인 `band/accent` 토큰.

## 테스트 · 검증
- `npm run typecheck` 클린.
- `npm run test:components`(vitest) — 기존 `ScoreForm`/`ResultView` 테스트를 새 구조(`useScoreForm`/스텝/위저드)에 맞춰 갱신; 훅 단위 테스트 추가(검증/제출/401).
- **`npm run test:e2e`의 `/try wizard` Playwright** — 핵심 안전망. 플로우(글 입력→정보→채점→결과) 유지, 셀렉터는 새 스텝 구조에 맞게 갱신.
- `npm run build` 통과. dev 스모크: 게이트→3스텝→결과 렌더, pullim-os, 콘솔 에러 없음.

## 범위
- `/try`의 UI/UX 재설계(위저드 + 대시보드 결과) + `ScoreForm` 분해(`useScoreForm` + 스텝) + `ResultView` 대시보드 리팩터 + `TokenGate` 리스킨. 채점 로직 보존.

## 비범위
- `/coach`·`/samples` 딥 리빌드(별도 사이클). `/api/score` 백엔드/채점 엔진. 프로필/온보딩 로직(ProfileForm 재사용, 무변경). PUDS 셸 변경.

## 위험 / 유의
- **`ScoreForm` 1040줄 추출**: 훅 분리 시 드래프트 복원/자동저장/401/검증 동작을 **정확히 보존**해야 함 — e2e가 안전망(셀렉터 갱신 필수). 단계적 추출 + 각 단계 e2e 권장.
- **e2e 셀렉터**: `/try wizard` 테스트가 현재 단일 폼 구조에 결합돼 있을 수 있음 — 위저드 스텝/버튼 라벨 변경에 맞춰 갱신, 플로우 의미는 유지.
- **토큰 게이트 재노출**: 401 시 위저드 상태를 잃지 않고 게이트→복귀하도록(현재 onAuthExpired 흐름 보존).
- **프로덕션 앱**: feat 브랜치 + PR → main(룰셋: linear + 리뷰 스레드 해소), squash merge.
