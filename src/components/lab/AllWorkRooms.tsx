'use client';

import { useEffect, useState } from 'react';
import { LOOKS, type Look } from '../../atmosphere/atmosphere';
import { AllWork } from '../AllWork';
import styles from './AllWorkRooms.module.css';

// Study 33: three rooms for the page of all his work, to pick one from (BRIEF.md, Open 33). The page is the real
// one, and the room is drawn behind it. ?look=wall, shaft or night opens it in that room, ?look=none with none,
// and ?ui=0 hides the switch.
export function AllWorkRooms() {
  const [look, setLook] = useState<Look | null>(null);
  const [ui, setUi] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const q = new URLSearchParams(location.search), asked = q.get('look');
    setLook(asked === 'none' ? null : LOOKS.find((l) => l.name === asked)?.name ?? 'wall');
    setUi(q.get('ui') !== '0');
    setReady(true);
  }, []);

  return (
    <>
      {ready && <AllWork key={look ?? 'none'} look={look} />}
      {ui && (
        <div className={styles.bar} role="group" aria-label="Rooms">
          {LOOKS.map((l) => <button key={l.name} type="button" aria-pressed={look === l.name} onClick={() => setLook(l.name)}>{l.label}</button>)}
          <button type="button" aria-pressed={look === null} onClick={() => setLook(null)}>None</button>
        </div>
      )}
    </>
  );
}
