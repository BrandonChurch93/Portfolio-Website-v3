'use client';

import Link from 'next/link';
import { useEffect, useState, type MouseEvent } from 'react';
import { HOME } from '../config/site';
import { hero } from '../content/hero';
import { nav as words } from '../content/site-pages';
import { ALL_WORK } from '../content/work';
import styles from './SiteNav.module.css';

// The navigation (BRIEF.md, Open 34): one slim bar of bronze with his name at its left, which goes home, and one
// link at its right, to the page of all his work, or home from that page. Nothing else. It stands at the top of a
// page, leaves as the page is scrolled down so nothing lies over the stream or the work, and comes back the moment
// the page is scrolled up or something in it takes the keyboard's focus.
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

  const to = here === 'work' ? { href: HOME, label: words.home } : { href: ALL_WORK, label: words.work };
  const up = (e: MouseEvent) => {
    if (here !== 'home') return;
    e.preventDefault();
    scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };
  return (
    <nav className={styles.nav} aria-label={words.label} data-state={state} data-here={here}>
      <a href={`#${MAIN}`} className={styles.skip}>{words.skip}</a>
      <div className={styles.bar}>
        <Link href={HOME} className={styles.name} aria-current={here === 'home' ? 'page' : undefined} onClick={up}>{hero.name}</Link>
        <Link href={to.href} className={styles.link}>{to.label}</Link>
      </div>
    </nav>
  );
}
