// `node --import ./scripts/register-ts.mjs` 로 로드 — ts-ext-hooks.mjs를 ESM 로더로 등록.
// 확장자 없는 상대 import를 .ts로 보정해 node 테스트가 app/lib/*.ts를 직접 import할 수 있게 한다.
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./ts-ext-hooks.mjs", pathToFileURL("./scripts/"));
