import * as THREE from 'three';
import { pause, seeded } from '../../world/build';
import {
  BOARD, BUNDLES, CAP, CHOKE, DBG, EPS, FAN, FRAME, HOLE, HOLES, LED, MOS, PHASES, QFN, QFP, RUN, SMALLS, SMALL_SIZE, SOCKET, SOIC, U44, XTAL,
  toWorld, type P2,
} from './layout';

// What is printed and etched on the processor and its board, drawn once on 2D canvases in millimetres and handed to
// the shaders as textures. Nothing here is a picture of a part: the parts are geometry, and these are the copper,
// ink and laser marks on their faces.

export const MONO = '"JetBrains Mono Variable", "JetBrains Mono", ui-monospace, Menlo, monospace';
export const SANS = '"Sora Variable", "Sora", system-ui, sans-serif';

const H = BOARD.half;
type Ctx = CanvasRenderingContext2D & { letterSpacing: string };

function sheet(px: number, mm: number, x0: number, z0: number): { c: HTMLCanvasElement; g: Ctx } {
  const c = document.createElement('canvas');
  c.width = c.height = px;
  const g = c.getContext('2d', { willReadFrequently: true }) as Ctx;
  const s = px / mm;
  g.setTransform(s, 0, 0, s, -x0 * s, -z0 * s);
  g.fillStyle = '#fff';
  g.strokeStyle = '#fff';
  return { c, g };
}

// A polyline moved sideways by d, with mitred corners.
function offset(path: P2[], d: number): P2[] {
  const n = path.length;
  const nrm = (a: P2, b: P2): P2 => { const dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1; return [-dz / l, dx / l]; };
  return path.map((p, i) => {
    if (i === 0) { const m = nrm(p, path[1]); return [p[0] + m[0] * d, p[1] + m[1] * d]; }
    if (i === n - 1) { const m = nrm(path[i - 1], p); return [p[0] + m[0] * d, p[1] + m[1] * d]; }
    const a = nrm(path[i - 1], p), b = nrm(p, path[i + 1]);
    const mx = a[0] + b[0], mz = a[1] + b[1], ml = Math.hypot(mx, mz) || 1;
    const k = d / ((mx / ml) * a[0] + (mz / ml) * a[1]);
    return [p[0] + (mx / ml) * k, p[1] + (mz / ml) * k];
  });
}

const line = (g: Ctx, pts: P2[]) => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); };
const disc = (g: Ctx, x: number, z: number, r: number) => { g.beginPath(); g.arc(x, z, r, 0, Math.PI * 2); g.fill(); };
const ring = (g: Ctx, x: number, z: number, r: number, w: number) => { g.lineWidth = w; g.beginPath(); g.arc(x, z, r, 0, Math.PI * 2); g.stroke(); };
const rect = (g: Ctx, cx: number, cz: number, w: number, d: number) => g.fillRect(cx - w / 2, cz - d / 2, w, d);
function text(g: Ctx, s: string, x: number, z: number, size: number, o: { align?: CanvasTextAlign; font?: string; weight?: number; turn?: number; space?: number } = {}) {
  g.save();
  g.translate(x, z);
  if (o.turn) g.rotate(o.turn);
  g.font = `${o.weight ?? 600} ${size}px ${o.font ?? MONO}`;
  g.letterSpacing = `${(o.space ?? 0.04) * size}px`;
  g.textAlign = o.align ?? 'left';
  g.textBaseline = 'middle';
  g.fillText(s, 0, 0);
  g.restore();
}

// Where each small part is, with which run it belongs to.
export interface SmallAt { x: number; z: number; kind: keyof typeof SMALL_SIZE; turn: boolean; group: number }
export function smallParts(): SmallAt[] {
  const out: SmallAt[] = [];
  SMALLS.forEach((runs, group) => {
    for (const r of runs) for (let j = 0; j < r.nz; j++) for (let i = 0; i < r.nx; i++) out.push({ x: r.x + i * r.dx, z: r.z + j * r.dz, kind: r.kind, turn: !!r.turn, group });
  });
  return out;
}

// A trace bundle's traces, each with its distance along from where it starts.
interface Trace { pts: P2[]; d: number[] }
function traces(): Trace[][] {
  const r = seeded(77);
  return BUNDLES.map((b) => Array.from({ length: b.n }, (_, i) => {
    const pts = offset(b.path, (i - (b.n - 1) / 2) * b.pitch);
    // A trace's light leaves a little ahead of or behind its neighbours: a bus skews.
    let acc = r() * 0.7;
    const d = pts.map((p, k) => (k ? (acc += Math.hypot(p[0] - pts[k - 1][0], p[1] - pts[k - 1][1])) : acc));
    return { pts, d };
  }));
}

// The pads each part sits on, as exposed copper: [cx, cz, w, d].
function pads(): [number, number, number, number][] {
  const out: [number, number, number, number][] = [];
  const turned = (x: number, z: number, w: number, d: number, dx: number, dz: number, turn: number): [number, number, number, number] =>
    turn ? [x - dz, z + dx, d, w] : [x + dx, z + dz, w, d];
  for (const ph of PHASES) {
    const [cx, cz] = ph.choke;
    for (const s of [-1, 1]) out.push(turned(cx, cz, 2.6, 6.6, s * (CHOKE.w / 2 + 0.15), 0, ph.turn));
    const [mx, mz] = ph.mos;
    for (let k = 0; k < 4; k++) out.push(turned(mx, mz, 0.45, 0.9, -1.8 + k * 1.2, MOS.d / 2 + 0.25, ph.turn));
    out.push(turned(mx, mz, MOS.w - 0.6, 1.0, 0, -MOS.d / 2 - 0.1, ph.turn));
    const [px, pz] = ph.cap;
    for (const s of [-1, 1]) out.push(turned(px, pz, 1.6, 2.4, 0, s * (CAP.r + 0.2), ph.turn ? 0 : 1));
  }
  for (const p of smallParts()) {
    const [w, , d] = SMALL_SIZE[p.kind];
    const pw = w * 0.32, pd = d * 1.15;
    for (const s of [-1, 1]) out.push(p.turn ? [p.x, p.z + s * (w / 2 - pw / 2 + 0.12), pd, pw] : [p.x + s * (w / 2 - pw / 2 + 0.12), p.z, pw, pd]);
  }
  // Lead pads round the chips.
  for (let side = 0; side < 4; side++) for (let i = 0; i < 12; i++) {
    const a = -2.75 + i * 0.5, o = QFP.w / 2 + 0.9;
    const [dx, dz] = side === 0 ? [a, -o] : side === 1 ? [o, a] : side === 2 ? [-a, o] : [-o, -a];
    out.push(side % 2 === 0 ? [QFP.x + dx, QFP.z + dz, 0.26, 1.4] : [QFP.x + dx, QFP.z + dz, 1.4, 0.26]);
  }
  for (let side = 0; side < 4; side++) for (let i = 0; i < 10; i++) {
    const a = -2.25 + i * 0.5, o = QFN.w / 2;
    const [dx, dz] = side === 0 ? [a, -o] : side === 1 ? [o, a] : side === 2 ? [-a, o] : [-o, -a];
    out.push(side % 2 === 0 ? [QFN.x + dx, QFN.z + dz, 0.25, 0.7] : [QFN.x + dx, QFN.z + dz, 0.7, 0.25]);
  }
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) out.push([SOIC.x - 1.905 + i * 1.27, SOIC.z + s * 2.75, 0.6, 1.5]);
  for (const s of [-1, 1]) out.push([LED.x + s * 0.75, LED.z, 0.7, 0.9]);
  for (let side = 0; side < 4; side++) for (let i = 0; i < 12; i++) {
    const a = -2.75 + i * 0.5, o = U44.w / 2;
    const [dx, dz] = side === 0 ? [a, -o] : side === 1 ? [o, a] : side === 2 ? [-a, o] : [-o, -a];
    out.push(side % 2 === 0 ? [U44.x + dx, U44.z + dz, 0.25, 0.7] : [U44.x + dx, U44.z + dz, 0.7, 0.25]);
  }
  out.push([U44.x, U44.z, 3.8, 3.8]);
  for (const s of [-1, 1]) out.push([XTAL.x + s * 1.5, XTAL.z, 1.4, 2.6]);
  return out;
}

// Footprints that shade the board round a part, for its contact darkening: [cx, cz, w, d, round].
function footprints(): [number, number, number, number, boolean][] {
  const out: [number, number, number, number, boolean][] = [];
  for (const ph of PHASES) {
    out.push([...ph.choke, CHOKE.w + 0.4, CHOKE.w + 0.4, false]);
    out.push([...ph.cap, CAP.r * 2 + 0.4, CAP.r * 2 + 0.4, true]);
    out.push([...ph.mos, ph.turn ? MOS.d : MOS.w, ph.turn ? MOS.w : MOS.d, false]);
  }
  out.push([EPS.x, EPS.z, EPS.w, EPS.d, false]);
  out.push([FAN.x, FAN.z, 10.4, 5.8, false]);
  out.push([QFP.x, QFP.z, QFP.w, QFP.w, false], [QFN.x, QFN.z, QFN.w, QFN.w, false], [SOIC.x, SOIC.z, 4.9, 3.9, false]);
  out.push([U44.x, U44.z, U44.w, U44.w, false], [XTAL.x, XTAL.z, XTAL.w, XTAL.d, false], [DBG.x, DBG.z, DBG.n * DBG.pitch + 0.4, DBG.pitch * 2 + 0.4, false]);
  const [sx, sz] = [SOCKET.x, SOCKET.z];
  out.push([sx, sz, FRAME.out[0] * 2, FRAME.out[1] * 2, false]);
  return out;
}

export interface BoardArt {
  // r: copper under the mask, g: silkscreen ink, b: exposed copper.
  art: THREE.DataTexture;
  // r: a traced bundle's coverage, g: that times its distance along, b: that times its bundle's number. a: how dark
  // the board is round the parts, for contact darkening.
  pulse: THREE.DataTexture;
}

const ART_PX = 2048;
export const PULSE_PX = 1024;
const OCC_PX = 256;

function readAlpha(c: HTMLCanvasElement): Uint8ClampedArray {
  const d = c.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, c.width, c.height).data;
  const out = new Uint8ClampedArray(c.width * c.height);
  for (let i = 0, j = 3; i < out.length; i++, j += 4) out[i] = d[j];
  return out;
}

function dataTexture(data: Uint8Array, px: number): THREE.DataTexture {
  const t = new THREE.DataTexture(data, px, px, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.colorSpace = THREE.NoColorSpace;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

export async function boardArt(): Promise<BoardArt> {
  const span = BOARD.half * 2;
  const rnd = seeded(31);
  const T = traces();

  // ---- copper under the mask: power planes cut into islands, the bundles, stubs and tented vias ----
  const cu = sheet(ART_PX, span, -H, -H);
  {
    const g = cu.g;
    const plane = (x0: number, z0: number, x1: number, z1: number, islands: [number, number, number, number][]) => {
      g.globalAlpha = 0.5;
      g.fillRect(x0, z0, x1 - x0, z1 - z0);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'destination-out';
      for (const [cx, cz, w, d] of islands) rect(g, cx, cz, w + 0.9, d + 0.9);
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = 0.62;
      for (const [cx, cz, w, d] of islands) rect(g, cx, cz, w, d);
      g.globalAlpha = 1;
    };
    const top = PHASES.filter((p) => !p.turn), left = PHASES.filter((p) => p.turn);
    plane(-27.6, -48.4, 39.2, -28.4, top.map((p) => [p.choke[0], -36.6, 6.4, 12.4]));
    plane(-48.4, -27.6, -29.0, 29.8, left.map((p) => [-37.4, p.choke[1], 12.0, 6.4]));
    // Stitching vias through the planes, cut back to show the drill under the mask.
    const via = (x: number, z: number, r = 0.34) => { disc(g, x, z, r); g.globalCompositeOperation = 'destination-out'; disc(g, x, z, r * 0.45); g.globalCompositeOperation = 'source-over'; };
    for (let x = -26; x < 38; x += 2.35) for (const z of [-47.2, -29.4]) via(x + (rnd() - 0.5) * 0.4, z);
    for (let z = -26; z < 29; z += 2.35) for (const x of [-47.3, -30.0]) via(x, z + (rnd() - 0.5) * 0.4);
    // The bundles.
    g.lineJoin = 'miter';
    g.lineCap = 'butt';
    BUNDLES.forEach((b, bi) => { g.lineWidth = b.w; for (const t of T[bi]) { line(g, t.pts); g.stroke(); } });
    // Short runs from the small parts to vias, and fan out vias beside the bundles.
    g.lineWidth = 0.13;
    for (const p of smallParts()) {
      const [w] = SMALL_SIZE[p.kind];
      const s = rnd() < 0.5 ? -1 : 1, l = 1.0 + rnd() * 0.8;
      const [ax, az] = p.turn ? [p.x, p.z + s * w * 0.4] : [p.x + s * w * 0.4, p.z];
      const [bx, bz] = p.turn ? [ax + (rnd() < 0.5 ? -l : l), az] : [ax, az + (rnd() < 0.5 ? -l : l)];
      line(g, [[ax, az], [bx, bz]]); g.stroke();
      via(bx, bz, 0.3);
    }
    BUNDLES.forEach((b) => {
      const [p0, p1] = b.path;
      const dx = Math.sign(p1[0] - p0[0]), dz = Math.sign(p1[1] - p0[1]);
      const half = ((b.n - 1) / 2) * b.pitch + 0.9;
      for (let k = 0; k < 6; k++) {
        const along = 2.4 + (k % 2) * 0.8, side = (k < 3 ? -1 : 1) * (half + (k % 3) * 0.75);
        via(p0[0] + dx * along + dz * side, p0[1] + dz * along + dx * side, 0.3);
      }
    });
    // Two serpentines matching lengths, in front of the socket.
    g.lineWidth = 0.14;
    for (let j = 0; j < 2; j++) {
      const pts: P2[] = [[21.2 + j * 0.5, 36.2]];
      for (let k = 0; k < 6; k++) { const z = 36.8 + k * 0.9; pts.push([21.2 + j * 0.5, z], [23.6 + j * 0.5, z], [23.6 + j * 0.5, z + 0.45], [21.2 + j * 0.5, z + 0.45]); }
      pts.push([21.2 + j * 0.5, 54.0]);
      line(g, pts); g.stroke();
    }
  }
  await pause();

  // ---- exposed copper: pads, test points, fiducials, the plated holes' rings ----
  const ex = sheet(ART_PX, span, -H, -H);
  {
    const g = ex.g;
    for (const [cx, cz, w, d] of pads()) rect(g, cx, cz, w, d);
    for (const [hx, hz] of HOLES) {
      disc(g, hx, hz, HOLE.ring);
      g.globalCompositeOperation = 'destination-out';
      disc(g, hx, hz, HOLE.r + 0.05);
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + Math.PI / 8; disc(g, hx + Math.cos(a) * 2.7, hz + Math.sin(a) * 2.7, 0.2); }
      g.globalCompositeOperation = 'source-over';
    }
    for (const [x, z] of [[-24, 38.4], [18.6, 53.2], [52.6, -6.2], [36.4, 52.2], [-48.4, 33.2], [53.4, 27.6], [27.6, 50.6], [42.2, 38.2], [20.8, 41.8]] as P2[]) disc(g, x, z, 0.55);
    for (const [x, z] of [[-52.2, 52.2], [52.2, -27.8]] as P2[]) disc(g, x, z, 0.5);
  }
  await pause();

  // ---- silkscreen ----
  const sk = sheet(ART_PX, span, -H, -H);
  {
    const g = sk.g;
    g.lineWidth = 0.13;
    const corners = (cx: number, cz: number, w: number, d: number, l = 1.1) => {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const x = cx + (sx * w) / 2, z = cz + (sz * d) / 2;
        line(g, [[x - sx * l, z], [x, z], [x, z - sz * l]]); g.stroke();
      }
    };
    PHASES.forEach((ph, i) => {
      const [cx, cz] = ph.choke;
      corners(cx, cz, CHOKE.w + 1.1, CHOKE.w + 1.1);
      const [px, pz] = ph.cap, rr = CAP.r + 0.55;
      // The capacitor's outline with its chamfered side and the plus.
      g.beginPath();
      const chamf = 1.2;
      const pts: P2[] = ph.turn
        ? [[px - rr, pz - rr], [px + rr - chamf, pz - rr], [px + rr, pz - rr + chamf], [px + rr, pz + rr - chamf], [px + rr - chamf, pz + rr], [px - rr, pz + rr]]
        : [[px - rr, pz - rr], [px + rr, pz - rr], [px + rr, pz + rr - chamf], [px + rr - chamf, pz + rr], [px - rr + chamf, pz + rr], [px - rr, pz + rr - chamf]];
      line(g, pts); g.closePath(); g.stroke();
      const plus: P2 = ph.turn ? [px + rr + 0.9, pz + rr - 0.5] : [px + rr - 0.6, pz + rr + 0.9];
      g.lineWidth = 0.14;
      line(g, [[plus[0] - 0.4, plus[1]], [plus[0] + 0.4, plus[1]]]); g.stroke();
      line(g, [[plus[0], plus[1] - 0.4], [plus[0], plus[1] + 0.4]]); g.stroke();
      g.lineWidth = 0.13;
      const [mx, mz] = ph.mos;
      if (ph.turn) {
        text(g, `PL${i + 1}`, cx + 5.0, cz + 2.4, 0.85, { turn: -Math.PI / 2 });
        text(g, `PC${101 + i}`, px + 4.0, pz + 2.6, 0.75, { turn: -Math.PI / 2 });
        text(g, `PQ${i + 1}`, mx + 3.3, mz + 2.2, 0.75, { turn: -Math.PI / 2 });
        disc(g, mx + 3.1, mz - 3.0, 0.22);
      } else {
        text(g, `PL${i + 1}`, cx - 2.4, cz + 4.5, 0.85);
        text(g, `PC${101 + i}`, px + 4.75, pz, 0.7, { turn: -Math.PI / 2, align: 'center' });
        text(g, `PQ${i + 1}`, mx - 2.4, mz + 3.25, 0.75);
        disc(g, mx - 3.1, mz + 3.1, 0.22);
      }
    });
    // The power header: outline, its name, pin one.
    g.strokeRect(EPS.x - EPS.w / 2 - 0.4, EPS.z - EPS.d / 2 - 0.4, EPS.w + 0.8, EPS.d + 0.8);
    text(g, 'CPU_PWR1', EPS.x - EPS.w / 2, EPS.z + EPS.d / 2 + 1.25, 1.0, { weight: 700 });
    g.beginPath(); g.moveTo(EPS.x + EPS.w / 2 + 0.7, EPS.z + 2.6); g.lineTo(EPS.x + EPS.w / 2 + 1.6, EPS.z + 3.1); g.lineTo(EPS.x + EPS.w / 2 + 0.7, EPS.z + 3.6); g.fill();
    // The fan header.
    g.strokeRect(FAN.x - 5.6, FAN.z - 3.3, 11.2, 6.6);
    text(g, 'CPU_FAN', FAN.x - 5.6, FAN.z - 4.4, 0.95, { weight: 700 });
    text(g, '1', FAN.x - 6.6, FAN.z + 1.2, 0.8);
    // Chips.
    corners(QFP.x, QFP.z, QFP.w + 3.4, QFP.w + 3.4, 1.4);
    disc(g, QFP.x - QFP.w / 2 - 1.9, QFP.z - QFP.w / 2 - 1.3, 0.3);
    text(g, 'U41', QFP.x - 5.6, QFP.z + 6.3, 0.85);
    corners(QFN.x, QFN.z, QFN.w + 1.6, QFN.w + 1.6, 0.9);
    disc(g, QFN.x - QFN.w / 2 - 1.2, QFN.z - QFN.w / 2 - 0.6, 0.25);
    text(g, 'PU1', QFN.x + 3.6, QFN.z - 1.8, 0.8);
    g.strokeRect(SOIC.x - 2.9, SOIC.z - 2.2, 5.8, 4.4);
    disc(g, SOIC.x - 3.5, SOIC.z + 3.0, 0.25);
    text(g, 'U12', SOIC.x + 3.4, SOIC.z, 0.8);
    text(g, 'PWR', LED.x + 1.6, LED.z, 0.8, { weight: 700 });
    text(g, 'D3', LED.x - 2.9, LED.z, 0.7);
    corners(U44.x, U44.z, U44.w + 1.8, U44.w + 1.8, 1.0);
    disc(g, U44.x - U44.w / 2 - 1.3, U44.z - U44.w / 2 - 0.7, 0.26);
    text(g, 'U44', U44.x + 4.4, U44.z - 2.4, 0.8);
    g.fillRect(U44.x - 3.6, U44.z - 6.2, 7.2, 1.3);
    g.strokeRect(XTAL.x - XTAL.w / 2 - 0.5, XTAL.z - XTAL.d / 2 - 0.5, XTAL.w + 1, XTAL.d + 1);
    text(g, 'Y1', XTAL.x - XTAL.w / 2 - 0.4, XTAL.z - XTAL.d / 2 - 1.3, 0.8);
    text(g, '25.000', XTAL.x + 0.2, XTAL.z + XTAL.d / 2 + 1.3, 0.62, { align: 'center' });
    g.strokeRect(DBG.x - DBG.n * DBG.pitch / 2 - 0.7, DBG.z - DBG.pitch - 0.7, DBG.n * DBG.pitch + 1.4, DBG.pitch * 2 + 1.4);
    text(g, 'J9', DBG.x - DBG.n * DBG.pitch / 2 - 0.6, DBG.z + DBG.pitch + 1.6, 0.8, { weight: 700 });
    text(g, 'DBG', DBG.x + 1.6, DBG.z + DBG.pitch + 1.6, 0.7);
    g.beginPath(); g.moveTo(DBG.x - DBG.n * DBG.pitch / 2 - 1.6, DBG.z - 1.0); g.lineTo(DBG.x - DBG.n * DBG.pitch / 2 - 1.0, DBG.z - 0.5); g.lineTo(DBG.x - DBG.n * DBG.pitch / 2 - 1.6, DBG.z); g.fill();
    g.fillRect(44.2, 47.6 - 0.65, 5.2, 1.3);
    // The socket's name, the holes' keep out rings, the small parts' runs.
    text(g, 'SKT1', 38.4, -23.4, 1.05, { weight: 700 });
    for (const [hx, hz] of HOLES) {
      g.setLineDash([0.5, 0.42]);
      ring(g, hx, hz, HOLE.ring + 1.0, 0.13);
      g.setLineDash([]);
    }
    const names = ['R2', 'C3', 'C4', 'C5', 'C6', 'C7', 'R8', 'C9', 'C1', 'C2'];
    SMALLS.forEach((runs, i) => {
      const r = runs[0];
      if (r.turn) text(g, `${names[i]}41`, r.x + 1.3, r.z - 1.6, 0.7, { turn: -Math.PI / 2 });
      else if (r.z < -50) text(g, `${names[i]}${60 + i}`, r.x - 0.5, r.z + 1.35, 0.7);
      else text(g, `${names[i]}${12 + i * 7}`, r.x - 0.5, r.z - 1.25, 0.7);
    });
    // The board's own marks: a part number, a date code, a rating, test points, an arrow for the bundles' way out.
    text(g, 'MB-K9C  R1.02', -41.6, 54.1, 1.15, { weight: 700, space: 0.08 });
    text(g, '2611  94V-0', 40.4, 28.6, 0.8);
    text(g, 'E461207', 40.4, 29.9, 0.7);
    for (const [x, z, s] of [[-24, 38.4, 'TP3'], [18.6, 53.2, 'TP7'], [52.6, -6.2, 'TP9'], [36.4, 52.2, 'TP12'], [-48.4, 33.2, 'TP2'], [53.4, 27.6, 'TP14'], [27.6, 50.6, 'TP15'], [42.2, 38.2, 'TP16'], [20.8, 41.8, 'TP17']] as [number, number, string][]) {
      ring(g, x, z, 0.95, 0.12);
      text(g, s, x + (x > 50 ? -1.6 : 1.4), z + (x > 50 ? 1.7 : 0), 0.62, { align: x > 50 ? 'right' : 'left' });
    }
    // The socket's corner marks round the frame, and a triangle at its first corner.
    const fx = SOCKET.x, fz = SOCKET.z;
    corners(fx, fz, FRAME.out[0] * 2 + 1.4, FRAME.out[1] * 2 + 1.4, 2.2);
    g.beginPath(); g.moveTo(fx - FRAME.out[0] - 1.6, fz - FRAME.out[1] - 0.4); g.lineTo(fx - FRAME.out[0] - 0.6, fz - FRAME.out[1] - 0.4); g.lineTo(fx - FRAME.out[0] - 1.6, fz - FRAME.out[1] + 0.6); g.fill();
  }
  await pause();

  // ---- the board texture ----
  const art = new Uint8Array(ART_PX * ART_PX * 4);
  {
    const r = readAlpha(cu.c), gch = readAlpha(sk.c), b = readAlpha(ex.c);
    for (let i = 0, j = 0; i < r.length; i++, j += 4) { art[j] = r[i]; art[j + 1] = gch[i]; art[j + 2] = b[i]; art[j + 3] = 255; }
  }
  await pause();

  // ---- the bundles again, for the light that runs along them ----
  const pul = document.createElement('canvas');
  pul.width = pul.height = PULSE_PX;
  {
    const g = pul.getContext('2d', { willReadFrequently: true }) as Ctx;
    g.fillStyle = '#000';
    g.fillRect(0, 0, PULSE_PX, PULSE_PX);
    const s = PULSE_PX / span;
    g.setTransform(s, 0, 0, s, H * s, H * s);
    g.lineCap = 'butt';
    g.lineJoin = 'miter';
    BUNDLES.forEach((b, bi) => {
      g.lineWidth = b.pitch * 1.02;
      T[bi].forEach((t, ti) => {
      // Each trace's number, so its light can run on its own: sixteen to a bundle, two levels apart.
      const id = (bi * 16 + ti) * 2;
      for (let k = 1; k < t.pts.length; k++) {
        const [a, c] = [t.pts[k - 1], t.pts[k]];
        const d0 = Math.min(1, t.d[k - 1] / RUN), d1 = Math.min(1, t.d[k] / RUN);
        const grad = g.createLinearGradient(a[0], a[1], c[0], c[1]);
        grad.addColorStop(0, `rgb(255,${Math.round(d0 * 255)},${id})`);
        grad.addColorStop(1, `rgb(255,${Math.round(d1 * 255)},${id})`);
        g.strokeStyle = grad;
        line(g, [a, c]); g.stroke();
      }
      });
    });
  }
  await pause();

  // ---- contact darkening round the parts, blurred ----
  const occ = sheet(OCC_PX, span, -H, -H);
  for (const [cx, cz, w, d, round] of footprints()) {
    if (round) disc(occ.g, cx, cz, w / 2);
    else rect(occ.g, cx, cz, w, d);
  }
  const o = readAlpha(occ.c);
  {
    const tmp = new Float32Array(o.length), src = new Float32Array(o);
    const R = 3;
    for (let pass = 0; pass < 3; pass++) {
      for (let y = 0; y < OCC_PX; y++) for (let x = 0; x < OCC_PX; x++) {
        let s = 0, n = 0;
        for (let k = -R; k <= R; k++) { const xx = x + k; if (xx >= 0 && xx < OCC_PX) { s += src[y * OCC_PX + xx]; n++; } }
        tmp[y * OCC_PX + x] = s / n;
      }
      for (let y = 0; y < OCC_PX; y++) for (let x = 0; x < OCC_PX; x++) {
        let s = 0, n = 0;
        for (let k = -R; k <= R; k++) { const yy = y + k; if (yy >= 0 && yy < OCC_PX) { s += tmp[yy * OCC_PX + x]; n++; } }
        src[y * OCC_PX + x] = s / n;
      }
    }
    o.set(src);
  }
  const pulse = new Uint8Array(PULSE_PX * PULSE_PX * 4);
  {
    const d = pul.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, PULSE_PX, PULSE_PX).data;
    const k = OCC_PX / PULSE_PX;
    for (let y = 0; y < PULSE_PX; y++) for (let x = 0; x < PULSE_PX; x++) {
      const j = (y * PULSE_PX + x) * 4;
      pulse[j] = d[j]; pulse[j + 1] = d[j + 1]; pulse[j + 2] = d[j + 2];
      const ox = Math.min(OCC_PX - 1, Math.floor(x * k)), oy = Math.min(OCC_PX - 1, Math.floor(y * k));
      pulse[j + 3] = o[oy * OCC_PX + ox];
    }
  }
  return { art: dataTexture(art, ART_PX), pulse: dataTexture(pulse, PULSE_PX) };
}

// The laser marking on the lid: codes, a serial and a data matrix, white on black, over a square 34 mm across
// centered on the lid.
export const ETCH_MM = 34;
export function lidEtch(): THREE.CanvasTexture {
  const px = 2048;
  const { c, g } = sheet(px, ETCH_MM, -ETCH_MM / 2, -ETCH_MM / 2);
  g.fillStyle = '#000';
  g.fillRect(-ETCH_MM / 2, -ETCH_MM / 2, ETCH_MM, ETCH_MM);
  g.fillStyle = '#fff';
  const x0 = -13.4;
  text(g, 'QX9', x0, -8.6, 3.2, { font: SANS, weight: 600, space: 0.06 });
  text(g, '7480K', x0 + 8.3, -8.6, 3.2, { font: SANS, weight: 300, space: 0.04 });
  text(g, 'L5N1  4.80GHZ', x0, -3.9, 1.55, { weight: 500, space: 0.1 });
  text(g, 'X7Q20Q  M2611', x0, -1.3, 1.55, { weight: 500, space: 0.1 });
  text(g, 'J4Z81-0372', x0, 1.3, 1.55, { weight: 500, space: 0.1 });
  text(g, 'K9 · 24C  · 125W', x0, 5.6, 1.15, { weight: 500, space: 0.12 });
  // The matrix: a solid L on two sides, a broken one on the others, and modules from a seed.
  const r = seeded(9021), n = 14, m = 0.36, mx = 6.2, mz = -1.0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const edge = i === 0 || j === n - 1;
    const clock = (j === 0 && i % 2 === 0) || (i === n - 1 && j % 2 === 1);
    const on = edge || clock || (i > 0 && j > 0 && i < n - 1 && j < n - 1 && r() < 0.5);
    if (on) g.fillRect(mx + i * m, mz + j * m, m * 1.02, m * 1.02);
  }
  // Two rules framing the codes, as the etch on a real lid has.
  g.fillRect(x0, -6.25, 25.8, 0.12);
  g.fillRect(x0, 3.55, 25.8, 0.12);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 8;
  t.flipY = false;
  return t;
}

// Ink on the tops of parts: a sheet of 8 by 8 cells. Red is pale ink, green is a dark mark (a vent, a dimple).
export const PRINT = { cells: 8, px: 1024 } as const;
export type PrintCell = 'choke' | 'choke2' | 'cap' | 'mos' | 'qfp' | 'qfn' | 'soic' | 'res' | 'eps' | 'u44' | 'xtal';
const CELL: Record<PrintCell, number> = { choke: 1, choke2: 2, cap: 3, mos: 4, qfp: 5, qfn: 6, soic: 7, res: 8, eps: 9, u44: 10, xtal: 11 };

// The uv of a point on a part's top face, from its place on the face (x, z from the face's middle) and the face's
// size, in the cell that is printed with it.
export function printUv(cell: PrintCell, x: number, z: number, w: number, d: number): [number, number] {
  const k = CELL[cell], cx = k % PRINT.cells, cy = Math.floor(k / PRINT.cells), size = PRINT.px / PRINT.cells, pad = 4;
  const u = (cx * size + pad + (x / w + 0.5) * (size - pad * 2)) / PRINT.px;
  const v = (cy * size + pad + (z / d + 0.5) * (size - pad * 2)) / PRINT.px;
  return [u, v];
}

export function printSheet(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = PRINT.px;
  const g = c.getContext('2d') as Ctx;
  g.fillStyle = '#000';
  g.fillRect(0, 0, PRINT.px, PRINT.px);
  const size = PRINT.px / PRINT.cells, pad = 4;
  // Each cell is drawn in the millimetres of the face it goes on.
  const cell = (k: number, w: number, d: number, draw: (g: Ctx) => void) => {
    const cx = k % PRINT.cells, cy = Math.floor(k / PRINT.cells);
    g.save();
    g.translate(cx * size + pad + (size - pad * 2) / 2, cy * size + pad + (size - pad * 2) / 2);
    g.scale((size - pad * 2) / w, (size - pad * 2) / d);
    draw(g);
    g.restore();
  };
  const red = (g: Ctx) => { g.fillStyle = 'rgb(255,0,0)'; g.strokeStyle = 'rgb(255,0,0)'; };
  const green = (g: Ctx) => { g.fillStyle = 'rgb(0,255,0)'; g.strokeStyle = 'rgb(0,255,0)'; };
  const cw = CHOKE.w - 0.6;
  for (const [k, mark] of [[CELL.choke, 'R22'], [CELL.choke2, 'R22']] as [number, string][]) cell(k, cw, cw, (g) => {
    red(g);
    text(g, mark, 0, -0.35, 2.0, { align: 'center', font: SANS, weight: 600 });
    text(g, 'M6K 30A', 0, 1.75, 0.82, { align: 'center', weight: 600, space: 0.08 });
    green(g);
    disc(g, -cw / 2 + 0.85, -cw / 2 + 0.85, 0.32);
  });
  const cd = 5.7;
  cell(CELL.cap, cd, cd, (g) => {
    // The polarity band across the top, the value, and the vent stamped in the middle.
    red(g);
    g.beginPath(); g.arc(0, 0, 2.85, Math.PI * 0.62, Math.PI * 1.38); g.closePath(); g.fill();
    text(g, '270', 0.5, -1.0, 1.15, { align: 'center', weight: 700 });
    text(g, '16V', 0.5, 0.55, 0.82, { align: 'center', weight: 600 });
    text(g, 'F6', 0.5, 1.75, 0.62, { align: 'center', weight: 600 });
    green(g);
    g.lineWidth = 0.18;
    line(g, [[-0.9, 0], [0.9, 0]]); g.stroke();
    line(g, [[0, -0.9], [0, 0.9]]); g.stroke();
  });
  cell(CELL.mos, MOS.w, MOS.d, (g) => {
    red(g);
    text(g, '4C10N', 0.2, -0.5, 1.0, { align: 'center', weight: 600 });
    text(g, '611 A2', 0.2, 0.85, 0.72, { align: 'center', weight: 600 });
    green(g);
    disc(g, -MOS.w / 2 + 0.55, MOS.d / 2 - 0.55, 0.28);
  });
  cell(CELL.qfp, QFP.w, QFP.w, (g) => {
    red(g);
    text(g, 'AX7B', 0, -1.25, 1.25, { align: 'center', font: SANS, weight: 600 });
    text(g, '2611Q', 0, 0.45, 0.8, { align: 'center', weight: 600 });
    text(g, 'TW 7H0', 0, 1.55, 0.7, { align: 'center', weight: 600 });
    green(g);
    disc(g, -QFP.w / 2 + 0.85, -QFP.w / 2 + 0.85, 0.42);
  });
  cell(CELL.qfn, QFN.w, QFN.w, (g) => {
    red(g);
    text(g, 'PX45', 0, -0.6, 0.95, { align: 'center', weight: 700 });
    text(g, '26 1C', 0, 0.75, 0.7, { align: 'center', weight: 600 });
    green(g);
    disc(g, -QFN.w / 2 + 0.6, -QFN.w / 2 + 0.6, 0.25);
  });
  cell(CELL.soic, 4.9, 3.9, (g) => {
    red(g);
    text(g, 'F25X16', 0, -0.45, 0.82, { align: 'center', weight: 700 });
    text(g, '2611 SG', 0, 0.75, 0.62, { align: 'center', weight: 600 });
    green(g);
    disc(g, -1.85, 1.25, 0.3);
  });
  cell(CELL.res, 1.0, 0.8, (g) => {
    red(g);
    text(g, '103', 0, 0.02, 0.42, { align: 'center', weight: 600 });
  });
  cell(CELL.eps, 4, 4, () => {});
  cell(CELL.u44, U44.w, U44.w, (g) => {
    red(g);
    text(g, 'RX9', 0, -0.9, 1.2, { align: 'center', font: SANS, weight: 600 });
    text(g, '44C2 7B', 0, 0.55, 0.72, { align: 'center', weight: 600 });
    text(g, '2611', 0, 1.6, 0.62, { align: 'center', weight: 600 });
    green(g);
    disc(g, -U44.w / 2 + 0.7, -U44.w / 2 + 0.7, 0.3);
  });
  cell(CELL.xtal, XTAL.w, XTAL.d, (g) => {
    red(g);
    text(g, '25.000', 0, -0.3, 0.85, { align: 'center', weight: 700 });
    text(g, 'K6Q', 0, 0.75, 0.55, { align: 'center', weight: 600 });
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 8;
  t.flipY = false;
  return t;
}
