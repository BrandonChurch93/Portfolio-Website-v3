'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { READING_LINE } from '../../config/site';
import { point, reach, type Pt } from '../../page-sketch/plan';
import { ABOUT, APRON, CX, DESKS, SKILLS, SKILL_ROWS, TABS, W, plan, type Desk as DeskPlan, type Rows } from '../../skills-about/plan';
import { clock } from '../../world/clock';
import styles from './SkillsAbout.module.css';

type Appear = 'stream' | 'all';

const STEPS = [
  'Comes in at the middle, from Work’s button.',
  'As it nears the desk, the desk comes out of the dark.',
  'Lands on the desk. The lamp, the screen and the PC come on. The title and the headphones appear.',
  'Runs the desk’s front edge. The four rows come on one after another.',
  'Is thrown off the far corner and falls down the left side.',
  'Lands on the rail. About’s words appear and your portrait fades in.',
  'Passes behind your shoulders. The light behind you is the stream.',
  'Leaves at the right, toward Contact.',
];

const tr = (x: number, y: number) => `translate(${x} ${y})`;
const quad = (pts: Pt[]) => pts.map((q) => `${q[0]},${q[1]}`).join(' ');

function Bars({ x, y, widths, step = 20, h = 9 }: { x: number; y: number; widths: number[]; step?: number; h?: number }) {
  return <>{widths.map((w, i) => <rect key={i} x={x} y={y + i * step} width={w} height={h} rx={h / 2} className={styles.bar} />)}</>;
}

// The desk as proposed: longer, its front edge running down to the left, the PC under its near end. An outline at the
// size and angle it would have. The desk itself is designed and made as its own piece of work.
function Desk({ desk, shown, on }: { desk: DeskPlan; shown: boolean; on: boolean }) {
  const [bl, br, fr, fl] = desk.top, a = APRON, f = desk.pc, [px, py] = f[0], h = f[3][1] - py;
  const at = (x: number, y: number): Pt => [px + x, py + y - x * 0.146];
  return (
    <g className={styles.obj} data-shown={shown} data-on={on}>
      <polygon points={quad([[br[0] - 8, br[1] + a], [br[0] + 12, br[1] + a], [br[0] + 12, br[1] + 200], [br[0] - 8, br[1] + 204]])} className={styles.solid} />
      <polygon points={quad([[190, 533], [206, 531], [206, 636], [190, 640]])} className={styles.solid} />
      <polygon points={quad([f[1], [f[1][0] + 20, f[1][1] - 12], [f[2][0] + 20, f[2][1] - 14], f[2]])} className={styles.solid} />
      <polygon points={quad(f)} className={styles.solid} />
      <polygon points={quad([at(10, 12), [f[1][0] - 10, f[1][1] + 13], [f[2][0] - 10, f[2][1] - 10], [f[3][0] + 10, f[3][1] - 12]])} className={`${styles.dim} ${styles.lit}`} />
      {[0.25, 0.51, 0.77].map((t) => <circle key={t} cx={at(27, h * t)[0]} cy={at(27, h * t)[1]} r={h * 0.088} className={`${styles.ring} ${styles.lit}`} />)}
      <circle cx={at(84, h * 0.25)[0]} cy={at(84, h * 0.25)[1]} r={h * 0.082} className={`${styles.ring} ${styles.lit}`} />
      <polygon points={quad([at(52, h * 0.47), at(112, h * 0.47), at(112, h * 0.59), at(52, h * 0.59)])} className={styles.ink} />
      <polygon points={quad([br, fr, [fr[0], fr[1] + a], [br[0], br[1] + a]])} className={styles.solid} />
      <polygon points={quad([fr, fl, [fl[0], fl[1] + a], [fr[0], fr[1] + a]])} className={styles.solid} />
      <polygon points={quad([[158, 538], [184, 534], [184, 748], [158, 748]])} className={styles.solid} />
      <polygon points={quad([[fr[0] - 24, fr[1] + a + 4], [fr[0], fr[1] + a], [fr[0], fr[1] + 210 - (desk.long ? 26 : 0)], [fr[0] - 24, fr[1] + 214 - (desk.long ? 26 : 0)]])} className={styles.solid} />
      <polygon points={quad([bl, br, fr, fl])} className={styles.solid} />
      <polygon points={quad([[600, 246], [684, 254], [706, 420], [540, 416]])} className={`${styles.cone} ${styles.lit}`} />
      <polygon points={quad([[440, 340], [464, 338], [466, 386], [442, 388]])} className={styles.solid} />
      <ellipse cx={454} cy={392} rx={62} ry={12} className={styles.solid} />
      <polygon points={quad([[292, 172], [604, 148], [608, 336], [298, 362]])} className={styles.solid} />
      <polygon points={quad([[304, 184], [594, 162], [597, 326], [309, 350]])} className={`${styles.glass} ${styles.lit}`} />
      <polygon points={quad([[204, 440], [326, 424], [338, 474], [210, 492]])} className={styles.solid} />
      <polygon points={quad([[214, 448], [318, 434], [327, 468], [219, 483]])} className={`${styles.glass} ${styles.lit}`} />
      <polygon points={quad([[372, 440], [566, 416], [580, 446], [382, 472]])} className={styles.solid} />
      <ellipse cx={600} cy={432} rx={15} ry={10} className={styles.solid} />
      <ellipse cx={640} cy={392} rx={28} ry={7} className={styles.solid} />
      <line x1={640} y1={390} x2={628} y2={236} className={styles.leg} />
      <polygon points={quad([[598, 206], [670, 216], [688, 256], [594, 246]])} className={styles.solid} />
      {desk.long && (
        <>
          <polygon points={quad([[850, 352], [1010, 334], [1026, 372], [862, 392]])} className={styles.solid} />
          <line x1={938} y1={343} x2={946} y2={382} className={styles.ink} />
          <ellipse cx={1120} cy={338} rx={20} ry={9} className={styles.solid} />
          <path d="M1100 338 v-30 h40 v30" className={styles.solid} />
        </>
      )}
    </g>
  );
}

// A pair of over ear headphones hanging from a hook, of the site's own design.
function Phones({ shown }: { shown: boolean }) {
  return (
    <g className={styles.obj} data-shown={shown} data-on={shown} transform={tr(SKILLS.phones.x, SKILLS.phones.y)}>
      <line x1={0} y1={-16} x2={0} y2={4} className={styles.leg} />
      <circle cx={0} cy={4} r={5} className={styles.solid} />
      <path d="M-46 92 C-46 30 -26 8 0 8 C26 8 46 30 46 92" className={styles.ink} />
      <path d="M-37 92 C-37 38 -21 17 0 17 C21 17 37 38 37 92" className={styles.ink} />
      <rect x={-62} y={78} width={32} height={62} rx={13} className={styles.solid} />
      <rect x={30} y={78} width={32} height={62} rx={13} className={styles.solid} />
      <rect x={-36} y={88} width={8} height={42} rx={4} className={styles.ink} />
      <rect x={28} y={88} width={8} height={42} rx={4} className={styles.ink} />
    </g>
  );
}

// Study 21: Skills and About as a pair. ?rows=under, ?appear=all, ?notes=0, ?whole and ?ui=0 open it on those.
export function SkillsAbout() {
  const id = useId().replace(/:/g, '');
  const [rows, setRows] = useState<Rows>('beside');
  const [appear, setAppear] = useState<Appear>('stream');
  const [notes, setNotes] = useState(true);
  const [ui, setUi] = useState(true);
  const [whole, setWhole] = useState(false);
  const [reached, setReached] = useState<Set<string>>(new Set());
  const svg = useRef<SVGSVGElement>(null), stream = useRef<SVGGElement>(null), head = useRef<SVGGElement>(null), at = useRef(0);
  const p = useMemo(() => plan(rows), [rows]);
  const live = useRef({ p, reached, whole });
  live.current = { p, reached, whole };

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.get('rows') === 'under') setRows('under');
    if (q.get('appear') === 'all') setAppear('all');
    if (q.get('notes') === '0') setNotes(false);
    if (q.get('ui') === '0') setUi(false);
    if (q.has('whole')) setWhole(true);
  }, []);

  useEffect(() => clock.onFrame((_, dt) => {
    const el = svg.current, { p: P, reached: was, whole: held } = live.current;
    if (!el) return;
    const box = el.getBoundingClientRect(), scale = box.width / W, l = P.line;
    const want = held ? l.total : reach(l, (innerHeight * READING_LINE - box.top) / scale);
    const len = dt <= 0 || clock.isFrozen() || held ? want : at.current + (want - at.current) * Math.min(1, dt * 9);
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
    if (next.size !== was.size || [...next].some((k) => !was.has(k))) setReached(next);
  }), []);

  const got = (k: string) => appear === 'all' || reached.has(k);
  const cue = (k: string) => p.cues.find((c) => c.id === k)!;
  const R = ABOUT.rail, P = ABOUT.portrait, at_ = SKILLS[rows], beside = rows === 'beside';
  const fade = `${id}-fade`, flare = `${id}-flare`, aura = `${id}-aura`;
  const land = cue('desk'), rail = cue('about');
  const marks: Pt[] = [
    [CX + 30, 44], [CX + 30, land.y - 150], [land.x + 34, land.y - 26], [430, land.y + 84], [88, p.skills + 650],
    [rail.x + 34, rail.y - 30], [1296, p.about + 284], [1392, p.about + 470],
  ];

  return (
    <main className={styles.main}>
      <header className={styles.head}>
        <p className={styles.label}>Study 21 · Skills and About</p>
        <h1 className={styles.heading}>The two sections, as a pair</h1>
        <p className={styles.lede}>
          A rough draft, for where things sit, where the stream goes and what it brings onto the page. Scroll: the line is the
          stream, and its leading end follows you. Each section is dark until the stream reaches it.
        </p>
        <ol className={styles.steps}>{STEPS.map((s) => <li key={s}>{s}</li>)}</ol>
        <ul className={styles.caveats}>
          <li>The desk, the PC and the headphones are outlines at the size they would have. Each is still to be designed and made.</li>
          <li>The four names and the line under each are your live site’s. Grey bars stand for the rest of the words.</li>
          <li>Not for judging: the look, the motion, the 3D, or a phone.</li>
        </ul>
      </header>

      <svg ref={svg} className={styles.sheet} viewBox={`0 0 ${W} ${p.h}`} role="img" aria-label="A wireframe of the Skills and About sections, with a line for the stream">
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
          <linearGradient id={`${fade}-g`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0.76" stopColor="#fff" />
            <stop offset="1" stopColor="#000" />
          </linearGradient>
          <mask id={fade} maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill={`url(#${fade}-g)`} /></mask>
        </defs>

        <g transform={tr(0, p.skills)}>
          <Desk desk={DESKS[rows]} shown={got('near')} on={got('desk')} />
          <g className={styles.words} data-on={got('desk')}>
            <text x={SKILLS.title.x} y={SKILLS.title.y} className={styles.title}>SKILLS</text>
            <Bars x={SKILLS.title.x} y={SKILLS.title.y + 50} widths={[440, 400, 300]} step={22} h={10} />
          </g>
          <Phones shown={got('desk')} />
          {SKILL_ROWS.map(([name, line], i) => {
            const y = at_.t + i * at_.step, w = at_.r - at_.l;
            return (
              <g key={name} className={styles.words} data-on={got(`row${i}`)}>
                {beside ? (
                  <>
                    <text x={at_.l} y={y + 20} className={styles.rowName}>{name}</text>
                    <text x={at_.l} y={y + 48} className={styles.rowLine}>{line}</text>
                    <Bars x={at_.l} y={y + 64} widths={[[w, w - 30, w - 10, w - 50][i], [320, 260, 360, 220][i]]} />
                    <line x1={at_.l} y1={y + 100} x2={at_.r} y2={y + 100} className={styles.rule} />
                  </>
                ) : (
                  <>
                    <text x={at_.l} y={y + 26} className={styles.rowName}>{name}</text>
                    <text x={at_.l + 340} y={y + 25} className={styles.rowLine}>{line}</text>
                    <Bars x={at_.l + 720} y={y + 14} widths={[[440, 400, 430, 360][i]]} h={10} />
                    <line x1={at_.l} y1={y + 56} x2={at_.r} y2={y + 56} className={styles.rule} />
                  </>
                )}
              </g>
            );
          })}
        </g>

        <g transform={tr(0, p.about)}>
          <g className={styles.obj} data-shown="true" data-on="true">
            <line x1={R.ax} y1={R.ay + 5} x2={R.bx} y2={R.by + 5} className={styles.railBar} />
            <path d={`M${R.ax} ${R.ay - 3} l-28 -1 l28 14 Z M${R.bx} ${R.by} l26 12 l-27 1 Z`} className={styles.solid} />
          </g>
          <ellipse cx={P.x + P.w * 0.5} cy={R.ay + (R.by - R.ay) * 0.76} rx={380} ry={210} fill={`url(#${aura})`} className={styles.aura} data-on={got('behind')} />
          <g className={styles.words} data-on={got('about')}>
            <text x={ABOUT.title.x} y={ABOUT.title.y} className={styles.title}>ABOUT</text>
            {TABS.map((t, i) => <text key={t} x={ABOUT.title.x + [0, 122, 300][i]} y={ABOUT.title.y + 62} className={styles.cat} data-pressed={i === 0}>{t}</text>)}
            <line x1={ABOUT.title.x} y1={ABOUT.title.y + 78} x2={620} y2={ABOUT.title.y + 78} className={styles.rule} />
            <Bars x={ABOUT.title.x} y={ABOUT.title.y + 108} widths={[460, 440, 470, 420, 300]} step={22} h={10} />
          </g>
        </g>

        <g ref={stream} className={styles.line}>
          {[styles.haze, styles.glow, styles.body, styles.core].map((c) => <path key={c} d={p.line.d} className={c} strokeDasharray="0 99999" />)}
        </g>
        {[land, rail].map((k) => (
          <g key={k.id} className={styles.strike} data-on={reached.has(k.id)} transform={tr(k.x, k.y)}>
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

        <image href="/media/portrait-cut-960.webp" x={P.x} y={p.about + P.y} width={P.w} height={P.h} mask={`url(#${fade})`} className={styles.portrait} data-on={got('about')} />

        {notes && marks.map(([x, y], i) => (
          <g key={i} transform={tr(x, y)} className={styles.mark}>
            <circle r={12} />
            <text y={4.5} textAnchor="middle">{i + 1}</text>
          </g>
        ))}
      </svg>

      {ui && (
        <div className={styles.panel}>
          <div className={styles.controls}>
            <div className={styles.group} role="group" aria-label="Where the rows of skills sit">
              <span className={styles.groupName}>Skills rows</span>
              <button type="button" className={styles.choice} aria-pressed={beside} onClick={() => setRows('beside')}>Beside the desk</button>
              <button type="button" className={styles.choice} aria-pressed={!beside} onClick={() => setRows('under')}>Under it</button>
            </div>
            <div className={styles.group} role="group" aria-label="What brings each section onto the page">
              <span className={styles.groupName}>Appears</span>
              <button type="button" className={styles.choice} aria-pressed={appear === 'stream'} onClick={() => setAppear('stream')}>With the stream</button>
              <button type="button" className={styles.choice} aria-pressed={appear === 'all'} onClick={() => setAppear('all')}>All showing</button>
            </div>
            <div className={styles.group} role="group" aria-label="The numbers on the drawing">
              <span className={styles.groupName}>Numbers</span>
              <button type="button" className={styles.choice} aria-pressed={notes} onClick={() => setNotes(true)}>On</button>
              <button type="button" className={styles.choice} aria-pressed={!notes} onClick={() => setNotes(false)}>Off</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
