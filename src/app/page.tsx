import Link from 'next/link';
import { PIECES } from '../config/site';
import styles from './index.module.css';

// Not the home page. A plain index of the work in progress, so each study can be opened on its own.
// The real home page is built in Phase 3 (PLAN.md).
export default function Index() {
  return (
    <main className={styles.main}>
      <p className={styles.label}>Brandon Church · portfolio · third build</p>
      <h1 className={styles.title}>Work in progress</h1>
      <p className={styles.note}>Nothing on this page is designed yet. It lists what can be opened and checked.</p>
      <h2 className={styles.group}>Studies</h2>
      <ul className={styles.list}>
        <li>
          <Link href="/lab/palette">Color and light</Link>
          <span className={styles.minor}>Phase 1 · the palette from the portrait</span>
        </li>
        <li>
          <Link href="/lab/buttons">Buttons</Link>
          <span className={styles.minor}>Phase 1 · primary and accent in lit metal</span>
        </li>
        <li>
          <Link href="/lab/pour">The pour</Link>
          <span className={styles.minor}>Phase 2 · the test shot</span>
        </li>
        <li>
          <Link href="/lab/pour-looks">The pour&rsquo;s look</Link>
          <span className={styles.minor}>Phase 2 · three ways to draw the metal</span>
        </li>
        <li>
          <Link href="/lab/stream-ideas">Ideas for the stream</Link>
          <span className={styles.minor}>Phase 2 · threads, copper leaf and ink, as rough sketches</span>
        </li>
        <li>
          <Link href="/lab/stream-core">A core of light, two ways</Link>
          <span className={styles.minor}>Phase 2 · shards riding a wave of light, and the same on an arc</span>
        </li>
        <li>
          <Link href="/lab/stream-facets">Two looks for the facets</Link>
          <span className={styles.minor}>Phase 2 · the shards as cut pieces, and as jagged splinters</span>
        </li>
        <li>
          <Link href="/lab/stream">The stream</Link>
          <span className={styles.minor}>Phase 2 · the test shot, second round · facets, following the scroll</span>
        </li>
        <li>
          <Link href="/lab/work-draft">Work, three ways</Link>
          <span className={styles.minor}>Phase 3 · a wireframe of the Work section round the stream, three layouts</span>
        </li>
        <li>
          <Link href="/lab/stream?hold">The stream, held</Link>
          <span className={styles.minor}>Phase 2 · a paused frame, only the cursor&rsquo;s light moves</span>
        </li>
        <li>
          <Link href="/lab/stream?shards=first">The stream, with the first round&rsquo;s shards</Link>
          <span className={styles.minor}>Phase 2 · copper leaf and glass, to compare. The switch on the page swaps the two</span>
        </li>
      </ul>
      <h2 className={styles.group}>Pieces carried from the second build</h2>
      <ul className={styles.list}>
        {PIECES.map((name) => (
          <li key={name}>
            <Link href={`/lab/piece/${name}`}>{name}</Link>
            <Link href={`/lab/piece/${name}?entrance=1`} className={styles.minor}>with its entrance</Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
