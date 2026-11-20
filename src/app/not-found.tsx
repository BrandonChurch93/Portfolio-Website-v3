import type { Metadata } from 'next';
import Link from 'next/link';
import { Drift } from '../components/Drift';
import { SiteFoot } from '../components/SiteFoot';
import { MAIN, SiteNav } from '../components/SiteNav';
import type { Adrift } from '../config/debris';
import { HOME } from '../config/site';
import { pages } from '../content/site-pages';
import styles from './plain.module.css';

export const metadata: Metadata = { title: 'Not found' };

// A page that does not exist: the site's own navigation and foot round one plain line, with a few pieces of the
// hero's debris adrift round it, since this is a place off the map. They are pictures: nothing is drawn here, so
// the page cannot fail in its turn.
const ADRIFT: Adrift[] = [
  { rock: 'pair', x: 0.82, y: 0.7, w: 0.3, turn: -8 },
  { rock: 'slab', x: 0.15, y: 0.3, w: 0.12, turn: 14, far: 0.3 },
  { rock: 'wedge', x: 0.27, y: 0.8, w: 0.055, turn: -20, far: 0.55 },
  { rock: 'tooth', x: 0.68, y: 0.2, w: 0.04, turn: 30, far: 0.7 },
  { rock: 'chip', x: 0.07, y: 0.66, w: 0.05, turn: 8, far: 0.45, flip: true },
  { rock: 'flake', x: 0.91, y: 0.27, w: 0.06, turn: -35, far: 0.6 },
  { rock: 'block', x: 0.56, y: 0.9, w: 0.07, turn: 12, far: 0.35, flip: true },
];
export default function NotFound() {
  const p = pages.missing;
  return (
    <>
      <SiteNav here="project" />
      <main id={MAIN} className={`${styles.main} ${styles.inside} ${styles.lost}`}>
        <Drift field={ADRIFT} className={styles.adrift} />
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
