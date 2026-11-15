'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { hero } from '../../content/hero';
import type { Blockout, Close } from '../../hero-blockout/scene';
import { HOST, VIEW, WORDS } from '../../hero-blockout/plan';
import { registry } from '../../hooks/registry';
import { lamp } from '../../lamp/lamp';
import { clock } from '../../world/clock';
import { tiers } from '../../world/tier';
import { MetalButton } from '../MetalButton';
import styles from './HeroBlockout.module.css';

// Study 32: the hero's new world, under his words as the hero lays them out, in its third round: in color. For
// the look of the top and of the torn rock, which he signs off before anything goes to Claude Code. ?el=16 opens
// it from that many degrees above, ?close=city, land or rock opens it close on that part, and ?ui=0 hides the
// switches.
const CLOSES: readonly [Close, string][] = [['whole', 'The whole'], ['city', 'The city'], ['land', 'The land'], ['rock', 'The rock']];
export function HeroBlockout() {
  const host = useRef<HTMLDivElement>(null), scene = useRef<Blockout | null>(null);
  const [ready, setReady] = useState(false);
  const [ui, setUi] = useState(true);
  const [el, setEl] = useState<number>(VIEW.rest);
  const [near, setNear] = useState<Close>('whole');

  useEffect(() => {
    const h = host.current;
    if (!h) return;
    const q = new URLSearchParams(location.search), asked = Number(q.get('el')), from = VIEW.el.find((v) => v === asked) ?? VIEW.rest;
    const close = CLOSES.find(([k]) => k === q.get('close'))?.[0] ?? 'whole';
    if (q.get('ui') === '0') setUi(false);
    setEl(from);
    setNear(close);
    lamp.bind();
    tiers.detect();
    let alive = true, off: (() => void) | null = null;
    void registry.track(import('../../hero-blockout/scene').then(async ({ mountBlockout }) => {
      const made = await mountBlockout(h, tiers.get(), from, close);
      if (!alive) { made.dispose(); return; }
      scene.current = made;
      off = clock.onFrame(() => {
        const r = h.getBoundingClientRect(), m = lamp.get();
        made.lamp((m.px - r.left) / Math.max(1, r.width), (m.py - r.top) / Math.max(1, r.height));
      });
      setReady(true);
    }).catch((e: unknown) => console.error('The blockout was not built', e)));
    return () => { alive = false; off?.(); scene.current?.dispose(); scene.current = null; };
  }, []);

  const look = (v: number) => { setEl(v); scene.current?.view(v); };
  const go = (k: Close) => { setNear(k); scene.current?.close(k); };
  const vars = {
    '--words-tall': WORDS.tall, '--words-least': WORDS.least, '--words-third': WORDS.third, '--words-rise': WORDS.rise, '--words-gap': WORDS.gap,
    '--host-tall': HOST.tall, '--host-over': HOST.over,
  } as CSSProperties;

  return (
    <main className={styles.page}>
      <div className={styles.head}>
        <p className={styles.label}>Study 32 · The hero’s world, in color</p>
      </div>
      <div className={styles.board} style={vars}>
        <div className={styles.glow} aria-hidden="true" />
        <div ref={host} className={styles.host} data-ready={ready} />
        {!ready && <p className={styles.wait}>Building the world</p>}
        <header className={styles.words} style={{ width: `calc(var(--u) * ${WORDS.w})` }}>
          <p className={styles.role}>{hero.role}</p>
          <h1 className={styles.name}>{hero.name}</h1>
          <p className={styles.lead}>{hero.lead}</p>
          <div className={styles.buttons}>
            <MetalButton label={hero.work.label} href="#" className={styles.button} />
            <MetalButton label={hero.contact.label} variant="accent" href="#" className={styles.button} />
          </div>
        </header>
      </div>
      <section className={styles.notes}>
        <h2 className={styles.notesHead}>What this is</h2>
        <ul>
          <li>The third round: your six changes to the top, and the same model in color. For the look, which you sign off before anything goes to Claude Code.</li>
          <li>Three steps on the scroll. At rest, the city. Then the land. Then what happened to the planet.</li>
          <li>The switch at the foot of the screen looks closely at the city, the land or the rock. Scroll to the top of the picture after pressing it.</li>
          <li>Lit by one low moon from the upper right with real shadows, and by the core’s own light in the hollow.</li>
          <li>Nothing moves. Not here: the night sky, the real stream, the real core.</li>
        </ul>
      </section>
      {ui && (
        <div className={styles.panel}>
          <div className={styles.group} role="group" aria-label="How far above it is seen from">
            <span className={styles.groupName}>Seen from above by</span>
            {VIEW.el.map((v) => (
              <button key={v} type="button" className={styles.choice} aria-pressed={el === v} onClick={() => look(v)}>{v}°</button>
            ))}
          </div>
          <div className={styles.group} role="group" aria-label="What is looked at">
            <span className={styles.groupName}>Look at</span>
            {CLOSES.map(([k, name]) => (
              <button key={k} type="button" className={styles.choice} aria-pressed={near === k} onClick={() => go(k)}>{name}</button>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
