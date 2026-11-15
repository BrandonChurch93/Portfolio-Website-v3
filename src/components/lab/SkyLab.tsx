'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { BAND, CITY, CX, MOON, POLE, SKY, W, WORDS, debris, layout, planet, world } from '../../hero/plan';
import { mountSky, type Sky, type SkyPlan } from '../../hero/sky';
import styles from './SkyLab.module.css';

// The hero's night sky alone, at /lab/sky, in its place: a plain outline stands in for his words and a dark
// outline of the world for the world, so the sky and the world's glow can be judged where they will be.

const MOST = 2400;
type With = SkyPlan['moon']['with'];
const WITHS: [With, string][] = [['none', 'Moon alone'], ['ring', 'With a ring'], ['moon', 'With a second moon']];
const GLOWS = [0, 0.7, 1, 1.4];
// Under the world's torn edge the world and its debris fill the screen's width: the sky ends there, and its canvas
// a little under it, so the glow behind the world's top has room to fade.
const SKY_TAIL = 60;

export function SkyLab() {
  const host = useRef<HTMLDivElement>(null), sky = useRef<Sky | null>(null);
  const [view, setView] = useState({ u: 1, hh: 900, w: 1460 });
  const [ui, setUi] = useState(true), [outline, setOutline] = useState(true), [city, setCity] = useState(true);
  const [moon, setMoon] = useState<With>('none'), [glow, setGlow] = useState(1);
  const L = useMemo(() => layout(view.hh), [view.hh]);
  const things = useMemo(() => world(), []);
  const body = useMemo(() => planet(), []);
  const pieces = useMemo(() => debris(), []);

  const plan = useRef<() => SkyPlan>(() => { throw new Error('no plan yet'); });
  plan.current = () => {
    const u = view.u;
    return {
      w: view.w,
      h: (L.edge + SKY_TAIL) * u,
      u,
      words: { x: CX * u, y: (L.words + WORDS.tall / 2) * u, rx: SKY.clear.rx * u, ry: SKY.clear.ry * u },
      glow: { x: CX * u, y: (L.city + POLE + SKY.glow.down) * u, rx: SKY.glow.rx * u, ry: SKY.glow.ry * u, strength: glow },
      moon: { x: MOON.x * u, y: MOON.y * u, r: MOON.r * u, with: moon },
      band: { x: BAND.x * u, y: BAND.y * u, rx: BAND.rx * u, ry: BAND.ry * u, turn: BAND.turn },
      end: L.edge * u,
    };
  };

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.get('ui') === '0') setUi(false);
    if (q.get('outline') === '0') setOutline(false);
    if (q.get('city') === '0') setCity(false);
    const m = q.get('moon');
    if (m === 'ring' || m === 'moon' || m === 'none') setMoon(m);
    if (q.has('glow')) setGlow(Number(q.get('glow')));
    const size = () => {
      const w = Math.min(innerWidth, MOST), u = w / W;
      setView({ u, hh: innerHeight / u, w });
    };
    size();
    addEventListener('resize', size);
    return () => removeEventListener('resize', size);
  }, []);

  useEffect(() => {
    if (!host.current) return;
    const s = mountSky(host.current, () => plan.current());
    sky.current = s;
    return () => { s.dispose(); sky.current = null; };
  }, []);

  useEffect(() => { sky.current?.replan(); }, [view, moon, glow]);

  const u = view.u, mid = CITY.w / 2;
  const vars = { '--u': `${u}px`, height: `${(L.work + 200) * u}px` } as CSSProperties;

  return (
    <div className={styles.page} style={vars}>
      <div ref={host} className={styles.sky} style={{ height: `${(L.edge + SKY_TAIL) * u}px` }} />
      <svg className={styles.art} viewBox={`0 0 ${W} ${L.work + 200}`} aria-hidden="true">
        {city && (
          <g className={styles.city} transform={`translate(${CITY.x} ${L.city})`}>
            <path className={styles.body} d={body} />
            {things.map((t, i) => <path key={i} d={t.d} />)}
            <path d={`M ${mid - 20} ${POLE + 8} L ${mid - 8} 60 L ${mid} 0 L ${mid + 8} 60 L ${mid + 20} ${POLE + 8} Z`} />
            {pieces.map((p, i) => <path key={i} d={p.d} />)}
          </g>
        )}
        {outline && (
          <g className={styles.words}>
            <rect x={CX - 380} y={L.words} width={760} height={WORDS.tall} rx={10} />
          </g>
        )}
      </svg>
      {ui && (
        <div className={styles.switches}>
          <span className={styles.study}>The night sky · his words and the world are stand ins</span>
          {WITHS.map(([k, label]) => (
            <button key={k} type="button" aria-pressed={moon === k} onClick={() => setMoon(k)}>{label}</button>
          ))}
          <span className={styles.study}>Glow</span>
          {GLOWS.map((g) => (
            <button key={g} type="button" aria-pressed={glow === g} onClick={() => setGlow(g)}>{g}</button>
          ))}
          <button type="button" onClick={() => sky.current?.meteor()}>A meteor</button>
          <button type="button" aria-pressed={outline} onClick={() => setOutline((v) => !v)}>Outlines</button>
        </div>
      )}
    </div>
  );
}
