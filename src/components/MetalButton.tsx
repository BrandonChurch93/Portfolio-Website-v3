'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import { Plate } from './Plate';
import styles from './MetalButton.module.css';

interface Props {
  label: string;
  // primary: bright copper with the words cut in. accent: dark bronze with the words in copper.
  variant?: 'primary' | 'accent';
  href?: string;
  download?: boolean;
  onClick?: () => void;
  className?: string;
}

// A button as a small plate of lit metal. The words are in the metal, and also in the DOM for readers and search.
export function MetalButton({ label, variant = 'primary', href, download, onClick, className }: Props) {
  const cls = `${styles.button} ${className ?? ''}`;
  const style = { '--chars': label.length } as CSSProperties;
  const face = (
    <Plate finish={variant === 'primary' ? 'polished' : 'bronze'} kind="control" label={label} className={styles.plate}>
      {label}
    </Plate>
  );
  if (!href) return <button type="button" className={cls} style={style} data-variant={variant} onClick={onClick}>{face}</button>;
  if (/^https?:/.test(href)) {
    return (
      <a href={href} className={cls} style={style} data-variant={variant} target="_blank" rel="noopener noreferrer">
        {face}
        <span className="visually-hidden"> (opens in a new tab)</span>
      </a>
    );
  }
  if (download || /^mailto:/.test(href)) return <a href={href} className={cls} style={style} data-variant={variant} download={download || undefined}>{face}</a>;
  return <Link href={href} className={cls} style={style} data-variant={variant}>{face}</Link>;
}
