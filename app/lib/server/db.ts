// Pullim Writing Coach — AWS Postgres 접속 + per-user 데이터 CRUD (server 전용).
//   모듈 경계: 부수효과(env·DB 커넥션). app/lib/server/* 만 server 전용 부수효과 가능.
//   자격증명·payload 본문 로깅 금지. DATABASE_URL 미설정 시 fail-closed throw.
//   드라이버 = postgres(porsager). RDS Proxy 뒤 AWS RDS/Aurora 전제(서버리스 풀링은 프록시가 담당).
import "server-only";
import postgres from "postgres";

export type DataKey = "profile" | "results" | "revisions" | "drafts" | "meta_usage" | "consent";
export const DATA_KEYS: readonly DataKey[] = ["profile", "results", "revisions", "drafts", "meta_usage", "consent"];

export function isDataKey(v: unknown): v is DataKey {
  return typeof v === "string" && (DATA_KEYS as readonly string[]).includes(v);
}

// sql 태그드 템플릿. 테스트는 __setSqlForTest로 교체. 실접속은 lazy(첫 쿼리 시 DATABASE_URL 검증).
type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]>;
let injected: Sql | null = null;
let cached: Sql | null = null;

function sql(): Sql {
  if (injected) return injected;
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("[db] DATABASE_URL 미설정 — 계정 데이터 store 비활성(fail-closed)");
  // 서버리스(Vercel) + RDS Proxy 전제:
  //   max:1        — 함수 인스턴스당 커넥션 1개(실풀링은 RDS Proxy가 다중화).
  //   idle_timeout — 유휴 커넥션 정리(인스턴스 단명).
  //   prepare:false — RDS Proxy/pooler에서 prepared statement는 커넥션 pinning을 유발 → 비활성.
  //   ssl:'require' — RDS는 TLS 필수(암호화). prod에서 CA 고정이 필요하면 ssl 객체로 교체.
  cached = postgres(url, { max: 1, idle_timeout: 20, prepare: false, ssl: "require" }) as unknown as Sql;
  return cached;
}

export function __setSqlForTest(fn: Sql | null): void {
  injected = fn;
  cached = null;
}

export async function getUserData(sub: string, key: DataKey): Promise<unknown | null> {
  const rows = (await sql()`
    select payload from writing_user_data where user_id = ${sub} and data_key = ${key}
  `) as Array<{ payload: unknown }>;
  return rows.length > 0 ? rows[0].payload : null;
}

export async function setUserData(sub: string, key: DataKey, payload: unknown): Promise<void> {
  // payload는 JSON 직렬화 후 ::jsonb 캐스트로 바인딩 — postgres 드라이버는 객체를 jsonb로 자동
  //   직렬화하지 않으므로 명시한다(읽기는 jsonb→JS 객체 자동 파싱).
  await sql()`
    insert into writing_user_data (user_id, data_key, payload, updated_at)
    values (${sub}, ${key}, ${JSON.stringify(payload)}::jsonb, now())
    on conflict (user_id, data_key) do update set payload = excluded.payload, updated_at = now()
  `;
}

export async function deleteAllUserData(sub: string): Promise<void> {
  await sql()`delete from writing_user_data where user_id = ${sub}`;
}
