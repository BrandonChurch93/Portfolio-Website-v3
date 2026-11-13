'use client';

import { useEffect, useRef, useState } from 'react';
import { registry } from '../../hooks/registry';
import { clock } from '../../world/clock';
import { BAR, CATEGORIES, STAGE, SurgeSim, type Fonts, type Mode } from '../../work-surge/surge';
import styles from './WorkSurge.module.css';

const MODES: { value: Mode; name: string }[] = [{ value: 'surge', name: 'A · Surge' }, { value: 'together', name: 'B · All at once' }];
const LENGTHS = [{ value: 0.45, name: 'Quick · 0.45 s' }, { value: 0.7, name: 'Medium · 0.7 s' }, { value: 1.1, name: 'Slow · 1.1 s' }];
const RATES = [{ value: 1, name: 'Real speed' }, { value: 0.25, name: 'Quarter speed' }];
const VIEWS = [{ value: 'whole', name: 'Whole section' }, { value: 'real', name: 'Real size, scrolls' }];

function Switch<T extends string | number>({ label, choices, value, set }: { label: string; choices: { value: T; name: string }[]; value: T; set: (v: T) => void }) {
  return (
    <div className={styles.choice}>
      <p className={styles.choiceName}>{label}</p>
      <div className={styles.switch} role="group" aria-label={label}>
        {choices.map((c) => <button key={c.name} type="button" aria-pressed={value === c.value} onClick={() => set(c.value)}>{c.name}</button>)}
      </div>
    </div>
  );
}

// Study 15: what the stream does when the category changes. A wireframe, for order and timing only.
// ?mode=together&len=1.1&view=real open it on those. surgePress(category, at, mode, length) scripts a press for stills.
export function WorkSurge() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const sim = useRef<SurgeSim | null>(null);
  const local = useRef(0);
  const dirty = useRef(true);
  const [mode, setMode] = useState<Mode>('surge');
  const [length, setLength] = useState(0.7);
  const [rate, setRate] = useState(1);
  const [view, setView] = useState('whole');
  const [category, setCategory] = useState(0);
  const live = useRef({ rate });
  live.current.rate = rate;

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.get('mode') === 'together') setMode('together');
    const len = Number(q.get('len'));
    if (LENGTHS.some((l) => l.value === len)) setLength(len);
    if (q.get('view') === 'real') setView('real');

    const el = canvas.current;
    const ctx = el?.getContext('2d');
    if (!el || !ctx) return;
    const s = (sim.current = new SurgeSim());
    const css = getComputedStyle(document.documentElement);
    const fonts: Fonts = { display: css.getPropertyValue('--font-display') || 'sans-serif', mono: css.getPropertyValue('--font-mono') || 'monospace' };
    const size = () => {
      const w = el.clientWidth, dpr = Math.min(devicePixelRatio || 1, 2, Math.sqrt(6e6 / (w * w * (STAGE.h / STAGE.w))));
      el.width = Math.round(w * dpr); el.height = Math.round((w * dpr * STAGE.h) / STAGE.w);
      dirty.current = true;
    };
    const watch = new ResizeObserver(size);
    watch.observe(el);
    size();
    document.fonts.ready.then(() => { dirty.current = true; });
    registry.tool('surgePress', (cat: number, at: number, m: Mode = 'surge', T = 0.7) => { s.press({ t: at, cat, mode: m, T }); dirty.current = true; });
    const off = clock.onFrame((t, dt) => {
      local.current = clock.isFrozen() ? t : local.current + dt * live.current.rate;
      const was = s.t;
      s.advance(local.current);
      if (!dirty.current && !s.busy() && !(clock.isFrozen() && s.t !== was)) return;
      dirty.current = false;
      s.draw(ctx, el.width / STAGE.w, fonts);
    });
    return () => { off(); watch.disconnect(); };
  }, []);

  const press = (cat: number) => {
    if (cat === category) return;
    setCategory(cat);
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    sim.current?.press({ t: local.current + 0.001, cat, mode: still ? 'none' : mode, T: length });
    dirty.current = true;
  };

  return (
    <main className={styles.main} data-view={view}>
      <div className={styles.side}>
        <p className={styles.label}>Study 15 · when the category changes</p>
        <h1 className={styles.title}>The surge</h1>
        <p className={styles.lede}>
          Pick a category below, or on the bar in the drawing. The bar is knocked, the stream resting on its two ends jumps, and a surge runs down each side.
          Each card lets go as the surge reaches it, and the stream strikes the new card as it comes up.
        </p>
        <p className={styles.note}>
          A wireframe. The line stands in for the stream, and every card outside Software is a stand in. Judge the order and the
          timing, not the look.
        </p>
        <div className={styles.play}>
          <p className={styles.playName}>Play it · pick a different category</p>
          <div className={styles.switch} role="group" aria-label="Play it: pick a different category">
            {CATEGORIES.map((name, i) => <button key={name} type="button" aria-pressed={category === i} onClick={() => press(i)}>{name}</button>)}
          </div>
        </div>
        <Switch label="What happens" choices={MODES} value={mode} set={setMode} />
        <Switch label="How long the surge takes, bar to button" choices={LENGTHS} value={length} set={setLength} />
        <Switch label="Playback" choices={RATES} value={rate} set={setRate} />
        <Switch label="View" choices={VIEWS} value={view} set={setView} />
      </div>
      <div className={styles.stage} data-view={view}>
        <canvas ref={canvas} className={styles.canvas} aria-hidden="true" />
        <div
          className={styles.bar} role="group" aria-label="Categories"
          style={{ left: `${(BAR.l / STAGE.w) * 100}%`, top: `${(BAR.t / STAGE.h) * 100}%`, width: `${((BAR.r - BAR.l) / STAGE.w) * 100}%`, height: `${((BAR.b - BAR.t) / STAGE.h) * 100}%` }}
        >
          {CATEGORIES.map((name, i) => <button key={name} type="button" aria-pressed={category === i} onClick={() => press(i)}>{name}</button>)}
        </div>
      </div>
    </main>
  );
}
