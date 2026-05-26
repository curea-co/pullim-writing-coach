// ESM resolve 훅 — 확장자 없는 상대 import(`./prompt`)를 `.ts`로 보정.
// 목적: app/lib/*.ts는 Next/tsc(bundler resolution)용으로 확장자 없이 import한다.
//       하지만 `node --test`의 네이티브 TS strip은 ESM 규칙상 명시 확장자를 요구한다.
//       소스·tsconfig를 건드리지 않고 테스트 실행기에서만 해소한다. (register-ts.mjs가 등록)
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const EXTS = [".ts", ".tsx", ".mts", ".js", ".mjs"];

export async function resolve(specifier, context, next) {
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
