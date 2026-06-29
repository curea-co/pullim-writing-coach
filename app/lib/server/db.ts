// Pullim Writing Coach — Neon 접속 + per-user 데이터 CRUD (server 전용).
//   모듈 경계: 부수효과(env·Neon HTTP). app/lib/server/* 만 server 전용 부수효과 가능.
//   자격증명·payload 본문 로깅 금지. DATABASE_URL 미설정 시 fail-closed throw.
import "server-only";
import { neon } from "@neondatabase/serverless";

export type DataKey = "profile" | "results" | "revisions" | "drafts" | "meta_usage" | "consent";
export const DATA_KEYS: readonly DataKey[] = ["profile", "results", "revisions", "drafts", "meta_usage", "consent"];

export function isDataKey(v: unknown): v is DataKey {
  return typeof v === "string" && (DATA_KEYS as readonly string[]).includes(v);
}

// Neon sql 태그드 템플릿. 테스트는 __setSqlForTest로 교체. 실접속은 lazy(첫 쿼리 시 DATABASE_URL 검증).
type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown[]>;
let injected: Sql | null = null;
let cached: Sql | null = null;

function sql(): Sql {
  if (injected) return injected;
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("[db] DATABASE_URL 미설정 — 계정 데이터 store 비활성(fail-closed)");
  cached = neon(url) as unknown as Sql;
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
  await sql()`
    insert into writing_user_data (user_id, data_key, payload, updated_at)
    values (${sub}, ${key}, ${payload as never}, now())
    on conflict (user_id, data_key) do update set payload = excluded.payload, updated_at = now()
  `;
}

export async function deleteAllUserData(sub: string): Promise<void> {
  await sql()`delete from writing_user_data where user_id = ${sub}`;
}
