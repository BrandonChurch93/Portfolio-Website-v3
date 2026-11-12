'use client';

import Link from 'next/link';
import { useState, type CSSProperties, type FocusEvent, type PointerEvent } from 'react';
import { Plate } from './Plate';
import styles from './MetalButton.module.css';

interface Props {
  label: string;
  // primary: polished copper under a clear coat, with the words cut in. accent: dark bronze with the words in copper.
  variant?: 'primary' | 'accent';
  href?: string;
  download?: boolean;
  onClick?: () => void;
  className?: string;
}

// A button as a small plate of lit metal. The words are in the metal, and also in the DOM for readers and search.
// Under the pointer, or with keyboard focus, its cut border, edges and words catch the light where the pointer is near,
// and it grows a little.
export function MetalButton({ label, variant = 'primary', href, download, onClick, className }: Props) {
  const [hover, setHover] = useState({ on: false, x: 0, y: 0 });
  const on = {
    onPointerEnter: (e: PointerEvent<HTMLElement>) => {
      const r = e.currentTarget.getBoundingClientRect();
      setHover({ on: true, x: e.clientX - r.left, y: e.clientY - r.top });
    },
    onPointerLeave: () => setHover((h) => ({ ...h, on: false })),
    onFocus: (e: FocusEvent<HTMLElement>) => {
      if (!e.currentTarget.matches(':focus-visible')) return;
      const r = e.currentTarget.getBoundingClientRect();
      setHover({ on: true, x: r.width / 2, y: r.height / 2 });
    },
    onBlur: () => setHover((h) => ({ ...h, on: false })),
  };
  const shared = { className: `${styles.button} ${className ?? ''}`, style: { '--chars': label.length } as CSSProperties, 'data-variant': variant, ...on };
  const face = (
    <Plate finish={variant === 'primary' ? 'coated' : 'bronze'} kind="control" label={label} className={styles.plate} hover={hover}>
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
