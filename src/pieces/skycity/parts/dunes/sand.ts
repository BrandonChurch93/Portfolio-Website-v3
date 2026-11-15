import * as THREE from 'three';
import { slice } from '../../../../world/build';
import { DUNES, EDGE } from '../../layout';
import { type Ridge, SHEET, WIND, drift, fromCourt, fromPool, hollow, room, sheet, smooth } from './plan';

// The sand, as one surface: its height over the plain ground at every place, worked out from the dunes in the plan and
// laid on a fine fan of points across the wedge, before it is put on the dome. Each dune is its crest's line and a
// profile across it: a windward slope that rolls over to the crest, and a straight slip face at the angle sand comes
// to rest at, with a soft toe. Where dunes run into each other they are joined smoothly, as sand joins, and the sheet
// between them is joined the same way. Drawn as separate meshes they cut into each other in hard creases and read as
// folded paper. Every point carries where it is on the map, which face it is on and how high on its dune (sand): the
// shader works the sand out from them.

// How softly two dunes, or a dune and the sheet, run together, in units.
const JOIN = 5;
// How fast a stretch of crest falls away past its ends, and how many points of the crest make one stretch.
const ALONG = 0.04, STRIDE = 3;
// The height the shader counts as the top of a dune.
const HIGH = 70;
// How far the sand runs on in thin tongues past its own ground, and how deep they are at most.
const SPILL = { reach: 22, deep: 1.6 };
const tongue = (x: number, z: number): number => {
  const a = x * WIND[0] + z * WIND[1], b = -x * WIND[1] + z * WIND[0];
  return 0.5 + 0.35 * Math.sin(b * 0.21 + 2 * Math.sin(a * 0.05)) + 0.15 * Math.sin(b * 0.53 + a * 0.08);
};
// The fan of points: how far apart they are along a row in front, where the sand is seen, and behind the world's
// shoulder, where only the crests show over it, and across.
const FAN = { front: 2.3, back: 3.4, turn: 100, step: 2.3, from: 314, to: 566 };

interface Dune {
  // The crest, sampled: places, the way to its slip face, and its height at each.
  x: Float64Array; z: Float64Array; nx: Float64Array; nz: Float64Array; h: Float64Array;
  n: number; tall: number; wind: number; slope: number; sharp: number;
  box: [number, number, number, number];
  // Its stretches: where each starts, which way it runs and how long it is.
  sx: Float64Array; sz: Float64Array; tx: Float64Array; tz: Float64Array; sl: Float64Array; m: number;
}

const softMax0 = (a: number, c: number): number => 0.5 * (a + Math.sqrt(a * a + c * c));
const smax = (a: number, b: number, k: number): number => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.max(a, b) + h * h * k * 0.25; };

function dune(r: Ridge): Dune | null {
  if (r.pts.length < 2 || !r.pts.every(([x, z]) => Number.isFinite(x) && Number.isFinite(z))) return null;
  const curve = new THREE.CatmullRomCurve3(r.pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'centripetal');
  const len = curve.getLength(), back = r.back ?? 0, n = Math.max(8, Math.round(((1 + back) * len) / 2.5));
  const a = r.pts[0], b = r.pts[r.pts.length - 1];
  let cx = b[1] - a[1], cz = -(b[0] - a[0]);
  const cl = Math.hypot(cx, cz) || 1;
  cx /= cl; cz /= cl;
  const lee = r.lee ?? (cx * WIND[0] + cz * WIND[1] >= 0 ? 1 : -1);
  const m = Math.ceil(n / STRIDE), seg = () => new Float64Array(m);
  const d: Dune = { x: new Float64Array(n + 1), z: new Float64Array(n + 1), nx: new Float64Array(n + 1), nz: new Float64Array(n + 1), h: new Float64Array(n + 1), n, tall: r.tall, wind: r.wind, slope: Math.tan((r.slip * Math.PI) / 180), sharp: r.sharp, box: [1e9, 1e9, -1e9, -1e9], sx: seg(), sz: seg(), tx: seg(), tz: seg(), sl: seg(), m };
  const p = new THREE.Vector3(), t = new THREE.Vector3();
  for (let i = 0; i <= n; i++) {
    const s = Math.min(1, -back + ((1 + back) * i) / n);
    let H: number;
    if (s < 0) { H = r.tall * Math.max(0, 1 - (s / back) ** 2); curve.getPointAt(0, p); curve.getTangentAt(0, t); p.addScaledVector(t, s * len); }
    else {
      curve.getPointAt(s, p);
      curve.getTangentAt(s, t);
      if (r.peak <= 0) H = r.tall * (1 - s) ** 1.25;
      else H = r.tall * smooth(0, 0.22, s) * smooth(1, 0.78, s) * (1 - r.swell * (0.5 + 0.5 * Math.cos(2 * Math.PI * (s * 1.7 + r.tall * 0.07))));
    }
    d.x[i] = p.x; d.z[i] = p.z; d.nx[i] = lee * t.z; d.nz[i] = -lee * t.x; d.h[i] = H;
  }
  for (let k = 0; k < m; k++) {
    const i = k * STRIDE, j = Math.min(n, i + STRIDE), ex = d.x[j] - d.x[i], ez = d.z[j] - d.z[i], l = Math.hypot(ex, ez) || 1;
    d.sx[k] = d.x[i]; d.sz[k] = d.z[i]; d.tx[k] = ex / l; d.tz[k] = ez / l; d.sl[k] = l;
  }
  const reach = r.tall * Math.max(r.wind, 1.6) * 1.1 + 6;
  for (let i = 0; i <= n; i++) {
    d.box[0] = Math.min(d.box[0], d.x[i] - reach); d.box[1] = Math.min(d.box[1], d.z[i] - reach);
    d.box[2] = Math.max(d.box[2], d.x[i] + reach); d.box[3] = Math.max(d.box[3], d.z[i] + reach);
  }
  return d;
}

// A dune's height at a place, and how far to the lee of its crest it is. It is the
// highest of what each stretch of its crest would raise there: that stretch's profile across the crest, falling away
// past its ends. Taken from points of the crest and not stretches, it scalloped every slip face in grooves. Taken from
// the one nearest point of the crest, the height jumped wherever two bends of a snaking crest were equally near, and
// drew straight seams across the sand.
interface At { h: number; d: number; tall: number }
function profile(du: Dune, H: number, d: number): number {
  if (d >= 0) { const c = 0.22 * H + 1; return softMax0(H - du.slope * d, c) - (softMax0(H, c) - H); }
  const W = du.wind * Math.max(H, 0.6 * du.tall), u = -d / W, A = du.sharp;
  return u >= 1 ? 0 : H * (1 - A * u + (2 * A - 3) * u * u + (2 - A) * u * u * u);
}
function heightOf(du: Dune, x: number, z: number, out: At): number {
  let best = -Infinity, bd = 0;
  const far = Math.sqrt(du.tall / ALONG) + 2, wide = du.wind * du.tall + 2, lee = (du.tall / du.slope) * 2 + 8;
  for (let k = 0; k < du.m; k++) {
    const px = x - du.sx[k], pz = z - du.sz[k], tx = du.tx[k], tz = du.tz[k], l = du.sl[k], along = px * tx + pz * tz;
    const over = along < 0 ? -along : along > l ? along - l : 0;
    if (over > far) continue;
    const i = k * STRIDE, j = Math.min(du.n, i + STRIDE), q = Math.min(1, Math.max(0, along / l));
    const nx = du.nx[i] + (du.nx[j] - du.nx[i]) * q, nz = du.nz[i] + (du.nz[j] - du.nz[i]) * q, nl = Math.hypot(nx, nz) || 1;
    const d = ((px - tx * l * q) * nx + (pz - tz * l * q) * nz) / nl;
    if (d < -wide || d > lee) continue;
    const f = profile(du, du.h[i] + (du.h[j] - du.h[i]) * q, d) - ALONG * over * over;
    if (f > best) { best = f; bd = d; }
  }
  out.h = Math.max(0, best); out.d = bd; out.tall = du.tall;
  return out.h;
}

// How much of a dune may stand at a place: none in the court, the pool or outside the sand.
const keep = (x: number, z: number): number => room(x, z, 6) * smooth(0, 30, fromCourt(x, z)) * smooth(2, 30, fromPool(x, z));

// The height of the sand at a place, and what the shader needs to know of it: which face it is on, how high on its
// dune.
export class Field {
  private dunes: Dune[];
  private at: At = { h: 0, d: 0, tall: 1 };
  private own: At = { h: 0, d: 0, tall: 1 };
  side = 0; hf = 0;
  constructor(ridges: Ridge[]) { this.dunes = ridges.map(dune).filter((d): d is Dune => d !== null); }
  height(x: number, z: number): number {
    const base = sheet(x, z), k = keep(x, z);
    let top = -Infinity, joined = -Infinity;
    for (const du of this.dunes) {
      if (x < du.box[0] || x > du.box[2] || z < du.box[1] || z > du.box[3]) continue;
      const h = heightOf(du, x, z, this.at) * k;
      if (h > top) { top = h; Object.assign(this.own, this.at); }
      joined = joined === -Infinity ? h : smax(joined, h, JOIN);
    }
    let f = joined === -Infinity ? base : smax(base, joined, JOIN);
    f += drift(x, z);
    f = Math.min(f, hollow(x, z));
    f = SHEET.sink + (f - SHEET.sink) * room(x, z);
    // Past the sand's own ground it runs on over the paving and the bare rock in thin tongues the wind has laid.
    const out = room(x, z, -SPILL.reach);
    if (out > 0) f = Math.max(f, SPILL.deep * out * smooth(0.35, 0.75, tongue(x, z)) - 0.6);
    // Both change smoothly where a dune runs out into the sheet: a jump drew the grid's steps across the sand.
    this.side = top > -Infinity ? Math.sign(this.own.d) * smooth(0.5, 6, top - base) : 0;
    this.hf = Math.max(0, f) / HIGH;
    return Number.isFinite(f) ? f : SHEET.sink;
  }
}

// All of the sand as one mesh, flat on the map, and the field it was made from, for standing things in it.
export async function sand(ridges: Ridge[]): Promise<{ geometry: THREE.BufferGeometry; field: Field; tris: number }> {
  const field = new Field(ridges);
  const angles: number[] = [], rads: number[] = [];
  const mid = (430 * Math.PI) / 180;
  for (let b = DUNES.from - 8; b < FAN.turn; b += FAN.front / mid) angles.push(b);
  for (let b = FAN.turn; b <= DUNES.to + 8; b += FAN.back / mid) angles.push(b);
  for (let r = FAN.from; r <= FAN.to; r += FAN.step) rads.push(r);
  const w = rads.length, n = angles.length * w;
  const pos = new Float32Array(n * 3), attr = new Float32Array(n * 4), live = new Uint8Array(n);
  let v = 0;
  for (const b of angles) {
    const s = Math.sin((b * Math.PI) / 180), c = Math.cos((b * Math.PI) / 180), edge = EDGE.at(((b % 360) + 360) % 360) - 8;
    for (const r0 of rads) {
      const r = Math.min(r0, edge), x = s * r, z = c * r, h = field.height(x, z);
      pos[v * 3] = x; pos[v * 3 + 1] = h; pos[v * 3 + 2] = z;
      attr[v * 4] = x; attr[v * 4 + 1] = z; attr[v * 4 + 2] = field.side; attr[v * 4 + 3] = field.hf;
      live[v] = room(x, z, -SPILL.reach) > 0 ? 1 : 0;
      v++;
    }
    await slice();
  }
  const index: number[] = [];
  const y = (i: number) => pos[i * 3 + 1];
  for (let i = 0; i < angles.length - 1; i++) {
    for (let j = 0; j < w - 1; j++) {
      const a0 = i * w + j, a1 = a0 + 1, b0 = a0 + w, b1 = b0 + 1;
      if (!(live[a0] || live[a1] || live[b0] || live[b1])) continue;
      // Each cell is cut along the diagonal whose ends are nearest in height, which keeps a crest across it whole.
      if (Math.abs(y(a0) - y(b1)) > Math.abs(y(a1) - y(b0))) index.push(a0, a1, b0, a1, b1, b0);
      else index.push(a0, a1, b1, a0, b1, b0);
    }
  }
  // Every face of a field of sand looks up: a triangle laid the other way round is turned over.
  for (let t = 0; t < index.length; t += 3) {
    const a = index[t] * 3, b = index[t + 1] * 3, c = index[t + 2] * 3;
    const ux = pos[b] - pos[a], uz = pos[b + 2] - pos[a + 2], vx = pos[c] - pos[a], vz = pos[c + 2] - pos[a + 2];
    if (uz * vx - ux * vz < 0) { const k = index[t + 1]; index[t + 1] = index[t + 2]; index[t + 2] = k; }
  }
  await slice();
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('sand', new THREE.Float32BufferAttribute(attr, 4));
  g.setIndex(index);
  g.computeVertexNormals();
  // How level the sand lies at each point, before it is laid on the dome: ripples only form where it is gentle.
  const nrm = g.getAttribute('normal'), lev = new Float32Array(n);
  for (let i = 0; i < n; i++) lev[i] = nrm.getY(i);
  g.setAttribute('level', new THREE.Float32BufferAttribute(lev, 1));
  await slice();
  return { geometry: g, field, tris: index.length / 3 };
}
