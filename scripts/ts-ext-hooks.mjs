// ESM resolve 훅 — 확장자 없는 상대 import(`./prompt`)를 `.ts`로 보정.
// 목적: app/lib/*.ts는 Next/tsc(bundler resolution)용으로 확장자 없이 import한다.
//       하지만 `node --test`의 네이티브 TS strip은 ESM 규칙상 명시 확장자를 요구한다.
//       소스·tsconfig를 건드리지 않고 테스트 실행기에서만 해소한다. (register-ts.mjs가 등록)
//
// `server-only` 처리: Next 번들러는 react-server 조건으로 empty.js를 선택하지만,
//   `node --test`는 기본 index.js(throw)를 선택한다. 테스트 환경에서 no-op으로 단락.
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const EXTS = [".ts", ".tsx", ".mts", ".js", ".mjs"];

// server-only 패키지의 empty.js 경로 (no-op, react-server 조건 동등물)
// 주: server-only/package.json "exports"가 empty.js를 노출하지 않으므로 fs 직접 경로 사용.
// _require.resolve("server-only") → …/server-only/index.js → 같은 디렉토리의 empty.js로.
const _require = createRequire(import.meta.url);
const _serverOnlyIndex = pathToFileURL(_require.resolve("server-only"));
const SERVER_ONLY_EMPTY = new URL("./empty.js", _serverOnlyIndex).href;

export async function resolve(specifier, context, next) {
  // `server-only`를 node 테스트 환경에서 no-op(empty.js)로 단락.
  if (specifier === "server-only") {
    return { url: SERVER_ONLY_EMPTY, shortCircuit: true };
  }

  const hasExt = /\.[mc]?[jt]sx?$/.test(specifier);
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && !hasExt) {
    for (const ext of EXTS) {
      const candidate = new URL(specifier + ext, context.parentURL);
      if (existsSync(fileURLToPath(candidate))) {
        return next(specifier + ext, context);
      }
    }
  }
  return next(specifier, context);
}
