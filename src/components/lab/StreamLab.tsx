'use client';

import { useEffect, useRef, useState } from 'react';
import { mountStream } from '../../stream/stream';
import styles from './StreamLab.module.css';

// The stream's test shot, alone on a blank page a few screens tall: down from the top, parting on a stand in title,
// round both of its ends, the left side landing on a stand in card, running along it and off its end. It follows the
// page's own scroll. ?hold opens it with the frame held. ?ui=0 hides the label.
export function StreamLab() {
  const page = useRef<HTMLElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const [ui, setUi] = useState(true);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    setUi(q.get('ui') !== '0');
    setHeld(q.has('hold'));
    if (!page.current || !title.current || !card.current) return;
    const stream = mountStream(page.current, { title: title.current, card: card.current, hold: q.has('hold') });
    return () => stream.dispose();
  }, []);

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
    </main>
  );
}
