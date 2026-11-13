'use client';

import { useEffect, useRef, useState } from 'react';
import { mountFinials } from '../../work-objects/finials';
import type { Objects } from '../../work-objects/objects';
import styles from './WorkObjects.module.css';

const FINIALS = [
  { name: '1 · Blade', note: 'A leaf shaped blade with two flat faces meeting in a ridge, like one of the stream&rsquo;s shards grown large.' },
  { name: '2 · Orb', note: 'A ball with a carved band round its middle and a small point beyond it.' },
  { name: '3 · Steps', note: 'Four square tiers, each smaller than the last, like the side of a stepped temple. It belongs to the sun stone&rsquo;s world.' },
];

export function WorkFinials() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const tiles = useRef<(HTMLDivElement | null)[]>([]);
  const objects = useRef<Objects | null>(null);
  const [stream, setStream] = useState(true);

  useEffect(() => {
    if (!canvas.current) return;
    const mounted = mountFinials(canvas.current, tiles.current.filter((t): t is HTMLDivElement => !!t));
    objects.current = mounted;
    if (new URLSearchParams(location.search).get('stream') === '0') setStream(false);
    return () => mounted.dispose();
  }, []);

  useEffect(() => { objects.current?.stream(stream); }, [stream]);

  return (
    <main className={styles.main}>
      <p className={styles.label}>Study 12 · the ends of the rail</p>
      <h1 className={styles.title}>Three finials</h1>
      <p className={styles.lede}>
        The rail&rsquo;s bar as it is on the page, with a finial at each end in place of the knobs, the way a fine curtain rod is finished.
        Each starts with the same collar where it meets the bar. Rough, and drawn larger than on the page. Tap near one to bring the light
        to it.
      </p>
      <button type="button" className={styles.toggle} aria-pressed={stream} onClick={() => setStream((s) => !s)}>
        Stream · {stream ? 'on' : 'off'}
      </button>

      <div className={styles.stage}>
        <canvas ref={canvas} className={styles.canvas} aria-hidden="true" />
        <div className={styles.rails}>
          {FINIALS.map((o, i) => (
            <section key={o.name} className={styles.item}>
              <div ref={(el) => { tiles.current[i] = el; }} className={styles.rail} />
              <h3 className={styles.name}>{o.name}</h3>
              <p className={styles.note} dangerouslySetInnerHTML={{ __html: o.note }} />
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
