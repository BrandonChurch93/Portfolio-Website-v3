import * as THREE from 'three';
import { lathe, rbox } from '../../../../world/build';
import { band, coons, panel, resample, sheet } from './patch';
import { CHANNEL, DECK, DPI, FLOOR, FOOT, LED, LIFT, SEAM, THUMB, THUMB_PROUD, WHEEL, WING, channel, facing, height, onOutline, split, wing, type V2 } from './shape';

// What each surface is. One material draws them all, and each vertex carries its kind in the fourth number of its
// cell attribute.
export const KIND = { top: 0, edge: 1, inside: 2, frame: 3, thumb: 4, tread: 5, copper: 6, led: 7, lip: 8 } as const;

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const lift = ([x, z]: V2, dy = 0) => V(x, height(x, z) + dy, z);
const UP = () => V(0, 1, 0);
const FACING = (p: THREE.Vector3) => V(...facing(p.x, p.z));
const TAU = Math.PI * 2;

// Finds where f changes sign between a and b.
function solve(f: (t: number) => number, a: number, b: number): number {
  let fa = f(a);
  for (let k = 0; k < 60; k++) {
    const m = (a + b) / 2, fm = f(m);
    if (Math.sign(fm) === Math.sign(fa)) { a = m; fa = fm; } else b = m;
  }
  return (a + b) / 2;
}
const deck = (t: number) => onOutline(DECK, t);
// The part of the deck's outline between two places on it.
const arc = (t0: number, t1: number, n: number) => resample((s) => deck(t0 + (t1 - t0) * s), n);

const OFF = SEAM.g / 2 + SEAM.ch;
// The inner edge of a main button, beside the gap or the channel down the middle.
const inner = (z: number) => channel(z) + OFF;

// One main button: side -1 is the left, 1 the right. Its inner edge runs back from the nose beside the channel, its
// back edge follows the split, and its front and outer edges are the deck's outline.
function button(side: number): THREE.BufferGeometry[] {
  const L = side < 0;
  const tN = 1.5 * Math.PI;
  const tFI = solve((t) => Math.abs(deck(t)[0]) - inner(deck(t)[1]), tN + side * 0.75, tN);
  const back = (x: number) => split(x) - OFF;
  const tBO = L ? solve((t) => deck(t)[1] - back(deck(t)[0]), Math.PI - 0.5, Math.PI + 0.6) : solve((t) => deck(t)[1] - back(deck(t)[0]), TAU + 0.5, TAU - 0.6);
  const tFO = tN + side * 0.62;
  const zFI = deck(tFI)[1], zBI = solve((z) => z - back(side * inner(z)), -30, 10);
  const xBO = deck(tBO)[0];
  const nu = 32, nv = 18;
  const c0 = resample((s) => { const z = zFI + (zBI - zFI) * s; return [side * inner(z), z]; }, nu);
  const c1 = arc(tFO, tBO, nu);
  const d0 = arc(tFI, tFO, nv);
  const d1 = resample((s) => { const x = side * inner(zBI) + (xBO - side * inner(zBI)) * s; return [x, back(x)]; }, nv);
  const grid = coons(c0, c1, d0, d1).map((row) => row.map((p) => lift(p)));
  return panel(grid, KIND.top, KIND.edge, KIND.inside, SEAM.ch, SEAM.wall, UP, FACING);
}

// The palm: from the split back over the hump to the tail.
function palm(): THREE.BufferGeometry[] {
  const front = (x: number) => split(x) + OFF;
  const tPL = solve((t) => deck(t)[1] - front(deck(t)[0]), Math.PI + 0.5, Math.PI - 0.6);
  const tPR = solve((t) => deck(t)[1] - front(deck(t)[0]), -0.5, 0.6);
  const tBL = 0.78 * Math.PI, tBR = 0.22 * Math.PI;
  const nu = 32, nv = 26;
  const xl = deck(tPL)[0], xr = deck(tPR)[0];
  const c0 = resample((s) => { const x = xl + (xr - xl) * s; return [x, front(x)]; }, nu);
  const c1 = arc(tBL, tBR, nu);
  const d0 = arc(tPL, tBL, nv);
  const d1 = arc(tPR, tBR, nv);
  const grid = coons(c0, c1, d0, d1).map((row) => row.map((p) => lift(p)));
  return panel(grid, KIND.top, KIND.edge, KIND.inside, SEAM.ch, SEAM.wall, UP, FACING);
}

// What is under the shell, seen through the gaps and down the channel: a dark floor a little under it.
function floor(): THREE.BufferGeometry {
  const around = 40, rings = 4, grid: THREE.Vector3[][] = [];
  for (let j = 0; j <= rings; j++) {
    const k = 0.975 * (1 - j / rings) ** 0.8, row: THREE.Vector3[] = [];
    for (let i = 0; i <= around; i++) {
      const [x, z] = deck((i / around) * TAU);
      const px = x * k, pz = z * k + (1 - k) * 6;
      row.push(V(px, height(px, pz) - FLOOR - 1.4, pz));
    }
    grid.push(row);
  }
  return sheet(grid, KIND.inside, (_p, n) => n.y);
}

// The channel's own floor, which the wheel, the button behind it and the light stand in: true to the shell above it.
function channelFloor(): THREE.BufferGeometry {
  const grid: THREE.Vector3[][] = [];
  for (let j = 0; j <= 14; j++) {
    const z = CHANNEL.from - 4 + ((CHANNEL.to + 3 - (CHANNEL.from - 4)) * j) / 14, row: THREE.Vector3[] = [];
    for (let i = 0; i <= 4; i++) { const x = -CHANNEL.half - 0.6 + ((2 * CHANNEL.half + 1.2) * i) / 4; row.push(V(x, height(x, z) - FLOOR, z)); }
    grid.push(row);
  }
  return sheet(grid, KIND.inside, (_p, n) => n.y);
}

// The frame, as rings at each place round the mouse from its foot up to just under the shell's edge: a chamfer at the
// foot, the thumb's lip and ledge on the left, the flank, and a flange that runs in under the shell.
const AROUND = 96;
interface Rows { rows: THREE.Vector3[]; n: V2; w: number }
function plan(o: typeof DECK, t: number): { p: V2; n: V2 } {
  const p = onOutline(o, t), a = onOutline(o, t - 0.002), b = onOutline(o, t + 0.002);
  const tx = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(tx, tz) || 1;
  let n: V2 = [tz / l, -tx / l];
  if (n[0] * p[0] + n[1] * (p[1] - DECK.zm) < 0) n = [-n[0], -n[1]];
  return { p, n };
}
export function frameAt(t: number): Rows {
  const B = plan(FOOT, t), D = plan(DECK, t);
  const w = wing(B.p[0], B.p[1], Math.sign(B.p[0]) || 1);
  const top = height(D.p[0], D.p[1]) - SEAM.ch - 0.25;
  const out = (p: V2, n: V2, k: number, y: number) => V(p[0] + n[0] * k, y, p[1] + n[1] * k);
  // The flank without the thumb's rest, at a height.
  const flank = (y: number) => { const f = (y - LIFT) / (top - LIFT); return V(B.p[0] + (D.p[0] - B.p[0]) * f, y, B.p[1] + (D.p[1] - B.p[1]) * f); };
  const at = (y: number, k: number) => flank(y).add(V(B.n[0] * k, 0, B.n[1] * k));
  const h = top - LIFT, mix = (a: number, b: number) => a + (b - a) * w;
  const y1 = LIFT + 1.2, y2 = mix(LIFT + 0.17 * h, 4.6), y3 = mix(LIFT + 0.22 * h, 6.2), y4 = mix(LIFT + 0.3 * h, 7.6);
  const r4 = at(y4, -w * WING.ledge), r9 = out(D.p, D.n, -0.35, top);
  // The flank above the ledge is hollowed where the thumb lies, and a little full elsewhere.
  const bulge = w * 1.7 - (1 - w) * 0.35;
  const mid = r4.clone().lerp(r9, 0.5).add(V(-D.n[0] * bulge * 2, 0, -D.n[1] * bulge * 2));
  const rows = [out(B.p, B.n, -1.0, LIFT), at(y1, w * 2.0), at(y2, w * WING.out), at(y3, w * (WING.out - 0.2)), r4];
  for (const v of [0.2, 0.4, 0.6, 0.8]) rows.push(r4.clone().multiplyScalar((1 - v) ** 2).addScaledVector(mid, 2 * v * (1 - v)).addScaledVector(r9, v * v));
  rows.push(r9, out(D.p, D.n, -3.2, top));
  return { rows, n: D.n, w };
}
// A point of the flank above the ledge: t round the mouse, v from the ledge (0) to the shell (1).
export function upperFlank(t: number, v: number): THREE.Vector3 {
  const { rows } = frameAt(t), [r4, , , , , r9] = rows.slice(4);
  const mid = rows[6];
  // The rows between are on the curve through r4, mid and r9; mid is its point at v = 0.4, so this is the same
  // curve's control point worked back.
  const c = mid.clone().sub(r4.clone().multiplyScalar(0.36)).sub(r9.clone().multiplyScalar(0.16)).divideScalar(0.48);
  return r4.clone().multiplyScalar((1 - v) ** 2).addScaledVector(c, 2 * v * (1 - v)).addScaledVector(r9, v * v);
}
function frame(): THREE.BufferGeometry[] {
  const cols = Array.from({ length: AROUND }, (_, i) => frameAt((i / AROUND) * TAU));
  const loops = cols[0].rows.map((_, r) => cols.map((c) => c.rows[r]));
  const outward = (p: THREE.Vector3, n: THREE.Vector3) => n.x * p.x + n.z * (p.z - DECK.zm);
  // Hard edges at the foot's chamfer, the top of the lip, the inside of the ledge and the shell.
  return [
    band(loops.slice(0, 2), KIND.frame, outward),
    band(loops.slice(1, 4), KIND.lip, outward),
    band(loops.slice(3, 5), KIND.lip, (_p, n) => n.y),
    band(loops.slice(4, 10), KIND.frame, outward),
    band(loops.slice(9, 11), KIND.inside, (_p, n) => n.y),
  ];
}

// The thumb's two buttons: slanted pads standing proud of the hollow in the left flank, each with its chamfer and
// its edge.
function thumbs(): THREE.BufferGeometry[] {
  const left = (z: number) => solve((t) => upperFlank(t, 0.5).z - z, 0.55 * Math.PI, 1.45 * Math.PI);
  const out: THREE.BufferGeometry[] = [];
  for (const [a, b, c, d] of THUMB) {
    const nu = 8, nv = 5, grid: THREE.Vector3[][] = [];
    for (let j = 0; j <= nv; j++) {
      const v = j / nv, row: THREE.Vector3[] = [];
      for (let i = 0; i <= nu; i++) {
        const u = i / nu;
        const z = (1 - v) * ((1 - u) * a[0] + u * b[0]) + v * ((1 - u) * d[0] + u * c[0]);
        const h = (1 - v) * ((1 - u) * a[1] + u * b[1]) + v * ((1 - u) * d[1] + u * c[1]);
        const t = left(z), p = upperFlank(t, h);
        const pu = upperFlank(t + 0.01, h).sub(upperFlank(t - 0.01, h)), pv = upperFlank(t, h + 0.01).sub(upperFlank(t, h - 0.01));
        const n = pu.cross(pv).normalize();
        if (n.x > 0) n.negate();
        // A pad is fuller across its middle than at its edges.
        const dome = THUMB_PROUD + 0.35 * Math.sin(Math.PI * u) * Math.sin(Math.PI * v);
        row.push(p.addScaledVector(n, dome));
      }
      grid.push(row);
    }
    out.push(...panel(grid, KIND.thumb, KIND.edge, KIND.inside, 0.5, THUMB_PROUD + 0.6, () => V(-1, 0.25, 0).normalize()));
  }
  return out;
}

// The wheel: a rubber tread between two turned copper hubs, on an axle across the mouse.
export const wheelAxle = () => height(0, WHEEL.z) + WHEEL.proud - WHEEL.r;
function wheel(): THREE.BufferGeometry[] {
  const { r, half, tread, hub } = WHEEL, y = wheelAxle();
  const put = (g: THREE.BufferGeometry, kind: number) => {
    g.rotateZ(Math.PI / 2).translate(0, y, WHEEL.z);
    const n = g.getAttribute('position').count, cell = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) cell[i * 4 + 3] = kind;
    g.setAttribute('cell', new THREE.Float32BufferAttribute(cell, 4));
    return g;
  };
  const tr = lathe([[hub - 0.3, -tread - 0.05], [r - 0.7, -tread], [r - 0.15, -tread + 0.35], [r, -tread + 0.9], [r, tread - 0.9], [r - 0.15, tread - 0.35], [r - 0.7, tread], [hub - 0.3, tread + 0.05]], 40);
  const hubs = [-1, 1].map((s) => {
    const pts: [number, number][] = [[1.4, s * half], [hub - 0.7, s * half], [hub - 0.2, s * (half - 0.35)], [hub, s * (half - 0.9)], [hub, s * (tread - 0.05)]];
    return lathe(s < 0 ? pts : pts.reverse(), 40);
  });
  // The axle's end, a small dark boss at the middle of each hub.
  const caps = [-1, 1].map((s) => lathe(s > 0 ? [[1.6, half - 0.1], [1.1, half + 0.4], [0, half + 0.4]] : [[0, -half - 0.4], [1.1, -half - 0.4], [1.6, -half + 0.1]], 12));
  return [put(tr, KIND.tread), ...hubs.map((g) => put(g, KIND.copper)), ...caps.map((g) => put(g, KIND.inside))];
}

// The top of the small button behind the wheel.
const dpiTop = () => height(0, (DPI.z0 + DPI.z1) / 2) - 0.3;

// The small button behind the wheel, the light round its foot, and the copper bezel round both.
function dpi(): THREE.BufferGeometry[] {
  const z = (DPI.z0 + DPI.z1) / 2, len = DPI.z1 - DPI.z0, top = dpiTop();
  const tag = (g: THREE.BufferGeometry, kind: number) => {
    const n = g.getAttribute('position').count, cell = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) cell[i * 4 + 3] = kind;
    g.setAttribute('cell', new THREE.Float32BufferAttribute(cell, 4));
    return g;
  };
  const r = LED.ring;
  const key = tag(rbox(DPI.half * 2, 3.2, len, 1.2, 1).translate(0, top - 1.6, z), KIND.top);
  const led = tag(rbox(DPI.half * 2 + 2 * r, 3.2, len + 2 * r, 1.5, 1).translate(0, top - LED.under - 1.6, z), KIND.led);
  const bezel = tag(rbox(DPI.half * 2 + 4 * r, 3.2, len + 4 * r, 1.8, 1).translate(0, top - LED.under - 0.5 - 1.6, z), KIND.copper);
  return [key, led, bezel];
}

export interface MouseGeometry { solid: THREE.BufferGeometry[]; ledY: number; axle: number }

export function mouseGeometry(): MouseGeometry {
  const solid = [...button(-1), ...button(1), ...palm(), floor(), channelFloor(), ...frame(), ...thumbs(), ...wheel(), ...dpi()];
  return { solid, ledY: dpiTop() - LED.under, axle: wheelAxle() };
}

