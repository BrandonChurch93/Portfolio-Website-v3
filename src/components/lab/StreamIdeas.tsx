'use client';

import { useEffect, useRef, useState } from 'react';
import { mountIdeas } from '../../stream-ideas/ideas';
import styles from './PourLooks.module.css';

const IDEAS = [
  { name: 'A · Threads', note: 'Hundreds of hair fine lines flowing together, with lights running down them. Your light lies on them as a sheen.' },
  { name: 'B · Copper leaf', note: 'Thousands of small shards of metal, tumbling as they flow. Each one flashes when it faces your light.' },
  { name: 'C · Ink', note: 'A glowing plume that sinks, curls and folds on its own, as ink does in water. Moving your light through it stirs it.' },
];

const START_SPEED = 0.3;

export function StreamIdeas() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const panels = useRef<(HTMLDivElement | null)[]>([]);
  const [speed, setSpeed] = useState(START_SPEED);
  const live = useRef(START_SPEED);

  useEffect(() => {
    if (!canvas.current) return;
    return mountIdeas(canvas.current, panels.current.filter((p): p is HTMLDivElement => !!p), () => live.current);
  }, []);

  return (
    <main className={styles.main}>
      <p className={styles.label}>Study 05 · what the stream is</p>
      <h1 className={styles.title}>Three ideas for the stream</h1>
      <p className={styles.lede}>
        Rough sketches, to choose a direction from. Each comes down onto a title, goes round both of its ends, and one side lands on a card and runs
        off it. Move the cursor around each one, or drag a finger. The slider sets how fast they run.
      </p>
      <label className={styles.speed}>
        <span>Speed</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={speed}
          onChange={(e) => { const v = Number(e.target.value); live.current = v; setSpeed(v); }}
        />
        <span className={styles.amount}>{speed === 0 ? 'Still' : `${Math.round(speed * 100)}%`}</span>
      </label>
      <div className={styles.stage}>
        <canvas ref={canvas} className={styles.canvas} aria-hidden="true" />
        {IDEAS.map((idea, i) => (
          <section key={idea.name} className={styles.look}>
            <div ref={(el) => { panels.current[i] = el; }} className={styles.panel} />
            <h2 className={styles.name}>{idea.name}</h2>
            <p className={styles.note}>{idea.note}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
