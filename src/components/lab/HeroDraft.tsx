'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { clock } from '../../world/clock';
import { CITY, CX, FALLS, OPEN, READ, W, WORK, layout, rimAt, rock, stream, towers } from '../../hero/plan';
import styles from './HeroDraft.module.css';

// Study 27, at /lab/hero-draft: the hero's layout as outlines. Layout A, his pick.

const MOST = 2400;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (k: number) => k * k * (3 - 2 * k);
const span = (s: number, [a, b]: readonly [number, number]) => clamp((s - a) / (b - a));

export function HeroDraft() {
  const root = useRef<HTMLDivElement>(null), clip = useRef<SVGRectElement>(null), end = useRef<SVGGElement>(null);
  const [view, setView] = useState({ u: 1, hh: 900 });
  const [ui, setUi] = useState(true), [notes, setNotes] = useState(true);
  const played = useRef<number | null>(null), hold = useRef<number | null>(null);

  const L = useMemo(() => layout(view.hh), [view.hh]);
  const line = useMemo(() => stream(L), [L]);
  const blocks = useMemo(() => towers(), []);
  const under = useMemo(() => rock(), []);
  const live = useRef({ L, line, view });
  live.current = { L, line, view };

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.get('ui') === '0') setUi(false);
    if (q.get('notes') === '0') setNotes(false);
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
    <div ref={root} className={styles.page} style={vars} data-notes={notes}>
      <svg className={styles.art} viewBox={`0 0 ${W} ${L.h}`} aria-hidden="true">
        <defs>
          <linearGradient id="hero-fall" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--flame)" stopOpacity="0.9" />
            <stop offset="1" stopColor="var(--flame)" stopOpacity="0" />
          </linearGradient>
          <clipPath id="hero-reach">
            <rect ref={clip} x="0" y={L.start} width={W} height="0" />
          </clipPath>
        </defs>

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
          <button type="button" aria-pressed={notes} onClick={() => setNotes((v) => !v)}>Notes</button>
        </div>
      )}
    </div>
  );
}
