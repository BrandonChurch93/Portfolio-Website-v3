'use client';

import { useEffect, useRef, useState, type CSSProperties, type FocusEvent, type PointerEvent } from 'react';
import { PHONE_SIDE } from '../config/site';
import type { WorkItem } from '../content/work';
import { CARD, cardPicture, type CardEdge } from '../metal/mask';
import { Plate } from './Plate';
import styles from './WorkCard.module.css';

// The picture's window is twice as wide as it is tall: most of the screenshots are wide, and a lower window keeps the
// card, and the section, shorter.
export const PICTURE_ASPECT = 2;

// The choices the card was tried with at /lab/work-cards. CARD_LOOK is what Brandon picked.
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
export const CARD_LOOK: CardLook = { reveal: 'fade', turn: 3, lean: 'away', grow: 0.015, edge: 'deep' };
const PUSH = 0.045;

interface Props {
  item: WorkItem;
  look?: CardLook;
  // Hold the card as it is under the pointer, with the pointer at this point of the card, 0 to 1. For stills.
  held?: [number, number];
  className?: string;
}

// Where the pointer last was, and how many times it has moved. A page scrolled under a pointer at rest brings a card
// under it without the pointer moving at all, and that pointer was not put on the card: it does not wake a sleeping one.
const pointer = { x: NaN, y: NaN, moves: 0 };
let tracking = false;
function trackPointer(): void {
  if (tracking || typeof window === 'undefined') return;
  tracking = true;
  addEventListener('pointermove', (e) => {
    if (e.clientX === pointer.x && e.clientY === pointer.y) return;
    pointer.x = e.clientX; pointer.y = e.clientY; pointer.moves++;
  }, { capture: true, passive: true });
}

// What a finger does to the cards. at is where it tapped, in the window.
// On a phone, where nothing hovers, the cards nearest the middle of the screen are the ones that are awake.
// On anything larger no card wakes by itself: he ruled that a card there has to be tapped, or hovered by a mouse or
// a pencil. A finger wakes a card by tapping it, and the tap that wakes it does not open it. A tap on a card that
// is awake opens it, and a tap anywhere else lets it go back to rest. A finger that scrolls the page wakes nothing:
// a touch that turns into a scroll is called off, and never ends as a tap.
const touchCards = new Map<HTMLElement, (on: boolean, at?: [number, number]) => void>();
let watching = false;
function watchTouch(): void {
  if (watching || typeof window === 'undefined') return;
  watching = true;
  if (!matchMedia('(hover: none)').matches || Math.min(screen.width, screen.height) >= PHONE_SIDE) {
    // The card whose next click only wakes it.
    let waking: HTMLElement | null = null;
    addEventListener('pointerdown', () => { waking = null; }, { capture: true, passive: true });
    addEventListener('pointerup', (e) => {
      if (e.pointerType !== 'touch') return;
      const on = e.target as Node | null;
      let card: HTMLElement | null = null;
      for (const el of touchCards.keys()) if (on && el.contains(on)) card = el;
      waking = card && card.dataset.awake !== 'true' ? card : null;
      for (const [el, set] of touchCards) if (el !== card) set(false);
      if (waking) touchCards.get(waking)!(true, [e.clientX, e.clientY]);
    }, { capture: true, passive: true });
    addEventListener('click', (e) => {
      const card = waking;
      waking = null;
      if (card && card.contains(e.target as Node)) { e.preventDefault(); e.stopPropagation(); }
    }, { capture: true });
    return;
  }
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

// A link's first word, which is all of it a narrow card has room for when its foot holds several links (`.rest` in
// the stylesheet).
const first = (label: string) => label.split(' ')[0];

// A link after the first whose name is several words (How it’s made, on a project that also plays or runs). Its
// first word alone would not say where the click goes, so a narrow card leaves it to the project's page (`.extra`).
const extra = (label: string, i: number) => i > 0 && first(label) !== label;

// A project card. Its plate is lit metal round a dark face and a picture, with a band of bronze that carries its
// facts, and its words are in the page over it.
// At rest the picture is shown in the site's metals. Under the pointer, with keyboard focus, tapped by a finger, or
// nearest the middle of a phone's screen, its own colors come back and its loop plays, the bead and the rail catch
// the light, and the card grows a little.
// It also turns in depth with the pointer, words and all, and the light on its metal turns with it.
// The whole card opens the case study, and says so at its foot. The links at its foot (View it live, Evals, Code and
// the like) go elsewhere: with the pointer on one of them the case study's words go quiet and that link lights, so
// it is always plain where a click leads.
export function WorkCard({ item, look = CARD_LOOK, held, className }: Props) {
  const el = useRef<HTMLElement>(null);
  const band = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState({ on: false, x: 0, y: 0, meant: true });
  // How many times the pointer had moved when it came onto the card without moving, or -1 once it was put there.
  const came = useRef(-1);
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
    touchCards.set(card, (on, at) => {
      const r = card.getBoundingClientRect();
      // A tap puts the finger on the card, as a pointer is put on it. The middle of a phone's screen puts nothing there.
      setHover((h) => (h.on === on ? h : at ? { on, x: at[0] - r.left, y: at[1] - r.top, meant: true } : { on, x: r.width / 2, y: (r.width / CARD.width) * picture * 0.5, meant: false }));
    });
    watchTouch();
    trackPointer();
    return () => { touchCards.delete(card); };
  }, [held, picture]);

  useEffect(() => {
    const card = el.current;
    if (!card || !held) return;
    const r = card.getBoundingClientRect();
    setHover({ on: true, x: r.width * held[0], y: r.height * held[1], meant: true });
  }, [held]);

  const on = held ? {} : {
    onPointerEnter: (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType === 'touch') return;
      const r = e.currentTarget.getBoundingClientRect();
      // The pointer is told of here before its own move is: put on the card, it is not where it last was.
      const meant = !Number.isNaN(pointer.x) && (e.clientX !== pointer.x || e.clientY !== pointer.y);
      came.current = meant ? -1 : pointer.moves;
      setHover({ on: true, x: e.clientX - r.left, y: e.clientY - r.top, meant });
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      if (came.current < 0 || came.current === pointer.moves || e.pointerType === 'touch') return;
      came.current = -1;
      const r = e.currentTarget.getBoundingClientRect();
      setHover((h) => (h.on ? { on: true, x: e.clientX - r.left, y: e.clientY - r.top, meant: true } : h));
    },
    onPointerLeave: (e: PointerEvent<HTMLElement>) => { if (e.pointerType !== 'touch') setHover((h) => ({ ...h, on: false })); },
    onFocus: (e: FocusEvent<HTMLElement>) => {
      if (!(e.target as HTMLElement).matches(':focus-visible')) return;
      const r = e.currentTarget.getBoundingClientRect();
      setHover({ on: true, x: r.width / 2, y: r.height / 3, meant: true });
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
            <div className={styles.say}>
              <h3 className={styles.title}>
                {item.page ? (
                  <a href={item.page} className={styles.open}>
                    {item.name}
                    <span className="visually-hidden">, case study</span>
                  </a>
                ) : item.name}
              </h3>
              <p className={styles.line}>{item.line}</p>
            </div>
            <ul className={styles.tags}>
              {item.tags.map((t) => <li key={t}>{t}</li>)}
            </ul>
            <div className={styles.foot}>
              <ul className={styles.links}>
                {item.links.map((l, i) => (
                  <li key={l.label} className={extra(l.label, i) ? styles.extra : undefined}>
                    <a href={l.href} target="_blank" rel="noopener noreferrer">
                      <span>{first(l.label)}{first(l.label) !== l.label && <span className={styles.rest}>{l.label.slice(first(l.label).length)}</span>}</span>
                      <span aria-hidden="true" className={styles.out}>↗</span>
                      <span className="visually-hidden">, {item.name} (opens in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
              {item.page && <span className={styles.go} aria-hidden="true">Case study <span className={styles.arrow}>→</span></span>}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
