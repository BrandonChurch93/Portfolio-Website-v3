'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { hero } from '../../content/hero';
import { BOARD, CITY, CX, SKY, WORDS, WORK, WORLD } from '../../hero/board';
import type { HeroStage } from '../../hero/stage';
import { HOST } from '../../pieces/world/layout';
import { LOADING } from '../../pieces/world/part';
import { loading } from '../../world/loading';
import { MetalButton } from '../MetalButton';
import { PieceView } from '../PieceView';
import { Preloader } from '../Preloader';
import type { Hub } from '../../whole/hub';
import { Shell } from './Shell';
import styles from './HeroLab.module.css';

const u = (n: number) => `calc(var(--u) * ${Number(n.toFixed(2))})`;


// The hero, built for real (BRIEF.md, Settled, "The hero, the city at rest"). The page only lays things out: his
// words a third of the way down the screen, and under them the world on the center line: at rest the spire and
// the crown of the dome, with its torn edge, its core and what broke away under the foot of the screen. Work's bar
// is under all of it, and on this page is a stand in. The world is the piece in src/pieces/world, at whatever
// stage its parts have reached. The stream plans its route from where these are (src/stream/route-hero.ts): out
// of the core's underside and down to the bar.
// There is no opening: the world and the words are simply there. The night sky (src/hero/sky) is behind
// everything, and draws the glow behind the world. ?ui=0 hides the label.
// On a page with more sections than this one (hub), it hands the hub its plan, the hub mounts the one stream, and
// the stream runs on from the core into Work.
export function HeroLab({ hub }: { hub?: Hub }) {
  const page = useRef<HTMLElement>(null), board = useRef<HTMLDivElement>(null), city = useRef<HTMLDivElement>(null), bar = useRef<HTMLDivElement>(null), cue = useRef<HTMLParagraphElement>(null);
  const sky = useRef<HTMLDivElement>(null), words = useRef<HTMLElement>(null);
  const world = useRef<{ setStream(on: number, since: number): void } | null>(null);
  const [ui, setUi] = useState(true);
  // Whether the screen is wide enough for the layout. Narrower, the page is a plain stand in with no stream and no city.
  const [wide, setWide] = useState<boolean | null>(null);

  useEffect(() => {
    setUi(new URLSearchParams(location.search).get('ui') !== '0' && !hub);
    const fits = matchMedia(`(min-width: ${BOARD.least}px)`), read = () => setWide(fits.matches);
    read();
    // The first screen waits for the world, where there is one and the page has been opened at its top: the
    // preloader is told so before the world has begun to load (src/world/loading.ts). The world is by far the most
    // of the wait.
    if (fits.matches && WORLD.shown && scrollY < innerHeight * 1.5) loading.begin(LOADING, 9);
    fits.addEventListener('change', read);
    return () => { fits.removeEventListener('change', read); loading.clear(); };
  }, []);

  useEffect(() => {
    if (!wide || !page.current || !board.current || !city.current || !bar.current) return;
    let made: HeroStage | null = null, gone = false;
    void import('../../hero/stage').then(({ mountHero }) => {
      if (gone) return;
      made = mountHero({ page: hub?.page() ?? page.current!, board: board.current!, city: city.current!, bar: () => (hub ? hub.workTop() : bar.current), cue: cue.current, world: () => world.current }, hub?.hero());
    });
    return () => { gone = true; made?.dispose(); };
  }, [wide, hub]);

  // The sky is planned from where the page has put the words and the world.
  useEffect(() => {
    if (!wide || !board.current || !city.current || !sky.current || !words.current) return;
    const b = board.current, c = city.current, w = words.current, host = sky.current;
    let made: { replan(): void; dispose(): void } | null = null, gone = false;
    const plan = () => {
      const u = b.offsetWidth / BOARD.w, tip = c.offsetTop + CITY.over * u, end = tip + CITY.edge * u;
      return {
        w: b.offsetWidth, h: end + SKY.tail * u, u,
        words: { x: CX * u, y: w.offsetTop + (WORDS.tall / 2) * u, rx: SKY.clear.rx * u, ry: SKY.clear.ry * u },
        glow: { x: CX * u, y: tip + (CITY.pole + SKY.glow.down) * u, rx: SKY.glow.rx * u, ry: SKY.glow.ry * u, strength: 1 },
        moon: { x: SKY.moon.x * u, y: SKY.moon.y * u, r: SKY.moon.r * u, with: 'none' as const },
        band: { x: SKY.band.x * u, y: SKY.band.y * u, rx: SKY.band.rx * u, ry: SKY.band.ry * u, turn: SKY.band.turn },
        end,
      };
    };
    void import('../../hero/sky').then(({ mountSky }) => {
      if (gone) return;
      made = mountSky(host, plan);
    });
    const watch = new ResizeObserver(() => made?.replan());
    watch.observe(b);
    return () => { gone = true; watch.disconnect(); made?.dispose(); };
  }, [wide]);

  const vars = {
    '--words-tall': WORDS.tall, '--words-least': WORDS.least, '--words-third': WORDS.third, '--words-rise': WORDS.rise, '--words-gap': WORDS.gap,
    '--city-tall': CITY.tall, '--city-over': CITY.over, '--city-pole': CITY.pole, '--city-show': CITY.show, '--city-edge': CITY.edge, '--city-low': CITY.low, '--work-under': WORK.under, '--work-tail': WORK.tail,
    '--sky-tail': SKY.tail,
  } as CSSProperties;

  return (
    <Shell ref={page} className={styles.page} data-embed={hub ? '' : undefined}>
      <Preloader name={hero.name} word={hero.loading} />
      {ui && (
        <div className={styles.head}>
          <p className={styles.label}>Study 30 · The hero</p>
        </div>
      )}
      <div ref={board} className={styles.board} style={vars}>
        <div ref={sky} className={styles.sky} aria-hidden="true" />
        <div ref={city} className={styles.city} style={{ width: u(HOST.wide) }}>
          {wide && WORLD.shown && <PieceView name={WORLD.piece} className={styles.piece} onPiece={(p) => { world.current = p as unknown as { setStream(on: number, since: number): void } | null; }} />}
        </div>
        <header ref={words} className={styles.words} style={{ width: u(WORDS.w) }}>
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
