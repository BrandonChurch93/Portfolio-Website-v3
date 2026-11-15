import * as THREE from 'three';
import { Builder } from '../../../../world/build';

// Shapes a joiner's bench is made of, in millimetres.

type P = [number, number];

// Drops triangles with no area and gives every normal a length: a zero normal is a NaN in the shader, and one NaN
// pixel spreads through the bloom over the whole canvas.
export function sound(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo;
  if (!g.getAttribute('normal')) g.computeVertexNormals();
  const names = Object.keys(g.attributes), p = g.getAttribute('position'), n = g.getAttribute('normal');
  const keep: number[] = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), f = new THREE.Vector3();
  for (let t = 0; t < p.count; t += 3) {
    a.fromBufferAttribute(p, t); b.fromBufferAttribute(p, t + 1); c.fromBufferAttribute(p, t + 2);
    f.subVectors(c, b).cross(a.sub(b));
    if (f.length() < 1e-7) continue;
    f.normalize();
    for (let k = 0; k < 3; k++) {
      const x = n.getX(t + k), y = n.getY(t + k), z = n.getZ(t + k), l = Math.hypot(x, y, z);
      if (!(l > 1e-6)) n.setXYZ(t + k, f.x, f.y, f.z);
      else n.setXYZ(t + k, x / l, y / l, z / l);
    }
    keep.push(t, t + 1, t + 2);
  }
  const out = new THREE.BufferGeometry();
  for (const name of names) {
    const src = g.getAttribute(name), size = src.itemSize, arr = new Float32Array(keep.length * size);
    keep.forEach((v, i) => { for (let k = 0; k < size; k++) arr[i * size + k] = src.array[v * size + k] as number; });
    out.setAttribute(name, new THREE.Float32BufferAttribute(arr, size));
  }
  return out;
}

// A builder that makes every geometry sound before it is merged.
export class SoundBuilder extends Builder {
  override add(geo: THREE.BufferGeometry, mat: THREE.Material, m?: THREE.Matrix4, opts?: { shadow?: boolean; uv?: 'box' | 'keep'; tile?: number }): void {
    super.add(sound(geo), mat, m, opts);
  }
}

// A closed outline with each corner rounded by its own radius (0 leaves it sharp).
export function outline(pts: P[], radii: number[], seg = 4): THREE.Shape {
  const s = new THREE.Shape();
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const [px, py] = pts[(i + n - 1) % n], [cx, cy] = pts[i], [nx, ny] = pts[(i + 1) % n], r = radii[i] ?? 0;
    const a = Math.hypot(px - cx, py - cy), b = Math.hypot(nx - cx, ny - cy);
    const ax = (px - cx) / a, ay = (py - cy) / a, bx = (nx - cx) / b, by = (ny - cy) / b;
    if (r <= 0) { if (i === 0) s.moveTo(cx, cy); else s.lineTo(cx, cy); continue; }
    const half = Math.acos(Math.max(-1, Math.min(1, ax * bx + ay * by))) / 2, d = Math.min(r / Math.tan(half), a * 0.49, b * 0.49);
    const p0: P = [cx + ax * d, cy + ay * d], p1: P = [cx + bx * d, cy + by * d];
    if (i === 0) s.moveTo(...p0); else s.lineTo(...p0);
    for (let k = 1; k <= seg; k++) {
      const t = k / seg, u = 1 - t;
      s.lineTo(u * u * p0[0] + 2 * u * t * cx + t * t * p1[0], u * u * p0[1] + 2 * u * t * cy + t * t * p1[1]);
    }
  }
  s.closePath();
  return s;
}

// An outline drawn in a cross section and run along x, from x0 to x1, its ends eased by ease. The outline's x is
// the desk's z, its y the desk's y.
export function runX(shape: THREE.Shape, x0: number, x1: number, ease: number, seg = 3): THREE.BufferGeometry {
  const g = new THREE.ExtrudeGeometry(shape, { depth: x1 - x0 - 2 * ease, bevelEnabled: ease > 0, bevelThickness: ease, bevelSize: ease, bevelOffset: -ease, bevelSegments: seg, curveSegments: 4 });
  g.rotateY(-Math.PI / 2);
  g.translate(x1 - ease, 0, 0);
  return g;
}

// The same, run along z from z0 to z1, its outline's x the desk's x.
export function runZ(shape: THREE.Shape, z0: number, z1: number, ease: number, seg = 3): THREE.BufferGeometry {
  const g = new THREE.ExtrudeGeometry(shape, { depth: z1 - z0 - 2 * ease, bevelEnabled: ease > 0, bevelThickness: ease, bevelSize: ease, bevelOffset: -ease, bevelSegments: seg, curveSegments: 4 });
  g.translate(0, 0, z0 + ease);
  return g;
}

// A square bar with its long arrises chamfered, the chamfer stopped short of each end where the bar is framed into
// something, as a joiner stops one: c at the ends, big over the middle, ramping between over ramp. It runs along y
// from y0 to y1, w across x and d across z, centred on (x, z). Flat faces, so each chamfer catches its own line of
// light.
export function stoppedPost(x: number, z: number, y0: number, y1: number, w: number, d: number, c: number, big: number, stop: number, ramp: number): THREE.BufferGeometry {
  const L = y1 - y0;
  const st: [number, number][] = [[0, c], [stop, c], [stop + ramp, big], [L - stop - ramp, big], [L - stop, c], [L, c]];
  const ring = (ch: number): P[] => {
    const hw = w / 2, hd = d / 2;
    return [[hw - ch, -hd], [hw, -hd + ch], [hw, hd - ch], [hw - ch, hd], [-hw + ch, hd], [-hw, hd - ch], [-hw, -hd + ch], [-hw + ch, -hd]];
  };
  const pos: number[] = [];
  const quad = (a: number[], b: number[], c2: number[], d2: number[]) => pos.push(...a, ...b, ...c2, ...a, ...c2, ...d2);
  for (let i = 0; i < st.length - 1; i++) {
    const ra = ring(st[i][1]), rb = ring(st[i + 1][1]), ya = y0 + st[i][0], yb = y0 + st[i + 1][0];
    for (let k = 0; k < 8; k++) {
      const k2 = (k + 1) % 8;
      quad([x + ra[k][0], ya, z + ra[k][1]], [x + rb[k][0], yb, z + rb[k][1]], [x + rb[k2][0], yb, z + rb[k2][1]], [x + ra[k2][0], ya, z + ra[k2][1]]);
    }
  }
  for (const [y, rr, up] of [[y0, ring(c), false], [y1, ring(c), true]] as [number, P[], boolean][]) {
    for (let k = 1; k < 7; k++) {
      const a = [x + rr[0][0], y, z + rr[0][1]], b = [x + rr[k][0], y, z + rr[k][1]], e = [x + rr[k + 1][0], y, z + rr[k + 1][1]];
      if (up) pos.push(...a, ...e, ...b); else pos.push(...a, ...b, ...e);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

// A bar lofted through sections along y, each w across x and d across z with its arrises chamfered by c, centred
// on the y axis, closed at both ends. Flat faces, so every chamfer catches its own line of light.
export function loftBar(sections: { y: number; w: number; d: number; c: number }[]): THREE.BufferGeometry {
  const ring = (w: number, d: number, c: number): P[] => {
    const hw = w / 2, hd = d / 2, ch = Math.min(c, hw * 0.9, hd * 0.9);
    return [[hw - ch, -hd], [hw, -hd + ch], [hw, hd - ch], [hw - ch, hd], [-hw + ch, hd], [-hw, hd - ch], [-hw, -hd + ch], [-hw + ch, -hd]];
  };
  const pos: number[] = [];
  for (let i = 0; i < sections.length - 1; i++) {
    const a = sections[i], b = sections[i + 1], ra = ring(a.w, a.d, a.c), rb = ring(b.w, b.d, b.c);
    for (let k = 0; k < 8; k++) {
      const k2 = (k + 1) % 8;
      const p = [ra[k][0], a.y, ra[k][1]], q = [rb[k][0], b.y, rb[k][1]], r = [rb[k2][0], b.y, rb[k2][1]], s = [ra[k2][0], a.y, ra[k2][1]];
      pos.push(...p, ...q, ...r, ...p, ...r, ...s);
    }
  }
  const first = sections[0], last = sections[sections.length - 1];
  for (const [sec, up] of [[first, false], [last, true]] as [typeof first, boolean][]) {
    const rr = ring(sec.w, sec.d, sec.c);
    for (let k = 1; k < 7; k++) {
      const a = [rr[0][0], sec.y, rr[0][1]], b = [rr[k][0], sec.y, rr[k][1]], e = [rr[k + 1][0], sec.y, rr[k + 1][1]];
      if (up) pos.push(...a, ...e, ...b); else pos.push(...a, ...b, ...e);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

// A peg through a joint: a round pin along x, its ends chamfered and standing a little proud of both faces.
export function peg(r: number, len: number, proud: number, ch: number): THREE.BufferGeometry {
  const h = len / 2 + proud;
  const pts: [number, number][] = [[0, -h], [r - ch, -h], [r, -h + ch], [r, h - ch], [r - ch, h], [0, h]];
  return new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 20).rotateZ(Math.PI / 2);
}

// A slotted screw's head, raised a little as an oval head is, on a face that looks at +z: the slot turned by turn.
export function screwHead(R: number, turn: number): THREE.BufferGeometry {
  const half = 0.55, xs: number[] = [], ys: number[] = [];
  for (let i = 0; i <= 12; i++) xs.push(-R + (i / 12) * 2 * R);
  xs.push(-half - 0.02, -half, half, half + 0.02);
  const X = [...new Set(xs.map((v) => +v.toFixed(3)))].sort((a, b) => a - b);
  for (let i = 0; i <= 16; i++) ys.push(-R + (i / 16) * 2 * R);
  const pos: number[] = [], idx: number[] = [];
  for (const y of ys) for (const x0 of X) {
    let x = x0, yy = y;
    const r = Math.hypot(x, yy);
    if (r > R) { x *= R / r; yy *= R / r; }
    const rr = Math.min(1, Math.hypot(x, yy) / R);
    let h = 0.25 + 0.95 * Math.sqrt(Math.max(0, 1 - rr * rr));
    if (Math.abs(x0) <= half + 1e-6 && rr < 0.97) h = 0.2;
    if (rr >= 0.999) h = 0;
    const c = Math.cos(turn), s = Math.sin(turn);
    pos.push(x * c - yy * s, x * s + yy * c, h);
  }
  const W = X.length;
  for (let j = 0; j < ys.length - 1; j++) for (let i = 0; i < W - 1; i++) {
    const a = j * W + i;
    idx.push(a, a + 1, a + W + 1, a, a + W + 1, a + W);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// A wedge: a block w across x, tapering from t1 thick at the top to t0 at the foot along z, h tall.
export function wedge(x: number, y: number, z: number, w: number, t0: number, t1: number, h: number): THREE.BufferGeometry {
  const v = (dx: number, dy: number, dz: number) => [x + dx, y + dy, z + dz];
  const a = [v(-w / 2, -h / 2, -t0 / 2), v(w / 2, -h / 2, -t0 / 2), v(w / 2, -h / 2, t0 / 2), v(-w / 2, -h / 2, t0 / 2)];
  const b = [v(-w / 2, h / 2, -t1 / 2), v(w / 2, h / 2, -t1 / 2), v(w / 2, h / 2, t1 / 2), v(-w / 2, h / 2, t1 / 2)];
  const pos: number[] = [];
  const quad = (p: number[], q: number[], r: number[], s: number[]) => pos.push(...p, ...q, ...r, ...p, ...r, ...s);
  quad(a[0], a[1], a[2], a[3]);
  quad(b[0], b[3], b[2], b[1]);
  for (let k = 0; k < 4; k++) { const k2 = (k + 1) % 4; quad(a[k], b[k], b[k2], a[k2]); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}
