'use client';

import { useEffect, useRef } from 'react';
import { mountLooks } from '../../pour-looks/looks';
import styles from './PourLooks.module.css';

const LOOKS = [
  { name: 'A · Sun metal with flecks', note: 'Bright cells and darker seams crawl over it like the surface of the sun, with fine flakes riding inside that flash as they turn.' },
  { name: 'B · Mirror', note: 'Liquid mercury, in copper. It gives off almost no light of its own and shows the room and your light on its skin.' },
  { name: 'C · All three', note: 'The sun metal and its flecks, under the mirror’s polished skin.' },
];

export function PourLooks() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const panels = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (!canvas.current) return;
    return mountLooks(canvas.current, panels.current.filter((p): p is HTMLDivElement => !!p));
  }, []);

  return (
    <main className={styles.main}>
      <p className={styles.label}>Study 04 · the pour&rsquo;s look</p>
      <h1 className={styles.title}>Three ways to draw the metal</h1>
      <p className={styles.lede}>
        The same stream, drawn three ways. Move the cursor around each one, or drag a finger. Nothing here is physics: the shape is fixed, so only the
        look is being judged.
      </p>
      <div className={styles.stage}>
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
