import * as THREE from 'three';
import { Builder, pause, seeded, type Vec3 } from '../../world/build';
import { slab } from '../../world/shape';
import { lin, shade } from '../../world/surface';
import { hex, type PaletteName } from '../../config/palette';
import { boardArt } from './art';
import {
  BAY_AT, BOARD, BRUSH, CHIP_AT, CRUSTS, DABS, DIPPER, FLAT, HOLE, KNIFE, MIX, PRINTS, RING, RUN, STROKES, TAPE, WIPES,
  brushAxis, flatAxis, holeAt, knifeAxis, rim, rimAt, type Dab, type P2,
} from './layout';
import { PAINT, depthMaterial, partChunks, shared, type Shared } from './shading';

// The palette and everything on it, in millimetres under a root scaled by 0.001. Every part is merged by material
// with the others and carries its own number, so the shaders can move it alone.
//
// Only the paints are colored. The walnut runs from near black in its pores to a warm brown in its light streaks;
// the round's lacquer is a near black and the flat's a dark bronze; the steel of the knife's neck is grey; the
// ferrules, the blade, the rivets and the dipper are the metal, brass and bronze and copper. That is what tells the
// materials apart: wet paint beside dried skins beside oiled wood beside lacquer beside paper beside metal.

export type Kind = 'board' | 'dab' | 'mix' | 'bead' | 'knife' | 'brush' | 'flat' | 'dipper' | 'tape' | 'crust';
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
    for (let k = 0; k <= TOP; k++) {
      const s = 0.5 - 0.5 * Math.cos((k / TOP) * Math.PI);
      put(inner[0] + (edge[0] - inner[0]) * s, 0, inner[1] + (edge[1] - inner[1]) * s, 0, 1, 0);
    }
    const R = 6;
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

// A dab squeezed from a tube and left: a slumped dome with the coil it was laid in, its tip pulled up and over. Old,
// it has dried flat topped and lumpy; scraped, the knife has taken its top off flat on one side.
function dabSurface(d: Dab, small = false): { g: THREE.BufferGeometry; scraped: (x: number, z: number) => number } {
  const r = seeded(d.seed), nz = noise2(d.seed);
  const ph = [r() * 6.28, r() * 6.28, r() * 6.28];
  const lean = (d.lean * Math.PI) / 180, lx = Math.cos(lean), lz = Math.sin(lean);
  const lumpy = 0.08 + 0.1 * d.age;
  const foot = (a: number) => d.r * (1 + lumpy * Math.sin(2 * a + ph[0]) + 0.06 * Math.sin(3 * a + ph[1]) + 0.04 * Math.sin(5 * a + ph[2]) + 0.025 * d.age * Math.sin(9 * a + ph[0]));
  const sa = d.scrape ? (d.scrape.a * Math.PI) / 180 : 0;
  const scraped = (x: number, z: number) => (d.scrape ? sm(d.scrape.from - 0.1, d.scrape.from + 0.06, (x * Math.cos(sa) + z * Math.sin(sa)) / d.r) : 0);
  const f = (rr: number, a: number, x: number, z: number) => {
    const fresh = (() => {
      const dome = d.h * 0.58 * Math.pow(1 - rr * rr, 0.5);
      const coil = small ? 0 : d.h * 0.12 * (0.5 + 0.5 * Math.cos(2 * Math.PI * (rr * 2.3) - a - d.twist)) * Math.sin(Math.PI * Math.min(1, rr * 1.1));
      const px = x - lx * 0.2 * d.r, pz = z - lz * 0.2 * d.r;
      const peak = small ? 0 : d.h * 0.42 * Math.exp(-((Math.hypot(px, pz) / (0.34 * d.r)) ** 2));
      return dome + coil + peak;
    })();
    const old = d.h * Math.pow(Math.max(0, 1 - rr ** 3), 0.4) * (0.85 + 0.3 * nz(x * 0.35 + 3, z * 0.35)) + d.h * 0.12 * Math.cos(2 * Math.PI * rr * 1.6 - a);
    let y = fresh * (1 - d.age) + old * d.age;
    if (d.scrape) {
      const k = scraped(x, z);
      const across = -x * Math.sin(sa) + z * Math.cos(sa);
      const cut = d.scrape.h * (0.85 + 0.15 * Math.sin(across * 2.1)) * Math.min(1, (1 - rr) * 4);
      y = y * (1 - k) + Math.min(y, cut) * k;
    }
    return y;
  };
  const push = (rr: number, _a: number, y: number): P2 => { if (d.age > 0.5) return [0, 0]; const k = (y / d.h) ** 2.4 * 0.22 * d.r; return [lx * k, lz * k]; };
  const g = blob(d.x, d.z, small ? 8 : 15, small ? 24 : 44, foot, f, push);
  return { g, scraped: (x, z) => scraped(x - d.x, z - d.z) };
}

// A thin skin of old paint on the wood: a flat top, a steep edge that has lifted a little where it dried, a ragged
// outline.
function crustSurface(c: { x: number; z: number; r: number; seed: number }, th: number): THREE.BufferGeometry {
  const nz = noise2(c.seed), r = seeded(c.seed);
  const ph = [r() * 6.28, r() * 6.28, r() * 6.28];
  const foot = (a: number) => c.r * (1 + 0.18 * Math.sin(2 * a + ph[0]) + 0.12 * Math.sin(3 * a + ph[1]) + 0.1 * Math.sin(7 * a + ph[2]) + 0.06 * Math.sin(13 * a + ph[0]));
  const f = (rr: number, _a: number, x: number, z: number) => th * (sm(1.0, 0.86, rr) * (0.8 + 0.4 * nz(x * 0.6, z * 0.6)) + 0.35 * sm(0.72, 0.9, rr) * (1 - sm(0.92, 1.0, rr)));
  return blob(c.x, c.z, 7, 30, foot, f);
}

// A paint film with a thumb's ridges in it: the shader draws the ridges from its uv, the film's own millimetres
// turned to the print's way.
function printSurface(p: (typeof PRINTS)[number]): THREE.BufferGeometry {
  const r = seeded(p.seed), a0 = (p.a * Math.PI) / 180;
  const ph = [r() * 6.28, r() * 6.28];
  const foot = (a: number) => {
    const c = Math.cos(a - a0), s = Math.sin(a - a0);
    return (1 / Math.sqrt((c / 6.6) ** 2 + (s / 8.6) ** 2)) * (1 + 0.08 * Math.sin(3 * a + ph[0]) + 0.05 * Math.sin(8 * a + ph[1]));
  };
  const f = (rr: number) => 0.14 * sm(1.0, 0.75, rr);
  const uvOf = (x: number, z: number): P2 => [x * Math.cos(a0) + z * Math.sin(a0), -x * Math.sin(a0) + z * Math.cos(a0)];
  return blob(p.x, p.z, 6, 32, foot, f, undefined, uvOf);
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

// The mixing ground: a height worked out from the knife's passes, in order. Each pass lays its paint flat to the
// blade, thinner as it goes, leaves a ridge along each side where the paint was squeezed out, and breaks up into
// streaks at its far end where the blade lifted, ending in a ragged lip. Cells the paint does not reach are left out,
// and those it only partly covers are kept, so its edge is where the paint meets the wood and not a step of the grid.
function mixSurface(): THREE.BufferGeometry {
  const STEP = 0.6;
  const nz = noise2(9), nb = noise2(21);
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const s of STROKES) for (const p of [s.a, s.b]) { x0 = Math.min(x0, p[0] - s.w); x1 = Math.max(x1, p[0] + s.w); z0 = Math.min(z0, p[1] - s.w); z1 = Math.max(z1, p[1] + s.w); }
  const nx = Math.ceil((x1 - x0) / STEP), nzc = Math.ceil((z1 - z0) / STEP);
  const W = nx + 1;
  const H = new Float32Array(W * (nzc + 1)), top = new Float32Array(H.length), ridge = new Float32Array(H.length), al = new Float32Array(H.length), ac = new Float32Array(H.length);
  for (let j = 0; j <= nzc; j++) for (let i = 0; i <= nx; i++) {
    const x = x0 + i * STEP, z = z0 + j * STEP;
    let h = -0.6, who = 0, rd = 0, along = 0, across = 0;
    STROKES.forEach((s, k) => {
      const dx = s.b[0] - s.a[0], dz = s.b[1] - s.a[1], len = Math.hypot(dx, dz), ux = dx / len, uz = dz / len;
      const t = (x - s.a[0]) * ux + (z - s.a[1]) * uz, u = t / len;
      const c = -(x - s.a[0]) * uz + (z - s.a[1]) * ux - s.bow * 4 * Math.min(1, Math.max(0, u)) * (1 - Math.min(1, Math.max(0, u)));
      const half = (s.w / 2) * (0.92 + 0.08 * Math.sin(t * 0.2 + k)) * (1 - 0.22 * sm(0.6, 1.0, u));
      const end = len * (0.84 + 0.16 * nz(c * 0.35 + k * 7, 1.3));
      const streak = nb(c * 0.75 + k * 13, t * 0.05);
      const broken = sm(0.2, 0.62, streak + 0.7 * (1 - sm(0.4, 0.95, t / end)));
      const inside = sm(-1.6, 0.6, t) * (1 - sm(end - 3, end + 0.3, t)) * (1 - sm(half - 1.8, half + 0.4, Math.abs(c)));
      const thin = s.t * (1.08 - 0.62 * sm(0, 1, t / end)) * (0.82 + 0.36 * (c / s.w + 0.5) * 0.6);
      const layer = (thin * (0.75 + 0.5 * streak) + 0.04 * s.t * Math.sin(c * 2.6 + 3 * nz(t * 0.08, k))) * broken;
      const prev = h;
      h = h + (layer - h) * inside * sm(0.04, 0.2, layer);
      const edge = Math.exp(-(((Math.abs(c) - half) / 0.85) ** 2)) * sm(0, 3, t) * (1 - sm(end * 0.7, end, t)) * (0.6 + 0.4 * nz(t * 0.15, c));
      const set = Math.exp(-(((t + 0.4) / 1.8) ** 2)) * Math.exp(-((c / half) ** 2) * 1.4);
      const lip = Math.exp(-(((t - end + 1.2) / 1.1) ** 2)) * (1 - sm(half * 0.6, half, Math.abs(c))) * broken;
      const raised = Math.max(prev, layer * 0.9) + 1.0 * edge * s.t + 1.3 * set * s.t + 0.7 * lip * s.t;
      const lift = Math.max(edge * 0.95, set, lip);
      if (lift > 0.05 && raised > h) h = h + (raised - h) * Math.min(1, lift * 1.3);
      if (inside > 0.5 || lift > 0.4) { who = k; along = t / len; across = c / half; rd = Math.max(edge, set, lip); }
    });
    const o = j * W + i;
    H[o] = h; top[o] = who; ridge[o] = rd; al[o] = along; ac[o] = across;
  }
  // Paint is soft: its walls and ridges are rounded, and where one pass ran over another there is no step.
  for (let pass = 0; pass < 2; pass++) {
    const T = new Float32Array(H.length);
    for (let j = 0; j <= nzc; j++) for (let i = 0; i <= nx; i++) {
      let sum = 0, wsum = 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        const jj = Math.min(nzc, Math.max(0, j + dj)), ii = Math.min(nx, Math.max(0, i + di)), w = (2 - Math.abs(di)) * (2 - Math.abs(dj));
        sum += Math.max(H[jj * W + ii], -0.2) * w; wsum += w;
      }
      T[j * W + i] = sum / wsum;
    }
    H.set(T);
  }
  for (let o = 0; o < H.length; o++) if (H[o] < 0.06) H[o] = -0.6;
  const pos: number[] = [], uv: number[] = [], cell: number[] = [];
  for (let j = 0; j <= nzc; j++) for (let i = 0; i <= nx; i++) {
    const o = j * W + i;
    pos.push(x0 + i * STEP, H[o], z0 + j * STEP);
    uv.push(al[o], ac[o]);
    cell.push(PAINT.mix, top[o], ridge[o], 0);
  }
  const idx: number[] = [];
  for (let j = 0; j < nzc; j++) for (let i = 0; i < nx; i++) {
    const a = j * W + i, b = a + 1, c = a + W, d = c + 1;
    if (H[a] < 0 && H[b] < 0 && H[c] < 0 && H[d] < 0) continue;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('cell', new THREE.Float32BufferAttribute(cell, 4));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// A smear where the knife was wiped: thick where it began, thinning and breaking into streaks to nothing.
function wipeSurface(w: (typeof WIPES)[number], seed: number): THREE.BufferGeometry {
  const nb = noise2(seed);
  const NA = 30, NC = 10;
  const dx = w.b[0] - w.a[0], dz = w.b[1] - w.a[1], len = Math.hypot(dx, dz), ux = dx / len, uz = dz / len;
  const pos: number[] = [], uv: number[] = [];
  for (let i = 0; i <= NA; i++) for (let k = 0; k <= NC; k++) {
    const u = i / NA, v = (k / NC) * 2 - 1;
    const half = (w.w / 2) * (1 - 0.15 * u) * (0.85 + 0.3 * nb(u * 3, 7)) * Math.min(1, 0.4 + u * 6);
    const x = w.a[0] + ux * u * len - uz * v * half, z = w.a[1] + uz * u * len + ux * v * half;
    const streak = sm(0.25, 0.5, nb(v * 2.2, u * 2) + 1.2 * (1 - u));
    const y = Math.abs(v) > 0.97 ? -0.4 : 0.22 * (1 - u) ** 1.2 * Math.sqrt(1 - v * v) * streak * sm(0, 0.08, u) * (1 - sm(0.92, 1, u)) + 0.04;
    pos.push(x, y < 0.07 ? -0.4 : y, z);
    uv.push(u, v);
  }
  const idx: number[] = [], W = NC + 1;
  for (let i = 0; i < NA; i++) for (let k = 0; k < NC; k++) { const a = i * W + k; idx.push(a, a + 1, a + W, a + 1, a + W + 1, a + W); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
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
  const g = new THREE.LatheGeometry([[0.0001, h], [r * 0.5, h * 0.88], [r * 0.85, h * 0.55], [r, h * 0.15], [r * 0.98, -0.2]].map(([a, b]) => new THREE.Vector2(a, b)), 20);
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

  // ---- the paints: the dabs, the old skins, the wipes, the run, the prints, the mixing ground ----
  DABS.forEach((d, k) => {
    const i = part({ kind: 'dab', c: [d.x, 0, d.z], r: d.r * 1.1, n: k });
    const { g, scraped } = dabSurface(d);
    add(i, g, paint, (x, _y, z) => [k, d.age, scraped(x, z)]);
  });
  CRUSTS.forEach((c) => {
    const i = part({ kind: 'crust', c: [c.x, 0, c.z], r: c.r * 1.2 });
    add(i, crustSurface(c, 0.32 + 0.05 * c.r), paint, [PAINT.crust, c.paint, 0]);
  });
  WIPES.forEach((w, k) => {
    const i = part({ kind: 'crust', c: [(w.a[0] + w.b[0]) / 2, 0, (w.a[1] + w.b[1]) / 2], r: Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]) / 2 + w.w });
    add(i, wipeSurface(w, 31 + k), paint, [PAINT.wipe, w.paint, 0]);
  });
  PRINTS.forEach((p) => {
    const i = part({ kind: 'crust', c: [p.x, 0, p.z], r: 9 });
    add(i, printSurface(p), paint, [PAINT.print, p.paint, 0]);
  });
  {
    // The run: from the old ember at the left end, across the top, over the rounded edge and down its side, where it
    // stopped in a bead.
    const d = DABS[RUN.from], e = BOARD.round, T = BOARD.thick;
    const f = Math.PI + Math.asin(Math.max(-1, Math.min(1, -d.z / 108)));
    const { p: O, n: Nn } = rimAt(f);
    const Nv = V3(Nn[0], 0, Nn[1]);
    const E = V3(O[0] - Nn[0] * e, 0, O[1] - Nn[1] * e);
    const pts: THREE.Vector3[] = [], ups: THREE.Vector3[] = [];
    const start = V3(d.x + Nn[0] * d.r * 0.5, 0, d.z + Nn[1] * d.r * 0.5);
    for (let k = 0; k <= 8; k++) { pts.push(start.clone().lerp(E, k / 8).setY(0.02)); ups.push(V3(0, 1, 0)); }
    for (let k = 1; k <= 8; k++) { const a = (k / 8) * (Math.PI / 2); pts.push(E.clone().addScaledVector(Nv, e * Math.sin(a) + 0.02).setY(-e + (e + 0.02) * Math.cos(a))); ups.push(Nv.clone().multiplyScalar(Math.sin(a)).setY(Math.cos(a))); }
    for (let k = 1; k <= 4; k++) { pts.push(E.clone().addScaledVector(Nv, e + 0.02).setY(-e - (k / 4) * 1.4)); ups.push(Nv.clone()); }
    const total = pts.length;
    const i = part({ kind: 'crust', c: [O[0], -1, O[1]], r: 12 });
    add(i, sweep(pts, ups, (k) => ({ w: (RUN.w / 2) * (0.75 + 0.35 * (k / total)), t: 0.45 + 0.25 * (k / total), n: 2.4, flat: true }), 14), paint, [PAINT.run, 1, 0]);
    const bead = new THREE.SphereGeometry(1, 18, 12);
    bead.scale(RUN.bead * 1.1, RUN.bead * 1.25, RUN.bead * 0.75);
    const Tg = V3(-Nn[1], 0, Nn[0]);
    bead.applyMatrix4(new THREE.Matrix4().makeBasis(Tg, V3(0, 1, 0), Nv).setPosition(E.clone().addScaledVector(Nv, e + 0.3).setY(-e - 2.0)));
    add(i, bead, paint, [PAINT.run, 1, 0]);
  }
  const iMix = part({ kind: 'mix', c: [MIX.x, 0, MIX.z], r: 44 });
  add(iMix, mixSurface(), paint, 'keep');
  await pause();

  // ---- the round brush ----
  const A = new THREE.Vector3(Math.cos(BRUSH.dir), 0, Math.sin(BRUSH.dir));
  const tip = new THREE.Vector3(BRUSH.tip[0], BRUSH.lift, BRUSH.tip[1]);
  const bMid = brushAxis(BRUSH.hair + 60);
  const iBrush = part({ kind: 'brush', c: [bMid[0], BRUSH.lift, bMid[1]], r: 60 });
  {
    const h = BRUSH.hair, f = BRUSH.ferrule, Lh = BRUSH.handle, g = 1.38;
    const R = (pts: [number, number][]): [number, number][] => pts.map(([r, sv]) => [r * g, sv]);
    const hairP = profileOf(R([[0.02, 0], [0.9, h * 0.08], [1.9, h * 0.23], [2.62, h * 0.5], [2.72, h * 0.67], [2.5, h], [2.42, h + 1.5]]), 0.5);
    const bend = (sv: number) => (sv < h ? (BRUSH.lift - 1.0) * (1 - sv / h) ** 2 : 0);
    add(iBrush, turned(hairP, 40, tip, A, bend), hair, [0, 0, 0]);
    const c1 = h + f - 8, c2 = h + f - 11;
    const ferP = profileOf(R([
      [2.45, h - 0.2], [2.72, h + 0.2], [2.66, h + 0.8], [2.7, h + 5], [2.95, c2 - 1.8], [3.0, c2 - 0.6], [2.78, c2], [3.0, c2 + 0.6],
      [3.04, c1 - 0.7], [2.82, c1], [3.06, c1 + 0.7], [3.12, h + f - 1.2], [3.22, h + f - 0.35], [3.12, h + f], [3.0, h + f + 0.05],
    ]), 1.2);
    add(iBrush, turned(ferP, 48, tip, A), metal, [0, 0, 0]);
    const s0 = h + f - 2, end = h + f + Lh;
    const handP = profileOf(R([[3.0, s0], [3.1, h + f + 1], [3.65, h + f + 30], [3.5, h + f + 70], [2.55, end - 30], [2.15, end - 6], [1.9, end - 2.4], [1.2, end - 0.6], [0.02, end]]), 4);
    add(iBrush, turned(handP, 40, tip, A), handle, [0, 0, 0]);
  }
  const beadAt = brushAxis(-1.5);
  const iBead = part({ kind: 'bead', c: [beadAt[0], 0, beadAt[1]], r: 5 });
  add(iBead, dabSurface({ x: beadAt[0], z: beadAt[1], r: BRUSH.bead.r, h: BRUSH.bead.h, lean: 0, twist: 0, seed: 7, paint: 3, age: 0 }, true).g, paint, [PAINT.hot, 0, 0]);
  await pause();

  // ---- the flat brush ----
  {
    const F = FLAT, dir = V3(Math.cos(F.dir), 0, Math.sin(F.dir));
    const mid = flatAxis(60);
    const iFlat = part({ kind: 'flat', c: [mid[0], F.lift, mid[1]], r: 70 });
    const along = (s: number, y: number) => { const p = flatAxis(s); return V3(p[0], y, p[1]); };
    const hl = F.hair.len, fl = F.ferrule;
    // The hairs: a flat bundle squared off to a chisel edge, bent down to rest on the board at its edge.
    const hp: THREE.Vector3[] = [];
    const HN = 16;
    for (let k = 0; k <= HN; k++) { const s = (k / HN) * (hl + 1); hp.push(along(s, F.lift - (F.lift - 0.45) * (1 - s / hl) ** 2 * (s < hl ? 1 : 0))); }
    add(iFlat, sweep(hp, V3(0, 1, 0), (k) => { const q = k / HN; return { w: F.hair.w / 2 * (0.97 + 0.06 * Math.sin(q * 3)), t: 0.35 + (F.hair.t / 2 - 0.35) * Math.min(1, q * 1.3), n: 3.2 }; }, 24), hair, [1, 0, 0]);
    // The ferrule: pressed flat at the hairs, round at the handle, with the crimp between.
    const fp: THREE.Vector3[] = [];
    const FN = 22;
    for (let k = 0; k <= FN; k++) fp.push(along(hl - 0.6 + (k / FN) * fl, F.lift));
    add(iFlat, sweep(fp, V3(0, 1, 0), (k) => {
      const q = k / FN, s = q * fl, round = sm(0.35, 0.8, q);
      const crimp = 1 - 0.07 * Math.exp(-(((s - fl * 0.72) / 0.5) ** 2)) - 0.07 * Math.exp(-(((s - fl * 0.8) / 0.5) ** 2));
      const lip = 1 + 0.06 * Math.exp(-((s / 0.6) ** 2));
      return { w: (5.3 * (1 - round) + 3.15 * round) * crimp * lip, t: (1.75 * (1 - round) + 3.15 * round) * crimp * lip, n: 4.5 - 2.5 * round };
    }, 32), metal, [6, 0, 0]);
    const from = along(hl + fl - 1.5, F.lift);
    const len = F.handle;
    const prof = profileOf([[3.05, 0], [3.2, 2], [3.45, 18], [3.2, 50], [2.35, len - 22], [2.05, len - 5], [1.6, len - 1.6], [0.02, len]], 3.5);
    add(iFlat, turned(prof, 36, from, dir), handle, [3, 0, 0]);
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

  // ---- the tape, over the left front edge ----
  {
    const iTape = part({ kind: 'tape', c: [rimAt(TAPE.f).p[0], 0, rimAt(TAPE.f).p[1]], r: 22 });
    const e = BOARD.round, T = BOARD.thick, nt = noise2(5);
    const NW = 26, NP = 28, pos: number[] = [], uv: number[] = [];
    for (let j = 0; j <= NW; j++) {
      const w = (j / NW - 0.5) * TAPE.w;
      const { p: O, n: Nn } = rimAt(TAPE.f + w / 112);
      const Nv = V3(Nn[0], 0, Nn[1]);
      const E = V3(O[0] - Nn[0] * e, 0, O[1] - Nn[1] * e);
      const reach = TAPE.inward + 2.2 * (nt(j * 0.45, 1) - 0.5) + 1.1 * (nt(j * 1.7, 4) - 0.5) + 0.5 * Math.sin(j * 4.1) * nt(j, 9) + (j / NW) * 2.5;
      const lift = 0.07;
      for (let k = 0; k <= NP; k++) {
        const q = k / NP;
        let p: THREE.Vector3;
        if (q < 0.55) p = E.clone().addScaledVector(Nv, -reach * (1 - q / 0.55)).setY(lift);
        else if (q < 0.8) { const a = ((q - 0.55) / 0.25) * (Math.PI / 2); p = E.clone().addScaledVector(Nv, (e + lift) * Math.sin(a)).setY(-e + (e + lift) * Math.cos(a)); }
        else { const s = (q - 0.8) / 0.2; p = E.clone().addScaledVector(Nv, e + lift).setY(-e - s * (T - e - 0.3)); }
        pos.push(p.x, p.y, p.z);
        uv.push(j / NW, q);
      }
    }
    const idx: number[] = [], W = NP + 1;
    for (let j = 0; j < NW; j++) for (let k = 0; k < NP; k++) { const a = j * W + k; idx.push(a, a + 1, a + W, a + 1, a + W + 1, a + W); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    const Nn = g.getAttribute('normal');
    if (Nn.getY(Math.floor(NW / 2) * W + 2) < 0) { for (let t = 0; t < idx.length; t += 3) { const x = idx[t + 1]; idx[t + 1] = idx[t + 2]; idx[t + 2] = x; } g.setIndex(idx); g.computeVertexNormals(); }
    add(iTape, g, satin, [2, 0, 0]);
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

// Cracks in dried paint: the edges of cells about `size` millimetres across, as a value from 0 to 1 that fades out
// before it is finer than a pixel.
const CRACK = /* glsl */ `
float palCrack(vec2 p, float size){
  vec2 q = p / size, i = floor(q), f = fract(q);
  float d1 = 8.0, d2 = 8.0;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y));
    vec2 o = vec2(wHash(vec3(i + g, 1.0)), wHash(vec3(i + g, 2.0)));
    float d = length(g + o - f);
    if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
  }
  float px = length(fwidth(q));
  return (1.0 - smoothstep(0.0, 0.035 + px * 1.0, d2 - d1)) * (1.0 - smoothstep(0.2, 0.5, px));
}`;

// The knots: two, off centre, in open wood. Where, how large across and along the grain.
const KNOTS = [{ x: 22, z: 42, r: 4.2 }, { x: 128, z: -24, r: 2.6 }] as const;
// The growth rings: an axis under the board that rises toward the thumb hole, so the rings come up through the top
// as nested arches whose tips lie round the hole, and run out as long lines to the left.
const AXIS = { apex: 108, rise: 0.15, shallow: 6, z: HOLE.z } as const;

function boardMaterial(u: Shared): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.6, specularIntensity: 0.1 });
  m.name = 'paletteWood';
  m.envMapIntensity = 0.16;
  m.userData.uniforms = u;
  const v2 = (p: P2) => `vec2(${p[0].toFixed(1)}, ${p[1].toFixed(1)})`;
  // Walnut, from the pore to its lightest streak: the site's deep bronze and its grey, in proportion.
  const wc = (a: number, b: number) => `(${L('bronze-deep')} * ${a.toFixed(3)} + ${L('text-3')} * ${b.toFixed(3)})`;
  const knot = (k: (typeof KNOTS)[number]) => `vec3(${k.x.toFixed(1)}, ${k.z.toFixed(1)}, ${k.r.toFixed(1)})`;
  return shade(m, 'palette-wood', partChunks({
    head: /* glsl */ `${BUMP}
const vec3 PAL_KNOT[2] = vec3[2](${KNOTS.map(knot).join(', ')});
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
float palYears(float r){ return (r + 7.0 * sin(r * 0.07 + 1.3) + 1.9 * sin(r * 0.21 + 0.4)) / 2.9; }
// Pores: short dark dashes along the grain, six rows to a year, more of them in the early wood. Under a pixel they
// become what they average to.
float palPores(float x, float yr, float late){
  float v = yr * 6.0, row = floor(v), fv = fract(v) - 0.5;
  float uu = x / 3.4 + palH(row * 1.7 + 3.0) * 13.0, cell = floor(uu), fu = fract(uu) - 0.5;
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
  float palStreak = smoothstep(0.25, 0.75, wFbm(vec3(palO.x * 0.003, palRad * 0.035, 5.0)));
  float palV = wFbm(palO * 0.018 + 4.0);
  vec3 palLight = ${wc(1.05, 0.04)}, palMid = ${wc(0.56, 0.016)}, palDark = ${wc(0.2, 0.004)}, palPore = ${wc(0.04, 0.0)};
  vec3 palWood = mix(palMid, palLight, palStreak * 0.7) * (0.9 + 0.2 * palV);
  palWood = mix(palWood, palDark, palLate * (0.4 + 0.2 * (1.0 - palStreak)));
  // The knots: a dark heart with tight rings of its own, a darker rim, and a check across it.
  for (int k = 0; k < 2; k++) {
    vec2 d = (palO.xz - PAL_KNOT[k].xy) / vec2(1.25, 1.0);
    float l = length(d), R = PAL_KNOT[k].z;
    float inK = 1.0 - smoothstep(R * 0.92, R * 1.08, l);
    float kr = 0.5 + 0.5 * cos(l / R * 15.0 + 2.0 * wNoise(vec3(d * 0.6, 4.0)));
    vec3 kc = mix(${wc(0.3, 0.01)}, ${wc(0.12, 0.002)}, kr * 0.6 + 0.4 * smoothstep(R * 0.6, R, l));
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
  palWood = mix(palWood, palPoreC, palPr * 0.85);
  // A faint ghost of paint wiped thin over years, in broad patches.
  float palGhost = smoothstep(0.55, 0.8, wFbm(vec3(palO.xz * 0.012, 2.0))) * min(palNear, 1.0) * palTop;
  palWood = mix(palWood, palWood * 0.6 + palTint * 0.05, palGhost * 0.5);
  // The edge and the bevel worn pale where the hand holds it, the varnish rubbed through.
  float palHand = max(exp(-pow(length(vObj.xz - vec2(${HOLE.x.toFixed(1)}, ${HOLE.z.toFixed(1)})) / 30.0, 2.0)), exp(-pow(length(vObj.xz - ${v2(BAY_AT)}) / 44.0, 2.0)));
  float palWear = palEnd * smoothstep(0.1, 0.75, abs(vObjN.y)) * (0.45 + 0.55 * palHand) * (0.6 + 0.4 * wNoise(palO * 0.15));
  palWear = max(palWear, palTop * palHand * smoothstep(0.35, 0.7, wFbm(palO * 0.06 + 2.0)) * 0.8);
  vec3 palWorn = ${wc(1.6, 0.16)};
  palWood = mix(palWood, palWorn * (0.85 + 0.3 * palV) * (1.0 - 0.4 * palLate), palWear);
  float palChip = exp(-pow(length(vObj.xz - ${v2(CHIP_AT)}) / 5.5, 2.0)) * (1.0 - palTop * 0.7);
  palWood = mix(palWood, ${wc(2.4, 0.5)}, palChip * 0.85);
  // Each dab sits in a crisp shadow of its own, close round its foot.
  float palOut = palOutside(palO.xz);
  float palSit = exp(-max(palOut, 0.0) / 0.7) * step(-0.6, palOut) * palTop;
  palWood *= 1.0 - 0.62 * palSit;
  // What is drawn on it: pencil, the burned stamp, the cup's ring.
  vec4 palA = palArt(vObj.xz) * palTop;
  float palBurn = palA.g;
  palWood = mix(palWood, ${wc(0.5, 0.06)} * 0.6, smoothstep(0.0, 0.5, palBurn) * 0.55);
  palWood = mix(palWood, ${wc(0.04, 0.0)}, smoothstep(0.35, 0.9, palBurn));
  palWood = mix(palWood, palWood * 0.5 + ${L('ember', 0.25)} * 0.25, palA.b * 0.75);
  palWood = mix(palWood, ${L('text-3', 0.2)}, palA.r * 0.8);
  // The top's polished chamfer: a thin band of the rounded edge just over its shoulder, round the outline and the hole.
  float palAng = acos(clamp(normalize(vObjN).y, -1.0, 1.0));
  float palAw = max(0.09, fwidth(palAng) * 0.8);
  float palCham = exp(-pow((palAng - 0.6) / palAw, 2.0)) * (0.09 / palAw) * (1.0 - 0.5 * palChip);
  diffuseColor.rgb = palWood;`,
    rough: 'roughnessFactor = clamp(0.5 + 0.25 * palPr + 0.25 * palWear + 0.55 * smoothstep(0.1, 0.6, palBurn) + 0.2 * palA.b - 0.22 * palA.r + 0.25 * palChip + 0.12 * palEnd + 0.15 * palSit, 0.04, 1.0);',
    normal: /* glsl */ `
  { float h = -0.03 * smoothstep(0.2, 0.9, palBurn) - 0.4 * palChip * wNoise(vObj * 1.4) + 0.004 * palLate - 0.006 * palPr;
    normal = palBump(normal, h, 0.9); }`,
    emissive: /* glsl */ `
  // The varnish. What it mirrors is the cursor's light, as a long narrow streak in the light's own warmth with a soft
  // fall round it, broken where the finish is worn or burned and dark in the pores. The stage's white balance takes
  // the warmth out of dim light, so the streak is drawn in hot: after the balance it is amber to pale gold.
  { float k = (1.0 - 0.8 * palWear) * (1.0 - 0.85 * smoothstep(0.3, 0.8, palBurn)) * (1.0 - 0.4 * palPr) * (1.0 - 0.6 * palA.b) * (1.0 - 0.6 * palChip) * (1.0 - 0.7 * palSit);
    vec3 palGleam = ${L('hot')} * 0.88 + ${L('pale')} * 0.12;
    vec3 palVn = normalize(nonPerturbedNormal);
    totalEmissiveRadiance += palGleam * (palTube(palVn, 260000.0) * 1.7 + palTube(palVn, 30000.0) * 0.3 + palTube(palVn, 4000.0) * 0.05) * k * palTop;
    totalEmissiveRadiance += ${L('hot')} * palStrips(palVn, 90000.0) * 0.03 * k * palTop;
    // Chatoyance: the fibres lie at a tilt that turns over in bands across the grain, so a soft glow in the wood's
    // own color moves along the board as the cursor's light does.
    float tilt = (wNoise(vec3(vObj.x * 0.13, vObj.z * 0.008, 6.0)) * 2.0 - 1.0) * (0.5 + 0.5 * palStreak);
    vec3 nC = normalize(palVn + vAxX * tilt * 0.22);
    totalEmissiveRadiance += ${L('copper')} * palTube(nC, 420.0) * 0.05 * palTop * (1.0 - 0.7 * palSit) * (1.0 - 0.5 * palLate);
    totalEmissiveRadiance += palEdgeLit(palVn, palCham); }`,
  }));
}

function paintMaterial(u: Shared): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.4, clearcoat: 0.22, clearcoatRoughness: 0.38, specularIntensity: 0.5 });
  m.name = 'palettePaint';
  m.defines = { USE_UV: '' };
  m.envMapIntensity = 0.4;
  m.userData.uniforms = u;
  return shade(m, 'palette-paint', partChunks({
    head: /* glsl */ `${BUMP}${CRACK}
vec3 palStrokeDir(int s){ vec4 q = PAL_STROKE[s]; vec2 d = q.zw - q.xy; return vec3(d / max(length(d), 1e-3), length(d)); }`,
    color: /* glsl */ `
  int palK = int(vCell.x + 0.5);
  float palSkin = 0.0, palWet = 0.0, palRidge = 0.0, palCr = 0.0, palAge = 0.0, palPrint = 0.0;
  vec3 palC;
  if (palK < ${PAINT.mix}) {
    palSelf = palK;
    palAge = vCell.y;
    palC = palAlbedo(PAL_DAB_PAINT[palK]);
    // Fresh: the slumped foot has dried a little and wrinkled, the peak is wet. Old: dried through, darker, cracked
    // across, and where the knife took its top off the cut face is flat and streaked.
    palSkin = mix((1.0 - smoothstep(0.35, 0.75, vUv.y)) * smoothstep(0.2, 0.7, vUv.x), 1.0, palAge);
    palWet = (1.0 - palAge) * smoothstep(0.3, 0.8, vUv.y);
    palC *= (0.94 + 0.12 * wNoise(vObj * 0.9)) * (1.0 - 0.22 * palAge);
    palCr = palCrack(vObj.xz + vObj.y * 0.3, 1.7) * palAge * (1.0 - 0.5 * vCell.z);
    palC *= 1.0 - 0.85 * palCr;
    palC = mix(palC, palC * (0.85 + 0.35 * wNoise(vec3(vObj.xz * vec2(0.3, 2.5), 1.0))), vCell.z);
    // Where it sits on the wood the paint is in its own shadow.
    palC *= mix(0.62, 1.0, smoothstep(0.0, 0.14, vUv.y));
  } else if (palK == ${PAINT.mix}) {
    float palAl;
    int s = palTopStroke(vObj.xz, palAl);
    vec3 sd = palStrokeDir(s);
    vec2 q = vObj.xz - PAL_STROKE[s].xy;
    float along = dot(q, sd.xy), across = dot(q, vec2(-sd.y, sd.x));
    float st = wFbm(vec3(along * 0.03, across * 0.5, float(s) * 3.1)) + 0.3 * wNoise(vec3(along * 0.08, across * 1.6, 2.0));
    float k = smoothstep(0.44, 0.56, st + (PAL_STROKE_MIX[s] - 0.5) * 0.55);
    palC = mix(palAlbedo(2), palAlbedo(4), k);
    palC = mix(palC, palAlbedo(3), 0.4 * (1.0 - abs(k - 0.5) * 2.0));
    palRidge = vCell.z;
    palWet = 0.55 + 0.45 * palRidge;
  } else if (palK == ${PAINT.hot}) {
    palC = palAlbedo(3);
    palWet = 1.0;
  } else if (palK == ${PAINT.knife}) {
    palC = mix(palAlbedo(2), palAlbedo(4), smoothstep(0.3, 0.7, wNoise(vObj * 0.5)));
    palSkin = 0.3;
    palWet = 0.6;
  } else if (palK == ${PAINT.pool}) {
    // The medium: a dark amber oil, with a skin of flame swirled on it; on the cup's side a dried run.
    palC = ${L('ember-deep', 0.5)} + palAlbedo(2) * 0.06 * smoothstep(0.55, 0.8, wFbm(vec3(vObj.xz * 0.6, 1.0)));
    palC = mix(palC, ${L('ember', 0.42)}, vCell.y);
    palWet = 1.0 - 0.5 * vCell.y;
    palSkin = 1.0 - vCell.y;
  } else if (palK == ${PAINT.crust} || palK == ${PAINT.run}) {
    palC = palAlbedo(int(vCell.y + 0.5)) * (0.62 + 0.1 * wNoise(vObj * 0.7));
    palAge = 0.6;
    palSkin = 0.4;
    palCr = palK == ${PAINT.crust} ? palCrack(vObj.xz + 1.4 * vec2(wNoise(vObj * 0.4), wNoise(vObj * 0.4 + 9.0)), 3.2) * smoothstep(0.1, 0.25, vObj.y) * 0.7 : 0.0;
    palC *= 1.0 - 0.6 * palCr;
    palWet = palK == ${PAINT.run} ? 0.45 : 0.0;
  } else if (palK == ${PAINT.wipe}) {
    palC = palAlbedo(int(vCell.y + 0.5)) * (0.55 + 0.22 * wNoise(vec3(vUv.x * 30.0, vUv.y * 9.0, 2.0)));
    palAge = 0.8;
    palSkin = 0.8;
    palWet = 0.2;
  } else {
    // A thumbprint: the ridges carry the paint, the furrows between show it thin.
    // A loop: ridges come up from one side, turn round the core and go back, as on a thumb, broken here and there and
    // lighter toward where the thumb lifted.
    vec2 q = vUv * vec2(1.0, 0.8) - vec2(0.0, 1.2);
    float flow = length(q * vec2(1.0, 1.6)) + 0.35 * q.y + 0.6 * smoothstep(-2.0, 4.0, -q.y) * abs(q.x) * 0.25;
    float ridge = 0.5 + 0.5 * sin(flow * 12.0 + 2.2 * wNoise(vec3(vUv * 0.7, 3.0)));
    ridge *= smoothstep(0.25, 0.55, wNoise(vec3(vUv * 1.6, 5.0)) + 0.35);
    float px = length(fwidth(vUv));
    float near = 1.0 - smoothstep(0.08, 0.3, px);
    if (near > 0.5 && ridge < 0.42 + 0.25 * smoothstep(2.0, 8.0, vUv.x + 4.0)) discard;
    palPrint = mix(ridge, 0.5, 1.0 - near);
    palC = palAlbedo(int(vCell.y + 0.5)) * (0.3 + 0.22 * palPrint);
    palAge = 0.7;
    palSkin = 0.7;
    palWet = 0.25 * palPrint;
  }
  diffuseColor.rgb = palC;`,
    rough: `roughnessFactor = clamp(mix(mix(0.34, 0.55, palSkin), 0.7, palAge) - 0.06 * palRidge + 0.2 * palCr - 0.12 * palWet * (1.0 - palAge), 0.05, 1.0); if (palK == ${PAINT.pool}) roughnessFactor = 0.5 - 0.2 * vCell.y;`,
    normal: /* glsl */ `
  { float px = length(fwidth(vObj));
    float fine = 1.0 - smoothstep(0.25, 0.6, px);
    float h = palSkin * (wNoise(vObj * 0.55) - 0.5) * 0.12 * fine - palCr * 0.015;
    if (palK == ${PAINT.mix}) { float al0; int s = palTopStroke(vObj.xz, al0); vec3 sd = palStrokeDir(s); float ac = dot(vObj.xz, vec2(-sd.y, sd.x)); h += 0.04 * sin(ac * 5.5 + wNoise(vObj * 0.6) * 3.0) * fine; }
    if (palK < ${PAINT.mix}) {
      h += vCell.z * 0.05 * sin(dot(vObj.xz, vec2(0.3, 2.7))) * fine;
      // The ribs the tube's nozzle left along the coil, softened where it slumped, gone where it dried.
      vec2 d = vObj.xz - PAL_DAB[palK].xy;
      float rr = length(d) / PAL_DAB[palK].z, an = atan(d.y, d.x);
      float coil = rr * 2.3 - an / 6.2832;
      float ribs = sin(6.2832 * coil * 3.0 + 2.4 * wNoise(vObj * 0.35)) * smoothstep(0.25, 0.65, wNoise(vec3(an * 2.0, coil * 1.5, 7.0)));
      h += 0.1 * ribs * (1.0 - palAge) * smoothstep(0.12, 0.4, vUv.y) * (1.0 - smoothstep(0.3, 0.65, px));
    }
    h += palPrint * 0.03;
    normal = palBump(normal, h, 1.0); }`,
    emissive: /* glsl */ `
  // A soft sheen on its ridges, as oil paint has: never a glassy pin point.
  totalEmissiveRadiance += mix(${L('pale')}, palC * 1.4, 0.3) * (palTube(normal, 520.0) * 0.5 * palWet + palTube(normal, 90.0) * 0.08 * (1.0 - palAge));
  if (uGlow > 0.001) {
    vec3 palE = vec3(0.0);
    if (palK < ${PAINT.mix}) {
      // Lit, the paint is still paint: its own color brought up, shaded by its form toward the light above the
      // strike, its foot in its own shadow. A glow strongest where it is thinnest made it read as amber jelly.
      vec3 nO = normalize(vPalN);
      vec3 palLs = normalize(vec3(-0.45, 1.0, 0.25));
      float form = 0.12 + 0.88 * pow(clamp(dot(nO, palLs), 0.0, 1.0), 1.6);
      float foot = smoothstep(0.0, 0.2, vUv.y);
      float lit = palDab(palK);
      vec3 gc = palGlowCol(PAL_DAB_PAINT[palK]);
      palE = gc * lit * form * (0.35 + 0.65 * foot) * (1.0 + 0.6 * palCr) * 0.6;
      // and its ridges catch that light as a soft sheen, a little paler than the paint
      vec3 palVo = normalize(uEye - vPalP);
      float sh = pow(max(dot(reflect(-palVo, normalize(normal * 0.0 + nO)), palLs), 0.0), 18.0);
      palE += mix(gc, ${L('pale')}, 0.35) * lit * sh * 0.35 * (1.0 - palAge);
    } else if (palK == ${PAINT.mix}) {
      float al1;
      int s = palTopStroke(vObj.xz, al1);
      float g = palStroke(s, clamp(al1, 0.0, 1.1));
      palE = palRamp(0.3 + 0.7 * g) * g * (0.2 + 2.4 * smoothstep(0.15, 0.7, vCell.z));
    } else if (palK == ${PAINT.hot}) {
      palE = ${L('hot')} * palHair(0.0) * 0.8 * (0.35 + 0.65 * clamp(normalize(vPalN).y, 0.0, 1.0));
    } else if (palK == ${PAINT.knife}) {
      float g = 0.0; for (int s = 0; s < ${STROKES.length}; s++) g += palStroke(s, 0.9);
      palE = palRamp(0.4) * g * 0.35;
    }
    totalEmissiveRadiance += palE;
  }`,
  }, { bounce: true, rim: 0.6 }));
}

// The turned and the cut wood: the round's handle a near black lacquer worn through behind the ferrule, its end
// dipped in bronze; the knife's scales in old oiled walnut, polished by the palm, with the steel of the tang between
// them; the flat's handle a dark bronze lacquer, chipped. And the tape: a crepe paper gone a little yellow, written on.
function handleMaterial(u: Shared, satin = false): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.3, clearcoat: satin ? 0 : 1, clearcoatRoughness: 0.08, specularIntensity: satin ? 0.4 : 0.6 });
  m.name = satin ? 'paletteSatin' : 'paletteHandle';
  m.defines = { USE_UV: '' };
  m.envMapIntensity = 0.6;
  m.userData.uniforms = u;
  const endAt = BRUSH.hair + BRUSH.ferrule + BRUSH.handle;
  return shade(m, satin ? 'palette-satin' : 'palette-handle', partChunks({
    head: BUMP,
    color: /* glsl */ `
  int palH4 = int(vCell.x + 0.5);
  float palS = vUv.x, palWr = 0.0, palGr = 0.0, palTang = 0.0, palPaper = 0.0, palCoat = 1.0, palTorn = 0.0;
  vec3 palC;
  if (palH4 == 0) {
    vec3 palLq = ${L('bg-3', 0.85)} * 0.7 + ${L('text-3', 0.03)} * 0.3;
    float palHold = exp(-pow((palS - ${(BRUSH.hair + BRUSH.ferrule + 22).toFixed(1)}) / 18.0, 2.0));
    palWr = smoothstep(0.58, 0.7, wFbm(vec3(palS * 0.12, vUv.y * 9.0, 1.0)) + 0.32 * palHold);
    vec3 palBare = ${L('bronze-deep', 0.7)} * 0.6 + ${L('text-3', 0.28)} * 0.4;
    float palDip = smoothstep(${(endAt - 27).toFixed(1)}, ${(endAt - 26.4).toFixed(1)}, palS);
    palC = mix(palLq, palBare, palWr * 0.85);
    palC = mix(palC, ${L('bronze', 0.75)}, palDip);
  } else if (palH4 == 1) {
    palGr = wFbm(vec3(palS * 0.05, vUv.y * 6.0, 2.0)) + 0.25 * sin(vUv.y * 46.0 + palS * 0.06);
    vec3 palDk = ${L('bronze-deep', 0.42)} * 0.9 + ${L('text-3', 0.03)} * 0.1, palLt = ${L('bronze-deep', 1.3)} * 0.85 + ${L('text-3', 0.12)} * 0.15;
    palC = mix(palLt, palDk, smoothstep(0.42, 0.62, palGr));
    float palPalm = exp(-pow((palS - 40.0) / 22.0, 2.0)) * smoothstep(0.1, 0.6, sin(vUv.y * 6.2832));
    palWr = palPalm * (0.5 + 0.5 * wNoise(vObj * 0.3));
    palC = mix(palC, ${L('bronze-deep', 1.6)} * 0.6 + ${L('text-3', 0.35)} * 0.4, palWr * 0.6);
    palTang = 1.0 - smoothstep(0.035, 0.06, abs(sin(vUv.y * 6.2832)));
    palC = mix(palC, ${L('text', 0.1)}, palTang);
  } else if (palH4 == 2) {
    // The tape: crepe paper, its fine creases across its length, darker where the board's oil soaked in at its edge.
    palPaper = 1.0;
    palCoat = 0.0;
    float crepe = wNoise(vec3(vUv.x * 4.0, vUv.y * 110.0, 3.0));
    palC = ${L('text-3', 0.5)} * (0.88 + 0.16 * crepe) + ${L('bronze', 0.5)} * 0.35 + ${L('hot', 0.12)} * 0.2;
    palC *= 1.0 - 0.3 * smoothstep(0.35, 0.0, min(vUv.x, 1.0 - vUv.x)) * 0.5;
    palC = mix(palC, ${L('flame', 0.6)}, 0.25 * smoothstep(0.6, 0.8, wFbm(vec3(vObj.xz * 0.2, 4.0))));
    float pen = palArt(vObj.xz).r * step(0.0, vObj.y);
    palC = mix(palC, ${L('text-3', 0.16)}, pen * 0.85);
    palWr = pen;
    // The torn end, its fibres standing up and catching the light, and the two cut edges.
    float tw = max(0.012, fwidth(vUv.y) * 1.2), cw = max(0.012, fwidth(vUv.x) * 1.2);
    palTorn = (1.0 - smoothstep(0.0, tw, vUv.y - 0.004)) * (0.012 / tw) + 0.6 * (1.0 - smoothstep(0.0, cw, min(vUv.x, 1.0 - vUv.x))) * (0.012 / cw) * step(vObj.y, 0.5) * step(-0.5, vObj.y);
  } else {
    vec3 palLq = ${L('bronze-deep', 0.85)} * 0.85 + ${L('text-3', 0.03)} * 0.15;
    palWr = smoothstep(0.66, 0.74, wFbm(vec3(palS * 0.2, vUv.y * 8.0, 6.0)));
    palC = mix(palLq, ${L('bronze-deep', 1.4)} * 0.6 + ${L('text-3', 0.3)} * 0.4, palWr);
    palC = mix(palC, palAlbedo(6) * 0.7, smoothstep(0.8, 0.84, wNoise(vec3(palS * 0.25, vUv.y * 9.0, 8.0))) * smoothstep(60.0, 20.0, palS) * 0.8);
  }
  diffuseColor.rgb = palC;`,
    rough: 'roughnessFactor = palH4 == 2 ? (0.85 - 0.45 * palWr) : palH4 == 1 ? (0.42 - 0.12 * palWr + 0.3 * palTang * 0.0) : mix(0.22, 0.55, palWr);',
    metal: 'metalnessFactor = palTang * 0.9;',
    normal: '{ float h = palH4 == 2 ? 0.02 * wNoise(vec3(vUv.x * 4.0, vUv.y * 110.0, 3.0)) : palH4 == 1 ? -0.04 * smoothstep(0.4, 0.6, palGr) - 0.06 * palTang : palWr * 0.15; normal = palBump(normal, h, 1.0); }',
    emissive: /* glsl */ `
  { float sharp = palH4 == 1 ? 260.0 : 1300.0, k = palH4 == 1 ? 0.35 : palH4 == 2 ? 0.0 : 1.1 * (1.0 - palWr);
    totalEmissiveRadiance += ${L('pale')} * palTube(normal, sharp) * k + palEdgeLit(normalize(nonPerturbedNormal), palTorn) * 0.8; }`,
  }));
}

// The metal, by the cell's x: the round's ferrule a polished brass that is copper's neighbour; the knife's blade a
// thin bronze, brushed along its length; its neck spring steel, grey; its bolster copper; the dipper a brass worn
// bright on its rim and dark inside; the rivets and pins copper; the flat's ferrule a bronze.
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
  vec3 palC = palM == 0 ? ${L('copper-light', 0.8)} * 0.55 + ${L('bronze', 1.0)} * 0.45
    : palM == 1 ? ${L('bronze', 0.95)}
    : palM == 2 ? ${L('text', 0.2)} * 0.85 + ${L('bronze', 0.2)} * 0.15
    : palM == 3 ? ${L('copper', 0.85)}
    : palM == 4 ? ${L('copper-light', 0.72)} * 0.5 + ${L('bronze', 0.95)} * 0.5
    : palM == 5 ? ${L('copper', 0.95)}
    : ${L('bronze', 0.9)} * 0.7 + ${L('copper-light', 0.6)} * 0.3;
  float palBr = wNoise(vec3(vObj.x * 0.04 + vObj.z * 0.04, vObj.y * 20.0 + (vObj.x - vObj.z) * 4.0, 1.0));
  float palTn = smoothstep(0.55, 0.8, wFbm(vObj * 0.12 + 1.0));
  palTn *= palM == 3 || palM == 5 || palM == 6 ? 0.3 : 1.0;
  palC *= (0.92 + 0.14 * palBr) * (1.0 - 0.38 * palTn);
  diffuseColor.rgb = palC;`,
    rough: 'roughnessFactor = clamp((palM == 0 ? 0.16 : palM == 1 ? 0.3 : palM == 2 ? 0.34 : palM == 4 ? 0.2 : 0.26) + 0.12 * (palBr - 0.5) + 0.22 * palTn, 0.05, 1.0);',
    normal: /* glsl */ `
  { float px = length(fwidth(vObj)); float fine = 1.0 - smoothstep(0.08, 0.3, px);
    float h = palM == 1 || palM == 2 ? (palBr - 0.5) * 0.02 * fine : 0.0;
    normal = palBump(normal, h, 1.0); }`,
    emissive: /* glsl */ `
  { float r = clamp(roughnessFactor, 0.05, 1.0);
    totalEmissiveRadiance += diffuseColor.rgb * palTube(normal, 2.0 / (r * r * r) + 20.0) * 1.6;
    // Its crisp edges: a lip, a crimp, a rivet's rim, and the thin sides of the blade, the neck and the clip.
    vec3 nO = normalize(vPalN);
    float em = palCurveEdge(vPalN, vObj, 0.75, 2.4);
    if (palM == 1 || palM == 2) em = max(em, 1.0 - smoothstep(0.3, 0.7, abs(nO.y)));
    totalEmissiveRadiance += palEdgeLit(normalize(nonPerturbedNormal), em) * (palM == 2 ? vec3(1.0) : mix(vec3(1.0), diffuseColor.rgb * 2.2, 0.35)); }`,
  }));
}

// Sable: a red brown fibre, fine strands along the bundle, wet with paint over the half nearest the point, the line
// between ragged. The round is loaded with hot, the flat with copper.
function hairMaterial(u: Shared): THREE.MeshPhysicalMaterial {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.5, sheen: 0.6, sheenRoughness: 0.4, sheenColor: shadeOf('bronze', 0.6), clearcoat: 0.6, clearcoatRoughness: 0.15 });
  m.name = 'paletteHair';
  m.defines = { USE_UV: '' };
  m.userData.uniforms = u;
  return shade(m, 'palette-hair', partChunks({
    head: BUMP,
    color: /* glsl */ `
  float palFl = step(0.5, vCell.x);
  float palSs = clamp(vUv.x / mix(${BRUSH.hair.toFixed(1)}, ${FLAT.hair.len.toFixed(1)}, palFl), 0.0, 1.2);
  float palStr = wNoise(vec3(vUv.y * mix(140.0, 220.0, palFl), palSs * 2.0, 1.0));
  vec3 palSable = mix(${L('bronze-deep', 0.75)} * 0.7 + ${L('text-3', 0.1)} * 0.3, ${L('bronze', 0.55)}, smoothstep(0.3, 0.8, palStr));
  float palLoad = 1.0 - smoothstep(mix(0.5, 0.66, palFl), mix(0.62, 0.8, palFl), palSs + 0.08 * (wNoise(vec3(vUv.y * 18.0, 0.0, 3.0)) - 0.5));
  vec3 palPaint = mix(palAlbedo(3), palAlbedo(6), palFl) * (0.9 + 0.1 * palStr);
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
  const f0 = flatAxis(FLAT.hair.len + 5), f1 = flatAxis(FLAT.hair.len + FLAT.ferrule + FLAT.handle);
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
  a = max(a, (1.0 - smoothstep(1.0, 8.0, palSeg(p, ${v2(f0)}, ${v2(f1)}))) * 0.42 * uBrush * off);
  a = max(a, (1.0 - smoothstep(${(DIPPER.r - 2).toFixed(1)}, ${(DIPPER.r + 7).toFixed(1)}, length(p - ${v2(cupAt)}))) * 0.7 * uShadow);
  gl_FragColor = vec4(0.0, 0.0, 0.0, a);
}`,
  });
}
