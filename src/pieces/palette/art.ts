import * as THREE from 'three';
import { DABS, MARK, STAMP, STEPS } from './layout';
import { ART_MM } from './shading';

// What is set into the board rather than built, on one canvas in the board's millimetres: the scale's numbers inlaid in
// brass in red, the maker's stamp burned into the wood in green. The shaders read it by the board's own x and z.

const PX = 6;
const SANS = '"Helvetica Neue", Helvetica, Arial, sans-serif';
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

export function boardArt(): THREE.Texture {
  // The scale's numbers, inlaid in brass: each step's name beside its dab, set along the arc and reading from the
  // front, with a short rule under it toward the pin.
  const P = layer();
  {
    const g = P.g;
    g.textAlign = 'center';
    g.textBaseline = 'alphabetic';
    g.font = `600 ${(MARK.size / 0.72).toFixed(2)}px ${SANS}`;
    DABS.forEach((d) => {
      const l = d.r + MARK.label, x = d.x + d.inward[0] * l, z = d.z + d.inward[1] * l;
      g.save();
      g.translate(x, z);
      g.rotate(Math.atan2(d.along[1], d.along[0]));
      g.fillText(STEPS[d.step].name, 0, MARK.size / 2);
      g.fillRect(-0.12, -MARK.size / 2 - 2.2, 0.24, 1.3);
      g.restore();
    });
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
    g.fillText('PW·07', 0, 3.4);
    g.beginPath();
    for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2 - Math.PI / 2, rr = k % 2 ? 0.6 : 1.4; g.lineTo(-7.4 + Math.cos(a) * rr, 0.6 + Math.sin(a) * rr); }
    g.fill();
    g.beginPath();
    for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2 - Math.PI / 2, rr = k % 2 ? 0.6 : 1.4; g.lineTo(7.4 + Math.cos(a) * rr, 0.6 + Math.sin(a) * rr); }
    g.fill();
    g.restore();
  }
  const R = layer();
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
