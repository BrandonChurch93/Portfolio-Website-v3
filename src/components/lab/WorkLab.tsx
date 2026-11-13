'use client';

import { useEffect, useRef, useState } from 'react';
import { mountStream } from '../../stream/stream';
import { MetalButton } from '../MetalButton';
import styles from './WorkLab.module.css';

const CATEGORIES = ['Software', 'Games', '3D art', 'Photography'];
const CARDS = ['01', '02', '03', '04'];

// The stream through the Work section, on a page of its own: the title, the category bar, four cards in two rows, a
// post beside each side, a rail under the grid and the button at its low point. The stream plans its route from
// where these are on the page. The cards, the category bar and the button are stand ins: the card is the test
// shot's plain one. ?ui=0 hides the label.
export function WorkLab() {
  const page = useRef<HTMLElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLDivElement>(null);
  const [ui, setUi] = useState(true);
  const [category, setCategory] = useState(CATEGORIES[0]);

  useEffect(() => {
    setUi(new URLSearchParams(location.search).get('ui') !== '0');
    if (!page.current || !title.current || !bar.current || !grid.current || !rail.current || !button.current) return;
    const all = (name: string) => [...grid.current!.querySelectorAll<HTMLElement>(`[data-part="${name}"]`)];
    const mounted = mountStream(page.current, { title: title.current, work: { bar: bar.current, cards: all('card'), posts: all('post'), rail: rail.current, button: button.current } });
    return () => mounted.dispose();
  }, []);

  return (
    <main ref={page} className={styles.page}>
      {ui && (
        <header className={styles.head}>
          <p className={styles.label}>Study 10 · the stream through Work</p>
          <h1 className={styles.name}>The route, with the posts and the rail</h1>
          <p className={styles.note}>The four cards, the category bar and the button are stand ins. The card is the test shot&rsquo;s plain one.</p>
        </header>
      )}
      <section className={styles.section} aria-labelledby="work-title">
        <h2 ref={title} id="work-title" className={styles.title}>Work</h2>
        <div ref={bar} className={styles.bar} role="group" aria-label="Categories">
          {CATEGORIES.map((name) => (
            <button key={name} type="button" className={styles.category} aria-pressed={category === name} onClick={() => setCategory(name)}>{name}</button>
          ))}
        </div>
        <div ref={grid} className={styles.grid}>
          {[0, 1].map((row) => (
            <div key={row} className={styles.row}>
              {CARDS.slice(row * 2, row * 2 + 2).map((n) => (
                <div key={n} className={styles.card} data-part="card">
                  <span className="visually-hidden">{category} {n}, a stand in</span>
                </div>
              ))}
              {row === 0 && <span className={styles.post} data-part="post" data-side="left" aria-hidden="true" />}
              {row === 0 && <span className={styles.post} data-part="post" data-side="right" aria-hidden="true" />}
            </div>
          ))}
        </div>
        <div className={styles.foot}>
          <div ref={rail} className={styles.rail} aria-hidden="true" />
          <div ref={button} className={styles.button}>
            <MetalButton label="View all work" variant="primary" />
          </div>
        </div>
      </section>
    </main>
  );
}
