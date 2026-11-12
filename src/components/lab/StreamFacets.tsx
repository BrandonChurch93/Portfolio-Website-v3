'use client';

import { useEffect, useRef } from 'react';
import { mountFacets } from '../../stream-facets/facets';
import styles from './PourLooks.module.css';

const LOOKS = [
  { name: 'A · Cut', note: 'Chunky pieces, like rough cut gems. Bevelled edges, a fine grain on the solid ones, flaws inside the clear ones.' },
  { name: 'B · Jagged', note: 'Sharp pieces with three or four needle points, some with a notch in them, in the same range of sizes as A. Nothing on the surface: a hair line of light on each edge and that is all.' },
];

export function StreamFacets() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const panels = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!canvas.current) return;
    return mountFacets(canvas.current, panels.current.filter((p): p is HTMLDivElement => !!p));
  }, []);

  return (
    <main className={styles.main}>
      <p className={styles.label}>Study 08 · the shape of the shards</p>
      <h1 className={styles.title}>Two looks for the facets</h1>
      <p className={styles.lede}>
        Rough sketches, to choose between. Both are facets in two materials, solid and clear, circling one line of light. Move the cursor
        over them, or drag a finger. Click or tap a panel to strike it: the facets are thrown, bounce on the ledge and are drawn back in.
      </p>
      <div className={`${styles.stage} ${styles.pair}`}>
        <canvas ref={canvas} className={styles.canvas} aria-hidden="true" />
        {LOOKS.map((look, i) => (
          <section key={look.name} className={styles.look}>
            <div ref={(el) => { panels.current[i] = el; }} className={styles.panel} />
            <h2 className={styles.name}>{look.name}</h2>
            <p className={styles.note}>{look.note}</p>
          </section>
        ))}
      </div>
    </main>
  );
}
