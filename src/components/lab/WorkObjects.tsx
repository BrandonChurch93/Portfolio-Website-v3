'use client';

import { useEffect, useRef, useState } from 'react';
import { mountObjects, type Objects } from '../../work-objects/objects';
import styles from './WorkObjects.module.css';

const POSTS = [
  { name: '1 · Knob', note: 'What is on the page now, redrawn here: a milled rim, an enamel ring, a dish and a slotted boss.' },
  { name: '2 · Wheel', note: 'A flywheel: a round tire, a pierced web the page shows through, a hub with a nut. The stream would ride round the tire.' },
  { name: '3 · Facet', note: 'A cut stud in a plain bezel. Flat faces that each catch the light as one plane, like the shards.' },
];
const RAILS = [
  { name: '1 · Bar', note: 'What is on the page now, redrawn here: a bead along the top, a brushed web with one enamel line, a stud at each end with the slots in line.' },
  { name: '2 · Truss', note: 'An open girder: two tubes joined by straps, with a rivet at every joint. The page shows through it.' },
  { name: '3 · Channel', note: 'A slotted channel. The stream runs inside it and shows through the slots.' },
];

export function WorkObjects() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const tiles = useRef<(HTMLDivElement | null)[]>([]);
  const objects = useRef<Objects | null>(null);
  const [stream, setStream] = useState(true);

  useEffect(() => {
    if (!canvas.current) return;
    const mounted = mountObjects(canvas.current, tiles.current.filter((t): t is HTMLDivElement => !!t));
    objects.current = mounted;
    if (new URLSearchParams(location.search).get('stream') === '0') setStream(false);
    return () => mounted.dispose();
  }, []);

  useEffect(() => { objects.current?.stream(stream); }, [stream]);

  return (
    <main className={styles.main}>
      <p className={styles.label}>Study 10 · the things the stream meets in Work</p>
      <h1 className={styles.title}>Three posts, three rails</h1>
      <p className={styles.lede}>
        Designs to choose between, in the buttons&rsquo; metal. Each is lit by the room, by the cursor&rsquo;s light and by a line that stands in for
        the stream. Move the cursor over them, or tap near one to bring the light to it. They are drawn larger than they are on the page.
      </p>
      <button type="button" className={styles.toggle} aria-pressed={stream} onClick={() => setStream((s) => !s)}>
        Stream · {stream ? 'on' : 'off'}
      </button>

      <div className={styles.stage}>
        <canvas ref={canvas} className={styles.canvas} aria-hidden="true" />
        <h2 className={styles.group}>The turning object</h2>
        <div className={styles.posts}>
          {POSTS.map((o, i) => (
            <section key={o.name} className={styles.item}>
              <div ref={(el) => { tiles.current[i] = el; }} className={styles.post} />
              <h3 className={styles.name}>{o.name}</h3>
              <p className={styles.note}>{o.note}</p>
            </section>
          ))}
        </div>
        <h2 className={styles.group}>The rail</h2>
        <div className={styles.rails}>
          {RAILS.map((o, i) => (
            <section key={o.name} className={styles.item}>
              <div ref={(el) => { tiles.current[i + 3] = el; }} className={styles.rail} />
              <h3 className={styles.name}>{o.name}</h3>
              <p className={styles.note}>{o.note}</p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
