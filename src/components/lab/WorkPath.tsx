'use client';

import { useEffect, useRef, useState } from 'react';
import { registry } from '../../hooks/registry';
import { clock } from '../../world/clock';
import { STAGE, SurgeSim, type Fonts, type PathName } from '../../work-surge/surge';
import styles from './WorkSurge.module.css';

const PATHS: { value: PathName; name: string }[] = [
  { value: 'now', name: 'A · As now' },
  { value: 'ricochet', name: 'B · Ricochet' },
  { value: 'swing', name: 'D · Swing and strike' },
  { value: 'bolt', name: 'E · Bolt' },
];
const NOTES: Record<string, string> = {
  now: 'The route on the Work page today, redrawn by hand: it wanders on its free runs, falls in bows and rounds every turn.',
  ricochet: 'Straight runs and hard corners, with no wander. It arrives straight, strikes and leaves straight.',
  swing: 'B with the swing put back. It wanders on its long free runs, the wander dies away before every strike, and it arrives and leaves straight.',
  bolt: 'B with a different wander: short straight strokes that change side unevenly, like a bolt. It still comes straight in to every strike.',
};
const SECONDS = 4.6;

// Study 16: paths for the stream through Work, on the wireframe of Study 15. For the shape and its turns only.
// ?path=swing&at=0.42&ghost=1&lunge=1 opens it on those, and pathAt(share) sets how far down the scroll's line is for a still.
export function WorkPath() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const slider = useRef<HTMLInputElement>(null);
  const sim = useRef<SurgeSim | null>(null);
  const dirty = useRef(true);
  const run = useRef({ pos: 1, playing: false });
  const [path, setPath] = useState<PathName>('now');
  const [ghost, setGhost] = useState(false);
  const [lunge, setLunge] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const named = PATHS.find((p) => p.value === q.get('path'))?.value;
    if (named) setPath(named);
    if (q.get('ghost') === '1') setGhost(true);
    if (q.get('lunge') === '1') setLunge(true);
    const at = q.get('at');
    if (at !== null) run.current.pos = Math.max(0, Math.min(1, Number(at)));

    const el = canvas.current;
    const ctx = el?.getContext('2d');
    if (!el || !ctx) return;
    const s = (sim.current = new SurgeSim(named ?? 'now'));
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
    registry.tool('pathAt', (share: number) => { run.current = { pos: share, playing: false }; dirty.current = true; });
    let local = 0;
    const off = clock.onFrame((t, dt) => {
      const r = run.current;
      local = clock.isFrozen() ? t : local + dt;
      if (r.playing) {
        r.pos = Math.min(1, r.pos + dt / SECONDS);
        if (r.pos >= 1) r.playing = false;
        if (slider.current) slider.current.value = String(Math.round(r.pos * 1000));
      }
      const line = r.pos >= 1 ? null : -70 + r.pos * (STAGE.h + 90);
      if (line !== s.line) { s.line = line; dirty.current = true; }
      const was = s.t;
      s.advance(local);
      if (!dirty.current && !s.busy() && !(clock.isFrozen() && s.t !== was)) return;
      dirty.current = false;
      s.draw(ctx, el.width / STAGE.w, fonts);
    });
    return () => { off(); watch.disconnect(); };
  }, []);

  useEffect(() => {
    sim.current?.setPath(path, ghost);
    if (sim.current) sim.current.lunge = lunge;
    dirty.current = true;
  }, [path, ghost, lunge]);

  const play = () => {
    sim.current?.rewind();
    run.current = { pos: 0, playing: true };
  };
  const drag = (v: number) => {
    run.current = { pos: v / 1000, playing: false };
  };

  return (
    <main className={styles.main}>
      <div className={styles.side}>
        <p className={styles.label}>Study 16 · the stream&rsquo;s path</p>
        <h1 className={styles.title}>The path</h1>
        <p className={styles.lede}>Four paths through the same stops. Flip between them to see where each one turns, then run the stream down each.</p>
        <p className={styles.note}>
          A wireframe. The line stands in for the stream. Judge the shape, the turns and how it comes in to each strike, not the look.
        </p>
        <div className={styles.play}>
          <p className={styles.playName}>The path</p>
          <div className={styles.switch} role="group" aria-label="The path">
            {PATHS.map((p) => <button key={p.value} type="button" aria-pressed={path === p.value} onClick={() => setPath(p.value)}>{p.name}</button>)}
          </div>
          <p className={styles.note}>{NOTES[path]}</p>
        </div>
        <div className={styles.choice}>
          <p className={styles.choiceName}>Run it</p>
          <button type="button" className={styles.go} onClick={play}>Run the stream down</button>
          <label className={styles.drag}>
            <span>Or drag it down yourself</span>
            <input ref={slider} type="range" min={0} max={1000} defaultValue={1000} onInput={(e) => drag(Number(e.currentTarget.value))} />
          </label>
        </div>
        <div className={styles.choice}>
          <p className={styles.choiceName}>The leading end lunges into each strike</p>
          <div className={styles.switch} role="group" aria-label="The leading end lunges into each strike">
            <button type="button" aria-pressed={!lunge} onClick={() => setLunge(false)}>Off</button>
            <button type="button" aria-pressed={lunge} onClick={() => setLunge(true)}>On</button>
          </div>
        </div>
        <div className={styles.choice}>
          <p className={styles.choiceName}>Today&rsquo;s path as a dashed line underneath</p>
          <div className={styles.switch} role="group" aria-label="Today's path as a dashed line underneath">
            <button type="button" aria-pressed={!ghost} onClick={() => setGhost(false)}>Off</button>
            <button type="button" aria-pressed={ghost} onClick={() => setGhost(true)}>On</button>
          </div>
        </div>
      </div>
      <div className={styles.stage} data-view="whole">
        <canvas ref={canvas} className={styles.canvas} aria-hidden="true" />
      </div>
    </main>
  );
}
