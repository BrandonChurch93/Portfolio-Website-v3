'use client';

import Link from 'next/link';
import { useEffect, useState, type MouseEvent } from 'react';
import { HOME } from '../config/site';
import { hero } from '../content/hero';
import { nav as words } from '../content/site-pages';
import { ALL_WORK } from '../content/work';
import styles from './SiteNav.module.css';

// The navigation (BRIEF.md, Open 34 and 36): the head of the page, flush with the top of the screen, with his name
// at its left, which goes home, and one link at its right, to the page of all his work, or home from that page.
// Nothing else, and no box: a rule of copper under it, as the foot has over it. It stands at the top of a page,
// leaves as the page is scrolled down so nothing lies over the stream or the work, and comes back the moment the
// page is scrolled up or something in it takes the keyboard's focus.
const NAV = { top: 24, slack: 6 };

// The id a page's main block carries, for the link that skips to it.
export const MAIN = 'main';

export function SiteNav({ here }: { here: 'home' | 'work' | 'project' }) {
  const [state, setState] = useState<'top' | 'shown' | 'away'>('top');

  useEffect(() => {
    let last = scrollY;
    const read = () => {
      const y = scrollY;
      if (y < NAV.top) setState('top');
      else if (y > last + NAV.slack) setState('away');
      else if (y < last - NAV.slack) setState('shown');
      else return;
      last = y;
    };
    if (scrollY >= NAV.top) setState('shown');
    addEventListener('scroll', read, { passive: true });
    return () => removeEventListener('scroll', read);
  }, []);

  // The arrow says which way the link goes: on to the page of all his work, or back to where a visitor came from.
  const to = here === 'work' ? { href: HOME, label: words.home, way: 'back' } : { href: ALL_WORK, label: words.work, way: here === 'project' ? 'back' : 'on' };
  const arrow = <span className={styles.arrow} aria-hidden="true">{to.way === 'back' ? '\u2190' : '\u2192'}</span>;
  const up = (e: MouseEvent) => {
    if (here !== 'home') return;
    e.preventDefault();
    scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };
  return (
    <nav className={styles.nav} aria-label={words.label} data-state={state} data-here={here}>
      <a href={`#${MAIN}`} className={styles.skip}>{words.skip}</a>
      <span className={styles.ground} aria-hidden="true" />
      <span className={styles.rule} aria-hidden="true" />
      <div className={styles.bar}>
        <Link href={HOME} className={styles.name} aria-current={here === 'home' ? 'page' : undefined} onClick={up}>{hero.name}</Link>
        <Link href={to.href} className={styles.link} data-way={to.way}>{to.way === 'back' && arrow}{to.label}{to.way === 'on' && arrow}</Link>
      </div>
    </nav>
  );
}
