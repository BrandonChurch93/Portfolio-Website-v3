'use client';

import { useEffect, useRef, useState } from 'react';
import { mountGuardians } from '../../work-objects/guardians';
import type { Objects } from '../../work-objects/objects';
import styles from './WorkObjects.module.css';

const FAMILIES = [
  { name: '1 · Pharaoh', mask: 'A mask in a striped headcloth, with the cobra at its brow and the long beard.', rail: 'The same head in profile at each end of the rail.' },
  { name: '2 · Gargoyle', mask: 'A horned grotesque with a heavy brow and an open mouth full of teeth.', rail: 'A horned head on a neck, jaws open, lunging out from each end.' },
  { name: '3 · Sun stone', mask: 'A carved disc: a face at the center with its tongue out, ringed by tabs, glyphs and eight rays.', rail: 'A feathered serpent at each end, jaws open.' },
];

export function WorkGuardians() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const tiles = useRef<(HTMLDivElement | null)[]>([]);
  const objects = useRef<Objects | null>(null);
  const [stream, setStream] = useState(true);

  useEffect(() => {
    if (!canvas.current) return;
    const mounted = mountGuardians(canvas.current, tiles.current.filter((t): t is HTMLDivElement => !!t));
    objects.current = mounted;
    if (new URLSearchParams(location.search).get('stream') === '0') setStream(false);
    return () => mounted.dispose();
  }, []);

  useEffect(() => { objects.current?.stream(stream); }, [stream]);

  return (
    <main className={styles.main}>
      <p className={styles.label}>Study 11 · statues for the stream to wake</p>
      <h1 className={styles.title}>Three guardians</h1>
      <p className={styles.lede}>
        Rough reliefs, to choose a direction from. Each family is a mask that faces out where a post stands now, and a pair of heads in
        profile at the ends of the rail, looking outward. The rail&rsquo;s bar is the one on the page. Their eyes and mouths are openings:
        switch the stream off and on to see them go dark and light. Tap near one to bring the cursor&rsquo;s light to it.
      </p>
      <button type="button" className={styles.toggle} aria-pressed={stream} onClick={() => setStream((s) => !s)}>
        Stream · {stream ? 'on' : 'off'}
      </button>

      <div className={styles.stage}>
        <canvas ref={canvas} className={styles.canvas} aria-hidden="true" />
        <h2 className={styles.group}>Facing out, where the posts are</h2>
        <div className={styles.posts}>
          {FAMILIES.map((o, i) => (
            <section key={o.name} className={styles.item}>
              <div ref={(el) => { tiles.current[i] = el; }} className={styles.post} />
              <h3 className={styles.name}>{o.name}</h3>
              <p className={styles.note}>{o.mask}</p>
            </section>
          ))}
        </div>
        <h2 className={styles.group}>In profile, at the ends of the rail</h2>
        <div className={styles.rails}>
          {FAMILIES.map((o, i) => (
            <section key={o.name} className={styles.item}>
              <div ref={(el) => { tiles.current[i + 3] = el; }} className={styles.rail} />
              <h3 className={styles.name}>{o.name}</h3>
              <p className={styles.note}>{o.rail}</p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
