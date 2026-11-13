'use client';

import { useEffect, useRef, useState } from 'react';
import { mountPairing } from '../../work-objects/pairing';
import type { Objects } from '../../work-objects/objects';
import styles from './WorkObjects.module.css';

const PAIRS = [
  { name: 'Sun stone · Blade', note: 'The stone with the leaf shaped blades on the rail.' },
  { name: 'Sun stone · Steps', note: 'The stone with the stepped tiers on the rail.' },
];

export function WorkPairing() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const tiles = useRef<(HTMLDivElement | null)[]>([]);
  const objects = useRef<Objects | null>(null);
  const [stream, setStream] = useState(true);

  useEffect(() => {
    if (!canvas.current) return;
    const mounted = mountPairing(canvas.current, tiles.current.filter((t): t is HTMLDivElement => !!t));
    objects.current = mounted;
    if (new URLSearchParams(location.search).get('stream') === '0') setStream(false);
    return () => mounted.dispose();
  }, []);

  useEffect(() => { objects.current?.stream(stream); }, [stream]);

  return (
    <main className={styles.main}>
      <p className={styles.label}>Study 13 · the sun stone with each finial</p>
      <h1 className={styles.title}>Blade or Steps</h1>
      <p className={styles.lede}>
        The sun stone you picked for the posts, beside the rail with each of the two finials, at about the sizes they have against each
        other on the page. Each is shown large, and then at the size it would be on the page. Rough reliefs, as before. Switch the
        stream off and on, and tap near one to bring the light to it.
      </p>
      <button type="button" className={styles.toggle} aria-pressed={stream} onClick={() => setStream((s) => !s)}>
        Stream · {stream ? 'on' : 'off'}
      </button>

      <div className={styles.stage}>
        <canvas ref={canvas} className={styles.canvas} aria-hidden="true" />
        <div className={styles.rails}>
          {PAIRS.map((o, i) => (
            <section key={o.name} className={styles.item}>
              <div ref={(el) => { tiles.current[i] = el; }} className={styles.pair} />
              <h3 className={styles.name}>{o.name}</h3>
              <p className={styles.note}>{o.note}</p>
              <p className={styles.group}>At the size on the page</p>
              <div ref={(el) => { tiles.current[i + PAIRS.length] = el; }} className={styles.actual} />
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
