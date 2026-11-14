'use client';

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { READING_LINE } from '../../config/site';
import { lamp } from '../../lamp/lamp';
import { point, reach } from '../../page-sketch/plan';
import { ABOUT_TABS, COMPETENCIES } from '../../skills-about/content';
import { LAYOUT, draft } from '../../skills-about/draft';
import { ABOUT, DESKS, W, type Rows } from '../../skills-about/plan';
import { clock } from '../../world/clock';
import { Desk, Phones } from './DeskOutline';
import styles from './SkillsAboutDraft.module.css';

// The most of its line the stream's end covers in a second over a short stretch, so a run along the desk can be
// watched. Over a long gap it catches up faster.
const SPEED = 1150;
const FAR = 1400;
// How long a tab's pulse takes along the rail, in seconds, and how far along it is when the words change.
const PULSE = { run: 0.75, swap: 0.45 };

const tr = (x: number, y: number) => `translate(${x} ${y})`;
const ease = (u: number) => 1 - (1 - u) ** 3;

// Study 22: Skills and About as a pair, with his real words and the motion roughed in.
// ?rows=under, ?speed=half, ?whole and ?ui=0 open it on those.
export function SkillsAboutDraft() {
  const id = useId().replace(/:/g, '');
  const [rows, setRows] = useState<Rows>('beside');
  const [slow, setSlow] = useState(false);
  const [ui, setUi] = useState(true);
  const [whole, setWhole] = useState(false);
  const [reached, setReached] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState(0);
  const [showing, setShowing] = useState(0);
  const board = useRef<HTMLDivElement>(null), stream = useRef<SVGGElement>(null), head = useRef<SVGGElement>(null), spark = useRef<SVGGElement>(null);
  const at = useRef(0), replaying = useRef(false), pulse = useRef<number | null>(null);
  const p = useMemo(() => draft(rows), [rows]);
  const live = useRef({ p, reached, whole, slow, tab, showing });
  live.current = { p, reached, whole, slow, tab, showing };

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.get('rows') === 'under') setRows('under');
    if (q.get('speed') === 'half') setSlow(true);
    if (q.get('ui') === '0') setUi(false);
    if (q.has('whole')) setWhole(true);
    lamp.bind();
  }, []);

  useEffect(() => clock.onFrame((t, dt) => {
    const el = board.current, { p: P, reached: was, whole: held, slow: half, tab: chosen, showing: shown } = live.current;
    if (!el) return;
    const box = el.getBoundingClientRect(), scale = box.width / W, l = P.line, k = half ? 0.5 : 1;
    const want = held ? l.total : reach(l, (innerHeight * READING_LINE - box.top) / scale);
    let len = at.current;
    if (dt <= 0 || clock.isFrozen() || held) len = want;
    else {
      const gap = want - len, step = (Math.abs(gap) > FAR && !replaying.current ? Math.abs(gap) * 4 : SPEED * k) * dt;
      len += Math.max(-step, Math.min(step, gap));
      if (Math.abs(want - len) < 1) replaying.current = false;
    }
    at.current = len;
    if (stream.current) {
      for (const path of stream.current.children) path.setAttribute('stroke-dasharray', `${len.toFixed(1)} 99999`);
      stream.current.style.opacity = len > 0.5 ? '1' : '0';
    }
    if (head.current) {
      const [hx, hy] = point(l, len);
      head.current.style.opacity = len > 2 && len < l.total - 2 ? '1' : '0';
      head.current.setAttribute('transform', tr(Number(hx.toFixed(1)), Number(hy.toFixed(1))));
    }
    const next = new Set<string>();
    for (const c of P.cues) if (len >= c.at - 1) next.add(c.id);
    if (next.size !== was.size || [...next].some((c) => !was.has(c))) setReached(next);

    if (spark.current) {
      const from = pulse.current, u = from === null ? 1 : (t - from) / (PULSE.run / k);
      if (from !== null && u < 1) {
        const a = P.cues.find((c) => c.id === 'about')!.at, b = P.cues.find((c) => c.id === 'behind')!.at;
        const [sx, sy] = point(l, a + (b - a) * ease(Math.max(0, u)));
        spark.current.style.opacity = String(Math.sin(Math.PI * Math.min(1, Math.max(0, u))) ** 0.5);
        spark.current.setAttribute('transform', tr(Number(sx.toFixed(1)), Number(sy.toFixed(1))));
      } else {
        spark.current.style.opacity = '0';
        pulse.current = null;
      }
      if (shown !== chosen && (from === null || u >= PULSE.swap)) setShowing(chosen);
    }
    const m = lamp.get();
    el.style.setProperty('--mx', m.x.toFixed(3));
    el.style.setProperty('--my', m.y.toFixed(3));
  }), []);

  const got = (c: string) => reached.has(c);
  const L = LAYOUT[rows], beside = rows === 'beside', R = ABOUT.rail, P = ABOUT.portrait;
  const flare = `${id}-flare`, aura = `${id}-aura`;
  const cue = (c: string) => p.cues.find((k) => k.id === c)!;
  const place = (x: number, y: number, w?: number): CSSProperties => ({ left: `${(x / W) * 100}%`, top: `${(y / p.h) * 100}%`, width: w ? `${(w / W) * 100}%` : undefined });
  const pick = (i: number) => { if (i === tab) return; setTab(i); pulse.current = got('about') ? clock.now() : null; };
  const replay = (from: string) => { replaying.current = true; at.current = Math.max(0, cue(from).at - 260); };
  const step = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const by = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0, n = ABOUT_TABS.length;
    if (!by) return;
    e.preventDefault();
    const next = (i + by + n) % n;
    pick(next);
    document.getElementById(`${id}-tab-${next}`)?.focus();
  };

  return (
    <main className={styles.main}>
      <header className={styles.head}>
        <p className={styles.label}>Study 22 · Skills and About</p>
        <h1 className={styles.heading}>A fuller draft, with your words</h1>
        <p className={styles.lede}>
          The same pair as the rough draft, with the words from your live site in place of the grey bars and the motion roughed
          in. Scroll: the line is the stream. Use the buttons at the foot of the screen to play a section again or at half speed.
        </p>
        <ul className={styles.caveats}>
          <li>Every word is your live site’s, as it stands. The live About is one block, so its four paragraphs are dealt out under the three tabs.</li>
          <li>Two claims are down for correction in the brief and are shown as they stand: twelve years, and 40+ clients.</li>
          <li>Each row of skills comes on when the stream’s leading end is level with it. About comes on in two beats: you and the title where the stream lands, the words and the light behind you as it passes your shoulders.</li>
          <li>The desk, the PC and the headphones are still outlines. The stream is still a line. Type sizes and spacing are a first pass.</li>
          <li>For judging: what appears when, in what order, how fast, and how the words sit. Not a phone.</li>
        </ul>
      </header>

      <div ref={board} className={styles.board} style={{ aspectRatio: `${W} / ${p.h}`, '--slow': slow ? 2 : 1 } as CSSProperties}>
        <svg className={styles.layer} viewBox={`0 0 ${W} ${p.h}`} aria-hidden="true">
          <defs>
            <radialGradient id={flare}>
              <stop offset="0" stopColor="var(--hot)" stopOpacity="0.9" />
              <stop offset="0.35" stopColor="var(--flame)" stopOpacity="0.45" />
              <stop offset="1" stopColor="var(--ember)" stopOpacity="0" />
            </radialGradient>
            <radialGradient id={aura}>
              <stop offset="0" stopColor="var(--flame)" stopOpacity="0.55" />
              <stop offset="0.5" stopColor="var(--ember)" stopOpacity="0.5" />
              <stop offset="1" stopColor="var(--ember)" stopOpacity="0" />
            </radialGradient>
          </defs>
          <g transform={tr(0, p.skills + L.drop)}><Desk desk={DESKS[rows]} shown={got('near')} on={got('desk')} lively /></g>
          <g transform={tr(0, p.skills)}><Phones at={L.phones} shown={got('title')} lively /></g>
          <g transform={tr(0, p.about)}>
            <line x1={R.ax} y1={R.ay + 5} x2={R.bx} y2={R.by + 5} className={styles.rail} />
            <path d={`M${R.ax} ${R.ay - 3} l-28 -1 l28 14 Z M${R.bx} ${R.by} l26 12 l-27 1 Z`} className={styles.blade} />
            <ellipse cx={P.x + P.w * 0.5} cy={R.ay + (R.by - R.ay) * 0.76} rx={380} ry={210} fill={`url(#${aura})`} className={styles.aura} data-on={got('behind')} />
          </g>
          <g ref={stream} className={styles.line}>
            {[styles.haze, styles.glow, styles.body, styles.core].map((c) => <path key={c} d={p.line.d} className={c} strokeDasharray="0 99999" />)}
          </g>
          {['desk', 'about'].map((c) => (
            <g key={c} className={styles.strike} data-on={got(c)} transform={tr(cue(c).x, cue(c).y)}>
              <circle r={26} fill={`url(#${flare})`} />
              {[20, 75, 130, 200, 255, 320].map((a) => <line key={a} x1={0} y1={0} x2={15} y2={0} transform={`rotate(${a})`} />)}
              <circle r={2.6} className={styles.dot} />
            </g>
          ))}
          <g ref={head} className={styles.lead}>
            <circle r={34} fill={`url(#${flare})`} />
            {[70, 100, 125, 55, 150].map((a) => <line key={a} x1={0} y1={0} x2={20} y2={0} transform={`rotate(${a})`} />)}
            <circle r={3.4} className={styles.dot} />
          </g>
          <g ref={spark} className={styles.lead}>
            <circle r={46} fill={`url(#${flare})`} />
            <circle r={4.4} className={styles.dot} />
          </g>
        </svg>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/media/portrait-cut-960.webp" alt="Brandon Church" className={styles.portrait} data-on={got('about')} style={place(P.x, p.about + P.y, P.w)} />

        <h2 className={styles.title} data-on={got('title')} style={place(L.title[0], p.skills + L.title[1] - 60)}>Skills</h2>
        {COMPETENCIES.map((c, i) => (
          <article key={c.name} className={styles.row} data-wide={!beside} data-on={got(`row${i}`)} style={place(L.l, p.skills + L.t + i * L.step, L.r - L.l)}>
            <div className={styles.lead2}>
              <p className={`${styles.index} ${styles.reveal}`}>{String(i + 1).padStart(2, '0')}</p>
              <h3 className={`${styles.name} ${styles.reveal}`}>{c.name}</h3>
              <p className={`${styles.claim} ${styles.reveal}`} style={{ '--d': 1 } as CSSProperties}>{c.claim}</p>
            </div>
            <p className={`${styles.proof} ${styles.reveal}`} style={{ '--d': 2 } as CSSProperties}>{c.proof}</p>
            <dl className={`${styles.groups} ${styles.reveal}`} style={{ '--d': 3 } as CSSProperties}>
              {c.groups.map(([label, items]) => (
                <div key={label} className={styles.group2}>
                  <dt>{label}</dt>
                  <dd>{items.join(' · ')}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}

        <section className={styles.about} style={place(ABOUT.title.x, p.about + ABOUT.title.y - 60, 480)} aria-label="About">
          <h2 className={styles.title} data-on={got('about')}>About</h2>
          <div className={styles.words} data-on={got('behind')}>
            <div className={`${styles.tabs} ${styles.reveal}`} role="tablist" aria-label="About">
              {ABOUT_TABS.map((t, i) => (
                <button key={t.name} type="button" role="tab" id={`${id}-tab-${i}`} aria-selected={tab === i} aria-controls={`${id}-panel`} tabIndex={tab === i ? 0 : -1} className={styles.tab} onClick={() => pick(i)} onKeyDown={(e) => step(e, i)}>{t.name}</button>
              ))}
            </div>
            <div className={`${styles.panelText} ${styles.reveal}`} role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${tab}`} data-swapping={showing !== tab} style={{ '--d': 1 } as CSSProperties}>
              {ABOUT_TABS[showing].text.map((para) => <p key={para.slice(0, 24)}>{para}</p>)}
            </div>
          </div>
        </section>
      </div>

      {ui && (
        <div className={styles.panel}>
          <div className={styles.controls}>
            <div className={styles.group} role="group" aria-label="Where the rows of skills sit">
              <span className={styles.groupName}>Skills rows</span>
              <button type="button" className={styles.choice} aria-pressed={beside} onClick={() => setRows('beside')}>Beside the desk</button>
              <button type="button" className={styles.choice} aria-pressed={!beside} onClick={() => setRows('under')}>Under it</button>
            </div>
            <div className={styles.group} role="group" aria-label="How fast everything runs">
              <span className={styles.groupName}>Speed</span>
              <button type="button" className={styles.choice} aria-pressed={!slow} onClick={() => setSlow(false)}>Full</button>
              <button type="button" className={styles.choice} aria-pressed={slow} onClick={() => setSlow(true)}>Half</button>
            </div>
            <div className={styles.group} role="group" aria-label="Play a section again">
              <span className={styles.groupName}>Play again</span>
              <button type="button" className={styles.choice} onClick={() => replay('title')}>Skills</button>
              <button type="button" className={styles.choice} onClick={() => replay('about')}>About</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
