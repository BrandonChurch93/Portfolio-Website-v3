'use client';

import { useEffect, useRef, useState, type CSSProperties, type FocusEvent, type PointerEvent } from 'react';
import type { WorkItem } from '../content/work';
import { CARD, cardPicture, type CardLayout } from '../metal/mask';
import type { PlateTone } from '../metal/renderer';
import { Plate } from './Plate';
import styles from './WorkCard.module.css';

// The picture's window is twice as wide as it is tall: most of the screenshots are wide, and a lower window keeps the
// card, and the section, shorter.
export const PICTURE_ASPECT = 2;

interface Props {
  item: WorkItem;
  layout?: CardLayout;
  tone?: PlateTone;
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

// A project card. Its plate is lit metal round a dark face and a picture, and its words are in the page over it.
// At rest the picture is shown in the site's metals. Under the pointer, with keyboard focus, or nearest the middle of
// a touch screen, its own colors come back, the bead and the frame catch the light, and the card grows a little.
export function WorkCard({ item, layout = 'set', tone = 'toned', held, className }: Props) {
  const el = useRef<HTMLElement>(null);
  const [hover, setHover] = useState({ on: false, x: 0, y: 0 });
  const band = useRef<HTMLDivElement>(null);
  const [stripH, setStripH] = useState(0);
  const shape = { layout, aspect: PICTURE_ASPECT, stripH: stripH || undefined };
  const picture = cardPicture(shape);
  const strip = CARD.layouts[layout].strip;

  // The plate draws the band where the page laid it out: on a narrow card its words wrap and it grows.
  useEffect(() => {
    const b = band.current;
    if (!b) return;
    const read = () => {
      const design = (b.parentElement!.offsetWidth / CARD.width) * strip;
      setStripH(b.offsetHeight > design + 1 ? Math.round(b.offsetHeight * 2) / 2 : 0);
    };
    read();
    const ro = new ResizeObserver(read);
    ro.observe(b);
    return () => ro.disconnect();
  }, [strip]);

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

  const vars = { '--card-w': CARD.width, '--pic': picture, '--strip': strip, '--radius': CARD.radius } as CSSProperties;
  const meta = (
    <p className={styles.meta}>
      <span>{item.kind}</span>
      <span aria-hidden="true">·</span>
      <span>{item.year}</span>
    </p>
  );
  const links = (
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
  );
  return (
    <article ref={el} className={`${styles.card} ${className ?? ''}`} data-layout={layout} data-awake={hover.on} data-plate-area="" style={vars} {...on}>
      <Plate finish="card" kind="card" card={shape} tone={tone} photo={{ src: item.picture.src, focus: item.picture.focus, zoom: item.picture.zoom }} hover={hover} tilt={false} className={styles.plate}>
        <span role="img" aria-label={item.picture.alt} />
      </Plate>
      <div className={styles.inner}>
        <div className={styles.picture} />
        {strip ? <div ref={band} className={styles.strip}>{meta}{links}</div> : null}
        <div className={styles.words}>
          {strip ? null : meta}
          <h3 className={styles.title}>
            <a href={item.page} className={styles.open}>{item.name}</a>
            {strip ? <span className={`${styles.go} ${styles.arrow}`} aria-hidden="true">→</span> : null}
          </h3>
          <p className={styles.line}>{item.line}</p>
          <ul className={styles.tags}>
            {item.tags.map((t) => <li key={t}>{t}</li>)}
          </ul>
          {strip ? null : (
            <div className={styles.foot}>
              {links}
              <span className={styles.go} aria-hidden="true">View project <span className={styles.arrow}>→</span></span>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
