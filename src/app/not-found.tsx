import type { Metadata } from 'next';
import Link from 'next/link';
import { pages } from '../content/site-pages';
import styles from './plain.module.css';

export const metadata: Metadata = { title: 'Not found' };

// A page that does not exist. Plain, on the site's ground: nothing is drawn here, so it cannot fail in its turn.
export default function NotFound() {
  const p = pages.missing;
  return (
    <main className={styles.main}>
      <p className={styles.label}>{p.label}</p>
      <h1 className={styles.title}>{p.title}</h1>
      <p className={styles.note}>{p.note}</p>
      <div className={styles.links}>
        <Link href="/" className={styles.link}>{p.home} →</Link>
      </div>
    </main>
  );
}
