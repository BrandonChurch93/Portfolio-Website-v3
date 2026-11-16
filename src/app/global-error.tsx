'use client';

import type { CSSProperties } from 'react';
import '../styles/tokens.css';
import '../styles/global.css';
import { paletteVars } from '../config/palette';
import { pages } from '../content/site-pages';
import styles from './plain.module.css';

// The layout itself broke, so this page brings its own: the palette, the tokens and the global styles, and nothing
// else of the site.
export default function GlobalBroken({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const p = pages.broken;
  return (
    <html lang="en" style={paletteVars as CSSProperties}>
      <body>
        <main className={styles.main}>
          <p className={styles.label}>{p.label}</p>
          <h1 className={styles.title}>{p.title}</h1>
          <p className={styles.note}>{p.note}</p>
          <div className={styles.links}>
            <button type="button" className={styles.link} onClick={reset}>{p.again}</button>
            <a href="/" className={styles.link}>{p.home} →</a>
          </div>
        </main>
      </body>
    </html>
  );
}
