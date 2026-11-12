'use client';

import { useEffect, useRef, useState } from 'react';
import { mountPour, type PourHandle } from '../../pour/pour';
import { MetalButton } from '../MetalButton';
import styles from './PourLab.module.css';

// The pour's test shot, alone on a blank page: it falls, hits a ledge, splashes, runs along it and drips off the end.
// ?seed=<n> pours a chosen pour again exactly. ?ui=0 hides the words and controls.
export function PourLab() {
  const stage = useRef<HTMLDivElement>(null);
  const pour = useRef<PourHandle | null>(null);
  const [seed, setSeed] = useState<number | null>(null);
  const [slow, setSlow] = useState(false);
  const [ui, setUi] = useState(true);

  useEffect(() => {
    if (!stage.current) return;
    const q = new URLSearchParams(location.search);
    setUi(q.get('ui') !== '0');
    const asked = Number(q.get('seed'));
    const handle = mountPour(stage.current, { seed: Number.isFinite(asked) && asked > 0 ? asked : undefined, onChange: (s) => setSeed(s.seed) });
    pour.current = handle;
    return () => handle.dispose();
  }, []);

  useEffect(() => {
    pour.current?.slow(slow);
  }, [slow]);

  return (
    <main className={styles.main}>
      <div ref={stage} className={styles.stage} role="img" aria-label="Molten copper pours onto a ledge, splashes, runs along it and drips off the end." />
      {ui && (
        <>
          <div className={styles.head}>
            <p className={styles.label}>Study 03 · the pour</p>
            <h1 className={styles.title}>The test shot</h1>
          </div>
          <div className={styles.controls}>
            <div className={styles.buttons}>
              <MetalButton label="Pour again" onClick={() => pour.current?.again()} />
              <MetalButton variant="accent" label={slow ? 'Full speed' : 'Slow motion'} onClick={() => setSlow((s) => !s)} />
            </div>
            <p className={styles.seed}>{seed === null ? ' ' : `pour ${seed}`}</p>
          </div>
        </>
      )}
    </main>
  );
}
