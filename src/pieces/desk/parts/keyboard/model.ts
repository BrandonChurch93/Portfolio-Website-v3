import * as THREE from 'three';
import { lathe, rbox } from '../../../../world/build';
import { ATLAS, ATLAS_PX, CAP, CASE, CD, CW, D2R, KEYS, KNOB, ROW, U, type Key } from './layout';
import { KIND } from './materials';
import { outline, rings, tag } from './shapes';

const TAN = Math.tan(CASE.tilt * D2R);

// How high the case's rim stands at a place along its depth: the top of the case is a wedge, higher at the back.
export const rimAt = (z: number) => CASE.feet + CASE.front + (CD / 2 - z) * TAN;
// Where the board's frame sits in the keyboard's: the plate's top at the middle of the case, tipped back.
export const BOARD_AT = { y: rimAt(0) - CASE.plate, tilt: CASE.tilt * D2R } as const;

// The case, as a profile run round its outline: insets from the outer edge and heights, from the foot of the tray up
// over the rim and down inside the well to below the plate. A cut face is the bare metal a diamond cutter leaves:
// the chamfer round the top and the small one round the well.
const H = CASE.front, IN = CASE.bezel;
const PROFILE: [inset: number, y: number, cut: boolean][] = [
  [1.4, 0, false], [0, 1.4, false], [0, CASE.seam - 0.9, false], [0.45, CASE.seam - 0.45, false], [0, CASE.seam, false],
  [0, H - 1.8, false], [1.8, H, true], [IN - 0.6, H, false], [IN, H - 0.6, true], [IN, H - CASE.plate - 1, false],
];

// Marks every vertex of a part as one kind of surface.
export const kind = (g: THREE.BufferGeometry, k: number, at = 0) => tag(g, () => [at, 0, 0, k]);

// The case's tray and top: two meshes, the anodised body and the cut faces. Above the seam the top is sheared into
// the wedge. Normals are worked out from the profile, so the faces are flat across and round only at the corners.
export function caseGeometry(): { body: THREE.BufferGeometry; cut: THREE.BufferGeometry } {
  const out = { body: [] as number[][], cut: [] as number[][] };
  const ring = (i: number) => outline(CW - 2 * i, CD - 2 * i, Math.max(0.8, CASE.r - i), 8, 48, 18);
  for (let j = 0; j < PROFILE.length - 1; j++) {
    const [i0, y0] = PROFILE[j], [i1, y1, cut] = PROFILE[j + 1];
    const A = ring(i0), B = ring(i1), pos: number[] = [], nor: number[] = [];
    const vert = (o: typeof A, k: number, y: number) => {
      const [x, z] = o.p[k], [ox, oz] = o.n[k];
      // The profile's normal: outward by the rise, up by the step in.
      let nx = ox * (y1 - y0), ny = i1 - i0, nz = oz * (y1 - y0);
      let yy = y + CASE.feet;
      if (y > CASE.seam + 0.01) { yy += (CD / 2 - z) * TAN; nz += TAN * ny; }
      const l = Math.hypot(nx, ny, nz) || 1;
      pos.push(x, yy, z);
      nor.push(nx / l, ny / l, nz / l);
    };
    const n = A.p.length;
    for (let k = 0; k < n; k++) {
      const k1 = (k + 1) % n;
      vert(A, k, y0); vert(B, k, y1); vert(A, k1, y0);
      vert(A, k1, y0); vert(B, k, y1); vert(B, k1, y1);
    }
    (cut ? out.cut : out.body).push(pos, nor);
  }
  const make = (list: number[][]) => {
    const pos: number[] = [], nor: number[] = [];
    for (let i = 0; i < list.length; i += 2) { pos.push(...list[i]); nor.push(...list[i + 1]); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    return g;
  };
  return { body: kind(make(out.body), KIND.body), cut: kind(make(out.cut), KIND.cut) };
}

// The plate the switches stand in, in the board's frame: it runs under the well's walls.
export function plateGeometry(): THREE.BufferGeometry {
  const o = outline(CW - 2 * IN + 1.6, CD - 2 * IN + 1.6, Math.max(0.8, CASE.r - IN), 6, 24, 10);
  const s = new THREE.Shape(o.p.map(([x, z]) => new THREE.Vector2(x, -z)));
  return kind(new THREE.ShapeGeometry(s).rotateX(-Math.PI / 2), KIND.plate);
}

// One cap, sculpted for its row: a skirt that narrows to a smaller top, a rounded top edge, and a top that leans
// with the row and is dished across. The cell attribute carries the key's number, the height over the skirt's foot
// and whether it is an accent cap.
export function capGeometry(k: Key): THREE.BufferGeometry {
  const bw = k.w * U - CAP.gap, bd = U - CAP.gap, tw = k.w * U - 6.2, td = U - 6.6, f = CAP.fillet;
  const lean = Math.tan(ROW.tilt[k.row] * D2R), tall = ROW.h[k.row], dish = k.w >= 6 ? 0.22 : CAP.dish;
  const top = (x: number, z: number) => CAP.y + tall - z * lean - dish * (1 - Math.min(1, (x / (tw / 2)) ** 2));
  const ex = Math.max(2, Math.round(tw / 3.2)), ez = 3, c = 3;
  const B = outline(bw, bd, 1.4, c, ex, ez), T = outline(tw, td, 2.6, c, ex, ez);
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x + k.x, y, z + k.z);
  const list: THREE.Vector3[][] = [];
  list.push(B.p.map(([x, z]) => V(x, CAP.y, z)));
  list.push(T.p.map(([x, z], i) => V(x + T.n[i][0] * f, top(x, z) - f, z + T.n[i][1] * f)));
  for (const a of [Math.PI / 4, Math.PI / 2]) list.push(T.p.map(([x, z], i) => V(x + T.n[i][0] * f * Math.cos(a), top(x, z) - f + f * Math.sin(a), z + T.n[i][1] * f * Math.cos(a))));
  for (const s of [0.62, 0.26]) list.push(T.p.map(([x, z]) => V(x * s, top(x * s, z * s), z * s)));
  const g = rings(list, V(0, top(0, 0), 0));
  return tag(g, (_x, y) => [k.i, y - CAP.y, k.accent ? 1 : 0, KIND.cap]);
}

// The switch under a cap, the part of it that shows: its housing with a clear top the key's light comes up through.
export function housingGeometry(k: Key): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(14, CAP.housing, 14).translate(k.x, CAP.housing / 2, k.z);
  return tag(g, (_x, y) => [k.i, y, 0, KIND.housing]);
}

// A long key's stabiliser: a housing at each end standing in the plate, and the steel wire between them along the
// key's front edge, where the gap in front of the cap lets it be seen.
export function stabiliserGeometry(k: Key): { housings: THREE.BufferGeometry[]; wire: THREE.BufferGeometry } | null {
  if (k.w < 2) return null;
  const span = k.w >= 6 ? 50 : 11.9, z = k.z + 4.2;
  const housings = [-1, 1].map((s) => kind(new THREE.BoxGeometry(6.4, 6.2, 12.4).translate(k.x + s * span, 3.1, k.z), KIND.rubber));
  const wire = new THREE.CylinderGeometry(0.6, 0.6, 2 * span + 3, 10).rotateZ(Math.PI / 2).translate(k.x, 1.6, z + 4.4);
  return { housings, wire: kind(wire, KIND.cut) };
}

// The volume knob: a short dark collar and a turned copper knob with a dished top.
export function knobGeometry(): { collar: THREE.BufferGeometry; knob: THREE.BufferGeometry; mark: THREE.BufferGeometry } {
  const { x, z, r, h } = KNOB, y0 = 4.6, y1 = y0 + h;
  const collar = lathe([[0, 0], [7.4, 0], [7.4, 4.2], [6.8, 4.8], [0, 4.8]], 48).translate(x, 0, z);
  const knob = lathe([[0, y0], [r - 0.6, y0], [r, y0 + 0.6], [r, y1 - 0.9], [r - 0.3, y1 - 0.25], [r - 1, y1], [r - 1.6, y1 - 0.1], [2, y1 - 0.45], [0, y1 - 0.5]], 72).translate(x, 0, z);
  const mark = rbox(0.9, 0.4, 4.2, 0.2).translate(x, y1 - 0.18, z - r + 3.6);
  return { collar: kind(collar, KIND.dark), knob: kind(knob, KIND.knob), mark: kind(mark, KIND.dark) };
}

// The rubber feet under the case's four corners.
export function feetGeometry(): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) out.push(kind(rbox(30, CASE.feet + 0.6, 9, 0.5).translate(sx * (CW / 2 - 28), (CASE.feet + 0.6) / 2 - 0.6, sz * (CD / 2 - 13)), KIND.rubber));
  return out;
}

// The three small lights on the back of the rim beside the knob: the link, the battery and the lock.
export const DOTS: [number, number][] = [0, 1, 2].map((i) => [KNOB.x - 30 - i * 6, -CD / 2 + IN / 2 + 0.4]);
export function dotGeometry([x, z]: [number, number], i: number): THREE.BufferGeometry {
  return kind(new THREE.CircleGeometry(0.85, 20).rotateX(-Math.PI / 2).rotateX(CASE.tilt * D2R).translate(x, rimAt(z) + 0.04, z), KIND.dot, i);
}

// The legends, drawn once as the board seen from above. They are cut through the caps and lit from under them.
export function legendAtlas(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = ATLAS.w;
  c.height = ATLAS.h;
  const g = c.getContext('2d')!;
  g.fillStyle = '#fff';
  g.strokeStyle = '#fff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineCap = 'round';
  g.lineJoin = 'round';
  const px = (mm: number) => mm * ATLAS_PX;
  const font = (mm: number) => `600 ${Math.round(px(mm))}px "Helvetica Neue", Helvetica, Arial, sans-serif`;
  const arrow = (cx: number, cy: number, a: number) => {
    const L = px(2.1), hd = px(0.95);
    g.save();
    g.translate(cx, cy);
    g.rotate(a);
    g.lineWidth = px(0.42);
    g.beginPath();
    g.moveTo(-L, 0); g.lineTo(L, 0);
    g.moveTo(L - hd, -hd); g.lineTo(L, 0); g.lineTo(L - hd, hd);
    g.stroke();
    g.restore();
  };
  for (const k of KEYS) {
    const cx = px(k.x - ATLAS.x0), cy = px(k.z - ATLAS.z0);
    if (!k.legend) continue;
    if (k.legend === '↑') { arrow(cx, cy, -Math.PI / 2); continue; }
    if (k.legend === '↓') { arrow(cx, cy, Math.PI / 2); continue; }
    if (k.legend === '←') { arrow(cx, cy, Math.PI); continue; }
    if (k.legend === '→') { arrow(cx, cy, 0); continue; }
    if (k.legend === '◇') {
      const s = px(1.7);
      g.lineWidth = px(0.38);
      g.beginPath(); g.moveTo(cx, cy - s); g.lineTo(cx + s, cy); g.lineTo(cx, cy + s); g.lineTo(cx - s, cy); g.closePath(); g.stroke();
      g.beginPath(); g.arc(cx, cy, px(0.45), 0, Math.PI * 2); g.fill();
      continue;
    }
    const word = k.legend.length > 1 && !/^F\d/.test(k.legend);
    const size = word ? 2.35 : /^F\d/.test(k.legend) ? 2.6 : 4.4;
    g.font = font(size);
    g.fillText(k.legend, cx, cy + px(size * 0.04));
  }
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 8;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  return t;
}
