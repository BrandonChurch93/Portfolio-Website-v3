'use client';

import { useRef, useState } from 'react';
import type { Look } from '../atmosphere/atmosphere';
import { useRoom } from '../atmosphere/useRoom';
import { HOME } from '../config/site';
import { allWork } from '../content/site-pages';
import { catalog, standIns } from '../content/work';

// A count with its word, or nothing where there are none: "1 project", "5 stand ins".
const said = (n: number, one: string, many: string): string => (n ? `${n} ${n === 1 ? one : many}` : '');
import { MetalButton } from './MetalButton';
import { SiteFoot } from './SiteFoot';
import { MAIN, SiteNav } from './SiteNav';
import { WorkCard } from './WorkCard';
import styles from './AllWork.module.css';

// The page of all his work (BRIEF.md, Open 33): the same four categories as the home page, each with everything it
// holds, in two columns of the home page's own card. No stream runs here and no card sleeps: a visitor comes to
// see all of it at once. What ties the page to the home page is its material, the cards, the type and the cursor's
// light. Under the bar a category that is divided shows its sub categories, and picking one shows only what is
// under it. Photography is not divided: a card there is a shoot.
// look puts a room behind the page (src/atmosphere, Study 33): a derby of three, until he has picked one.
export function AllWork({ look = null }: { look?: Look | null }) {
  const page = useRef<HTMLElement>(null);
  const [category, setCategory] = useState(0);

  useRoom(page, look);

  // The sub category picked within the category, or none: everything in it.
  const [sub, setSub] = useState<string | null>(null);
  const now = catalog[category], shown = sub ? now.items.filter((i) => i.subs?.includes(sub)) : now.items, n = shown.length;
  const pick = (index: number) => { setCategory(index); setSub(null); };
  return (
    <>
    <SiteNav here="work" />
    <main ref={page} id={MAIN} className={styles.page} data-room={look ?? undefined}>
      <header className={styles.head}>
        <h1 className={styles.title} data-casts="">{allWork.title}</h1>
        <p className={styles.lead}>{allWork.lead}</p>
      </header>
      <div className={styles.bar} role="group" aria-label="Categories" data-stands="">
        {catalog.map((cat, index) => (
          <button key={cat.name} type="button" className={styles.category} aria-pressed={category === index} onClick={() => pick(index)}>{cat.name}</button>
        ))}
      </div>
      {now.subs && (
        <div className={styles.subs} role="group" aria-label={`${now.name}, ${allWork.subs}`}>
          {[null, ...now.subs].map((name) => (
            <button key={name ?? 'all'} type="button" className={styles.sub} aria-pressed={sub === name} onClick={() => setSub(name)}>{name ?? allWork.all}</button>
          ))}
        </div>
      )}
      <p className={styles.count} role="status">{now.name}{sub ? ` · ${sub}` : ''} · {n ? [said(n - standIns(shown), allWork.project, allWork.projects), said(standIns(shown), allWork.standIn, allWork.standIns)].filter(Boolean).join(' · ') : `0 ${allWork.projects}`}</p>
      <section key={now.name} className={styles.grid} aria-labelledby="work-shown">
        <h2 id="work-shown" className="visually-hidden">{now.name}{sub ? `, ${sub}` : ''}</h2>
        {shown.map((item) => <WorkCard key={item.slug} item={item} />)}
      </section>
      <section className={styles.close} aria-label={allWork.close.line}>
        <p className={styles.closeLine} data-casts="">{allWork.close.line}</p>
        <MetalButton label={allWork.close.button} variant="primary" href={`${HOME}#contact`} />
      </section>
    </main>
    <SiteFoot here="work" />
    </>
  );
}
