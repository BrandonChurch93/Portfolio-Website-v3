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
