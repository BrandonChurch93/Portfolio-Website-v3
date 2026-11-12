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
        Move the cursor over one, or tab to it. Light runs round its cut border from where the cursor came in and meets on the far side. The metal
        brightens under the cursor and the button lifts.
      </p>

      <section className={styles.row} aria-labelledby="primary">
        <div className={styles.about}>
          <h2 id="primary" className={styles.name}>Primary</h2>
          <p className={styles.note}>
            Polished copper, gently domed. A bright band runs through its middle, so the words always sit on bright metal. The words are cut in and
            filled dark.
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
