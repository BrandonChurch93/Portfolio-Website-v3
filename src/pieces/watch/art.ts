import * as THREE from 'three';
import { seeded } from '../../world/build';
import { BALANCE, BARREL, CARTOUCHE, CHAPTER, COCK, DIAL, MOV, SECONDS, SWEEP, type P2 } from './layout';
import { ART, CART } from './shading';

// What is cut and printed on the watch, drawn once on a 2D canvas laid over the table from above, in millimetres:
// red is engraving (cut into the metal, dark, and its edges catch the light), green is print (the dial's dark
// lacquer). The words and marks are made up.

const SERIF = 'Georgia, "Times New Roman", serif';
const PX = 23;
type Ctx = CanvasRenderingContext2D & { letterSpacing: string };

const ENGRAVE = '#f00';
const PRINT = '#0f0';

function text(g: Ctx, s: string, x: number, z: number, size: number, o: { weight?: number; italic?: boolean; space?: number; align?: CanvasTextAlign; turn?: number } = {}) {
  g.save();
  g.translate(x, z);
  if (o.turn) g.rotate(o.turn);
  g.font = `${o.italic ? 'italic ' : ''}${o.weight ?? 400} ${size * 1.36}px ${SERIF}`;
  g.letterSpacing = `${(o.space ?? 0) * size * 1.36}px`;
  g.textAlign = o.align ?? 'center';
  g.textBaseline = 'middle';
  g.fillText(s, 0, 0);
  g.restore();
}

// Words set round an arc, each letter upright to the arc, read from outside (out) or inside.
function arcText(g: Ctx, s: string, cx: number, cz: number, r: number, mid: number, size: number, out = true, weight = 500) {
  g.save();
  g.font = `${weight} ${size * 1.36}px ${SERIF}`;
  const widths = [...s].map((ch) => g.measureText(ch).width * 1.12);
  const total = widths.reduce((a, b) => a + b, 0);
  let a = mid - (out ? 1 : -1) * (total / r) / 2;
  [...s].forEach((ch, i) => {
    const da = widths[i] / r;
    const ac = a + (out ? 1 : -1) * da / 2;
    g.save();
    g.translate(cx + Math.cos(ac) * r, cz + Math.sin(ac) * r);
    g.rotate(ac + (out ? Math.PI / 2 : -Math.PI / 2));
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(ch, 0, 0);
    g.restore();
    a += (out ? 1 : -1) * da;
  });
  g.restore();
}

function ring(g: Ctx, cx: number, cz: number, r: number, w: number) { g.lineWidth = w; g.beginPath(); g.arc(cx, cz, r, 0, Math.PI * 2); g.stroke(); }

// A scroll of engraved foliage: a spiral that curls in, with leaves along its outer side.
function scroll(g: Ctx, cx: number, cz: number, r0: number, turns: number, a0: number, dir: number, w: number, r: () => number) {
  g.lineWidth = w;
  g.beginPath();
  const n = 60;
  const pts: P2[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = a0 + dir * t * turns * Math.PI * 2, rr = r0 * (1 - 0.82 * t);
    pts.push([cx + Math.cos(a) * rr, cz + Math.sin(a) * rr]);
  }
  pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
  g.stroke();
  for (let i = 4; i < n - 10; i += 6) {
    const [x, z] = pts[i], [x2, z2] = pts[i + 1];
    const tx = x2 - x, tz = z2 - z, l = Math.hypot(tx, tz) || 1;
    const nx = (tz / l) * -dir, nz = (-tx / l) * -dir, len = (0.5 + 0.4 * r()) * r0 * 0.38;
    g.beginPath();
    g.moveTo(x, z);
    g.quadraticCurveTo(x + nx * len * 0.9 + (tx / l) * len * 0.6, z + nz * len * 0.9 + (tz / l) * len * 0.6, x + nx * len * 0.3 + (tx / l) * len * 1.1, z + nz * len * 0.3 + (tz / l) * len * 1.1);
    g.lineWidth = w * 0.8;
    g.stroke();
  }
}

export function watchArt(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = ART.w * PX;
  c.height = ART.d * PX;
  const g = c.getContext('2d') as Ctx;
  g.fillStyle = '#000';
  g.fillRect(0, 0, c.width, c.height);
  g.setTransform(PX, 0, 0, PX, -ART.x0 * PX, -ART.z0 * PX);
  g.globalCompositeOperation = 'lighter';
  const r = seeded(4117);

  // The dial. The railway minute track on the chapter ring, heavier at every fifth minute.
  const dx = DIAL.x, dz = DIAL.z;
  g.strokeStyle = PRINT;
  g.fillStyle = PRINT;
  const [t0, t1] = CHAPTER.track;
  ring(g, dx, dz, t0, 0.075);
  ring(g, dx, dz, t1, 0.075);
  for (let k = 0; k < 60; k++) {
    const a = (k / 60) * Math.PI * 2, five = k % 5 === 0;
    g.lineWidth = five ? 0.16 : 0.06;
    g.beginPath();
    g.moveTo(dx + Math.cos(a) * (five ? t0 - 0.25 : t0), dz + Math.sin(a) * (five ? t0 - 0.25 : t0));
    g.lineTo(dx + Math.cos(a) * t1, dz + Math.sin(a) * t1);
    g.stroke();
  }
  ring(g, dx, dz, CHAPTER.r[0] + 0.12, 0.05);
  // The small seconds' track and its numbers.
  const sx = dx + SECONDS.c[0], sz = dz + SECONDS.c[1];
  ring(g, sx, sz, SECONDS.r - 0.3, 0.05);
  ring(g, sx, sz, SECONDS.r - 0.75, 0.04);
  for (let k = 0; k < 60; k++) {
    const a = (k / 60) * Math.PI * 2 - Math.PI / 2, ten = k % 10 === 0, five = k % 5 === 0;
    g.lineWidth = ten ? 0.1 : 0.045;
    const ri = SECONDS.r - (ten ? 0.95 : five ? 0.85 : 0.75);
    g.beginPath();
    g.moveTo(sx + Math.cos(a) * ri, sz + Math.sin(a) * ri);
    g.lineTo(sx + Math.cos(a) * (SECONDS.r - 0.3), sz + Math.sin(a) * (SECONDS.r - 0.3));
    g.stroke();
  }
  for (const k of [10, 20, 30, 40, 50, 60]) {
    const a = (k / 60) * Math.PI * 2 - Math.PI / 2;
    text(g, String(k), sx + Math.cos(a) * (SECONDS.r - 1.55), sz + Math.sin(a) * (SECONDS.r - 1.55), 0.62, { weight: 600 });
  }
  text(g, 'SECONDES', sx, sz + 1.25, 0.34, { space: 0.18, weight: 600 });

  // The movement. The barrel bridge: the name round the ratchet, the number under it.
  g.strokeStyle = ENGRAVE;
  g.fillStyle = ENGRAVE;
  const mx = MOV.x, mz = MOV.z;
  const [bx, bz] = BARREL.c;
  arcText(g, 'ORLEN & VASSE  ·  FILS', mx + bx, mz + bz, 7.55, -Math.PI / 2 - 0.25, 0.92, true, 600);
  arcText(g, 'Nº 41762', mx + bx, mz + bz, 7.95, Math.PI / 2 + 0.55, 0.85, false, 600);
  // The train bridge, along its arm: how many jewels, and how it was set.
  {
    const along = (a: P2, b: P2, t: number, size: number, w: string, space: number) => {
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      const turn = Math.cos(ang) < 0 ? ang + Math.PI : ang;
      text(g, w, mx + a[0] + (b[0] - a[0]) * t, mz + a[1] + (b[1] - a[1]) * t, size, { turn, weight: 600, space });
    };
    along(SWEEP[0], SWEEP[1], 0.44, 0.5, 'FIFTEEN JEWELS', 0.1);
    along(SWEEP[2], SWEEP[3], 0.5, 0.56, 'ADJ · 3 POS', 0.12);
  }
  // The balance cock: foliage round the endstone and down the neck, and the regulator's scale.
  {
    const [kx, kz] = BALANCE.c, [fx, fz] = COCK.foot;
    const bx3 = mx + kx, bz3 = mz + kz;
    const away = Math.atan2(fz - kz, fx - kx);
    g.lineWidth = 0.06;
    for (let i = 0; i < 4; i++) {
      const a = away + Math.PI * 0.55 + (i / 4) * Math.PI * 1.1;
      scroll(g, bx3 + Math.cos(a) * 2.45, bz3 + Math.sin(a) * 2.45, 0.62, 1.1, a + Math.PI, i % 2 ? 1 : -1, 0.045, r);
    }
    ring(g, bx3, bz3, COCK.table - 0.22, 0.04);
    // The neck: a stem of foliage from the table to the foot.
    const steps = 4, len = Math.hypot(fx - kx, fz - kz);
    for (let i = 0; i < steps; i++) {
      const t = (3.7 + i * 0.8) / len;
      const px = bx3 + (fx - kx) * t, pz = bz3 + (fz - kz) * t;
      scroll(g, px, pz, 0.85, 0.9, away + (i % 2 ? 1.6 : -1.6), i % 2 ? 1 : -1, 0.05, r);
    }
    // The regulator's scale: an arc of fine lines at the table's edge, toward the foot, with S and F at its ends.
    for (let k = -8; k <= 8; k++) {
      const a = away + Math.PI + k * 0.05, long = k % 4 === 0;
      g.lineWidth = 0.03;
      g.beginPath();
      g.moveTo(bx3 + Math.cos(a) * 2.3, bz3 + Math.sin(a) * 2.3);
      g.lineTo(bx3 + Math.cos(a) * (long ? 2.85 : 2.6), bz3 + Math.sin(a) * (long ? 2.85 : 2.6));
      g.stroke();
    }
    text(g, 'S', bx3 + Math.cos(away + Math.PI - 0.62) * 2.5, bz3 + Math.sin(away + Math.PI - 0.62) * 2.5, 0.42, { weight: 700 });
    text(g, 'F', bx3 + Math.cos(away + Math.PI + 0.62) * 2.5, bz3 + Math.sin(away + Math.PI + 0.62) * 2.5, 0.42, { weight: 700 });
  }
  // The case back's flange, by the hinge: hallmarks struck in a row, and a repairer's mark scratched beside them.
  {
    const rr = 22.65;
    const marks = ['O&V', '★', 'B7', '41762'];
    marks.forEach((m, i) => {
      const a = -0.34 + i * 0.13 + (m.length > 3 ? 0.04 : 0);
      const x = mx + Math.cos(a) * rr, z = mz + Math.sin(a) * rr;
      g.save();
      g.translate(x, z);
      g.rotate(a + Math.PI / 2);
      const w = m.length > 3 ? 2.6 : 1.5;
      g.lineWidth = 0.08;
      g.beginPath();
      if (i === 1) { g.moveTo(0, -0.7); g.lineTo(0.7, 0); g.lineTo(0, 0.7); g.lineTo(-0.7, 0); g.closePath(); }
      else if (i === 0) { g.moveTo(-w / 2, -0.55); g.lineTo(w / 2, -0.55); g.lineTo(w / 2, 0.1); g.quadraticCurveTo(w / 2, 0.6, 0, 0.7); g.quadraticCurveTo(-w / 2, 0.6, -w / 2, 0.1); g.closePath(); }
      else g.ellipse(0, 0, w / 2, 0.55, 0, 0, Math.PI * 2);
      g.stroke();
      g.restore();
      text(g, m === '★' ? '✦' : m, x, z, m.length > 3 ? 0.62 : 0.72, { turn: a + Math.PI / 2, weight: 700, space: 0.04 });
    });
    // A scratched service mark: thin wandering strokes, as a repairer's point leaves them.
    g.save();
    const a = 0.42;
    g.translate(mx + Math.cos(a) * rr, mz + Math.sin(a) * rr);
    g.rotate(a + Math.PI / 2);
    g.lineWidth = 0.035;
    const scratch = (pts: P2[]) => { g.beginPath(); pts.forEach(([x, z], i) => { const jx = x + (r() - 0.5) * 0.06, jz = z + (r() - 0.5) * 0.06; if (i) g.lineTo(jx, jz); else g.moveTo(jx, jz); }); g.stroke(); };
    let x0 = -2.4;
    for (const ch of 'JK 11 4 38') {
      if (ch === ' ') { x0 += 0.35; continue; }
      const s = 0.42;
      if (ch === '1') scratch([[x0, -s], [x0 + 0.05, s]]);
      else if (ch === '4') scratch([[x0 + 0.25, s], [x0 + 0.25, -s], [x0 - 0.05, 0.1], [x0 + 0.35, 0.1]]);
      else if (ch === '3') scratch([[x0 - 0.05, -s], [x0 + 0.3, -s * 0.7], [x0 + 0.05, 0], [x0 + 0.32, s * 0.6], [x0 - 0.05, s]]);
      else if (ch === '8') scratch([[x0 + 0.15, 0], [x0 - 0.05, -s * 0.6], [x0 + 0.15, -s], [x0 + 0.35, -s * 0.6], [x0 + 0.15, 0], [x0 - 0.05, s * 0.6], [x0 + 0.15, s], [x0 + 0.35, s * 0.6], [x0 + 0.15, 0]]);
      else if (ch === 'J') scratch([[x0 + 0.3, -s], [x0 + 0.3, s * 0.6], [x0 + 0.1, s], [x0 - 0.05, s * 0.6]]);
      else if (ch === 'K') { scratch([[x0, -s], [x0, s]]); scratch([[x0 + 0.35, -s], [x0, 0.05], [x0 + 0.38, s]]); }
      x0 += 0.5;
    }
    for (let i = 0; i < 9; i++) { const sx2 = -3 + r() * 6, sz2 = -0.6 + r() * 1.2, a2 = r() * Math.PI; scratch([[sx2, sz2], [sx2 + Math.cos(a2) * (0.4 + r()), sz2 + Math.sin(a2) * 0.2]]); }
    g.restore();
  }

  return sheet(c);
}

function sheet(c: HTMLCanvasElement): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = 8;
  t.flipY = false;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

// The maker's cartouche: a framed gold plaque with the name cut into it, on a sheet of its own at five times the
// big sheet's fineness, so the cut letters stay sharp at three times the page's size.
export function cartoucheArt(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = Math.round(CART.w * CART.px);
  c.height = Math.round(CART.d * CART.px);
  const g = c.getContext('2d') as Ctx;
  g.fillStyle = '#000';
  g.fillRect(0, 0, c.width, c.height);
  g.setTransform(CART.px, 0, 0, CART.px, -CART.x0 * CART.px, -CART.z0 * CART.px);
  g.strokeStyle = ENGRAVE;
  g.fillStyle = ENGRAVE;
  const cx = CART.x0 + CART.w / 2, cz = CART.z0 + CART.d / 2;
  const plaque = (inset: number) => { const w = CARTOUCHE.w / 2 - inset, d = CARTOUCHE.d / 2 - inset, k = 1.0 - inset * 0.5; g.beginPath(); g.moveTo(cx - w + k, cz - d); g.lineTo(cx + w - k, cz - d); g.quadraticCurveTo(cx + w, cz - d, cx + w, cz - d + k); g.lineTo(cx + w, cz + d - k); g.quadraticCurveTo(cx + w, cz + d, cx + w - k, cz + d); g.lineTo(cx - w + k, cz + d); g.quadraticCurveTo(cx - w, cz + d, cx - w, cz + d - k); g.lineTo(cx - w, cz - d + k); g.quadraticCurveTo(cx - w, cz - d, cx - w + k, cz - d); g.stroke(); };
  g.lineWidth = 0.07;
  plaque(0.32);
  g.lineWidth = 0.035;
  plaque(0.5);
  text(g, 'Orlen & Vasse', cx, cz - 0.42, 1.05, { italic: true, weight: 600, space: 0.02 });
  text(g, 'Nº 41762  ·  BRÉVETÉ', cx, cz + 0.82, 0.42, { weight: 700, space: 0.22 });
  return sheet(c);
}
