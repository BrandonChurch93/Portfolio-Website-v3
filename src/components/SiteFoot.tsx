'use client';

import Link from 'next/link';
import { HOME } from '../config/site';
import { contact } from '../content/contact';
import { hero } from '../content/hero';
import { foot as words, nav } from '../content/site-pages';
import { ALL_WORK } from '../content/work';
import styles from './SiteFoot.module.css';

// The foot of every page (BRIEF.md, Open 35): who he is at the left, where the site goes and where else he can be
// found at the right, and under a hairline the line that says who made it and a way back to the top. The same on
// every page. On the home page it is sized on the page's own board, so it grows with the screen as everything
// over it does.
export function SiteFoot({ here = 'page' }: { here?: 'home' | 'work' | 'page' }) {
  const site = [
    { label: nav.home, href: HOME, now: here === 'home' },
    { label: nav.work, href: ALL_WORK, now: here === 'work' },
    { label: words.contact, href: `${HOME}#contact`, now: false },
  ];
  const out = (href: string) => (href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {});
  const up = () => scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  return (
    <footer className={styles.foot} data-here={here}>
      <div className={styles.who}>
        <p className={styles.name}>{hero.name}</p>
        <p className={styles.role}>{hero.role}</p>
        <p className={styles.based}>{contact.based}</p>
      </div>
      <div className={styles.group}>
        <p className={styles.label} id="foot-site">{words.site}</p>
        <ul aria-labelledby="foot-site">
          {site.map((l) => <li key={l.label}><Link href={l.href} aria-current={l.now ? 'page' : undefined}>{l.label}</Link></li>)}
        </ul>
      </div>
      <div className={styles.group}>
        <p className={styles.label} id="foot-elsewhere">{words.elsewhere}</p>
        <ul aria-labelledby="foot-elsewhere">
          {contact.foot.links.filter((l) => !('held' in l)).map((l) => <li key={l.label}><a href={l.href} {...out(l.href)} download={l.href.endsWith('.pdf') || undefined}>{l.label}</a></li>)}
        </ul>
      </div>
      <div className={styles.base}>
        <p suppressHydrationWarning>{contact.foot.line} · © {new Date().getFullYear()}</p>
        <button type="button" className={styles.top} onClick={up}>{words.top} <span aria-hidden="true">↑</span></button>
      </div>
    </footer>
  );
}
