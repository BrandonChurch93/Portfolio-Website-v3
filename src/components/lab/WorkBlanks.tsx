'use client';

import { useEffect, useRef, useState } from 'react';
import { software } from '../../content/work';
import { registry } from '../../hooks/registry';
import { mountBlanks, type Blanks } from '../../work-blanks/blanks';
import { WorkCard } from '../WorkCard';
import styles from './WorkBlanks.module.css';

const DESIGNS = [
  { name: 'A · Etched layout', note: 'The card’s layout engraved as hairlines, where the real card has its parts. Waking, the lines light and the mirror gives way outward from them.' },
  { name: 'B · The mould', note: 'The same layout as shallow satin pockets sunk into the mirror. Waking, each pocket fills from its foot, then the metal between gives way.' },
  { name: 'C · Facets', note: 'The face cut into flat planes like one of the stream’s shards, each showing a different part of the room. Waking, the planes give way one after another.' },
  { name: 'D · Engine turned', note: 'Fine turned rays round a boss, as on a watch dial, that smear the lights into fans. No hint of the layout. Waking, a band of light crosses it with the card behind.' },
];

// Study 17: four blanks for a sleeping card, each over a real card. ?wake=0.5 holds every one half woken for a still,
// and blankWake(i, amount) holds one.
export function WorkBlanks() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const tiles = useRef<(HTMLDivElement | null)[]>([]);
  const blanks = useRef<Blanks | null>(null);
  const held = useRef<number | null>(null);
  const [awake, setAwake] = useState([false, false, false, false]);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!canvas.current) return;
    const mounted = mountBlanks(canvas.current, tiles.current.filter((t): t is HTMLDivElement => !!t));
    blanks.current = mounted;
    const q = new URLSearchParams(location.search).get('wake');
    if (q !== null) { held.current = Number(q); DESIGNS.forEach((_, i) => mounted.wake(i, true, held.current ?? undefined)); }
    registry.tool('blankWake', (i: number, amount: number) => mounted.wake(i, true, amount));
    return () => mounted.dispose();
  }, []);

  useEffect(() => { if (held.current === null) awake.forEach((on, i) => blanks.current?.wake(i, on)); }, [awake]);
  useEffect(() => { blanks.current?.slow(slow); }, [slow]);

  const flip = (i: number) => { held.current = null; setAwake((a) => a.map((on, n) => (n === i ? !on : on))); };
  const all = awake.every(Boolean);

  return (
    <main className={styles.main}>
      <p className={styles.label}>Study 17 · the sleeping card</p>
      <h1 className={styles.title}>Four blanks</h1>
      <p className={styles.lede}>
        Mirror polished bronze, lit by long lights that stand off the screen. Move the cursor over a blank and scroll the page: the
        reflections slide. Each blank sits over a real card. Wake one to see how it gives way to the card, and put it back to sleep
        to see the same change run backwards.
      </p>
      <div className={styles.controls}>
        <button type="button" className={styles.go} onClick={() => { held.current = null; setAwake(DESIGNS.map(() => !all)); }}>{all ? 'Put all to sleep' : 'Wake all'}</button>
        <button type="button" className={styles.go} aria-pressed={slow} onClick={() => setSlow((s) => !s)}>Quarter speed · {slow ? 'on' : 'off'}</button>
      </div>
      <div className={styles.stage}>
        <canvas ref={canvas} className={styles.canvas} aria-hidden="true" />
        <div className={styles.grid}>
          {DESIGNS.map((d, i) => (
            <section key={d.name} className={styles.item}>
              <h2 className={styles.name}>{d.name}</h2>
              <p className={styles.note}>{d.note}</p>
              <div ref={(el) => { tiles.current[i] = el; }} className={styles.slot} data-awake={awake[i]}>
                <WorkCard item={software[i]} />
              </div>
              <button type="button" className={styles.go} onClick={() => flip(i)}>{awake[i] ? 'Put to sleep' : 'Wake'}</button>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
