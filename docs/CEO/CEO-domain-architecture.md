# 풀림 도메인 아키텍처 — Dev 핸드오프

**작성일**: 2026-05-27
**결정**: `pullim.ai` = 마케팅 사이트. 각 서비스 = 서브도메인 (`studio.pullim.ai` …)
**상태**: 제안 — dev 팀 검토용

---

## 1. 도메인 맵 (전체 구조)

```
                         ┌─────────────────────────────────┐
                         │          pullim.ai              │
                         │     마케팅 사이트 (Vercel)       │
                         │   정적 · 백엔드 호출 없음         │
                         │   www.pullim.ai → 301 redirect   │
                         └───────────────┬─────────────────┘
                                         │ "무료 체험 / 지금 시작" CTA = 링크 아웃
            ┌────────────────────────────┼────────────────────────────┐
            │                            │                            │
   ┌────────▼─────────┐        ┌─────────▼────────┐        ┌──────────▼────────┐
   │  Flagship 서비스  │        │  Extension 서비스 │        │   공용 인프라      │
   └──────────────────┘        └──────────────────┘        └───────────────────┘
   studio.pullim.ai            arcade.pullim.ai            api.pullim.ai   (ECS 백엔드)
   store.pullim.ai             writing.pullim.ai           auth.pullim.ai  (SSO, 선택)
   planner.pullim.ai           exam.pullim.ai              cdn.pullim.ai   (S3/CloudFront, 선택)
   classbot.pullim.ai
   q.pullim.ai                 reader.dev.pullim.ai  ← 이미 AWS에 존재 (유지)
   library.pullim.ai

   모든 *.pullim.ai = 같은 site (cookie/SSO 공유 가능)
```

---

## 2. 서브도메인 → 서비스 → 현재 배포 매핑

| 서브도메인 | 서비스 | 위계 | 현재 라이브 | 호스팅(제안) |
|---|---|---|---|---|
| `pullim.ai` | 마케팅 | — | pullim-web.vercel.app | **Vercel** |
| `studio.pullim.ai` | 풀림 스튜디오 | Flagship | (없음 — 신규) | Vercel 또는 ECS |
| `store.pullim.ai` | 풀림 스토어 | Flagship | (없음 — 신규) | ECS (커머스·결제) |
| `planner.pullim.ai` | 풀림 플래너 | Flagship | pullim-planner.vercel.app | Vercel |
| `classbot.pullim.ai` | 풀림 클래스봇 | Flagship | pullim-classbot.vercel.app | Vercel |
| `q.pullim.ai` | 풀림 문제Q | Flagship | pullim-q.vercel.app | Vercel |
| `library.pullim.ai` | 풀림 라이브러리 | Flagship | (출시 예정) | TBD |
| `arcade.pullim.ai` | 풀림 아케이드 | Extension | pullim-games.vercel.app | Vercel |
| `writing.pullim.ai` | 풀림 라이팅코치 | Extension | pullim-demo.vercel.app | Vercel |
| `exam.pullim.ai` | 풀림 입시코치 | Extension | (출시 예정) | TBD |
| `reader.dev.pullim.ai` | 풀림 리더 | (모듈) | reader.dev.pullim.ai | **AWS (기존 유지)** |
| `api.pullim.ai` | 백엔드 API | 인프라 | ECS dev/main | **AWS ECS** |

> 네이밍 규칙: 서브도메인은 *영문 서비스 슬러그* 사용 (브랜드 가이드 §2의 한국어-우선은 *표시 텍스트*에만 적용, URL은 영문 관례).

---

## 3. 요청·인증 흐름

```
  사용자 브라우저
       │
       │ 1) pullim.ai 방문 (마케팅, 로그인 없음)
       │ 2) "무료 체험" 클릭 → studio.pullim.ai 로 이동 (단순 링크)
       ▼
  studio.pullim.ai (서비스 앱)
       │
       │ 3) 로그인 → auth.pullim.ai 또는 api.pullim.ai/auth
       │    쿠키 발급: Domain=.pullim.ai; SameSite=Lax; Secure; HttpOnly
       ▼
  api.pullim.ai (ECS 백엔드)
       │ 4) studio·store·q 등 모든 *.pullim.ai 가
       │    같은 쿠키로 인증 (SSO) — 한 번 로그인 = 전 서비스 유효
       ▼
  DB / Redis (VPC 내부, public 비노출)
```

**핵심 이점**: 모든 서비스가 `*.pullim.ai` 라서 **same-site** → 쿠키 한 번 발급으로 전 서비스 SSO. (별도 도메인이었다면 cross-site cookie + `SameSite=None` 강제 + 재로그인 문제 발생)

---

## 4. 기술 고려사항

### 4.1 DNS (AWS Route 53 — 기존 hosted zone 유지)
- apex `pullim.ai` + `www` → Vercel (`A 76.76.21.21` / `CNAME cname.vercel-dns.com`)
- Vercel 호스팅 서브도메인 (`studio·planner·classbot·q·arcade·writing`) → 각각 `CNAME cname.vercel-dns.com` + Vercel 프로젝트에 도메인 추가
- ECS 호스팅 (`api·store`) → ALB/CloudFront 대상 `A`(alias) 레코드
- `reader.dev` → 기존 그대로
- **nameserver는 Route 53 유지** — Vercel로 NS 이전 X (기존 서브도메인 보호)

### 4.2 SSL / 인증서
- Vercel 서브도메인 → Vercel이 Let's Encrypt 자동 발급·갱신 (서브도메인마다 자동)
- ECS 서브도메인 → ACM 와일드카드 인증서 `*.pullim.ai` 1장으로 ALB/CloudFront 커버 권장
- 와일드카드 `*.pullim.ai` ACM 인증서를 미리 발급해두면 ECS 측 신규 서브도메인 추가가 빨라짐

### 4.3 CORS (서비스↔API)
- `api.pullim.ai`를 `studio·store·q…`가 호출 → **cross-origin (서브도메인 다름) 이지만 same-site**
- 백엔드 CORS allowlist: 정규식 `^https://([a-z0-9-]+\.)?pullim\.ai$` 로 모든 서브도메인 허용
- Vercel preview URL (`*-git-*.vercel.app`) 은 *서비스 앱이 Vercel일 때만* 별도 허용 필요 — 정규식 `^https://pullim-.*\.vercel\.app$`
- `Access-Control-Allow-Credentials: true` (쿠키 전송)

### 4.4 쿠키 / SSO (서브도메인 구조의 최대 장점)
- 인증 쿠키: `Domain=.pullim.ai; SameSite=Lax; Secure; HttpOnly`
- `.pullim.ai` (leading dot) → 모든 서브도메인에서 읽힘 = SSO 자동
- `SameSite=Lax` 면 충분 (same-site라 None 불필요 → 더 안전, 3rd-party 쿠키 차단 영향 없음)
- refresh token도 `.pullim.ai` scope로 발급
- 마케팅 사이트(pullim.ai)는 인증 쿠키 발급/소비 안 함 — 영향 없음

### 4.5 환경변수 / 백엔드 타게팅
- 각 서비스 Vercel 프로젝트의 `NEXT_PUBLIC_API_URL`:
  - prod 서비스 → `https://api.pullim.ai`
  - preview/dev → `https://api.dev.pullim.ai` (dev ECS)
- 마케팅 사이트: `NEXT_PUBLIC_API_URL` 불필요 (백엔드 호출 없음), `NEXT_PUBLIC_SERVER_URL=https://pullim.ai`만

### 4.6 이미지 / CDN
- 서비스 앱이 S3/백엔드 이미지 사용 시 각 `next.config.js`의 `images.remotePatterns`에 `cdn.pullim.ai`·S3 도메인 등록
- 마케팅 사이트: 전부 로컬(`public/`) → 해당 없음 (추후 백엔드 이미지 임베드 시 추가)

### 4.7 SEO / Canonical
- `pullim.ai` (마케팅) = 검색 인덱싱 대상 (정식)
- 서비스 앱의 **로그인·앱 내부 경로**는 `robots.txt` disallow + `noindex` (검색 노출 불필요)
- 서비스 앱의 *공개 랜딩*이 있다면 canonical을 마케팅 사이트의 해당 제품 페이지(`pullim.ai/products/studio`)로 통합
- 마케팅↔서비스는 *역할이 다른 사이트*라 duplicate content 아님

### 4.8 배포 소유권 / 모니터링
| 환경 | 배포 | CI | 로그 | 알람 |
|---|---|---|---|---|
| 마케팅 (pullim.ai) | Vercel (~1분) | Git push | Vercel dashboard | Vercel Analytics |
| 서비스 (Vercel) | Vercel | Git push | Vercel | Vercel |
| 서비스/API (ECS) | Docker (~5-10분) | 기존 파이프라인 | CloudWatch | 기존 알람 |
- 마케팅은 독립 repo·배포 → ECS 배포 사이클과 무관 (시간차 부조화 없음)
- 통합 알람 필요 시 Vercel → Slack 웹훅 + CloudWatch → Slack 같은 채널로 합치기

### 4.9 Vercel 한계 (서비스 앱이 Vercel일 때)
- Function timeout: Pro 60s / Hobby 10s — 긴 배치·리포트 생성은 ECS 위임
- Edge runtime Node API 제한 (Buffer 등) — 무거운 처리는 ECS API로
- 트래픽·function 비용 별도 청구 → 트래픽 큰 서비스(store 결제 등)는 ECS 권장

### 4.10 공유 자산 (브랜드 일관성)
- 풀림 디자인 토큰 (`--pullim-blue` 등 9 심볼·인증 마크) → 별도 npm 패키지 `@pullim/brand` 또는 공유 레포로 추출해 마케팅+전 서비스가 동일 토큰 사용 권장
- 현재 마케팅 사이트의 `globals.css` 토큰 + 9 심볼 SVG가 단일 소스가 될 수 있음

---

## 5. 단계적 적용 (권장 순서)

```
Phase 0 (지금)   pullim.ai 마케팅 라이브 (Vercel) + Route 53 A 레코드
Phase 1          ACM 와일드카드 *.pullim.ai 발급 (ECS 측 준비)
Phase 2          기존 라이브 4개 서브도메인 연결:
                   planner / classbot / q / arcade(games) → *.pullim.ai CNAME
Phase 3          백엔드 CORS allowlist 정규식 + 쿠키 Domain=.pullim.ai 적용
Phase 4          SSO: auth 통합 → 한 번 로그인 전 서비스 유효
Phase 5          store(결제)·library·exam·writing 정식 서브도메인
Phase 6          SEO: robots/canonical 정리, 통합 알람
```

---

## 6. DNS 레코드 치트시트 (Route 53)

```
# 마케팅 (Vercel)
pullim.ai            A      76.76.21.21
www.pullim.ai        CNAME  cname.vercel-dns.com.

# Vercel 호스팅 서비스
studio.pullim.ai     CNAME  cname.vercel-dns.com.
planner.pullim.ai    CNAME  cname.vercel-dns.com.
classbot.pullim.ai   CNAME  cname.vercel-dns.com.
q.pullim.ai          CNAME  cname.vercel-dns.com.
arcade.pullim.ai     CNAME  cname.vercel-dns.com.
writing.pullim.ai    CNAME  cname.vercel-dns.com.
   (+ 각 도메인을 해당 Vercel 프로젝트 Settings → Domains 에 추가)

# ECS 호스팅 (ALB/CloudFront alias)
api.pullim.ai        A(alias)   → ALB / CloudFront
store.pullim.ai      A(alias)   → ALB / CloudFront

# 기존 유지
reader.dev.pullim.ai (그대로)
```

---

## 7. 결정 필요 항목 (dev 팀)

1. studio·store를 Vercel vs ECS 중 어디에 둘지 (결제 있는 store는 ECS 권장)
2. SSO 도입 시점 (Phase 4) — auth 서버 분리 vs api 통합
3. ACM 와일드카드 발급 담당
4. 공유 브랜드 토큰 패키지화 여부 (`@pullim/brand`)
5. dev 환경 서브도메인 컨벤션 (`studio.dev.pullim.ai` 등)
