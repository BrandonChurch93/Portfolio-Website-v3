import * as THREE from 'three';
import { Builder, pause, seeded, type Vec3 } from '../../world/build';
import { slab } from '../../world/shape';
import { lin, shade } from '../../world/surface';
import { hex, type PaletteName } from '../../config/palette';
import { boardArt } from './art';
import {
  BAY_AT, BOARD, BRUSH, CHIP_AT, DABS, DIPPER, HOLE, KNIFE, MARK, MIX, SWATCHES,
  brushAxis, holeAt, knifeAxis, rim, rimAt, type P2, type Swatch,
} from './layout';
import { coil } from './coil';
import { PAINT, depthMaterial, partChunks, shared, type Shared } from './shading';

// The palette and everything on it, in millimetres under a root scaled by 0.001. Every part is merged by material
// with the others and carries its own number, so the shaders can move it alone.
//
// Only the paints are colored. The walnut runs from a dark pore to a warm mid brown in its light streaks; the brush's
// lacquer is a near black with a copper band; the knife's blade and neck are warm steel; the ferrule, the bolster, the
// rivets, the pins and the dipper are copper and brass. That is what tells the materials apart: wet paint beside
// varnished wood beside lacquer beside polished steel beside copper.

export type Kind = 'board' | 'dab' | 'mix' | 'bead' | 'knife' | 'brush' | 'dipper';
export interface PartDef {
  kind: Kind;
  c: Vec3;
  r: number;
  n?: number;
  lo: Vec3;
  hi: Vec3;
}

export interface PaletteModel {
  root: THREE.Group;
  parts: PartDef[];
  u: Shared;
  meshes: THREE.Mesh[];
  shadow: THREE.Mesh;
  tris: number;
}

const shadeOf = (name: PaletteName, k: number) => new THREE.Color(hex(name)).multiplyScalar(k);
const L = (name: PaletteName, k = 1) => lin(shadeOf(name, k).getHex());
const sm = (a: number, b: number, v: number) => { const k = Math.min(1, Math.max(0, (v - a) / (b - a))); return k * k * (3 - 2 * k); };
const V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// A smooth value noise in two dimensions, for shapes worked out on the CPU.
function noise2(seed: number): (x: number, y: number) => number {
  const h = (i: number, j: number) => { const s = Math.sin(i * 127.1 + j * 311.7 + seed * 74.7) * 43758.5453; return s - Math.floor(s); };
  return (x, y) => {
    const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    return (h(i, j) * (1 - ux) + h(i + 1, j) * ux) * (1 - uy) + (h(i, j + 1) * (1 - ux) + h(i + 1, j + 1) * ux) * uy;
  };
}

// ---- the board ---------------------------------------------------------------------------------------------------

// The board is one closed surface swept round the thumb hole: for each point of the outline, a row runs across the
// top from the hole to the edge, over the rounded edge, back under the bottom, and up the hole's wall. Its normals are
// worked out from the profile, so the flat top is flat to its edge. Each triangle belongs to the tile of the nearest
// seed, so the tiles it is struck from close exactly at rest.
interface Tile { c: P2; r: number }
function boardSurface(seeds: P2[]): { geo: THREE.BufferGeometry; tiles: Tile[]; owner: number[] } {
  const n = BOARD.cols, T = BOARD.thick, e = BOARD.round;
  const outer = rim(n);
  let area = 0;
  for (let i = 0; i < n; i++) { const a = outer[i], b = outer[(i + 1) % n]; area += a[0] * b[1] - b[0] * a[1]; }
  const turn = area > 0 ? 1 : -1;
  const cols: { p: Vec3[]; nm: Vec3[]; hole: boolean[] }[] = [];
  const TOP = 8;
  for (let i = 0; i < n; i++) {
    const O = outer[i], a = outer[(i + n - 1) % n], b = outer[(i + 1) % n];
    const tx = b[0] - a[0], tz = b[1] - a[1], tl = Math.hypot(tx, tz) || 1;
    const N: P2 = [(tz / tl) * turn, (-tx / tl) * turn];
    const ang = Math.atan2(O[1] - HOLE.z, O[0] - HOLE.x);
    const Hp = holeAt(ang);
    const u: P2 = [Math.cos(ang), Math.sin(ang)];
    const p: Vec3[] = [], nm: Vec3[] = [], hole: boolean[] = [];
    const put = (x: number, y: number, z: number, nx: number, ny: number, nz: number, h = false) => { p.push([x, y, z]); nm.push([nx, ny, nz]); hole.push(h); };
    const inner: P2 = [Hp[0] + u[0] * e, Hp[1] + u[1] * e], edge: P2 = [O[0] - N[0] * e, O[1] - N[1] * e];
    for (let k = 0; k <= TOP; k++) {
      const s = 0.5 - 0.5 * Math.cos((k / TOP) * Math.PI);
      put(inner[0] + (edge[0] - inner[0]) * s, 0, inner[1] + (edge[1] - inner[1]) * s, 0, 1, 0);
    }
    const R = 6;
    for (let k = 1; k <= R; k++) { const a2 = (k / R) * (Math.PI / 2); put(edge[0] + N[0] * e * Math.sin(a2), -e + e * Math.cos(a2), edge[1] + N[1] * e * Math.sin(a2), N[0] * Math.sin(a2), Math.cos(a2), N[1] * Math.sin(a2)); }
    for (let k = 0; k <= R; k++) { const a2 = (k / R) * (Math.PI / 2); put(edge[0] + N[0] * e * Math.cos(a2), -T + e - e * Math.sin(a2), edge[1] + N[1] * e * Math.cos(a2), N[0] * Math.cos(a2), -Math.sin(a2), N[1] * Math.cos(a2)); }
    put(edge[0] + (inner[0] - edge[0]) * 0.5, -T, edge[1] + (inner[1] - edge[1]) * 0.5, 0, -1, 0);
    for (let k = 0; k <= R; k++) { const a2 = (k / R) * (Math.PI / 2); put(inner[0] - u[0] * e * Math.sin(a2), -T + e - e * Math.cos(a2), inner[1] - u[1] * e * Math.sin(a2), -u[0] * Math.sin(a2), -Math.cos(a2), -u[1] * Math.sin(a2), true); }
    for (let k = 0; k < R; k++) { const a2 = (k / R) * (Math.PI / 2); put(inner[0] - u[0] * e * Math.cos(a2), -e + e * Math.sin(a2), inner[1] - u[1] * e * Math.cos(a2), -u[0] * Math.cos(a2), Math.sin(a2), -u[1] * Math.cos(a2), true); }
    cols.push({ p, nm, hole });
  }
  const rows = cols[0].p.length;
  const pos: number[] = [], nor: number[] = [], owner: number[] = [];
  const near = (x: number, z: number) => { let best = 0, bd = Infinity; seeds.forEach((s, k) => { const d = (s[0] - x) ** 2 + (s[1] - z) ** 2; if (d < bd) { bd = d; best = k; } }); return best; };
  const holeSeed = near(HOLE.x, HOLE.z);
  const tri = (a: [number, number], b: [number, number], c: [number, number]) => {
    const vs = [a, b, c].map(([i, j]) => ({ p: cols[i % n].p[j % rows], nm: cols[i % n].nm[j % rows], h: cols[i % n].hole[j % rows] }));
    const cx = (vs[0].p[0] + vs[1].p[0] + vs[2].p[0]) / 3, cz = (vs[0].p[2] + vs[1].p[2] + vs[2].p[2]) / 3;
    const who = vs.some((v) => v.h) ? holeSeed : near(cx, cz);
    for (const v of vs) { pos.push(...v.p); nor.push(...v.nm); }
    owner.push(who);
  };
  for (let i = 0; i < n; i++) for (let j = 0; j < rows; j++) {
    tri([i, j], [i, j + 1], [i + 1, j]);
    tri([i + 1, j], [i, j + 1], [i + 1, j + 1]);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  {
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), nn = new THREE.Vector3();
    const P = geo.getAttribute('position') as THREE.BufferAttribute, Nn = geo.getAttribute('normal') as THREE.BufferAttribute;
    const swap = (A: THREE.BufferAttribute, i: number, j: number) => { const x = A.getX(i), y = A.getY(i), z = A.getZ(i); A.setXYZ(i, A.getX(j), A.getY(j), A.getZ(j)); A.setXYZ(j, x, y, z); };
    for (let t = 0; t < P.count; t += 3) {
      a.fromBufferAttribute(P, t); b.fromBufferAttribute(P, t + 1); c.fromBufferAttribute(P, t + 2);
      nn.set(Nn.getX(t) + Nn.getX(t + 1) + Nn.getX(t + 2), Nn.getY(t) + Nn.getY(t + 1) + Nn.getY(t + 2), Nn.getZ(t) + Nn.getZ(t + 1) + Nn.getZ(t + 2));
      if (b.sub(a).cross(c.sub(a)).dot(nn) < 0) { swap(P, t + 1, t + 2); swap(Nn, t + 1, t + 2); }
    }
  }
  const tiles: Tile[] = seeds.map((s) => ({ c: s, r: 0 }));
  for (let t = 0; t < owner.length; t++) {
    const tl = tiles[owner[t]];
    for (let k = 0; k < 3; k++) tl.r = Math.max(tl.r, Math.hypot(pos[(t * 3 + k) * 3] - tl.c[0], pos[(t * 3 + k) * 3 + 2] - tl.c[1]));
  }
  return { geo, tiles, owner };
}

function seedsFor(): P2[] {
  const r = seeded(5311), out: P2[] = [[HOLE.x, HOLE.z]];
  const pts = rim(240);
  const inside = (x: number, z: number) => { let hit = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, zi] = pts[i], [xj, zj] = pts[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) hit = !hit; } return hit; };
  const NX = 5, NZ = 4;
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
    const x = -150 + (i + 0.5 + (r() - 0.5) * 0.6) * (300 / NX), z = -108 + (j + 0.5 + (r() - 0.5) * 0.6) * (216 / NZ);
    if (!inside(x, z) || Math.hypot(x - HOLE.x, z - HOLE.z) < 40) continue;
    out.push([x, z]);
  }
  return out;
}

// ---- shapes ------------------------------------------------------------------------------------------------------

// A grid of rings round a middle, for anything that lies on the board as a blob or a film: f(s, a) gives the height
// at s of the way out (past 1 it runs under the board) and a round, and foot(a) the radius. uv: how far out and how
// high, unless uvOf says otherwise.
function blob(cx: number, cz: number, rings: number, segs: number, foot: (a: number) => number, f: (s: number, a: number, x: number, z: number) => number,
  push?: (s: number, a: number, y: number) => P2, uvOf?: (x: number, z: number, s: number, y: number) => P2): THREE.BufferGeometry {
  const pos: number[] = [], uv: number[] = [];
  let top = 0;
  for (let k = 0; k <= rings; k++) for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2, s = (k / rings) * 1.12, rr = Math.min(s, 1), fr = foot(a);
    let x = Math.cos(a) * s * fr, z = Math.sin(a) * s * fr;
    const y = s > 1 ? -0.6 * ((s - 1) / 0.12) : f(rr, a, x, z);
    if (push && s <= 1) { const d = push(rr, a, y); x += d[0]; z += d[1]; }
    top = Math.max(top, y);
    pos.push(cx + x, Math.max(y, -0.6), cz + z);
    const w = uvOf ? uvOf(x, z, s, y) : ([Math.min(s, 1.12), y] as P2);
    uv.push(w[0], w[1]);
  }
  if (!uvOf) for (let i = 1; i < uv.length; i += 2) uv[i] = Math.max(0, uv[i]) / Math.max(top, 1e-3);
  const idx: number[] = [], W = segs + 1;
  for (let k = 0; k < rings; k++) for (let i = 0; i < segs; i++) { const a = k * W + i; idx.push(a, a + 1, a + W, a + 1, a + W + 1, a + W); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const Nn = g.getAttribute('normal') as THREE.BufferAttribute;
  for (let i = 0; i <= segs; i++) Nn.setXYZ(i, 0, 1, 0);
  for (let k = 0; k <= rings; k++) {
    const a = k * W, b = k * W + segs;
    const nx = Nn.getX(a) + Nn.getX(b), ny = Nn.getY(a) + Nn.getY(b), nz = Nn.getZ(a) + Nn.getZ(b), l = Math.hypot(nx, ny, nz) || 1;
    Nn.setXYZ(a, nx / l, ny / l, nz / l); Nn.setXYZ(b, nx / l, ny / l, nz / l);
  }
  return g;
}

function dabSurface(d: { x: number; z: number; r: number; h: number; lean: number; twist: number }, small = false): THREE.BufferGeometry {
  if (small) {
    const f = (rr: number) => d.h * Math.pow(Math.max(0, 1 - rr * rr), 0.5);
    return blob(d.x, d.z, 8, 24, () => d.r, f);
  }
  const c = coil(d);
  const ln = (d.lean * Math.PI) / 180, lx = Math.cos(ln), lz = Math.sin(ln);
  const f = (_rr: number, _a: number, x: number, z: number) => c.at(x, z);
  // The peak hangs a little over the way it was pulled, as soft paint does.
  const push = (_rr: number, _a: number, y: number): P2 => { const k = Math.max(0, y / d.h) ** 4 * 0.2 * d.r; return [lx * k, lz * k]; };
  return blob(d.x, d.z, 18, 48, c.reach, f, push);
}

// A section of something swept along a path: half its width (across, lying flat) and half its thickness (up), and
// how square it is: 2 is an ellipse, higher is a rounded rectangle. A flat bottomed one sits on what is under it.
interface Sec { w: number; t: number; n?: number; flat?: boolean }
function sweep(path: THREE.Vector3[], ups: THREE.Vector3[] | THREE.Vector3, sec: (i: number, u: number) => Sec, ring = 20): THREE.BufferGeometry {
  const pos: number[] = [], uv: number[] = [];
  const T = new THREE.Vector3(), U = new THREE.Vector3(), S = new THREE.Vector3(), P = new THREE.Vector3();
  let dist = 0;
  const n = path.length;
  for (let i = 0; i < n; i++) {
    if (i > 0) dist += path[i].distanceTo(path[i - 1]);
    T.copy(path[Math.min(n - 1, i + 1)]).sub(path[Math.max(0, i - 1)]).normalize();
    U.copy(Array.isArray(ups) ? ups[i] : ups);
    U.addScaledVector(T, -U.dot(T)).normalize();
    S.crossVectors(T, U).normalize();
    const s = sec(i, i / (n - 1)), e = 2 / (s.n ?? 2);
    for (let k = 0; k <= ring; k++) {
      const a = (k / ring) * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
      const cx = Math.sign(c) * Math.abs(c) ** e * s.w;
      let cy = Math.sign(sn) * Math.abs(sn) ** e * s.t;
      if (s.flat && sn < 0) cy = sn * 0.12 * s.t;
      P.copy(path[i]).addScaledVector(S, cx).addScaledVector(U, cy);
      pos.push(P.x, P.y, P.z);
      uv.push(dist, k / ring);
    }
  }
  const idx: number[] = [], W = ring + 1;
  for (let i = 0; i < n - 1; i++) for (let k = 0; k < ring; k++) { const a = i * W + k; idx.push(a, a + W, a + 1, a + 1, a + W, a + W + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  // The winding follows the frame: turn it outward if it came out inward.
  {
    const mid = Math.floor(n / 2) * W + Math.round(ring / 4), Nn = g.getAttribute('normal');
    const i0 = Math.floor(n / 2), c = path[i0];
    const v = V3(pos[mid * 3] - c.x, pos[mid * 3 + 1] - c.y, pos[mid * 3 + 2] - c.z);
    if (v.dot(V3(Nn.getX(mid), Nn.getY(mid), Nn.getZ(mid))) < 0) {
      for (let t = 0; t < idx.length; t += 3) { const x = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = x; }
      g.setIndex(idx);
      g.computeVertexNormals();
    }
  }
  const Nn = g.getAttribute('normal') as THREE.BufferAttribute;
  for (let i = 0; i < n; i++) {
    const a = i * W, b = i * W + ring;
    const nx = Nn.getX(a) + Nn.getX(b), ny = Nn.getY(a) + Nn.getY(b), nz = Nn.getZ(a) + Nn.getZ(b), l = Math.hypot(nx, ny, nz) || 1;
    Nn.setXYZ(a, nx / l, ny / l, nz / l); Nn.setXYZ(b, nx / l, ny / l, nz / l);
  }
  return g;
}

// A swatch drawn down with the knife: a flat strip of paint pulled from where the blade set down, a ridge along each
// side where the paint was squeezed out from under the blade's edges, a roll where it set down, and the far end
// broken into streaks with a ragged lip where it lifted. Cells the paint does not reach are left out, and those it
// only partly covers kept, so its edge is where the paint meets the wood and not a step of the grid.
function swatchSurface(sw: Swatch, k: number): THREE.BufferGeometry {
  const nz = noise2(sw.seed), nb = noise2(sw.seed + 40);
  const a = (sw.dir * Math.PI) / 180, ux = Math.cos(a), uz = Math.sin(a), vx = -uz, vz = ux;
  const half = sw.w / 2, SA = 0.85, SC = 0.42;
  const na = Math.ceil((sw.len + 4) / SA), nc = Math.ceil((sw.w + 3) / SC);
  const W = nc + 1;
  const H = new Float32Array((na + 1) * W), R = new Float32Array(H.length);
  for (let i = 0; i <= na; i++) for (let j = 0; j <= nc; j++) {
    const t = -1.5 + i * SA, c = -half - 1.5 + j * SC;
    const edge = half * (1 + 0.025 * (nz(t * 0.15, 3) - 0.5)) + 0.25 * (nz(t * 0.6, 9) - 0.5);
    const end = sw.len * (0.9 + 0.1 * nz(c * 0.32, 5)) - 0.9 * nb(c * 1.4, 2);
    const streak = nb(c * 0.9, 7) + 0.25 * nb(c * 3.1, 1);
    const broken = sm(0.18, 0.5, streak + 1.05 * (1 - sm(0.62, 0.98, t / end)));
    const inside = sm(-0.5, 0.4, t) * (1 - sm(end - 0.6, end + 0.2, t)) * (1 - sm(edge - 0.3, edge + 0.15, Math.abs(c)));
    const film = 0.28 + 0.05 * Math.sin(c * 4.2 + 2 * nz(t * 0.1, c)) - 0.08 * (t / sw.len);
    const ridge = 0.55 * Math.exp(-(((Math.abs(c) - edge + 0.7) / 0.55) ** 2)) * (1 - 0.6 * sm(0.7, 1, t / end)) * (0.8 + 0.4 * nz(t * 0.2, c > 0 ? 1 : 4));
    const roll = 0.85 * Math.exp(-(((t - 0.6) / 1.1) ** 2)) * (0.85 + 0.3 * nz(c * 0.4, 8));
    const lip = 0.38 * Math.exp(-(((t - end + 0.7) / 0.6) ** 2)) * broken;
    const h = (film * broken + ridge + roll + lip) * inside;
    const o = i * W + j;
    H[o] = h > 0.06 ? h : -0.5;
    R[o] = Math.max(ridge / 0.55, roll / 0.85, lip / 0.38);
  }
  const pos: number[] = [], uv: number[] = [], cell: number[] = [];
  for (let i = 0; i <= na; i++) for (let j = 0; j <= nc; j++) {
    const t = -1.5 + i * SA, c = -half - 1.5 + j * SC, o = i * W + j;
    pos.push(sw.at[0] + ux * t + vx * c, H[o], sw.at[1] + uz * t + vz * c);
    uv.push(t / sw.len, c / half);
    cell.push(PAINT.mix, k, R[o], 0);
  }
  const idx: number[] = [];
  for (let i = 0; i < na; i++) for (let j = 0; j < nc; j++) {
    const p0 = i * W + j, p1 = p0 + 1, p2 = p0 + W, p3 = p2 + 1;
    if (H[p0] < 0 && H[p1] < 0 && H[p2] < 0 && H[p3] < 0) continue;
    idx.push(p0, p1, p2, p1, p3, p2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('cell', new THREE.Float32BufferAttribute(cell, 4));
  g.setIndex(idx);
  g.computeVertexNormals();
  const Nn = g.getAttribute('normal');
  let up = 0;
  for (let i = 0; i < Nn.count; i++) up += Nn.getY(i);
  if (up < 0) { for (let t = 0; t < idx.length; t += 3) { const x = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = x; } g.setIndex(idx); g.computeVertexNormals(); }
  return g;
}

// A turned thing round an axis: profile points (radius, distance along), placed so the profile's axis runs from
// `from` along `dir`, with x of the lathe lying flat and its z up. bend lowers the points near the start.
function turned(profile: [number, number][], segs: number, from: THREE.Vector3, dir: THREE.Vector3, bend?: (s: number) => number): THREE.BufferGeometry {
  const g = new THREE.LatheGeometry(profile.map(([r, s]) => new THREE.Vector2(Math.max(r, 0.0001), s)), segs);
  if (bend) {
    const p = g.getAttribute('position');
    for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) - bend(p.getY(i)));
    g.computeVertexNormals();
  }
  const A = dir.clone().normalize();
  const P = new THREE.Vector3(-A.z, 0, A.x).normalize();
  const U = new THREE.Vector3().crossVectors(P, A).normalize();
  g.applyMatrix4(new THREE.Matrix4().makeBasis(P, A, U).setPosition(from));
  const uv = g.getAttribute('uv');
  const ys = profile.map(([, s]) => s);
  const lo = Math.min(...ys), hi = Math.max(...ys);
  for (let i = 0; i < uv.count; i++) uv.setXY(i, lo + (hi - lo) * uv.getY(i), uv.getX(i));
  return g;
}

function profileOf(st: [number, number][], step: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < st.length - 1; i++) {
    const [r0, s0] = st[i], [r1, s1] = st[i + 1];
    const k = Math.max(1, Math.ceil(Math.abs(s1 - s0) / step));
    for (let j = 0; j < k; j++) { const t = j / k, e = t * t * (3 - 2 * t); out.push([r0 + (r1 - r0) * e, s0 + (s1 - s0) * t]); }
  }
  out.push(st[st.length - 1]);
  return out;
}

// Something turned about an upright axis at (x, y, z): a profile of (radius, height) points.
function upright(profile: [number, number][], segs: number, x: number, y: number, z: number): THREE.BufferGeometry {
  const g = new THREE.LatheGeometry(profile.map(([r, h]) => new THREE.Vector2(Math.max(r, 0.0001), h)), segs);
  g.translate(x, y, z);
  return g;
}

// A small domed head (a rivet, a pin's end) standing on a face at p, its dome along up.
function dome(p: THREE.Vector3, up: THREE.Vector3, r: number, h: number): THREE.BufferGeometry {
  const g = new THREE.LatheGeometry([[r * 0.98, -0.2], [r, h * 0.15], [r * 0.85, h * 0.55], [r * 0.5, h * 0.88], [0.0001, h]].map(([a, b]) => new THREE.Vector2(a, b)), 20);
  const U = up.clone().normalize(), S = new THREE.Vector3(1, 0, 0);
  if (Math.abs(S.dot(U)) > 0.9) S.set(0, 0, 1);
  const T = new THREE.Vector3().crossVectors(S, U).normalize();
  S.crossVectors(U, T).normalize();
  g.applyMatrix4(new THREE.Matrix4().makeBasis(S, U, T).setPosition(p));
  return g;
}

// ---- the build ---------------------------------------------------------------------------------------------------

export async function buildPalette(): Promise<PaletteModel> {
  const root = new THREE.Group();
  root.scale.setScalar(0.001);
  const u = shared();
  u.uArt.value = boardArt();
  const b = new Builder();
  const parts: PartDef[] = [];
  const part = (d: Omit<PartDef, 'lo' | 'hi'>) => { parts.push({ ...d, lo: [Infinity, Infinity, Infinity], hi: [-Infinity, -Infinity, -Infinity] }); return parts.length - 1; };
  // Adds a geometry for part i: cell gives the cell attribute's x, y and z, or a function of each vertex's place.
  const add = (i: number, geo: THREE.BufferGeometry, mat: THREE.Material, cell: [number, number, number] | ((x: number, y: number, z: number) => [number, number, number]) | 'keep' = [0, 0, 0]) => {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const n = g.getAttribute('position').count;
    if (cell === 'keep') {
      const c = g.getAttribute('cell') as THREE.BufferAttribute;
      for (let k = 0; k < n; k++) c.setW(k, i);
    } else {
      const P = g.getAttribute('position');
      const arr = new Float32Array(n * 4);
      for (let k = 0; k < n; k++) {
        const v = typeof cell === 'function' ? cell(P.getX(k), P.getY(k), P.getZ(k)) : cell;
        arr[k * 4] = v[0]; arr[k * 4 + 1] = v[1]; arr[k * 4 + 2] = v[2]; arr[k * 4 + 3] = i;
      }
      g.setAttribute('cell', new THREE.Float32BufferAttribute(arr, 4));
    }
    if (!g.getAttribute('uv')) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2));
    g.computeBoundingBox();
    const bb = g.boundingBox!, pd = parts[i];
    for (let k = 0; k < 3; k++) { pd.lo[k] = Math.min(pd.lo[k], bb.min.getComponent(k)); pd.hi[k] = Math.max(pd.hi[k], bb.max.getComponent(k)); }
    b.add(g, mat);
  };

  const wood = boardMaterial(u);
  const paint = paintMaterial(u);
  const handle = handleMaterial(u);
  const satin = handleMaterial(u, true);
  const metal = metalMaterial(u);
  const hair = hairMaterial(u);
  await pause();

  // ---- the board, as the tiles it is struck from ----
  const seeds = seedsFor();
  const { geo: boardG, tiles, owner } = boardSurface(seeds);
  const tileParts = tiles.map((t) => part({ kind: 'board', c: [t.c[0], -BOARD.thick / 2, t.c[1]], r: t.r }));
  {
    const n = boardG.getAttribute('position').count, cell = new Float32Array(n * 4);
    for (let t = 0; t < owner.length; t++) for (let k = 0; k < 3; k++) cell[(t * 3 + k) * 4 + 3] = tileParts[owner[t]];
    boardG.setAttribute('cell', new THREE.Float32BufferAttribute(cell, 4));
    boardG.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n * 2), 2));
    const P = boardG.getAttribute('position');
    for (let t = 0; t < owner.length; t++) {
      const pd = parts[tileParts[owner[t]]];
      for (let k = 0; k < 3; k++) { const v = t * 3 + k; const xyz = [P.getX(v), P.getY(v), P.getZ(v)]; for (let a = 0; a < 3; a++) { pd.lo[a] = Math.min(pd.lo[a], xyz[a]); pd.hi[a] = Math.max(pd.hi[a], xyz[a]); } }
    }
    b.add(boardG, wood);
  }
  await pause();

  // ---- the paints: the scale along the rim, each with its pin and number, and the swatches ----
  DABS.forEach((d, k) => {
    const i = part({ kind: 'dab', c: [d.x, 0, d.z], r: d.r * 1.1, n: k });
    // How far each point lies in a crease where the rope folds on itself, and how far out on a ridge, from the height
    // round it: the shader darkens the one and puts the wet highlight on the other.
    const c = coil(d), R = 0.9;
    const fold = (x: number, z: number): [number, number, number] => {
      const lx = x - d.x, lz = z - d.z, h = c.at(lx, lz);
      const ring = (c.at(lx + R, lz) + c.at(lx - R, lz) + c.at(lx, lz + R) + c.at(lx, lz - R)) / 4;
      return [k, Math.min(1, Math.max(0, (ring - h) / 0.9)), Math.min(1, Math.max(0, (h - ring) / 0.6))];
    };
    add(i, dabSurface(d), paint, (x, _y, z) => fold(x, z));
  });
  // The pins go with the tile of the board they are driven into.
  {
    const near = (x: number, z: number) => { let best = 0, bd = Infinity; tiles.forEach((t, k) => { const dd = (t.c[0] - x) ** 2 + (t.c[1] - z) ** 2; if (dd < bd) { bd = dd; best = k; } }); return tileParts[best]; };
    for (const d of DABS) {
      const l = d.r + MARK.pin, x = d.x + d.inward[0] * l, z = d.z + d.inward[1] * l;
      add(near(x, z), dome(V3(x, 0, z), V3(0, 1, 0), MARK.pinR, MARK.pinH), metal, [7, 0, 0]);
    }
  }
  const iMix = part({ kind: 'mix', c: [MIX.x, 0, MIX.z], r: 40 });
  SWATCHES.forEach((sw, k) => add(iMix, swatchSurface(sw, k), paint, 'keep'));
  await pause();

  // ---- the round brush ----
  const A = new THREE.Vector3(Math.cos(BRUSH.dir), 0, Math.sin(BRUSH.dir));
  const tip = new THREE.Vector3(BRUSH.tip[0], BRUSH.lift, BRUSH.tip[1]);
  const bMid = brushAxis(BRUSH.hair + 60);
  const iBrush = part({ kind: 'brush', c: [bMid[0], BRUSH.lift, bMid[1]], r: 60 });
  {
    const h = BRUSH.hair, f = BRUSH.ferrule, Lh = BRUSH.handle, F = h + f;
    // The hairs: a full belly gathered to a fine point, bent down at the point onto the bead.
    const G = BRUSH.lift / 5;
    const R = (pts: [number, number][]): [number, number][] => pts.map(([r, sv]) => [r * G, sv]);
    const hairP = profileOf(R([[0.02, 0], [1.1, 1.8], [2.3, 5], [3.25, 10.5], [3.6, 15.5], [3.5, 21], [3.32, h], [3.3, h + 1.5]]), 0.7);
    const bend = (sv: number) => (sv < h ? (BRUSH.lift - 1.05) * (1 - sv / h) ** 2 : 0);
    add(iBrush, turned(hairP, 32, tip, A, bend), hair, [0, 0, 0]);
    // The ferrule: seamless, drawn from one tube, swelling toward the handle, with two crimp rings and a rolled lip.
    const c1 = F - 5.5, c2 = F - 9.5;
    const ferP = profileOf(R([
      [3.3, h - 0.3], [3.62, h + 0.25], [3.58, h + 1.1], [3.7, h + 8], [4.12, c2 - 2.5], [4.18, c2 - 0.75], [3.88, c2], [4.18, c2 + 0.75],
      [4.24, c1 - 0.75], [3.94, c1], [4.26, c1 + 0.75], [4.32, F - 1.4], [4.44, F - 0.45], [4.3, F], [4.15, F + 0.05],
    ]), 1.2);
    add(iBrush, turned(ferP, 44, tip, A), metal, [0, 0, 0]);
    // The handle: turned, swelling to a belly it rests on and drawn out to a long taper, in a deep lacquer.
    const s0 = F - 2, end = F + Lh;
    const handP = profileOf(R([[4.12, s0], [4.22, F + 0.8], [4.6, F + 12], [5.0, F + 42], [4.85, F + 80], [3.7, end - 40], [3.05, end - 12], [2.7, end - 3], [1.8, end - 0.7], [0.02, end]]), 3);
    add(iBrush, turned(handP, 32, tip, A), handle, [0, 0, 0]);
  }
  const beadAt = brushAxis(-2.5);
  const iBead = part({ kind: 'bead', c: [beadAt[0], 0, beadAt[1]], r: 5 });
  {
    // The bead: wet paint pressed out where the point rests, drawn a little way along the way the brush lies.
    const B = BRUSH.bead, nb = noise2(17);
    const foot = (a: number) => B.r / Math.hypot(Math.cos(a - BRUSH.dir) / 1.45, Math.sin(a - BRUSH.dir) / 0.8) * (0.92 + 0.16 * nb(Math.cos(a) * 2 + 3, Math.sin(a) * 2));
    add(iBead, blob(beadAt[0], beadAt[1], 9, 36, foot, (rr) => B.h * Math.pow(Math.max(0, 1 - rr * rr), 0.6)), paint, [PAINT.hot, 0, 0]);
  }
  await pause();

  // ---- the knife ----
  const kMid = knifeAxis(60);
  const iKnife = part({ kind: 'knife', c: [kMid[0], 4, kMid[1]], r: 70 });
  {
    const K = KNIFE, len = K.blade.len, dir = V3(Math.cos(K.dir), 0, Math.sin(K.dir)), side = V3(-dir.z, 0, dir.x);
    const at = (s: number, v: number): THREE.Vector2 => { const [x, z] = knifeAxis(s); return new THREE.Vector2(x + side.x * v, z + side.z * v); };
    const half = (s: number) => {
      const k = s / len;
      return (K.blade.w / 2) * Math.pow(Math.sin(Math.PI * Math.min(1, k / 0.68) * 0.5), 0.62) * (k > 0.68 ? 1 - 0.78 * sm(0.68, 1, k) : 1) + (k > 0.68 ? 1.2 * sm(0.9, 1, k) : 0);
    };
    const outline: THREE.Vector2[] = [];
    const STEPS = 44;
    for (let k = 0; k <= STEPS; k++) { const s = (k / STEPS) * len; outline.push(at(s, half(s))); }
    for (let k = STEPS; k >= 0; k--) { const s = (k / STEPS) * len; outline.push(at(s, -half(s))); }
    const flat = (o: THREE.Vector2[], y0: number, y1: number, bev: number) => { const g = slab(o.map((p) => new THREE.Vector2(p.x, -p.y)), [], y0, y1, bev, 2); g.rotateX(-Math.PI / 2); return g; };
    add(iKnife, flat(outline, 0.02, 0.5, 0.12), metal, [1, 0, 0]);
    // Paint left on the blade: a smear along the point and down one edge, and a thin skin across its face.
    const run: THREE.Vector3[] = [];
    for (let k = 0; k <= 22; k++) { const s = len * (0.02 + (k / 22) * 0.52); const p = at(s, -half(s) * 0.95); run.push(V3(p.x, 0.5, p.y)); }
    add(iKnife, sweep(run, V3(0, 1, 0), (k) => ({ w: 1.1 * (1 - 0.5 * Math.abs(k / 22 - 0.3)), t: 0.5 * (1 - 0.6 * (k / 22)), n: 2.2, flat: true }), 12), paint, [PAINT.knife, 0, 0]);
    // The neck: flat spring steel off the blade's shoulder, cranked up and along into the bolster.
    const neckPts: THREE.Vector3[] = [];
    const s0n = len - 6, s1n = len + K.neck.run;
    for (let k = 0; k <= 24; k++) {
      const q = k / 24, s = s0n + (s1n - s0n) * q;
      const y = 0.3 + (K.neck.rise - 0.3) * sm(0.28, 0.72, q);
      const p = knifeAxis(s);
      neckPts.push(V3(p[0], y, p[1]));
    }
    add(iKnife, sweep(neckPts, V3(0, 1, 0), (k) => { const q = k / 24; return { w: (K.neck.w / 2) * (1.25 - 0.35 * q), t: K.neck.t / 2, n: 7 }; }, 16), metal, [2, 0, 0]);
    // The handle's axis falls from the neck to where its end rests on the board.
    const sH0 = len + K.neck.run, sH1 = sH0 + K.bolster.len + K.handle.len;
    const from = V3(knifeAxis(sH0)[0], K.neck.rise, knifeAxis(sH0)[1]);
    const to = V3(knifeAxis(sH1)[0], K.handle.t / 2 * 0.92, knifeAxis(sH1)[1]);
    const axis = to.clone().sub(from), Lk = axis.length(), ad = axis.clone().normalize();
    const upK = V3(0, 1, 0).addScaledVector(ad, -ad.y).normalize();
    const onAxis = (s: number) => from.clone().addScaledVector(ad, s);
    const bp: THREE.Vector3[] = [];
    for (let k = 0; k <= 10; k++) bp.push(onAxis(-0.4 + (k / 10) * (K.bolster.len + 0.4)));
    add(iKnife, sweep(bp, upK, (k) => { const q = k / 10; const r = K.bolster.r * (0.62 + 0.38 * sm(0, 0.5, q)) * (1 + 0.05 * Math.exp(-(((q - 0.9) / 0.08) ** 2))); return { w: r, t: r * 0.86, n: 2.4 }; }, 28), metal, [3, 0, 0]);
    // The scales: two pieces of wood either side of the tang, rounded over, swelling under the palm, worn.
    const hp: THREE.Vector3[] = [];
    const HN = 30, hl = K.handle.len;
    for (let k = 0; k <= HN; k++) hp.push(onAxis(K.bolster.len - 0.3 + (k / HN) * (hl + 0.3)));
    const sec = (k: number): Sec => {
      const q = k / HN;
      const swell = 0.88 + 0.12 * Math.sin(Math.PI * Math.min(1, q * 1.15));
      const end = q > 0.94 ? Math.sqrt(Math.max(0.02, 1 - ((q - 0.94) / 0.06) ** 2)) : 1;
      return { w: (K.handle.w / 2) * swell * end, t: (K.handle.t / 2) * swell * end * (0.92 + 0.08 * q), n: 3.4 };
    };
    add(iKnife, sweep(hp, upK, sec, 32), satin, [1, 0, 0]);
    for (const q of [0.28, 0.66]) {
      const s = sec(Math.round(q * HN));
      const pTop = onAxis(K.bolster.len + q * hl).addScaledVector(upK, s.t - 0.25);
      add(iKnife, dome(pTop, upK, 1.45, 0.55), metal, [5, 0, 0]);
    }
  }
  await pause();

  // ---- the dipper ----
  {
    const D = DIPPER, { p: O, n: Nn, t: Tn } = rimAt(D.f);
    const Nv = V3(Nn[0], 0, Nn[1]), Tv = V3(Tn[0], 0, Tn[1]);
    const C = V3(O[0] + Nn[0] * (D.r + 0.7), 0, O[1] + Nn[1] * (D.r + 0.7));
    const iDip = part({ kind: 'dipper', c: [C.x, 2, C.z], r: D.r + 6 });
    const r = D.r, t = 0.55, y0 = D.bottom, y1 = D.top;
    // The cup: a flat foot with a rounded heel, a straight wall, a rim rolled outward over a wire, and the inside down
    // to the pool.
    const prof: [number, number][] = [[0.01, y0], [r - 1.4, y0], [r - 0.5, y0 + 0.25], [r - 0.08, y0 + 1.0], [r, y0 + 2.0], [r, y1 - 1.6]];
    const lipC: P2 = [r + 0.35, y1 - 0.75], lr = 0.82;
    for (let k = 0; k <= 14; k++) { const a = -Math.PI / 2 - Math.PI * 0.35 + (k / 14) * Math.PI * 1.85; prof.push([lipC[0] + Math.cos(a) * lr * (a < 0 ? 1 : 1), lipC[1] + Math.sin(a) * lr]); }
    prof.push([r - t, y1 - 1.2], [r - t, D.pool - 0.6], [r - t - 0.5, D.pool - 1.2], [0.01, D.pool - 1.2]);
    const cup = upright(prof.map(([a, h]) => [Math.max(a, 0.0001), h] as [number, number]), 56, C.x, 0, C.z);
    add(iDip, cup, metal, [4, 0, 0]);
    const ri = r - t;
    add(iDip, upright([[ri - 0.05, D.pool + 0.75], [ri - 0.6, D.pool + 0.22], [ri * 0.7, D.pool + 0.05], [0.01, D.pool]], 48, C.x, 0, C.z), paint, [PAINT.pool, 0, 0]);
    // A drip of medium that ran down the outside from the lip.
    {
      const away = V3(-1, 0, 0.55).normalize();
      const dpts: THREE.Vector3[] = [], dups: THREE.Vector3[] = [];
      for (let k = 0; k <= 10; k++) { const y = y1 - 0.4 - (k / 10) * 9.5; dpts.push(C.clone().addScaledVector(away, r + 0.05 + (k === 0 ? 0.7 : 0)).setY(y)); dups.push(away.clone()); }
      add(iDip, sweep(dpts, dups, (k) => ({ w: 0.7 + 0.6 * (k / 10) ** 3, t: 0.35 + 0.6 * (k / 10) ** 4, n: 2, flat: true }), 12), paint, [PAINT.pool, 1, 0]);
    }
    // The clip: a hinge barrel on the cup's board side, and a spring jaw from it over the board's edge, turned up at
    // its end to be pressed open.
    const W0 = C.clone().addScaledVector(Nv, -r);
    const bar = W0.clone().addScaledVector(Nv, -1.4).setY(2.0);
    add(iDip, sweep([0, 0.5, 1].map((q) => W0.clone().addScaledVector(Nv, -0.15).setY(-3.4 + q * 5.4)), Nv.clone().negate(), () => ({ w: 3.4, t: 0.35, n: 6 }), 12), metal, [4, 0, 0]);
    const knuck = [[-3.6, -1.35], [-1.15, 1.15], [1.35, 3.6]];
    for (const [a, c] of knuck) {
      const pts = [0, 1].map((q) => bar.clone().addScaledVector(Tv, a + (c - a) * q));
      add(iDip, sweep(pts, V3(0, 1, 0), () => ({ w: 1.15, t: 1.15, n: 2 }), 16), metal, [4, 0, 0]);
    }
    add(iDip, dome(bar.clone().addScaledVector(Tv, 3.6), Tv, 0.75, 0.35), metal, [5, 0, 0]);
    add(iDip, dome(bar.clone().addScaledVector(Tv, -3.6), Tv.clone().negate(), 0.75, 0.35), metal, [5, 0, 0]);
    const jaw: THREE.Vector3[] = [];
    const JN = 18;
    for (let k = 0; k <= JN; k++) {
      const q = k / JN, d = 0.6 + q * (D.jaw + 1.6);
      const y = 2.0 - 1.45 * sm(0, 0.35, q) + 1.4 * sm(0.82, 1, q);
      jaw.push(bar.clone().addScaledVector(Nv, -d).setY(Math.max(y, 0.42)));
    }
    add(iDip, sweep(jaw, V3(0, 1, 0), (k) => ({ w: 2.7 - 0.5 * (k / JN), t: 0.32, n: 8 }), 14), metal, [4, 0, 0]);
  }
  await pause();

  const tris = b.tris;
  const meshes = b.build(root, 'palette');
  const depth = depthMaterial(u);
  for (const m of meshes) { m.customDepthMaterial = depth; m.frustumCulled = false; }

  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(380, 300), shadowMaterial(u));
  {
    const g = shadow.geometry;
    g.rotateX(-Math.PI / 2);
    g.translate(0, -BOARD.thick - 0.05, 0);
    shadow.frustumCulled = false;
    shadow.renderOrder = -1;
    shadow.userData.noWire = true;
    root.add(shadow);
  }
  return { root, parts, u, meshes, shadow, tris };
}

// ---- materials ---------------------------------------------------------------------------------------------------

const BUMP = /* glsl */ `
vec3 palBump(vec3 n, float h, float k){
  vec3 dx = dFdx(-vViewPosition), dy = dFdy(-vViewPosition);
  float hx = dFdx(h) * 0.001, hy = dFdy(h) * 0.001;
  vec3 r1 = cross(dy, n), r2 = cross(n, dx);
  float det = dot(dx, r1);
  if (abs(det) < 1e-12) return n;
  vec3 g = sign(det) * (hx * r1 + hy * r2);
  vec3 o = abs(det) * n - g * k;
  float l = length(o);
  return l > 1e-12 ? o / l : n;
}`;

// The knots: two, off centre, in open wood. Where, how large across and along the grain.
const KNOTS = [{ x: 22, z: 42, r: 4.2 }, { x: 128, z: -24, r: 2.6 }] as const;
// The growth rings: an axis under the board that rises toward the thumb hole, so the rings come up through the top
// as nested arches whose tips lie round the hole, and run out as long lines to the left.
const AXIS = { apex: 108, rise: 0.15, shallow: 6, z: HOLE.z } as const;
// Walnut, as shares of the site's bronze and its grey: the light streak, the body, the dark of a late year, the pore.
// year is how wide a growth ring is, in millimetres out from the axis.
// The varnish's sheen: the sharpness and strength of the broad band and of the brighter middle inside it.
// The lines the room's light draws down turned things (palLine): how sharp, and how bright.
const FINISH = { blade: 1.0, metal: { sharp: 300, soft: 3, k: 3.2 }, lacquer: { sharp: 1400, k: 1.3 }, satin: { sharp: 90, k: 0.22 } } as const;
// The wet paint's highlight: how sharp, and how bright.
const PAINT_GLINT = { sharp: 90, cut: [0.035, 0.075], k: 1.8, softK: 1.2 } as const;
// How the board falls off: the share of its own brown it keeps, how much darker it goes from z = from to z = to (its
// near edge), how much the tools darken what is under them, and the line of light along the far rim's chamfer.
const DEPTH = { body: 0.62, near: 0.72, from: 0, to: 105, under: 1.25, rim: 0.32 } as const;
const VARNISH = { band: 1500, bandK: 0.75, core: 9000, coreK: 0.35 } as const;
const GRAIN = { light: [0.5, 0.075], mid: [0.32, 0.05], dark: [0.12, 0.02], pore: [0.025, 0.0], year: 5.5 } as const;

function boardMaterial(u: Shared): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.6, specularIntensity: 0.1 });
  m.name = 'paletteWood';
  m.envMapIntensity = 0.16;
  m.userData.uniforms = u;
  const v2 = (p: P2) => `vec2(${p[0].toFixed(1)}, ${p[1].toFixed(1)})`;
  // Walnut, from the pore to its lightest streak: the site's deep bronze and its grey, in proportion.
  const wc = (a: number, b: number) => `(${L('bronze')} * ${a.toFixed(3)} + ${L('text-3')} * ${b.toFixed(3)})`;
  const knot = (k: (typeof KNOTS)[number]) => `vec3(${k.x.toFixed(1)}, ${k.z.toFixed(1)}, ${k.r.toFixed(1)})`;
  return shade(m, 'palette-wood', partChunks({
    head: /* glsl */ `${BUMP}
const vec3 PAL_KNOT[2] = vec3[2](${KNOTS.map(knot).join(', ')});
float palSegT(vec2 p, vec2 a, vec2 b, out float t){ vec2 e = b - a; t = clamp(dot(p - a, e) / dot(e, e), 0.0, 1.0); return length(p - a - e * t); }
// The short soft dark the tools lay on the wood where they lie on it or close over it, deepest where they touch.
float palContact(vec2 p){
  float t, c = 0.0;
  float d = palSegT(p, ${v2(brushAxis(0))}, ${v2(brushAxis(BRUSH.hair + BRUSH.ferrule + BRUSH.handle))}, t);
  float s = t * ${(BRUSH.hair + BRUSH.ferrule + BRUSH.handle).toFixed(1)};
  float r = ${(BRUSH.lift / 5).toFixed(3)} * (s < ${BRUSH.hair.toFixed(1)} ? 3.3 * smoothstep(0.0, 12.0, s) : s < ${(BRUSH.hair + BRUSH.ferrule).toFixed(1)} ? 4.2 : 4.9 - 1.6 * smoothstep(${(BRUSH.hair + BRUSH.ferrule + 80).toFixed(1)}, ${(BRUSH.hair + BRUSH.ferrule + BRUSH.handle).toFixed(1)}, s));
  float gap = max(${BRUSH.lift.toFixed(2)} - ${(BRUSH.lift - 1.05).toFixed(2)} * pow(max(1.0 - s / ${BRUSH.hair.toFixed(1)}, 0.0), 2.0) - r, 0.0);
  c = max(c, (1.0 - smoothstep(r * 0.25, r * 0.95 + 2.6 + gap, d)) * 0.62 * exp(-gap / 2.5) * uTools.x);
  d = palSegT(p, ${v2(knifeAxis(0))}, ${v2(knifeAxis(KNIFE.blade.len * 0.86))}, t);
  float bw = ${(KNIFE.blade.w / 2).toFixed(1)} * pow(sin(3.14159 * min(1.0, t / 0.7) * 0.5), 0.62) * (t > 0.7 ? 1.0 - 0.6 * smoothstep(0.7, 1.0, t) : 1.0);
  c = max(c, (1.0 - smoothstep(0.0, 1.6, abs(d - bw))) * step(d, bw + 1.6) * 0.5 * uTools.y);
  d = palSegT(p, ${v2(knifeAxis(KNIFE.blade.len + KNIFE.neck.run + 6.0))}, ${v2(knifeAxis(KNIFE.blade.len + KNIFE.neck.run + KNIFE.bolster.len + KNIFE.handle.len))}, t);
  float kg = mix(${(KNIFE.neck.rise - KNIFE.bolster.r).toFixed(2)}, 0.0, t);
  c = max(c, (1.0 - smoothstep(2.0, ${(KNIFE.handle.w / 2).toFixed(1)} + 2.5 + kg, d)) * 0.55 * exp(-kg / 2.5) * uTools.y);
  return c;
}
// The distance out from the rings' axis, with the grain bending round the knots. The axis wanders a little and lies
// shallowest just short of the hole's far side.
float palRadius(vec3 o){
  float z0 = ${AXIS.z.toFixed(1)} + 16.0 * sin(o.x * 0.011 + 0.6) + 9.0 * (wNoise(vec3(o.x * 0.012, 3.0, 1.0)) - 0.5);
  float y0 = -${AXIS.shallow.toFixed(1)} - ${AXIS.rise.toFixed(3)} * max(${AXIS.apex.toFixed(1)} - o.x, 0.0) - 0.9 * max(o.x - ${AXIS.apex.toFixed(1)}, 0.0);
  float r = length(vec2(o.z - z0, o.y - y0));
  r += 2.6 * (wFbm(vec3(o.x * 0.006, o.z * 0.025, o.y * 0.02 + 2.0)) - 0.5);
  for (int k = 0; k < 2; k++) {
    vec2 d = (o.xz - PAL_KNOT[k].xy) / vec2(1.7, 1.0);
    r += PAL_KNOT[k].z * 2.2 * exp(-dot(d, d) / (PAL_KNOT[k].z * PAL_KNOT[k].z * 5.0));
  }
  return r;
}
// The rings counted out from the axis: years of fast growth and slow, so the lines bunch and open.
float palYears(float r){ return (r + 7.0 * sin(r * 0.07 + 1.3) + 1.9 * sin(r * 0.21 + 0.4)) / ${GRAIN.year.toFixed(2)}; }
// Pores: short dark dashes along the grain, six rows to a year, more of them in the early wood. Under a pixel they
// become what they average to.
float palPores(float x, float yr, float late){
  float v = yr * 9.0, row = floor(v), fv = fract(v) - 0.5;
  float uu = x / 2.4 + palH(row * 1.7 + 3.0) * 13.0, cell = floor(uu), fu = fract(uu) - 0.5;
  float h1 = palH(row * 3.1 + cell * 7.3 + 1.0), h2 = palH(row * 5.7 + cell * 1.9 + 2.0);
  float len = 0.16 + 0.22 * h2, dens = 0.36 - 0.24 * late;
  float aa = max(fwidth(uu), fwidth(v));
  float dash = (1.0 - smoothstep(len - 0.05 - aa, len + 0.05 + aa, abs(fu))) * (1.0 - smoothstep(0.1, 0.24 + aa, abs(fv))) * step(h1, dens);
  return mix(dash, dens * 0.3 * 0.55, smoothstep(0.3, 0.8, aa));
}`,
    color: /* glsl */ `
  vec3 palO = vObj;
  float palRad = palRadius(palO);
  float palYr = palYears(palRad);
  float palRw = fwidth(palYr);
  float palF = fract(palYr);
  float palId = floor(palYr);
  float palLate = smoothstep(0.42, 0.86, palF) * (1.0 - smoothstep(0.9, 1.0, palF));
  // A line runs out and picks up again further along, and some years are fainter than others.
  float palRun = smoothstep(0.26, 0.62, wNoise(vec3(palO.x * 0.014, palId * 1.37, 3.0))) * (0.55 + 0.45 * palH(palId * 2.3 + 5.0));
  palLate *= 0.35 + 0.65 * palRun;
  palLate = mix(palLate, 0.3, smoothstep(0.25, 0.6, palRw));
  float palTop = smoothstep(0.92, 0.99, vObjN.y);
  float palEnd = 1.0 - palTop;
  float palPr = palPores(palO.x, palYr, palLate) * palTop * (0.75 + 0.25 * palRun);
  // The figure: broad streaks tens of millimetres wide that follow the rings, some years lighter, some a deeper
  // brown, so at the page's size the board reads as timber and not as a dark film.
  float palStreak = smoothstep(0.2, 0.8, wFbm(vec3(palO.x * 0.004, palRad * 0.06, 5.0)));
  float palBandY = 0.5 + 0.5 * sin(palRad * 0.21 + 3.0 * wNoise(vec3(palO.x * 0.01, palRad * 0.05, 7.0)));
  float palV = wFbm(palO * 0.018 + 4.0);
  vec3 palLight = ${wc(GRAIN.light[0], GRAIN.light[1])}, palMid = ${wc(GRAIN.mid[0], GRAIN.mid[1])}, palDark = ${wc(GRAIN.dark[0], GRAIN.dark[1])}, palPore = ${wc(GRAIN.pore[0], GRAIN.pore[1])};
  vec3 palWood = mix(palMid, palLight, palStreak * 0.85) * (0.88 + 0.24 * palV);
  palWood = mix(palWood, mix(palDark, palMid, 0.45), (1.0 - palStreak) * smoothstep(0.55, 0.95, palBandY) * 0.6);
  palWood = mix(palWood, palDark, palLate * (0.42 + 0.2 * (1.0 - palStreak)));
  // The knots: a dark heart with tight rings of its own, a darker rim, and a check across it.
  for (int k = 0; k < 2; k++) {
    vec2 d = (palO.xz - PAL_KNOT[k].xy) / vec2(1.25, 1.0);
    float l = length(d), R = PAL_KNOT[k].z;
    float inK = 1.0 - smoothstep(R * 0.92, R * 1.08, l);
    float kr = 0.5 + 0.5 * cos(l / R * 15.0 + 2.0 * wNoise(vec3(d * 0.6, 4.0)));
    vec3 kc = mix(${wc(0.08, 0.012)}, ${wc(0.03, 0.003)}, kr * 0.6 + 0.4 * smoothstep(R * 0.6, R, l));
    kc = mix(kc, palPore, (1.0 - smoothstep(0.0, 0.18 + fwidth(d.y), abs(d.y + 0.3 * d.x * d.x / R))) * (1.0 - smoothstep(R * 0.2, R * 0.7, l)) * 0.8);
    palWood = mix(palWood, kc, inK * palTop);
    palWood *= 1.0 - 0.35 * exp(-pow((l - R * 1.15) / (R * 0.5), 2.0)) * palTop;
  }
  // The end grain drinks the finish and is darker, its rings plain.
  palWood = mix(palWood, palWood * 0.7, palEnd);
  palWood = mix(palWood, palDark, palEnd * smoothstep(0.55, 0.85, palF) * 0.5);
  // Old paint ground into the pores near where the mixing is done and along the rim.
  float palNear = exp(-length((palO.xz - ${v2([MIX.x, MIX.z])}) / vec2(90.0, 60.0))) + 0.6 * smoothstep(55.0, 100.0, length(palO.xz / vec2(1.0, 0.78)));
  float palFill = smoothstep(0.45, 0.75, wFbm(vec3(palO.xz * 0.025, 9.0))) * min(palNear, 1.0) * palTop;
  float palWhich = floor(wNoise(vec3(palO.xz * 0.01, 3.0)) * 3.999);
  vec3 palTint = palWhich < 1.0 ? palAlbedo(2) : palWhich < 2.0 ? palAlbedo(1) : palWhich < 3.0 ? palAlbedo(6) : palAlbedo(3);
  vec3 palPoreC = mix(palPore, palTint * 0.07, palFill * 0.7);
  palWood = mix(palWood, palPoreC, palPr * 0.32);
  // A faint ghost of paint wiped thin over years, in broad patches.
  float palGhost = smoothstep(0.55, 0.8, wFbm(vec3(palO.xz * 0.012, 2.0))) * min(palNear, 1.0) * palTop;
  palWood = mix(palWood, palWood * 0.6 + palTint * 0.05, palGhost * 0.5);
  // The edge and the bevel worn pale where the hand holds it, the varnish rubbed through.
  float palHand = max(exp(-pow(length(vObj.xz - vec2(${HOLE.x.toFixed(1)}, ${HOLE.z.toFixed(1)})) / 30.0, 2.0)), exp(-pow(length(vObj.xz - ${v2(BAY_AT)}) / 44.0, 2.0)));
  float palWear = palEnd * smoothstep(0.1, 0.75, abs(vObjN.y)) * (0.45 + 0.55 * palHand) * (0.6 + 0.4 * wNoise(palO * 0.15));
  palWear = max(palWear, palTop * palHand * smoothstep(0.35, 0.7, wFbm(palO * 0.06 + 2.0)) * 0.8);
  vec3 palWorn = ${wc(0.62, 0.16)};
  palWood = mix(palWood, palWorn * (0.85 + 0.3 * palV) * (1.0 - 0.4 * palLate), palWear);
  float palChip = exp(-pow(length(vObj.xz - ${v2(CHIP_AT)}) / 5.5, 2.0)) * (1.0 - palTop * 0.7);
  palWood = mix(palWood, ${wc(0.9, 0.32)}, palChip * 0.85);
  // Each dab sits in a crisp shadow of its own, close round its foot.
  float palSit = palSitAt(palO.xz) * palTop;
  palWood *= 1.0 - 0.62 * palSit;
  float palUnder = palContact(palO.xz) * palTop;
  palWood *= 1.0 - ${DEPTH.under.toFixed(2)} * palUnder;
  // What is set into it: the scale's numbers in brass, the burned stamp.
  vec4 palA = palArt(vObj.xz) * palTop;
  float palBurn = palA.g;
  palWood = mix(palWood, ${wc(0.1, 0.02)}, smoothstep(0.0, 0.5, palBurn) * 0.55);
  palWood = mix(palWood, ${wc(0.012, 0.0)}, smoothstep(0.35, 0.9, palBurn));
  palWood = mix(palWood, palWood * 0.5 + ${L('ember', 0.25)} * 0.25, palA.b * 0.75);
  // The scale's numbers, inlaid in brass flush with the top.
  float palInlay = smoothstep(0.25, 0.75, palA.r);
  palWood = mix(palWood, ${L('copper-light', 0.7)} * 0.75 + ${L('bronze', 0.9)} * 0.25, palInlay);
  // The top's polished chamfer: a thin band of the rounded edge just over its shoulder, round the outline and the hole.
  float palAng = acos(clamp(normalize(vObjN).y, -1.0, 1.0));
  float palAw = max(0.09, fwidth(palAng) * 0.8);
  float palCham = exp(-pow((palAng - 0.6) / palAw, 2.0)) * (0.09 / palAw) * (1.0 - 0.5 * palChip);
  // The board falls off: a deeper, richer brown overall, darker still toward its near edge, so the scale and the
  // tools stand off it.
  palWood *= ${DEPTH.body.toFixed(2)} * mix(1.0, ${DEPTH.near.toFixed(2)}, smoothstep(${DEPTH.from.toFixed(1)}, ${DEPTH.to.toFixed(1)}, vObj.z));
  diffuseColor.rgb = palWood;`,
    rough: 'roughnessFactor = clamp(0.5 + 0.25 * palPr + 0.25 * palWear + 0.55 * smoothstep(0.1, 0.6, palBurn) + 0.2 * palA.b - 0.22 * palA.r + 0.25 * palChip + 0.12 * palEnd + 0.15 * palSit, 0.04, 1.0);',
    normal: /* glsl */ `
  { float h = -0.03 * smoothstep(0.2, 0.9, palBurn) - 0.4 * palChip * wNoise(vObj * 1.4) + 0.004 * palLate - 0.006 * palPr;
    normal = palBump(normal, h, 0.9); }`,
    emissive: /* glsl */ `
  // The varnish is satin: what it mirrors is the cursor's light as one broad soft band, which slides across the board
  // with the cursor. The varnish lies over the figure, so the band breaks over it: brighter on the light streaks,
  // dimmer over a dark year, gone in the pores, and the surface rolls a little with the rings so its edge wavers.
  { float k = (1.0 - 0.8 * palWear) * (1.0 - 0.85 * smoothstep(0.3, 0.8, palBurn)) * (1.0 - 0.5 * palPr) * (1.0 - 0.6 * palChip) * (1.0 - 0.75 * palSit) * (1.0 - palUnder);
    k *= (0.45 + 0.55 * palStreak) * (1.0 - 0.45 * palLate);
    vec3 palGleam = ${L('hot')} * 0.55 + ${L('pale')} * 0.45;
    vec3 palVn = normalize(nonPerturbedNormal);
    float roll = (wNoise(vec3(palRad * 0.35, palO.x * 0.01, 3.0)) - 0.5) * smoothstep(0.3, 0.05, palRw);
    vec3 palVr = normalize(palVn + cross(vAxX, vAxY) * roll * 0.035 + vAxX * roll * 0.015);
    totalEmissiveRadiance += palGleam * (palTube(palVr, ${VARNISH.band.toFixed(1)}) * ${VARNISH.bandK.toFixed(3)} + palTube(palVr, ${VARNISH.core.toFixed(1)}) * ${VARNISH.coreK.toFixed(3)}) * k * palTop;
    totalEmissiveRadiance += ${L('hot')} * palStrips(palVn, 90000.0) * 0.03 * k * palTop;
    // Chatoyance: the fibres lie at a tilt that turns over in bands across the grain, so a soft glow in the wood's
    // own color moves along the board as the cursor's light does.
    float tilt = (wNoise(vec3(vObj.x * 0.13, vObj.z * 0.008, 6.0)) * 2.0 - 1.0) * (0.5 + 0.5 * palStreak);
    vec3 nC = normalize(palVn + vAxX * tilt * 0.22);
    totalEmissiveRadiance += ${L('copper')} * palTube(nC, 420.0) * 0.05 * palTop * (1.0 - 0.7 * palSit) * (1.0 - 0.5 * palLate);
    // The far rim's chamfer and the thumb hole's catch a clear line of the room's light.
    float palFar = smoothstep(0.05, -0.5, vObjN.z) + exp(-pow(length(vObj.xz - vec2(${HOLE.x.toFixed(1)}, ${HOLE.z.toFixed(1)})) / 22.0, 2.0));
    totalEmissiveRadiance += palEdgeLit(palVn, palCham) * 1.6 + mix(${L('hot')}, ${L('pale')}, 0.6) * palCham * min(palFar, 1.0) * ${DEPTH.rim.toFixed(2)};
    totalEmissiveRadiance += (${L('copper-light')} * 0.8 + ${L('pale')} * 0.2) * (palTube(palVn, 2600.0) * 1.1 + 0.05) * palInlay * palTop; }`,
  }));
}

function paintMaterial(u: Shared): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.3, clearcoat: 0.5, clearcoatRoughness: 0.12, specularIntensity: 0.6 });
  m.name = 'palettePaint';
  m.defines = { USE_UV: '' };
  m.envMapIntensity = 0.45;
  m.userData.uniforms = u;
  const S = SWATCHES.length;
  return shade(m, 'palette-paint', partChunks({
    head: /* glsl */ `${BUMP}
const int PAL_SW_A[${S}] = int[${S}](${SWATCHES.map((w) => w.a).join(', ')});
const int PAL_SW_B[${S}] = int[${S}](${SWATCHES.map((w) => w.b).join(', ')});
const float PAL_SW_K[${S}] = float[${S}](${SWATCHES.map((w) => w.k.toFixed(2)).join(', ')});
const float PAL_SW_WET[${S}] = float[${S}](${SWATCHES.map((w) => w.wet.toFixed(2)).join(', ')});`,
    color: /* glsl */ `
  int palK = int(vCell.x + 0.5);
  int palSw = int(vCell.y + 0.5);
  float palWet = 0.0, palRidge = 0.0, palFoot = 1.0, palCrease = 0.0;
  vec3 palC;
  if (palK < ${PAINT.mix}) {
    // A squeeze of oil paint: one color through, a shade deeper in its creases and where it meets the wood.
    palSelf = palK;
    palC = palAlbedo(palK) * (0.96 + 0.08 * wNoise(vObj * 0.8));
    palFoot = smoothstep(0.0, 0.22, vUv.y);
    palC *= mix(0.55, 1.0, palFoot);
    // The crease where the rope lies on itself goes deep and dark; the ridges carry the wet light.
    palCrease = smoothstep(0.05, 0.7, vCell.y);
    palC *= 1.0 - 0.72 * palCrease;
    palRidge = vCell.z;
    palWet = 0.85 + 0.15 * palFoot;
  } else if (palK == ${PAINT.mix}) {
    // A swatch: two steps drawn into each other by the blade, not quite mixed, so faint streaks of each run along it.
    palSelf = 100 + palSw;
    vec2 q = palInSwatch(palSw, vObj.xz);
    float st = wNoise(vec3(q.y * 1.1, q.x * 0.05, float(palSw) * 3.0)) * 0.7 + wNoise(vec3(q.y * 3.3, q.x * 0.1, 5.0)) * 0.3;
    float k = clamp(PAL_SW_K[palSw] + (st - 0.5) * 0.4, 0.0, 1.0);
    palC = mix(palAlbedo(PAL_SW_A[palSw]), palAlbedo(PAL_SW_B[palSw]), k);
    palRidge = vCell.z;
    palWet = PAL_SW_WET[palSw];
  } else if (palK == ${PAINT.hot}) {
    palC = palAlbedo(5);
    palWet = 1.0;
  } else if (palK == ${PAINT.knife}) {
    palC = mix(palAlbedo(4), palAlbedo(8), smoothstep(0.3, 0.7, wNoise(vObj * 0.5)) * 0.6);
    palWet = 0.8;
  } else {
    // The medium in the dipper: a dark oil that mirrors, with a dried run down the cup's side.
    palC = ${L('ember-deep', 0.6)};
    palC = mix(palC, ${L('ember', 0.42)}, vCell.y);
    palWet = 1.0 - 0.5 * vCell.y;
  }
  diffuseColor.rgb = palC;`,
    rough: `roughnessFactor = clamp(mix(0.55, 0.12, palWet) - 0.06 * palRidge + 0.25 * palCrease, 0.05, 1.0); if (palK == ${PAINT.pool}) roughnessFactor = 0.06 + 0.4 * vCell.y;`,
    normal: /* glsl */ `
  { float px = length(fwidth(vObj));
    float fine = 1.0 - smoothstep(0.15, 0.5, px);
    float h = (wNoise(vObj * 1.3) - 0.5) * 0.025 * fine;
    if (palK == ${PAINT.mix}) {
      // The blade's marks: fine lines along the pull, and the paint's own slight tooth on the dry ones.
      vec2 q = palInSwatch(palSw, vObj.xz);
      h += 0.018 * sin(q.y * 7.5 + 2.5 * wNoise(vec3(q.x * 0.08, q.y * 0.6, 3.0))) * fine * (1.0 - palRidge);
      h += (wNoise(vObj * 2.6) - 0.5) * 0.03 * (1.0 - palWet) * fine;
    }
    normal = palBump(normal, h, 1.0); }`,
    emissive: /* glsl */ `
  // A wet skin: a small sharp highlight from the cursor's light that moves with it, and a soft sheen round it.
  { vec3 hot = mix(${L('pale')}, ${L('hot')}, 0.2);
    float ridge = palK < ${PAINT.mix} ? 0.6 + 0.8 * palRidge : 0.25 + 1.2 * palRidge;
    // The paint's ridges are so tightly curved that a mirror's highlight on them is a speck: the lobe is taken wide and
    // cut off hard, so it is a small crisp hot spot the size the eye expects on wet paint.
    float g = palTube(normal, ${PAINT_GLINT.sharp.toFixed(1)});
    float glint = smoothstep(${PAINT_GLINT.cut[0].toFixed(3)}, ${PAINT_GLINT.cut[1].toFixed(3)}, g) * ${PAINT_GLINT.k.toFixed(2)} + g * ${PAINT_GLINT.softK.toFixed(2)};
    totalEmissiveRadiance += hot * glint * palWet * ridge * (1.0 - 0.9 * palCrease) * palFoot + palC * palTube(normal, 260.0) * 0.06 * palWet; }
  if (uGlow > 0.001) {
    vec3 palE = vec3(0.0);
    if (palK < ${PAINT.mix}) {
      // Lit, a dab burns in its own color from inside, brightest through its thin crests and the peak, its foot in its
      // own shadow: a small bright thing.
      float lit = palDab(palK);
      vec3 gc = palGlowCol(palK);
      float up = smoothstep(0.15, 1.0, vUv.y);
      palE = gc * lit * (0.4 + 0.6 * up) * (0.35 + 0.65 * palFoot) * 1.7;
      // The pale steps burn to pale at their crests; the dark ones stay ember through, as a dark paint lit from inside does.
      palE += mix(gc, ${L('pale')}, palK < 2 ? 0.0 : 0.45) * lit * smoothstep(0.65, 1.0, vUv.y) * 0.7;
      if (palK < 2) palE *= 1.0 - 0.5 * palCrease;
    } else if (palK == ${PAINT.mix}) {
      vec2 q = palInSwatch(palSw, vObj.xz);
      float g = palSwatchLit(palSw, clamp(q.x / PAL_SW_LEN[palSw], 0.0, 1.1));
      palE = mix(palC * 1.6, palRamp(0.3 + 0.7 * g), 0.4) * g * (0.35 + 1.2 * smoothstep(0.2, 0.8, palRidge));
    } else if (palK == ${PAINT.hot}) {
      palE = palGlowCol(5) * palHair(0.0) * 0.9 * (0.35 + 0.65 * clamp(normalize(vPalN).y, 0.0, 1.0));
    } else if (palK == ${PAINT.knife}) {
      float g = 0.0; for (int s = 0; s < ${S}; s++) g += palSwatchLit(s, 0.95);
      palE = palRamp(0.4) * g * 0.25;
    }
    totalEmissiveRadiance += palE;
  }`,
  }, { bounce: true, rim: 0.6 }));
}

// The size and code stamped in foil on the brush's handle, as a texture along it: white where the foil is.
const LEGEND = { from: 12, len: 44, band: 0.085, text: 'N° 12   ROUND   SABLE' } as const;
function legendTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#fff';
  g.font = '600 46px "Helvetica Neue", Helvetica, Arial, sans-serif';
  g.textBaseline = 'middle';
  g.textAlign = 'center';
  g.fillText(LEGEND.text, c.width / 2, c.height / 2 + 2, c.width - 20);
  const t = new THREE.CanvasTexture(c);
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.anisotropy = 8;
  return t;
}

// The turned and the cut wood: the round's handle a deep lacquer, near black, with a band of copper lacquer toward its
// end and its size stamped in foil behind the ferrule; the knife's scales in old oiled walnut, polished by the palm,
// with the steel of the tang between them.
function handleMaterial(u: Shared, satin = false): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.3, clearcoat: satin ? 0 : 1, clearcoatRoughness: 0.16, specularIntensity: satin ? 0.4 : 0.6 });
  m.name = satin ? 'paletteSatin' : 'paletteHandle';
  m.defines = { USE_UV: '' };
  m.envMapIntensity = 0.6;
  m.userData.uniforms = { ...u, uLegend: { value: satin ? null : legendTexture() } };
  const F = BRUSH.hair + BRUSH.ferrule, endAt = F + BRUSH.handle;
  return shade(m, satin ? 'palette-satin' : 'palette-handle', partChunks({
    head: `${BUMP}\nuniform sampler2D uLegend;`,
    color: /* glsl */ `
  int palH4 = int(vCell.x + 0.5);
  float palS = vUv.x, palWr = 0.0, palGr = 0.0, palTang = 0.0, palFoil = 0.0, palBand = 0.0;
  vec3 palC;
  if (palH4 == 0) {
    vec3 palLq = ${L('bg-3', 1.1)} * 0.8 + ${L('ember-deep', 1.0)} * 0.2;
    // The copper band, with a fine pale line at each of its edges.
    float palB0 = ${(endAt - 40).toFixed(1)}, palB1 = ${(endAt - 27).toFixed(1)};
    float aa = max(fwidth(palS), 0.05);
    palBand = smoothstep(palB0 - aa, palB0 + aa, palS) * (1.0 - smoothstep(palB1 - aa, palB1 + aa, palS));
    float palLine = max(1.0 - smoothstep(0.0, 0.35 + aa, abs(palS - palB0 + 0.9)), 1.0 - smoothstep(0.0, 0.35 + aa, abs(palS - palB1 - 0.9)));
    palC = mix(palLq, ${L('copper', 0.62)} * 0.8 + ${L('ember', 1.0)} * 0.2, palBand);
    // Its size, stamped in foil on the top of the handle behind the ferrule.
    float palV = fract(vUv.y + 0.5) - 0.5;
    vec2 palL = vec2((palS - ${(F + LEGEND.from).toFixed(1)}) / ${LEGEND.len.toFixed(1)}, 0.5 - palV / ${(LEGEND.band * 2).toFixed(3)});
    palFoil = (palL.x > 0.0 && palL.x < 1.0 && palL.y > 0.0 && palL.y < 1.0) ? smoothstep(0.3, 0.7, texture2D(uLegend, palL).r) : 0.0;
    palFoil = max(palFoil, palLine * 0.9);
    palC = mix(palC, ${L('copper-light', 0.85)}, palFoil);
    palWr = smoothstep(0.62, 0.74, wFbm(vec3(palS * 0.12, vUv.y * 9.0, 1.0)) + 0.3 * exp(-pow((palS - ${(F + 22).toFixed(1)}) / 16.0, 2.0))) * 0.12;
    palC = mix(palC, ${L('bronze-deep', 0.9)}, palWr * 0.5 * (1.0 - palBand));
  } else {
    palGr = wFbm(vec3(palS * 0.05, vUv.y * 6.0, 2.0)) + 0.25 * sin(vUv.y * 46.0 + palS * 0.06);
    vec3 palDk = ${L('bronze', 0.16)} * 0.9 + ${L('text-3', 0.03)} * 0.1, palLt = ${L('bronze', 0.42)} * 0.85 + ${L('text-3', 0.12)} * 0.15;
    palC = mix(palLt, palDk, smoothstep(0.42, 0.62, palGr));
    float palPalm = exp(-pow((palS - 40.0) / 22.0, 2.0)) * smoothstep(0.1, 0.6, sin(vUv.y * 6.2832));
    palWr = palPalm * (0.5 + 0.5 * wNoise(vObj * 0.3));
    palC = mix(palC, ${L('bronze', 0.6)} * 0.7 + ${L('text-3', 0.3)} * 0.3, palWr * 0.6);
    palTang = 1.0 - smoothstep(0.035, 0.06, abs(sin(vUv.y * 6.2832)));
    palC = mix(palC, ${L('text', 0.1)}, palTang);
  }
  diffuseColor.rgb = palC;`,
    rough: 'roughnessFactor = palH4 == 1 ? (0.42 - 0.12 * palWr) : mix(mix(0.16, 0.42, palWr), 0.22, palBand);',
    metal: 'metalnessFactor = max(palTang * 0.9, palFoil * 0.9);',
    normal: '{ float h = palH4 == 1 ? -0.04 * smoothstep(0.4, 0.6, palGr) - 0.06 * palTang : palWr * 0.1 - palFoil * 0.02; normal = palBump(normal, h, 1.0); }',
    emissive: /* glsl */ `
  { float sharp = palH4 == 1 ? 260.0 : 2200.0, k = palH4 == 1 ? 0.35 : 1.25 * (1.0 - palWr);
    vec3 palNg = palTurnedN(palH4 == 0);
    // The lacquer's one crisp line down the whole handle, as a lacquered pencil has; the knife's satin scales a softer one.
    vec3 palAx = palAxis(palH4 == 0 ? PAL_BRUSH_DIR : PAL_KNIFE_DIR);
    totalEmissiveRadiance += ${L('pale')} * (palH4 == 0 ? palLine(palNg, palAx, ${FINISH.lacquer.sharp.toFixed(1)}) * ${FINISH.lacquer.k.toFixed(2)} * 1.0 : palLine(palNg, palAx, ${FINISH.satin.sharp.toFixed(1)}) * ${FINISH.satin.k.toFixed(2)});
    vec3 tint = palH4 == 0 ? mix(${L('pale')}, ${L('copper-light')}, max(palBand, palFoil) * 0.6) : ${L('pale')};
    totalEmissiveRadiance += tint * palTube(palNg, sharp) * k + ${L('copper-light')} * palTube(palNg, 700.0) * 0.6 * palFoil; }`,
  }));
}

// The metal, by the cell's x: the brush's ferrule polished copper, the piece's brightest metal; the knife's blade a
// polished warm steel that mirrors; its neck spring steel, grey; its bolster copper; the dipper a brass worn bright on
// its rim and dark inside; the rivets copper; the scale's pins brass.
function metalMaterial(u: Shared): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.2 });
  m.name = 'paletteMetal';
  m.defines = { USE_UV: '' };
  m.envMapIntensity = 0.8;
  m.userData.uniforms = u;
  return shade(m, 'palette-metal', partChunks({
    head: BUMP,
    color: /* glsl */ `
  int palM = int(vCell.x + 0.5);
  vec3 palC = palM == 0 ? ${L('copper-light', 0.95)} * 0.35 + ${L('copper', 1.0)} * 0.65
    : palM == 1 ? ${L('bronze-deep', 0.5)}
    : palM == 2 ? ${L('text', 0.2)} * 0.85 + ${L('bronze', 0.2)} * 0.15
    : palM == 3 ? ${L('copper', 0.85)}
    : palM == 4 ? ${L('copper-light', 0.72)} * 0.5 + ${L('bronze', 0.95)} * 0.5
    : palM == 5 ? ${L('copper', 0.95)}
    : palM == 7 ? ${L('copper-light', 0.82)} * 0.7 + ${L('bronze', 1.0)} * 0.3
    : ${L('bronze', 0.9)} * 0.7 + ${L('copper-light', 0.6)} * 0.3;
  float palBr = wNoise(vec3(vObj.x * 0.04 + vObj.z * 0.04, vObj.y * 20.0 + (vObj.x - vObj.z) * 4.0, 1.0));
  if (palM <= 1) palBr = 0.5 + 0.15 * (wNoise(vObj * 0.08) - 0.5);
  float palTn = smoothstep(0.55, 0.8, wFbm(vObj * 0.12 + 1.0));
  palTn *= palM == 0 || palM == 1 ? 0.12 : palM == 3 || palM == 5 || palM == 7 ? 0.3 : 1.0;
  palC *= (0.92 + 0.14 * palBr) * (1.0 - 0.38 * palTn);
  diffuseColor.rgb = palC;`,
    rough: 'roughnessFactor = clamp((palM == 0 ? 0.1 : palM == 1 ? 0.07 : palM == 2 ? 0.34 : palM == 4 ? 0.2 : 0.26) + (palM <= 1 ? 0.03 : 0.12) * (palBr - 0.5) + 0.22 * palTn, 0.04, 1.0);',
    normal: /* glsl */ `
  { float px = length(fwidth(vObj)); float fine = 1.0 - smoothstep(0.08, 0.3, px);
    float h = palM == 2 ? (palBr - 0.5) * 0.02 * fine : 0.0;
    normal = palBump(normal, h, 1.0); }`,
    emissive: /* glsl */ `
  { float r = clamp(roughnessFactor, 0.05, 1.0);
    totalEmissiveRadiance += diffuseColor.rgb * palTube(normal, 2.0 / (r * r * r) + 20.0) * 1.6;
    // The polished blade and ferrule mirror the room's long lights as sharp streaks, so they read as mirrors and
    // not as holes in the board.
    if (palM == 0) totalEmissiveRadiance += mix(diffuseColor.rgb, ${L('pale')}, 0.3) * (palStrips(normal, 380.0) * 0.55 + palStrips(normal, 80.0) * 0.4) * 0.45;
    if (palM == 1 && vPalN.y > 0.5) {
      // The blade is a mirror of the room: from near black at its point through a warm mid to a pale band toward the
      // heel, and past it warm again. The sweep slides along the blade as the cursor moves across it, as a mirror's
      // does, and a hard bright line runs round its polished edge.
      vec2 kd = vec2(cos(PAL_KNIFE_DIR), sin(PAL_KNIFE_DIR));
      vec2 q = vObj.xz - vec2(${KNIFE.tip[0].toFixed(2)}, ${KNIFE.tip[1].toFixed(2)});
      float along = dot(q, kd) / ${KNIFE.blade.len.toFixed(1)}, across = dot(q, vec2(-kd.y, kd.x));
      float bw = ${(KNIFE.blade.w / 2).toFixed(2)} * pow(sin(1.5708 * min(1.0, along / 0.68)), 0.62) * (along > 0.68 ? 1.0 - 0.78 * smoothstep(0.68, 1.0, along) : 1.0);
      vec3 Tm = 0.5 * (uTubeA + uTubeB) + vViewPosition;
      float t = along + 0.12 * across / max(bw, 1.0) - 0.3 * clamp(Tm.x / 0.2, -1.5, 1.5);
      vec3 sweep = mix(${L('bronze-deep', 0.12)}, ${L('bronze', 0.42)} * 0.85 + ${L('text-3', 0.3)} * 0.15, smoothstep(0.02, 0.5, t));
      sweep = mix(sweep, ${L('bronze', 0.3)}, smoothstep(0.75, 1.0, t));
      sweep += ${L('pale')} * (exp(-pow((t - 0.62) / 0.06, 2.0)) * 1.3 + exp(-pow((t - 0.62) / 0.16, 2.0)) * 0.25);
      float aw = max(0.22, fwidth(across) * 1.2);
      float rim = 1.0 - smoothstep(0.0, aw, bw - abs(across));
      totalEmissiveRadiance += sweep * ${FINISH.blade.toFixed(2)} + ${L('pale')} * rim * 1.1;
    }
    // The ferrule is the piece's brightest metal: polished copper that keeps the room's light along its length, with the
    // cursor's light on it as a long sharp streak and a softer one round it.
    if (palM == 0 || palM == 3) {
      // Polished copper turned round an axis: a long sharp pale line down its length with a warm fall round it, dark
      // toward its edges, where it mirrors the dark room.
      vec3 V = normalize(vViewPosition);
      vec3 ax = palAxis(palM == 0 ? PAL_BRUSH_DIR : PAL_KNIFE_DIR);
      float face = abs(dot(normal, V));
      vec3 nG = palTurnedN(palM == 0);
      float core = palLine(nG, ax, ${FINISH.metal.sharp.toFixed(1)}), fall = palLine(nG, ax, ${FINISH.metal.soft.toFixed(1)});
      totalEmissiveRadiance += mix(diffuseColor.rgb, ${L('pale')}, 0.55) * core * ${FINISH.metal.k.toFixed(2)} + diffuseColor.rgb * (fall * 0.9 + 0.04) * smoothstep(0.05, 0.6, face);
      totalEmissiveRadiance += diffuseColor.rgb * palTube(normal, 160.0) * 0.5;
    }
    // Its crisp edges: a lip, a crimp, a rivet's rim, and the thin sides of the blade, the neck and the clip.
    vec3 nO = normalize(vPalN);
    float em = palCurveEdge(vPalN, vObj, 0.75, 2.4);
    if (palM == 2) em = max(em, 1.0 - smoothstep(0.3, 0.7, abs(nO.y)));
    totalEmissiveRadiance += palEdgeLit(normalize(nonPerturbedNormal), em) * (palM == 2 ? vec3(1.0) : mix(vec3(1.0), diffuseColor.rgb * 2.2, 0.35)); }`,
  }));
}

// Sable: a red brown fibre, fine strands along the bundle, wet with the hot step over the half nearest the point, the
// line between ragged.
function hairMaterial(u: Shared): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.5, sheen: 0.6, sheenRoughness: 0.4, sheenColor: shadeOf('bronze', 0.6), clearcoat: 0.6, clearcoatRoughness: 0.15 });
  m.name = 'paletteHair';
  m.defines = { USE_UV: '' };
  m.userData.uniforms = u;
  return shade(m, 'palette-hair', partChunks({
    head: BUMP,
    color: /* glsl */ `
  float palFl = 0.0;
  float palSs = clamp(vUv.x / ${BRUSH.hair.toFixed(1)}, 0.0, 1.2);
  float palStr = wNoise(vec3(vUv.y * mix(140.0, 220.0, palFl), palSs * 2.0, 1.0));
  vec3 palSable = mix(${L('bronze-deep', 0.75)} * 0.7 + ${L('text-3', 0.1)} * 0.3, ${L('bronze', 0.55)}, smoothstep(0.3, 0.8, palStr));
  float palLoad = 1.0 - smoothstep(0.55, 0.7, palSs + 0.08 * (wNoise(vec3(vUv.y * 18.0, 0.0, 3.0)) - 0.5));
  vec3 palPaint = palAlbedo(5) * (0.9 + 0.1 * palStr);
  diffuseColor.rgb = mix(palSable, palPaint, palLoad);`,
    rough: 'roughnessFactor = mix(0.55 + 0.2 * palStr, 0.16, palLoad);',
    normal: '{ float px = length(fwidth(vObj)); float h = (palStr - 0.5) * 0.04 * (1.0 - palLoad) * (1.0 - smoothstep(0.05, 0.2, px)); normal = palBump(normal, h, 1.0); }',
    emissive: /* glsl */ `
  totalEmissiveRadiance += ${L('pale')} * palTube(normal, 900.0) * 0.7 * palLoad;
  if (uGlow > 0.001) { float g = palHair(palSs); totalEmissiveRadiance += palRamp(0.35 + 0.6 * g) * g * mix(0.25, 1.4, palLoad) * mix(1.0, 0.7, palFl); }`,
  }));
}

// A soft dark under the board, from the outline's own distance field, and fainter ones under the two brushes where
// their handles hang out over the table, and under the dipper's cup.
function shadowMaterial(u: Shared): THREE.ShaderMaterial {
  const W = 128, H = 104, X0 = -190, Z0 = -150, SX = 380 / W, SZ = 300 / H;
  const pts = rim(240);
  const data = new Uint8Array(W * H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const x = X0 + (i + 0.5) * SX, z = Z0 + (j + 0.5) * SZ;
    let d = Infinity, hit = false;
    for (let a = 0, c = pts.length - 1; a < pts.length; c = a++) {
      const [ax, az] = pts[a], [cx, cz] = pts[c];
      if ((az > z) !== (cz > z) && x < ((cx - ax) * (z - az)) / (cz - az) + ax) hit = !hit;
      const ex = cx - ax, ez = cz - az, t = Math.max(0, Math.min(1, ((x - ax) * ex + (z - az) * ez) / (ex * ex + ez * ez)));
      d = Math.min(d, Math.hypot(x - ax - ex * t, z - az - ez * t));
    }
    const sd = hit ? -d : d;
    data[j * W + i] = Math.round(Math.max(0, Math.min(255, 128 + sd * 4)));
  }
  const tex = new THREE.DataTexture(data, W, H, THREE.RedFormat, THREE.UnsignedByteType);
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  const b0 = brushAxis(BRUSH.hair + 10), b1 = brushAxis(BRUSH.hair + BRUSH.ferrule + BRUSH.handle);
  const dc = rimAt(DIPPER.f), cupAt: P2 = [dc.p[0] + dc.n[0] * (DIPPER.r + 0.7), dc.p[1] + dc.n[1] * (DIPPER.r + 0.7)];
  const v2 = (p: P2) => `vec2(${p[0].toFixed(1)}, ${p[1].toFixed(1)})`;
  return new THREE.ShaderMaterial({
    uniforms: { ...u, uShadow: { value: 1 }, uBrush: { value: 1 }, uField: { value: tex } },
    transparent: true,
    depthWrite: false,
    vertexShader: /* glsl */ `
varying vec3 vPalP;
void main(){ vPalP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `
uniform float uBandOn, uShadow, uBrush;
uniform vec4 uBand;
uniform vec3 uEye;
uniform sampler2D uField;
varying vec3 vPalP;
vec2 palOnBoard(vec3 p){ return uEye.xz + (p.xz - uEye.xz) * (uEye.y / max(uEye.y - p.y, 1.0)); }
float palSeg(vec2 p, vec2 a0, vec2 a1){ vec2 e = a1 - a0; float t = clamp(dot(p - a0, e) / dot(e, e), 0.0, 1.0); return length(p - a0 - e * t); }
void main(){
  if (uBandOn > 0.5 && length(palOnBoard(vPalP) - uBand.xy) > uBand.z) discard;
  vec2 uv = (vPalP.xz - vec2(${X0.toFixed(1)}, ${Z0.toFixed(1)})) / vec2(380.0, 300.0);
  float sd = (texture2D(uField, uv).r * 255.0 - 128.0) / 4.0;
  float a = (1.0 - smoothstep(-5.0, 11.0, sd)) * 0.78 * uShadow;
  vec2 p = vPalP.xz;
  float off = smoothstep(-2.0, 4.0, sd);
  a = max(a, (1.0 - smoothstep(1.0, 9.0, palSeg(p, ${v2(b0)}, ${v2(b1)}))) * 0.45 * uBrush * off);
  a = max(a, (1.0 - smoothstep(${(DIPPER.r - 2).toFixed(1)}, ${(DIPPER.r + 7).toFixed(1)}, length(p - ${v2(cupAt)}))) * 0.7 * uShadow);
  gl_FragColor = vec4(0.0, 0.0, 0.0, a);
}`,
  });
}
