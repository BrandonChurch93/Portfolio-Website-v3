'use client';

import { software } from '../../content/work';
import { WorkCard } from '../WorkCard';
import styles from './WorkCards.module.css';

export function WorkCards() {
  return (
    <main className={styles.main}>
      <p className={styles.label}>Study 14 · the card · second round</p>
      <h1 className={styles.title}>The card</h1>
      <p className={styles.lede}>
        The data plate, with the picture resting in bronze, as you picked. In this round the streak of light on the glass is gone, and
        each card says where it leads in its bottom right corner. Put the cursor on Live, Evals or Code and that corner goes quiet. The
        pictures are the same screenshots, two of them cropped tight. They stand in until you retake them.
      </p>

      <h2 id="states" className={styles.group}>At rest, and under the cursor</h2>
      <div className={styles.pair}>
        <WorkCard item={software[0]} />
        <WorkCard item={software[0]} held={[0.62, 0.22]} />
      </div>

      <h2 id="grid" className={styles.group}>In the grid · at the size on the page</h2>
      <p className={styles.hint}>Four real projects, laid out as the Work section lays them out. On a touch screen the cards nearest the middle of the screen wake.</p>
      <div className={styles.grid}>
        {software.map((item) => <WorkCard key={item.slug} item={item} />)}
      </div>
    </main>
  );
}
