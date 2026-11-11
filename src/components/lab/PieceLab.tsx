'use client';

import { useEffect, useState } from 'react';
import { PieceView } from '../PieceView';
import styles from './PieceLab.module.css';

// One piece alone, filling the viewport, for building and checking it.
// ?entrance=1 plays its entrance. ?making=1 shows the "how this is made" switch. ?label=0 hides the label.
export function PieceLab({ name }: { name: string }) {
  const [opts, setOpts] = useState<{ entrance: boolean; making: boolean; label: boolean } | null>(null);
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    setOpts({ entrance: q.get('entrance') === '1', making: q.get('making') === '1', label: q.get('label') !== '0' });
  }, []);
  return (
    <main className={styles.main}>
      {opts?.label && <h1 className={styles.title}>piece · {name}</h1>}
      {opts && <PieceView name={name} className={styles.stage} entrance={opts.entrance} making={opts.making} />}
    </main>
  );
}
