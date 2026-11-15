import * as THREE from 'three';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import { seeded, slice } from '../../../../world/build';
import { BOWL, CHUTE, D2R, KEEL, RIB, ROCK, gap, reach, seen } from './shape';

// The rock under the city: not strata stacked like plates, but one broken mass. A body comes in under the rim and
// narrows to the keel, its faces cut by fractures that run down them and broken into buttresses that stand out and
// gullies that go in, every edge of them its own. Hanging from it, masses of broken rock of every size, longest
// toward the middle, so its outline against the sky is torn. Each is cut in flat faces, so their edges catch the
// light. A channel is cut for each of the ribs that hold it, and a chute down its front for the main fall.

// A smooth noise in three dimensions, the same on every call.
function noise3(seed: number): (x: number, y: number, z: number) => number {
  const h = (i: number, j: number, k: number) => { const s = Math.sin(i * 127.1 + j * 311.7 + k * 74.7 + seed * 19.3) * 43758.5453; return s - Math.floor(s); };
  const sm = (t: number) => t * t * (3 - 2 * t);
  return (x, y, z) => {
    const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z), u = sm(x - i), v = sm(y - j), w = sm(z - k);
    const l = (a: number, b: number, t: number) => a + (b - a) * t;
    return l(l(l(h(i, j, k), h(i + 1, j, k), u), l(h(i, j + 1, k), h(i + 1, j + 1, k), u), v), l(l(h(i, j, k + 1), h(i + 1, j, k + 1), u), l(h(i, j + 1, k + 1), h(i + 1, j + 1, k + 1), u), v), w);
  };
}

// How far a point of the body may stand out at a bearing and a depth before it meets a rib or the chute: the
// channels are cut back with sloping walls so the members can be seen from the side.
export function cutAt(deg: number, d: number, rr: number): { r: number; dressed: number } {
  const base = reach(d);
  let r = rr, dressed = 0;
  for (const b of RIB.bearings) {
    const side = gap(deg, b) * D2R * base;
    if (side > 60) continue;
    const lim = base - 5 + Math.max(0, side - RIB.half - 4) * 0.9;
    if (lim < r) { r = lim; dressed = Math.max(dressed, side < RIB.half + 4 ? 1 : 0.5); }
  }
  const t = deg * D2R, x = Math.sin(t) * base;
  if (Math.cos(t) > 0) {
    const lim = base - 9 + Math.max(0, Math.abs(x) - CHUTE.half) * 1.8;
    if (lim < r) { r = lim; dressed = Math.max(dressed, Math.abs(x) < CHUTE.half ? 1 : 0.5); }
  }
  return { r, dressed };
}

interface Built { geo: THREE.BufferGeometry; tris: number }

// The cliff's structure round the circle: columns of rock of every width standing out as buttresses, with gullies cut
// between them along joints that lean as they go down. Each column stands further out or in at different depths, so
// buttresses swell and die away down the cliff. And a few beds cross it, each a ledge where the rock above stands out
// over the rock below, tilted, and broken at every gully: on each column a bed is a little higher or lower, or absent.
interface Column { from: number; out: number; swell: number; ph: number; groove: number; beds: number[] }
function cliff(seed: number): (u: number, d: number) => { h: number; hollow: number; edge: number } {
  const r = seeded(seed);
  const cols: Column[] = [];
  const beds = [{ at: 46, tilt: 0.012 }, { at: 82, tilt: -0.009 }, { at: 118, tilt: 0.007 }, { at: 150, tilt: -0.011 }];
  for (let u = -2400; u < 2400;) {
    cols.push({ from: u, out: r() * 2 - 0.7, swell: 0.4 + 0.8 * r(), ph: r() * 6.28, groove: 3 + 5 * r(), beds: beds.map(() => (r() < 0.35 ? NaN : (r() - 0.5) * 12)) });
    u += 18 + 60 * r() * r() + 10 * r();
  }
  const lean = (k: number, d: number) => cols[k].from + Math.sin(cols[k].ph * 3) * 0.12 * d;
  return (u, d) => {
    let k = 0, lo = 0, hi = cols.length - 1;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (lean(m, d) <= u) { k = m; lo = m + 1; } else hi = m - 1; }
    const c = cols[k], a = lean(k, d), z = k + 1 < cols.length ? lean(k + 1, d) : a + 60;
    const e0 = u - a, e1 = z - u, e = Math.min(e0, e1), g = e0 < e1 ? c.groove : (cols[k + 1] ?? c).groove;
    const W = 5.5;
    const v = Math.max(0, 1 - e / W);
    const groove = -g * v * v;
    const mass = (c.out + 0.6 * Math.sin(d / (30 + 20 * c.swell) + c.ph)) * 5 * Math.min(1, e / (W * 1.4));
    let h = mass + groove, under = 0;
    beds.forEach((b, i) => {
      const off = c.beds[i];
      if (Number.isNaN(off)) return;
      const line = b.at + off + b.tilt * u, x = d - line;
      h += 2.6 * (0.5 - 1 / (1 + Math.exp(-x / 0.9)));
      under = Math.max(under, Math.exp(-((x - 2.5) ** 2) / 6));
    });
    const edge = Math.max(0, 1 - Math.abs(e - W * 1.5) / 3) * (mass > 0 ? 1 : 0.3);
    return { h, hollow: Math.min(1, v * v * 1.4 + under * 0.7), edge };
  };
}

// The body's line at a bearing: the bowl's cliffs stand sheer for longer or round in sooner, in broad lobes round the
// circle, so its outline is not a lens. True to the plan where a rib or the chute is let into it.
const lobes = (() => { const n = noise3(17); return (deg: number) => (n(deg / 24, 0.5, 3.1) - 0.5) * 2 * 0.5 + (n(deg / 9, 2.5, 1.7) - 0.5) * 0.35; })();
export function bodyReach(d: number, deg: number): number {
  let calm = 1;
  for (const b of RIB.bearings) calm = Math.min(calm, Math.min(1, Math.max(0, (gap(deg, b) - 3) / 7)));
  calm = Math.min(calm, Math.min(1, Math.max(0, (gap(deg, 0) - 4) / 8)));
  const x = Math.min(1, Math.max(0, (d - ROCK.top) / (ROCK.end - ROCK.top))), p = BOWL.p * (1 + 0.45 * lobes(deg) * calm);
  return ROCK.rEnd + (ROCK.r0 - ROCK.rEnd) * (1 - Math.pow(x, p)) ** BOWL.q;
}

// The body: one grid, its columns round the circle (close together toward the front, which is what is seen) and its
// rows down from under the rim to the keel's flange. Each point is moved along the bowl's own normal, so the relief
// is as deep on the underside as on the cliffs.
async function body(): Promise<Built> {
  const n3 = noise3(3), n4 = noise3(4), face = cliff(5);

  const cols: number[] = [];
  for (let a = -180; a < 180;) { cols.push(a); a += Math.abs(a) < 75 ? 0.5 : seen(a, 128) ? 0.75 : 3; }
  const nc = cols.length;
  const rows: number[] = [];
  for (let s = 0; s <= 1.0001;) { rows.push(s); s += 0.009 + 0.026 * s; }
  rows[rows.length - 1] = 1;
  const nr = rows.length;

  const pos = new Float32Array(nc * nr * 3), out = new Float32Array(nc * nr), tone = new Float32Array(nc * nr), dressed = new Float32Array(nc * nr);
  const hollow = new Float32Array(nc * nr), edge = new Float32Array(nc * nr);
  for (let j = 0; j < nr; j++) {
    const s = rows[j], d0 = ROCK.top + (ROCK.end - ROCK.top) * s;
    const grow = Math.min(1, s / 0.06) * (1 - 0.7 * Math.max(0, (s - 0.85) / 0.15));
    for (let i = 0; i < nc; i++) {
      const deg = cols[i], t = deg * D2R, base = bodyReach(d0, deg), ax = Math.sin(t) * base, az = Math.cos(t) * base;
      // The bowl's normal here, in radius and depth.
      const dr0 = bodyReach(d0 + 0.5, deg) - bodyReach(d0 - 0.5, deg), nl = Math.hypot(1, dr0), nr0 = 1 / nl, nd0 = -dr0 / nl;
      const u = t * (base * 0.4 + 380);
      const f = face(u, d0);
      const relief = f.h + (n3(ax / 34, d0 / 30, az / 34) - 0.5) * 5 + (n3(ax / 11 + 7, d0 / 11, az / 11) - 0.5) * 1.4 - 2;
      const dn = relief * grow;
      let rr = base + nr0 * dn;
      const d = d0 + nd0 * dn;
      hollow[j * nc + i] = f.hollow * grow;
      edge[j * nc + i] = f.edge * grow;
      const cut = cutAt(deg, d, rr);
      rr = cut.r;
      const k = j * nc + i;
      pos[k * 3] = Math.sin(t) * rr;
      pos[k * 3 + 1] = -d;
      pos[k * 3 + 2] = Math.cos(t) * rr;
      out[k] = rr - base;
      tone[k] = n4(ax / 110 + 3, d0 / 50, az / 110);
      dressed[k] = cut.dressed;
    }
    if (j % 4 === 0) await slice();
  }
  // Edges and hollows: what the cliff's structure says, and how far each point stands out from the points round it.
  const cell = new Float32Array(nc * nr * 4);
  for (let j = 0; j < nr; j++) for (let i = 0; i < nc; i++) {
    const k = j * nc + i, at = (jj: number, ii: number) => out[Math.min(nr - 1, Math.max(0, jj)) * nc + ((ii + nc) % nc)];
    const avg = (at(j - 3, i) + at(j + 3, i) + at(j, i - 6) + at(j, i + 6)) / 4;
    const dv = out[k] - avg;
    cell[k * 4] = tone[k];
    cell[k * 4 + 1] = Math.min(1, Math.max(hollow[k], -dv / 4));
    cell[k * 4 + 2] = Math.min(1, Math.max(edge[k] * 0.8, dv / 3));
    cell[k * 4 + 3] = dressed[k];
  }
  const idx: number[] = [];
  for (let j = 0; j < nr - 1; j++) for (let i = 0; i < nc; i++) {
    const a = j * nc + i, b = j * nc + ((i + 1) % nc), c = a + nc, d = b + nc;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('cell', new THREE.BufferAttribute(cell, 4));
  g.setIndex(idx);
  g.computeVertexNormals();
  return { geo: g, tris: idx.length / 3 };
}

// The masses that hang from the body: each a broken prism in flat faces, wide at its root, drawn down to an
// irregular point, leaning a little.
async function hanging(): Promise<Built> {
  const r = seeded(4471), nz = noise3(9);
  const pos: number[] = [], cell: number[] = [];
  // In clusters, as rock breaks: a great mass with smaller ones round it, right across the underside and out to its
  // sides, where its outline is drawn.
  const list: { deg: number; s: number; R: number; L: number }[] = [];
  for (let c = 0; c < 30; c++) {
    const deg = (r() - 0.5) * 2 * 118 * Math.sqrt(r()), s = 0.45 + 0.45 * r(), big = 0.4 + 0.6 * r();
    const R0 = (18 + 30 * big) * (0.75 + 0.5 * s), L0 = (16 + 36 * big) * (0.6 + 0.6 * s);
    list.push({ deg, s, R: R0, L: L0 });
    const n = 1 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) list.push({ deg: deg + (r() - 0.5) * 9, s: Math.min(0.9, s + (r() - 0.4) * 0.12), R: R0 * (0.35 + 0.35 * r()), L: L0 * (0.3 + 0.45 * r()) });
  }
  let made = 0;
  for (let q = 0; q < list.length; q++) {
    const { deg, s, R } = list[q];
    const d0 = ROCK.top + (ROCK.end - ROCK.top) * s, base = bodyReach(d0, deg);
    let L = list[q].L;
    L = Math.min(L, KEEL.mouth - 14 - d0);
    if (L < 5) continue;
    // Never over a rib's channel, the chute or the keel.
    if (RIB.bearings.some((b) => gap(deg, b) * D2R * base < R + RIB.half + 5)) continue;
    const t = deg * D2R, x = Math.sin(t) * base;
    if (Math.cos(t) > 0 && Math.abs(x) < CHUTE.half + R + 6) continue;
    if (base < KEEL.flange + R + 6) continue;
    const out = new THREE.Vector3(Math.sin(t), 0, Math.cos(t)), side = new THREE.Vector3(Math.cos(t), 0, -Math.sin(t));
    const root = out.clone().multiplyScalar(base - R * 0.55).setY(-d0 + 4);
    const drift = out.clone().multiplyScalar((r() - 0.6) * 0.25 * L).addScaledVector(side, (r() - 0.5) * 0.2 * L);
    const sides = 7 + Math.floor(r() * 3), rings = 5, ph = r() * Math.PI * 2;
    const ring: THREE.Vector3[][] = [];
    for (let k = 0; k <= rings; k++) {
      const u = k / rings, c = root.clone().add(drift.clone().multiplyScalar(u * u)).setY(root.y - (L + 4) * u);
      const rad = R * (0.22 + 0.78 * Math.pow(1 - u, 0.55 + 0.3 * r()));
      const pts: THREE.Vector3[] = [];
      for (let e = 0; e < sides; e++) {
        const a = ph + (e / sides) * Math.PI * 2 + (nz(e * 1.7, k * 0.9, q) - 0.5) * 0.6;
        const m = rad * (0.7 + 0.6 * nz(e * 0.8 + q, k * 1.3, 2));
        pts.push(c.clone().addScaledVector(side, Math.cos(a) * m * 1.25).addScaledVector(out, Math.sin(a) * m));
      }
      ring.push(pts);
    }
    const tip = root.clone().add(drift).setY(root.y - L - 4 - R * 0.08);
    const tn = r();
    const put = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, hollow: number) => {
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
      for (let z = 0; z < 3; z++) cell.push(tn, hollow, 0.35, 0);
    };
    for (let k = 0; k < rings; k++) for (let e = 0; e < sides; e++) {
      const a = ring[k][e], b = ring[k][(e + 1) % sides], c = ring[k + 1][e], d = ring[k + 1][(e + 1) % sides];
      const hol = k === 0 ? 0.7 : k === 1 ? 0.3 : 0;
      put(a, c, b, hol);
      put(b, c, d, hol);
    }
    for (let e = 0; e < sides; e++) put(ring[rings][e], tip, ring[rings][(e + 1) % sides], 0);
    if (++made % 20 === 0) await slice();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('cell', new THREE.Float32BufferAttribute(cell, 4));
  await slice();
  // Smooth across a face that only bends, sharp where the rock is broken.
  const creased = toCreasedNormals(g, 0.6);
  g.dispose();
  return { geo: creased, tris: pos.length / 9 };
}

export async function rock(): Promise<{ body: THREE.BufferGeometry; hang: THREE.BufferGeometry; tris: number }> {
  const a = await body();
  await slice();
  const b = await hanging();
  return { body: a.geo, hang: b.geo, tris: a.tris + b.tris };
}
