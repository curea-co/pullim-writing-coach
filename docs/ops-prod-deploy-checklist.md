# 운영(prod) 배포 체크리스트 — writing-coach RDS 전환·인증

> 목적: **운영 배포 시 사용자 인증·저장이 조용히 깨지지 않게** 한다. writing-coach 는 중앙 SSO
> 소비자 + api 호스트 직접호출(direct-call) 아키텍처다 — 브라우저가 `api.pullim.ai` 를 직접 호출
> (`credentials:include`, `.pullim.ai` 쿠키). 따라서 **① Vercel env ② api CORS** 두 가지가 prod 를
> 좌우한다. (BFF 이관은 로컬 SSO·중앙 로그인 위임과 충돌 — 별도 트랙, `docs/superpowers/...` 참조.)

배포 순서(오픈 7/10 역산): **dev 반영(완) → prod 반영(7/9) → 오픈(7/10)**.

## 0. 선행(코드) — dev 에 반영 완료

- [x] pullim-api `/writing/data` KV 표면(#355) · dev RDS `writing` 스키마
- [x] writing-coach relay 어댑터(#129) · UI/auth 오류수정(#130)
- [x] 인증 미설정 fail-loud 가드(use-auth) — env 누락 시 조용한 게스트 대신 `error` 노출

## 1. prod Vercel 환경변수 (writing-coach)

Settings → Environment Variables → **Production** 스코프:

| 변수 | prod 값 | 없으면 |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.pullim.ai` | **로그인·저장 전면 실패**(가드가 `연결 오류` 노출) |
| `NEXT_PUBLIC_WEB_URL` | `https://pullim.ai` | 로그인 버튼 리다이렉트 실패 |
| `NEXT_PUBLIC_OS_URL` | `https://os.pullim.ai/os` | 미설정 시 prod 기본값(동일) — 무해 |
| `ANTHROPIC_API_KEY` | (설정됨) | 채점 실패 |
| `DEMO_ACCESS_TOKEN` | (설정됨) | 데모 게이트 |

> ⚠️ `NEXT_PUBLIC_*` 는 **빌드 시** 번들에 박힌다. env 변경 후 **반드시 재배포**(빌드 캐시 재사용 금지)해야
> 반영된다. 검증: 배포 후 `writing.pullim.ai` 번들에 `api.pullim.ai` 리터럴이 있는지 / Network 탭에서
> `/me` 가 `api.pullim.ai` 로 나가는지 확인.

## 2. prod api CORS — ✅ 확인됨 (2026-07-08)

`api.pullim.ai` 가 `https://writing.pullim.ai` origin 을 허용함(preflight 204 · `allow-origin` echo ·
`allow-credentials: true`). 별도 조치 불필요. (재확인:
`curl -sI -X OPTIONS https://api.pullim.ai/me -H "Origin: https://writing.pullim.ai" -H "Access-Control-Request-Method: GET"`)

## 3. prod RDS 마이그레이션 (7/9 · BE 담당자 승인 게이트)

dev 와 동일 방식(ECS one-off task, `pullim-api-prod` task-def, `APP_ENV=prod`)으로 `writing` 스키마 생성.
**prod 는 timing 무관 항상 사람 게이트** — BE 담당자 명시 승인 후 실행. `migration:show` 로 pending 이
`CreateWritingUserData` 하나뿐인지 먼저 확인 → `migration:run` → 재확인.

## 4. 배포 (dev → main)

writing-coach `main` 머지 시 Vercel 이 prod 자동배포. dev→main 은 인증 문서 런북(merge 순서) 따름.

## 5. 배포 후 종단 검증 (사용자 오픈 전 필수)

1. `writing.pullim.ai` 탭 제목 "풀림 라이팅 코치" · 파비콘 OS 마크
2. 로그인 → 헤더 **아바타 배지**(KCB 한글 실명) · Network `/me` → `api.pullim.ai` **200**
3. 채점 1건 → **저장 성공**(401 아님 — CSRF 쿠키 자동 부트스트랩) → 새로고침/타 기기 재로그인 시 데이터 귀속
4. 배지 메뉴 → **로그아웃**(404 아님, 게스트 복귀)
5. 콘솔에 `[use-auth] NEXT_PUBLIC_API_URL 미설정` 에러 **없어야** 함(있으면 §1 env 누락)

> 하나라도 실패 시 오픈 보류. §1(env)·§2(CORS)·§3(스키마) 순으로 원인 격리.
