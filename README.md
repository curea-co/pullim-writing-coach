# Pullim Writing Coach

수행평가 글을 **AI가 5가지 기준으로 첨삭**해 주는 교육 서비스의 Week 1 산출물 데모입니다.
학생이 과제 정보와 글을 입력하면, 5영역 점수 · 영역별 피드백(잘한 점/고칠 점) · 수정 가이드를
학생용 코칭 톤으로 돌려줍니다.

> 🔗 **데모**: https://pullim-demo.vercel.app
>
> 5개 학생 글 샘플(저점·편차·중점·중상·고점)의 채점 결과를 미리 볼 수 있습니다.

---

## 채점 5영역 (rubric v0.5)

| 영역 | 평가 |
|---|---|
| 과제 이해 | 과제 조건·질문에 정확히 답했는가 |
| 내용 충실도 | 근거·예시·배경지식이 충분한가 |
| 구조·논리 | 서론-본론-결론·문단 연결·전개가 자연스러운가 |
| 표현·문장 | 문장 호흡·어휘·맞춤법·표현 다양성이 적절한가 |
| 성장 가능성 | 한 번의 수정으로 완성도가 오를 수 있는 상태인가 |

각 영역 0~20점, 총 100점. 색상 가이드: 0~9 주의 / 10~14 보통 / 15~20 양호.

## 데모에 담긴 5종 샘플

| 샘플 | 학년·과목·장르 | 총점 | 구간 |
|---|---|---:|---|
| D | 중1 도덕 논설문 (자율) | 40 | 토대 보강 필요 |
| C | 고3 국어 설명문 (시계) | 61 | 기본 토대 (영역 편차 8점) |
| A | 중2 국어 설명문 (화산) | 74 | 기본 토대 |
| E | 고1 국어 감상문 (광야) | 85 | 보완하면 좋은 글 |
| B | 고3 사회 설명문 (영해·EEZ) | 86 | 보완하면 좋은 글 |

> 현재 데모의 채점 결과는 rubric v0.5를 적용한 **EPO 자체 채점 시뮬레이션**입니다.
> 실제 AI(Anthropic API) 호출 재현 검증은 다음 단계입니다.

---

## 기술 스택

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** — 시맨틱 토큰(`@theme`) 기반, `cn()`(clsx + tailwind-merge) 유틸
- 정적 생성(SSG) — 5개 샘플 페이지 사전 렌더
- 배포: **Vercel**

> 본 데모는 standalone 프로토타입입니다. pullim 프로덕션 프런트(`apps/web`) 이관 시
> `@pullim/design-system` 컴포넌트화 · next-intl i18n · Container/Presenter 패턴 적용이 필요합니다
> (`docs/11_demo_design_ux_audit_2026-05-20.md` 참고).

## 로컬 실행

```bash
npm install
npm run dev   # http://localhost:3000
npm run build # 프로덕션 빌드
```

## 디렉터리

```
app/
├── page.tsx                 # 홈 — 5종 샘플 목록
├── samples/[id]/page.tsx    # 샘플 상세 — 점수·피드백·수정 가이드·복사
├── components/CopyButton.tsx
├── data/samples.ts          # 5종 샘플 입력·F3 출력 데이터 + 색상/구간 헬퍼
├── lib/utils.ts             # cn()
├── layout.tsx
└── globals.css              # 시맨틱 토큰 정의
docs/                        # 기획 산출물 01~11 (09 prompt-verification은 미작성)
```

## 기획 문서 (docs/)

| # | 문서 | 내용 |
|---|---|---|
| 01 | [feature_proposal](docs/01_feature_proposal_2026-05-14.md) | MVP 7카드·기능 범위 |
| 02 | [functional_spec v0.3](docs/02_functional_spec_v.3_2026-05-19.md) | 입력/출력 JSON 스키마, 화면 기능 명세 |
| 03 | [wireframe v0.3](docs/03_wireframe_first_screen_v.3_2026-05-19.md) | 첫 화면 라벨·구성 |
| 04 | [rubric v0.5](docs/04_rubric_v.5_2026-05-19.md) | 5영역×5구간 채점 기준 |
| 05 | [student_samples v.3](docs/05_student_samples_v.3_2026-05-19.md) | 대표 샘플 5종 |
| 06 | [ai_feedback_outputs v.4](docs/06_ai_feedback_outputs_v.4_2026-05-19.md) | F3 채점 출력 5건 |
| 07 | [pm_review v.2](docs/07_pm_review_v.2_2026-05-19.md) | EPO 수동 검수 코멘트 |
| 08 | [ai_prompt v0.1](docs/08_ai_prompt_v.1_2026-05-19.md) | AI 첨삭 프롬프트 + 강제 룰 |
| 10 | [freeze_review_request](docs/10_freeze_review_request_2026-05-20.md) | freeze 리뷰 요청 패키지 |
| 11 | [demo_design_ux_audit](docs/11_demo_design_ux_audit_2026-05-20.md) | 데모 디자인·UX writing audit |

---

## 샘플 출처 · 윤리 표기

데모의 학생 글 본문 중 **샘플 A·B·C**는 아래 연구에 수록된 중·고등학생의 정보 전달 글(설명문)을
**인용·발췌**한 것입니다. 학년·과목·과제 맥락 등 메타데이터는 채점 시연을 위해 부여한 것으로
원 연구의 분류와 다를 수 있습니다. **샘플 D·E**는 시연용으로 새로 작성한 글입니다.

> 김은태 & 정혜린. (2024). 설명문 쓰기 수업에 대한 국어 교사의 실천적 지식 탐구 - 3년간의 설명하는 글쓰기 수업 및 평가를 중심으로. 국어교육학연구, 59(3), 5-38.
>
> 김경환. (2021). 중ㆍ고등학생 글에 나타난 작문 능력 - 정보 전달 글을 중심으로. 한국어문교육, 37, 89-129.

> ※ 채점 결과는 AI 자동 채점입니다. 학교 교사의 실제 채점과 다를 수 있습니다.
