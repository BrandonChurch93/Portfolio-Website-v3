'use client';

import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { categories } from '../../content/work';
import { mountStream } from '../../stream/stream';
import { mountSwap, type Swap } from '../../stream/surge';
import { MetalButton } from '../MetalButton';
import { WorkCard } from '../WorkCard';
import styles from './WorkLab.module.css';

const ROWS = [0, 1];

// The stream through the Work section, on a page of its own: the title, the category bar, four project cards in two
// rows, a sun stone beside each side, a rail under the grid with a finial on each outer end, and the button. The
// stream plans its route from where these are on the page, draws the stones and the rail itself, and lays its light
// on the cards.
// The category bar works. Every category's cards are on the page, one set over another in each row, and only one
// set shows. Picking a category knocks the bar, and a surge runs down the stream from it: each card lets go as the
// surge reaches it, the new one comes up, and the stream strikes it as it seats (src/stream/surge.ts).
// Software's cards are the live site's. The cards for the other three categories are stand ins, and the page says
// so. The category bar's look and the button are stand ins too. ?ui=0 hides the label.
export function WorkLab() {
  const page = useRef<HTMLElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLDivElement>(null);
  const swap = useRef<Swap | null>(null);
  const [ui, setUi] = useState(true);
  const [category, setCategory] = useState(0);

  useEffect(() => {
    setUi(new URLSearchParams(location.search).get('ui') !== '0');
    if (!page.current || !title.current || !bar.current || !grid.current || !rail.current || !button.current) return;
    const all = (what: string, within: Element = grid.current!) => [...within.querySelectorAll<HTMLElement>(what)];
    const rows = all('[data-part="row"]'), layers = rows.map((row) => all('[data-part="layer"]', row));
    const sets = categories.map((_, cat) => rows.flatMap((_row, r) => all('article', layers[r][cat])));
    const cards = mountSwap({ bar: bar.current, rows, layers, cards: sets });
    swap.current = cards;
    const mounted = mountStream(page.current, { title: title.current, work: { bar: bar.current, rows, sets, swap: cards, posts: all('[data-part="stone"]'), rail: rail.current, button: button.current } });
    return () => { swap.current = null; mounted.dispose(); cards.dispose(); };
  }, []);

  const pick = (index: number, e: MouseEvent<HTMLButtonElement>) => {
    setCategory(index);
    const r = e.currentTarget.getBoundingClientRect();
    swap.current?.press(index, r.left + r.width / 2);
  };

  return (
    <main ref={page} className={styles.page}>
      {ui && (
        <header className={styles.head}>
          <p className={styles.label}>Study 10 · the stream through Work</p>
          <h1 className={styles.name}>Pick a category</h1>
          <p className={styles.note}>Software&rsquo;s four cards are the live site&rsquo;s. The cards for Games, 3D art and Photography are stand ins: nothing on them is real. The category bar&rsquo;s look and the button are stand ins too.</p>
        </header>
      )}
      <section className={styles.section} aria-labelledby="work-title">
        <h2 ref={title} id="work-title" className={styles.title}>Work</h2>
        <div ref={bar} className={styles.bar} role="group" aria-label="Categories">
          {categories.map((cat, index) => (
            <button key={cat.name} type="button" className={styles.category} aria-pressed={category === index} onClick={(e) => pick(index, e)}>{cat.name}</button>
          ))}
        </div>
        <p className="visually-hidden" role="status">Showing {categories[category].name}{categories[category].standIn ? ', four stand in cards' : ''}</p>
        <div ref={grid} className={styles.grid}>
          {ROWS.map((row) => (
            <div key={row} className={styles.row} data-part="row">
              {categories.map((cat, index) => (
                <div key={cat.name} className={styles.layer} data-part="layer" data-current={index === 0}>
                  {cat.items.slice(row * 2, row * 2 + 2).map((item) => <WorkCard key={item.slug} item={item} />)}
                </div>
              ))}
              {row === 0 && <span className={styles.stone} data-part="stone" data-side="left" aria-hidden="true" />}
              {row === 0 && <span className={styles.stone} data-part="stone" data-side="right" aria-hidden="true" />}
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
