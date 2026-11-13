'use client';

import { useEffect, useRef, useState } from 'react';
import { software } from '../../content/work';
import { mountStream, type StreamHandle } from '../../stream/stream';
import { MetalButton } from '../MetalButton';
import { WorkCard } from '../WorkCard';
import styles from './WorkLab.module.css';

const CATEGORIES = ['Software', 'Games', '3D art', 'Photography'];
const ROWS = [software.slice(0, 2), software.slice(2, 4)];

// The stream through the Work section, on a page of its own: the title, the category bar, four project cards in two
// rows, a sun stone beside each side, a rail under the grid with a finial on each outer end, and the button at its
// low point. The stream plans its route from where these are on the page, draws the stones and the rail itself, and
// lays its light on the cards. The category bar and the button are stand ins.
// Two switches, for looking at a thing both ways: whether the stones' faces light when the stream reaches them, and
// a bar over the word WORK, which is off when the page opens. ?ui=0 hides the label and the switches. ?faces=0 and
// ?over=1 open the page with a switch already thrown.
export function WorkLab() {
  const page = useRef<HTMLElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const overBar = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLDivElement>(null);
  const stream = useRef<StreamHandle | null>(null);
  const [ui, setUi] = useState(true);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [faces, setFaces] = useState(true);
  const [over, setOver] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const lit = q.get('faces') !== '0', barOn = q.get('over') === '1';
    setUi(q.get('ui') !== '0');
    setFaces(lit);
    setOver(barOn);
    if (!page.current || !title.current || !overBar.current || !bar.current || !grid.current || !rail.current || !button.current) return;
    const all = (what: string) => [...grid.current!.querySelectorAll<HTMLElement>(what)];
    const mounted = mountStream(page.current, {
      title: title.current,
      work: { over: overBar.current, bar: bar.current, cards: all('article'), posts: all('[data-part="stone"]'), rail: rail.current, button: button.current },
      faces: lit,
    });
    stream.current = mounted;
    return () => { stream.current = null; mounted.dispose(); };
  }, []);

  const lightFaces = (on: boolean) => {
    setFaces(on);
    stream.current?.setFaces(on);
  };
  // The bar takes no room on the page, so nothing tells the stream it has come or gone: it is told to plan again.
  useEffect(() => { stream.current?.refresh(); }, [over]);

  return (
    <main ref={page} className={styles.page}>
      {ui && (
        <header className={styles.head}>
          <p className={styles.label}>Study 10 · the stream through Work</p>
          <h1 className={styles.name}>The second pass: the real card, the stones, the finials</h1>
          <p className={styles.note}>The category bar and the button are stand ins. The cards are the four on the live site, with its pictures.</p>
        </header>
      )}
      <section className={styles.section} aria-labelledby="work-title">
        <h2 ref={title} id="work-title" className={styles.title}>
          Work
          <span ref={overBar} className={styles.over} aria-hidden="true" hidden={!over} />
        </h2>
        <div ref={bar} className={styles.bar} role="group" aria-label="Categories">
          {CATEGORIES.map((name) => (
            <button key={name} type="button" className={styles.category} aria-pressed={category === name} onClick={() => setCategory(name)}>{name}</button>
          ))}
        </div>
        <div ref={grid} className={styles.grid}>
          {ROWS.map((items, row) => (
            <div key={row} className={styles.row}>
              {items.map((item) => <WorkCard key={item.slug} item={item} />)}
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
      {ui && (
        <div className={styles.switches}>
          <div className={styles.switch} role="group" aria-label="The stones' faces">
            <span className={styles.switchLabel}>The stones&rsquo; faces</span>
            <button type="button" className={styles.option} aria-pressed={faces} onClick={() => lightFaces(true)}>Light</button>
            <button type="button" className={styles.option} aria-pressed={!faces} onClick={() => lightFaces(false)}>Stay dark</button>
          </div>
          <div className={styles.switch} role="group" aria-label="A bar over the word Work">
            <span className={styles.switchLabel}>A bar over Work</span>
            <button type="button" className={styles.option} aria-pressed={!over} onClick={() => setOver(false)}>Off</button>
            <button type="button" className={styles.option} aria-pressed={over} onClick={() => setOver(true)}>On</button>
          </div>
        </div>
      )}
    </main>
  );
}
