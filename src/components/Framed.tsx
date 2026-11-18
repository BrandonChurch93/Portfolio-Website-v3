'use client';

import { useState, type PointerEvent, type ReactNode } from 'react';
import { Plate } from './Plate';
import { CARD_LOOK } from './WorkCard';
import styles from './Framed.module.css';

// A picture in a card's own frame, with a card's own answer to the pointer (his word, Nov 17): the lit plate with
// its copper edge, turning under the pointer by as much as a project card does and growing by as much, the light
// on its metal moving with the turn. What it holds lies inside the frame's bead and turns with it. It stands off
// the wall and throws a shadow there (data-stands).
const TURN = ((CARD_LOOK.turn * Math.PI) / 180) * (CARD_LOOK.lean === 'toward' ? -1 : 1);

export function Framed({ aspect, className, children }: { aspect: number; className?: string; children: ReactNode }) {
  const [hover, setHover] = useState({ on: false, x: 0, y: 0 });
  const enter = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'touch') return;
    const r = e.currentTarget.getBoundingClientRect();
    setHover({ on: true, x: e.clientX - r.left, y: e.clientY - r.top });
  };
  return (
    <div className={`${styles.area} ${className ?? ''}`} style={{ aspectRatio: String(aspect), '--grow': CARD_LOOK.grow } as React.CSSProperties} data-plate-area="" data-stands="" data-awake={hover.on} onPointerEnter={enter} onPointerLeave={() => setHover((h) => ({ ...h, on: false }))}>
      <div className={styles.turn}>
        <Plate finish="card" kind="card" card={{ aspect, edge: 'deep', plain: true }} turn={TURN} hover={hover} tilt={false} className={styles.metal} />
        <div className={styles.window}>{children}</div>
      </div>
    </div>
  );
}
