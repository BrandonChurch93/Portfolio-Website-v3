import * as THREE from 'three';

// What is engraved on the camera and its lenses, drawn once on a canvas in the places of one atlas. It is a mask, not
// a picture: red is where paint fills an engraving, green where that paint is copper. The camera's one surface shader
// reads it (materials.ts), so engraving costs no program of its own. Every mark is a made up code: no maker, no model.

export const SANS = '"Sora Variable", "Sora", system-ui, sans-serif';
export const MONO = '"JetBrains Mono Variable", "JetBrains Mono", ui-monospace, Menlo, monospace';

const SIZE = 2048;
const FILL = '#f00';
const ACCENT = '#ff0';

// Places in the atlas, in pixels: x, y, w, h.
export const REG = {
  bezelA: [0, 0, 1024, 1024],
  bezelB: [1024, 0, 1024, 1024],
  apert: [0, 1024, 2048, 128],
  dist: [0, 1152, 2048, 128],
  zoom: [0, 1280, 2048, 128],
  iso: [0, 1408, 512, 512],
  mode: [512, 1408, 512, 512],
  cap: [1024, 1408, 512, 512],
  code: [1536, 1408, 512, 128],
} as const;
export type Region = keyof typeof REG;

type Ctx = CanvasRenderingContext2D & { letterSpacing: string };

function font(g: Ctx, px: number, weight = 500, f = SANS) { g.font = `${weight} ${px}px ${f}`; g.textAlign = 'center'; g.textBaseline = 'middle'; }

// Characters set round a circle. Along the top the tops of the letters face out, along the bottom they face in, so
// both read left to right.
function arc(g: Ctx, s: string, cx: number, cy: number, r: number, mid: number, px: number, o: { inward?: boolean; weight?: number; f?: string; space?: number } = {}) {
  font(g, px, o.weight ?? 500, o.f ?? SANS);
  const sp = (o.space ?? 0.12) * px;
  const ws = [...s].map((c) => g.measureText(c).width + sp);
  const total = ws.reduce((a, b) => a + b, 0);
  const dir = o.inward ? -1 : 1;
  let a = mid - dir * (total / r) / 2;
  for (const [i, c] of [...s].entries()) {
    const da = ws[i] / r;
    const at = a + dir * da / 2;
    g.save();
    g.translate(cx + Math.cos(at) * r, cy + Math.sin(at) * r);
    g.rotate(at + (o.inward ? -Math.PI / 2 : Math.PI / 2));
    g.fillText(c, 0, 0);
    g.restore();
    a += dir * da;
  }
}

function tick(g: Ctx, cx: number, cy: number, r0: number, r1: number, a: number, w: number) {
  g.lineWidth = w;
  g.beginPath();
  g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
  g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
  g.stroke();
}

// A lens's front bezel: its focal length and speed along the top, a made up serial along the bottom, a fine ring.
function bezel(g: Ctx, x: number, y: number, w: number, top: string, bottom: string, rMid: number, fill: string, accent: string) {
  const cx = x + w / 2, cy = y + w / 2;
  g.fillStyle = fill;
  arc(g, top, cx, cy, rMid, -Math.PI / 2, w * 0.052, { weight: 500, space: 0.1 });
  arc(g, bottom, cx, cy, rMid, Math.PI / 2, w * 0.04, { inward: true, weight: 400, f: MONO, space: 0.16 });
  g.strokeStyle = accent;
  g.lineWidth = w * 0.004;
  g.beginPath(); g.arc(cx, cy, rMid + w * 0.045, 0, Math.PI * 2); g.stroke();
}

// A band round a barrel: the atlas's row is the barrel's whole turn, so its middle is where the text is centred.
function band(g: Ctx, y: number, h: number, marks: { u: number; s: string; c?: string; px?: number; tick?: boolean }[]) {
  for (const m of marks) {
    g.fillStyle = m.c ?? FILL;
    g.strokeStyle = m.c ?? FILL;
    if (m.tick) { g.lineWidth = 3; g.beginPath(); g.moveTo(m.u * SIZE, y + h * 0.12); g.lineTo(m.u * SIZE, y + h * 0.42); g.stroke(); }
    if (m.s) { font(g, m.px ?? h * 0.36, 500); g.fillText(m.s, m.u * SIZE, y + h * (m.tick ? 0.7 : 0.5)); }
  }
}

function dialTop(g: Ctx, x: number, y: number, w: number, labels: string[], pick: string, fill: string, accent: string) {
  const cx = x + w / 2, cy = y + w / 2;
  const n = labels.length;
  for (const [i, s] of labels.entries()) {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    g.fillStyle = s === pick ? accent : fill;
    g.save();
    g.translate(cx + Math.cos(a) * w * 0.33, cy + Math.sin(a) * w * 0.33);
    g.rotate(a + Math.PI / 2);
    font(g, w * (s.length > 3 ? 0.06 : 0.085), 600);
    g.fillText(s, 0, 0);
    g.restore();
    g.strokeStyle = fill;
    tick(g, cx, cy, w * 0.41, w * 0.45, a + Math.PI / n, w * 0.006);
  }
  g.strokeStyle = fill;
  g.lineWidth = w * 0.006;
  g.beginPath(); g.arc(cx, cy, w * 0.2, 0, Math.PI * 2); g.stroke();
}

export interface CameraArt { ink: THREE.CanvasTexture }

// u of a band, where the text's middle is: the band's u runs with the angle round the barrel.
export const BAND_MID = 0.5;

export async function cameraArt(maxAniso: number): Promise<CameraArt> {
  await Promise.all([`400 20px ${SANS}`, `500 20px ${SANS}`, `600 20px ${SANS}`, `400 20px ${MONO}`].map((f) => document.fonts.load(f).catch(() => null)));
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  const g = c.getContext('2d') as Ctx;
  g.fillStyle = '#000'; g.fillRect(0, 0, SIZE, SIZE);
  g.fillStyle = FILL; g.strokeStyle = FILL;
  const [ax, ay, aw] = REG.bezelA;
  // Mapped so the bezel's outer edge is the region's edge: radius 39.6 mm over half the region.
  bezel(g, ax, ay, aw, '1:1.2   f = 50 mm   ø 72', 'No 2604115  ·  Δ  ·  MC', aw / 2 * (36.6 / 39.6), FILL, ACCENT);
  const [bx, by, bw] = REG.bezelB;
  bezel(g, bx, by, bw, '1:2.8   24-70 mm   ø 82', 'No 1817036  ·  Δ  ·  IF', bw / 2 * (40.8 / 43.5), FILL, ACCENT);
  const stops = ['16', '11', '8', '5.6', '4', '2.8', '2', '1.4', '1.2'];
  const a = REG.apert;
  band(g, a[1], a[3], stops.map((s, i) => ({ u: BAND_MID + (i - 4) * 0.032, s, c: s === '1.2' ? ACCENT : FILL, tick: true })));
  const d = REG.dist;
  const dist = ['∞', '5', '3', '2', '1.5', '1', '.8', '.6', '.45'];
  band(g, d[1], d[3], [
    ...dist.map((s, i) => ({ u: BAND_MID + (i - 4) * 0.03, s, c: FILL, px: d[3] * 0.32 })),
    { u: BAND_MID + 0.152, s: 'm', c: FILL, px: d[3] * 0.28 },
    { u: BAND_MID - 0.16, s: 'ft', c: FILL, px: d[3] * 0.28 },
  ]);
  const z = REG.zoom;
  band(g, z[1], z[3], ['24', '28', '35', '50', '70'].map((s, i) => ({ u: BAND_MID + (i - 2) * 0.05, s, c: FILL, tick: true })));
  // The index the rings are read against.
  g.fillStyle = ACCENT;
  g.fillRect(BAND_MID * SIZE - 2, d[1] + d[3] * 0.06, 4, d[3] * 0.22);
  const [ix, iy, iw] = REG.iso;
  dialTop(g, ix, iy, iw, ['100', '200', '400', '800', '1600', '3200', '6400', 'A'], 'A', FILL, ACCENT);
  const [mx, my, mw] = REG.mode;
  dialTop(g, mx, my, mw, ['M', 'A', 'S', 'P', '1', '2', '3', 'B'], 'M', FILL, ACCENT);
  // The size and mark moulded into the cap, and the model code on the body.
  const [cx, cy, cw] = REG.cap;
  g.fillStyle = FILL;
  arc(g, 'ø72 · Δ', cx + cw / 2, cy + cw / 2, cw * 0.3, -Math.PI / 2, cw * 0.06, { weight: 500, f: MONO, space: 0.2 });
  g.strokeStyle = FILL; g.lineWidth = cw * 0.008;
  g.beginPath(); g.arc(cx + cw / 2, cy + cw / 2, cw * 0.4, 0, Math.PI * 2); g.stroke();
  const [qx, qy, qw, qh] = REG.code;
  font(g, qh * 0.55, 500, MONO);
  g.letterSpacing = `${qh * 0.08}px`;
  g.fillText('Δ 07', qx + qw / 2, qy + qh * 0.52);
  g.letterSpacing = '0px';

  const ink = new THREE.CanvasTexture(c);
  ink.wrapS = THREE.RepeatWrapping;
  ink.anisotropy = maxAniso;
  ink.generateMipmaps = true;
  ink.minFilter = THREE.LinearMipmapLinearFilter;
  return { ink };
}

export const ATLAS = SIZE;
