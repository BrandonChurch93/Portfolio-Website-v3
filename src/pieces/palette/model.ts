import * as THREE from 'three';
import { Builder, pause, seeded, type Vec3 } from '../../world/build';
import { slab } from '../../world/shape';
import { lin, shade } from '../../world/surface';
import { hex, type PaletteName } from '../../config/palette';
import {
  BAY_AT, BOARD, BRUSH, CHIP_AT, DABS, HOLE, KNIFE, MIX, STROKES, brushAxis, holeAt, knifeAxis, rim, type Dab, type P2,
} from './layout';
import { PAINT, depthMaterial, partChunks, shared, type Shared } from './shading';

// The palette, its paints, the brush and the knife, in millimetres under a root scaled by 0.001. Every part is merged
// by material with the others and carries its own number, so the shaders can move it alone.
//
// Only the paints are colored. The walnut is a dark neutral brown, worn pale where the hand holds it; the brush's
// lacquer is a near black; the ferrule and the knife are the only metal, bronze and a brass that is copper's
// neighbour. That is what tells the materials apart: wet paint beside oiled wood beside lacquer beside metal.

export type Kind = 'board' | 'dab' | 'mix' | 'bead' | 'knife' | 'brush';
export interface PartDef {
  kind: Kind;
  c: Vec3;
  r: number;
  // Which dab, for a dab: its place along the rim.
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
  const TOP = 18;
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
    // The top, from the hole's rounded lip out to the edge's, closer together at each end.
    for (let k = 0; k <= TOP; k++) {
      const s = 0.5 - 0.5 * Math.cos((k / TOP) * Math.PI);
      put(inner[0] + (edge[0] - inner[0]) * s, 0, inner[1] + (edge[1] - inner[1]) * s, 0, 1, 0);
    }
    const R = 5;
    for (let k = 1; k <= R; k++) { const a2 = (k / R) * (Math.PI / 2); put(edge[0] + N[0] * e * Math.sin(a2), -e + e * Math.cos(a2), edge[1] + N[1] * e * Math.sin(a2), N[0] * Math.sin(a2), Math.cos(a2), N[1] * Math.sin(a2)); }
    for (let k = 0; k <= R; k++) { const a2 = (k / R) * (Math.PI / 2); put(edge[0] + N[0] * e * Math.cos(a2), -T + e - e * Math.sin(a2), edge[1] + N[1] * e * Math.cos(a2), N[0] * Math.cos(a2), -Math.sin(a2), N[1] * Math.cos(a2)); }
    for (let k = 1; k <= 4; k++) { const s = k / 5; put(edge[0] + (inner[0] - edge[0]) * s, -T, edge[1] + (inner[1] - edge[1]) * s, 0, -1, 0); }
    for (let k = 0; k <= R; k++) { const a2 = (k / R) * (Math.PI / 2); put(inner[0] - u[0] * e * Math.sin(a2), -T + e - e * Math.cos(a2), inner[1] - u[1] * e * Math.sin(a2), -u[0] * Math.sin(a2), -Math.cos(a2), -u[1] * Math.sin(a2), true); }
    for (let k = 0; k < R; k++) { const a2 = (k / R) * (Math.PI / 2); put(inner[0] - u[0] * e * Math.cos(a2), -e + e * Math.sin(a2), inner[1] - u[1] * e * Math.cos(a2), -u[0] * Math.cos(a2), Math.sin(a2), -u[1] * Math.cos(a2), true); }
    cols.push({ p, nm, hole });
  }
  const rows = cols[0].p.length;
  const pos: number[] = [], nor: number[] = [], owner: number[] = [];
  const near = (x: number, z: number) => { let best = 0, bd = Infinity; seeds.forEach((s, k) => { const d = (s[0] - x) ** 2 + (s[1] - z) ** 2; if (d < bd) { bd = d; best = k; } }); return best; };
  // The hole's seed owns the whole of the hole's wall, so no tile is cut through its lip.
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
  // Which way round a triangle winds depends on the outline's: each is turned to face the way its normals do.
  {
    const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), nn = new THREE.Vector3();
    const P = geo.getAttribute('position') as THREE.BufferAttribute, Nn = geo.getAttribute('normal') as THREE.BufferAttribute;
    const swap = (A: THREE.BufferAttribute, i: number, j: number) => { const x = A.getX(i), y = A.getY(i), z = A.getZ(i); A.setXYZ(i, A.getX(j), A.getY(j), A.getZ(j)); A.setXYZ(j, x, y, z); };
    for (let t = 0; t < P.count; t += 3) {
      a.fromBufferAttribute(P, t); b.fromBufferAttribute(P, t + 1); c.fromBufferAttribute(P, t + 2);
      nn.fromBufferAttribute(Nn, t).add(c.clone().set(Nn.getX(t + 1), Nn.getY(t + 1), Nn.getZ(t + 1))).add(c.clone().set(Nn.getX(t + 2), Nn.getY(t + 2), Nn.getZ(t + 2)));
      c.fromBufferAttribute(P, t + 2);
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

// The seeds the board is struck into: a jittered grid over the board, one at the thumb hole, none off the board.
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

// ---- the paints --------------------------------------------------------------------------------------------------

// A dab squeezed from a tube and left: a slumped dome with the coil it was laid in, its tip pulled up and over, and a
// skirt that runs under the board so its foot meets the wood wherever it lands. uv: how far out (0 at the middle, 1
// at the foot) and how high (0 to 1).
function dabSurface(d: Dab, small = false): THREE.BufferGeometry {
  const r = seeded(d.seed);
  const RINGS = small ? 8 : 13, SEGS = small ? 24 : 36;
  const ph = [r() * 6.28, r() * 6.28, r() * 6.28];
  const lean = (d.lean * Math.PI) / 180, lx = Math.cos(lean), lz = Math.sin(lean);
  const foot = (a: number) => d.r * (1 + 0.1 * Math.sin(2 * a + ph[0]) + 0.06 * Math.sin(3 * a + ph[1]) + 0.035 * Math.sin(5 * a + ph[2]));
  const pos: number[] = [], uv: number[] = [];
  const at = (k: number, a: number) => {
    const s = (k / RINGS) * 1.12;
    const rr = Math.min(s, 1);
    const f = foot(a);
    let x = Math.cos(a) * s * f, z = Math.sin(a) * s * f;
    let y: number;
    if (s > 1) y = -0.7 * ((s - 1) / 0.12);
    else {
      const dome = d.h * 0.58 * Math.pow(1 - rr * rr, 0.5);
      const coil = small ? 0 : d.h * 0.12 * (0.5 + 0.5 * Math.cos(2 * Math.PI * (rr * 2.3) - a - d.twist)) * Math.sin(Math.PI * Math.min(1, rr * 1.1));
      const px = x - lx * 0.2 * d.r, pz = z - lz * 0.2 * d.r;
      const peak = small ? 0 : d.h * 0.42 * Math.exp(-((Math.hypot(px, pz) / (0.34 * d.r)) ** 2));
      y = dome + coil + peak;
      const k2 = small ? 0 : (y / d.h) ** 2.4 * 0.22 * d.r;
      x += lx * k2; z += lz * k2;
    }
    pos.push(d.x + x, Math.max(y, -0.7), d.z + z);
    uv.push(Math.min(s, 1.12), Math.max(0, y) / d.h);
  };
  for (let k = 0; k <= RINGS; k++) for (let i = 0; i <= SEGS; i++) at(k, (i / SEGS) * Math.PI * 2);
  const idx: number[] = [];
  const W = SEGS + 1;
  for (let k = 0; k < RINGS; k++) for (let i = 0; i < SEGS; i++) { const a = k * W + i; idx.push(a, a + 1, a + W, a + 1, a + W + 1, a + W); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  // The middle ring is one point many times over: give it one upright normal, and close the seam's normals.
  const N = g.getAttribute('normal') as THREE.BufferAttribute;
  for (let i = 0; i <= SEGS; i++) N.setXYZ(i, 0, 1, 0);
  for (let k = 0; k <= RINGS; k++) {
    const a = k * W, b = k * W + SEGS;
    const nx = N.getX(a) + N.getX(b), ny = N.getY(a) + N.getY(b), nz = N.getZ(a) + N.getZ(b), l = Math.hypot(nx, ny, nz) || 1;
    N.setXYZ(a, nx / l, ny / l, nz / l); N.setXYZ(b, nx / l, ny / l, nz / l);
  }
  return g;
}

// The mixing ground: a height worked out from the knife's passes, in order. Each pass lays its paint flat to the
// blade, leaves a ridge along each side and a heap where the blade lifted. cell.y is the uppermost pass, cell.z how
// much of a ridge a point is, uv how far along that pass and how far across.
function mixSurface(): THREE.BufferGeometry {
  const STEP = 1.6;
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const s of STROKES) for (const p of [s.a, s.b]) { x0 = Math.min(x0, p[0] - s.w); x1 = Math.max(x1, p[0] + s.w); z0 = Math.min(z0, p[1] - s.w); z1 = Math.max(z1, p[1] + s.w); }
  const nx = Math.ceil((x1 - x0) / STEP), nz = Math.ceil((z1 - z0) / STEP);
  const H: number[] = [], top: number[] = [], ridge: number[] = [], al: number[] = [], ac: number[] = [];
  for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) {
    const x = x0 + i * STEP, z = z0 + j * STEP;
    let h = -0.7, who = 0, rd = 0, along = 0, across = 0;
    STROKES.forEach((s, k) => {
      const dx = s.b[0] - s.a[0], dz = s.b[1] - s.a[1], len = Math.hypot(dx, dz), ux = dx / len, uz = dz / len;
      const t = (x - s.a[0]) * ux + (z - s.a[1]) * uz, c = -(x - s.a[0]) * uz + (z - s.a[1]) * ux;
      const half = (s.w / 2) * (0.9 + 0.1 * Math.sin(t * 0.21 + k)) * (1 - 0.35 * sm(len - 6, len + 2, t));
      const inside = sm(-1.5, 0.5, t) * (1 - sm(len + 1, len + 3.5, t)) * (1 - sm(half - 0.6, half + 0.3, Math.abs(c)));
      const layer = s.t * (0.85 + 0.3 * (c / s.w)) * (1 + 0.04 * Math.sin(t * 2.3)) + 0.05 * Math.sin(t * 1.7 + c * 0.6);
      const prev = h;
      h = h + (layer - h) * inside;
      const edge = Math.exp(-(((Math.abs(c) - half) / 1.1) ** 2)) * sm(0, 4, t) * (1 - sm(len, len + 4, t));
      const heap = Math.exp(-(((t - len - 1.2) / 2.4) ** 2)) * Math.exp(-((c / half) ** 2) * 1.2);
      const raised = Math.max(prev, layer * 0.9) + 1.0 * edge * s.t + 1.5 * heap * s.t;
      const lift = Math.max(edge * 0.95, heap);
      if (lift > 0.05 && raised > h) h = h + (raised - h) * Math.min(1, lift * 1.4);
      if (inside > 0.5 || lift > 0.4) { who = k; along = t / len; across = c / half; rd = Math.max(edge, heap); }
    });
    H.push(h); top.push(who); ridge.push(rd); al.push(along); ac.push(across);
  }
  const pos: number[] = [], uv: number[] = [], cell: number[] = [];
  const W = nx + 1;
  const v = (i: number, j: number) => {
    const k = j * W + i;
    pos.push(x0 + i * STEP, H[k], z0 + j * STEP);
    uv.push(al[k], ac[k]);
    cell.push(PAINT.mix, top[k], ridge[k], 0);
  };
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const hs = [H[j * W + i], H[j * W + i + 1], H[(j + 1) * W + i], H[(j + 1) * W + i + 1]];
    if (hs.every((h) => h < -0.1)) continue;
    v(i, j); v(i, j + 1); v(i + 1, j); v(i + 1, j); v(i, j + 1); v(i + 1, j + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('cell', new THREE.Float32BufferAttribute(cell, 4));
  // Smooth normals across the grid: merged by place, worked out, and handed back.
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', g.getAttribute('position'));
  const idx = mergeByPlace(merged);
  merged.computeVertexNormals();
  const n = merged.getAttribute('normal');
  const out: number[] = [];
  for (let i = 0; i < idx.length; i++) out.push(n.getX(idx[i]), n.getY(idx[i]), n.getZ(idx[i]));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(out, 3));
  return g;
}

// Joins the vertices of a triangle soup that share a place into one indexed geometry, and says which each became.
function mergeByPlace(g: THREE.BufferGeometry): number[] {
  const p = g.getAttribute('position');
  const map = new Map<string, number>(), uniq: number[] = [], back: number[] = [];
  for (let i = 0; i < p.count; i++) {
    const key = `${p.getX(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
    let k = map.get(key);
    if (k === undefined) { k = uniq.length / 3; map.set(key, k); uniq.push(p.getX(i), p.getY(i), p.getZ(i)); }
    back.push(k);
  }
  g.setAttribute('position', new THREE.Float32BufferAttribute(uniq, 3));
  g.setIndex(back);
  return back;
}

// ---- the brush and the knife -------------------------------------------------------------------------------------

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
  // uv: x is the distance along, y the way round.
  const uv = g.getAttribute('uv');
  const ys = profile.map(([, s]) => s);
  const lo = Math.min(...ys), hi = Math.max(...ys);
  for (let i = 0; i < uv.count; i++) uv.setXY(i, lo + (hi - lo) * uv.getY(i), uv.getX(i));
  return g;
}

// Points along a smooth run between profile stations, so a lathe's rows fall where its shape changes.
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

export async function buildPalette(): Promise<PaletteModel> {
  const root = new THREE.Group();
  root.scale.setScalar(0.001);
  const u = shared();
  const b = new Builder();
  const parts: PartDef[] = [];
  const part = (d: Omit<PartDef, 'lo' | 'hi'>) => { parts.push({ ...d, lo: [Infinity, Infinity, Infinity], hi: [-Infinity, -Infinity, -Infinity] }); return parts.length - 1; };
  const add = (i: number | null, geo: THREE.BufferGeometry, mat: THREE.Material, cellX = 0, keepCell = false) => {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const n = g.getAttribute('position').count;
    if (!keepCell || !g.getAttribute('cell')) {
      const cell = new Float32Array(n * 4);
      for (let k = 0; k < n; k++) { cell[k * 4] = cellX; cell[k * 4 + 3] = i ?? 0; }
      g.setAttribute('cell', new THREE.Float32BufferAttribute(cell, 4));
    } else if (i !== null) {
      const c = g.getAttribute('cell') as THREE.BufferAttribute;
      for (let k = 0; k < n; k++) c.setW(k, i);
    }
    if (i !== null) {
      g.computeBoundingBox();
      const bb = g.boundingBox!, pd = parts[i];
      for (let k = 0; k < 3; k++) { pd.lo[k] = Math.min(pd.lo[k], bb.min.getComponent(k)); pd.hi[k] = Math.max(pd.hi[k], bb.max.getComponent(k)); }
    }
    b.add(g, mat);
  };

  // ---- materials ----
  const wood = boardMaterial(u);
  const paint = paintMaterial(u);
  const lacquer = handleMaterial(u);
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
    const P = boardG.getAttribute('position');
    for (let t = 0; t < owner.length; t++) {
      const pd = parts[tileParts[owner[t]]];
      for (let k = 0; k < 3; k++) { const v = t * 3 + k; const xyz = [P.getX(v), P.getY(v), P.getZ(v)]; for (let a = 0; a < 3; a++) { pd.lo[a] = Math.min(pd.lo[a], xyz[a]); pd.hi[a] = Math.max(pd.hi[a], xyz[a]); } }
    }
    b.add(boardG, wood);
  }
  await pause();

  // ---- the dabs and the mixing ground ----
  DABS.forEach((d, k) => {
    const i = part({ kind: 'dab', c: [d.x, 0, d.z], r: d.r * 1.1, n: k });
    add(i, dabSurface(d), paint, k);
  });
  const iMix = part({ kind: 'mix', c: [MIX.x, 0, MIX.z], r: 44 });
  add(iMix, mixSurface(), paint, PAINT.mix, true);
  await pause();

  // ---- the brush ----
  const A = new THREE.Vector3(Math.cos(BRUSH.dir), 0, Math.sin(BRUSH.dir));
  const tip = new THREE.Vector3(BRUSH.tip[0], BRUSH.lift, BRUSH.tip[1]);
  const bMid = brushAxis(BRUSH.hair + 60);
  const iBrush = part({ kind: 'brush', c: [bMid[0], BRUSH.lift, bMid[1]], r: 60 });
  {
    const h = BRUSH.hair, f = BRUSH.ferrule, Lh = BRUSH.handle, g = BRUSH.girth;
    const R = (pts: [number, number][]): [number, number][] => pts.map(([r, sv]) => [r * g, sv]);
    // The hairs: a round sable come to a point, bent down at the tip where it rests in the bead.
    const hairP = profileOf(R([[0.02, 0], [0.9, h * 0.08], [1.9, h * 0.23], [2.62, h * 0.5], [2.72, h * 0.67], [2.5, h], [2.42, h + 1.5]]), 0.5);
    const bend = (sv: number) => (sv < h ? (BRUSH.lift - 1.0) * (1 - sv / h) ** 2 : 0);
    add(iBrush, turned(hairP, 40, tip, A, bend), hair, 0);
    // The ferrule: a rolled lip at the hairs, two crimps where it is pressed onto the handle, a little flare at its
    // back.
    const c1 = h + f - 8, c2 = h + f - 11;
    const ferP = profileOf(R([
      [2.45, h - 0.2], [2.72, h + 0.2], [2.66, h + 0.8], [2.7, h + 5], [2.95, c2 - 1.8], [3.0, c2 - 0.6], [2.78, c2], [3.0, c2 + 0.6],
      [3.04, c1 - 0.7], [2.82, c1], [3.06, c1 + 0.7], [3.12, h + f - 1.2], [3.22, h + f - 0.35], [3.12, h + f], [3.0, h + f + 0.05],
    ]), 1.2);
    add(iBrush, turned(ferP, 48, tip, A), metal, 0);
    // The handle: it swells past the ferrule and tapers to a rounded end, which is dipped in a second lacquer.
    const s0 = h + f - 2, end = h + f + Lh;
    const handP = profileOf(R([[3.0, s0], [3.1, h + f + 1], [3.65, h + f + 30], [3.5, h + f + 70], [2.55, end - 30], [2.15, end - 6], [1.9, end - 2.4], [1.2, end - 0.6], [0.02, end]]), 4);
    add(iBrush, turned(handP, 40, tip, A), lacquer, 0);
  }
  // The bead of hot paint the tip rests in.
  const beadAt = brushAxis(-1.5);
  const iBead = part({ kind: 'bead', c: [beadAt[0], 0, beadAt[1]], r: 5 });
  add(iBead, dabSurface({ x: beadAt[0], z: beadAt[1], r: BRUSH.bead.r, h: BRUSH.bead.h, lean: 0, twist: 0, seed: 7 }, true), paint, PAINT.hot);
  await pause();

  // ---- the knife ----
  const kMid = knifeAxis(60);
  const iKnife = part({ kind: 'knife', c: [kMid[0], 4, kMid[1]], r: 70 });
  {
    const K = KNIFE, len = K.blade.len, dir = new THREE.Vector3(Math.cos(K.dir), 0, Math.sin(K.dir)), side = new THREE.Vector3(-dir.z, 0, dir.x);
    const at = (s: number, v: number): THREE.Vector2 => { const [x, z] = knifeAxis(s); return new THREE.Vector2(x + side.x * v, z + side.z * v); };
    // The trowel: a rounded point, widest past its middle, drawn in to a shoulder at the neck.
    const half = (s: number) => {
      const k = s / len;
      return (K.blade.w / 2) * Math.pow(Math.sin(Math.PI * Math.min(1, k / 0.68) * 0.5), 0.62) * (k > 0.68 ? 1 - 0.78 * sm(0.68, 1, k) : 1) + (k > 0.68 ? 1.2 * sm(0.9, 1, k) : 0);
    };
    const outline: THREE.Vector2[] = [];
    const STEPS = 40;
    for (let k = 0; k <= STEPS; k++) { const s = (k / STEPS) * len; outline.push(at(s, half(s))); }
    for (let k = STEPS; k >= 0; k--) { const s = (k / STEPS) * len; outline.push(at(s, -half(s))); }
    const flat = (o: THREE.Vector2[], y0: number, y1: number, bev: number) => { const g = slab(o.map((p) => new THREE.Vector2(p.x, -p.y)), [], y0, y1, bev, 2); g.rotateX(-Math.PI / 2); return g; };
    add(iKnife, flat(outline, 0.02, 0.5, 0.12), metal, 1);
    // Paint left on its edge, along the point and down one side.
    const run: THREE.Vector3[] = [];
    for (let k = 0; k <= 22; k++) { const s = len * (0.02 + (k / 22) * 0.5); const p = at(s, -half(s) * 0.97); run.push(new THREE.Vector3(p.x, 0.5, p.y)); }
    const lip = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(run), 44, 0.85, 8, false);
    { const p = lip.getAttribute('position'); for (let i = 0; i < p.count; i++) p.setY(i, 0.45 + (p.getY(i) - 0.5) * 0.55); lip.computeVertexNormals(); }
    add(iKnife, lip, paint, PAINT.knife);
    // The cranked neck: off the blade's shoulder, up, and along into the ferrule.
    const neckStart = knifeAxis(len - 7), n0 = new THREE.Vector3(neckStart[0], 0.35, neckStart[1]);
    const p1 = knifeAxis(len + 1.5), p2 = knifeAxis(len + 6.5), p3 = knifeAxis(len + K.neck.run + 2);
    const neck = new THREE.CatmullRomCurve3([n0, new THREE.Vector3(p1[0], 0.6, p1[1]), new THREE.Vector3(p2[0], K.neck.rise * 0.7, p2[1]), new THREE.Vector3(p3[0], K.neck.rise, p3[1])], false, 'centripetal');
    const neckG = new THREE.TubeGeometry(neck, 40, K.neck.r, 10, false);
    add(iKnife, neckG, metal, 2);
    // The ferrule and the handle, on an axis that falls from the neck to where the handle's end rests on the board.
    const s0 = len + K.neck.run, s1 = s0 + K.ferrule.len + K.handle.len;
    const from = new THREE.Vector3(knifeAxis(s0)[0], K.neck.rise, knifeAxis(s0)[1]);
    const to = new THREE.Vector3(knifeAxis(s1)[0], K.handle.r * 0.86, knifeAxis(s1)[1]);
    const axis = to.clone().sub(from);
    const Lk = axis.length();
    const fer = profileOf([[K.ferrule.r - 0.6, -0.5], [K.ferrule.r - 0.4, 0], [K.ferrule.r, 0.6], [K.ferrule.r, K.ferrule.len - 0.6], [K.ferrule.r + 0.1, K.ferrule.len - 0.2], [K.ferrule.r - 0.1, K.ferrule.len]], 0.5);
    add(iKnife, turned(fer, 36, from, axis), metal, 3);
    const f = K.ferrule.len, r = K.handle.r;
    const hand = profileOf([[K.ferrule.r - 0.2, f - 1], [r * 0.82, f + 2], [r * 0.95, f + 18], [r, f + 40], [r * 0.93, Lk - 12], [r * 0.82, Lk - 3], [r * 0.5, Lk - 0.4], [0.02, Lk]], 2);
    add(iKnife, turned(hand, 36, from, axis), lacquer, 1);
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

// A height's slope turned into the normal of whatever surface it lies on, from the screen's own derivatives. Fades to
// nothing where the height changes faster than a pixel.
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

function boardMaterial(u: Shared): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.5, clearcoat: 0.3, clearcoatRoughness: 0.12, specularIntensity: 0.45 });
  m.name = 'paletteWood';
  m.envMapIntensity = 0.5;
  m.userData.uniforms = u;
  const v2 = (p: P2) => `vec2(${p[0].toFixed(1)}, ${p[1].toFixed(1)})`;
  return shade(m, 'palette-wood', partChunks({
    head: /* glsl */ `${BUMP}
// Flat sawn walnut: rings as long arcs down the board's length, warped, with fine pores drawn out along the grain.
float palG;
float palGrain(vec3 o){ vec2 p = o.xz; return p.y * 0.92 + wFbm(vec3(p.x * 0.005, p.y * 0.018, 3.0)) * 26.0 + 6.0 * sin(p.x * 0.012 + 1.3) + 0.0011 * (p.x - 30.0) * (p.x - 30.0); }
float palLate(float g, float w){ float r = g / 7.5 + 0.5 * wNoise(vec3(g * 0.05, 1.0, 2.0)); float f = fract(r); float band = smoothstep(0.25, 0.8, f) * (1.0 - smoothstep(0.82, 1.0, f)); return mix(band, 0.4, smoothstep(0.15, 0.5, w)); }
float palPore(vec3 o){ float px = length(fwidth(o.xz)); float k = 1.0 - smoothstep(0.08, 0.3, px); return smoothstep(0.7, 0.86, wNoise(vec3(o.x * 0.16, palG * 3.2, 5.0))) * k; }
// Old paint dried on the wood: small thin skins left where a knife was wiped, more of them nearer the mixing ground
// and the rim. Each skin is one color, chosen by a field far coarser than any skin.
float palStain(vec3 o, out float which){
  vec2 p = o.xz;
  float near = exp(-length((p - ${v2([MIX.x, MIX.z])}) / vec2(80.0, 55.0)));
  float n = wFbm(vec3(p * 0.06, 7.0)) + 0.12 * wNoise(vec3(p * 0.35, 2.0));
  which = floor(clamp(wNoise(vec3(p * 0.012, 11.0)) * 1.6 - 0.3, 0.0, 0.999) * 4.0);
  which = which < 0.5 ? 1.0 : which < 1.5 ? 0.0 : which < 2.5 ? 6.0 : 1.0;
  float rimward = smoothstep(40.0, 110.0, length(p / vec2(1.0, 0.75)));
  return smoothstep(0.8 - 0.12 * near - 0.04 * rimward, 0.815 - 0.12 * near - 0.04 * rimward, n);
}
// Scrapes: short straight scratches through the finish, the way a knife was dragged.
float palScrape(vec2 p){
  float s = 0.0;
  for (int i = 0; i < 2; i++) {
    vec2 cellP = floor(p / 21.0 + float(i) * 0.5);
    float h = wHash(vec3(cellP, float(i) + 1.0));
    if (h < 0.45) continue;
    vec2 c = (cellP + vec2(wHash(vec3(cellP, 4.0)), wHash(vec3(cellP, 5.0)))) * 21.0;
    float a = 2.4 + 0.9 * wHash(vec3(cellP, 6.0));
    vec2 d = vec2(cos(a), sin(a));
    vec2 q = p - c;
    float along = dot(q, d), across = dot(q, vec2(-d.y, d.x)) + 0.02 * along * along * (wHash(vec3(cellP, 8.0)) - 0.5);
    float len = 5.0 + 9.0 * wHash(vec3(cellP, 7.0));
    float w = max(0.16, length(fwidth(p)) * 0.8);
    s = max(s, (1.0 - smoothstep(0.0, w, abs(across))) * (1.0 - smoothstep(len * 0.7, len, abs(along))) * 0.8);
  }
  return s;
}`,
    color: /* glsl */ `
  vec3 palO = vObj;
  palG = palGrain(palO);
  float palW = fwidth(palG / 7.5);
  float palLt = palLate(palG, palW);
  float palPr = palPore(palO);
  float palV = wFbm(palO * 0.018 + 4.0);
  vec3 palDark = ${L('bronze-deep', 0.4)} * 0.95 + ${L('text-3', 0.05)} * 0.05;
  vec3 palLight = ${L('bronze-deep', 1.3)} * 0.9 + ${L('text-3', 0.22)} * 0.1;
  // Broad streaks of lighter and darker heartwood run along the board, and the rings ride on them.
  float palStreak = smoothstep(0.3, 0.75, wFbm(vec3(palG * 0.045, palO.x * 0.002, 9.0)));
  vec3 palWood = mix(palLight, palDark, clamp(0.25 + 0.45 * palLt + 0.4 * (1.0 - palStreak), 0.0, 1.0)) * (0.85 + 0.3 * palV);
  palWood *= 1.0 - 0.35 * palPr;
  // The edge and the hole's lip are end and side grain, rubbed paler, and paler again where the hand holds it.
  float palTop = smoothstep(0.92, 0.99, vObjN.y);
  float palHand = max(exp(-pow(length(vObj.xz - vec2(${HOLE.x.toFixed(1)}, ${HOLE.z.toFixed(1)})) / 34.0, 2.0)), exp(-pow(length(vObj.xz - ${v2(BAY_AT)}) / 48.0, 2.0)));
  float palWear = (1.0 - palTop) * (0.35 + 0.65 * palHand) + palTop * palHand * (0.35 + 0.5 * smoothstep(0.3, 0.7, wFbm(palO * 0.07 + 2.0)));
  vec3 palWorn = ${L('bronze-deep', 0.9)} * 0.55 + ${L('text-3', 0.42)} * 0.45;
  palWood = mix(palWood, palWorn * (0.85 + 0.3 * palV), palWear * 0.8);
  // The chip: fresh wood, pale and rough, where a piece of the edge broke away.
  float palChip = exp(-pow(length(vObj.xz - ${v2(CHIP_AT)}) / 5.5, 2.0)) * (1.0 - palTop * 0.7);
  palWood = mix(palWood, ${L('bronze', 0.62)} * 0.6 + ${L('text-3', 0.5)} * 0.4, palChip * 0.85);
  float palWhich;
  float palSt = palStain(palO, palWhich) * palTop;
  vec3 palStC = min(palAlbedo(int(palWhich)), ${L('hot', 0.55)});
  palWood = mix(palWood, palStC * 0.2 + palWood * 0.5, palSt * 0.75);
  float palSc = palScrape(vObj.xz) * palTop * (1.0 - palSt);
  palWood = mix(palWood, palWorn * 1.1, palSc * 0.55);
  diffuseColor.rgb = palWood;`,
    rough: 'roughnessFactor = clamp(0.46 + 0.16 * palPr + 0.25 * palWear + 0.3 * palSt + 0.25 * palChip + 0.2 * palSc, 0.04, 1.0);',
    normal: /* glsl */ `
  { float h = -0.008 * palPr + 0.05 * palSt - 0.02 * palSc - 0.4 * palChip * wNoise(vObj * 1.4) + 0.01 * palLt;
    normal = palBump(normal, h, 0.9); }`,
  }));
}

function paintMaterial(u: Shared): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.25, clearcoat: 0.85, clearcoatRoughness: 0.12, specularIntensity: 0.7 });
  m.name = 'palettePaint';
  m.defines = { USE_UV: '' };
  m.envMapIntensity = 0.7;
  m.userData.uniforms = u;
  return shade(m, 'palette-paint', partChunks({
    head: /* glsl */ `${BUMP}
vec3 palStrokeDir(int s){ vec4 q = PAL_STROKE[s]; vec2 d = q.zw - q.xy; return vec3(d / max(length(d), 1e-3), length(d)); }`,
    color: /* glsl */ `
  int palK = int(vCell.x + 0.5);
  float palSkin = 0.0, palWet = 1.0, palRidge = 0.0;
  vec3 palC;
  if (palK < 7) {
    palC = palAlbedo(palK);
    // The skin: the slumped foot has dried a little and wrinkled, the peak is still wet.
    palSkin = (1.0 - smoothstep(0.35, 0.75, vUv.y)) * smoothstep(0.2, 0.7, vUv.x);
    palC *= 0.94 + 0.12 * wNoise(vObj * 0.9);
  } else if (palK == ${PAINT.mix}) {
    int s = int(vCell.y + 0.5);
    vec3 sd = palStrokeDir(s);
    vec2 q = vObj.xz - PAL_STROKE[s].xy;
    float along = dot(q, sd.xy), across = dot(q, vec2(-sd.y, sd.x));
    // Flame drawn into pale: streaks pulled out along the knife's way, folded where the passes crossed.
    float st = wFbm(vec3(along * 0.035, across * 0.42, float(s) * 3.1)) + 0.25 * wNoise(vec3(along * 0.1, across * 1.4, 2.0));
    float k = smoothstep(0.42, 0.58, st + (PAL_STROKE_MIX[s] - 0.5) * 0.5);
    k = clamp(k * 0.8 + 0.2 * smoothstep(0.4, 0.6, wNoise(vObj * 0.12)), 0.0, 1.0);
    palC = mix(palAlbedo(2), palAlbedo(4), k);
    palC = mix(palC, palAlbedo(3), 0.35 * (1.0 - abs(k - 0.5) * 2.0));
    palRidge = vCell.z;
  } else if (palK == ${PAINT.hot}) {
    palC = palAlbedo(3);
  } else {
    palC = mix(palAlbedo(2), palAlbedo(4), smoothstep(0.3, 0.7, wNoise(vObj * 0.5)));
    palSkin = 0.3;
  }
  diffuseColor.rgb = palC;`,
    rough: 'roughnessFactor = clamp(mix(0.14, 0.42, palSkin) - 0.06 * palRidge, 0.06, 1.0);',
    normal: /* glsl */ `
  { float px = length(fwidth(vObj));
    float fine = 1.0 - smoothstep(0.25, 0.6, px);
    float h = palSkin * (wNoise(vObj * 0.55) - 0.5) * 0.12 * fine;
    if (palK == ${PAINT.mix}) { int s = int(vCell.y + 0.5); vec3 sd = palStrokeDir(s); float al = dot(vObj.xz, sd.xy); h += 0.05 * sin(al * 3.1 + wNoise(vObj * 0.6) * 4.0) * fine; }
    normal = palBump(normal, h, 1.0); }`,
    emissive: /* glsl */ `
  if (uGlow > 0.001) {
    vec3 palE = vec3(0.0);
    if (palK < 7) {
      // From inside: brightest where the paint is thin, at its foot and in the grooves of its coil.
      float thin = pow(1.0 - clamp(vUv.y, 0.0, 1.0), 1.6);
      palE = palGlowCol(palK) * palDab(palK) * (0.12 + 0.95 * thin) * 1.1;
    } else if (palK == ${PAINT.mix}) {
      int s = int(vCell.y + 0.5);
      float g = palStroke(s, clamp(vUv.x, 0.0, 1.1));
      palE = palRamp(0.3 + 0.7 * g) * g * (0.2 + 2.4 * smoothstep(0.15, 0.7, vCell.z));
    } else if (palK == ${PAINT.hot}) {
      palE = ${L('hot')} * palHair(0.0) * 1.3;
    } else {
      float g = 0.0; for (int s = 0; s < ${STROKES.length}; s++) g += palStroke(s, 0.9);
      palE = palRamp(0.4) * g * 0.35;
    }
    totalEmissiveRadiance += palE;
  }`,
  }, { bounce: false, rim: 0.6 }));
}

// The two turned handles: the brush's in a near black lacquer worn through to its wood where the fingers hold it, its
// end dipped in bronze; the knife's in oiled walnut.
function handleMaterial(u: Shared): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.08, specularIntensity: 0.6 });
  m.name = 'paletteHandle';
  m.defines = { USE_UV: '' };
  m.envMapIntensity = 0.6;
  m.userData.uniforms = u;
  const endAt = BRUSH.hair + BRUSH.ferrule + BRUSH.handle;
  return shade(m, 'palette-handle', partChunks({
    head: BUMP,
    color: /* glsl */ `
  float palS = vUv.x;
  float palKn = step(0.5, vCell.x);
  vec3 palLq = ${L('bg-3', 0.85)} * 0.7 + ${L('text-3', 0.03)} * 0.3;
  // Worn through where the fingers hold it, behind the ferrule, and in chips at the end.
  float palHold = exp(-pow((palS - ${(BRUSH.hair + BRUSH.ferrule + 22).toFixed(1)}) / 18.0, 2.0));
  float palWr = smoothstep(0.58, 0.7, wFbm(vec3(palS * 0.12, vUv.y * 9.0, 1.0)) + 0.32 * palHold) * (1.0 - palKn);
  vec3 palBare = ${L('bronze-deep', 0.7)} * 0.6 + ${L('text-3', 0.28)} * 0.4;
  float palDip = smoothstep(${(endAt - 27).toFixed(1)}, ${(endAt - 26.4).toFixed(1)}, palS) * (1.0 - palKn);
  vec3 palC = mix(palLq, palBare, palWr * 0.85);
  palC = mix(palC, ${L('bronze', 0.75)}, palDip);
  // The knife's handle: oiled walnut, its grain running along it.
  float palGr = wFbm(vec3(palS * 0.04, vUv.y * 5.0, 2.0)) + 0.2 * sin(vUv.y * 40.0 + palS * 0.05);
  vec3 palKw = mix(${L('bronze-deep', 0.62)} * 0.6 + ${L('text-3', 0.12)} * 0.4, ${L('bronze-deep', 0.3)} * 0.6 + ${L('text-3', 0.05)} * 0.4, smoothstep(0.42, 0.62, palGr));
  diffuseColor.rgb = mix(palC, palKw, palKn);`,
    rough: 'roughnessFactor = mix(mix(0.22, 0.55, palWr), 0.42, palKn);',
    normal: '{ float h = (palWr * 0.15 - palKn * 0.04 * smoothstep(0.4, 0.6, palGr)); normal = palBump(normal, h, 1.0); }',
  }));
}

// The metal: the brush's ferrule a polished brass that is copper's neighbour, its seam and crimps; the knife's blade a
// thin bronze, brushed along its length and worn bright at its edge; the neck and the knife's ferrule bronze.
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
  vec3 palC = palM == 0 ? ${L('copper-light', 0.8)} * 0.55 + ${L('bronze', 1.0)} * 0.45 : palM == 1 ? ${L('bronze', 0.95)} : palM == 2 ? ${L('bronze', 0.7)} : ${L('copper', 0.85)};
  float palBr = wNoise(vec3(vObj.x * 0.04 + vObj.z * 0.04, vObj.y * 20.0 + (vObj.x - vObj.z) * 4.0, 1.0));
  float palTn = smoothstep(0.55, 0.8, wFbm(vObj * 0.12 + 1.0));
  palC *= (0.92 + 0.14 * palBr) * (1.0 - 0.35 * palTn);
  diffuseColor.rgb = palC;`,
    rough: 'roughnessFactor = clamp((palM == 0 ? 0.16 : palM == 1 ? 0.3 : 0.34) + 0.12 * (palBr - 0.5) + 0.2 * palTn, 0.05, 1.0);',
    normal: /* glsl */ `
  { float px = length(fwidth(vObj)); float fine = 1.0 - smoothstep(0.08, 0.3, px);
    float h = palM == 1 ? (palBr - 0.5) * 0.02 * fine : (palM == 0 ? 0.03 * smoothstep(0.985, 1.0, abs(sin(vUv.y * 3.14159))) : 0.0);
    normal = palBump(normal, h, 1.0); }`,
  }));
}

// Sable: a red brown fibre, fine strands along the bundle, wet and dark with the hot paint over the half nearest the
// point, the line between ragged.
function hairMaterial(u: Shared): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.5, sheen: 0.6, sheenRoughness: 0.4, sheenColor: shadeOf('bronze', 0.6), clearcoat: 0.6, clearcoatRoughness: 0.15 });
  m.name = 'paletteHair';
  m.defines = { USE_UV: '' };
  m.userData.uniforms = u;
  const h = BRUSH.hair;
  return shade(m, 'palette-hair', partChunks({
    head: BUMP,
    color: /* glsl */ `
  float palSs = clamp(vUv.x / ${h.toFixed(1)}, 0.0, 1.2);
  float palStr = wNoise(vec3(vUv.y * 140.0, palSs * 2.0, 1.0));
  vec3 palSable = mix(${L('bronze-deep', 0.75)} * 0.7 + ${L('text-3', 0.1)} * 0.3, ${L('bronze', 0.55)}, smoothstep(0.3, 0.8, palStr));
  float palLoad = 1.0 - smoothstep(0.5, 0.62, palSs + 0.08 * (wNoise(vec3(vUv.y * 18.0, 0.0, 3.0)) - 0.5));
  diffuseColor.rgb = mix(palSable, palAlbedo(3) * (0.9 + 0.1 * palStr), palLoad);`,
    rough: 'roughnessFactor = mix(0.55 + 0.2 * palStr, 0.16, palLoad);',
    normal: '{ float px = length(fwidth(vObj)); float h = (palStr - 0.5) * 0.04 * (1.0 - palLoad) * (1.0 - smoothstep(0.05, 0.2, px)); normal = palBump(normal, h, 1.0); }',
    emissive: /* glsl */ `
  if (uGlow > 0.001) { float g = palHair(palSs); totalEmissiveRadiance += palRamp(0.35 + 0.6 * g) * g * mix(0.25, 1.4, palLoad); }`,
  }));
}

// A soft dark under the board, from the outline's own distance field, and a fainter one under the brush where its
// handle hangs out over the table.
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
void main(){
  if (uBandOn > 0.5 && length(palOnBoard(vPalP) - uBand.xy) > uBand.z) discard;
  vec2 uv = (vPalP.xz - vec2(${X0.toFixed(1)}, ${Z0.toFixed(1)})) / vec2(380.0, 300.0);
  float sd = (texture2D(uField, uv).r * 255.0 - 128.0) / 4.0;
  float a = (1.0 - smoothstep(-5.0, 11.0, sd)) * 0.78 * uShadow;
  vec2 p = vPalP.xz, a0 = vec2(${b0[0].toFixed(1)}, ${b0[1].toFixed(1)}), a1 = vec2(${b1[0].toFixed(1)}, ${b1[1].toFixed(1)});
  vec2 e = a1 - a0; float t = clamp(dot(p - a0, e) / dot(e, e), 0.0, 1.0);
  float db = length(p - a0 - e * t);
  a = max(a, (1.0 - smoothstep(1.0, 9.0, db)) * 0.45 * uBrush * smoothstep(-2.0, 4.0, sd));
  gl_FragColor = vec4(0.0, 0.0, 0.0, a);
}`,
  });
}
