# Pullim Writing Coach — 기능 리스트 (2026-06-25)

> 작성: 2026-06-25 · 출처: 코드(app 라우트·컴포넌트·lib) + 머지 PR(#67~#89) 기준 인벤토리.
> README는 #88(2026-06-25 머지)로 과정 코치 패러다임 현행화 완료 — 본 문서와 정합.
> 상태 범례: ✅ main 반영 · 🔶 진행 중(OPEN PR) · ⚪ 데모/mock(출시 후 고도화) · 🧪 레거시(병행 유지)

---

## 1. 한 줄 정의

학생이 **수행평가 안내서 + 자기 글**을 입력하면, AI가 **과정을 코치**(안내서 해석 → 개요/본문 작성 보조 → 5영역 채점 → 수정 가이드)하는 서비스. 핵심 불변식 = **대필 0**(AI가 글을 대신 써주지 않음).

---

## 2. 사용자 동선 (과정 코치 메인 — `/coach`)

```
홈 [내 글 코치받기]
  ↓
1. TokenGate (데모 비밀번호 — CoachGate)
  ↓
2. 코치 셋업 (CoachSetupFlow — 프로필·연령 동의)
  ↓
3. 수행평가 안내서 입력 (UniversalCapture 6채널) → AI 추출(/api/extract) → AssignmentCard(신뢰도 칩·인라인 수정)
  ↓
4. 모드 선택 (ModeSelectStep)
   ├─ A) 이미 글 있어요 → Canvas(RichEditor) → 채점(/api/score)
   ├─ B) 아직 안 썼어요 → GuidePanel(장르별 가이드 질문) → 본문 작성 → 채점
   └─ C) 개요 먼저 → OutlinePanel → 개요→본문 전환 → 채점
  ↓
5. 결과 (ResultView) — 5영역 점수·잘한 점/고칠 점·수정 가이드 + 성취 서사(GrowthBars) + 내보내기
```

---

## 3. 기능 영역별 리스트

### 3-1. 과정 코치 코어 (`/coach`)
| 기능 | 설명 | 구현 | 상태 |
|---|---|---|---|
| 코치 진입 게이트 | 데모 토큰 검증 후 코치 진입 | `CoachGate` · `TokenGate` | ✅ (#73) |
| 코치 셋업 플로우 | 프로필·연령 동의·세션 초기화 | `CoachSetupFlow` · `coach-setup.ts` · `coach-session.ts` | ✅ (#73) |
| 모드 선택 | 이미 글 있음 / 아직 안 씀 / 개요 먼저 | `ModeSelectStep` · `mode` 필드 | ✅ (#73·#74) |
| 안내서 입력 단계 | 과제 정보 캡처 단계 | `AssignmentStep` · `UniversalCapture` | ✅ (#73) |
| 작성 캔버스 | 본문 작성 영역 | `Canvas` · `RichEditor` | ✅ (#86) |
| 가이드 질문 패널 | 장르별 분기 가이드 질문(정적·서버 무호출) | `GuidePanel` · `guide-prompts.ts` | ✅ (#77) |
| 개요 패널 | 개요 먼저 모드 → 개요 작성 → 본문 전환 | `OutlinePanel` · `outline-prompts.ts` | ✅ (#76·#78) |
| 넛지 카드 | 우선순위 기반 작성 유도 | `NudgeCard` · `nudge-priority.ts` | ✅ |
| 성장 막대 | 성취 서사 시각화 | `GrowthBars` · `progress.ts` | ✅ |
| 코치 상호작용 API | 코치 응답 생성 | `app/api/coach/route.ts` · `coach-prompt.ts` · `coach-schema.ts` | ✅ |
| 코치 mock | 미배선 구간 mock 응답 | `coach-mock.ts` | ⚪ |

### 3-2. 대필 가드 (대필 0 불변식)
| 기능 | 설명 | 구현 | 상태 |
|---|---|---|---|
| 정적 텍스트 대필 가드 | 정적 가이드/예시가 학생 글로 새지 않도록 안전망 | `static-text-guard.ts` | ✅ (#75) |
| 동적 생성 covert 차단 | 질문형 covert 대필 요청 차단(`checkGenerationBlock`) | 가드 모듈 | 🔶 (PR #79 OPEN — ey-code 담당) |
| 글쓰기 경험 종합 설계 docs | 4단계·4모드·성취 서사·대필 0 불변식 설계 문서 | `docs/` | 🔶 (PR #72 OPEN, rebase 필요) |

### 3-3. 안내서 추출 (AI Extraction)
| 기능 | 설명 | 구현 | 상태 |
|---|---|---|---|
| 6채널 캡처 | 텍스트·붙여넣기 등 다채널 안내서 입력 | `UniversalCapture` | ✅ (#70) |
| 라이브 추출 | Claude Haiku로 안내서 구조화 추출 | `app/api/extract/route.ts` · `extract.ts` · `extract-client.ts` | ✅ (#69) |
| 추출 결과 카드 | 추출값 표시 + 인라인 수정 | `AssignmentCard` | ✅ (#70) |
| 신뢰도 칩 | 추출 항목별 신뢰도 표시 | `ConfidenceChip` | ✅ (#70) |

### 3-4. 채점 (Scoring)
| 기능 | 설명 | 구현 | 상태 |
|---|---|---|---|
| 라이브 채점 API | `POST /api/score` — Haiku, 5영역 0~100점 | `app/api/score/route.ts` · `prompt.ts` · `grading.ts` | ✅ (~#65) |
| Rate limit | 2-tier 분당 제한(사용자당 10·IP당 60) — score·extract·coach 공통 | `middleware.ts` · `rate-limit.ts`(순수 카운터) | ✅ (#65·#71) |
| 5영역 rubric | 과제이해·내용충실도·구조논리·표현문장·성장가능성 | `rubric-criteria.ts` · `data/scoring.ts` | ✅ |
| 결과 뷰 | 점수·영역별 피드백·수정 가이드 | `ResultView` · `app/results` | ✅ |
| 본문 주석 | 글에 인라인 피드백 주석 | `AnnotatedBody` · `annotate.ts` | ✅ |
| 수정 전/후 비교 | 수정 가이드 diff·토글 | `FeedbackDiff` · `RevisionToggle` · `RevisionBodyView` · `revision.ts` | ✅ |
| 성장 카드 | 성장 가능성 요약 | `GrowthCard` | ✅ |

### 3-5. 에디터 (RichEditor)
| 기능 | 설명 | 구현 | 상태 |
|---|---|---|---|
| 공용 리치 에디터 | TipTap 기반, 평문 투영(reducer 무수정) | `RichEditor` · `editor-doc.ts` | ✅ (#86) |
| 에디터 툴바 | 서식·폰트 크기 | `EditorToolbar` · `font-size.ts` | ✅ (#86) |

### 3-6. 셸·홈·네비게이션 (PUDS)
| 기능 | 설명 | 구현 | 상태 |
|---|---|---|---|
| 대시보드 셸 | PUDS dashboard shell(collapse 토글·left tabs·tabbar) | `app-shell.tsx` · `nav-adapter.ts` | ✅ (#81~#85) |
| OS 스타일 홈 | 홈 리뉴얼 + 웰컴 배너 | `app/page.tsx` · `HomeWelcomeBanner` | ✅ (#81) |
| 네비게이션 | 섹션 내비·브레드크럼·CTA 밴드 | `SectionNav` · `Breadcrumb` · `CtaBand` | ✅ |

### 3-7. 결과 내보내기·공유
| 기능 | 설명 | 구현 | 상태 |
|---|---|---|---|
| 내보내기 버튼 | 결과 이미지/프레임 내보내기 | `ExportButtons` · `ExportableResultFrame` | ✅ |
| 복사 | 결과 텍스트 복사 | `CopyButton` | ✅ |

### 3-8. 프로필·개인화 (`/me`)
| 기능 | 설명 | 구현 | 상태 |
|---|---|---|---|
| 프로필 입력 | 학생 프로필 폼·검증 | `ProfileForm` · `coach-profile.ts` · `profile-validate.ts` | ✅ |
| 내 사용 현황 | LRU 사용량 시각화 카드 | `app/me/page.tsx` · `MetaUsageCard` · `storage.ts` | ✅ (#56) |
| 온보딩 | 첫 진입 안내 | `app/onboarding/page.tsx` | ✅ |

### 3-9. 동의·연령 정책
| 기능 | 설명 | 구현 | 상태 |
|---|---|---|---|
| 동의 고지 | 데이터 사용 동의 안내 | `ConsentNotice` · `consent.ts` · `consent-store.ts` | ✅ |
| 연령 정책 | 연령 기반 정책 게이트 | `age-policy.ts` | ✅ |
| 신뢰 라벨 | AI 한계·신뢰도 고지 | `TrustLabel` | ✅ |

### 3-10. 교사 도구 (`/teacher`)
| 기능 | 설명 | 구현 | 상태 |
|---|---|---|---|
| 루브릭 | 교사용 루브릭 화면 | `app/teacher/rubric/page.tsx` · `teacher-rubric.ts` | ✅ |
| 과정 로그 | 학생 작성 과정 로그 | `app/teacher/log/page.tsx` · `process-log.ts` | ✅ |

### 3-11. 레거시 채점 위저드 (`/try`)
| 기능 | 설명 | 구현 | 상태 |
|---|---|---|---|
| 직접 채점 위저드 | 과제 메타 입력 → 글 입력 → 채점(과정 코치 이전 동선) | `TryClient` · `ScoreForm` · `MetaForm` · `Stepper` · `ProgressDots` | 🧪 병행 유지 / 🔶 재설계 진행(PR #87 OPEN — ScoreForm 1040줄 → `useScoreForm` 훅 + 3-스텝) |

---

## 4. API 엔드포인트
| 메서드·경로 | 기능 | 모델 | 비고 |
|---|---|---|---|
| `POST /api/extract` | 안내서 라이브 추출 | Haiku 4.5 | x-demo-token 게이트, 에러 envelope `E-CAP`, rate limit 사용자10·IP60/min |
| `POST /api/score` | 라이브 채점(5영역) | Haiku 4.5 | rate limit 사용자10·IP60/min, `maxDuration=60` |
| `POST /api/coach` | 코치 상호작용 응답 | Haiku 4.5 | 코치 스키마·프롬프트 기반, rate limit 사용자20·IP120/min |

> rate limit은 세 라우트 모두 `middleware.ts`에서 2-tier(사용자 anonId·IP)로 적용. 한도는 [middleware.ts](../../middleware.ts) `SCORE_LIMITS`/`EXTRACT_LIMITS`/`COACH_LIMITS` 참조.

---

## 5. 횡단(인프라)·운영
| 기능 | 설명 | 구현 | 상태 |
|---|---|---|---|
| 토큰 게이트 | 데모 비밀번호(상수시간 비교) | `TokenGate` · `DEMO_ACCESS_TOKEN` | ✅ (#64) |
| 모델 호출 단일화 | Anthropic 호출 단일 모듈 | `anthropic.ts` · `app/lib/server` | ✅ (#67) |
| 모델 버전 메타 | 응답 모델/버전 추적 | `model-version.ts` | ✅ |
| 에러 모니터링 | Sentry 통합(미설정 시 no-op) | `instrumentation*.ts` · `next.config.ts` | ✅ (#60) |
| 미들웨어 | 라우팅/게이트(→ `proxy` 네이밍 마이그 예정) | `middleware.ts` | ✅ |
| 테스트 | unit(scripts) · components(Vitest) · e2e(Playwright) | `scripts/*.test.mjs` · `vitest` · `e2e/` | ✅ (CI 4잡) |

---

## 6. 데모 데이터
- **5종 학생 글 샘플 (anchor)** — `app/data/samples.ts`
  | 샘플 | 학년·과목·장르 | 총점 | 구간 |
  |---|---|---:|---|
  | D | 중1 도덕 논설문(자율) | 40 | 토대 보강 필요 |
  | C | 고3 국어 설명문(시계) | 61 | 기본 토대(편차 8) |
  | A | 중2 국어 설명문(화산) | 74 | 기본 토대 |
  | E | 고1 국어 감상문(광야) | 85 | 보완하면 좋은 글 |
  | B | 고3 사회 설명문(영해·EEZ) | 86 | 보완하면 좋은 글 |
- 샘플 상세: `/samples`, `/samples/[id]`

---

## 7. 배포 게이트 (6/30 운영 배포 관련 — 코드 외)
- 🔶 PR #79 대필 가드 covert 차단 closure (배포 전 필수 — 대필 0 불변식)
- 🔶 PR #72 글쓰기 경험 설계 docs 머지
- 🔶 PR #87 `/try` 가이드형 위저드 재설계 (배포 차단 아님 — 레거시 동선 개선)
- ⚠ 운영 배포 파이프라인(local→dev→main) + 도메인 alias + 실 env 키 주입 — `운영 배포 파이프라인 공수 산정` 참조
