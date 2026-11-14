import type { Pt } from '../../page-sketch/plan';
import { BENCH, put } from '../../skills-about/bench';
import styles from './DeskOutline.module.css';

type Box = [left: number, right: number, low: number, high: number, front: number, back: number];

const str = (pts: Pt[]) => pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
const round = (along: number, up: number, back: number, ra: number, rb: number, n = 24): Pt[] =>
  Array.from({ length: n }, (_, i) => put(along + ra * Math.cos((i / n) * Math.PI * 2), up, back + rb * Math.sin((i / n) * Math.PI * 2)));
// A ring on a wall that faces left, as the PC's glass side does.
const ring = (along: number, up: number, back: number, r: number, n = 24): Pt[] =>
  Array.from({ length: n }, (_, i) => put(along, up + r * Math.sin((i / n) * Math.PI * 2), back + r * Math.cos((i / n) * Math.PI * 2)));

function Solid({ box: [l, r, lo, hi, f, b] }: { box: Box }) {
  return (
    <>
      <polygon pathLength={1} points={str([put(l, lo, b), put(l, lo, f), put(l, hi, f), put(l, hi, b)])} className={styles.solid} />
      <polygon pathLength={1} points={str([put(l, hi, f), put(r, hi, f), put(r, hi, b), put(l, hi, b)])} className={styles.solid} />
      <polygon pathLength={1} points={str([put(l, lo, f), put(r, lo, f), put(r, hi, f), put(l, hi, f)])} className={styles.solid} />
    </>
  );
}

function Mug({ along, back }: { along: number; back: number }) {
  const foot = round(along, 0, back, 0.045, 0.045), lip = round(along, 0.1, back, 0.045, 0.045);
  const far = foot.reduce((a, q, i) => (q[0] < foot[a][0] ? i : a), 0), near = foot.reduce((a, q, i) => (q[0] > foot[a][0] ? i : a), 0);
  return (
    <>
      <polygon pathLength={1} points={str(foot)} className={styles.solid} />
      <polygon pathLength={1} points={str([foot[far], foot[near], lip[near], lip[far]])} className={styles.solid} />
      <polygon pathLength={1} points={str(lip)} className={styles.solid} />
    </>
  );
}

// The desk scene of the fuller draft, as outlines at a real desk's proportions: four legs, the PC under its far end,
// and a monitor, a lamp, a tablet, a keyboard, a notebook and a mug on it. A stand in for the 3D piece.
export function Workbench({ shown, on }: { shown: boolean; on: boolean }) {
  const { long: L, deep: D, tall: H, thick: T } = BENCH, floor = -H, pc = { l: 1.5, r: 1.72, f: 0.14, b: 0.62, h: 0.5 };
  const leg = (along: number, back: number): Box => [along, along + 0.06, floor, -T, back, back + 0.06];
  return (
    <g className={styles.obj} data-shown={shown} data-on={on} data-lively="true">
      <Solid box={leg(L - 0.1, D - 0.1)} />
      <Solid box={leg(0.04, D - 0.1)} />
      <Solid box={[pc.l, pc.r, floor, floor + pc.h, pc.f, pc.b]} />
      <polygon pathLength={1} points={str([put(pc.l, floor + 0.03, pc.b - 0.03), put(pc.l, floor + 0.03, pc.f + 0.03), put(pc.l, floor + pc.h - 0.03, pc.f + 0.03), put(pc.l, floor + pc.h - 0.03, pc.b - 0.03)])} className={`${styles.dim} ${styles.lit}`} />
      {[0.11, 0.25, 0.39].map((y) => <polygon pathLength={1} key={y} points={str(ring(pc.l, floor + y, pc.f + 0.1, 0.052))} className={`${styles.ring} ${styles.spin} ${styles.lit}`} />)}
      <polygon pathLength={1} points={str(ring(pc.l, floor + 0.39, pc.b - 0.1, 0.048))} className={`${styles.ring} ${styles.spin} ${styles.lit}`} />
      <polygon pathLength={1} points={str([put(pc.l, floor + 0.2, pc.b - 0.05), put(pc.l, floor + 0.2, pc.f + 0.2), put(pc.l, floor + 0.27, pc.f + 0.2), put(pc.l, floor + 0.27, pc.b - 0.05)])} className={styles.ink} />
      <Solid box={leg(L - 0.1, 0.04)} />
      <Solid box={leg(0.04, 0.04)} />
      <Solid box={[0, L, -T, 0, 0, D]} />

      <polygon pathLength={1} points={str([put(0.2, 0.36, 0.5), put(0.38, 0.36, 0.5), put(0.56, 0, 0.16), put(0.08, 0, 0.16)])} className={`${styles.cone} ${styles.lit}`} />
      <polygon pathLength={1} points={str(round(0.81, 0, 0.5, 0.13, 0.09))} className={styles.solid} />
      <Solid box={[0.79, 0.83, 0, 0.15, 0.52, 0.54]} />
      <Solid box={[0.5, 1.12, 0.13, 0.5, 0.52, 0.545]} />
      <polygon pathLength={1} points={str([put(0.515, 0.145, 0.52), put(1.105, 0.145, 0.52), put(1.105, 0.485, 0.52), put(0.515, 0.485, 0.52)])} className={`${styles.glass} ${styles.lit}`} />
      <Mug along={1.8} back={0.5} />
      <polygon pathLength={1} points={str(round(0.22, 0, 0.56, 0.07, 0.07))} className={styles.solid} />
      <line pathLength={1} x1={put(0.22, 0, 0.56)[0]} y1={put(0.22, 0, 0.56)[1]} x2={put(0.25, 0.4, 0.56)[0]} y2={put(0.25, 0.4, 0.56)[1]} className={styles.leg} />
      <Solid box={[0.18, 0.4, 0.36, 0.42, 0.44, 0.6]} />
      <Solid box={[0.14, 0.44, 0, 0.012, 0.12, 0.34]} />
      <polygon pathLength={1} points={str([put(0.155, 0.012, 0.135), put(0.425, 0.012, 0.135), put(0.425, 0.012, 0.325), put(0.155, 0.012, 0.325)])} className={`${styles.glass} ${styles.lit}`} />
      <Solid box={[0.56, 1.02, 0, 0.02, 0.1, 0.24]} />
      <polygon pathLength={1} points={str(round(1.1, 0, 0.19, 0.035, 0.05))} className={styles.solid} />
      <Solid box={[1.36, 1.64, 0, 0.015, 0.1, 0.32]} />
      <line pathLength={1} x1={put(1.5, 0.015, 0.1)[0]} y1={put(1.5, 0.015, 0.1)[1]} x2={put(1.5, 0.015, 0.32)[0]} y2={put(1.5, 0.015, 0.32)[1]} className={styles.ink} />
    </g>
  );
}
