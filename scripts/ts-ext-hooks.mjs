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

// server-only no-op 경로를 **지연 계산** — 미설치/빈 의존성에서도 훅 로드가 죽지 않게(top-level resolve 금지).
//   server-only가 import될 때만 해소하고, 실패하면 합성 빈 모듈(data:)로 폴백.
const _require = createRequire(import.meta.url);
let _serverOnlyEmpty;
function serverOnlyEmpty() {
  if (_serverOnlyEmpty !== undefined) return _serverOnlyEmpty;
  try {
    const idx = pathToFileURL(_require.resolve("server-only")); // …/server-only/index.js
    _serverOnlyEmpty = new URL("./empty.js", idx).href;         // 같은 디렉토리 empty.js(react-server 동등물)
  } catch {
    _serverOnlyEmpty = "data:text/javascript,export%20%7B%7D"; // 미설치 — no-op 합성 모듈
  }
  return _serverOnlyEmpty;
}

export async function resolve(specifier, context, next) {
  // `server-only`를 node 테스트 환경에서 no-op로 단락(지연 해소).
  if (specifier === "server-only") {
    return { url: serverOnlyEmpty(), shortCircuit: true };
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
