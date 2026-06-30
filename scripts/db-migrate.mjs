// AWS Postgres 마이그레이션 러너 — db/migrations/*.sql 을 순서대로 실행.
//   실행: npm run db:migrate  (DATABASE_URL 환경변수 필요 — RDS/Aurora 접속문자)
//   주의: payload·자격증명 로깅 금지. 적용 SQL 파일명과 상태만 출력.
//   sql.unsafe()는 한 번에 한 statement 전제로 쓰므로(simple 모드 미사용) 0001_init.sql 처럼
//     다중 statement는 ';'로 분할해 순차 실행한다.
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[db:migrate] DATABASE_URL 미설정 — 중단");
  process.exit(1);
}
const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, "..", "db", "migrations");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const sql = postgres(url, { max: 1, prepare: false, ssl: "require" });

// SQL 파일을 statement 단위(';')로 분할. 줄단위 '--' 주석 제거 후 빈 statement 스킵.
//   (0001_init.sql 처럼 단순 DDL 다중 statement 전제 — 문자열 리터럴 내 ';' 미사용.)
function splitStatements(text) {
  return text
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

for (const f of files) {
  const text = readFileSync(join(dir, f), "utf8");
  const statements = splitStatements(text);
  console.log(`[db:migrate] applying ${f} (${statements.length} statement(s))`);
  for (const stmt of statements) {
    await sql.unsafe(stmt); // statement 1개씩 순차 실행(raw DDL)
  }
}
await sql.end(); // 커넥션 닫기(미종료 시 프로세스 행)
console.log(`[db:migrate] done (${files.length} file(s))`);
