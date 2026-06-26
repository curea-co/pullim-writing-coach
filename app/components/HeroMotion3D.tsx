import styles from "./hero-motion-3d.module.css";

// 히어로용 순수 CSS 3D 모션 — 떠다니는 '글 시트' 3겹이 원근 안에서 기울며 부유한다(의존성 0).
//   장식 레이어이므로 스크린리더에는 숨김(aria-hidden) + pointer-events: none(CSS).
export default function HeroMotion3D() {
  return (
    <div className={styles.scene} aria-hidden="true" data-testid="hero-motion-3d">
      <div className={styles.stack}>
        <div className={`${styles.sheet} ${styles.s1}`} />
        <div className={`${styles.sheet} ${styles.s2}`} />
        <div className={`${styles.sheet} ${styles.s3}`}>
          <div className={styles.line} />
          <div className={styles.line} />
          <div className={`${styles.line} ${styles.lemon}`} />
          <div className={styles.line} />
        </div>
      </div>
    </div>
  );
}
