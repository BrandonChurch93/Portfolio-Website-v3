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
        Two buttons, and four things they could do under the cursor. On every one the metal brightens where the cursor is. The first three rows
        show the hover as it was first built. Three other options follow.
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

      <h2 className={styles.part}>Hover options</h2>

      <section className={styles.row} aria-labelledby="heat">
        <div className={styles.about}>
          <h3 id="heat" className={styles.name}>A · Heat</h3>
          <p className={styles.note}>
            The metal warms where the cursor is and stays warm for a moment after the cursor moves on, so the cursor leaves a trail that cools. The
            button does not move.
          </p>
        </div>
        <div className={styles.set}>
          <MetalButton hover="heat" label="View all work" />
          <MetalButton hover="heat" variant="accent" label="Source code" />
        </div>
      </section>

      <section className={styles.row} aria-labelledby="pull">
        <div className={styles.about}>
          <h3 id="pull" className={styles.name}>B · Pull</h3>
          <p className={styles.note}>
            The button is drawn a few pixels toward the cursor, as if by a magnet, and its shadow stays behind. When the cursor leaves it settles back
            with a little weight.
          </p>
        </div>
        <div className={styles.set}>
          <MetalButton hover="pull" label="View all work" />
          <MetalButton hover="pull" variant="accent" label="Source code" />
        </div>
      </section>

      <section className={styles.row} aria-labelledby="catch">
        <div className={styles.about}>
          <h3 id="catch" className={styles.name}>C · Catch</h3>
          <p className={styles.note}>
            Nothing plays. The cut border, the edges and the words catch the light only where the cursor is near them. The quietest of the three.
          </p>
        </div>
        <div className={styles.set}>
          <MetalButton hover="catch" label="View all work" />
          <MetalButton hover="catch" variant="accent" label="Source code" />
        </div>
      </section>
    </main>
  );
}
