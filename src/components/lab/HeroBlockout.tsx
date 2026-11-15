'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { hero } from '../../content/hero';
import type { Blockout } from '../../hero-blockout/scene';
import { HOST, VIEW, WORDS } from '../../hero-blockout/plan';
import { registry } from '../../hooks/registry';
import { lamp } from '../../lamp/lamp';
import { clock } from '../../world/clock';
import { tiers } from '../../world/tier';
import { MetalButton } from '../MetalButton';
import styles from './HeroBlockout.module.css';

// Study 32: the hero's new world as a grey blockout, under his words as the hero lays them out. For its shape, the
// camera and how it sits on the page, before any detail. ?el=16 opens it from that many degrees above, and ?ui=0
// hides the switch.
export function HeroBlockout() {
  const host = useRef<HTMLDivElement>(null), scene = useRef<Blockout | null>(null);
  const [ready, setReady] = useState(false);
  const [ui, setUi] = useState(true);
  const [el, setEl] = useState<number>(VIEW.rest);

  useEffect(() => {
    const h = host.current;
    if (!h) return;
    const q = new URLSearchParams(location.search), asked = Number(q.get('el')), from = VIEW.el.find((v) => v === asked) ?? VIEW.rest;
    if (q.get('ui') === '0') setUi(false);
    setEl(from);
    lamp.bind();
    tiers.detect();
    let alive = true, off: (() => void) | null = null;
    void registry.track(import('../../hero-blockout/scene').then(async ({ mountBlockout }) => {
      const made = await mountBlockout(h, tiers.get(), from);
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
  const vars = {
    '--words-tall': WORDS.tall, '--words-least': WORDS.least, '--words-third': WORDS.third, '--words-rise': WORDS.rise, '--words-gap': WORDS.gap,
    '--host-tall': HOST.tall, '--host-over': HOST.over,
  } as CSSProperties;

  return (
    <main className={styles.page}>
      <div className={styles.head}>
        <p className={styles.label}>Study 32 · The hero’s world, a grey blockout</p>
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
          <li>The second round of the grey blockout. Grey on purpose: it is for the shape, the camera and how it sits under your words.</li>
          <li>Three steps on the scroll. At rest, the city. Then the land: the desert, the parks, the boulevards. Then what happened to the planet.</li>
          <li>Lit as the finished world will be: one low moon from the upper right with real shadows, and the core’s own light in the hollow.</li>
          <li>Not here yet, and not what it is for: materials, lit windows, the look of rock and sand, the night sky, the real stream.</li>
          <li>Nothing moves. What broke away is of four kinds, each placed as it will be: great pieces that still carry land, pieces locked to the core, belts in orbit, and small ones falling away under the core.</li>
          <li>Every building, tree and broken piece is a plain form standing in for the real one.</li>
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
        </div>
      )}
    </main>
  );
}
