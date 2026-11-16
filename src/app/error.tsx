'use client';

import Link from 'next/link';
import { pages } from '../content/site-pages';
import styles from './plain.module.css';

// A page that broke while it was being shown. Plain, on the site's ground, with no 3D of its own: whatever broke
// must not be able to break this too.
export default function Broken({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const p = pages.broken;
  return (
    <main className={styles.main}>
      <p className={styles.label}>{p.label}</p>
      <h1 className={styles.title}>{p.title}</h1>
      <p className={styles.note}>{p.note}</p>
      <div className={styles.links}>
        <button type="button" className={styles.link} onClick={reset}>{p.again}</button>
        <Link href="/" className={styles.link}>{p.home} →</Link>
      </div>
    </main>
  );
}
