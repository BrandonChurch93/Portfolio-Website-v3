import * as THREE from 'three';
import { slab } from '../../world/shape';
import type { P2 } from './layout';

// Shapes for a movement: outlines drawn from a distance field (so bridges and numerals are unions of discs and bars
// with fillets where they meet, as real bridges are cut), wheels with their teeth and crossings cut, and slabs that
// lie on the table.

export type Field = (x: number, y: number) => number;

export const disc = (cx: number, cy: number, r: number): Field => (x, y) => Math.hypot(x - cx, y - cy) - r;
export function bar(ax: number, ay: number, bx: number, by: number, r: number): Field {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
  return (x, y) => {
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
    return Math.hypot(x - ax - dx * t, y - ay - dy * t) - r;
  };
}
// A smooth union: the corner where two shapes meet is filled with a fillet of about radius k.
export function union(fs: Field[], k = 0): Field {
  return (x, y) => {
    let d = fs[0](x, y);
    for (let i = 1; i < fs.length; i++) {
      const e = fs[i](x, y);
      if (k <= 0) { d = Math.min(d, e); continue; }
      const h = Math.max(0, Math.min(1, 0.5 + (0.5 * (e - d)) / k));
      d = e * (1 - h) + d * h - k * h * (1 - h);
    }
    return d;
  };
}
export const cut = (a: Field, b: Field): Field => (x, y) => Math.max(a(x, y), -b(x, y));
export const meet = (a: Field, b: Field): Field => (x, y) => Math.max(a(x, y), b(x, y));

// The zero line of a field over a box, as closed loops, each turned so its inside is on its left (counter clockwise
// for an outline, clockwise for a hole).
export function contour(f: Field, box: [number, number, number, number], step: number): P2[][] {
  const [x0, y0, x1, y1] = box;
  const nx = Math.ceil((x1 - x0) / step) + 1, ny = Math.ceil((y1 - y0) / step) + 1;
  const v = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const d = f(x0 + i * step, y0 + j * step);
    v[j * nx + i] = i === 0 || j === 0 || i === nx - 1 || j === ny - 1 ? Math.max(d, 1e-3) : d;
  }
  const pt = (i: number, j: number, i2: number, j2: number): P2 => {
    const a = v[j * nx + i], b = v[j2 * nx + i2], t = a / (a - b);
    return [x0 + (i + (i2 - i) * t) * step, y0 + (j + (j2 - j) * t) * step];
  };
  const key = (p: P2) => `${p[0].toFixed(5)},${p[1].toFixed(5)}`;
  const next = new Map<string, P2>();
  const add = (a: P2, b: P2) => next.set(key(a), b);
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = v[j * nx + i] < 0, b = v[j * nx + i + 1] < 0, c = v[(j + 1) * nx + i + 1] < 0, d = v[(j + 1) * nx + i] < 0;
    const s = (a ? 1 : 0) | (b ? 2 : 0) | (c ? 4 : 0) | (d ? 8 : 0);
    if (s === 0 || s === 15) continue;
    const B = () => pt(i, j, i + 1, j), R = () => pt(i + 1, j, i + 1, j + 1), T = () => pt(i, j + 1, i + 1, j + 1), L = () => pt(i, j, i, j + 1);
    // Segments run with the inside on their left.
    switch (s) {
      case 1: add(L(), B()); break;
      case 2: add(B(), R()); break;
      case 3: add(L(), R()); break;
      case 4: add(R(), T()); break;
      case 5: add(L(), T()); add(R(), B()); break;
      case 6: add(B(), T()); break;
      case 7: add(L(), T()); break;
      case 8: add(T(), L()); break;
      case 9: add(T(), B()); break;
      case 10: add(T(), R()); add(B(), L()); break;
      case 11: add(T(), R()); break;
      case 12: add(R(), L()); break;
      case 13: add(R(), B()); break;
      case 14: add(B(), L()); break;
    }
  }
  const loops: P2[][] = [];
  const seen = new Set<string>();
  for (const [k0, first] of next) {
    if (seen.has(k0)) continue;
    const loop: P2[] = [];
    let k = k0, p = first;
    for (let n = 0; n < 200000; n++) {
      seen.add(k);
      loop.push(p);
      k = key(p);
      if (k === k0 || seen.has(k)) break;
      const q = next.get(k);
      if (!q) break;
      p = q;
    }
    if (loop.length > 4) loops.push(loop);
  }
  return loops;
}

export const area = (l: P2[]) => { let a = 0; for (let i = 0; i < l.length; i++) { const p = l[i], q = l[(i + 1) % l.length]; a += p[0] * q[1] - q[0] * p[1]; } return a / 2; };

// Douglas and Peucker's simplification of a closed loop, within tol.
export function simplify(loop: P2[], tol: number): P2[] {
  if (loop.length < 8) return loop;
  const keep = new Uint8Array(loop.length);
  const far = (a: number, b: number) => {
    let best = -1, bd = tol;
    const [ax, ay] = loop[a], [bx, by] = loop[b % loop.length];
    const dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1e-9;
    for (let i = a + 1; i < b; i++) {
      const [px, py] = loop[i % loop.length];
      const d = Math.abs((px - ax) * dy - (py - ay) * dx) / l;
      if (d > bd) { bd = d; best = i; }
    }
    return best;
  };
  const stack: [number, number][] = [[0, Math.floor(loop.length / 2)], [Math.floor(loop.length / 2), loop.length]];
  keep[0] = 1; keep[Math.floor(loop.length / 2)] = 1;
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const i = far(a, b);
    if (i < 0) continue;
    keep[i % loop.length] = 1;
    stack.push([a, i], [i, b]);
  }
  return loop.filter((_, i) => keep[i]);
}

// A loop with no two neighbouring points nearer than d: a point that doubles another leaves the extrusion's bevel
// with no direction, and the face it belongs to is lost.
function apart(l: P2[], d: number): P2[] {
  const out: P2[] = [];
  for (const p of l) { const q = out[out.length - 1]; if (!q || Math.hypot(p[0] - q[0], p[1] - q[1]) > d) out.push(p); }
  while (out.length > 3 && Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) <= d) out.pop();
  return out;
}

// Loops of a field as outlines with their holes: a loop inside an even number of others is an outline.
export function shapes(f: Field, box: [number, number, number, number], step: number, tol: number): { outer: P2[]; holes: P2[][] }[] {
  const loops = contour(f, box, step).map((l) => apart(simplify(apart(l, step * 0.2), tol), step * 0.2)).filter((l) => l.length > 3 && Math.abs(area(l)) > step * step * 4);
  const inside = (p: P2, poly: P2[]) => {
    let hit = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i], [xj, yj] = poly[j];
      if ((yi > p[1]) !== (yj > p[1]) && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) hit = !hit;
    }
    return hit;
  };
  const depth = loops.map((l) => loops.filter((o) => o !== l && inside(l[0], o)).length);
  const outers = loops.filter((_, i) => depth[i] % 2 === 0);
  return outers.map((o) => {
    const d = depth[loops.indexOf(o)];
    return { outer: o, holes: loops.filter((h, i) => depth[i] === d + 1 && inside(h[0], o)) };
  });
}

const V2 = (l: P2[]) => l.map(([x, y]) => new THREE.Vector2(x, y));

// A flat shape lying on the table between y0 and y1, its outline in the table's (x, z). slab() extrudes along z, so it
// is turned up, and z is drawn at -y of the outline.
export function flat(outer: P2[], holes: P2[][], y0: number, y1: number, bev: number, segs = 1): THREE.BufferGeometry {
  const flip = (l: P2[]) => V2(l.map(([x, z]) => [x, -z] as P2));
  const g = slab(flip(outer), holes.map(flip), y0, y1, bev, segs);
  g.rotateX(-Math.PI / 2);
  return g;
}

export function fieldSlab(f: Field, box: [number, number, number, number], step: number, tol: number, y0: number, y1: number, bev: number): THREE.BufferGeometry[] {
  return shapes(f, box, step, tol).map((s) => flat(s.outer, s.holes, y0, y1, bev));
}

// A wheel's outline, from its middle: z teeth on a pitch radius r, cut as a watch wheel's are, with straight flanks
// to the root and an ogival point; or the escape wheel's club teeth. phase is the angle of the first tooth's middle.
export function teeth(z: number, r: number, phase: number, kind: 'wheel' | 'pinion' | 'escape' | 'ratchet'): P2[] {
  const out: P2[] = [];
  const step = (Math.PI * 2) / z, m = (2 * r) / z;
  const at = (a: number, rr: number): P2 => [Math.cos(a) * rr, Math.sin(a) * rr];
  for (let k = 0; k < z; k++) {
    const a = phase + k * step;
    if (kind === 'escape') {
      const root = r * 0.72, tip = r * 1.0;
      out.push(at(a - step * 0.5, root + 0.05 * r), at(a - step * 0.32, root));
      out.push(at(a + step * 0.02, tip), at(a + step * 0.2, tip - 0.02 * r), at(a + step * 0.24, tip - 0.1 * r));
      out.push(at(a + step * 0.05, root + 0.12 * r), at(a + step * 0.12, root + 0.04 * r), at(a + step * 0.3, root + 0.03 * r));
      continue;
    }
    if (kind === 'ratchet') {
      const root = r - 1.4 * m, tip = r + 0.4 * m;
      out.push(at(a - step * 0.5, root), at(a + step * 0.38, tip), at(a + step * 0.46, tip - 0.3 * m), at(a + step * 0.47, root + 0.2 * m));
      continue;
    }
    const pin = kind === 'pinion';
    const add = pin ? 0.7 * m : 1.3 * m, ded = pin ? 1.1 * m : 1.4 * m, half = (pin ? 0.21 : 0.26) * step;
    const root = r - ded, tip = r + add;
    out.push(at(a - step / 2, root));
    out.push(at(a - half * 1.05, root + 0.15 * ded), at(a - half, r));
    for (let i = 1; i <= 2; i++) {
      const s = i / 3, w = half * Math.sqrt(1 - s * s);
      out.push(at(a - w, r + add * s));
    }
    out.push(at(a, tip));
    for (let i = 2; i >= 1; i--) {
      const s = i / 3, w = half * Math.sqrt(1 - s * s);
      out.push(at(a + w, r + add * s));
    }
    out.push(at(a + half, r), at(a + half * 1.05, root + 0.15 * ded));
  }
  return out;
}

const smax = (a: number, b: number, k: number) => { const h = Math.max(0, Math.min(1, 0.5 - (0.5 * (b - a)) / k)); return b * (1 - h) + a * h + k * h * (1 - h); };

// The windows between a wheel's crossings: n spokes of half width w from the hub of radius hub to the rim's inside,
// their corners filleted. A crossing can sweep, as a fine wheel's does.
export function windows(n: number, hub: number, rim: number, w: number, phase: number, curve = 0): P2[][] {
  const k = Math.max(0.05, 0.1 * rim / 6);
  const sector = (Math.PI * 2) / n;
  const f: Field = (x, y) => {
    const r = Math.hypot(x, y);
    let a = Math.atan2(y, x) - phase - curve * (r - hub) / Math.max(rim - hub, 1e-3);
    a = ((a % sector) + sector) % sector - sector / 2;
    const toSpoke = Math.sin(Math.min(Math.PI / 2, sector / 2 - Math.abs(a))) * r;
    return smax(smax(hub - r, r - rim, k), w - toSpoke, k);
  };
  const step = Math.max(0.02, rim / 150);
  return shapes(f, [-rim - 0.3, -rim - 0.3, rim + 0.3, rim + 0.3], step, step * 0.35).map((s) => s.outer);
}

// A cut wheel as a slab: teeth round its rim, windows between its crossings, a hole for the arbor if asked.
export function wheel(o: { z: number; r: number; phase: number; kind: 'wheel' | 'pinion' | 'escape' | 'ratchet'; y0: number; y1: number; spokes?: number; hub?: number; rim?: number; w?: number; curve?: number; bev?: number }): THREE.BufferGeometry {
  const outline = teeth(o.z, o.r, o.phase, o.kind);
  const holes: P2[][] = [];
  if (o.spokes && o.hub && o.rim) holes.push(...windows(o.spokes, o.hub, o.rim, o.w ?? 0.3, o.phase, o.curve));
  return flat(outline, holes, o.y0, o.y1, o.bev ?? 0, 1);
}
