# AWS Postgres 프로비저닝 런북 — writing-coach per-user store

writing-coach의 `/api/data/*`(per-user 데이터)가 쓰는 AWS Postgres를 만들고 Vercel에 연결하는 절차.
리포는 이미 준비됨: `app/lib/server/db.ts`(postgres 드라이버) · `scripts/db-migrate.mjs` · `db/migrations/0001_init.sql`.
`DATABASE_URL`만 생기면 `npm run db:migrate` 한 번으로 테이블 생성.

> **이 세션에서 자동 실행 불가**: AWS 자격증명이 없어 Claude가 직접 생성하지 못함. 아래를 AWS 접근 권한이 있는
> 사람(또는 인프라팀)이 실행. **자격증명·비밀번호를 채팅에 붙여넣지 말 것.**

---

## 0. 중요 제약 — 왜 "퍼블릭 RDS 직접 연결"인가 (RDS Proxy 아님)

- **RDS Proxy 엔드포인트는 VPC 내부 전용**(퍼블릭 IP 없음). Vercel 서버리스는 퍼블릭 인터넷 egress라
  **PrivateLink(Vercel Secure Compute, 엔터프라이즈)** 없이는 RDS Proxy에 도달 불가.
- 따라서 기본 경로 = **퍼블릭 접근 가능한 RDS 인스턴스 + 드라이버 직접 연결**. 커넥션 폭주는 드라이버
  설정(`max:1`·`idle_timeout:20`)과 저트래픽으로 관리. `db.ts`에 이미 반영됨.
- 트레이드오프: 퍼블릭 DB 엔드포인트(강한 비번+TLS로 완화) + 서버리스 네이티브 풀링 부재. 대규모로 가면
  Vercel Secure Compute(PrivateLink)+RDS Proxit, 또는 서버리스 PG(Neon/Supabase)로 재검토.

## 1. 사전 확인 (인프라팀 판단)

- [ ] **리전**: pullim-api와 동일하게(추정 `ap-northeast-2` 서울). 아래 명령의 `--region` 교체.
- [ ] **VPC/서브넷**: 기존 VPC 재사용 or 신규. 퍼블릭 접근이면 퍼블릭 서브넷 + IGW 필요.
- [ ] **엔진 크기**: `db.t4g.micro`(최저비용, 단일 소형 테이블에 충분) 권장. 스파이크 예상 시 Aurora Serverless v2.

## 2. 보안 그룹 (인바운드 5432)

```bash
REGION=ap-northeast-2
VPC_ID=vpc-xxxxxxxx   # 사용할 VPC

SG_ID=$(aws ec2 create-security-group --region $REGION \
  --group-name pwc-db-sg --description "writing-coach RDS public access" \
  --vpc-id $VPC_ID --query GroupId --output text)

# Vercel egress IP가 유동이라 5432를 넓게 허용(비번+TLS로 보호). 가능하면 Vercel 공표 IP 대역으로 좁힐 것.
aws ec2 authorize-security-group-ingress --region $REGION \
  --group-id $SG_ID --protocol tcp --port 5432 --cidr 0.0.0.0/0
```
> 보안 완화: 마이그레이션·psql 접속은 **본인 IP만** 임시 허용하고, 앱 접속용으로만 최소 대역을 열어두는
> 방식을 권장(운영 중 0.0.0.0/0은 강한 비번+TLS 전제).

### DB 서브넷 그룹 (퍼블릭 서브넷 ≥2 AZ) — 필수

`create-db-instance`는 DB 서브넷 그룹이 필요하다(기본 그룹이 없거나 커스텀 VPC면 반드시 생성·지정).
```bash
# VPC의 서브넷 확인 — 퍼블릭(MapPublicIpOnLaunch=true)인 것 2개 이상을 서로 다른 AZ로 고른다.
aws ec2 describe-subnets --region $REGION --filters "Name=vpc-id,Values=$VPC_ID" \
  --query 'Subnets[].{id:SubnetId,az:AvailabilityZone,public:MapPublicIpOnLaunch}' --output table

aws rds create-db-subnet-group --region $REGION \
  --db-subnet-group-name pwc-db-subnets \
  --db-subnet-group-description "writing-coach db subnets" \
  --subnet-ids subnet-aaaa subnet-bbbb   # 위에서 고른 퍼블릭 서브넷 ID들
```
> `--publicly-accessible`가 실제로 인터넷에서 도달하려면 이 서브넷들이 **퍼블릭 서브넷**(라우트 테이블이
> Internet Gateway로 향함)이어야 한다. 프라이빗 서브넷만 있으면 도달 불가.

## 3. RDS Postgres 인스턴스 (퍼블릭)

```bash
DB_ID=pwc-db
DB_NAME=writing
MASTER_USER=pwc_admin
# ★ URL-safe 비번을 쓸 것. base64(openssl rand -base64)는 @ / + = 를 만들어 접속문자열(URI)을 깨뜨린다.
#   hex는 0-9a-f만이라 안전:
MASTER_PW="$(openssl rand -hex 24)"

aws rds create-db-instance --region $REGION \
  --db-instance-identifier $DB_ID \
  --db-instance-class db.t4g.micro \
  --engine postgres --engine-version 16 \
  --master-username $MASTER_USER --master-user-password "$MASTER_PW" \
  --allocated-storage 20 --max-allocated-storage 100 \
  --db-name $DB_NAME \
  --db-subnet-group-name pwc-db-subnets \
  --vpc-security-group-ids $SG_ID \
  --publicly-accessible \
  --storage-encrypted \
  --backup-retention-period 7 \
  --no-multi-az \
  --deletion-protection

# 생성 완료(~수 분) 후 엔드포인트:
aws rds describe-db-instances --region $REGION --db-instance-identifier $DB_ID \
  --query 'DBInstances[0].Endpoint.Address' --output text
# → pwc-db.xxxxxxxx.ap-northeast-2.rds.amazonaws.com
```

## 4. 최소권한 앱 유저 (psql, 마스터로 접속)

```bash
HOST=<위 엔드포인트>
psql "postgres://$MASTER_USER:$MASTER_PW@$HOST:5432/$DB_NAME?sslmode=require"
```
```sql
CREATE ROLE pwc_app LOGIN PASSWORD '<앱-전용-강한-비번>';
GRANT CONNECT ON DATABASE writing TO pwc_app;
GRANT USAGE ON SCHEMA public TO pwc_app;
-- 마이그레이션(테이블 생성)은 마스터로 1회 실행하고, 앱은 DML만:
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO pwc_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO pwc_app;
```

## 5. 마이그레이션 실행 (테이블 생성 — 마스터 자격으로 1회)

리포 루트에서, 프록시 아닌 **DB 엔드포인트**에 도달 가능한 곳(본인 PC 등, SG에 본인 IP 허용):
```bash
DATABASE_URL="postgres://pwc_admin:$MASTER_PW@$HOST:5432/writing?sslmode=require" npm run db:migrate
# → [db:migrate] applying 0001_init.sql (2 statement(s)) / done
```
검증:
```bash
psql "postgres://pwc_admin:$MASTER_PW@$HOST:5432/writing?sslmode=require" -c "\d writing_user_data"
```

## 6. Vercel 환경변수 (앱은 pwc_app 자격)

Vercel → pullim-writing-coach → Settings → Environment Variables:
```
DATABASE_URL = postgres://pwc_app:<앱-비번>@<HOST>:5432/writing?sslmode=require
```
- ⚠️ **비번의 특수문자는 URI를 깨뜨린다.** `pwc_app` 비번도 URL-safe(예: `openssl rand -hex 24`) 권장.
  base64/특수문자를 썼다면 URI에 넣을 때 **percent-encoding** 필수(`@`→`%40`, `/`→`%2F`, `+`→`%2B`, `=`→`%3D`, `:`→`%3A`).
- **Production + Preview** 둘 다 설정(서버 전용 — NEXT_PUBLIC_ 접두 금지).
- 저장 후 재배포(또는 다음 main push 자동 배포).

## 7. 종단 검증 (배포 후)

1. writing.pullim.ai 로그인 → 채점 1건 → `/results` 저장 확인.
2. **다른 브라우저/기기**로 같은 계정 로그인 → 결과가 보이면 계정 귀속 성공.
3. `/me` 데이터 삭제 → 성공 응답 후 비워짐.
4. 문제 시 Vercel Runtime Logs에서 `[db]`/`DATABASE_URL` 관련 에러 확인.

## 8. 비용(대략, ap-northeast-2)

- db.t4g.micro (온디맨드) ≈ 월 $12–15 + 스토리지 20GB gp3 ≈ $2–3 + 백업/전송 소액.
- Aurora Serverless v2(0.5 ACU~)는 유휴 비용이 더 높을 수 있음(스파이크형이면 유리).

## 9. 보안 체크

- [ ] 마스터 비번·앱 비번 = 강한 랜덤, Vercel/시크릿에만 저장. 채팅/로그/코드 금지.
- [ ] `sslmode=require` 강제(TLS). 앱 유저는 DML만(마스터 아님).
- [ ] 운영 중 SG 인바운드를 가능한 좁게(Vercel 대역/본인 IP). `deletion-protection` 활성.
- [ ] 미성년 에세이 저장 → 개인정보/보존정책 확정 후 실사용(별도 트랙).

## 10. (확장) RDS Proxy + PrivateLink — 나중에 필요 시

트래픽이 커져 서버리스 커넥션 풀링이 필요하면: Vercel **Secure Compute**(PrivateLink)로 VPC 연결 후
RDS Proxy(내부 엔드포인트) 사용. 엔터프라이즈 기능·셋업 복잡 → 초기엔 4~6절의 퍼블릭 직접 연결로 시작.

---

## 부록 — 티어다운(롤백)
```bash
aws rds modify-db-instance --region $REGION --db-instance-identifier pwc-db --no-deletion-protection --apply-immediately
aws rds delete-db-instance --region $REGION --db-instance-identifier pwc-db --skip-final-snapshot --delete-automated-backups
aws ec2 delete-security-group --region $REGION --group-id $SG_ID
```
