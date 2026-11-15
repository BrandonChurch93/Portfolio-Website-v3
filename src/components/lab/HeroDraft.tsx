'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { clock } from '../../world/clock';
import { BAND, CITY, CX, FALLS, HEART, MOON, PLANET, POLE, READ, SKY, W, WORK, debris, layout, planet, stars, strata, stream, tearAt, world } from '../../hero/plan';
import styles from './HeroDraft.module.css';

// Study 27, at /lab/hero-draft: the hero's layout as outlines. Layout A, his pick, with the city's ground as the
// torn top of a small planet.

const MOST = 2400;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

export function HeroDraft() {
  const root = useRef<HTMLDivElement>(null), clip = useRef<SVGRectElement>(null), end = useRef<SVGGElement>(null);
  const [view, setView] = useState({ u: 1, hh: 900 });
  const [ui, setUi] = useState(true), [notes, setNotes] = useState(true), [sky, setSky] = useState(true);

  const L = useMemo(() => layout(view.hh), [view.hh]);
  const line = useMemo(() => stream(L), [L]);
  const lights = useMemo(() => stars(L), [L]);
  const things = useMemo(() => world(), []);
  const body = useMemo(() => planet(), []);
  const layers = useMemo(() => strata(), []);
  const pieces = useMemo(() => debris(), []);
  const live = useRef({ L, line, view });
  live.current = { L, line, view };

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.get('ui') === '0') setUi(false);
    if (q.get('notes') === '0') setNotes(false);
    if (q.get('sky') === '0') setSky(false);
    const size = () => {
      const u = Math.min(innerWidth, MOST) / W;
      setView({ u, hh: innerHeight / u });
    };
    size();
    addEventListener('resize', size);
    return () => removeEventListener('resize', size);
  }, []);

  useEffect(() => clock.onFrame(() => {
    const el = root.current, now = live.current;
    if (!el) return;
    const y = clamp(clock.view.y / now.view.u + READ * now.view.hh, now.L.source, now.L.work);
    const on = y > now.L.source + 1;
    clip.current?.setAttribute('height', String(on ? y - now.L.source : 0));
    if (end.current) {
      end.current.setAttribute('transform', `translate(${now.line.at(y)} ${y})`);
      end.current.style.opacity = on && y < now.L.work - 1 ? '1' : '0';
    }
    el.dataset.on = String(on);
    el.dataset.scrolled = String(clock.view.y > 40);
  }), []);

  const mid = CITY.w / 2;
  const vars = { '--u': `${view.u}px`, height: `${L.h * view.u}px` } as CSSProperties;

  return (
    <div ref={root} className={styles.page} style={vars} data-notes={notes} data-sky={sky}>
      <svg className={styles.art} viewBox={`0 0 ${W} ${L.h}`} aria-hidden="true">
        <defs>
          <linearGradient id="hero-fall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--flame)" stopOpacity="0.9" />
            <stop offset="1" stopColor="var(--flame)" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="hero-band">
            <stop offset="0" stopColor="var(--pale)" stopOpacity="0.1" />
            <stop offset="1" stopColor="var(--pale)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="hero-glow">
            <stop offset="0" stopColor="var(--flame)" stopOpacity="0.34" />
            <stop offset="0.3" stopColor="var(--ember)" stopOpacity="0.8" />
            <stop offset="0.65" stopColor="var(--ember)" stopOpacity="0.28" />
            <stop offset="1" stopColor="var(--ember-deep)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="hero-core">
            <stop offset="0" stopColor="var(--pale)" />
            <stop offset="0.35" stopColor="var(--hot)" />
            <stop offset="0.8" stopColor="var(--flame)" />
            <stop offset="1" stopColor="var(--ember)" />
          </radialGradient>
          <radialGradient id="hero-heat">
            <stop offset="0" stopColor="var(--flame)" stopOpacity="0.5" />
            <stop offset="1" stopColor="var(--flame)" stopOpacity="0" />
          </radialGradient>
          <clipPath id="hero-reach">
            <rect ref={clip} x="0" y={L.source} width={W} height="0" />
          </clipPath>
          <clipPath id="hero-body">
            <path d={body} />
          </clipPath>
        </defs>

        <g className={styles.sky}>
          <ellipse cx={BAND.x} cy={BAND.y} rx={BAND.rx} ry={BAND.ry} transform={`rotate(${BAND.turn} ${BAND.x} ${BAND.y})`} fill="url(#hero-band)" />
          {lights.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} opacity={s.o} />)}
          {lights.filter((s) => s.big).map((s, i) => (
            <path key={i} opacity={s.o} d={`M ${s.x - 9} ${s.y} Q ${s.x} ${s.y} ${s.x} ${s.y - 9} Q ${s.x} ${s.y} ${s.x + 9} ${s.y} Q ${s.x} ${s.y} ${s.x} ${s.y + 9} Q ${s.x} ${s.y} ${s.x - 9} ${s.y} Z`} />
          ))}
          <g className={styles.moon}>
            <circle cx={MOON.x} cy={MOON.y} r={MOON.r} />
            <path d={`M ${MOON.x - 12} ${MOON.y - MOON.r + 3} A ${MOON.r} ${MOON.r} 0 0 0 ${MOON.x - 12} ${MOON.y + MOON.r - 3} A ${MOON.r * 0.72} ${MOON.r} 0 0 1 ${MOON.x - 12} ${MOON.y - MOON.r + 3} Z`} />
          </g>
        </g>
        <ellipse className={styles.skyglow} cx={CX} cy={L.city + POLE + SKY.glow.down} rx={SKY.glow.rx} ry={SKY.glow.ry} fill="url(#hero-glow)" />

        <g className={styles.city} transform={`translate(${CITY.x} ${L.city})`}>
          <path className={styles.planet} d={body} />
          <g clipPath="url(#hero-body)">
            {layers.map((d, i) => <path key={i} className={styles.strata} d={d} />)}
            <circle cx={mid} cy={HEART} r={PLANET.core * 2.6} fill="url(#hero-heat)" stroke="none" />
          </g>
          {things.map((t, i) => <path key={i} className={styles[t.kind]} d={t.d} />)}
          <path className={styles.spire} d={`M ${mid - 20} ${POLE + 8} L ${mid - 8} 60 L ${mid} 0 L ${mid + 8} 60 L ${mid + 20} ${POLE + 8}`} />
          <g className={styles.rings}>
            <circle cx={mid} cy="48" r="9" />
            <ellipse cx={mid} cy="78" rx="23" ry="5" />
            <ellipse cx={mid} cy="120" rx="31" ry="6.5" />
            <ellipse cx={mid} cy="162" rx="24" ry="5" />
          </g>
          <g className={styles.falls}>
            {FALLS.map((dx) => (
              <rect key={dx} x={mid + dx - 1.5} y={tearAt(mid + dx) - 6} width="3" height={230 - Math.abs(dx) * 0.2} fill="url(#hero-fall)" />
            ))}
          </g>
          <circle cx={mid} cy={HEART} r={PLANET.core * 1.7} fill="url(#hero-heat)" stroke="none" />
          <circle className={styles.core} cx={mid} cy={HEART} r={PLANET.core} />
          <ellipse className={styles.orbit} cx={mid} cy={HEART + 86} rx="800" ry="118" />
          {pieces.map((p, i) => <path key={i} className={styles.debris} data-big={p.big} d={p.d} />)}
        </g>

        <g clipPath="url(#hero-reach)">
          <path className={styles.glow} d={line.d} />
          <path className={styles.stream} d={line.d} />
        </g>
        <g ref={end} className={styles.end}>
          <circle r="16" className={styles.endGlow} />
          <circle r="4.5" className={styles.endCore} />
        </g>

        <g className={styles.work}>
          <rect x={CX - WORK.bar / 2} y={L.work} width={WORK.bar} height="8" rx="4" />
          <text x={CX} y={L.work + 108} textAnchor="middle">WORK</text>
        </g>

        <g className={styles.notes}>
          <line x1="0" x2={W} y1={L.fold} y2={L.fold} />
          <text x="24" y={L.fold - 10}>Foot of the screen at rest. Everything under this line is hidden until the page is scrolled.</text>
          <text x="24" y={L.edge - 12}>The torn edge. The world above it, its inside below.</text>
          <text x={CX + PLANET.core + 26} y={L.city + HEART + 4}>The core, burning. The site&rsquo;s stream comes out of it.</text>
          <text x={CX + 250} y={L.city + tearAt(mid + 330) + 150}>Streams of the same light leave the torn face.</text>
          <text x="24" y={L.foot + 30}>Debris round the tear: some in slow orbit, some holding one face to the core, some tumbling.</text>
          <text x="24" y={L.work - 40}>Work begins. There is more room over it than before, so the torn world is seen alone first.</text>
        </g>
      </svg>

      <header className={styles.words} style={{ top: `${L.words * view.u}px` }}>
        <p className={styles.role}>Product Engineer · Designer</p>
        <h1 className={styles.name}>Brandon Church</h1>
        <p className={styles.lead}>
          I take products from the first client conversation all the way to production. I&rsquo;m the person clients trust to own the outcome, not just hand over the artifacts.
        </p>
        <div className={styles.buttons}>
          <span className={styles.primary}>See the work</span>
          <span className={styles.second}>Get in touch</span>
          <span className={styles.tag}>The buttons&rsquo; words are stand ins</span>
        </div>
      </header>

      <div className={styles.cue} aria-hidden="true">Scroll</div>

      {ui && (
        <div className={styles.switches}>
          <span className={styles.study}>Study 27 · The hero, a wireframe</span>
          <button type="button" aria-pressed={sky} onClick={() => setSky((v) => !v)}>Sky and glow</button>
          <button type="button" aria-pressed={notes} onClick={() => setNotes((v) => !v)}>Notes</button>
        </div>
      )}
    </div>
  );
}
