# writing-coach 로컬 OS-SSO 셋업 (`writing.pullim.local:3008`)

writing-coach를 풀림 OS 쿠키 SSO 셋에 로컬에서 합류시키는 절차. prod와 동일한 서브도메인 쿠키 SSO를 재현한다.

> **SoT(복제 금지 — 링크)**
> - 절차 전반: pullim-web 런북 `docs/common/2026-06-22-local-pullim-local-sso/runbook.md`
> - 포트·호스트 맵: pullim-api `.claude/rules/local-ports.md` (라이팅코치 = **3008**, `writing.pullim.local:3008`)
> - FE 인증 함정: pullim-api `docs/planner/2026-06-22_pullim-api-handoff_planner-fe-auth-gotchas.md`
>   (①로그인 시 CSRF 토큰 회전 ②`*.pullim.local` same-site 도메인 필수) — 본 구현이 둘 다 반영.

## 1. `/etc/hosts` (1회, sudo — 본인 터미널에서)
기존 SSO 한 줄에 `writing.pullim.local` 을 덧붙인다(한 줄 그대로):
```bash
sudo sed -i '' '/pullim\.local/d' /etc/hosts && \
echo '127.0.0.1 pullim.local os.pullim.local api.pullim.local writing.pullim.local' | sudo tee -a /etc/hosts
ping -c1 writing.pullim.local   # 127.0.0.1 이면 OK
```

## 2. writing-coach `.env.local`
```dotenv
NEXT_PUBLIC_PULLIM_API_URL=http://api.pullim.local:3000
NEXT_PUBLIC_PULLIM_CSRF_COOKIE=local-pullim-csrf
NEXT_PUBLIC_OS_URL=http://os.pullim.local:3001
# (선택) 로컬 인증 우회: NEXT_PUBLIC_DEV_AUTH_BYPASS=1
```
> `NEXT_PUBLIC_*`는 dev 서버 기동 시 주입 → 변경 후 **재시작**.

## 3. pullim-api 로컬 `.env` (CORS)
writing-coach 오리진을 `CORS_LOCAL_ORIGINS`에 추가(설정된 포트만 허용 → 명시 필수):
```dotenv
CORS_LOCAL_ORIGINS=http://os.pullim.local:3001,http://pullim.local:3001,http://api.pullim.local:3000,http://writing.pullim.local:3008,http://localhost:3001
```
> `isValidLocalOrigin`·`REDIRECT_HOST_ALLOWLIST`는 이미 `*.pullim.local` 허용(런북 §7) — pullim-api **코드 변경 없음**, 로컬 `.env` 값만. 변경 후 API 재시작.

## 4. 실행
```bash
# pullim-api (3000), pullim-web/OS (3001) 는 런북 env로 기동
# writing-coach:
npm run dev:sso     # next dev -p 3008  → http://writing.pullim.local:3008
```

## 5. 테스트 계정 (pullim-api dev 전용 — writing 권한 부여)
```bash
curl -X POST http://api.pullim.local:3000/auth/dev/seed-member \
  -H 'content-type: application/json' \
  -d '{"email":"wc@test.local","password":"...","flags":{"writing":1}}'
```
> `flags.writing` 미보유 계정은 헤더에 "라이팅코치 이용권 필요" 표시(정상). 실 가입은 KCB 본인인증 강제 → 테스트는 seed-member 권장.

## 6. 검증
1. `http://os.pullim.local:3001/login` 로그인 → `http://writing.pullim.local:3008` 이동.
2. 상단 헤더가 **로그아웃**(인증) 상태 — 콘솔 CORS/CSRF 에러 없음.
3. 네트워크 탭: `writing.pullim.local` → `api.pullim.local:3000/me/entitlements`·`/auth/*` 요청에 `cookie` 헤더 실림, 200.
4. `flags.writing` 없는 계정 → "이용권 필요"(403, /login 무한루프 아님).
5. 폴백: `localhost:3008`은 SSO 미동작(런북 §6) — `NEXT_PUBLIC_DEV_AUTH_BYPASS=1` 또는 기존 데모 토큰으로만.

## 구현 메모
- 신원 레이어: `app/lib/auth/{pullim-http,pullim-session,auth-context}.ts(x)` — pullim-planner `packages/api-client` 이식. 세션/엔타이틀먼트는 서비스 무관 **`GET /me/entitlements`**(account 모듈)로 `flags.writing` 판정(writing 모듈 부재).
- 헤더 컨트롤: `app/components/SsoAuthButton.tsx` (DashboardShell `actions` 슬롯).
- **자체 데모 토큰(TokenGate)·제품 API(`/api/{score,extract,coach}`)는 그대로 유지** — SSO는 사용자 신원/게이팅 레이어로 additive. 제품 API 인증을 SSO 세션으로 옮길지는 별도 아키텍처 결정(standalone vs 중앙).
