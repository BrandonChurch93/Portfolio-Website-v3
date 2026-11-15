import * as THREE from 'three';

// The marks his parts carry in the PC Builder, his own made up names: VELTRIN on the card's lit edge, KESTRANE on the
// pump's cap, KORRIN on the heatsink beside the socket. Drawn once in code on one sheet, which the printed faces and the card's lit
// wordmark both read from. Each region is a uv rectangle of the sheet: u0, v0, u1, v1.

const S = 1024;
export const SHEET = {
  cap: [0, 0.25, 0.5, 0.75] as const,
  cover: [0.5, 0.625, 1, 0.75] as const,
  side: [0.5, 0.5, 1, 0.625] as const,
  glow: [0, 0, 1, 0.25] as const,
};

const FONT = '"Helvetica Neue", Arial, sans-serif';

function region(g: CanvasRenderingContext2D, r: readonly [number, number, number, number], draw: (w: number, h: number) => void, bg: string): void {
  const x = r[0] * S, y = (1 - r[3]) * S, w = (r[2] - r[0]) * S, h = (r[3] - r[1]) * S;
  g.save();
  g.translate(x, y);
  g.beginPath(); g.rect(0, 0, w, h); g.clip();
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  draw(w, h);
  g.restore();
}

function spaced(g: CanvasRenderingContext2D, text: string, x: number, y: number, track: number): void {
  const widths = [...text].map((ch) => g.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + track * (text.length - 1);
  let at = x - total / 2;
  [...text].forEach((ch, i) => { g.fillText(ch, at, y); at += widths[i] + track; });
}

export function printSheet(): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = S; c.height = S;
  const g = c.getContext('2d')!;
  g.textBaseline = 'middle';
  // The pump's cap: satin black, the name across its middle, a fine ring inside the lit one.
  region(g, SHEET.cap, (w, h) => {
    g.strokeStyle = '#4a4744'; g.lineWidth = w * 0.006; g.beginPath(); g.arc(w / 2, h / 2, w * 0.33, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#c9c4bd'; g.font = `700 ${h * 0.085}px ${FONT}`; spaced(g, 'KESTRANE', w / 2, h * 0.5, h * 0.012);
    g.fillStyle = '#7d7973'; g.font = `600 ${h * 0.035}px ${FONT}`; spaced(g, 'TARN 360', w / 2, h * 0.59, h * 0.01);
  }, '#161514');
  // The board's cover: the maker's name along it.
  region(g, SHEET.cover, (w, h) => {
    g.fillStyle = '#a9a49d'; g.font = `700 ${h * 0.55}px ${FONT}`; spaced(g, 'KORRIN', w / 2, h * 0.52, h * 0.12);
  }, '#2b2a28');
  // The card's glass facing edge: the name printed, dim, under the lit one.
  region(g, SHEET.side, (w, h) => {
    g.fillStyle = '#4c4945'; g.font = `800 ${h * 0.6}px ${FONT}`; spaced(g, 'VELTRIN', w / 2, h * 0.52, h * 0.1);
  }, '#171615');
  // The same name as light: white on black, read by the light shader.
  region(g, SHEET.glow, (w, h) => {
    g.fillStyle = '#ffffff'; g.font = `800 ${h * 0.6}px ${FONT}`; spaced(g, 'VELTRIN', w / 2, h * 0.52, h * 0.1);
  }, '#000000');
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

// A plane w by h with its uvs on a region of the sheet, facing +z.
export function printPlane(w: number, h: number, r: readonly [number, number, number, number]): THREE.BufferGeometry {
  const g = new THREE.PlaneGeometry(w, h);
  const uv = g.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, r[0] + uv.getX(i) * (r[2] - r[0]), r[1] + uv.getY(i) * (r[3] - r[1]));
  return g;
}

// A disc of radius r with its uvs on a square region of the sheet, facing +z.
export function printDisc(r: number, reg: readonly [number, number, number, number], seg = 48): THREE.BufferGeometry {
  const g = new THREE.CircleGeometry(r, seg);
  const uv = g.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, reg[0] + uv.getX(i) * (reg[2] - reg[0]), reg[1] + uv.getY(i) * (reg[3] - reg[1]));
  return g;
}
