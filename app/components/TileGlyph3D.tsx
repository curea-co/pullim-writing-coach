import styles from "./tile-glyph-3d.module.css";

// 바로시작 타일 배지용 순수 CSS 3D 아이콘 — 글리프(이모지)가 원근 안에서 기울며 부유하고 타일 호버 시 정면으로
//   돈다(의존성 0). 장식이므로 스크린리더에는 숨김(타일 제목/설명이 의미 전달).
export default function TileGlyph3D({ glyph }: { glyph: string }) {
  return (
    <span className={styles.wrap} aria-hidden="true" data-testid="tile-glyph-3d">
      <span className={styles.glyph}>{glyph}</span>
    </span>
  );
}
