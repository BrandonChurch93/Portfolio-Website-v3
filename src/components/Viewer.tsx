'use client';

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import type { Shot } from '../content/projects';
import { projectPage as words } from '../content/site-pages';
import { Framed } from './Framed';
import styles from './Viewer.module.css';

// The pictures and the video of a project, together and up front (BRIEF.md, Open 33): one large thing on a lit
// plate, and beside it a thumbnail of every one, all showing. A video's place is one of them, marked with a play
// sign, never apart from the pictures. A thumbnail switches the large one, the large one opens larger, and the
// arrow keys move through them. rail says where the thumbnails stand: beside the large one, or under it. Beside
// it they stand only where the page has two columns: on one column they are always under it.
// under is what stands under the large one, as wide as it is: a case study's links. It keeps to the viewer's foot,
// so a viewer that is stretched to stand level with something beside it ends on its links.
// How many thumbnails stand in a row under the large one, on a narrow screen and on a wide one: every row holds
// the same number, so a second row is never one thumbnail alone.
const FEW = 6, MANY = 10;
const rows = (n: number, most: number) => Math.ceil(n / Math.ceil(n / most));

// A project's video. It starts by itself when the page opens, without sound and round again, as he asked (Nov 23):
// a browser only lets a video start by itself when it is muted, and React does not set that in time as an
// attribute, so it is set on the element. With reduced motion it waits to be played.
function Film({ src, poster, label }: { src: string; poster: string; label: string }) {
  const film = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = film.current;
    if (!v || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    v.muted = true;
    v.play().catch(() => undefined);
  }, []);
  return <video ref={film} src={src} poster={poster} aria-label={label} controls muted loop playsInline preload="metadata" />;
}

export function Viewer({ shots, aspect, rail = 'side', label, under }: { shots: Shot[]; aspect: number; rail?: 'side' | 'under'; label: string; under?: ReactNode }) {
  const [at, setAt] = useState(0);
  const [large, setLarge] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const now = shots[at], n = shots.length;
  const list = useRef<HTMLUListElement>(null);
  // An arrow key moves to the next one, and takes the keyboard's focus with it when the focus was on a thumbnail.
  const step = (by: number) => {
    const to = (at + by + n) % n, on = list.current?.contains(document.activeElement);
    setAt(to);
    if (on) list.current?.querySelectorAll('button')[to]?.focus();
  };
  const keys = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); step(1); }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); step(-1); }
  };

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (large && !d.open) { d.showModal(); d.focus(); }
    if (!large && d.open) d.close();
  }, [large]);

  const pill = <span className={styles.pill}>{words.standIn}</span>;
  const play = <span className={styles.play} aria-hidden="true" />;
  return (
    <div className={styles.viewer} data-rail={rail} role="group" aria-label={label} style={{ '--few': rows(n, FEW), '--many': rows(n, MANY) } as CSSProperties}>
      <div className={styles.stage}>
        <Framed aspect={aspect}>
          <div className={styles.window}>
            {now.slot === 'video' && now.video
              ? <Film key={now.video} src={now.video} poster={now.src} label={now.alt} />
              : (
                <button type="button" className={styles.open} onClick={() => setLarge(true)} onKeyDown={keys} aria-label={`${words.open}: ${now.alt}`}>
                  <img key={`${now.src}-${at}`} src={now.src} alt={now.alt} decoding="async" />
                  {now.slot === 'video' && play}
                </button>
              )}
          </div>
        </Framed>
      </div>
      <p className={styles.caption}>
        <span className={styles.count}>{at + 1} / {n}</span>
        {now.standIn && pill}
        <span>{now.caption}</span>
      </p>
      <ul ref={list} className={styles.thumbs} onKeyDown={keys}>
        {shots.map((s, i) => (
          <li key={`${s.src}-${i}`}>
            <button type="button" className={styles.thumb} aria-pressed={i === at} aria-label={`${s.slot === 'video' ? words.video : words.picture} ${i + 1}: ${s.caption}`} onClick={() => setAt(i)}>
              <img src={s.src} alt="" decoding="async" />
              {s.slot === 'video' && play}
            </button>
          </li>
        ))}
      </ul>
      {under && <div className={styles.under}>{under}</div>}

      <dialog ref={dialog} tabIndex={-1} className={styles.large} aria-label={label} onClose={() => setLarge(false)} onClick={(e) => { if (e.target === dialog.current) setLarge(false); }} onKeyDown={keys}>
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
