'use client';

import { useEffect, useRef, useState } from 'react';
import { mountCore } from '../../stream-core/core';
import styles from './PourLooks.module.css';

const CORES = [
  { name: 'A · A wave of light', note: 'One steady line of light that swells and thins as it runs, with finer lines winding round it. It crackles only at its leading end.' },
  { name: 'B · An arc', note: 'The same shards and sparks on a core of electricity: jagged lines that never hold still and throw short branches off their sides.' },
];

const START = 0.66;

export function StreamCore() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const panels = useRef<(HTMLDivElement | null)[]>([]);
  const [reach, setReach] = useState(START);
  const live = useRef(START);

  useEffect(() => {
    const asked = Number(new URLSearchParams(location.search).get('reach'));
    if (asked > 0 && asked <= 1) { live.current = asked; setReach(asked); }
    if (!canvas.current) return;
    return mountCore(canvas.current, panels.current.filter((p): p is HTMLDivElement => !!p), () => live.current);
  }, []);

  return (
    <main className={styles.main}>
      <p className={styles.label}>Study 06 · a core with shards</p>
      <h1 className={styles.title}>A core of light, two ways</h1>
      <p className={styles.lede}>
        Rough sketches, to choose between. In both, shards of copper and glass ride round a core of light and are lit by it, and sparks fly from its
        leading end and from where it lands. Only the core differs. The slider stands in for scrolling: drag it to bring the stream down the page.
        Move the cursor around each one, or drag a finger.
      </p>
      <label className={styles.speed}>
        <span>Scroll</span>
        <input
          type="range"
          min={0.02}
          max={1}
          step={0.002}
          value={reach}
          onChange={(e) => { const v = Number(e.target.value); live.current = v; setReach(v); }}
        />
        <span className={styles.amount}>{`${Math.round(reach * 100)}%`}</span>
      </label>
      <div className={`${styles.stage} ${styles.pair}`}>
        <canvas ref={canvas} className={styles.canvas} aria-hidden="true" />
        {CORES.map((core, i) => (
          <section key={core.name} className={styles.look}>
            <div ref={(el) => { panels.current[i] = el; }} className={styles.panel} />
            <h2 className={styles.name}>{core.name}</h2>
            <p className={styles.note}>{core.note}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
