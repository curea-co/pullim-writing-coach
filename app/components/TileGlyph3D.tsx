import type { ReactNode } from "react";
import styles from "./tile-glyph-3d.module.css";

// 바로시작 타일 배지용 절제된 3D 래퍼 — 모던 라인 아이콘을 살짝 기울여 두고 타일 호버 시 정면으로 돌린다
//   (의존성 0). 장식이므로 스크린리더에는 숨김(타일 제목/설명이 의미 전달).
export default function TileGlyph3D({ icon }: { icon: ReactNode }) {
  return (
    <span className={styles.wrap} aria-hidden="true" data-testid="tile-glyph-3d">
      <span className={styles.glyph}>{icon}</span>
    </span>
  );
}
