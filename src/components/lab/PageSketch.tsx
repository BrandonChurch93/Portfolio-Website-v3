'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { READING_LINE, SITE_NAME } from '../../config/site';
import { ABOUT, CITY, CONTACT, CX, HITS, PIECES, SKILLS, W, WORK, plan, point, reach, type Plan, type Pt } from '../../page-sketch/plan';
import { CATEGORIES } from '../../work-surge/surge';
import { clock } from '../../world/clock';
import styles from './PageSketch.module.css';

// Study 18: the whole home page as a wireframe, hero to footer. A line stands in for the stream and its leading end
// follows the scroll. Grey bars stand for words, which are his to write. The 3D pieces are outlines at the size and
// place they would have. ?sleep=none|mix|all, ?notes=0, ?view=whole and ?ui=0 open it on those.

type Sleep = 'none' | 'mix' | 'all';
type View = 'scroll' | 'whole';
const SLEEPS: { id: Sleep; name: string }[] = [{ id: 'none', name: 'Nothing' }, { id: 'mix', name: 'A mix' }, { id: 'all', name: 'Everything' }];
const SECTIONS = ['Work', 'Skills', 'About', 'Contact'] as const;
const TABS = ['About me', 'What I want to do', 'My plans for the future'];
const MAX_WIDTH = 1720;
const HERO = { min: 760, max: 1100 };
const LAUNCH = { over: 150, lift: 170 };

const tr = (x: number, y: number) => `translate(${x} ${y})`;
const quad = (pts: Pt[]) => pts.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' ');

function Bars({ x, y, widths, step = 22, h = 10 }: { x: number; y: number; widths: number[]; step?: number; h?: number }) {
  return <>{widths.map((w, i) => <rect key={i} x={x} y={y + i * step} width={w} height={h} rx={h / 2} className={styles.bar} />)}</>;
}

function Tag({ x, y, children, end }: { x: number; y: number; children: ReactNode; end?: boolean }) {
  return <text x={x} y={y} textAnchor={end ? 'end' : 'start'} className={styles.tag}>{children}</text>;
}

function City() {
  return (
    <g className={styles.obj} data-on="true">
      <ellipse cy={40} rx={330} ry={120} className={styles.pool} />
      <path d="M-270 0 V24 A270 78 0 0 0 270 24 V0" className={styles.solid} />
      <ellipse rx={270} ry={78} className={styles.solid} />
      <ellipse cy={-4} rx={198} ry={55} className={styles.ink} />
      <ellipse cy={-8} rx={118} ry={31} className={styles.ink} />
      <path d="M-190 -14 v-26 h30 v26 M-155 -20 v-34 h22 v34 M150 -22 v-30 h28 v30 M186 -14 v-22 h26 v22" className={styles.solid} />
      <rect x={-132} y={-226} width={26} height={200} className={styles.solid} />
      <rect x={-102} y={-238} width={26} height={212} className={styles.solid} />
      <path d="M-50 -24 V-262 H50 V-24 H24 V-236 H-24 V-24 Z" className={styles.solid} />
      <rect x={78} y={-272} width={30} height={246} rx={14} className={styles.solid} />
      <rect x={110} y={-228} width={26} height={202} rx={13} className={styles.solid} />
      <path d="M-16 -30 L-5 -300 L0 -470 L5 -300 L16 -30 Z" className={styles.solid} />
      <ellipse cy={-338} rx={42} ry={9} className={styles.solid} />
      <circle cy={-385} r={22} className={styles.solid} />
      <path d="M-50 -14 a20 20 0 0 1 40 0" className={styles.ink} />
    </g>
  );
}

function Handheld({ on }: { on: boolean }) {
  return (
    <g className={styles.obj} data-on={on}>
      <ellipse cy={150} rx={230} ry={26} className={`${styles.pool} ${styles.lit}`} />
      <path d="M-205 150 L-190 78 H190 L205 150 Z" className={styles.solid} />
      <path d="M-190 78 L-170 52 H170 L190 78 Z" className={styles.solid} />
      <rect x={-52} y={-148} width={104} height={22} className={styles.solid} />
      <path d="M-150 -128 H150 L178 -98 V38 L150 66 H-150 L-178 38 V-98 Z" className={styles.solid} />
      <rect x={-98} y={-104} width={196} height={136} rx={10} className={styles.ink} />
      <rect x={-84} y={-92} width={168} height={108} rx={4} className={styles.ink} />
      <rect x={-84} y={-92} width={168} height={108} rx={4} className={`${styles.glass} ${styles.lit}`} />
      <path d="M-76 8 v-22 h18 v-14 h16 v26 h20 v-34 h18 v22 h22 v-16 h16 v30 h20 v-24 h18 v32" className={`${styles.hot} ${styles.lit}`} />
      <path d="M-146 -62 h20 v16 h16 v20 h-16 v16 h-20 v-16 h-16 v-20 h16 Z" className={styles.ink} />
      <circle cx={140} cy={-52} r={13} className={styles.ink} />
      <circle cx={118} cy={-22} r={13} className={styles.ink} />
      <circle cx={-134} cy={36} r={14} className={styles.ink} />
      <circle cx={136} cy={36} r={14} className={styles.ink} />
      <rect x={-34} y={46} width={26} height={9} rx={4.5} className={styles.ink} />
      <rect x={8} y={46} width={26} height={9} rx={4.5} className={styles.ink} />
    </g>
  );
}

function Camera({ on }: { on: boolean }) {
  return (
    <g className={styles.obj} data-on={on}>
      <ellipse cx={20} cy={182} rx={150} ry={18} className={`${styles.pool} ${styles.lit}`} />
      <path d="M36 -20 L-88 176 M48 -20 L118 180 M42 -20 L30 150" className={styles.leg} />
      <circle cx={42} cy={-36} r={17} className={styles.solid} />
      <circle cx={64} cy={-34} r={7} className={styles.solid} />
      <rect x={20} y={-56} width={44} height={8} className={styles.solid} />
      <rect x={-40} y={-190} width={165} height={16} className={styles.solid} />
      <rect x={-30} y={-199} width={22} height={10} className={styles.solid} />
      <rect x={60} y={-199} width={26} height={10} className={styles.solid} />
      <rect x={-40} y={-176} width={165} height={122} rx={8} className={styles.solid} />
      <rect x={-30} y={-168} width={26} height={14} className={styles.ink} />
      <path d="M-40 -152 L-86 -164 V-58 L-40 -70 Z" className={styles.solid} />
      <ellipse cx={-92} cy={-111} rx={36} ry={54} className={styles.solid} />
      <ellipse cx={-94} cy={-111} rx={24} ry={38} className={styles.ink} />
      <ellipse cx={-94} cy={-111} rx={24} ry={38} className={`${styles.glass} ${styles.lit}`} />
      <path d="M-108 -128 q10 -16 24 -14" className={`${styles.hot} ${styles.lit}`} />
    </g>
  );
}

function Desk({ on }: { on: boolean }) {
  const d = SKILLS.desk, poly = (pts: Pt[]) => quad(pts.map(([x, y]) => d(x, y)));
  const at = (x: number, y: number) => { const [cx, cy] = d(x, y); return { cx, cy }; };
  return (
    <g className={styles.obj} data-on={on}>
      <polygon points={poly([[165, 624], [205, 628], [232, 930], [192, 930]])} className={styles.solid} />
      <polygon points={poly([[1175, 744], [1215, 748], [1222, 960], [1182, 960]])} className={styles.solid} />
      <polygon points={poly([[345, 600], [375, 603], [385, 820], [355, 820]])} className={styles.solid} />
      <polygon points={poly([[150, 590], [1250, 718], [1250, 752], [150, 624]])} className={styles.solid} />
      <polygon points={poly([[150, 590], [1250, 718], [1215, 470], [330, 425]])} className={styles.solid} />
      <polygon points={poly([[380, 262], [440, 270], [540, 565], [290, 578]])} className={`${styles.cone} ${styles.lit}`} />
      <polygon points={poly([[758, 402], [796, 404], [796, 492], [758, 492]])} className={styles.solid} />
      <ellipse {...at(777, 497)} rx={45} ry={11} className={styles.solid} />
      <polygon points={poly([[540, 112], [1045, 135], [1022, 420], [545, 385]])} className={styles.solid} />
      <polygon points={poly([[554, 127], [1032, 149], [1010, 404], [558, 371]])} className={`${styles.glass} ${styles.lit}`} />
      <polygon points={poly([[300, 455], [505, 450], [515, 570], [298, 580]])} className={styles.solid} />
      <polygon points={poly([[312, 466], [494, 462], [503, 560], [310, 568]])} className={`${styles.glass} ${styles.lit}`} />
      <polygon points={poly([[600, 530], [830, 535], [840, 605], [585, 598]])} className={styles.solid} />
      <ellipse {...at(938, 598)} rx={13} ry={15} className={styles.solid} />
      <polygon points={poly([[1010, 560], [1120, 570], [1130, 640], [1005, 628]])} className={styles.solid} />
      <ellipse {...at(1035, 612)} rx={20} ry={22} className={styles.solid} />
      <ellipse {...at(1175, 512)} rx={14} ry={20} className={styles.solid} />
      <ellipse {...at(372, 442)} rx={28} ry={7} className={styles.solid} />
      <line x1={d(372, 440)[0]} y1={d(372, 440)[1]} x2={d(362, 250)[0]} y2={d(362, 250)[1]} className={styles.leg} />
      <polygon points={poly([[352, 214], [478, 236], [432, 270], [356, 250]])} className={styles.solid} />
    </g>
  );
}

function Pc({ on }: { on: boolean }) {
  const { l, t, r, b } = SKILLS.pc;
  return (
    <g className={styles.obj} data-on={on}>
      <ellipse cx={(l + r) / 2} cy={b + 8} rx={170} ry={16} className={`${styles.pool} ${styles.lit}`} />
      <rect x={l} y={t} width={r - l} height={b - t} rx={10} className={styles.solid} />
      <rect x={l + 88} y={t + 12} width={r - l - 98} height={234} rx={4} className={styles.ink} />
      <rect x={l + 88} y={t + 12} width={r - l - 98} height={234} rx={4} className={`${styles.glass} ${styles.lit}`} />
      <line x1={l + 82} y1={t + 4} x2={l + 82} y2={b - 4} className={styles.ink} />
      <rect x={l + 88} y={t + 252} width={r - l - 98} height={28} rx={3} className={styles.ink} />
      {[52, 128, 204].map((y) => (
        <g key={y}>
          <circle cx={l + 41} cy={t + y} r={30} className={styles.ink} />
          <circle cx={l + 41} cy={t + y} r={30} className={`${styles.ring} ${styles.lit}`} />
          <circle cx={l + 41} cy={t + y} r={9} className={styles.ink} />
        </g>
      ))}
      <circle cx={l + 150} cy={t + 80} r={34} className={styles.ink} />
      <circle cx={l + 150} cy={t + 80} r={34} className={`${styles.ring} ${styles.lit}`} />
      <circle cx={l + 150} cy={t + 80} r={8} className={styles.ink} />
      {[200, 211, 222].map((x) => <rect key={x} x={l + x} y={t + 40} width={6} height={80} className={styles.ink} />)}
      <rect x={l + 100} y={t + 152} width={132} height={34} rx={4} className={styles.ink} />
      <circle cx={l + 133} cy={t + 169} r={12} className={styles.ink} />
      <circle cx={l + 181} cy={t + 169} r={12} className={styles.ink} />
      <line x1={l + 94} y1={t + 18} x2={r - 16} y2={t + 18} className={`${styles.hot} ${styles.lit}`} />
      <line x1={l + 100} y1={t + 190} x2={l + 232} y2={t + 190} className={`${styles.hot} ${styles.lit}`} />
    </g>
  );
}

function Blank() {
  const { w, h, r } = WORK.card;
  return (
    <g className={styles.blank}>
      <rect width={w} height={h} rx={r} className={styles.solid} />
      <rect x={14} y={14} width={w - 28} height={h - 28} rx={6} className={styles.ink} />
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2;
        return <line key={i} x1={w / 2 + Math.cos(a) * 34} y1={h / 2 + Math.sin(a) * 34} x2={w / 2 + Math.cos(a) * 190} y2={h / 2 + Math.sin(a) * 190} className={styles.ray} />;
      })}
      <path d={`M${w / 2} ${h / 2} l-150 150 l42 26 Z`} className={styles.shade} />
      <circle cx={w / 2} cy={h / 2} r={30} className={styles.ink} />
      <circle cx={w / 2} cy={h / 2} r={22} className={styles.solid} />
    </g>
  );
}

function Card({ on }: { on: boolean }) {
  const { w, h, r } = WORK.card;
  return (
    <g className={styles.card} data-on={on}>
      <Blank />
      <g className={styles.face}>
        <rect width={w} height={h} rx={r} className={styles.solid} />
        <rect x={15} y={15} width={w - 30} height={211} rx={9} className={styles.picture} />
        <rect x={15} y={236} width={w - 30} height={30} rx={6} className={styles.band} />
        <rect x={22} y={288} width={260} height={18} rx={9} className={styles.heavy} />
        <Bars x={22} y={326} widths={[388, 408, 400, 280]} />
        {[[22, 108], [136, 90], [232, 104]].map(([x, tw]) => <rect key={x} x={x} y={425} width={tw} height={22} rx={11} className={styles.ink} />)}
        <line x1={22} y1={461} x2={w - 22} y2={461} className={styles.rule} />
        <Bars x={22} y={480} widths={[44]} />
        <Bars x={80} y={480} widths={[44]} />
        <Bars x={350} y={480} widths={[88]} />
      </g>
    </g>
  );
}

function Stone({ on, flip }: { on: boolean; flip?: boolean }) {
  const { x, y, r } = WORK.stone;
  return (
    <g className={styles.obj} data-on={on} transform={tr(flip ? W - x : x, y)}>
      <circle r={r} className={styles.solid} />
      <circle r={r * 0.74} className={styles.ink} />
      <circle r={r * 0.46} className={styles.ink} />
      {Array.from({ length: 12 }, (_, i) => <line key={i} x1={r * 0.82} y1={0} x2={r * 0.94} y2={0} transform={`rotate(${i * 30})`} className={styles.ink} />)}
      <path d="M-9 -5 h6 M3 -5 h6 M-6 8 h12" className={`${styles.hot} ${styles.lit}`} />
    </g>
  );
}

function Rocket({ lifted, on }: { lifted?: boolean; on: boolean }) {
  return (
    <>
      <g className={styles.obj} data-on={on}>
        <ellipse rx={CONTACT.pad.rx} ry={CONTACT.pad.ry} className={styles.solid} />
        <ellipse rx={165} ry={54} className={styles.ink} />
        <ellipse rx={150} ry={46} className={`${styles.basin} ${styles.lit}`} />
        <path d="M-80 -20 V8 M80 -20 V8 M-36 -8 V18 M36 -8 V18" className={styles.leg} />
        <polygon points="-95,-26 -60,-48 60,-48 95,-26 60,-4 -60,-4" className={styles.solid} />
        <rect x={-150} y={-420} width={56} height={394} className={styles.ink} />
        {Array.from({ length: 8 }, (_, i) => <path key={i} d={`M-150 ${-420 + i * 49} l56 49 m0 -49 l-56 49`} className={styles.ink} />)}
        <path d="M-150 -432 H-58 M-70 -432 v22 M-94 -300 H-24 M-94 -200 H-24 M-94 -100 H-24" className={styles.leg} />
      </g>
      <g className={styles.rocket} data-on={on} data-lifted={lifted}>
        <path d="M-15 -52 Q-6 40 0 96 Q6 40 15 -52 Z" className={styles.plume} />
        <path d="M-22 -128 L-48 -64 L-22 -78 Z M22 -128 L48 -64 L22 -78 Z" className={styles.solid} />
        <path d="M-12 -72 L-17 -52 H17 L12 -72 Z" className={styles.solid} />
        <path d="M-22 -72 V-300 Q-22 -372 0 -398 Q22 -372 22 -300 V-72 Z" className={styles.solid} />
        <path d="M-22 -262 H22 M-22 -170 H22" className={styles.ink} />
      </g>
    </>
  );
}

interface SheetProps {
  p: Plan;
  id: string;
  sleep: Sleep;
  notes: boolean;
  // What the stream has reached. null draws the whole line with everything reached.
  reached: Set<string> | null;
  refs?: { groups: (SVGGElement | null)[]; heads: (SVGGElement | null)[]; rocket: { current: SVGGElement | null } };
}

function Sheet({ p, id, sleep, notes, reached, refs }: SheetProps) {
  const got = (k: string) => !reached || reached.has(k);
  const lit = (k: string) => sleep === 'none' || got(k);
  const words = (k: string) => sleep !== 'all' || got(`s-${k}`);
  const H = PIECES.handheld, C = PIECES.camera, R = ABOUT.rail, P = ABOUT.portrait, F = CONTACT.flume, rows = SKILLS.rows;
  const fade = `${id}-fade`, flare = `${id}-flare`, aura = `${id}-aura`;
  const dash = reached ? '0 99999' : undefined;
  return (
    <>
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
          <stop offset="0.62" stopColor="#fff" />
          <stop offset="1" stopColor="#000" />
        </linearGradient>
        <mask id={fade} maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill={`url(#${fade}-g)`} /></mask>
      </defs>

      <g>
        <text x={150} y={64} className={styles.name}>{SITE_NAME}</text>
        {SECTIONS.map((n, i) => <text key={n} x={W - 150 - [279, 186, 102, 0][i]} y={64} textAnchor="end" className={styles.link}>{n}</text>)}
        <g transform={tr(CX, p.text)}>
          <Bars x={-110} y={0} widths={[220]} h={9} />
          <rect x={-330} y={36} width={660} height={46} rx={10} className={styles.heavy} />
          <rect x={-250} y={98} width={500} height={46} rx={10} className={styles.heavy} />
          <Bars x={-230} y={174} widths={[460]} />
          <Bars x={-170} y={196} widths={[340]} />
          <rect x={-176} y={232} width={168} height={48} rx={24} className={styles.primary} />
          <rect x={8} y={232} width={168} height={48} rx={24} className={styles.accent} />
        </g>
        <g transform={tr(CX, p.city)}><City /></g>
        {notes && <Tag x={150} y={92}>a sketch of the whole page · the line stands for the stream · grey bars for words · outlines for the 3D pieces</Tag>}
        {notes && <Tag x={CX + 300} y={p.city - 250}>piece · the city · carried</Tag>}
      </g>

      <g transform={tr(0, p.work)}>
        <text x={CX} y={WORK.base} textAnchor="middle" className={styles.title} data-wide>WORK</text>
        <g className={styles.words} data-on={words('work')}>
          <rect x={WORK.bar.l} y={WORK.bar.t} width={WORK.bar.r - WORK.bar.l} height={WORK.bar.b - WORK.bar.t} rx={16} className={styles.solid} />
          {CATEGORIES.map((c, i) => <text key={c} x={WORK.bar.l + 90 + i * 180} y={WORK.bar.t + 34} textAnchor="middle" className={styles.cat} data-pressed={i === 0}>{c}</text>)}
          <rect x={WORK.button.l} y={WORK.button.t} width={WORK.button.r - WORK.button.l} height={WORK.button.b - WORK.button.t} rx={23} className={styles.primary} />
          <text x={CX} y={WORK.button.t + 29} textAnchor="middle" className={styles.onPrimary}>View all work</text>
        </g>
        {WORK.cards.map((c, i) => <g key={i} transform={tr(c.x, c.y)}><Card on={lit(`card${i}`)} /></g>)}
        <Stone on={got('stoneL')} />
        <Stone on={got('stoneR')} flip />
        {[1, -1].map((m) => {
          const x = (v: number) => (m > 0 ? v : W - v), { ax, ay, bx, by } = WORK.rail;
          return (
            <g key={m} className={styles.obj} data-on="true">
              <line x1={x(ax)} y1={ay + 5} x2={x(bx)} y2={by + 5} className={styles.railBar} />
              <path d={`M${x(ax)} ${ay - 3} l${-28 * m} 5 l${28 * m} 9 Z`} className={styles.solid} />
            </g>
          );
        })}
        {notes && <Tag x={W - 150} y={WORK.base - 30} end>Work · the one section that is built</Tag>}
      </g>

      <g transform={tr(0, p.pieces)}>
        <g transform={tr(H.x, H.y)}><Handheld on={lit('handheld')} /></g>
        <g transform={tr(C.x, C.y)}><Camera on={lit('camera')} /></g>
        <g className={styles.words} data-on={words('pieces')}>
          <text x={H.x - H.w / 2} y={H.y + H.h / 2 + 46} className={styles.label}>Games</text>
          <Bars x={H.x - H.w / 2} y={H.y + H.h / 2 + 62} widths={[250]} />
          <Bars x={H.x - H.w / 2} y={H.y + H.h / 2 + 88} widths={[96]} />
          <text x={C.x + C.w / 2 + 8} y={C.y + C.h / 2 + 46} textAnchor="end" className={styles.label}>Photography</text>
          <Bars x={C.x + C.w / 2 - 242} y={C.y + C.h / 2 + 62} widths={[250]} />
          <Bars x={C.x + C.w / 2 - 88} y={C.y + C.h / 2 + 88} widths={[96]} />
        </g>
        {notes && <Tag x={150} y={4}>between Work and Skills · no title · proposed</Tag>}
        {notes && <Tag x={H.x - H.w / 2} y={H.y - H.h / 2 - 18}>piece · the handheld · carried · proposed here</Tag>}
        {notes && <Tag x={C.x + C.w / 2 + 8} y={C.y - C.h / 2 - 22} end>piece · the camera · carried · proposed here</Tag>}
      </g>

      <g transform={tr(0, p.skills)}>
        <Desk on={lit('desk')} />
        <Pc on={lit('pc')} />
        <g className={styles.words} data-on={words('skills')}>
          <text x={SKILLS.title.x} y={SKILLS.title.y} className={styles.title}>SKILLS</text>
          <Bars x={SKILLS.title.x} y={SKILLS.title.y + 40} widths={[440, 400, 300]} />
          {Array.from({ length: rows.n }, (_, i) => {
            const y = rows.t + i * rows.step;
            return (
              <g key={i}>
                <rect x={rows.l} y={y + 14} width={[150, 190, 130, 170][i]} height={16} rx={8} className={styles.heavy} />
                <Bars x={rows.l + 250} y={y + 17} widths={[[560, 520, 590, 480][i]]} />
                <line x1={rows.l} y1={y + rows.h} x2={rows.r} y2={y + rows.h} className={styles.rule} />
              </g>
            );
          })}
        </g>
        {notes && <Tag x={SKILLS.desk(1250, 0)[0]} y={68}>piece · the workbench · carried · seen from its other side</Tag>}
        {notes && <Tag x={SKILLS.pc.r + 24} y={SKILLS.pc.b + 30}>piece · the PC from the PC Builder · new to this site · proposed here</Tag>}
      </g>

      <g transform={tr(0, p.about)}>
        <g className={styles.obj} data-on="true">
          <line x1={R.ax} y1={R.ay + 5} x2={R.bx} y2={R.by + 5} className={styles.railBar} />
          <path d={`M${R.ax} ${R.ay - 3} l-28 -1 l28 14 Z M${R.bx} ${R.by} l26 12 l-27 1 Z`} className={styles.solid} />
        </g>
        <ellipse cx={P.x + P.w * 0.5} cy={P.y + P.h * 0.56} rx={300} ry={250} fill={`url(#${aura})`} className={styles.glowBase} />
        <ellipse cx={P.x + P.w * 0.5} cy={R.ay + (R.by - R.ay) * 0.76} rx={380} ry={210} fill={`url(#${aura})`} className={styles.aura} data-on={got('portrait')} />
        <g className={styles.words} data-on={words('about')}>
          <text x={ABOUT.title.x} y={ABOUT.title.y} className={styles.title}>ABOUT</text>
          {TABS.map((t, i) => <text key={t} x={ABOUT.title.x + [0, 122, 300][i]} y={ABOUT.title.y + 62} className={styles.cat} data-pressed={i === 0}>{t}</text>)}
          <line x1={ABOUT.title.x} y1={ABOUT.title.y + 78} x2={620} y2={ABOUT.title.y + 78} className={styles.rule} />
          <Bars x={ABOUT.title.x} y={ABOUT.title.y + 108} widths={[460, 440, 470, 420, 300]} />
        </g>
        {notes && <Tag x={R.ax + 150} y={R.ay - 34}>a rail, as in Work · new · proposed here</Tag>}
      </g>

      <g transform={tr(0, p.contact)}>
        <path d={`M${F.ax + 4} ${F.ay - 7} L${F.bx} ${F.by - 9} M${F.ax + 4} ${F.ay + 7} L${F.bx - 10} ${F.by + 7}`} className={styles.ink} />
        <g transform={tr(CONTACT.pad.x, CONTACT.pad.y)}>
          <ellipse cy={10} rx={300} ry={96} fill={`url(#${aura})`} className={styles.aura} data-on={got('pad')} />
          <g ref={refs ? (el) => { refs.rocket.current = el; } : undefined} className={styles.launch}><Rocket on={lit('pad')} lifted={!refs} /></g>
        </g>
        <g className={styles.words} data-on={words('contact')}>
          <text x={CONTACT.title.x} y={CONTACT.title.y} className={styles.title}>CONTACT</text>
          <Bars x={CONTACT.title.x} y={CONTACT.title.y + 44} widths={[360, 330, 240]} />
          <rect x={CONTACT.title.x} y={CONTACT.title.y + 130} width={168} height={48} rx={24} className={styles.primary} />
          <text x={CONTACT.title.x + 84} y={CONTACT.title.y + 160} textAnchor="middle" className={styles.onPrimary}>Copy email</text>
          <rect x={CONTACT.title.x + 184} y={CONTACT.title.y + 130} width={168} height={48} rx={24} className={styles.accent} />
          <text x={CONTACT.title.x + 268} y={CONTACT.title.y + 160} textAnchor="middle" className={styles.onAccent}>Calendly</text>
          <Bars x={CONTACT.title.x} y={CONTACT.title.y + 214} widths={[64]} />
          <Bars x={CONTACT.title.x + 88} y={CONTACT.title.y + 214} widths={[76]} />
          <Bars x={CONTACT.title.x + 188} y={CONTACT.title.y + 214} widths={[64]} />
        </g>
        {notes && <Tag x={W - 56} y={CONTACT.pad.y + 62} end>piece · the rocket · carried · seen from its other side</Tag>}
      </g>

      <g transform={tr(0, p.foot)}>
        <line x1={150} y1={70} x2={W - 150} y2={70} className={styles.rule} />
        <text x={150} y={110} className={styles.name}>{SITE_NAME}</text>
        <Bars x={W - 150 - 300} y={101} widths={[300]} />
      </g>

      {p.lines.map((l, i) => (
        <g key={i} ref={refs ? (el) => { refs.groups[i] = el; } : undefined} className={styles.line} data-whole={!refs}>
          <path d={l.d} className={styles.haze} strokeDasharray={dash} />
          <path d={l.d} className={styles.glow} strokeDasharray={dash} />
          <path d={l.d} className={styles.body} strokeDasharray={dash} />
          <path d={l.d} className={styles.core} strokeDasharray={dash} />
        </g>
      ))}
      {p.strikes.filter((k) => k.id !== 'portrait').map((k) => (
        <g key={k.id} className={styles.strike} data-on={got(k.id)} transform={tr(k.x, k.y)}>
          <circle r={26} fill={`url(#${flare})`} />
          {[20, 75, 130, 200, 255, 320].map((a) => <line key={a} x1={0} y1={0} x2={15} y2={0} transform={`rotate(${a})`} />)}
          <circle r={2.6} className={styles.dot} />
        </g>
      ))}
      {refs && p.lines.map((_, i) => (
        <g key={i} ref={(el) => { refs.heads[i] = el; }} className={styles.head}>
          <circle r={34} fill={`url(#${flare})`} />
          {[70, 100, 125, 55, 150].map((a) => <line key={a} x1={0} y1={0} x2={20} y2={0} transform={`rotate(${a})`} />)}
          <circle r={3.4} className={styles.dot} />
        </g>
      ))}

      <g transform={tr(0, p.about)}>
        <image href="/media/portrait-cut-960.webp" x={P.x} y={P.y} width={P.w} height={P.h} mask={`url(#${fade})`} className={styles.portrait} data-on={sleep !== 'all' || got('portrait')} />
        {notes && <Tag x={P.x + P.w} y={P.y + P.h + 4} end>his portrait, cut out · the stream passes behind his shoulders</Tag>}
      </g>

      {notes && (
        <g>
          {([
            [CX + 28, p.city + CITY.lip + 70, '01 · The stream leaves the city'],
            [CX + 250, p.work + 34, '02 · Strikes WORK dead center and parts'],
            [CX + 30, p.work + WORK.meet + 40, '03 · The two sides meet under the button'],
            [H.x + HITS.handheld[0] + 34, p.pieces + H.y + HITS.handheld[1] - 8, '04 · Strikes the handheld. It powers on'],
            [C.x + HITS.camera[0] - 34, p.pieces + C.y + HITS.camera[1] + 64, '05 · Strikes the camera. Its flash fires', true],
            [CX - 24, p.skills + 40, '06 · Lands on the desk. The lamp and the screen come on', true],
            [250, p.skills + 474, '07 · Runs down the desk’s front edge'],
            [SKILLS.pc.l + 66, p.skills + SKILLS.pc.t - 16, '08 · Thrown off the corner onto the PC. It boots'],
            [R.ax + 150, p.about + R.ay - 14, '09 · Lands on the rail and runs across the page'],
            [P.x + P.w, p.about + P.y + P.h + 26, '10 · Passes behind his shoulders. The light behind him is the stream', true],
            [F.ax - 30, p.contact + F.ay - 30, '11 · Falls onto the flume', true],
            [W - 56, p.contact + CONTACT.pad.y + 40, '12 · Fills the pad. Ignition. The page ends on the launch', true],
          ] as [number, number, string, boolean?][]).map(([x, y, t, end]) => <text key={t} x={x} y={y} textAnchor={end ? 'end' : 'start'} className={styles.note}>{t}</text>)}
        </g>
      )}
    </>
  );
}

export function PageSketch() {
  const svg = useRef<SVGSVGElement>(null);
  const top = useRef<HTMLDivElement>(null);
  const refs = useRef<{ groups: (SVGGElement | null)[]; heads: (SVGGElement | null)[]; rocket: { current: SVGGElement | null } }>({ groups: [], heads: [], rocket: { current: null } });
  const at = useRef<number[]>([]);
  const [hero, setHero] = useState(900);
  const [sleep, setSleep] = useState<Sleep>('mix');
  const [notes, setNotes] = useState(true);
  const [view, setView] = useState<View>('scroll');
  const [ui, setUi] = useState(true);
  const [reached, setReached] = useState<Set<string>>(() => new Set());
  const [here, setHere] = useState(-1);
  const p = useMemo(() => plan(hero), [hero]);
  const live = useRef({ p, reached, here });
  live.current = { p, reached, here };

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    const s = q.get('sleep');
    if (s === 'none' || s === 'mix' || s === 'all') setSleep(s);
    if (q.get('notes') === '0') setNotes(false);
    if (q.get('view') === 'whole') setView('whole');
    if (q.get('ui') === '0') setUi(false);
    const size = () => setHero(Math.round(Math.min(HERO.max, Math.max(HERO.min, innerHeight / (Math.min(innerWidth, MAX_WIDTH) / W)))));
    size();
    addEventListener('resize', size);
    return () => removeEventListener('resize', size);
  }, []);

  useEffect(() => clock.onFrame((_, dt) => {
    const el = svg.current, { p: P, reached: was } = live.current;
    if (!el) return;
    const box = el.getBoundingClientRect(), scale = box.width / W;
    const y = (innerHeight * READING_LINE - box.top) / scale;
    const jump = dt <= 0 || clock.isFrozen();
    P.lines.forEach((l, i) => {
      const want = reach(l, y), now = at.current[i] ?? 0;
      const len = jump ? want : now + (want - now) * Math.min(1, dt * 9);
      at.current[i] = len;
      const g = refs.current.groups[i];
      if (g) {
        const dash = `${len.toFixed(1)} 99999`;
        for (const path of g.children) path.setAttribute('stroke-dasharray', dash);
        g.style.opacity = len > 0.5 ? '1' : '0';
      }
      const head = refs.current.heads[i];
      if (head) {
        const [hx, hy] = point(l, len);
        head.style.opacity = len > 2 && len < l.total - 2 ? '1' : '0';
        head.setAttribute('transform', tr(Number(hx.toFixed(1)), Number(hy.toFixed(1))));
      }
    });
    const next = new Set<string>();
    for (const k of P.strikes) if (k.at > 0 ? at.current[k.line] >= k.at - 1 : at.current[k.line] > 1) next.add(k.id);
    ([['work', P.work + 40], ['pieces', P.pieces + 60], ['skills', P.skills + 120], ['about', P.about + 90], ['contact', P.contact + 120]] as const).forEach(([k, sy]) => { if (y >= sy) next.add(`s-${k}`); });
    if (next.size !== was.size || [...next].some((k) => !was.has(k))) setReached(next);
    const lift = next.has('pad') ? Math.min(1, Math.max(0, (y - P.end[1]) / LAUNCH.over)) : 0;
    const rocket = refs.current.rocket.current?.querySelector(`.${styles.rocket}`) as SVGGElement | null;
    if (rocket) {
      rocket.setAttribute('transform', tr(0, Number((-LAUNCH.lift * lift * lift).toFixed(1))));
      rocket.dataset.lifted = String(lift > 0.02);
    }
    top.current?.classList.toggle(styles.on, y - innerHeight * READING_LINE / scale > P.hero * 0.5);
    const tops = [P.work, P.skills, P.about, P.contact];
    let now = -1;
    tops.forEach((t, i) => { if (y >= t) now = i; });
    if (now !== live.current.here) setHere(now);
  }), []);

  const go = (i: number) => {
    const el = svg.current;
    if (!el) return;
    const box = el.getBoundingClientRect(), scale = box.width / W;
    scrollTo({ top: scrollY + box.top + [p.work, p.skills, p.about, p.contact][i] * scale - 72, behavior: 'smooth' });
  };

  const halves = [[0, p.pieces], [p.pieces, p.h - p.pieces]];
  return (
    <main className={styles.main} data-view={view}>
      {view === 'scroll' ? (
        <>
          <div ref={top} className={styles.top}>
            <span className={styles.topName}>{SITE_NAME}</span>
            <nav className={styles.topLinks} aria-label="Sections">
              {SECTIONS.map((n, i) => <button key={n} type="button" className={styles.topLink} aria-current={here === i} onClick={() => go(i)}>{n}</button>)}
            </nav>
          </div>
          <svg ref={svg} className={styles.sheet} viewBox={`0 0 ${W} ${p.h}`} role="img" aria-label="A wireframe of the whole home page, from the hero to the footer">
            <Sheet p={p} id="page" sleep={sleep} notes={notes} reached={reached} refs={refs.current} />
          </svg>
        </>
      ) : (
        <div className={styles.whole}>
          {halves.map(([y, h], i) => (
            <svg key={i} className={styles.half} viewBox={`0 ${y} ${W} ${h}`} role="img" aria-label={i ? 'The page from the two pieces to the footer' : 'The page from the hero to the foot of Work'}>
              <Sheet p={p} id={`half${i}`} sleep="none" notes={notes} reached={null} />
            </svg>
          ))}
        </div>
      )}

      {ui && (
        <div className={styles.panel}>
          <div className={styles.controls}>
            <span className={styles.caption}>Study 18</span>
            <div className={styles.group} role="group" aria-label="What sleeps until the stream arrives">
              <span className={styles.groupName}>Sleeps until the stream arrives</span>
              {SLEEPS.map((o) => <button key={o.id} type="button" className={styles.choice} aria-pressed={sleep === o.id} disabled={view === 'whole'} onClick={() => setSleep(o.id)}>{o.name}</button>)}
            </div>
            <div className={styles.group} role="group" aria-label="Notes">
              <span className={styles.groupName}>Notes</span>
              <button type="button" className={styles.choice} aria-pressed={notes} onClick={() => setNotes(true)}>On</button>
              <button type="button" className={styles.choice} aria-pressed={!notes} onClick={() => setNotes(false)}>Off</button>
            </div>
            <div className={styles.group} role="group" aria-label="View">
              <span className={styles.groupName}>View</span>
              <button type="button" className={styles.choice} aria-pressed={view === 'scroll'} onClick={() => setView('scroll')}>Scroll it</button>
              <button type="button" className={styles.choice} aria-pressed={view === 'whole'} onClick={() => setView('whole')}>Whole page</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
