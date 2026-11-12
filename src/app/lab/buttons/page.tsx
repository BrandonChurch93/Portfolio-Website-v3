import type { Metadata } from 'next';
import { MetalButton } from '../../../components/MetalButton';
import styles from '../../../components/lab/Buttons.module.css';

export const metadata: Metadata = { title: 'Study 02 · buttons' };

export default function ButtonStudy() {
  return (
    <main className={styles.main}>
      <p className={styles.label}>Study 02 · buttons</p>
      <h1 className={styles.title}>Two buttons in lit metal</h1>
      <p className={styles.lede}>
        Move the cursor over one, or tab to it. Its cut border, its edges and its words catch the light where the cursor is near, and it comes a
        little toward you.
      </p>

      <section className={styles.row} aria-labelledby="primary">
        <div className={styles.about}>
          <h2 id="primary" className={styles.name}>Primary</h2>
          <p className={styles.note}>
            Polished copper under a clear coat, gently domed. A bright band runs through its middle, so the words always sit on bright metal, and the
            coat shows the cursor&rsquo;s light crossing it. The words are cut in and filled dark.
          </p>
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
          <p className={styles.note}>Dark bronze. The words are copper, set flush, and warm to the color of the light under the cursor. For the second choice beside a primary.</p>
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
