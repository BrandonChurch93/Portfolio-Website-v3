'use client';

import { useEffect, useRef, useState } from 'react';
import { categories } from '../../content/work';
import { mountStream } from '../../stream/stream';
import { mountSwap, type Swap } from '../../stream/surge';
import type { Hub } from '../../whole/hub';
import { Shell } from './Shell';
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
// A card the stream is not on is asleep: a blank, an engine turned dial with none of the card on it (src/metal/dial.ts).
// A band of light crosses it to wake it when the stream strikes it, and runs back when the stream draws back above it
// (src/metal/wake.ts). A row the stream is not on does nothing when a category is picked.
// Software's cards are the live site's. The cards for the other three categories are stand ins, and the page says
// so. The category bar's look and the button are stand ins too. ?ui=0 hides the label.
// On a page with more sections than this one (hub), it lays itself out and hands the hub its things, and the hub
// mounts the one stream for all of them.
export function WorkLab({ hub }: { hub?: Hub }) {
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
    const asked = new URLSearchParams(location.search);
    setUi(asked.get('ui') !== '0' && !hub);
    if (!page.current || !title.current || !bar.current || !grid.current || !rail.current || !button.current) return;
    const all = (what: string, within: Element = grid.current!) => [...within.querySelectorAll<HTMLElement>(what)];
    const rows = all('[data-part="row"]'), layers = rows.map((row) => all('[data-part="layer"]', row));
    const sets = categories.map((_, cat) => rows.flatMap((_row, r) => all('article', layers[r][cat])));
    const cards = mountSwap({ bar: bar.current, rows, layers, cards: sets });
    swap.current = cards;
    const parts = { title: title.current, work: { bar: bar.current, rows, sets, swap: cards, posts: all('[data-part="stone"]'), rail: rail.current, button: button.current } };
    const mounted = hub ? hub.work(parts) : mountStream(page.current, parts).dispose;
    return () => { swap.current = null; mounted(); cards.dispose(); };
  }, [hub]);

  const pick = (index: number) => {
    setCategory(index);
    swap.current?.press(index);
  };

  return (
    <Shell ref={page} className={styles.page} data-embed={hub ? '' : undefined}>
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
            <button key={cat.name} type="button" className={styles.category} aria-pressed={category === index} onClick={() => pick(index)}>{cat.name}</button>
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
    </Shell>
  );
}
