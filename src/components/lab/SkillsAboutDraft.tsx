'use client';

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { READING_LINE } from '../../config/site';
import { lamp } from '../../lamp/lamp';
import { nearest, point, reach } from '../../page-sketch/plan';
import { ABOUT_TABS, COMPETENCIES } from '../../skills-about/content';
import { ABOUT, SKILLS, draft, runAt, turns, type DeskRoute } from '../../skills-about/draft';
import { W } from '../../skills-about/plan';
import { clock } from '../../world/clock';
import { Phones } from './DeskOutline';
import styles from './SkillsAboutDraft.module.css';
import { Workbench } from './Workbench';

// The most of its line the stream's end covers in a second, so a run along the desk or the bar can be watched.
// Over a gap longer than FAR it catches up faster.
const SPEED = 1150;
const FAR = 2600;
// How long a tab's pulse takes to reach him, in seconds, and how far along it is when the words change.
const PULSE = { run: 0.75, swap: 0.45 };
// Where the rows start and how tall they are until the page has been read.
const GUESS = { tops: [0, 160, 320], tall: 480 };

const f1 = (v: number) => v.toFixed(1);
// Stand ins for a small 3D thing in each row of skills, as plain outlines: joined points, a stack of plates, a
// block made of blocks. They mark a size and a place and are not designs.
const THINGS = [
  <g key="points"><path d="M48 16 L20 40 L32 74 L64 74 L76 40 Z M48 16 L48 48 M20 40 L48 48 L76 40 M32 74 L48 48 L64 74" />{[[48, 16], [20, 40], [76, 40], [32, 74], [64, 74], [48, 48]].map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={4.5} />)}</g>,
  <path key="plates" d="M48 14 L84 28 L48 42 L12 28 Z M12 44 L48 58 L84 44 M12 60 L48 74 L84 60 M12 28 L12 60 M84 28 L84 60 M48 74 L48 82 M12 60 L12 68 L48 82 L84 68 L84 60" />,
  <path key="blocks" d="M48 10 L82 29 L82 67 L48 86 L14 67 L14 29 Z M48 48 L48 86 M48 48 L14 29 M48 48 L82 29 M31 19.5 L65 38.5 L65 76.5 M65 19.5 L31 38.5 L31 76.5 M14 48 L48 67 L82 48" />,
];

const tr = (x: number, y: number) => `translate(${x.toFixed(1)} ${y.toFixed(1)})`;
const ease = (u: number) => 1 - (1 - u) ** 3;

// Study 22: Skills and About as a pair, with his real words and the motion roughed in.
// ?desk=edge, ?speed=half, ?whole and ?ui=0 open it on those.
export function SkillsAboutDraft() {
  const id = useId().replace(/:/g, '');
  const [slow, setSlow] = useState(false);
  const [desk, setDesk] = useState<DeskRoute>('lamp');
  const [ui, setUi] = useState(true);
  const [whole, setWhole] = useState(false);
  const [reached, setReached] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState(0);
  const [showing, setShowing] = useState(0);
  const [rows, setRows] = useState(GUESS);
  const board = useRef<HTMLDivElement>(null), list = useRef<HTMLDivElement>(null);
  const stream = useRef<SVGGElement>(null), head = useRef<SVGGElement>(null), spark = useRef<SVGGElement>(null);
  const at = useRef(0), replaying = useRef(false), pulse = useRef<{ t: number; from: number } | null>(null);
  const p = useMemo(() => draft(rows.tops, rows.tall, desk), [rows, desk]);
  const live = useRef({ p, reached, whole, slow, tab, showing });
  live.current = { p, reached, whole, slow, tab, showing };

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.get('speed') === 'half') setSlow(true);
    if (q.get('desk') === 'edge') setDesk('edge');
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
  const R = SKILLS.rows, P = ABOUT.portrait, T = ABOUT.words, top = p.about;
  const { first: [fx, fy], second: [sx, sy], enter, along: [ax, ay] } = turns();
  const flare = `${id}-flare`, aura = `${id}-aura`, hidden = `${id}-hidden`, fade = `${id}-fade`, shade = `${id}-shade`, beam = `${id}-beam`, soft = `${id}-soft`;
  // The light the studio light throws: from its lens, spreading past where the stream goes in behind him.
  const lens = [sx + ax * 45, top + sy + ay * 45], far = Math.hypot(enter[0] - sx, enter[1] - sy) + 330, wide = far * 0.46;
  const cone = [[lens[0] - ay * 18, lens[1] + ax * 18], [lens[0] + ay * 18, lens[1] - ax * 18], [lens[0] + ax * far + ay * wide, lens[1] + ay * far - ax * wide], [lens[0] + ax * far - ay * wide, lens[1] + ay * far + ax * wide]];
  const cue = (c: string) => p.cues.find((k) => k.id === c)!;
  const place = (x: number, y: number, w?: number): CSSProperties => ({ left: `${(x / W) * 100}%`, top: `${(y / p.h) * 100}%`, width: w ? `${(w / W) * 100}%` : undefined });
  const pick = (i: number) => {
    if (i === tab) return;
    setTab(i);
    const el = document.getElementById(`${id}-tab-${i}`), on = board.current;
    if (!el || !on || !got('behind')) { pulse.current = null; return; }
    const r = el.getBoundingClientRect(), b = on.getBoundingClientRect();
    const x = ((r.left + r.width / 2 - b.left) / b.width) * W;
    pulse.current = { t: clock.now(), from: nearest(p.line, x, top + runAt(x)) };
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
        <h1 className={styles.heading}>A fuller draft, seventh round</h1>
        <p className={styles.lede}>
          Your portrait as the ground of About with the words even with you, nothing of About readable until the light is
          on you, and three rows of skills. Scroll: the line is the stream. The buttons at the foot of the screen play a
          section again, run it at half speed, or put the stream back on the desk’s front edge.
        </p>
        <ul className={styles.caveats}>
          <li>Beside the rows the stream turns in to strike the small thing at the left of each row, and the row comes on at its strike.</li>
          <li>The headphones hang on a hook, and rock on it when the stream strikes the lamp.</li>
          <li>Three skill sets: Product Leadership is out. The numbers are gone, and a row’s groups stand further apart.</li>
          <li>The small outline beside each name is a stand in for a 3D thing you could turn with the cursor. It marks a size and a place. It is a suggestion and nothing agreed, and none of the three is a design.</li>
          <li>The lists are a first cut of your résumé’s: the big ones kept, the doubles and the keywords gone. Game Development is under Full-Stack Engineering. Yours to correct.</li>
          <li>About is in this order: the stream runs over the top and strikes the studio light, the light comes on and you come out of the dark, the stream goes in behind you and the glow comes up, and only then the title, the tabs and the text. Scrolling back up takes it all away again.</li>
          <li>The block of words is centered on you top to bottom. Its text is a placeholder: your live site’s paragraphs under two tabs.</li>
          <li>The stream follows the line you drew: past your jaw, in at the side of your neck over your own left shoulder, behind your chest, and out at the lower left.</li>
          <li>At the desk the stream strikes the lamp and falls on past the desk’s near end. The lamp comes on, then the screens, then the PC. The PC’s long glass side faces you.</li>
          <li>The desk, the PC, the headphones, the reflector and the studio light are outlines. The stream is still a line. Type sizes and spacing are a first pass.</li>
          <li>For judging: where things sit, what appears when, in what order, how fast. Not a phone.</li>
        </ul>
      </header>

      <div ref={board} className={styles.board} style={{ aspectRatio: `${W} / ${p.h}`, '--slow': slow ? 2 : 1, '--lean': ABOUT.lean } as CSSProperties}>
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
            {/* Behind him the stream is not seen. The mask is his own outline, and lets the stream back in under him,
                where the picture has faded away. */}
            <filter id={shade}>
              <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" />
            </filter>
            <linearGradient id={fade} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="1" stopColor="#fff" />
            </linearGradient>
            <linearGradient id={beam} gradientUnits="userSpaceOnUse" x1={f1(lens[0])} y1={f1(lens[1])} x2={f1(lens[0] + ax * far)} y2={f1(lens[1] + ay * far)}>
              <stop offset="0" stopColor="var(--hot)" stopOpacity="0.62" />
              <stop offset="0.2" stopColor="var(--flame)" stopOpacity="0.4" />
              <stop offset="0.65" stopColor="var(--ember)" stopOpacity="0.36" />
              <stop offset="1" stopColor="var(--ember)" stopOpacity="0" />
            </linearGradient>
            <filter id={soft} x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="20" />
            </filter>
            <mask id={hidden} maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={p.h}>
              <rect x={0} y={0} width={W} height={p.h} fill="#fff" />
              <image href="/media/portrait-cut-960.webp" x={P.x} y={top + P.y} width={P.w} height={P.h} filter={`url(#${shade})`} className={styles.shade} />
              <rect x={P.x} y={top + P.y + P.h * 0.93} width={P.w} height={P.h * 0.1} fill={`url(#${fade})`} />
            </mask>
          </defs>
          <g transform={tr(0, p.skills)}>
            <Workbench shown={got('near')} on={got('desk')} sweep={desk === 'lamp'} />
            <Phones at={SKILLS.phones} shown={got('title')} lively struck={got('desk')} />
          </g>
          <ellipse cx={P.x + P.w / 2} cy={top + P.y + P.h * 0.42} rx={590} ry={440} fill={`url(#${aura})`} className={styles.aura} data-on={got('behind')} />
          <polygon points={cone.map(([x, y]) => `${f1(x)},${f1(y)}`).join(' ')} fill={`url(#${beam})`} filter={`url(#${soft})`} className={styles.aura} data-on={got('throw')} />
          {/* The first thing it strikes: a round reflector seen nearly edge on, its face up and to the right. */}
          <g transform={`${tr(fx, top + fy)} rotate(${45 + ABOUT.first.grade / 2})`} className={styles.prop}>
            <line x1={0} y1={16} x2={0} y2={44} />
            <circle cx={0} cy={50} r={7} />
            <ellipse cx={0} cy={8} rx={50} ry={9} />
            <ellipse cx={0} cy={5} rx={42} ry={5} />
          </g>
          <g className={styles.prop}>
            <line x1={sx} y1={top + sy} x2={sx} y2={top + sy - 62} />
            <rect x={sx - 22} y={top + sy - 68} width={44} height={6} rx={2} />
          </g>
          <g mask={`url(#${hidden})`}>
            <g ref={stream} className={styles.line}>
              {[styles.haze, styles.glow, styles.body, styles.core].map((c) => <path key={c} d={p.line.d} className={c} strokeDasharray="0 99999" />)}
            </g>
          </g>
          {/* The second: a studio light aimed at his shoulder. The stream goes in at its side and comes out of its lens. */}
          <g transform={`${tr(sx, top + sy)} rotate(${180 - ABOUT.enter.angle})`} className={styles.prop}>
            <rect x={-46} y={-13} width={12} height={26} rx={3} />
            <rect x={-36} y={-24} width={72} height={48} rx={10} />
            <rect x={36} y={-27} width={9} height={54} rx={2} />
            <path d="M45 -27 L70 -44 L70 -38 L45 -21 Z M45 27 L70 44 L70 38 L45 21 Z" />
            <circle r={6} />
          </g>
          <g mask={`url(#${hidden})`}>
            {['desk', 'about', 'throw', ...COMPETENCIES.map((_, i) => `row${i}`)].map((c) => (
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
          </g>
          <g ref={spark} className={styles.lead}>
            <circle r={46} fill={`url(#${flare})`} />
            <circle r={4.4} className={styles.dot} />
          </g>
        </svg>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/media/portrait-cut-1600.webp" alt="Brandon Church" className={styles.portrait} data-on={got('throw')} style={place(P.x, top + P.y, P.w)} />

        <h2 className={styles.title} data-on={got('title')} style={place(SKILLS.title[0], p.skills + SKILLS.title[1] - 60)}>Skills</h2>
        <div ref={list} className={styles.rows} style={place(R.l, p.skills + R.t, R.r - R.l)}>
          {COMPETENCIES.map((c, i) => (
            <article key={c.name} className={styles.row} data-on={got(`row${i}`)}>
              <svg className={`${styles.thing} ${styles.reveal}`} viewBox="0 0 96 96" aria-hidden="true">{THINGS[i]}</svg>
              <h3 className={`${styles.name} ${styles.reveal}`} style={{ '--d': 1 } as CSSProperties}>{c.name}</h3>
              <dl className={`${styles.groups} ${styles.reveal}`} style={{ '--d': 2 } as CSSProperties}>
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
          <h2 className={styles.title} data-on={got('behind')} style={{ ...place(T.l, top + T.title), transitionDelay: got('behind') ? 'calc(var(--slow, 1) * 0.5s)' : '0s' }}>About</h2>
          <div className={`${styles.tabs} ${styles.reveal}`} role="tablist" aria-label="About" data-on={got('behind')} style={{ ...place(T.l, top + T.tabs, T.w), '--d': 8 } as CSSProperties}>
            {ABOUT_TABS.map((t, i) => (
              <button key={t.name} type="button" role="tab" id={`${id}-tab-${i}`} aria-selected={tab === i} aria-controls={`${id}-panel`} tabIndex={tab === i ? 0 : -1} className={styles.tab} onClick={() => pick(i)} onKeyDown={(e) => step(e, i)}>{t.name}</button>
            ))}
          </div>
          <div className={`${styles.panelText} ${styles.reveal}`} role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${tab}`} data-on={got('behind')} data-swapping={showing !== tab} style={{ ...place(T.l, top + T.text, T.w), '--d': 10 } as CSSProperties}>
            <p className={styles.note}>Placeholder text</p>
            {ABOUT_TABS[showing].text.map((para) => <p key={para.slice(0, 24)}>{para}</p>)}
          </div>
        </section>
      </div>

      {ui && (
        <div className={styles.panel}>
          <div className={styles.controls}>
            <div className={styles.group} role="group" aria-label="How the stream meets the desk">
              <span className={styles.groupName}>Stream at the desk</span>
              <button type="button" className={styles.choice} aria-pressed={desk === 'lamp'} onClick={() => setDesk('lamp')}>Onto the lamp</button>
              <button type="button" className={styles.choice} aria-pressed={desk === 'edge'} onClick={() => setDesk('edge')}>Along the front edge</button>
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
