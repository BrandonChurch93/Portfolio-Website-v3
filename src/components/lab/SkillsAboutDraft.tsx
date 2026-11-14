'use client';

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { READING_LINE } from '../../config/site';
import { lamp } from '../../lamp/lamp';
import { nearest, point, reach } from '../../page-sketch/plan';
import { ABOUT_TABS, COMPETENCIES } from '../../skills-about/content';
import { ABOUT, SKILLS, draft, type Pass } from '../../skills-about/draft';
import { W } from '../../skills-about/plan';
import { clock } from '../../world/clock';
import { Phones } from './DeskOutline';
import styles from './SkillsAboutDraft.module.css';
import { Workbench } from './Workbench';

// The most of its line the stream's end covers in a second, so a run along the desk or the bar can be watched.
// Over a gap longer than FAR it catches up faster.
const SPEED = 1150;
const FAR = 2600;
// How long a tab's pulse takes along the bar, in seconds, and how far along it is when the words change.
const PULSE = { run: 0.75, swap: 0.45 };
// Where the rows start and how tall they are until the page has been read.
const GUESS = { tops: [0, 190, 310, 500], tall: 640 };

const tr = (x: number, y: number) => `translate(${x} ${y})`;
const ease = (u: number) => 1 - (1 - u) ** 3;

// Study 22: Skills and About as a pair, with his real words and the motion roughed in.
// ?about=behind, ?speed=half, ?whole and ?ui=0 open it on those.
export function SkillsAboutDraft() {
  const id = useId().replace(/:/g, '');
  const [slow, setSlow] = useState(false);
  const [ui, setUi] = useState(true);
  const [whole, setWhole] = useState(false);
  const [reached, setReached] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState(0);
  const [showing, setShowing] = useState(0);
  const [rows, setRows] = useState(GUESS);
  const [pass, setPass] = useState<Pass>('beside');
  const board = useRef<HTMLDivElement>(null), list = useRef<HTMLDivElement>(null);
  const stream = useRef<SVGGElement>(null), head = useRef<SVGGElement>(null), spark = useRef<SVGGElement>(null);
  const at = useRef(0), replaying = useRef(false), pulse = useRef<{ t: number; from: number } | null>(null);
  const p = useMemo(() => draft(rows.tops, rows.tall, pass), [rows, pass]);
  const live = useRef({ p, reached, whole, slow, tab, showing });
  live.current = { p, reached, whole, slow, tab, showing };

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.get('about') === 'behind') setPass('behind');
    if (q.get('speed') === 'half') setSlow(true);
    if (q.get('ui') === '0') setUi(false);
    if (q.has('whole')) setWhole(true);
    lamp.bind();
  }, []);

  // A row is as tall as its words, so where each starts is read off the page, in the board's units.
  useEffect(() => {
    const el = list.current, on = board.current;
    if (!el || !on) return;
    const read = () => {
      const unit = on.clientWidth / W;
      if (!unit) return;
      const tops = [...el.children].map((c) => Math.round((c as HTMLElement).offsetTop / unit)), tall = Math.round(el.offsetHeight / unit);
      setRows((was) => (was.tall === tall && was.tops.every((t, i) => t === tops[i]) ? was : { tops, tall }));
    };
    read();
    const watch = new ResizeObserver(read);
    watch.observe(el);
    void document.fonts?.ready.then(read);
    return () => watch.disconnect();
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
      const run = pulse.current, u = run ? (t - run.t) / (PULSE.run / k) : 1;
      if (run && u < 1) {
        const [sx, sy] = point(l, run.from + (P.pulse - run.from) * ease(Math.max(0, u)));
        spark.current.style.opacity = String(Math.sin(Math.PI * Math.min(1, Math.max(0, u))) ** 0.5);
        spark.current.setAttribute('transform', tr(Number(sx.toFixed(1)), Number(sy.toFixed(1))));
      } else {
        spark.current.style.opacity = '0';
        pulse.current = null;
      }
      if (shown !== chosen && (!run || u >= PULSE.swap)) setShowing(chosen);
    }
    const m = lamp.get();
    el.style.setProperty('--mx', m.x.toFixed(3));
    el.style.setProperty('--my', m.y.toFixed(3));
  }), []);

  const got = (c: string) => reached.has(c);
  const R = SKILLS.rows, B = ABOUT.bar, P = ABOUT.portrait, A = ABOUT[pass], bar = p.about + B.y;
  const flare = `${id}-flare`, aura = `${id}-aura`;
  const cue = (c: string) => p.cues.find((k) => k.id === c)!;
  const place = (x: number, y: number, w?: number): CSSProperties => ({ left: `${(x / W) * 100}%`, top: `${(y / p.h) * 100}%`, width: w ? `${(w / W) * 100}%` : undefined });
  const pick = (i: number) => {
    if (i === tab) return;
    setTab(i);
    const el = document.getElementById(`${id}-tab-${i}`), on = board.current;
    if (!el || !on || !got('words')) { pulse.current = null; return; }
    const r = el.getBoundingClientRect(), b = on.getBoundingClientRect();
    pulse.current = { t: clock.now(), from: nearest(p.line, ((r.left + r.width / 2 - b.left) / b.width) * W, bar) };
  };
  const step = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const by = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0, n = ABOUT_TABS.length;
    if (!by) return;
    e.preventDefault();
    const next = (i + by + n) % n;
    pick(next);
    document.getElementById(`${id}-tab-${next}`)?.focus();
  };
  const replay = (from: string) => { replaying.current = true; at.current = Math.max(0, cue(from).at - 260); };

  return (
    <main className={styles.main}>
      <header className={styles.head}>
        <p className={styles.label}>Study 22 · Skills and About</p>
        <h1 className={styles.heading}>A fuller draft, second round</h1>
        <p className={styles.lede}>
          The rows of skills under the desk, a desk with a real desk’s proportions, the skills from your résumé, and your
          portrait beside About’s words. Scroll: the line is the stream. The buttons at the foot of the screen play a section
          again or at half speed.
        </p>
        <ul className={styles.caveats}>
          <li>The lists of skills are your résumé’s, word for word: its six groups under your four skill sets. Each set’s name and the two lines beside it are your live site’s.</li>
          <li>About’s paragraphs are your live site’s, dealt out under the three tabs. Twelve years and 40+ clients are shown as they stand and are down for correction.</li>
          <li>About’s tabs stand on a bar the stream runs along. A change of tab sends a pulse along it. The stream then falls between the words and you, or runs on behind your shoulders: the switch at the foot of the screen.</li>
          <li>The desk, the PC and the headphones are still outlines. The stream is still a line. Type sizes and spacing are a first pass.</li>
          <li>For judging: where things sit, what appears when, in what order, how fast. Not a phone.</li>
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
          <g transform={tr(0, p.skills)}>
            <Workbench shown={got('near')} on={got('desk')} />
            <Phones at={SKILLS.phones} shown={got('title')} lively />
          </g>
          <ellipse cx={A.x + P.w * A.glow[0]} cy={bar + A.glow[1]} rx={400} ry={250} fill={`url(#${aura})`} className={styles.aura} data-on={got('behind')} />
          <line x1={B.l} y1={bar + 5} x2={A.end} y2={bar + 5} className={styles.rail} />
          <path d={`M${B.l} ${bar - 2} l-26 6 l26 9 Z M${A.end} ${bar - 2} l26 6 l-26 9 Z`} className={styles.blade} />
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
        <img src="/media/portrait-cut-960.webp" alt="Brandon Church" className={styles.portrait} data-on={got('portrait')} style={place(A.x, bar + A.top, P.w)} />

        <h2 className={styles.title} data-on={got('title')} style={place(SKILLS.title[0], p.skills + SKILLS.title[1] - 60)}>Skills</h2>
        <div ref={list} className={styles.rows} style={place(R.l, p.skills + R.t, R.r - R.l)}>
          {COMPETENCIES.map((c, i) => (
            <article key={c.name} className={styles.row} data-on={got(`row${i}`)}>
              <div>
                <p className={`${styles.index} ${styles.reveal}`}>{String(i + 1).padStart(2, '0')}</p>
                <h3 className={`${styles.name} ${styles.reveal}`}>{c.name}</h3>
                <p className={`${styles.claim} ${styles.reveal}`} style={{ '--d': 1 } as CSSProperties}>{c.claim}</p>
              </div>
              <p className={`${styles.proof} ${styles.reveal}`} style={{ '--d': 2 } as CSSProperties}>{c.proof}</p>
              <dl className={`${styles.groups} ${styles.reveal}`} style={{ '--d': 3 } as CSSProperties}>
                {c.groups.map(([label, items]) => (
                  <div key={label} className={styles.group2}>
                    <dt>{label}</dt>
                    <dd>{items.map((item, k) => <span key={item}>{k ? ' ' : ''}<span className={styles.item}>{item}{k < items.length - 1 ? ' ·' : ''}</span></span>)}</dd>
                  </div>
                ))}
              </dl>
            </article>
          ))}
        </div>

        <section aria-label="About">
          <h2 className={styles.title} data-on={got('about')} style={place(ABOUT.words.l, bar - 138)}>About</h2>
          <div className={`${styles.tabs} ${styles.reveal}`} role="tablist" aria-label="About" data-on={got('words')} style={place(ABOUT.words.l, bar - 44, ABOUT.words.w)}>
            {ABOUT_TABS.map((t, i) => (
              <button key={t.name} type="button" role="tab" id={`${id}-tab-${i}`} aria-selected={tab === i} aria-controls={`${id}-panel`} tabIndex={tab === i ? 0 : -1} className={styles.tab} onClick={() => pick(i)} onKeyDown={(e) => step(e, i)}>{t.name}</button>
            ))}
          </div>
          <div className={`${styles.panelText} ${styles.reveal}`} role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${tab}`} data-on={got('words')} data-swapping={showing !== tab} style={{ ...place(ABOUT.words.l, bar + 34, ABOUT.words.w), '--d': 1 } as CSSProperties}>
            {ABOUT_TABS[showing].text.map((para) => <p key={para.slice(0, 24)}>{para}</p>)}
          </div>
        </section>
      </div>

      {ui && (
        <div className={styles.panel}>
          <div className={styles.controls}>
            <div className={styles.group} role="group" aria-label="How the stream passes your portrait">
              <span className={styles.groupName}>Stream in About</span>
              <button type="button" className={styles.choice} aria-pressed={pass === 'beside'} onClick={() => setPass('beside')}>Beside you</button>
              <button type="button" className={styles.choice} aria-pressed={pass === 'behind'} onClick={() => setPass('behind')}>Behind your shoulders</button>
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
