import type { Metadata } from 'next';
import Link from 'next/link';
import { HOME } from '../../config/site';
import { pages } from '../../content/site-pages';
import { ALL_WORK_NOW } from '../../content/work';
import styles from '../plain.module.css';

export const metadata: Metadata = { title: 'All work' };

// The page of all his work. A placeholder on the site's ground until the page is designed: nothing is drawn here.
export default function AllWork() {
  const p = pages.work;
  return (
    <main className={styles.main}>
      <p className={styles.label}>{p.label}</p>
      <h1 className={styles.title}>{p.title}</h1>
      <p className={styles.note}>{p.note}</p>
      <div className={styles.links}>
        <Link href={HOME} className={styles.link}>← {p.home}</Link>
        <a href={ALL_WORK_NOW} target="_blank" rel="noopener noreferrer" className={styles.link}>{p.now} ↗</a>
      </div>
    </main>
  );
}
