// OS 브랜드 favicon.ico 생성 — app/icon.svg(풀림 OS 마크)를 다중 크기 .ico 로 굽는다.
//   왜: app/icon.svg 는 <link rel="icon" type="image/svg+xml"> 로 최신 브라우저·대다수 크롤러가 쓰지만,
//   일부 메신저(카카오 등)·모니터링·구형 크롤러는 `/favicon.ico` 를 직접 조회한다 → .ico 도 OS 마크로 둔다.
//   실행: `npm run gen:favicon` (아이콘 변경 시 1회 재생성 후 app/favicon.ico 커밋). 산출물(.ico)이
//   deliverable이고, 이 스크립트는 **빌드 COMMAND(prebuild 훅) 밖**의 유지보수 도구다 — 배포 시 래스터화가
//   돌지 않게(빌드 지연/실패 결합 회피). sharp 는 이미 `next` 의 직접 의존(^0.34.5)이라 배포 install 에
//   항상 존재하며, devDependencies 의 명시는 그 버전을 **고정**해 스크립트 재현성을 보장할 뿐 신규 네이티브
//   패키지를 배포에 들이지 않는다(Codex #132).
import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

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
