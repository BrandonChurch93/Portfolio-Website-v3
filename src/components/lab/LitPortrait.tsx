'use client';

import { useEffect, useRef } from 'react';
import { lamp } from '../../lamp/lamp';
import styles from './Palette.module.css';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// The portrait cut out of its photograph, with the page drawing the light behind him. The light leans toward the lamp.
export function LitPortrait() {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let r = el.getBoundingClientRect();
    const place = () => { r = el.getBoundingClientRect(); };
    addEventListener('scroll', place, { passive: true });
    addEventListener('resize', place);
    const off = lamp.subscribe((s) => {
      const x = (s.px - r.left) / Math.max(1, r.width);
      const y = (s.py - r.top) / Math.max(1, r.height);
      el.style.setProperty('--gx', `${(50 + clamp(x - 0.5, -1.2, 1.2) * 6).toFixed(2)}%`);
      el.style.setProperty('--gy', `${(47 + clamp(y - 0.45, -1.2, 1.2) * 4).toFixed(2)}%`);
    });
    return () => {
      off();
      removeEventListener('scroll', place);
      removeEventListener('resize', place);
    };
  }, []);
  return (
    <div ref={box} className={styles.lit}>
      <div className={styles.glow} aria-hidden="true" />
      <img
        src="/media/portrait-cut-1600.webp"
        srcSet="/media/portrait-cut-960.webp 960w, /media/portrait-cut-1600.webp 1600w"
        sizes="(max-width: 900px) 100vw, 44vw"
        width={1600}
        height={1552}
        alt="Brandon Church, cut out of his portrait, with the page’s own light behind him."
      />
    </div>
  );
}
