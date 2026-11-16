import * as THREE from 'three';
import { seeded } from '../../world/build';
import { DABS, RING, STAMP, TAPE, rimAt } from './layout';
import { ART_MM } from './shading';

// What is drawn on the board rather than built, on one canvas in the board's millimetres: pencil in red, the maker's
// stamp burned into the wood in green, the ring a wet cup left in blue. The shaders read it by the board's own x and z.

const PX = 4;
const SERIF = 'Georgia, "Times New Roman", serif';

function layer(): { c: HTMLCanvasElement; g: CanvasRenderingContext2D } {
  const c = document.createElement('canvas');
  c.width = ART_MM.w * PX;
  c.height = ART_MM.h * PX;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.setTransform(PX, 0, 0, PX, (ART_MM.w / 2) * PX, (ART_MM.h / 2) * PX);
  g.fillStyle = '#fff';
  g.strokeStyle = '#fff';
  g.lineCap = 'round';
  g.lineJoin = 'round';
  return { c, g };
}

// A line drawn by hand in pencil: it wanders a little, and presses harder in its middle.
function pencil(g: CanvasRenderingContext2D, pts: [number, number][], r: () => number, w = 0.32) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const n = Math.max(2, Math.ceil(Math.hypot(bx - ax, bz - az) / 1.2));
    for (let k = 0; k < n; k++) {
      const t0 = k / n, t1 = (k + 1) / n;
      g.globalAlpha = 0.55 + 0.4 * r();
      g.lineWidth = w * (0.8 + 0.4 * r());
      g.beginPath();
      g.moveTo(ax + (bx - ax) * t0 + (r() - 0.5) * 0.12, az + (bz - az) * t0 + (r() - 0.5) * 0.12);
      g.lineTo(ax + (bx - ax) * t1 + (r() - 0.5) * 0.12, az + (bz - az) * t1 + (r() - 0.5) * 0.12);
      g.stroke();
    }
  }
  g.globalAlpha = 1;
}

function written(g: CanvasRenderingContext2D, text: string, x: number, z: number, size: number, a: number, r: () => number) {
  g.save();
  g.translate(x, z);
  g.rotate(a);
  g.font = `italic ${size}px ${SERIF}`;
  let at = 0;
  for (const ch of text) {
    g.save();
    g.translate(at, (r() - 0.5) * size * 0.12);
    g.rotate((r() - 0.5) * 0.18);
    g.globalAlpha = 0.6 + 0.35 * r();
    g.fillText(ch, 0, 0);
    g.restore();
    at += g.measureText(ch).width * 0.96;
  }
  g.restore();
  g.globalAlpha = 1;
}

export function boardArt(): THREE.Texture {
  const r = seeded(71);
  // Pencil: a code under each fresh dab where the painter noted the paint, a tally and a ratio on the tape, a swatch
  // box hatched beside the mixing ground, a ruled line along the front.
  const P = layer();
  {
    const g = P.g;
    const codes = ['7', '5', '3', '', '2', '', '1', '', '', '4', '6', ''];
    DABS.forEach((d, k) => {
      if (d.age > 0.3) return;
      const code = codes[k] ?? '';
      if (!code) return;
      const l = Math.hypot(d.x, d.z) || 1;
      written(g, code, d.x - (d.x / l) * (d.r + 4.5) - 1.2, d.z - (d.z / l) * (d.r + 4.5) + 1.4, 4.2, (r() - 0.5) * 0.3, r);
    });
    const t = rimAt(TAPE.f);
    const ix = -t.n[0], iz = -t.n[1];
    const at = (s: number, w: number): [number, number] => [t.p[0] + ix * s + t.t[0] * w, t.p[1] + iz * s + t.t[1] * w];
    const ang = Math.atan2(t.t[1], t.t[0]);
    written(g, '3 : 1', ...at(20, -5), 4.4, ang + Math.PI / 2, r);
    for (let k = 0; k < 4; k++) pencil(g, [at(9 + k * 1.6, -5.5), at(9 + k * 1.6, -1.5)], r, 0.3);
    pencil(g, [at(7.5, -2.5), at(16, -4.6)], r, 0.28);
    written(g, 'F+P', ...at(26, 2), 3.4, ang + Math.PI / 2, r);
    const box: [number, number][] = [[-96, 30], [-82, 30], [-82, 40], [-96, 40], [-96, 30]];
    pencil(g, box, r, 0.3);
    g.save();
    g.beginPath(); g.rect(-96, 30, 14, 10); g.clip();
    for (let k = 0; k < 14; k++) pencil(g, [[-100 + k * 1.5, 40], [-92 + k * 1.5, 30]], r, 0.2);
    g.restore();
    written(g, 'x2', -80, 39, 3.6, -0.1, r);
    pencil(g, [[-40, 92], [20, 97.5]], r, 0.25);
    for (let k = 0; k < 6; k++) pencil(g, [[-36 + k * 10, 92.4 + k * 0.92], [-36 + k * 10, 95 + k * 0.92]], r, 0.22);
  }
  // The stamp: an oval in a double rule, a small star, a made up code and a number, burned so the char spreads past
  // the iron's edge.
  const S = layer();
  {
    const g = S.g;
    g.save();
    g.translate(STAMP.x, STAMP.z);
    g.rotate(-Math.PI / 2);
    g.shadowColor = '#fff';
    g.shadowBlur = 1.4 * PX;
    g.lineWidth = 0.7;
    g.beginPath(); g.ellipse(0, 0, STAMP.h / 2, STAMP.w / 2, 0, 0, Math.PI * 2); g.stroke();
    g.lineWidth = 0.35;
    g.beginPath(); g.ellipse(0, 0, STAMP.h / 2 - 1.2, STAMP.w / 2 - 1.2, 0, 0, Math.PI * 2); g.stroke();
    g.textAlign = 'center';
    g.font = `bold 3.6px ${SERIF}`;
    g.fillText('N° 7', 0, -1.2);
    g.font = `bold 2.7px ${SERIF}`;
    g.fillText('W·300', 0, 3.4);
    g.beginPath();
    for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2 - Math.PI / 2, rr = k % 2 ? 0.6 : 1.4; g.lineTo(-7.4 + Math.cos(a) * rr, 0.6 + Math.sin(a) * rr); }
    g.fill();
    g.beginPath();
    for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2 - Math.PI / 2, rr = k % 2 ? 0.6 : 1.4; g.lineTo(7.4 + Math.cos(a) * rr, 0.6 + Math.sin(a) * rr); }
    g.fill();
    g.restore();
  }
  // The ring: where a wet cup stood, darker where the cup's foot sat, broken where it was lifted at a tilt.
  const R = layer();
  {
    const g = R.g;
    for (let k = 0; k < 220; k++) {
      const a0 = (k / 220) * Math.PI * 2, a1 = ((k + 1.3) / 220) * Math.PI * 2;
      const gap = Math.max(0, Math.cos(a0 - 2.2));
      g.globalAlpha = (0.35 + 0.65 * (1 - gap ** 3)) * (0.75 + 0.25 * r());
      g.lineWidth = 0.5 + 0.9 * (1 - gap) + 0.3 * r();
      g.beginPath();
      g.ellipse(RING.x, RING.z, RING.r + 0.3 * Math.sin(a0 * 3), RING.r * 0.97, 0, a0, a1);
      g.stroke();
    }
    g.globalAlpha = 0.12;
    g.beginPath(); g.ellipse(RING.x, RING.z, RING.r - 0.4, RING.r * 0.97 - 0.4, 0, 0, Math.PI * 2); g.fill();
    g.globalAlpha = 1;
  }
  const w = P.c.width, h = P.c.height;
  const out = new Uint8Array(w * h * 4);
  const a = P.g.getImageData(0, 0, w, h).data, b = S.g.getImageData(0, 0, w, h).data, c = R.g.getImageData(0, 0, w, h).data;
  for (let i = 0; i < w * h; i++) { out[i * 4] = a[i * 4 + 3]; out[i * 4 + 1] = b[i * 4 + 3]; out[i * 4 + 2] = c[i * 4 + 3]; out[i * 4 + 3] = 255; }
  // Rows run down the canvas, which is toward the viewer on the board: the texture is read with v flipped to match.
  const tex = new THREE.DataTexture(out, w, h, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.flipY = false;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}
