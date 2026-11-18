import type { Metadata } from 'next';
import Link from 'next/link';
import { SiteFoot } from '../components/SiteFoot';
import { MAIN, SiteNav } from '../components/SiteNav';
import { HOME } from '../config/site';
import { pages } from '../content/site-pages';
import styles from './plain.module.css';

export const metadata: Metadata = { title: 'Not found' };

// A page that does not exist: the site's own navigation and foot round one plain line. Nothing is drawn here, so it
// cannot fail in its turn.
export default function NotFound() {
  const p = pages.missing;
  return (
    <>
      <SiteNav here="project" />
      <main id={MAIN} className={`${styles.main} ${styles.inside}`}>
        <p className={styles.label}>{p.label}</p>
        <h1 className={styles.title}>{p.title}</h1>
        <p className={styles.note}>{p.note}</p>
        <div className={styles.links}>
          <Link href={HOME} className={styles.link}>{p.home} →</Link>
        </div>
      </main>
      <SiteFoot />
    </>
  );
}
