'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { clock } from '../../world/clock';
import { BAND, CITY, CX, FALLS, MOON, OPEN, READ, SKY, W, WORK, layout, rimAt, rock, stars, stream, towers } from '../../hero/plan';
import styles from './HeroDraft.module.css';

// Study 27, at /lab/hero-draft: the hero's layout as outlines. Layout A, his pick.

const MOST = 2400;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (k: number) => k * k * (3 - 2 * k);
const span = (s: number, [a, b]: readonly [number, number]) => clamp((s - a) / (b - a));

export function HeroDraft() {
  const root = useRef<HTMLDivElement>(null), clip = useRef<SVGRectElement>(null), end = useRef<SVGGElement>(null);
  const [view, setView] = useState({ u: 1, hh: 900 });
  const [ui, setUi] = useState(true), [notes, setNotes] = useState(true), [sky, setSky] = useState(true);
  const played = useRef<number | null>(null), hold = useRef<number | null>(null);

  const L = useMemo(() => layout(view.hh), [view.hh]);
  const line = useMemo(() => stream(L), [L]);
  const blocks = useMemo(() => towers(), []);
  const lights = useMemo(() => stars(L), [L]);
  const under = useMemo(() => rock(), []);
  const live = useRef({ L, line, view });
  live.current = { L, line, view };

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.get('ui') === '0') setUi(false);
    if (q.get('notes') === '0') setNotes(false);
    if (q.get('sky') === '0') setSky(false);
    if (q.has('opening')) hold.current = Number(q.get('opening')) || 0;
    const size = () => {
      const u = Math.min(innerWidth, MOST) / W;
      setView({ u, hh: innerHeight / u });
    };
    size();
    addEventListener('resize', size);
    return () => removeEventListener('resize', size);
  }, []);

  useEffect(() => clock.onFrame((t) => {
    const el = root.current, now = live.current;
    if (!el) return;
    const s = hold.current ?? (played.current === null ? OPEN.end : Math.min(OPEN.end, t - played.current));
    if (played.current !== null && s >= OPEN.end) played.current = null;
    const move = ease(span(s, OPEN.move));
    el.style.setProperty('--draw', String(clamp(s / OPEN.draw)));
    el.style.setProperty('--lift', String((1 - move) * (now.L.build - now.L.city)));
    el.style.setProperty('--words', String(ease(span(s, OPEN.words))));
    const y = clamp(clock.view.y / now.view.u + READ * now.view.hh, now.L.start, now.L.work);
    const on = y > now.L.start + 1 && s >= OPEN.end;
    clip.current?.setAttribute('height', String(on ? y - now.L.start : 0));
    if (end.current) {
      end.current.setAttribute('transform', `translate(${now.line.at(y)} ${y})`);
      end.current.style.opacity = on && y < now.L.work - 1 ? '1' : '0';
    }
    el.dataset.on = String(on);
    el.dataset.scrolled = String(clock.view.y > 40);
  }), []);

  const play = () => {
    scrollTo(0, 0);
    hold.current = null;
    played.current = clock.now();
  };

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
          <clipPath id="hero-reach">
            <rect ref={clip} x="0" y={L.start} width={W} height="0" />
          </clipPath>
        </defs>

        <g className={styles.sky}>
          <ellipse className={styles.band} cx={BAND.x} cy={BAND.y} rx={BAND.rx} ry={BAND.ry} transform={`rotate(${BAND.turn} ${BAND.x} ${BAND.y})`} fill="url(#hero-band)" />
          {lights.map((s, i) => <circle key={i} cx={s.x} cy={s.y} r={s.r} opacity={s.o} />)}
          {lights.filter((s) => s.big).map((s, i) => (
            <path key={i} className={styles.spark} opacity={s.o} d={`M ${s.x - 9} ${s.y} Q ${s.x} ${s.y} ${s.x} ${s.y - 9} Q ${s.x} ${s.y} ${s.x + 9} ${s.y} Q ${s.x} ${s.y} ${s.x} ${s.y + 9} Q ${s.x} ${s.y} ${s.x - 9} ${s.y} Z`} />
          ))}
          <g className={styles.moon}>
            <circle cx={MOON.x} cy={MOON.y} r={MOON.r} />
            <path d={`M ${MOON.x - 12} ${MOON.y - MOON.r + 3} A ${MOON.r} ${MOON.r} 0 0 0 ${MOON.x - 12} ${MOON.y + MOON.r - 3} A ${MOON.r * 0.72} ${MOON.r} 0 0 1 ${MOON.x - 12} ${MOON.y - MOON.r + 3} Z`} />
          </g>
        </g>
        <ellipse className={styles.skyglow} cx={CX} cy={L.city + CITY.rim - SKY.glow.lift} rx={SKY.glow.rx} ry={SKY.glow.ry} fill="url(#hero-glow)" />

        <g className={styles.city} transform={`translate(${CITY.x} ${L.city})`}>
          <path className={styles.rock} d={under} pathLength={1} />
          <ellipse className={styles.ground} cx={mid} cy={CITY.rim} rx={mid} ry={CITY.sag} pathLength={1} />
          {blocks.map((b, i) => (
            <path key={i} className={styles.tower} pathLength={1} d={`M ${b.x} ${b.foot} V ${b.top} H ${b.x + b.w} V ${b.foot}`} />
          ))}
          <path className={styles.spire} pathLength={1} d={`M ${mid - CITY.spire} ${CITY.rim + 8} L ${mid - 9} 96 L ${mid} 0 L ${mid + 9} 96 L ${mid + CITY.spire} ${CITY.rim + 8}`} />
          {[-250, 250, -430, 430].map((dx) => (
            <path key={dx} className={styles.park} pathLength={1} d={`M ${mid + dx - 44} ${CITY.rim + 14} a 44 30 0 0 1 88 0`} />
          ))}
          <g className={styles.falls}>
            {FALLS.map((dx) => (
              <rect key={dx} x={mid + dx - 1.5} y={rimAt(mid + dx)} width="3" height={190 - Math.abs(dx) * 0.16} fill="url(#hero-fall)" />
            ))}
            <rect className={styles.main} x={mid - 2.5} y={rimAt(mid)} width="5" height={CITY.tall - rimAt(mid)} />
          </g>
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
          <text x="24" y={L.fold - 10}>Foot of the screen when the opening ends. Everything under this line is hidden until the page is scrolled.</text>
          <text x={CX + 40} y={L.start + 60}>The main fall. The stream sets off from here.</text>
          <text x={CITY.x + mid + 380} y={L.city + rimAt(mid + 360) + 120}>The city&rsquo;s falls, in the stream&rsquo;s light.</text>
          <text x={CX + WORK.bar / 2 + 24} y={L.work + 10}>Work begins. The stream strikes its bar dead center.</text>
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
          <button type="button" onClick={play}>Play the opening</button>
          <button type="button" aria-pressed={sky} onClick={() => setSky((v) => !v)}>Sky and glow</button>
          <button type="button" aria-pressed={notes} onClick={() => setNotes((v) => !v)}>Notes</button>
        </div>
      )}
    </div>
  );
}
