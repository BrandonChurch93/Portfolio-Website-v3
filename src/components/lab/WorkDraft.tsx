'use client';

import { useEffect, useRef, useState } from 'react';
import { clock } from '../../world/clock';
import styles from './WorkDraft.module.css';

// A wireframe of the Work section, to choose a layout from. The line stands in for the stream: its leading end
// follows the scroll, and a card wakes when the line reaches it. Nothing here is the real stream or a real card.

type Pt = [number, number];
type Node = [x: number, y: number, radius?: number];
type Variant = 'a' | 'b' | 'c' | 's';
type Lit = 'l' | 'r' | 't';
interface Box { l: number; t: number; r: number; b: number; cx: number; cy: number }
interface Line { pts: Pt[]; cum: number[]; total: number; d: string }
interface Strike { line: number; at: number; x: number; y: number; card: number; lit: Lit }
interface Plan { w: number; h: number; lines: Line[]; strikes: Strike[] }

const VARIANTS: { id: Variant; name: string; note: string }[] = [
  { id: 'a', name: 'A · Frame', note: 'The stream parts on WORK, lands on the category bar, runs off its ends and then straight down both sides of the grid, lighting the side of each card as it passes. The two sides meet again on the button.' },
  { id: 'b', name: 'B · Steps', note: 'The right column sits half a row lower. The stream parts on WORK, lands on the category bar, then on top of the first card on each side and rolls off its end. It swings out wide, comes back in and strikes the side of the next card halfway down. The cards wake one at a time, left then right.' },
  { id: 's', name: 'S · Your sketch', note: 'Your drawing. The same stream as B on straight rows, so the two sides mirror each other: onto the top of the first row and off its ends, out wide, then in to strike the side of each card in the second row halfway down.' },
  { id: 'c', name: 'C · Middle', note: 'One stream instead of two, winding down the middle. Not in the switch: open it with ?v=c.' },
];
const SHOWN: Variant[] = ['a', 'b', 's'];

const CATEGORIES = ['Software', 'Games', '3D art', 'Photography'];
const NUMBERS = ['01', '02', '03', '04'];
const SECTIONS = ['Work', 'Skills', 'About', 'Contact'];
// How far down the screen the leading end is held.
const HEAD_AT = 0.62;
const BUTTON = -1, BAR = -2;

// A line through the points with its corners rounded, as a run of short straight pieces.
function line(nodes: Node[], radius: number): Line {
  const out: Pt[] = [[nodes[0][0], nodes[0][1]]];
  for (let i = 1; i < nodes.length - 1; i++) {
    const p = nodes[i - 1], c = nodes[i], n = nodes[i + 1];
    const d1 = Math.hypot(c[0] - p[0], c[1] - p[1]) || 1, d2 = Math.hypot(n[0] - c[0], n[1] - c[1]) || 1;
    const k = Math.min(c[2] ?? radius, d1 / 2, d2 / 2);
    const a: Pt = [c[0] + ((p[0] - c[0]) * k) / d1, c[1] + ((p[1] - c[1]) * k) / d1];
    const b: Pt = [c[0] + ((n[0] - c[0]) * k) / d2, c[1] + ((n[1] - c[1]) * k) / d2];
    for (let s = 0; s <= 10; s++) {
      const t = s / 10, u = 1 - t;
      out.push([u * u * a[0] + 2 * t * u * c[0] + t * t * b[0], u * u * a[1] + 2 * t * u * c[1] + t * t * b[1]]);
    }
  }
  const last = nodes[nodes.length - 1];
  out.push([last[0], last[1]]);
  const cum = [0];
  for (let i = 1; i < out.length; i++) cum.push(cum[i - 1] + Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]));
  return { pts: out, cum, total: cum[cum.length - 1], d: 'M' + out.map((q) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join('L') };
}

// How far along a line its leading end is when it has come down to this height. A line never climbs.
function reach(l: Line, y: number): number {
  if (y <= l.pts[0][1]) return 0;
  for (let i = 0; i < l.pts.length - 1; i++) {
    const y0 = l.pts[i][1], y1 = l.pts[i + 1][1];
    if (y1 > y) return l.cum[i] + ((y - y0) / Math.max(y1 - y0, 1e-6)) * (l.cum[i + 1] - l.cum[i]);
  }
  return l.total;
}

function point(l: Line, len: number): Pt {
  let i = 0;
  while (i < l.cum.length - 2 && l.cum[i + 1] < len) i++;
  const f = (len - l.cum[i]) / Math.max(l.cum[i + 1] - l.cum[i], 1e-6);
  return [l.pts[i][0] + (l.pts[i + 1][0] - l.pts[i][0]) * f, l.pts[i][1] + (l.pts[i + 1][1] - l.pts[i][1]) * f];
}

function nearest(l: Line, x: number, y: number): number {
  let best = 0, bd = Infinity;
  for (let i = 0; i < l.pts.length - 1; i++) {
    const a = l.pts[i], b = l.pts[i + 1], dx = b[0] - a[0], dy = b[1] - a[1];
    const f = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / Math.max(dx * dx + dy * dy, 1e-6)));
    const d = Math.hypot(a[0] + dx * f - x, a[1] + dy * f - y);
    if (d < bd) { bd = d; best = l.cum[i] + f * (l.cum[i + 1] - l.cum[i]); }
  }
  return best;
}

function plan(v: Variant, w: number, h: number, T: Box, K: Box, C: Box[], B: Box): Plan {
  const cx = w / 2, one = Math.abs(C[0].l - C[1].l) < 40 && Math.abs(C[0].t - C[1].t) > 40;
  const G = { l: Math.min(...C.map((c) => c.l)), r: Math.max(...C.map((c) => c.r)) };
  const top = T.t - 12;
  const lines: Line[] = [line([[cx, 0], [cx, top]], 0)];
  const strikes: Strike[] = [];
  const add = (nodes: Node[], radius: number) => lines.push(line(nodes, radius)) - 1;
  const mark = (li: number, x: number, y: number, card: number, lit: Lit) => strikes.push({ line: li, at: nearest(lines[li], x, y), x, y, card, lit });
  const HUG = 8, SHARP = 5;
  const order = C.map((c, i) => ({ c, i })).sort((p, q) => p.c.t - q.c.t);
  const litSide = (side: number): Lit => (side < 0 ? 'l' : 'r');

  // Down a run of cards. It lands on top of the first as it did in the test shot and rolls off its end. From there
  // it swings out wide, comes back in and strikes the side of each card after that halfway down, then leaves outward.
  const weave = (nodes: Node[], first: { c: Box; i: number } | null, run: { c: Box; i: number }[], side: number, swing: number) => {
    const hug = (c: Box) => (side < 0 ? c.l - HUG : c.r + HUG);
    const lands: { x: number; y: number; i: number; lit: Lit }[] = [];
    const from = nodes[nodes.length - 1];
    let rest = run;
    if (first) {
      const c = first.c, y = c.t - 7;
      const at = Math.max(c.l + 30, Math.min(c.r - 30, from[0] + side * Math.min(90, 0.2 * (y - from[1]))));
      nodes.push([at, y, SHARP], [hug(c), y, 16], [hug(c), c.t + 54, 70], [hug(c) + side * swing, c.b - 50, 110]);
      if (run.includes(first)) lands.push({ x: at, y, i: first.i, lit: 't' });
      rest = run.filter((q) => q !== first);
    }
    rest.forEach(({ c, i }) => {
      const x = hug(c), wide = x + side * swing, mid = (c.t + c.b) / 2;
      nodes.push([wide, c.t - 12, 90], [x, mid, SHARP], [wide + side * 12, c.b + 28, 90]);
      lands.push({ x, y: mid, i, lit: litSide(side) });
    });
    return lands;
  };

  if (v === 'c') {
    const xl = Math.min(T.l, K.l) - 28, xr = Math.max(T.r, K.r) + 28, join = K.b + 62;
    const left = add([[cx, top], [xl, top], [xl, K.b + 8], [cx, join]], 22);
    add([[cx, top], [xr, top], [xr, K.b + 8], [cx, join]], 22);
    mark(left, xl, K.t, BAR, 'l');
    const nodes: Node[] = [[cx, join]];
    const lands = one ? weave(nodes, null, order, -1, 12) : [];
    if (!one) order.forEach(({ c }, n) => {
      const x = c.cx < cx ? c.r + HUG : c.l - HUG, from = nodes[nodes.length - 1];
      const leave = c.t - 6 - Math.abs(x - from[0]) * 0.9;
      if (n > 0 && leave > from[1] + 24) nodes.push([from[0], leave, 70]);
      nodes.push([x, c.t - 6, 40]);
      if (n === order.length - 1) nodes.push([x, c.b - 30, 60]);
    });
    const end: Pt = one ? [B.l - 2, B.cy] : [cx, B.t - 2];
    nodes.push(one ? [nodes[nodes.length - 1][0], B.cy] : [cx, B.t - 44, 30], end);
    const li = add(nodes, 20);
    lands.forEach((q) => mark(li, q.x, q.y, q.i, q.lit));
    if (!one) order.forEach(({ c, i }) => mark(li, c.cx < cx ? c.r + HUG : c.l - HUG, c.t - 6, i, c.cx < cx ? 'r' : 'l'));
    mark(li, end[0], end[1], BUTTON, 't');
  } else {
    [-1, 1].forEach((side) => {
      const mine = order.filter((q) => (one ? q.i % 2 === (side < 0 ? 0 : 1) : side < 0 ? q.c.cx < cx : q.c.cx > cx));
      const room = (side < 0 ? G.l : w - G.r) - 22;
      const gap = one ? 16 : v === 'a' ? 12 : Math.max(32, Math.min(92, room));
      const out = side < 0 ? G.l - gap : G.r + gap;
      const titleEnd = side < 0 ? T.l - 28 : T.r + 28, barEnd = side < 0 ? K.l - HUG : K.r + HUG;
      const nodes: Node[] = [[cx, top], [titleEnd, top]];
      let bar: Pt;
      if (side < 0 ? titleEnd > K.l + 40 : titleEnd < K.r - 40) {
        bar = [titleEnd + side * 14, K.t - 7];
        nodes.push([bar[0], bar[1], SHARP], [barEnd, K.t - 7, 16], [barEnd, K.b + 12, 30]);
      } else {
        const past = side < 0 ? Math.min(titleEnd, barEnd) : Math.max(titleEnd, barEnd);
        bar = [past, K.t - 14];
        nodes.push([titleEnd, T.b + 8, 30], [past, K.t - 14, 30], [past, K.b + 12, 30]);
      }
      const lands = v === 'a' ? [] : weave(nodes, one ? order[0] : mine[0], mine, side, gap - HUG);
      if (v === 'a') nodes.push([out, K.b + 96]);
      const bx = side < 0 ? B.l - 2 : B.r + 2;
      if (v === 'a' || one) nodes.push([out, B.cy, 26]);
      else nodes.push([bx + side * 70, B.cy, 60]);
      nodes.push([bx, B.cy]);
      const li = add(nodes, v === 'a' ? 26 : 20);
      mark(li, bar[0], bar[1], BAR, 't');
      if (v === 'a') for (const { c, i } of mine) mark(li, out, c.t + 30, i, litSide(side));
      lands.forEach((q) => mark(li, q.x, q.y, q.i, q.lit));
      mark(li, bx, B.cy, BUTTON, 't');
    });
  }
  add([[cx, B.b + 2], [cx, h]], 0);
  return { w, h, lines, strikes };
}

export function WorkDraft() {
  const [v, setV] = useState<Variant>('s');
  const [cat, setCat] = useState(CATEGORIES[0]);
  const [drawn, setDrawn] = useState<Plan | null>(null);
  const main = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const hero = useRef<HTMLDivElement>(null);
  const work = useRef<HTMLElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const cats = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLSpanElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const cards = useRef<(HTMLElement | null)[]>([]);
  const groups = useRef<(SVGGElement | null)[]>([]);
  const heads = useRef<(SVGGElement | null)[]>([]);
  const marks = useRef<(SVGGElement | null)[]>([]);
  const live = useRef<{ plan: Plan; at: number[] } | null>(null);
  const whole = useRef(false);
  const half = useRef(0);

  useEffect(() => {
    const asked = new URLSearchParams(location.search).get('v');
    if (asked === 'a' || asked === 'b' || asked === 'c' || asked === 's') setV(asked);
    whole.current = new URLSearchParams(location.search).has('whole');
    if (whole.current) main.current?.setAttribute('data-whole', '');
  }, []);

  useEffect(() => {
    const measure = () => {
      const s = stage.current, t = title.current, k = cats.current, b = button.current;
      const cs = cards.current.filter((c): c is HTMLElement => !!c);
      if (!s || !t || !k || !b || cs.length < NUMBERS.length) return;
      const o = s.getBoundingClientRect();
      const box = (el: Element): Box => {
        const r = el.getBoundingClientRect();
        return { l: r.left - o.left, t: r.top - o.top, r: r.right - o.left, b: r.bottom - o.top, cx: (r.left + r.right) / 2 - o.left, cy: (r.top + r.bottom) / 2 - o.top };
      };
      const boxes = cs.map(box);
      const column = boxes.filter((q) => Math.abs(q.l - boxes[0].l) < 40).sort((p, q) => p.t - q.t);
      const pitch = column.length > 1 ? (column[1].t - column[0].t) / 2 : 0;
      if (Math.abs(pitch - half.current) > 0.5) {
        half.current = pitch;
        s.style.setProperty('--half', `${pitch.toFixed(1)}px`);
        return measure();
      }
      const p = plan(v, o.width, o.height, box(t), box(k), boxes, box(b));
      for (const strike of p.strikes) {
        const c = cs[strike.card];
        if (c) c.dataset.lit = strike.lit;
      }
      live.current = { plan: p, at: p.lines.map(() => 0) };
      setDrawn(p);
    };
    half.current = 0;
    measure();
    const watch = new ResizeObserver(measure);
    if (stage.current) watch.observe(stage.current);
    document.fonts?.ready.then(measure);
    return () => watch.disconnect();
  }, [v]);

  useEffect(() => clock.onFrame((_, dt) => {
    const s = stage.current, L = live.current;
    if (!s || !L) return;
    const y = whole.current ? 1e9 : innerHeight * HEAD_AT - s.getBoundingClientRect().top;
    const jump = dt <= 0 || clock.isFrozen();
    L.plan.lines.forEach((l, i) => {
      const want = reach(l, y);
      L.at[i] = jump ? want : L.at[i] + (want - L.at[i]) * Math.min(1, dt * 9);
      const g = groups.current[i];
      if (g) {
        const dash = `${L.at[i].toFixed(1)} 99999`;
        for (const path of g.children) path.setAttribute('stroke-dasharray', dash);
        g.style.opacity = L.at[i] > 0.5 ? '1' : '0';
      }
      const head = heads.current[i];
      if (head) {
        const on = L.at[i] > 2 && L.at[i] < l.total - 2;
        const [hx, hy] = point(l, L.at[i]);
        head.style.opacity = on ? '1' : '0';
        head.setAttribute('transform', `translate(${hx.toFixed(1)} ${hy.toFixed(1)})`);
      }
    });
    const lit = new Set<number>();
    L.plan.strikes.forEach((k, i) => {
      const on = L.at[k.line] >= k.at - 1 && k.at > 0;
      marks.current[i]?.classList.toggle(styles.struck, on);
      if (on) lit.add(k.card);
    });
    cards.current.forEach((c, i) => c?.classList.toggle(styles.awake, lit.has(i)));
    button.current?.classList.toggle(styles.awake, lit.has(BUTTON));
    cats.current?.classList.toggle(styles.awake, lit.has(BAR));

    const top = bar.current, h = hero.current, k = cats.current, w = work.current;
    if (top && h && k && w && !whole.current) {
      const on = h.getBoundingClientRect().bottom < innerHeight * 0.5;
      const under = k.getBoundingClientRect().bottom < top.offsetHeight + 4;
      const inside = w.getBoundingClientRect().bottom > top.offsetHeight + 140;
      top.classList.toggle(styles.on, on);
      top.classList.toggle(styles.docked, on && under && inside);
    }
  }), []);

  const pickFromBar = (name: string) => {
    setCat(name);
    const g = grid.current, top = bar.current;
    if (g && top) scrollTo({ top: scrollY + g.getBoundingClientRect().top - top.offsetHeight - 72, behavior: 'smooth' });
  };

  return (
    <main ref={main} className={styles.main}>
      <header className={styles.intro}>
        <p className={styles.label}>Study 09 · the Work section, laid out</p>
        <h1 className={styles.heading}>Work, laid out</h1>
        <p className={styles.lede}>
          A wireframe, to choose a layout from. The line stands in for the stream and its leading end follows your scroll. The category bar,
          each card and the button wake when the line reaches them. Once the category bar has scrolled off the top, the categories move into
          the bar at the top of the screen. Nothing here is the real stream, a real card or a real project.
        </p>
        <p className={styles.note}>{VARIANTS.find((o) => o.id === v)?.note}</p>
      </header>

      <div ref={bar} className={styles.bar}>
        <span className={styles.barName}>Brandon Church</span>
        <div className={styles.barCats}>
          <span className={styles.barSection}>Work</span>
          {CATEGORIES.map((c) => (
            <button key={c} type="button" className={styles.barCat} aria-pressed={cat === c} onClick={() => pickFromBar(c)}>{c}</button>
          ))}
        </div>
        <div className={styles.barLinks}>{SECTIONS.map((n) => <span key={n}>{n}</span>)}</div>
      </div>

      <div className={styles.switch} role="group" aria-label="Layout">
        {VARIANTS.filter((o) => SHOWN.includes(o.id)).map((o) => (
          <button key={o.id} type="button" className={styles.choice} aria-pressed={v === o.id} onClick={() => setV(o.id)}>{o.name}</button>
        ))}
      </div>

      <div ref={stage} className={styles.stage} data-v={v}>
        {drawn && (
          <svg className={styles.lines} width={drawn.w} height={drawn.h} viewBox={`0 0 ${drawn.w} ${drawn.h}`} aria-hidden="true">
            <defs>
              <radialGradient id="work-draft-flare">
                <stop offset="0" stopColor="var(--hot)" stopOpacity="0.9" />
                <stop offset="0.35" stopColor="var(--flame)" stopOpacity="0.45" />
                <stop offset="1" stopColor="var(--ember)" stopOpacity="0" />
              </radialGradient>
            </defs>
            {drawn.lines.map((l, i) => (
              <g key={`${v}-${i}`} ref={(el) => { groups.current[i] = el; }} className={styles.line}>
                <path d={l.d} className={styles.haze} strokeDasharray="0 99999" />
                <path d={l.d} className={styles.glow} strokeDasharray="0 99999" />
                <path d={l.d} className={styles.body} strokeDasharray="0 99999" />
                <path d={l.d} className={styles.core} strokeDasharray="0 99999" />
              </g>
            ))}
            {drawn.strikes.map((k, i) => (
              <g key={`${v}-s${i}`} ref={(el) => { marks.current[i] = el; }} className={styles.strike} transform={`translate(${k.x.toFixed(1)} ${k.y.toFixed(1)})`}>
                <circle r="26" fill="url(#work-draft-flare)" />
                {[20, 75, 130, 200, 255, 320].map((a) => <line key={a} x1="0" y1="0" x2="15" y2="0" transform={`rotate(${a})`} />)}
                <circle r="2.6" className={styles.dot} />
              </g>
            ))}
            {drawn.lines.map((l, i) => (
              <g key={`${v}-h${i}`} ref={(el) => { heads.current[i] = el; }} className={styles.head}>
                <circle r="34" fill="url(#work-draft-flare)" />
                {[70, 100, 125, 55, 150].map((a) => <line key={a} x1="0" y1="0" x2="20" y2="0" transform={`rotate(${a})`} />)}
                <circle r="3.4" className={styles.dot} />
              </g>
            ))}
          </svg>
        )}

        <div ref={hero} className={styles.standIn}>Hero · the city · not drawn here</div>

        <section ref={work} className={styles.work}>
          <h2 ref={title} className={styles.title}>Work</h2>
          <div ref={cats} className={styles.cats} data-lit="t" role="group" aria-label="Category">
            {CATEGORIES.map((c) => (
              <button key={c} type="button" className={styles.cat} aria-pressed={cat === c} onClick={() => setCat(c)}>{c}</button>
            ))}
          </div>
          <div ref={grid} className={styles.grid}>
            {NUMBERS.map((n, i) => (
              <article key={n} ref={(el) => { cards.current[i] = el; }} className={styles.card}>
                <div key={cat} className={styles.inner}>
                  <div className={styles.picture} />
                  <h3 className={styles.name}>{cat} · {n}</h3>
                  <p className={styles.text}>One line on what it is and why it mattered.</p>
                  <p className={styles.tags}><span>Tag</span><span>Tag</span><span>Tag</span></p>
                </div>
              </article>
            ))}
          </div>
          <p className={styles.more}><span ref={button} className={styles.button}>View all work</span></p>
        </section>

        <div className={styles.standIn}>Skills · not drawn here</div>
      </div>
    </main>
  );
}
