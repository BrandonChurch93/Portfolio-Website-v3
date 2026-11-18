'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { Shot } from '../content/projects';
import { projectPage as words } from '../content/site-pages';
import { Plate } from './Plate';
import styles from './Viewer.module.css';

// The pictures and the video of a project, together and up front (BRIEF.md, Open 33): one large thing on a lit
// plate, and beside it a thumbnail of every one, all showing. A video's place is one of them, marked with a play
// sign, never apart from the pictures. A thumbnail switches the large one, the large one opens larger, and the
// arrow keys move through them. rail says where the thumbnails stand: beside the large one, or under it.
// under is what stands directly under the large one, as wide as it is: a case study's links.
export function Viewer({ shots, aspect, rail = 'side', label, under }: { shots: Shot[]; aspect: number; rail?: 'side' | 'under'; label: string; under?: ReactNode }) {
  const [at, setAt] = useState(0);
  const [large, setLarge] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const now = shots[at], n = shots.length;
  const step = (by: number) => setAt((i) => (i + by + n) % n);
  const keys = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); step(1); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); step(-1); }
  };

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (large && !d.open) d.showModal();
    if (!large && d.open) d.close();
  }, [large]);

  const pill = <span className={styles.pill}>{words.standIn}</span>;
  const play = <span className={styles.play} aria-hidden="true" />;
  return (
    <div className={styles.viewer} data-rail={rail} role="group" aria-label={label}>
      <ul className={styles.thumbs} onKeyDown={keys}>
        {shots.map((s, i) => (
          <li key={`${s.src}-${i}`}>
            <button type="button" className={styles.thumb} aria-pressed={i === at} aria-label={`${s.slot === 'video' ? words.video : words.picture} ${i + 1}: ${s.caption}`} onClick={() => setAt(i)}>
              <img src={s.src} alt="" decoding="async" />
              {s.slot === 'video' && play}
            </button>
          </li>
        ))}
      </ul>
      <figure className={styles.stage}>
        <div className={styles.frame} style={{ aspectRatio: String(aspect) }} data-stands="">
          <Plate finish="card" kind="card" card={{ aspect, edge: 'deep', plain: true }} tilt={false} className={styles.metal} />
          <div className={styles.window}>
            {now.slot === 'video' && now.video
              ? <video key={now.video} src={now.video} poster={now.src} controls playsInline preload="metadata" />
              : (
                <button type="button" className={styles.open} onClick={() => setLarge(true)} onKeyDown={keys} aria-label={`${words.open}: ${now.alt}`}>
                  <img key={`${now.src}-${at}`} src={now.src} alt={now.alt} decoding="async" />
                  {now.slot === 'video' && play}
                </button>
              )}
          </div>
        </div>
        <figcaption className={styles.caption}>
          <span className={styles.count}>{at + 1} / {n}</span>
          {now.standIn && pill}
          <span>{now.caption}</span>
        </figcaption>
        {under}
      </figure>

      <dialog ref={dialog} className={styles.large} onClose={() => setLarge(false)} onClick={(e) => { if (e.target === dialog.current) setLarge(false); }} onKeyDown={keys}>
        {large && (
          <>
            <img src={now.src} alt={now.alt} />
            <div className={styles.bar}>
              <button type="button" onClick={() => step(-1)} aria-label={words.prev}>←</button>
              <span>{at + 1} / {n}</span>
              <button type="button" onClick={() => step(1)} aria-label={words.next}>→</button>
              <button type="button" onClick={() => setLarge(false)}>{words.close}</button>
            </div>
          </>
        )}
      </dialog>
    </div>
  );
}
