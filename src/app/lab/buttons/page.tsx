import type { Metadata } from 'next';
import { MetalButton } from '../../../components/MetalButton';
import styles from '../../../components/lab/Buttons.module.css';

export const metadata: Metadata = { title: 'Study 02 · buttons' };

export default function ButtonStudy() {
  return (
    <main className={styles.main}>
      <p className={styles.label}>Study 02 · buttons</p>
      <h1 className={styles.title}>Two buttons in lit metal</h1>
      <p className={styles.lede}>Move the cursor, or touch the screen. Both are lit by the same light as everything else on the page.</p>

      <section className={styles.row} aria-labelledby="primary">
        <div className={styles.about}>
          <h2 id="primary" className={styles.name}>Primary</h2>
          <p className={styles.note}>Bright copper. The words are cut into the metal and filled dark. For the one thing a section most wants pressed.</p>
        </div>
        <div className={styles.set}>
          <MetalButton label="View all work" />
          <MetalButton label="Download PDF" />
          <MetalButton label="View live" />
        </div>
      </section>

      <section className={styles.row} aria-labelledby="accent">
        <div className={styles.about}>
          <h2 id="accent" className={styles.name}>Accent</h2>
          <p className={styles.note}>Dark bronze. The words are copper, set flush. For the second choice beside a primary, and for quieter actions.</p>
        </div>
        <div className={styles.set}>
          <MetalButton variant="accent" label="Source code" />
          <MetalButton variant="accent" label="Get in touch" />
          <MetalButton variant="accent" label="Code" />
        </div>
      </section>

      <section className={styles.row} aria-labelledby="together">
        <div className={styles.about}>
          <h2 id="together" className={styles.name}>Together</h2>
          <p className={styles.note}>As a pair, the way a project would offer them.</p>
        </div>
        <div className={styles.set}>
          <MetalButton label="View live" />
          <MetalButton variant="accent" label="Source code" />
        </div>
      </section>
    </main>
  );
}
