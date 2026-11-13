'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { Finish } from '../metal/finishes';
import type { CardShape, PlateKind } from '../metal/mask';
import { plates, type PlateLook, type PlatePhoto } from '../metal/renderer';
import styles from './Plate.module.css';

export interface PlateProps {
  finish: Finish;
  kind?: PlateKind;
  label?: string;
  big?: string;
  facts?: string;
  photo?: PlatePhoto;
  // A project card: its shape, how its picture's colors come back, and how far it turns under the pointer, in
  // radians at its edge. A turn below zero leans toward the pointer and not away from it.
  card?: CardShape;
  look?: PlateLook;
  turn?: number;
  // Held as it is under the pointer, for a still: the card is held turned as well.
  pinned?: boolean;
  className?: string;
  style?: CSSProperties;
  tilt?: boolean;
  // The pointer is on the plate, or it has focus. x and y are where it is, CSS px from the plate's top left.
  hover?: { on: boolean; x: number; y: number };
  // What screen readers and search read. Defaults to the plate's words. The words are always in the DOM.
  children?: ReactNode;
}

const MAX_TILT = 0.06;
// A button leans in its light only (src/metal/renderer.ts), so its words stay sharp under the pointer.
const MAX_TILT_CONTROL = 0.05;

// A lit metal plate. Its words are painted into the metal and also kept in the DOM.
export function Plate({ finish, kind = 'plate', label, big, facts, photo, card, look, turn = 0, pinned, className, style, tilt = true, hover, children }: PlateProps) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading');
  const photoKey = photo ? `${photo.src}|${photo.video ? 'v' : 'i'}|${photo.loop ?? ''}|${photo.focus?.join() ?? ''}|${photo.zoom ?? ''}` : '';

  useEffect(() => {
    const h = host.current;
    const c = canvas.current;
    if (!h || !c) return;
    const off = plates.add({
      host: h,
      canvas: c,
      spec: { finish, kind, label, big, facts, window: !!photo, card },
      photo,
      look,
      onState: (s) => setState(s),
    });
    return off;
    // The spec is fixed for a plate's life; a new photo or new words make a new plate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finish, kind, label, big, facts, photoKey, card?.aspect, card?.stripH, card?.edge, look?.reveal, look?.push]);

  useEffect(() => {
    const h = host.current;
    if (!h || !tilt) return;
    const move = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const r = h.getBoundingClientRect();
      plates.setPointer(h, e.clientX - r.left, e.clientY - r.top);
      const max = kind === 'control' ? MAX_TILT_CONTROL : MAX_TILT;
      plates.setTilt(h, -((e.clientY - r.top) / r.height - 0.5) * max, ((e.clientX - r.left) / r.width - 0.5) * max * 1.2);
    };
    const leave = () => plates.setTilt(h, 0, 0);
    h.addEventListener('pointermove', move);
    h.addEventListener('pointerleave', leave);
    return () => { h.removeEventListener('pointermove', move); h.removeEventListener('pointerleave', leave); };
  }, [tilt, kind]);

  // A card's words lie over its plate, so the pointer is followed on whatever the card marks as its area. The area
  // itself stays still while the card turns inside it, so the card never turns out from under the pointer.
  useEffect(() => {
    const h = host.current;
    if (!h || kind !== 'card') return;
    const area = h.closest<HTMLElement>('[data-plate-area]') ?? h;
    const move = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const r = area.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      plates.setPointer(h, x, y);
      if (turn) plates.setTilt(h, -(y / r.height - 0.5) * 2 * turn, (x / r.width - 0.5) * 2 * turn);
    };
    const leave = () => plates.setTilt(h, 0, 0);
    area.addEventListener('pointermove', move);
    area.addEventListener('pointerleave', leave);
    return () => { area.removeEventListener('pointermove', move); area.removeEventListener('pointerleave', leave); plates.setTilt(h, 0, 0); };
  }, [kind, turn]);

  useEffect(() => {
    const h = host.current;
    if (!h || kind !== 'card' || !turn || !pinned || !hover?.on || state !== 'ready') return;
    const r = (h.closest<HTMLElement>('[data-plate-area]') ?? h).getBoundingClientRect();
    plates.setTilt(h, -(hover.y / r.height - 0.5) * 2 * turn, (hover.x / r.width - 0.5) * 2 * turn);
  }, [kind, turn, pinned, hover?.on, hover?.x, hover?.y, state]);

  useEffect(() => {
    if (host.current) plates.setHover(host.current, !!hover?.on, hover?.x, hover?.y);
  }, [hover?.on, hover?.x, hover?.y, state]);

  return (
    <div ref={host} className={`${styles.plate} ${className ?? ''}`} style={style} data-kind={kind} data-finish={finish} data-state={state}>
      <div className={styles.shadow} data-plate-shadow="" aria-hidden="true" />
      <canvas ref={canvas} className={styles.canvas} aria-hidden="true" />
      <div className={state === 'failed' ? styles.plain : 'visually-hidden'} data-plate-text="">
        {children ?? (
          <>
            {label ? <span className={styles.plainLabel}>{label}</span> : null}
            {big ? <span className={styles.plainBig}>{big}</span> : null}
            {facts ? <span className={styles.plainFacts}>{facts}</span> : null}
          </>
        )}
      </div>
    </div>
  );
}
