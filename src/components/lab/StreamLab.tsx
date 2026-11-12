'use client';

import { useEffect, useRef, useState } from 'react';
import { mountStream, type StreamHandle } from '../../stream/stream';
import type { Look } from '../../stream/shards';
import styles from './StreamLab.module.css';

const LOOKS: { look: Look; name: string }[] = [{ look: 'facets', name: 'Facets' }, { look: 'first', name: 'First round' }];

// The stream's test shot, alone on a blank page a few screens tall: down from the top, parting on a stand in title,
// round both of its ends, the left side landing on a stand in card, running along it and off its end. It follows the
// page's own scroll. ?hold opens it with the frame held. ?shards=first opens it with the first round's shards, and
// the switch at the foot of the screen swaps the two where they stand. ?ui=0 hides the label and the switch.
export function StreamLab() {
  const page = useRef<HTMLElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const stream = useRef<StreamHandle | null>(null);
  const [ui, setUi] = useState(true);
  const [held, setHeld] = useState(false);
  const [look, setLook] = useState<Look>('facets');

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const first: Look = q.get('shards') === 'first' ? 'first' : 'facets';
    setUi(q.get('ui') !== '0');
    setHeld(q.has('hold'));
    setLook(first);
    if (!page.current || !title.current || !card.current) return;
    const mounted = mountStream(page.current, { title: title.current, card: card.current, hold: q.has('hold'), look: first });
    stream.current = mounted;
    return () => { stream.current = null; mounted.dispose(); };
  }, []);

  const swap = (next: Look) => {
    setLook(next);
    stream.current?.setLook(next);
    const url = new URL(location.href);
    if (next === 'first') url.searchParams.set('shards', 'first'); else url.searchParams.delete('shards');
    history.replaceState(null, '', url);
  };

  return (
    <main ref={page} className={styles.page}>
      {ui && (
        <header className={styles.head}>
          <p className={styles.label}>{held ? 'Study 07 · the stream · a held frame' : 'Study 07 · the stream'}</p>
          <h1 className={styles.name}>The test shot</h1>
        </header>
      )}
      <h2 ref={title} className={styles.title}>Work</h2>
      <div ref={card} className={styles.card} />
      {ui && (
        <div className={styles.switch} role="group" aria-label="Shards">
          <span className={styles.switchLabel}>Shards</span>
          {LOOKS.map((l) => (
            <button key={l.look} type="button" className={styles.option} aria-pressed={look === l.look} onClick={() => swap(l.look)}>{l.name}</button>
          ))}
        </div>
      )}
    </main>
  );
}
