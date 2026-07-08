// OS 브랜드 favicon.ico 생성 — app/icon.svg(풀림 OS 마크)를 다중 크기 .ico 로 굽는다.
//   왜: app/icon.svg 는 <link rel="icon" type="image/svg+xml"> 로 최신 브라우저·대다수 크롤러가 쓰지만,
//   일부 메신저(카카오 등)·모니터링·구형 크롤러는 `/favicon.ico` 를 직접 조회한다 → .ico 도 OS 마크로 둔다.
//   실행: `npm run gen:favicon` (아이콘 변경 시 1회 재생성 후 app/favicon.ico 커밋).
//
//   설계(Codex #132): 산출물 `app/favicon.ico` 가 **deliverable(커밋됨)** 이라 재생성은 상시 필요 없다.
//   sharp 는 `next` 의 **optionalDependency** 라 보통 트리에 있지만, 이를 우리 package.json 의 상시
//   의존성으로 **승격하지 않는다** — 승격 시 sharp 네이티브 빌드가 실패하는 환경에서 `npm install/ci`
//   자체가 깨진다(optional 은 건너뛰면 그만). 대신 여기서 sharp 를 **동적 import + 친절한 에러**로 다뤄,
//   부재 시 재생성만 막고(설치는 무해) 명확히 안내한다. 빌드 COMMAND(prebuild 훅) 밖의 유지보수 도구.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

let sharp;
try {
  sharp = (await import("sharp")).default;
} catch {
  console.error(
    "[gen-favicon] sharp 를 찾을 수 없어 재생성을 건너뜁니다.\n" +
      "  sharp 는 next 의 optional dep 이라 보통 설치돼 있습니다. 없으면 `npm i -D sharp` 후 다시 실행하세요.\n" +
      "  (산출물 app/favicon.ico 는 이미 커밋돼 있어 재생성은 아이콘 변경 시에만 필요합니다.)",
  );
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(join(root, "app/icon.svg"));
const SIZES = [16, 32, 48]; // 표준 favicon.ico 세트

const pngs = await Promise.all(
  SIZES.map((s) => sharp(svg, { density: 384 }).resize(s, s, { fit: "contain" }).png().toBuffer()),
);

// ICO 컨테이너(PNG 임베드, Windows Vista+ 지원). ICONDIR(6) + ICONDIRENTRY(16*N) + PNG blobs.
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); // reserved
header.writeUInt16LE(1, 2); // type = icon(1)
header.writeUInt16LE(SIZES.length, 4); // image count

const entries = [];
let offset = 6 + 16 * SIZES.length;
SIZES.forEach((s, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(s >= 256 ? 0 : s, 0); // width (0 = 256)
  e.writeUInt8(s >= 256 ? 0 : s, 1); // height
  e.writeUInt8(0, 2); // palette colors (0 = none)
  e.writeUInt8(0, 3); // reserved
  e.writeUInt16LE(1, 4); // color planes
  e.writeUInt16LE(32, 6); // bits per pixel
  e.writeUInt32LE(pngs[i].length, 8); // image data size
  e.writeUInt32LE(offset, 12); // image data offset
  offset += pngs[i].length;
  entries.push(e);
});

const ico = Buffer.concat([header, ...entries, ...pngs]);
writeFileSync(join(root, "app/favicon.ico"), ico);
console.log(`app/favicon.ico 생성 완료 — ${SIZES.join("/")}px, ${ico.length} bytes`);
