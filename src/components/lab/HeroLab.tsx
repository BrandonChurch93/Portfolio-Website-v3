'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { hero } from '../../content/hero';
import { BOARD, CITY, CX, SKY, WORDS, WORK, WORLD } from '../../hero/board';
import type { HeroStage } from '../../hero/stage';
import { HOST } from '../../pieces/world/layout';
import { LOADING } from '../../pieces/world/part';
import { pictured, webgl } from '../../world/device';
import { loading } from '../../world/loading';
import { MetalButton } from '../MetalButton';
import { PieceView } from '../PieceView';
import type { Adrift } from '../../config/debris';
import { Drift } from '../Drift';
import { Still } from '../Still';
import { STILLS } from '../../config/stills';
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
// Where the live world is too much for a device to hold (pictured in src/world/device.ts) it is its pictures
// (src/hero/picture/), which the stage is told of as it tells the live world.
// There is no opening: the world and the words are simply there. The night sky (src/hero/sky) is behind
// everything, and draws the glow behind the world. ?ui=0 hides the label.
// On a page with more sections than this one (hub), it hands the hub its plan, the hub mounts the one stream, and
// the stream runs on from the core into Work.
// What hangs round the stream's fall under the world's picture on a narrow screen (src/components/Drift.tsx): clear
// of the fall itself, which is the middle of the box.
const FALL: Adrift[] = [
  { rock: 'slab', x: 0.2, y: 0.16, w: 0.19, turn: -12, far: 0.2 },
  { rock: 'block', x: 0.81, y: 0.3, w: 0.14, turn: 18, far: 0.35 },
  { rock: 'wedge', x: 0.31, y: 0.52, w: 0.085, turn: 26, far: 0.5 },
  { rock: 'tooth', x: 0.68, y: 0.63, w: 0.06, turn: -8, far: 0.6 },
  { rock: 'chip', x: 0.13, y: 0.78, w: 0.075, turn: 10, far: 0.55, flip: true },
  { rock: 'flake', x: 0.87, y: 0.84, w: 0.065, turn: -30, far: 0.7 },
];

export function HeroLab({ hub }: { hub?: Hub }) {
  const page = useRef<HTMLElement>(null), board = useRef<HTMLDivElement>(null), city = useRef<HTMLDivElement>(null), bar = useRef<HTMLDivElement>(null);
  const sky = useRef<HTMLDivElement>(null), words = useRef<HTMLElement>(null);
  const world = useRef<{ setStream(on: number, since: number, long: number): void; whole?(): boolean } | null>(null);
  const picture = useRef<HTMLDivElement>(null);
  // Whether the world is its pictures here. Not known until the page is in a browser.
  const [flat, setFlat] = useState<boolean | null>(null);
  const [ui, setUi] = useState(!hub);
  // Whether the screen is wide enough for the layout. Narrower, the page is a plain stand in with no stream and no city.
  const [wide, setWide] = useState<boolean | null>(null);
  // ?words=third holds his words a third of the way down every screen, as they were before Nov 20 (WORDS.give).
  const [third, setThird] = useState(false);

  useEffect(() => {
    setUi(new URLSearchParams(location.search).get('ui') !== '0' && !hub);
    setThird(new URLSearchParams(location.search).get('words') === 'third');
    const fits = matchMedia(`(min-width: ${BOARD.least}px)`), read = () => setWide(fits.matches);
    setFlat(pictured('world'));
    read();
    // The first screen waits for the world, where there is one and the page has been opened at its top: the
    // preloader is told so before the world has begun to load (src/world/loading.ts). The world is by far the most
    // of the wait.
    if (fits.matches && WORLD.shown && webgl() && scrollY < innerHeight * 1.5) loading.begin(LOADING, 9);
    fits.addEventListener('change', read);
    return () => { fits.removeEventListener('change', read); loading.clear(); };
  }, []);

  useEffect(() => {
    if (!wide || !webgl() || !page.current || !board.current || !city.current || !bar.current) return;
    let made: HeroStage | null = null, gone = false;
    void import('../../hero/stage').then(({ mountHero }) => {
      if (gone) return;
      made = mountHero({ page: hub?.page() ?? page.current!, board: board.current!, city: city.current!, bar: () => (hub ? hub.workTop() : bar.current), cue: null, world: () => world.current }, hub?.hero());
    });
    return () => { gone = true; made?.dispose(); };
  }, [wide, hub]);

  useEffect(() => {
    if (!wide || !flat || !picture.current) return;
    const host = picture.current;
    let made: { setStream(on: number, since: number, long: number): void; whole(): boolean; dispose(): void } | null = null, gone = false;
    void import('../../hero/picture').then(({ mountPicture }) => {
      if (gone) return;
      made = mountPicture(host, { onProgress: (k) => loading.progress(LOADING, k), onReady: () => loading.end(LOADING) });
      world.current = made;
    });
    return () => { gone = true; if (world.current === made) world.current = null; made?.dispose(); };
  }, [wide, flat]);

  // The sky is planned from where the page has put the words and the world.
  useEffect(() => {
    if (!wide || !webgl() || !board.current || !city.current || !sky.current || !words.current) return;
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
    '--words-tall': WORDS.tall, '--words-least': WORDS.least, '--words-third': WORDS.third, '--words-rise': WORDS.rise, '--words-gap': WORDS.gap, '--words-give': WORDS.give,
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
      <div ref={board} className={styles.board} style={vars} data-words={third ? 'third' : undefined}>
        <div ref={sky} className={styles.sky} aria-hidden="true" />
        <Still name="sky" className={styles.night} />
        <div ref={city} className={styles.city} style={{ width: u(HOST.wide) }}>
          {wide && WORLD.shown && flat === false && <PieceView name={WORLD.piece} early="quiet" className={styles.piece} onPiece={(p) => { world.current = p as unknown as { setStream(on: number, since: number, long: number): void; whole?(): boolean } | null; }} />}
          {wide && WORLD.shown && flat && <div ref={picture} className={styles.piece} data-part="world-picture" />}
        </div>
        <header ref={words} className={styles.words} style={{ width: u(WORDS.w) }}>
          <p className={styles.role}>{hero.role}</p>
          <h1 className={styles.name}>{hero.name}</h1>
          <p className={styles.lead}>{hero.lead}</p>
          <div className={styles.buttons}>
            <MetalButton label={hero.work.label} href={hero.work.href} className={styles.button} />
            <MetalButton label={hero.resume.label} variant="accent" href={hero.resume.href} download className={styles.button} />
          </div>
        </header>
        {/* The world as one picture, under his words, on a screen too narrow for the live world. */}
        <Still name="world" className={styles.still} style={{ '--still-x': STILLS.world.keep.x, '--still-w': STILLS.world.keep.w } as CSSProperties} />
        {/* And under the picture, where its own stream falls on into Work, a few of the planet's pieces that move:
            the picture cannot. */}
        <Drift field={FALL} className={styles.fall} />
        <div ref={bar} id={hub ? undefined : 'work'} className={styles.bar} style={{ width: u(WORK.bar) }} aria-hidden="true">
          <span>Work begins here</span>
        </div>
      </div>
    </Shell>
  );
}
