'use client';

import { useEffect, useRef, useState } from 'react';
import { hooksWanted } from '../hooks/registry';
import { loading } from '../world/loading';
import styles from './Preloader.module.css';

// The first thing a visitor sees: the site saying plainly that it is loading, until the first screen is whole
// (BRIEF.md, Settled, Hero, "After the hero"). It is in the page's own HTML, so it is on the screen before any
// script has run, and it covers the page until what the page waits for (src/world/loading.ts: the hero's world,
// the fonts) is ready. Then its line runs out to its end and it lifts.
// What it shows is true: the line is how much of the wait is done. Between two steps it creeps a little, so it
// never looks stuck, and it never goes back.
// It can never trap a visitor: after `most` it lifts whatever is still loading.
// ?loader=hold keeps it up for a still, with &at=0.42 for how far along it shows. The screenshot scripts (?hook=1)
// do not get it unless they ask with ?loader=1.

// In milliseconds: the least it is shown, so it never flickers on and off. The longest it waits. How long the page
// is given to say what it is waiting for before nothing awaited counts as ready. How long it takes to lift.
const WAIT = { least: 900, most: 15000, settle: 500, lift: 700 } as const;
// How far the line may creep past what is really done, and how fast, as shares of the whole a second.
const CREEP = { most: 0.07, pace: 0.02 } as const;

export function Preloader({ name, word }: { name: string; word: string }) {
  const [gone, setGone] = useState(false), [lifting, setLifting] = useState(false);
  const root = useRef<HTMLDivElement>(null), fill = useRef<HTMLSpanElement>(null), count = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const q = new URLSearchParams(location.search), asked = q.get('loader');
    if (hooksWanted() && !asked) { setGone(true); return; }
    const held = asked === 'hold', at = Number(q.get('at') ?? 0.42);
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const doc = document.documentElement, was = doc.style.overflow;
    doc.style.overflow = 'hidden';
    loading.begin('fonts', 1);
    void document.fonts.ready.then(() => loading.end('fonts'));

    const from = performance.now();
    let shown = 0, crept = 0, real = 0, last = from, frame = 0, lifted = false, timer = 0;
    const show = (v: number): void => {
      if (fill.current) fill.current.style.transform = `scaleX(${v.toFixed(4)})`;
      const n = Math.round(v * 100);
      if (count.current && count.current.textContent !== String(n)) count.current.textContent = String(n);
      if (root.current && n % 10 === 0) root.current.setAttribute('aria-valuenow', String(n));
    };
    const lift = (): void => {
      if (lifted) return;
      lifted = true;
      doc.style.overflow = was;
      setLifting(true);
      timer = window.setTimeout(() => setGone(true), still ? 0 : WAIT.lift);
    };
    const tick = (): void => {
      const now = performance.now(), dt = Math.min(0.1, (now - last) / 1000), age = now - from, s = loading.state();
      last = now;
      if (held) { show(at); return; }
      // Ready: everything the page said it waits for is done, and it has had time to say so. Or it has waited
      // long enough that whatever is left is not coming.
      const ready = (age > WAIT.settle && !s.busy && age > WAIT.least) || age > WAIT.most;
      if (s.share > real) { real = s.share; crept = 0; }
      else crept = Math.min(CREEP.most, crept + CREEP.pace * dt);
      const aim = ready ? 1 : Math.min(0.97, real * 0.97 + crept);
      shown = still ? aim : Math.max(shown, shown + (aim - shown) * Math.min(1, dt * (ready ? 9 : 5)));
      show(shown);
      if (ready && shown > 0.992) { show(1); lift(); return; }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(frame); clearTimeout(timer); doc.style.overflow = was; };
  }, []);

  if (gone) return null;
  return (
    <div ref={root} className={styles.loader} data-lifting={lifting ? '' : undefined} role="progressbar" aria-label={word} aria-valuemin={0} aria-valuemax={100} aria-valuenow={0}>
      <div className={styles.block}>
        <p className={styles.name}>{name}</p>
        <span className={styles.track} aria-hidden="true"><span ref={fill} className={styles.fill} /></span>
        <p className={styles.row} aria-hidden="true">
          <span>{word}</span>
          <span className={styles.count}><span ref={count}>0</span>%</span>
        </p>
      </div>
    </div>
  );
}
