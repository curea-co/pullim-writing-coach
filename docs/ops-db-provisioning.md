# DB 프로비저닝 런북 — writing-coach per-user store (Supabase Postgres)

writing-coach의 `/api/data/*`(per-user 데이터)가 쓰는 관리형 Postgres를 Supabase로 두고 Vercel에 연결한다.
리포는 준비됨: `app/lib/server/db.ts`(`postgres` 드라이버) · `scripts/db-migrate.mjs` · `db/migrations/0001_init.sql`.

> **왜 Supabase(관리형 서버리스 PG)인가**: Vercel 서버리스는 egress IP가 유동이라 자체 AWS RDS를 안전히
> 연결하려면 Static IP/PrivateLink(Vercel Enterprise)가 필요하다. 그게 없으면 0.0.0.0/0 공개(미성년
> 데이터에 부적절)뿐. Supabase는 자체 인증·TLS·커넥션 풀러(Supavisor)를 제공해 IP 허용목록 없이 안전하게
> 붙는다. 코드는 `postgres` 드라이버 그대로 재사용(추가 변경 없음).

---

## 1. Supabase 프로젝트 생성

- (권장) **Vercel → pullim-writing-coach → Integrations → Marketplace → Supabase** 설치. 프로젝트를 만들고
  Postgres env를 자동 주입한다(`POSTGRES_URL` 등). 또는
- **supabase.com 대시보드**에서 프로젝트 직접 생성.
- **리전**: 사용자와 가까운 곳(서울 가능 시 `Northeast Asia (Seoul)`, 없으면 Tokyo).
- ⚠️ 무료 티어는 미사용 시 일시정지(pause)됨 → 운영은 **Pro** 권장.

## 2. 접속 문자열 확보 (Supabase → Project Settings → Database → Connection string)

Supabase는 3종을 준다. 서버리스에는 **풀러**를 쓴다:

| 용도 | 종류 | 포트 | 형식 |
|---|---|---|---|
| **앱 런타임(Vercel)** | Transaction pooler (Supavisor) | 6543 | `postgresql://postgres.<ref>:PW@aws-0-<region>.pooler.supabase.com:6543/postgres` |
| **마이그레이션/psql** | Session pooler (또는 Direct) | 5432 | `postgresql://postgres.<ref>:PW@aws-0-<region>.pooler.supabase.com:5432/postgres` |

- 런타임은 **Transaction pooler(6543)** — 서버리스 다수 단명 커넥션에 적합. `db.ts`는 이미
  `prepare:false`(트랜잭션 풀러는 prepared statement 미지원) · `max:1` · `ssl:'require'`로 설정돼 있어 그대로 맞다.
- DDL(마이그레이션)은 **Session pooler(5432) 또는 Direct** 로. 트랜잭션 풀러는 DDL에 부적합할 수 있다.

## 3. 마이그레이션 (테이블 생성 — Session pooler로 1회)

리포 루트에서(접속문자열·비번을 argv/history에 남기지 않도록 `read -s`):
```bash
read -rs -p "DATABASE_URL (Session pooler 5432): " DATABASE_URL; echo; export DATABASE_URL
npm run db:migrate
# → [db:migrate] applying 0001_init.sql (2 statement(s)) / done
```
검증:
```bash
read -rs -p "PGPASSWORD: " PGPASSWORD; echo; export PGPASSWORD
psql "host=aws-0-<region>.pooler.supabase.com port=5432 dbname=postgres user=postgres.<ref> sslmode=require" \
  -c "\d writing_user_data"
```
> ⚠️ 러너(`scripts/db-migrate.mjs`)는 `;` 단순 분할 = **단순 DDL 전용**(문자열/함수 본문/`$$` 세미콜론 미지원).

## 4. Vercel 환경변수

Vercel → pullim-writing-coach → Settings → Environment Variables:
```
DATABASE_URL = <Transaction pooler(6543) 접속문자열>
```
- 🔴 **Production 에만 설정.** 표준 `*.vercel.app` 프리뷰는 SSO 쿠키(`Domain=.pullim.ai`)가 도달 안 해
  사용자가 게스트 → localStorage 경로라 미설정 OK. `.pullim.ai` alias 프리뷰에서 계정 기능을 테스트하려면
  **별도 Preview용 Supabase 프로젝트**가 필요(authed 요청은 `/api/data` 호출 — 미설정 시 에러, 폴백 아님).
- 서버 전용 — `NEXT_PUBLIC_` 접두 금지. 비번 특수문자는 percent-encoding(`@`→`%40`, `/`→`%2F` 등).
- Marketplace 통합이 `POSTGRES_URL` 등으로 주입했다면, 그 **Transaction pooler URL**을 `DATABASE_URL`로
  매핑(또는 `DATABASE_URL`을 직접 그 값으로 설정).

## 5. 종단 검증 (배포 후)

1. writing.pullim.ai 로그인 → 채점 1건 → `/results` 저장 확인.
2. **다른 브라우저/기기** 같은 계정 로그인 → 결과 보이면 계정 귀속 성공.
3. `/me` 데이터 삭제 → 성공 응답 후 비워짐.
4. 문제 시 Vercel Runtime Logs에서 `[db]`/`DATABASE_URL` 에러 확인.

## 6. 보안·비용

- 접속문자열(비번 포함)이 유일한 시크릿 — Vercel env에만. 채팅/로그/코드 금지.
- Supabase가 TLS·인증·풀링 담당(공개 IP 허용목록 불필요). 앱은 서버측에서 `/api/data`가 sub 스코프 강제.
- 비용: Free(개발/PoC, 미사용 시 pause) · Pro $25/mo~(운영).
- 미성년 에세이 저장 → 개인정보/보존정책 확정 후 실사용(별도 트랙).

## 7. (대안) 자체 AWS 유지가 필수라면
Vercel Static IP/Secure Compute(Enterprise)로 고정 IP 확보 후 RDS 허용목록, 또는 Aurora Serverless v2 +
RDS Data API(HTTPS·IAM, `@aws-sdk/client-rds-data`로 db.ts 재작성). Enterprise/추가 작업 필요 — 본 문서는 Supabase 기준.
