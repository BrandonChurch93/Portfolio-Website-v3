import * as THREE from 'three';
import { DESK, PLACES, VIEW } from '../../layout';

// The headphones on their stand, in the desk's millimetres. The pair's own frame has the point where the band bears on
// the saddle at its origin: x runs ear to ear, from the left cup to the right, y is up, and z is across the band, toward
// the front of the pair. The stand is built in the same turned frame, from the middle of its foot on the timber.

const D2R = Math.PI / 180;
export const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// Where the foot stands, and how far the pair and its stand are turned about the upright. From the page's view, which
// is 24 degrees round to the left, a turn of 16 sets the ear to ear line 40 degrees off the screen's plane: the left
// cup shows its outer face, the right one its cushion, and the band's arc is seen nearly whole.
export const FOOT_AT = V(PLACES.headphones[0], 0, PLACES.headphones[1]);
export const TURN = 16 * D2R;
// How high above the top the band bears on the saddle: the rails' crown stands about level with the lamp's shade.
export const BEAR_Y = 440;

// The cups. The shell is a deep rounded oblong, ry tall and rz across, a superellipse of power n, from where it meets
// the cushion (x = joint) out to its face (deep). The cushion stands pad in from the joint.
export const CUP = { joint: 70, deep: 31, pad: 21, ry: 46, rz: 37, n: 3.1, y: -173, edge: 10 };
// The stem's line, and the pivot the cup hangs on at its foot: the barrel's middle, its radius and half length.
export const STEM = { x: 85, foot: -121, top: -92, w: 5, t: 2.7 };
export const PIVOT = { y: CUP.y + CUP.ry + 5, r: 4.4, half: 9 };

// The band's frame, two rails over a knitted canopy: the arches' middle height, the rails' half span and rise, and
// the canopy's under them. The canopy is pressed up into the saddle's curve where it bears.
export const ARCH = { cy: -62, rx: STEM.x, ry: 75, crx: 80, cry: 56 };
export const RAIL = { z: 16.5, w: 2.3, t: 2.9 };
export const CANOPY = { w: 19.5, t: 1.35 };

// The stand: the saddle's curve and half length, the pad's half width and thickness, the cradle under it, the post
// and the foot.
export const SADDLE = { r: 55, half: 33, wide: 23, pad: 7.5, cradle: 10, deep: 28 };
export const POST = { r: 8, rTop: 5.6, top: BEAR_Y - SADDLE.pad - SADDLE.deep - 12 };
export const BASE = { r: 66, h: 13 };

// The cups' lag behind the band, against the band's angle and its speed in radians a second, and the most it may be.
export const LAG = { angle: 0.24, speed: 0.07, most: 0.13 };

// The saddle's top at x, where the pad's face is: a circle through the bearing point.
export const saddleTop = (x: number) => -(SADDLE.r - Math.sqrt(Math.max(0, SADDLE.r * SADDLE.r - x * x)));
const smax = (a: number, b: number, k: number) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.max(a, b) + (h * h * k) / 4; };
// The canopy's underside at x: its own arch, pressed up onto the pad where the pad is higher.
export function canopyUnder(x: number): number {
  const k = Math.max(0, 1 - (x / ARCH.crx) ** 2), own = ARCH.cy + ARCH.cry * Math.sqrt(k);
  const pad = Math.abs(x) < SADDLE.half ? saddleTop(x) + 0.5 : -1e3;
  return smax(own, pad, 3);
}

// The pair's frame and the stand's, in the desk.
export const PAIR_Q = new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), TURN);
export const BEAR = FOOT_AT.clone().setY(BEAR_Y);

// The desk's camera at rest, as src/pieces/desk/index.ts places it, for measuring where things are drawn.
const CAMERA = (() => {
  const cam = new THREE.PerspectiveCamera(VIEW.fov, 1.6, 0.05, 40);
  const aim = V(...VIEW.aim), reach = VIEW.tall / 2;
  const a = VIEW.az * D2R, e = VIEW.el * D2R, d = reach / Math.tan((VIEW.fov / 2) * D2R);
  cam.position.set(aim.x + d * Math.cos(e) * Math.sin(a), aim.y + d * Math.sin(e), aim.z + d * Math.cos(e) * Math.cos(a));
  cam.lookAt(aim);
  cam.updateMatrixWorld(true);
  cam.updateProjectionMatrix();
  return cam;
})();
// Where a point of the desk is drawn, in host heights across and down from the host's middle.
export function drawn(p: THREE.Vector3): [number, number] {
  const v = p.clone().multiplyScalar(DESK.SCALE).project(CAMERA);
  return [(v.x * CAMERA.aspect) / 2, -v.y / 2];
}

// ---- geometry ----------------------------------------------------------------------------------------------------

// A section of a loft: half sizes across (z) and up (y) of a superellipse, where it stands along the axis (x), and
// what it is made of.
export interface Sec { z: number; y: number; x: number; kind?: number }

const sup = (a: number, n: number): [number, number] => {
  const c = Math.cos(a), s = Math.sin(a), e = 2 / n;
  return [Math.sign(c) * Math.abs(c) ** e, Math.sign(s) * Math.abs(s) ** e];
};

// The angles that cut a superellipse's outline into seg equal lengths: cut by equal angles, its corners were too
// coarse and the long reflections on a cup wobbled across them.
function even(hz: number, hy: number, n: number, seg: number): number[] {
  const N = 720, len = [0];
  let [pz, py] = sup(0, n);
  for (let i = 1; i <= N; i++) { const [cz, cy] = sup((i / N) * Math.PI * 2, n); len.push(len[i - 1] + Math.hypot((cz - pz) * hz, (cy - py) * hy)); pz = cz; py = cy; }
  const out: number[] = [];
  for (let i = 0, k = 0; i <= seg; i++) {
    const want = (i / seg) * len[N];
    while (k < N - 1 && len[k + 1] < want) k++;
    const f = (want - len[k]) / Math.max(1e-9, len[k + 1] - len[k]);
    out.push(((k + Math.min(1, Math.max(0, f))) / N) * Math.PI * 2);
  }
  return out;
}

// A loft of superellipse sections along x, smooth all round, its uv in millimetres: u round the outline, v along the
// profile, and each section's kind in the cell attribute's x. Where the kind changes, the ring is doubled so a kind
// never blends across a triangle, and the two meet at a crisp edge. Its faces are turned to look along `out` at the
// section `probe`.
export function loft(secs: Sec[], n: number, seg: number, probe: number, out: (p: THREE.Vector3) => THREE.Vector3): THREE.BufferGeometry {
  const rows: Sec[] = [];
  secs.forEach((s, i) => { if (i && s.kind !== secs[i - 1].kind) rows.push({ ...secs[i - 1], kind: s.kind }); rows.push(s); });
  const pos: number[] = [], uv: number[] = [], kind: number[] = [], idx: number[] = [];
  const W = seg + 1;
  let along = 0;
  rows.forEach((s, j) => {
    if (j) { const p = rows[j - 1]; along += Math.hypot(s.x - p.x, (s.z + s.y) / 2 - (p.z + p.y) / 2); }
    const at = even(s.z, s.y, n, seg);
    let round = 0, px = 0, py = 0;
    for (let i = 0; i <= seg; i++) {
      const [cz, cy] = sup(at[i], n), z = s.z * cz, y = s.y * cy;
      if (i) round += Math.hypot(z - px, y - py);
      px = z; py = y;
      pos.push(s.x, y, z);
      uv.push(round, along);
      kind.push(s.kind ?? 0, 0, 0, 0);
    }
  });
  for (let j = 0; j < rows.length - 1; j++) for (let i = 0; i < seg; i++) { const a = j * W + i; idx.push(a, a + W, a + 1, a + 1, a + W, a + W + 1); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('cell', new THREE.Float32BufferAttribute(kind, 4));
  g.setIndex(idx);
  g.computeVertexNormals();
  // Seams round the outline share their normals, so the ring's start does not show as a crease.
  const nn = g.getAttribute('normal');
  for (let j = 0; j < rows.length; j++) {
    const a = j * W, b = j * W + seg;
    const m = V(nn.getX(a) + nn.getX(b), nn.getY(a) + nn.getY(b), nn.getZ(a) + nn.getZ(b)).normalize();
    nn.setXYZ(a, m.x, m.y, m.z); nn.setXYZ(b, m.x, m.y, m.z);
  }
  const at = Math.min(rows.length - 1, Math.max(0, rows.indexOf(secs[probe]))) * W + Math.round(seg / 8);
  const p = V(pos[at * 3], pos[at * 3 + 1], pos[at * 3 + 2]);
  if (V(nn.getX(at), nn.getY(at), nn.getZ(at)).dot(out(p)) < 0) {
    for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
    g.setIndex(idx);
    for (let i = 0; i < nn.count; i++) nn.setXYZ(i, -nn.getX(i), -nn.getY(i), -nn.getZ(i));
  }
  return g;
}

// A superellipse section, hu across `side` and hv square to it, swept along a path in a plane square to `side`. Its
// uv is in millimetres: u across, v along the path. The section shrinks to `ends` of its size over the last `taper`
// points at each end, to close it softly, and its faces look out from the path.
export function sweep(path: THREE.Vector3[], side: THREE.Vector3, hu: number, hv: number, n: number, seg = 16, o: { taper?: number; ends?: number } = {}): THREE.BufferGeometry {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const T = V(0, 0, 0), N = V(0, 0, 0);
  const taper = o.taper ?? 0, ends = o.ends ?? 1;
  let along = 0;
  for (let i = 0; i < path.length; i++) {
    if (i) along += path[i].distanceTo(path[i - 1]);
    T.copy(path[Math.min(path.length - 1, i + 1)]).sub(path[Math.max(0, i - 1)]).normalize();
    N.copy(side).cross(T).normalize();
    const e = Math.min(i, path.length - 1 - i), k = taper && e < taper ? ends + (1 - ends) * Math.sin(((e / taper) * Math.PI) / 2) : 1;
    for (let j = 0; j <= seg; j++) {
      const [cu, cv] = sup((j / seg) * Math.PI * 2, n), u = hu * cu * k, v = hv * cv * Math.sqrt(k);
      pos.push(path[i].x + side.x * u + N.x * v, path[i].y + side.y * u + N.y * v, path[i].z + side.z * u + N.z * v);
      uv.push(u, along);
    }
  }
  const W = seg + 1;
  for (let i = 0; i < path.length - 1; i++) for (let j = 0; j < seg; j++) { const a = i * W + j; idx.push(a, a + 1, a + W, a + 1, a + W + 1, a + W); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const nn = g.getAttribute('normal'), mid = Math.floor(path.length / 2), at = mid * W + Math.round(seg / 4);
  const outward = V(pos[at * 3], pos[at * 3 + 1], pos[at * 3 + 2]).sub(path[mid]);
  if (outward.dot(V(nn.getX(at), nn.getY(at), nn.getZ(at))) < 0) {
    for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
    g.setIndex(idx);
    for (let i = 0; i < nn.count; i++) nn.setXYZ(i, -nn.getX(i), -nn.getY(i), -nn.getZ(i));
  }
  return g;
}

// A turned profile, [radius, height] in order up the part, cut into runs at its sharp corners so each turned edge
// keeps a crisp line of light.
export function turned(pts: [number, number][], seg = 96, crease = 34): THREE.BufferGeometry[] {
  const runs: [number, number][][] = [[pts[0]]];
  for (let i = 1; i < pts.length; i++) {
    const cur = runs[runs.length - 1];
    cur.push(pts[i]);
    if (i < pts.length - 1) {
      const a = Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]), b = Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]);
      let d = Math.abs(a - b) * (180 / Math.PI);
      if (d > 180) d = 360 - d;
      if (d > crease) runs.push([pts[i]]);
    }
  }
  return runs.filter((r) => r.length > 1).map((r) => {
    const g = new THREE.LatheGeometry(r.map(([x, y]) => new THREE.Vector2(Math.max(x, 0.0001), y)), seg);
    // Its uv in millimetres: round the part and up its profile.
    const p = g.getAttribute('position'), uv = g.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) uv.setXY(i, Math.atan2(p.getZ(i), p.getX(i)) * Math.hypot(p.getX(i), p.getZ(i)), p.getY(i));
    return g;
  });
}

// A frame whose y axis is `y` and whose z axis is as near `z` as it can be.
export function frame(at: THREE.Vector3, y: THREE.Vector3, z: THREE.Vector3): THREE.Matrix4 {
  const Y = y.clone().normalize(), Z = z.clone().addScaledVector(Y, -z.dot(Y)).normalize(), X = Y.clone().cross(Z);
  return new THREE.Matrix4().makeBasis(X, Y, Z).setPosition(at);
}
