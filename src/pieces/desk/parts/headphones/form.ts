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
// The shell's profile: its straight side runs to `side`, its soft edge turns `turn` toward the face, and a polished
// chamfer cut at the edge's foot draws in to the face, which is a shallow dome. The face's half sizes and where its
// middle stands from the cup's joint follow from these.
const SIDE = CUP.deep - CUP.edge - 1, TURN_TO = (62 * Math.PI) / 180;
const D1 = 1.3 + CUP.edge * (1 - Math.cos(TURN_TO)), X1 = SIDE + CUP.edge * Math.sin(TURN_TO);
export const SHELL = { side: SIDE, turn: TURN_TO, x1: X1, d1: D1, x2: X1 + 0.9, d2: D1 + 1.5, dome: 0.9, groove: 9.5, cut: 0.5 };
// The stem's line, and the pivot the cup hangs on at its foot: the barrel's middle, its radius and half length.
export const STEM = { x: 85, foot: -121, top: -92, w: 5, t: 2.7 };
export const PIVOT = { y: CUP.y + CUP.ry + 5, r: 4.4, half: 9 };
// The cup's face, in the pivot's frame, across (z) and up (y) from its middle: its half sizes and the superellipse of
// its outline. On it, from the rim in: an anodised band with a screw in each corner, a polished bead, a field of fine
// perforations, and the turned medallion in the middle, which stands proud of the face, with a ring of engraved
// ticks and a copper line let into it.
export const FACE = {
  yc: CUP.y - PIVOT.y, fz: CUP.rz - SHELL.d2, fy: CUP.ry - SHELL.d2, n: CUP.n,
  band: 0.8, bead: 0.772, screw: 0.9, screwR: 1.75,
  medal: 14, proud: 0.65, holes: [2.4, 0.74] as [number, number], rings: 1.9,
  ticks: [9.4, 10.5, 11.8], inlay: [12.3, 13.0],
};

// The band's frame, two rails over a knitted canopy: the arches' middle height, the rails' half span and rise, and
// the canopy's under them. The canopy is pressed up into the saddle's curve where it bears.
export const ARCH = { cy: -62, rx: STEM.x, ry: 75, crx: 80, cry: 56 };
export const RAIL = { z: 16.5, w: 2.7, t: 0.85 };
export const CANOPY = { w: 19.5, t: 1.35 };

// The stand: the saddle's curve and half length, the pad's half width and thickness, the cradle under it, the post
// and the foot.
export const SADDLE = { r: 55, half: 33, wide: 23, pad: 7.5, cradle: 10, deep: 28 };
// The foot: a weighted disc, its top a hide pad let in between a polished rim and a turned boss, and on the boss the
// knuckle the post stands in: two cheeks with a pin across them, the post's flat tang between.
export const BASE = { r: 62, h: 11, pad: [20.5, 55] as [number, number], sink: 0.7, boss: 15 };
export const KNUCKLE = { y: BASE.h + 19, gap: 3.1, cheek: 2.4, r: 6.6, pin: 2.1 };
// The post, from the knuckle up, tapering; and the hook a cable hangs on, out to the stand's right.
export const POST = { r: 5.4, rTop: 4.4, from: KNUCKLE.y + 9, top: BEAR_Y - SADDLE.pad - SADDLE.deep - 12 };
export const HOOK = { y: 150, out: 27, rise: 9, r: 1.9 };

// The cushion's profile, from the seam round its face to the opening: how far it stands out from the cup's joint
// (negative, toward the ear) and how far its outline is let out past the shell's. A welt runs round its outer wall
// where the cover's two panels are sewn, and `welt` is how far along the profile that is, in millimetres, for the
// stitches either side of it, and `len` the whole profile's length.
export const CUSHION = (() => {
  const pad = CUP.pad;
  const prof: [number, number][] = [[-0.8, -2.6], [-2.5, -0.6], [-5.5, 1.2], [-8.5, 1.55], [-9.3, 0.95], [-10.1, 1.55], [-13, 1.5], [-14.5, 1.1]];
  for (let i = 1; i <= 6; i++) { const a = (i / 6) * (Math.PI / 2), r = 6.2; prof.push([-14.5 - (pad - 14.5) * Math.sin(a), 1.1 - r + r * Math.cos(a)]); }
  const f0 = 1.1 - 6.2, f1 = -11.6;
  for (let i = 1; i <= 2; i++) prof.push([-pad - 0.35 * Math.sin((i / 3) * Math.PI), f0 + ((f1 - f0) * i) / 3]);
  for (let i = 0; i <= 5; i++) { const a = (i / 5) * (Math.PI / 2), r = 4.5; prof.push([-pad + r * (1 - Math.cos(a)), f1 - r * Math.sin(a)]); }
  prof.push([-10, -16.5], [-3, -16.1], [-0.6, -15.6]);
  const at = [0];
  for (let i = 1; i < prof.length; i++) at.push(at[i - 1] + Math.hypot(prof[i][0] - prof[i - 1][0], prof[i][1] - prof[i - 1][1]));
  return { prof, welt: at[4], len: at[at.length - 1] };
})();

// The cups' lag behind the band, against the band's angle and its speed in radians a second, and the most it may be.
export const LAG = { angle: 0.55, speed: 0.2, most: 0.3 };

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
