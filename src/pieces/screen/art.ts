import * as THREE from 'three';
import { pause, seeded } from '../../world/build';
import { MONO } from '../cpu/art';
import { BB, BOARDS, BUTTON, COF, DB, DRIVER, LABEL, MAIN, MB, PB, POWER, RUN, type Board, type P2 } from './layout';

// What is printed on the boards and parts, and the way the power runs over them, drawn once on 2D canvases in
// millimetres over the whole back and handed to the shaders as two textures. Nothing here is a picture of a part:
// the parts are geometry, and these are the copper, ink and pads on their faces.

export const ART = { x0: -162, y0: -102, w: 324, h: 204 } as const;
const ART_MM = 6;
const PULSE_MM = 4;
// The power's distance along its way is stored as a share of this, its local distance along a bundle of this.
export const D_MAX = 720;
export const L_MAX = 160;

type Ctx = CanvasRenderingContext2D & { letterSpacing: string };
function sheet(mm: number): { c: HTMLCanvasElement; g: Ctx } {
  const c = document.createElement('canvas');
  c.width = Math.round(ART.w * mm);
  c.height = Math.round(ART.h * mm);
  const g = c.getContext('2d', { willReadFrequently: true }) as Ctx;
  g.setTransform(mm, 0, 0, mm, -ART.x0 * mm, -ART.y0 * mm);
  g.fillStyle = '#fff';
  g.strokeStyle = '#fff';
  return { c, g };
}
const line = (g: Ctx, pts: P2[]) => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); };
const disc = (g: Ctx, x: number, y: number, r: number) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
const ringAt = (g: Ctx, x: number, y: number, r: number, w: number) => { g.lineWidth = w; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke(); };
const rect = (g: Ctx, cx: number, cy: number, w: number, h: number) => g.fillRect(cx - w / 2, cy - h / 2, w, h);
const box = (g: Ctx, cx: number, cy: number, w: number, h: number, lw = 0.15) => { g.lineWidth = lw; g.strokeRect(cx - w / 2, cy - h / 2, w, h); };
// Text upright as the back is read: the canvas runs y down, the back y up.
function text(g: Ctx, s: string, x: number, y: number, size: number, o: { align?: CanvasTextAlign; weight?: number; turn?: number; space?: number } = {}) {
  g.save();
  g.translate(x, y);
  g.scale(1, -1);
  if (o.turn) g.rotate(-o.turn);
  g.font = `${o.weight ?? 600} ${size}px ${MONO}`;
  g.letterSpacing = `${(o.space ?? 0.05) * size}px`;
  g.textAlign = o.align ?? 'left';
  g.textBaseline = 'middle';
  g.fillText(s, 0, 0);
  g.restore();
}

// A polyline moved sideways by d, with mitred corners.
function offset(path: P2[], d: number): P2[] {
  const n = path.length;
  const nrm = (a: P2, b: P2): P2 => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; };
  return path.map((p, i) => {
    if (i === 0) { const m = nrm(p, path[1]); return [p[0] + m[0] * d, p[1] + m[1] * d]; }
    if (i === n - 1) { const m = nrm(path[i - 1], p); return [p[0] + m[0] * d, p[1] + m[1] * d]; }
    const a = nrm(path[i - 1], p), b = nrm(p, path[i + 1]);
    const mx = a[0] + b[0], my = a[1] + b[1], ml = Math.hypot(mx, my) || 1;
    const k = d / ((mx / ml) * a[0] + (my / ml) * a[1]);
    return [p[0] + (mx / ml) * k, p[1] + (my / ml) * k];
  });
}

// A bundle of traces: the path of its middle, how many, how far apart and how wide, and how far the power has come
// where it starts. Power traces are few and wide, signal traces many and fine.
export interface Bundle { path: P2[]; n: number; pitch: number; w: number; d0: number }
const pw = (path: P2[], d0: number, n = 2): Bundle => ({ path, n, pitch: 2.5, w: 1.5, d0 });
const sig = (path: P2[], d0: number, n = 8, pitch = 0.62, w = 0.3): Bundle => ({ path, n, pitch, w, d0 });
export const BUNDLES: Bundle[] = [
  // The power board: in at the struck edge, through the fuse and the choke, the bridge, the bulk capacitor and the
  // transformer, out through the heat sink's packages to the output capacitors and the two connectors.
  pw([[-140, 2], [-137, 2], [-137, 13.5]], 0),
  pw([[-137, 34.5], [-137, 39], [-118, 39], [-118, 32]], 36),
  pw([[-118, 12], [-118, 3]], 76),
  pw([[-108, -4], [-104, -4], [-104, 8], [-98, 12.5]], 92),
  pw([[-88, 22], [-86, 22], [-86, -12], [-91, -17]], 132),
  pw([[-112, -36], [-124, -40], [-124, -54]], 190, 3),
  pw([[-124, -76], [-90, -76], [-82, -66], [-82, -14]], 226, 3),
  pw([[-90, -76], [-74, -76], [-69, -69]], 250, 3),
  sig([[-82, 0], [-84, 4], [-84, 28], [-71, 30], [-71, 33]], 300, 4, 1.0, 0.6),
  sig([[-104, -58], [-96, -50], [-96, -44]], 210, 5, 0.7, 0.32),
  sig([[-128, -24], [-128, -12], [-122, -8]], 110, 4, 0.8, 0.36),
  // The main board: in from the harness to the scaler, out to the ribbon, the ports, the memory, the flash and the
  // buttons.
  sig([[-38, -4], [-31, -4], [-24, 1], [-9, 1], [-7, 4]], RUN.main, 6, 0.8, 0.45),
  sig([[11, 22], [15, 26], [24, 30], [24, 38.5]], RUN.main + 50, 14, 0.52, 0.26),
  sig([[-6, 3], [-6, -1], [-20, -6], [-20, -10]], RUN.main + 56, 8),
  sig([[0, 3], [0, -1], [-1.5, -3], [-1.5, -10]], RUN.main + 56, 8),
  sig([[6, 3], [6, -1], [16.5, -4], [16.5, -10]], RUN.main + 56, 8),
  sig([[13, 6], [22, 6], [35, -3], [35, -10]], RUN.main + 60, 6),
  sig([[13, 9], [30, 5], [42, -4], [44.5, -5]], RUN.main + 60, 4),
  sig([[13, 17], [23.5, 17]], RUN.main + 50, 10, 0.5, 0.24),
  sig([[-9, 20], [-16, 27], [-21, 29]], RUN.main + 50, 4),
  // The driver board: from the ribbon out both ways along the board, and up into each flex tab.
  sig([[-30, 90.6], [-131, 90.6]], RUN.driver, 6, 0.48, 0.22),
  sig([[-18, 90.6], [131, 90.6]], RUN.driver, 6, 0.48, 0.22),
  ...DB.cofs.map((x) => sig([[x, 92.2], [x, 95.2]], RUN.driver + Math.abs(x - DB.ribbon[0]) * 0.9, 9, 0.62, 0.24)),
  // The button board.
  sig([[119.5, -90], [146, -90]], RUN.thin + 150, 3, 0.7, 0.3),
];

// The small parts, as rows on each board: where the first is, how many across and up, and how far apart.
export type Small = '0402c' | '0603c' | '0603r' | '0805c' | '0805r' | '1206r' | 'sot';
export const SMALL_SIZE: Record<Small, [number, number, number]> = {
  '0402c': [1.0, 0.5, 0.5], '0603c': [1.6, 0.8, 0.8], '0603r': [1.6, 0.8, 0.45], '0805c': [2.0, 1.25, 1.1], '0805r': [2.0, 1.25, 0.5], '1206r': [3.2, 1.6, 0.6], sot: [2.9, 1.3, 1.0],
};
interface SmallRun { b: Board; x: number; y: number; nx: number; ny: number; dx: number; dy: number; kind: Small; turn?: boolean }
const RUNS: SmallRun[] = [
  { b: POWER, x: -122, y: -46, nx: 6, ny: 1, dx: 2.8, dy: 0, kind: '1206r' },
  { b: POWER, x: -112, y: -70, nx: 5, ny: 1, dx: 2.8, dy: 0, kind: '0805c' },
  { b: POWER, x: -100, y: -83, nx: 9, ny: 1, dx: 2.6, dy: 0, kind: '0805r' },
  { b: POWER, x: -127, y: 3, nx: 1, ny: 4, dx: 0, dy: 2.8, kind: '1206r', turn: true },
  { b: POWER, x: -106, y: 37, nx: 6, ny: 1, dx: 2.4, dy: 0, kind: '0805c' },
  { b: POWER, x: -93, y: -46, nx: 2, ny: 3, dx: 3.6, dy: 2.4, kind: 'sot' },
  { b: MAIN, x: 16.5, y: 5, nx: 1, ny: 8, dx: 0, dy: 2.5, kind: '0603c', turn: true },
  { b: MAIN, x: -12.5, y: 5, nx: 1, ny: 7, dx: 0, dy: 2.7, kind: '0603c', turn: true },
  { b: MAIN, x: -8, y: 29, nx: 8, ny: 1, dx: 1.9, dy: 0, kind: '0603r' },
  { b: MAIN, x: 22, y: 30, nx: 1, ny: 4, dx: 0, dy: 2.6, kind: '0402c', turn: true },
  { b: MAIN, x: 36, y: 30, nx: 4, ny: 2, dx: 2.6, dy: 2.4, kind: '0805c' },
  { b: MAIN, x: 39, y: 4, nx: 1, ny: 4, dx: 0, dy: 2.6, kind: '0603r', turn: true },
  { b: MAIN, x: -40, y: 12, nx: 2, ny: 2, dx: 4, dy: 3.4, kind: 'sot' },
  { b: MAIN, x: -26, y: 40, nx: 6, ny: 1, dx: 1.8, dy: 0, kind: '0402c' },
  { b: DRIVER, x: -112, y: 87, nx: 8, ny: 1, dx: 1.4, dy: 0, kind: '0402c' },
  { b: DRIVER, x: -76, y: 87, nx: 8, ny: 1, dx: 1.4, dy: 0, kind: '0402c' },
  { b: DRIVER, x: 8, y: 87, nx: 10, ny: 1, dx: 1.4, dy: 0, kind: '0402c' },
  { b: DRIVER, x: 62, y: 87, nx: 8, ny: 1, dx: 1.4, dy: 0, kind: '0402c' },
  { b: DRIVER, x: 98, y: 87, nx: 8, ny: 1, dx: 1.4, dy: 0, kind: '0402c' },
  { b: BUTTON, x: 124, y: -87, nx: 6, ny: 1, dx: 2.2, dy: 0, kind: '0603r' },
];
export interface SmallAt { b: Board; x: number; y: number; kind: Small; turn: boolean; run: number }
export function smalls(): SmallAt[] {
  const out: SmallAt[] = [];
  RUNS.forEach((r, run) => { for (let j = 0; j < r.ny; j++) for (let i = 0; i < r.nx; i++) out.push({ b: r.b, x: r.x + i * r.dx, y: r.y + j * r.dy, kind: r.kind, turn: !!r.turn, run }); });
  return out;
}

export interface ScreenArt {
  // r: copper under the mask, g: ink, b: bare copper (pads, rings), a: the label's paper.
  art: THREE.DataTexture;
  // r: a trace's coverage, g: that times how far the power has come there, b: that times its bundle's number, a: that
  // times how far along its own bundle it is.
  pulse: THREE.DataTexture;
}

function channels(px: [number, number], layers: HTMLCanvasElement[]): Uint8Array {
  const out = new Uint8Array(px[0] * px[1] * 4);
  layers.forEach((c, ch) => {
    const d = c.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, c.width, c.height).data;
    for (let i = 0, j = 3; i < px[0] * px[1]; i++, j += 4) out[i * 4 + ch] = d[j];
  });
  return out;
}
function dataTexture(data: Uint8Array, w: number, h: number): THREE.DataTexture {
  const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.colorSpace = THREE.NoColorSpace;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.anisotropy = 8;
  t.needsUpdate = true;
  return t;
}

// The traces of a bundle, each with its distance along from where the bundle starts.
function traces(b: Bundle, r: () => number): { pts: P2[]; d: number[] }[] {
  return Array.from({ length: b.n }, (_, i) => {
    const pts = offset(b.path, (i - (b.n - 1) / 2) * b.pitch);
    let acc = r() * 3;
    return { pts, d: pts.map((p, k) => (k ? (acc += Math.hypot(p[0] - pts[k - 1][0], p[1] - pts[k - 1][1])) : acc)) };
  });
}

export async function screenArt(): Promise<ScreenArt> {
  const rnd = seeded(5150);
  const W = Math.round(ART.w * ART_MM), H = Math.round(ART.h * ART_MM);

  // ---- copper under the mask ----
  const cu = sheet(ART_MM);
  {
    const g = cu.g;
    // Pours on the power board, cut into islands round the hot side, with stitching vias.
    g.globalAlpha = 0.45;
    for (const [x0, y0, x1, y1] of [[-149, -86, -126, -30], [-96, -86, -66, -50], [-150, -28, -130, 40]] as [number, number, number, number][]) g.fillRect(x0, y0, x1 - x0, y1 - y0);
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'destination-out';
    for (const [x0, y0, x1, y1] of [[-148, -1, -131, 12], [-145, 14, -129, 37]] as [number, number, number, number][]) g.fillRect(x0, y0, x1 - x0, y1 - y0);
    g.globalCompositeOperation = 'source-over';
    // The creepage slot's keep out down the middle of the power board, as a ruled gap.
    for (const b of BUNDLES) {
      g.lineJoin = 'miter';
      g.lineCap = 'round';
      for (const t of traces(b, rnd)) { g.lineWidth = b.w; line(g, t.pts); g.stroke(); }
    }
    // Vias, tented, along the buses and round the boards' edges.
    const via = (x: number, y: number, r = 0.32) => { disc(g, x, y, r); g.globalCompositeOperation = 'destination-out'; disc(g, x, y, r * 0.45); g.globalCompositeOperation = 'source-over'; };
    for (const b of BOARDS) {
      if (b === DRIVER || b === BUTTON) continue;
      for (let x = b.x0 + 9; x < b.x1 - 9; x += 3.2) for (const y of [b.y0 + 2.2, b.y1 - 2.2]) via(x + (rnd() - 0.5) * 0.6, y);
    }
    for (let i = 0; i < 70; i++) via(MAIN.x0 + 4 + rnd() * (MAIN.x1 - MAIN.x0 - 8), MAIN.y0 + 4 + rnd() * (MAIN.y1 - MAIN.y0 - 8), 0.26);
    for (let i = 0; i < 40; i++) via(POWER.x0 + 4 + rnd() * (POWER.x1 - POWER.x0 - 8), POWER.y0 + 4 + rnd() * (POWER.y1 - POWER.y0 - 8), 0.4);
  }
  await pause();

  // ---- bare copper: pads, rings, mounting holes ----
  const pad = sheet(ART_MM);
  {
    const g = pad.g;
    for (const b of BOARDS) for (const [x, y] of b.holes) { ringAt(g, x, y, b === DRIVER || b === BUTTON ? 2.0 : 3.0, b === DRIVER || b === BUTTON ? 1.1 : 1.8); }
    for (const p of smalls()) {
      const [l, w] = SMALL_SIZE[p.kind];
      if (p.kind === 'sot') { for (const s of [-1, 1]) rect(g, p.x + s * 0.95, p.y - 1.1, 0.6, 0.9); rect(g, p.x, p.y + 1.1, 0.6, 0.9); continue; }
      const pl = l * 0.32, pd = w * 1.15;
      for (const s of [-1, 1]) p.turn ? rect(g, p.x, p.y + s * (l / 2 - pl / 2 + 0.12), pd, pl) : rect(g, p.x + s * (l / 2 - pl / 2 + 0.12), p.y, pl, pd);
    }
    // Through hole rings for the power board's legs and the connectors' pins.
    const th = (x: number, y: number, r = 0.9) => ringAt(g, x, y, r, 0.7);
    for (const s of [-1, 1]) th(PB.input[0], PB.input[1] + s * 2.5, 1.1);
    for (let i = 0; i < 4; i++) th(PB.bridge[0] - 7.5 + i * 5, PB.bridge[1], 0.9);
    for (let i = 0; i < 6; i++) th(PB.harness[0], PB.harness[1] - 6.25 + i * 2.5, 0.75);
    for (const s of [-1, 1]) th(PB.lamp[0], PB.lamp[1] + s * 1.25, 0.75);
    // The vent scored in each capacitor's top, read as dark on a part's top.
    g.lineWidth = 0.35;
    for (const [x, y, r] of [[PB.bulk[0], PB.bulk[1], 8.2], ...PB.outs, ...MB.caps] as [number, number, number][]) {
      const k = r * 0.55;
      line(g, [[x - k, y], [x + k, y]]); g.stroke();
      line(g, [[x, y - k], [x, y + k]]); g.stroke();
    }
    // The scaler's lead pads.
    for (let s = 0; s < 4; s++) for (let i = 0; i < 16; i++) {
      const a = -7.5 + i * 1.0, o = 9.4;
      const [dx, dy] = s === 0 ? [a, -o] : s === 1 ? [o, a] : s === 2 ? [-a, o] : [-o, -a];
      s % 2 === 0 ? rect(g, MB.scaler[0] + dx, MB.scaler[1] + dy, 0.4, 1.6) : rect(g, MB.scaler[0] + dx, MB.scaler[1] + dy, 1.6, 0.4);
    }
    // The flex tabs' bond pads along the driver board's top edge.
    for (const x of DB.cofs) for (let i = 0; i < 16; i++) rect(g, x - COF.w / 2 + 1 + i * ((COF.w - 2) / 15), 94.6, 0.32, 0.9);
    // The flash's pads.
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) rect(g, MB.flash[0] - 1.905 + i * 1.27, MB.flash[1] + s * 2.75, 0.6, 1.5);
    // Test points.
    for (let i = 0; i < 26; i++) { const b = BOARDS[i % 2]; disc(g, b.x0 + 6 + rnd() * (b.x1 - b.x0 - 12), b.y0 + 6 + rnd() * (b.y1 - b.y0 - 12), 0.55); }
  }
  await pause();

  // ---- ink: reference marks, outlines, the boards' codes, the parts' tops, the label's print ----
  const ink = sheet(ART_MM);
  {
    const g = ink.g;
    g.lineJoin = 'miter';
    // Footprint outlines in silkscreen.
    box(g, PB.xfmr[0], PB.xfmr[1], 27, 25);
    box(g, PB.bridge[0], PB.bridge[1], 22, 6);
    box(g, PB.xcap[0], PB.xcap[1], 20, 10);
    box(g, PB.opto[0], PB.opto[1], 6.6, 5);
    ringAt(g, PB.bulk[0], PB.bulk[1], 9.8, 0.16);
    for (const [x, y, r] of PB.outs) ringAt(g, x, y, r + 0.8, 0.15);
    ringAt(g, PB.choke[0], PB.choke[1], 13.2, 0.16);
    box(g, MB.scaler[0], MB.scaler[1], 23.5, 23.5);
    box(g, MB.ram[0], MB.ram[1], 11.5, 11.5);
    // Reference designators, small.
    const ref = (s: string, x: number, y: number, size = 1.3, turn = 0) => text(g, s, x, y, size, { turn, weight: 600 });
    ref('F1', -143, 24); ref('T250V', -143, 21.6, 0.9); ref('L1', -132, 8); ref('BD1', -128, -1); ref('C7', -106, 10); ref('T1', -116, -16);
    ref('Q2', -140, -34); ref('D9', -140, -44); ref('U4', -108, -54); ref('CN1', -147, 10, 1.2); ref('CN3', -79, -55); ref('CN4', -79, 41);
    ref('C11', -71, -15); ref('C12', -71, 1); ref('C14', -73, 18); ref('CX1', -147, -30);
    ref('U1', -10, 27); ref('U3', 37, 24); ref('Y1', -28, 15); ref('U7', -31, 34.4); ref('CN2', 13, 40); ref('CN6', 39, -11, 1.1); ref('CN5', -44, 3, 1.1);
    ref('HDMI1', -6, -16.4, 1.0); ref('HDMI2', 12, -16.4, 1.0); ref('DP1', -24, -16.4, 1.0); ref('USB', 31.5, -16.4, 1.0); ref('DC IN', -41.6, -16.4, 0.9);
    ref('CN1', -34, 92.2, 1.0); ref('U1', -10, 85.8, 1.0); ref('LED1', 141, -86, 0.9); ref('CN1', 120, -86.5, 0.9);
    // Each board's own code, in a corner.
    text(g, 'PWB-K2  LPS-180H  R1.4', -149, -80.4, 1.7, { weight: 700 });
    text(g, '94V-0   E318441   21-37', -149, -83.4, 1.1);
    text(g, 'MB-SC6  TCX-2307  REV.B', -44, 43.4, 1.5, { weight: 700 });
    text(g, '2312-A0418', 30, 43.4, 1.1);
    text(g, 'SRC-K27  PNL-1203', 30, 92.6, 1.2, { weight: 700 });
    text(g, 'KEY-5  R2', 128, -94.6, 1.0, { weight: 700 });
    // Hazard keep out lines across the power board's hot side.
    g.setLineDash([1.2, 0.9]);
    g.lineWidth = 0.22;
    line(g, [[-129, -30], [-129, 40]]); g.stroke();
    line(g, [[-150, -30], [-129, -30]]); g.stroke();
    g.setLineDash([]);
    // Polarity half moons by the capacitors.
    for (const [x, y, r] of [[PB.bulk[0], PB.bulk[1], 9], ...PB.outs, ...MB.caps] as [number, number, number][]) { g.beginPath(); g.arc(x, y, r + 0.6, Math.PI * 0.55, Math.PI * 1.45); g.lineWidth = 0.6; g.stroke(); }
    // Printed tops of parts: the transformer, the X capacitor, the bridge, the opto, the flash, the memory, the
    // crystal, the timing chip, the flex tabs' chips.
    const top = (lines: string[], x: number, y: number, size: number, gap = 1.35) => lines.forEach((s, i) => text(g, s, x, y + ((lines.length - 1) / 2 - i) * size * gap, size, { align: 'center' }));
    top(['TX-81K', 'EE25 2314', 'K'], PB.xfmr[0], PB.xfmr[1], 1.6);
    top(['X2 0.47uF', '310VAC  K', '2244'], PB.xcap[0], PB.xcap[1], 1.4);
    top(['GBK-406', '2243'], PB.bridge[0], PB.bridge[1] + 0.1, 0.95, 1.2);
    top(['P817', 'C 2301'], PB.opto[0], PB.opto[1], 0.8);
    top(['K25F64', 'A2318'], MB.flash[0], MB.flash[1], 0.68);
    top(['D3L-K8', '2230 NB'], MB.ram[0], MB.ram[1], 1.2);
    top(['25.000', 'K23'], MB.xtal[0], MB.xtal[1], 0.75);
    top(['TC-K7', '2309'], DB.tcon[0], DB.tcon[1], 0.82);
    top(['250', '16V'], PB.bulk[0] + 0.1, PB.bulk[1] - 4.2, 1.5);
    disc(g, PB.opto[0] - 2.4, PB.opto[1] + 1.6, 0.35);
    // The label on the tray: paper with dark print, a bar code and a grid of fields.
    const L = LABEL;
    text(g, 'PANEL  K27Q-203', L.c[0] - L.w / 2 + 3, L.c[1] + 11, 2.3, { weight: 700 });
    text(g, 'S/N  KQ2309A04418', L.c[0] - L.w / 2 + 3, L.c[1] + 7.2, 1.5);
    text(g, 'IN  19V ⎓ 3.42A   MFD 2023-09', L.c[0] - L.w / 2 + 3, L.c[1] + 4.2, 1.3);
    text(g, 'REV B2   LOT 0418', L.c[0] - L.w / 2 + 3, L.c[1] + 1.4, 1.3);
    let bx = L.c[0] - L.w / 2 + 3;
    while (bx < L.c[0] + 8) { const w = [0.25, 0.5, 0.75][Math.floor(rnd() * 3)]; g.fillRect(bx, L.c[1] - 12, w, 9); bx += w + [0.25, 0.5][Math.floor(rnd() * 2)]; }
    g.lineWidth = 0.25;
    g.strokeRect(L.c[0] + 11, L.c[1] - 12, 18, 9.4);
    for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) if (rnd() < 0.5 || i === 0 || j === 0) g.fillRect(L.c[0] + 20.5 + i * 1.1, L.c[1] - 11.6 + j * 1.1, 1.1, 1.1);
    text(g, 'K', L.c[0] + 14.6, L.c[1] - 7.2, 4.2, { weight: 700, align: 'center' });
  }
  await pause();

  // ---- paper: the label ----
  const paper = sheet(ART_MM);
  {
    const g = paper.g;
    g.beginPath();
    g.roundRect(LABEL.c[0] - LABEL.w / 2, LABEL.c[1] - LABEL.h / 2, LABEL.w, LABEL.h, 1.2);
    g.fill();
  }
  await pause();

  const art = dataTexture(channels([W, H], [cu.c, ink.c, pad.c, paper.c]), W, H);
  await pause();

  // ---- the power's way: coverage, distance along it, the bundle, the distance along the bundle ----
  const PW = Math.round(ART.w * PULSE_MM), PH = Math.round(ART.h * PULSE_MM);
  const cov = sheet(PULSE_MM), far = sheet(PULSE_MM), id = sheet(PULSE_MM), loc = sheet(PULSE_MM);
  {
    const r2 = seeded(5150);
    BUNDLES.forEach((b, k) => {
      for (const t of traces(b, r2)) {
        for (const c of [cov, far, id, loc]) { c.g.lineWidth = Math.max(b.w, 0.45); c.g.lineCap = 'butt'; }
        cov.g.lineCap = 'round';
        line(cov.g, t.pts); cov.g.stroke();
        id.g.strokeStyle = `rgba(255,255,255,${((k + 1) / 255).toFixed(4)})`;
        line(id.g, t.pts); id.g.stroke();
        // Short steps, each with its own distance.
        for (let s = 0; s < t.pts.length - 1; s++) {
          const [a, c] = [t.pts[s], t.pts[s + 1]];
          const len = Math.hypot(c[0] - a[0], c[1] - a[1]), steps = Math.max(1, Math.ceil(len / 1.2));
          for (let q = 0; q < steps; q++) {
            const u0 = q / steps, u1 = (q + 1) / steps, dl = t.d[s] + len * (u0 + u1) / 2;
            const p0: P2 = [a[0] + (c[0] - a[0]) * u0, a[1] + (c[1] - a[1]) * u0], p1: P2 = [a[0] + (c[0] - a[0]) * u1, a[1] + (c[1] - a[1]) * u1];
            far.g.strokeStyle = `rgba(255,255,255,${Math.min(1, (b.d0 + dl) / D_MAX).toFixed(4)})`;
            line(far.g, [p0, p1]); far.g.stroke();
            loc.g.strokeStyle = `rgba(255,255,255,${Math.min(1, dl / L_MAX).toFixed(4)})`;
            line(loc.g, [p0, p1]); loc.g.stroke();
          }
        }
      }
    });
  }
  await pause();
  const pulse = dataTexture(channels([PW, PH], [cov.c, far.c, id.c, loc.c]), PW, PH);
  return { art, pulse };
}

export const BUNDLE_COUNT = BUNDLES.length;
export const ART_PX_MM = ART_MM;
export const PULSE_PX_MM = PULSE_MM;
// A trace bundle's number, as the pulse texture stores it, for a cable: past every board's bundles.
export const CABLE_ID = { ribbon: BUNDLES.length + 1, thin: BUNDLES.length + 2, pair: BUNDLES.length + 3, harness: BUNDLES.length + 4, cof: BUNDLES.length + 5 } as const;
export { PB, MB, BB };
