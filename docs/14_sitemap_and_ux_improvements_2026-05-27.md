# Pullim Writing Coach — 사이트맵 + UX 개선 (curea.co/platform/layers 레퍼런스)

> 작성일: 2026-05-27 / 최선혜 (UX·디자인)
> 레퍼런스: https://curea.co/platform/layers
> 제약: **색상·폰트는 현재 토큰(`globals.css` 시맨틱 토큰 · Pretendard) 그대로 유지.** 구조·레이아웃·메뉴 depth·컴포넌트 패턴만 차용.

---

## 0. 레퍼런스 분석 (색·폰트 제외)

### 0.1 화면 UI / 레이아웃
- 상단 고정 헤더(메가 메뉴) + **매우 긴 단일 스크롤 페이지를 번호 매긴 섹션(01~07)으로 분할**
- 각 섹션 = `LAYER 0N` 라벨 + 큰 H2 + 본문 → **좌측 sticky 섹션 내비**로 점프, 스크롤 시 활성 표시(scroll-spy)
- 닫는 **CTA 밴드** + 푸터

### 0.2 메뉴 구성 / depth
- 1차: Platform / Solutions / Customers & Resources / Company + Docs·Careers·Contact(직접 링크)
- 2차: 드롭다운이 **다중 컬럼 그룹**(Platform → Engine·Data·Developer 열) — 2-depth 명확
- 페이지 내 2차 내비: `Platform layers navigation` 7개 **번호 항목**(01 QGen엔진 … 07 엔진 API)

### 0.3 컴포넌트 인벤토리
메가 메뉴 드롭다운 · sticky 번호 섹션 내비(scroll-spy) · 3-up 피처 카드 · 코드 블록 · 데이터 테이블 · 스탯 콜아웃(4,800 · 88.5%) · 배지/필(★) · 프로세스 다이어그램 · CTA 밴드 · 푸터

---

## 1. 사이트맵 (현재 + 개선 후)

```text
Pullim Writing Coach (데모)
│
├─ /                      홈 — 히어로 + 3-up 피처 카드 + 샘플 5종 그리드 + CTA 밴드 + 푸터
│
├─ /try                   직접 채점받기 (라이브)
│   ├─ [게이트] TokenGate         데모 접근 토큰 (E-AUTH)
│   ├─ 입력 폼 ScoreForm          과제 정보(F1) + 학생 글(F2)
│   └─ 결과 ResultView            ← 공유 결과 뷰 (아래 /samples 와 동일 UI)
│        ├─ #result-score      01 점수
│        ├─ #result-feedback   02 영역별 피드백
│        └─ #result-guide      03 수정 가이드
│
└─ /samples/[id]          샘플 채점 결과 (정적 5종: d·c·a·e·b)
    ├─ Breadcrumb                 홈 / 샘플 / {label} {category}   ← 신규(depth)
    ├─ 좌: 과제 정보 + 학생 글(출처 표기)
    └─ 우: ResultView (#result-score / #result-feedback / #result-guide + sticky SectionNav)
                                  + CTA 밴드 → /try               ← 신규

좌측 글로벌 내비(Sidebar, 반응형 — 데스크톱 고정 / 모바일 드로어)
├─ [둘러보기]        홈 · 직접 채점받기(라이브)        ← 그룹 라벨 신규(depth)
└─ [샘플 채점 결과]  D 저점 · C 편차 · A 중점 · E 중상 · B 고점 (점·총점)
```

> 범위 밖(Month 2+): 채점 이력(F13)·재제출 비교, 문서 인덱스 페이지, About/회사 메뉴(데모엔 과함).

---

## 2. 적용한 개선 (레퍼런스 → WC 매핑)

| # | 레퍼런스 패턴 | WC 적용 | 컴포넌트/파일 |
|---|---|---|---|
| 1 | sticky **번호 섹션 내비**(scroll-spy) | 결과 뷰에 `01 점수 · 02 피드백 · 03 가이드` sticky 핀 + 스크롤 활성 표시 | `SectionNav.tsx` (신규, client) · `ResultView.tsx` |
| 2 | `LAYER 0N` 섹션 라벨 | 결과 카드 헤더에 `01·02·03` 번호 부여 | `ResultView.tsx` |
| 3 | 명확한 계층(2-depth) | 샘플 상세 상단 **브레드크럼**(홈/샘플/라벨) — 기존 "← 목록" 텍스트 링크 대체 | `Breadcrumb.tsx` (신규) |
| 4 | 닫는 **CTA 밴드** | 홈·샘플 하단에 "직접 글을 넣어 채점받기 →/try" 밴드 | `CtaBand.tsx` (신규) |
| 5 | **3-up 피처 카드** | 홈 "이 데모가 보여주는 것" 불릿 → 3장 카드(5영역 채점 / 코칭 톤 / 점수대 5케이스) | `page.tsx` |
| 6 | 그룹화된 메뉴 depth | 사이드바 상단에 `둘러보기` 그룹 라벨 추가(기존 `샘플 채점 결과`와 대칭) | `Sidebar.tsx` |

### 2.1 일부러 차용하지 않은 것
- **상단 메가 메뉴**: WC는 3페이지 데모 — 좌측 사이드바가 이미 충분. 메가 메뉴는 과설계.
- **데이터 테이블/코드 블록/모델 라우팅**: 레퍼런스는 플랫폼 마케팅 사이트. WC 학생용 데모엔 부적합.
- **색상·폰트**: 지시대로 현 토큰 유지 — 신규 색 토큰 0개.

---

## 3. 비기능 / 정합
- 신규 색·폰트 토큰 0 (기존 시맨틱 토큰만 재사용)
- `ResultView`는 서버·클라 공유 유지 — `SectionNav`(client island)만 중첩, 번들 누수(issue #4) 패턴 보존
- 검증: `tsc --noEmit` · `next build` · 브라우저 스크린샷(홈·샘플 상세)
