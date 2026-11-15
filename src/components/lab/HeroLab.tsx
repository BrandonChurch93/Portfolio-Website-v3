'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { hero } from '../../content/hero';
import { BOARD, CITY, GLOW, HIDE, WORDS, WORK } from '../../hero/board';
import type { HeroStage } from '../../hero/stage';
import { HOST } from '../../pieces/skycity/layout';
import { MetalButton } from '../MetalButton';
import { PieceView } from '../PieceView';
import { Shell } from './Shell';
import styles from './HeroLab.module.css';

const u = (n: number) => `calc(var(--u) * ${Number(n.toFixed(2))})`;

// The hero, built for real (BRIEF.md, Settled, "The hero, the city at rest"). The page only lays things out: his
// words a third of the way down the screen, the city full width along the bottom with the rim of its ground under
// the foot of the screen, and Work's bar under it, which on this page is a stand in. The city is the piece in
// src/pieces/skycity, at whatever stage its parts have reached. The stream plans its route from where these are
// (src/stream/route-hero.ts): from the city's main fall, down the front of its rock, to the bar.
// There is no opening: the city and the words are simply there. The glow behind the city is a plain one until the
// sky is in, which draws it. ?ui=0 hides the label.
export function HeroLab() {
  const page = useRef<HTMLElement>(null), board = useRef<HTMLDivElement>(null), city = useRef<HTMLDivElement>(null), bar = useRef<HTMLDivElement>(null), cue = useRef<HTMLParagraphElement>(null);
  const [ui, setUi] = useState(true);
  // Whether the screen is wide enough for the layout. Narrower, the page is a plain stand in with no stream and no city.
  const [wide, setWide] = useState<boolean | null>(null);

  useEffect(() => {
    setUi(new URLSearchParams(location.search).get('ui') !== '0');
    const fits = matchMedia(`(min-width: ${BOARD.least}px)`), read = () => setWide(fits.matches);
    read();
    fits.addEventListener('change', read);
    return () => fits.removeEventListener('change', read);
  }, []);

  useEffect(() => {
    if (!wide || !page.current || !board.current || !city.current || !bar.current) return;
    let made: HeroStage | null = null, gone = false;
    void import('../../hero/stage').then(({ mountHero }) => {
      if (gone) return;
      made = mountHero({ page: page.current!, board: board.current!, city: city.current!, bar: bar.current!, cue: cue.current });
    });
    return () => { gone = true; made?.dispose(); };
  }, [wide]);

  const vars = {
    '--words-tall': WORDS.tall, '--words-least': WORDS.least, '--words-third': WORDS.third, '--words-rise': WORDS.rise, '--words-gap': WORDS.gap,
    '--hide': HIDE, '--city-tall': CITY.tall, '--city-over': CITY.over, '--city-under': CITY.under, '--city-keel': CITY.keel, '--work-under': WORK.under, '--work-tail': WORK.tail,
    '--glow-rx': GLOW.rx, '--glow-ry': GLOW.ry, '--glow-lift': GLOW.lift,
  } as CSSProperties;

  return (
    <Shell ref={page} className={styles.page}>
      {ui && (
        <div className={styles.head}>
          <p className={styles.label}>Study 30 · The hero</p>
        </div>
      )}
      <div ref={board} className={styles.board} style={vars}>
        <div className={styles.glow} aria-hidden="true" />
        <div ref={city} className={styles.city} style={{ width: u(HOST.wide) }}>
          {wide && <PieceView name="skycity" className={styles.piece} />}
        </div>
        <header className={styles.words} style={{ width: u(WORDS.w) }}>
          <p className={styles.role}>{hero.role}</p>
          <h1 className={styles.name}>{hero.name}</h1>
          <p className={styles.lead}>{hero.lead}</p>
          <div className={styles.buttons}>
            <MetalButton label={hero.work.label} href={hero.work.href} className={styles.button} />
            <MetalButton label={hero.contact.label} variant="accent" href={hero.contact.href} className={styles.button} />
          </div>
        </header>
        <p ref={cue} className={styles.cue} aria-hidden="true">{hero.cue}</p>
        <div ref={bar} id="work" className={styles.bar} style={{ width: u(WORK.bar) }} aria-hidden="true">
          <span>Work begins here</span>
        </div>
      </div>
    </Shell>
  );
}
