'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties, type FocusEvent, type PointerEvent } from 'react';
import type { HoverStyle } from '../metal/finishes';
import { clock } from '../world/clock';
import { Plate } from './Plate';
import styles from './MetalButton.module.css';

interface Props {
  label: string;
  // primary: satin copper with the words cut in. accent: dark bronze with the words in copper.
  variant?: 'primary' | 'accent';
  // What it does under the pointer. Options until Brandon chooses one (BRIEF.md, Open 17).
  hover?: HoverStyle;
  href?: string;
  download?: boolean;
  onClick?: () => void;
  className?: string;
}

// Pull: how far the button follows the pointer (a share of the pointer's distance from its center, up to a limit in
// CSS px), and the spring that carries it. The spring is a little under damped, so the button overshoots as it
// settles and reads as having weight.
const PULL = { share: 0.22, x: 9, y: 5, stiffness: 240, damping: 19 };

function usePull(on: boolean) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!on || !el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const at = { x: 0, y: 0, vx: 0, vy: 0, tx: 0, ty: 0 };
    const move = (e: globalThis.PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const r = el.getBoundingClientRect();
      at.tx = Math.max(-PULL.x, Math.min(PULL.x, (e.clientX - (r.left - at.x + r.width / 2)) * PULL.share));
      at.ty = Math.max(-PULL.y, Math.min(PULL.y, (e.clientY - (r.top - at.y + r.height / 2)) * PULL.share));
    };
    const leave = () => { at.tx = 0; at.ty = 0; };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    const off = clock.onFrame((_t, dt) => {
      if (dt <= 0 || (at.tx === 0 && at.ty === 0 && Math.abs(at.x) + Math.abs(at.y) + Math.abs(at.vx) + Math.abs(at.vy) < 0.01)) return;
      at.vx += ((at.tx - at.x) * PULL.stiffness - at.vx * PULL.damping) * dt;
      at.vy += ((at.ty - at.y) * PULL.stiffness - at.vy * PULL.damping) * dt;
      at.x += at.vx * dt;
      at.y += at.vy * dt;
      // Whole device pixels, so the words stay sharp wherever the button comes to rest.
      const snap = (v: number) => Math.round(v * devicePixelRatio) / devicePixelRatio;
      el.style.setProperty('--pull-x', `${snap(at.x)}px`);
      el.style.setProperty('--pull-y', `${snap(at.y)}px`);
    });
    return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); off(); };
  }, [on]);
  return ref;
}

// A button as a small plate of lit metal. The words are in the metal, and also in the DOM for readers and search.
// Under the pointer, or with keyboard focus, light runs round its cut border from where the pointer came in.
export function MetalButton({ label, variant = 'primary', hover: style = 'run', href, download, onClick, className }: Props) {
  const [hover, setHover] = useState({ on: false, x: 0, y: 0 });
  const pull = usePull(style === 'pull');
  const ref = (el: HTMLElement | null) => { pull.current = el; };
  const on = {
    onPointerEnter: (e: PointerEvent<HTMLElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      setHover({ on: true, x: e.clientX - r.left, y: e.clientY - r.top });
    },
    onPointerLeave: () => setHover((h) => ({ ...h, on: false })),
    onFocus: (e: FocusEvent<HTMLElement>) => {
      if (!e.currentTarget.matches(':focus-visible')) return;
      const r = e.currentTarget.getBoundingClientRect();
      setHover({ on: true, x: style === 'run' ? 0 : r.width / 2, y: r.height / 2 });
    },
    onBlur: () => setHover((h) => ({ ...h, on: false })),
  };
  const shared = { className: `${styles.button} ${className ?? ''}`, style: { '--chars': label.length } as CSSProperties, 'data-variant': variant, 'data-hover': style, ref, ...on };
  const face = (
    <Plate finish={variant === 'primary' ? 'worn' : 'bronze'} kind="control" label={label} className={styles.plate} hover={hover} hoverStyle={style}>
      {label}
    </Plate>
  );
  if (!href) return <button type="button" onClick={onClick} {...shared}>{face}</button>;
  if (/^https?:/.test(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...shared}>
        {face}
        <span className="visually-hidden"> (opens in a new tab)</span>
      </a>
    );
  }
  if (download || /^mailto:/.test(href)) return <a href={href} download={download || undefined} {...shared}>{face}</a>;
  return <Link href={href} {...shared}>{face}</Link>;
}
