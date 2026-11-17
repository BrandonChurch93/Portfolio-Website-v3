'use client';

import Link from 'next/link';
import { useState } from 'react';
import { HOME } from '../config/site';
import { allWork } from '../content/site-pages';
import { catalog } from '../content/work';
import { MetalButton } from './MetalButton';
import { SiteFoot } from './SiteFoot';
import { WorkCard } from './WorkCard';
import styles from './AllWork.module.css';

// The page of all his work (BRIEF.md, Open 33): the same four categories as the home page, each with everything it
// holds, in two columns of the home page's own card. No stream runs here and no card sleeps: a visitor comes to
// see all of it at once. What ties the page to the home page is its material, the cards, the type and the cursor's
// light. The room under the bar is kept for a row of filter words, when a category has grown enough to want one.
export function AllWork() {
  const [category, setCategory] = useState(0);
  const now = catalog[category], n = now.items.length;
  return (
    <main className={styles.page}>
      <nav className={styles.way} aria-label="Back">
        <Link href={HOME} className={styles.back}>← {allWork.home}</Link>
      </nav>
      <header className={styles.head}>
        <h1 className={styles.title}>{allWork.title}</h1>
        <p className={styles.lead}>{allWork.lead}</p>
      </header>
      <div className={styles.bar} role="group" aria-label="Categories">
        {catalog.map((cat, index) => (
          <button key={cat.name} type="button" className={styles.category} aria-pressed={category === index} onClick={() => setCategory(index)}>{cat.name}</button>
        ))}
      </div>
      <p className={styles.count} role="status">{now.name} · {n} {now.standIn ? allWork.standIns : n === 1 ? allWork.project : allWork.projects}</p>
      <section key={now.name} className={styles.grid} aria-label={now.name}>
        {now.items.map((item) => <WorkCard key={item.slug} item={item} />)}
      </section>
      <section className={styles.close} aria-label={allWork.close.line}>
        <p className={styles.closeLine}>{allWork.close.line}</p>
        <MetalButton label={allWork.close.button} variant="primary" href={`${HOME}#contact`} />
      </section>
      <SiteFoot />
    </main>
  );
}
