'use client';

import { useEffect, useRef, useState, type CSSProperties, type FocusEvent, type PointerEvent } from 'react';
import type { WorkItem } from '../content/work';
import { CARD, cardPicture, type CardEdge } from '../metal/mask';
import { Plate } from './Plate';
import styles from './WorkCard.module.css';

// The picture's window is twice as wide as it is tall: most of the screenshots are wide, and a lower window keeps the
// card, and the section, shorter.
export const PICTURE_ASPECT = 2;

// The choices still open on the card, each with the value it has until one is picked.
// reveal: how the picture's own colors come back: all at once, all at once while the picture comes closer, behind a
// soft edge that crosses it, or its lights first. turn: how far the card turns under the pointer, in degrees at its
// edge. lean: whether the side under the pointer goes away from it or comes toward it. grow: the share of its size the
// card grows by while it is awake. edge: a thin bead, or a wide rim that turns in.
export interface CardLook {
  reveal: 'fade' | 'push' | 'sweep' | 'lights';
  turn: number;
  lean: 'away' | 'toward';
  grow: number;
  edge: CardEdge;
}
export const CARD_LOOK: CardLook = { reveal: 'fade', turn: 6, lean: 'away', grow: 0.03, edge: 'thin' };
const PUSH = 0.045;

interface Props {
  item: WorkItem;
  look?: CardLook;
  // Hold the card as it is under the pointer, with the pointer at this point of the card, 0 to 1. For stills.
  held?: [number, number];
  className?: string;
}

// Where nothing hovers, the cards nearest the middle of the screen are the ones that are awake.
const touchCards = new Map<HTMLElement, (on: boolean) => void>();
let watching = false;
function watchTouch(): void {
  if (watching || typeof window === 'undefined' || !matchMedia('(hover: none)').matches) return;
  watching = true;
  let queued = false;
  const pick = () => {
    queued = false;
    const mid = innerHeight / 2;
    const away = new Map<HTMLElement, number>();
    let least = innerHeight * 0.32;
    for (const el of touchCards.keys()) {
      const r = el.getBoundingClientRect();
      const d = Math.abs(r.top + r.height / 2 - mid);
      away.set(el, d);
      if (d < least) least = d;
    }
    // Cards side by side are as near as each other, so a row wakes together.
    for (const [el, set] of touchCards) set(away.get(el)! <= least + 8 && least < innerHeight * 0.32);
  };
  const ask = () => { if (!queued) { queued = true; requestAnimationFrame(pick); } };
  addEventListener('scroll', ask, { passive: true });
  addEventListener('resize', ask, { passive: true });
  ask();
}

// A project card. Its plate is lit metal round a dark face and a picture, with a band of bronze that carries its
// facts, and its words are in the page over it.
// At rest the picture is shown in the site's metals. Under the pointer, with keyboard focus, or nearest the middle of
// a touch screen, its own colors come back and its loop plays, the bead and the rail catch the light, and the card
// grows a little.
// It also turns in depth with the pointer, words and all, and the light on its metal turns with it.
// The whole card opens the case study, and says so at its foot. Live, Evals and Code go elsewhere: with the pointer
// on one of them the case study's words go quiet and that link lights, so it is always plain where a click leads.
export function WorkCard({ item, look = CARD_LOOK, held, className }: Props) {
  const el = useRef<HTMLElement>(null);
  const band = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState({ on: false, x: 0, y: 0 });
  const [stripH, setStripH] = useState(0);
  const shape = { aspect: PICTURE_ASPECT, stripH: stripH || undefined, edge: look.edge };
  const picture = cardPicture(shape);

  // The plate draws the band where the page laid it out: on a narrow card its words wrap and it grows.
  useEffect(() => {
    const b = band.current;
    if (!b) return;
    const read = () => {
      const design = (b.parentElement!.offsetWidth / CARD.width) * CARD.strip;
      setStripH(b.offsetHeight > design + 1 ? Math.round(b.offsetHeight * 2) / 2 : 0);
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(b);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const card = el.current;
    if (!card || held) return;
    touchCards.set(card, (on) => {
      const r = card.getBoundingClientRect();
      setHover((h) => (h.on === on ? h : { on, x: r.width / 2, y: (r.width / CARD.width) * picture * 0.5 }));
    });
    watchTouch();
    return () => { touchCards.delete(card); };
  }, [held, picture]);

  useEffect(() => {
    const card = el.current;
    if (!card || !held) return;
    const r = card.getBoundingClientRect();
    setHover({ on: true, x: r.width * held[0], y: r.height * held[1] });
  }, [held]);

  const on = held ? {} : {
    onPointerEnter: (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType === 'touch') return;
      const r = e.currentTarget.getBoundingClientRect();
      setHover({ on: true, x: e.clientX - r.left, y: e.clientY - r.top });
    },
    onPointerLeave: (e: PointerEvent<HTMLElement>) => { if (e.pointerType !== 'touch') setHover((h) => ({ ...h, on: false })); },
    onFocus: (e: FocusEvent<HTMLElement>) => {
      if (!(e.target as HTMLElement).matches(':focus-visible')) return;
      const r = e.currentTarget.getBoundingClientRect();
      setHover({ on: true, x: r.width / 2, y: r.height / 3 });
    },
    onBlur: () => setHover((h) => ({ ...h, on: false })),
  };

  const vars = { '--card-w': CARD.width, '--pic': picture, '--strip': CARD.strip, '--radius': CARD.radius, '--grow': look.grow } as CSSProperties;
  const turn = ((look.turn * Math.PI) / 180) * (look.lean === 'toward' ? -1 : 1);
  const plateLook = { reveal: look.reveal === 'push' ? 'fade' as const : look.reveal, push: look.reveal === 'push' ? PUSH : 0 };
  return (
    <article ref={el} className={`${styles.card} ${className ?? ''}`} data-awake={hover.on} data-plate-area="" style={vars} {...on}>
      <div className={styles.turn}>
        <Plate finish="card" kind="card" card={shape} photo={item.picture} look={plateLook} turn={turn} pinned={!!held} hover={hover} tilt={false} className={styles.plate}>
          <span role="img" aria-label={item.picture.alt} />
        </Plate>
        <div className={styles.inner}>
          <div className={styles.picture} />
          <div ref={band} className={styles.strip}>
            <span>{item.kind}</span>
            <span>{item.year}</span>
          </div>
          <div className={styles.words}>
            <h3 className={styles.title}>
              <a href={item.page} className={styles.open}>
                {item.name}
                <span className="visually-hidden">, case study</span>
              </a>
            </h3>
            <p className={styles.line}>{item.line}</p>
            <ul className={styles.tags}>
              {item.tags.map((t) => <li key={t}>{t}</li>)}
            </ul>
            <div className={styles.foot}>
              <ul className={styles.links}>
                {item.links.map((l) => (
                  <li key={l.label}>
                    <a href={l.href} target="_blank" rel="noopener noreferrer">
                      {l.label}
                      <span aria-hidden="true" className={styles.out}>↗</span>
                      <span className="visually-hidden"> of {item.name} (opens in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
              <span className={styles.go} aria-hidden="true">Case study <span className={styles.arrow}>→</span></span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
