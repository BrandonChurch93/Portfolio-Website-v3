import * as THREE from 'three';
import { DESK, PLACES, VIEW } from '../../layout';

// The headphones on their stand, in the desk's millimetres. The pair's own frame has the point where the band bears on
// the saddle at its origin: x runs ear to ear, y is up, and z is across the band, toward the front of the pair, so the
// cup at -x is the wearer's right. The stand is built in the same turned frame, from the middle of its foot on the timber.

const D2R = Math.PI / 180;
export const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// Where the foot stands, and how far the pair and its stand are turned about the upright. From the page's view, which
// is 24 degrees round to the left, a turn of 16 sets the ear to ear line 40 degrees off the screen's plane: the right
// cup, with the crown, shows its outer face, the left one its cushion, and the band's arc is seen nearly whole.
export const FOOT_AT = V(PLACES.headphones[0], 0, PLACES.headphones[1]);
export const TURN = 16 * D2R;
// How high above the top the band bears on the saddle: the rails' crown stands about level with the lamp's shade.
export const BEAR_Y = 440;

// The pair is his own AirPods Max, in Space Gray: 169 mm across, 187 tall and 83 deep.
// The cups: one piece shells of anodised aluminium, a superellipse of power n, ry tall and rz across. Each shell runs
// from where it meets the cushion (its joint, x = 0 in the cup's own frame) out `deep` to its face: a straight side
// to `side`, a soft edge of radius `edge` turning into the face, which is domed by `dome`. The cushion stands `pad`
// in from the joint, with the same outline. The cup's middle stands `y` below the bearing point, and the stem enters
// the top of the shell at the middle of its depth, `stem` out from the pair's middle.
export const CUP = { rz: 40, ry: 47.5, n: 3.6, deep: 25, edge: 4.5, dome: 0.8, pad: 21, y: -128, stem: 72 };
export const SHELL = { side: CUP.deep - CUP.edge };
// The joint's x in the pair's frame, out from the middle.
export const JOINT = CUP.stem - CUP.deep / 2;
// The stem: a slim polished bar, `w` across the band and `t` through it, from the hinge at the top of the cup up into
// the housing at the foot of the band's end. The hinge is a polished barrel across the band, sunk into a slot in the
// top of the shell, and the cup hangs on it.
export const STEM = { x: CUP.stem, w: 3.3, t: 2.2, top: -54 };
export const PIVOT = { y: CUP.y + CUP.ry + 0.4, r: 3.3, half: 4.4 };
// The slot the hinge sits in: half sizes across the band (z) and along the cup's depth (x).
export const SLOT = { z: 4.8, x: 4.2 };
// The Digital Crown and the noise control button on the top of the right cup, toward the front: how far across the
// band from the stem, and their sizes.
export const CROWN = { z: 27, r: 5.6, h: 5.8, ridges: 40 };
export const BUTTON = { z: 12.5, half: 5.2, r: 2.4 };
// The microphone openings on the top and bottom edge of each cup: across the band, along the depth, their radius and
// spacing.
export const MIC = { z: 20, x: 6.0, r: 0.5, step: 1.8 };

// The band: a frame of two soft coated rails, joined at each end in a housing the stem slides out of, and the knit
// canopy hung inside it from end to end. The rails' arch is a superellipse of power n: its foot cy, half span rx and
// rise ry. The canopy's own arch is crx across and rises cry from ccy, pressed up onto the saddle where it bears; the
// rails stand over it with a gap the light shows through.
export const ARCH = { cy: -36, rx: CUP.stem, ry: 50, n: 2.5, crx: 66, ccy: -44, cry: 44 };
export const RAIL = { z: 20, w: 2.3, t: 1.45 };
export const CANOPY = { w: 18.5, t: 0.6 };
// The housing at each end of the band: half its size across the band and through it, and its foot and top.
export const HOUSING = { z: RAIL.z + RAIL.w + 0.3, x: 3.4, foot: STEM.top, top: ARCH.cy - 2 };

// The stand: the saddle's curve and half length, the pad's half width and thickness, the cradle under it, the post
// and the foot.
export const SADDLE = { r: 55, half: 24, wide: 10, pad: 5.5, cradle: 6, deep: 28 };
// The foot: a weighted disc, its top a hide pad let in between a polished rim and a turned boss, and on the boss the
// knuckle the post stands in: two cheeks with a pin across them, the post's flat tang between.
export const BASE = { r: 62, h: 11, pad: [20.5, 55] as [number, number], sink: 0.7, boss: 15 };
export const KNUCKLE = { y: BASE.h + 19, gap: 3.1, cheek: 2.4, r: 6.6, pin: 2.1 };
// The post, from the knuckle up, tapering; and the hook a cable hangs on, out to the stand's right.
export const POST = { r: 5.4, rTop: 4.4, from: KNUCKLE.y + 9, top: BEAR_Y - SADDLE.pad - SADDLE.deep - 12 };
export const HOOK = { y: 150, out: 27, rise: 9, r: 1.9 };

// The cushion's profile, from the seam at the shell to the cloth over the driver: how far it stands out from the
// cup's joint (negative, toward the ear) and how far its outline is let out past the shell's. A straight knitted wall
// flush with the shell, a full round edge, the face it rests on the head by, a soft lip into the opening, and the
// opening's wall back to the cloth. `len` is the profile's length.
export const CUSHION = (() => {
  const pad = CUP.pad, R = 4.5, face = -11.5, lip = 2.2;
  const prof: [number, number][] = [[-0.6, -1.7], [-1.2, -0.6], [-2.0, -0.15]];
  for (let i = 1; i <= 4; i++) prof.push([-2 - ((pad - R - 2) * i) / 4, 0.35 * Math.sin((i / 4) * Math.PI)]);
  for (let i = 1; i <= 8; i++) { const a = (i / 8) * (Math.PI / 2); prof.push([-(pad - R) - R * Math.sin(a), -R * (1 - Math.cos(a))]); }
  for (let i = 1; i <= 2; i++) prof.push([-pad - 0.35 * Math.sin((i / 3) * Math.PI), -R + ((face + R) * i) / 3]);
  for (let i = 0; i <= 5; i++) { const a = (i / 5) * (Math.PI / 2); prof.push([-pad + lip * (1 - Math.cos(a)), face - lip * Math.sin(a)]); }
  const open = face - lip;
  prof.push([-15, open - 0.4], [-12.1, open - 0.6]);
  const at = [0];
  for (let i = 1; i < prof.length; i++) at.push(at[i - 1] + Math.hypot(prof[i][0] - prof[i - 1][0], prof[i][1] - prof[i - 1][1]));
  return { prof, len: at[at.length - 1], driver: -12.5, open: open - 0.6 };
})();

// The cups' lag behind the band, against the band's angle and its speed in radians a second, and the most it may be.
export const LAG = { angle: 0.55, speed: 0.2, most: 0.3 };

// The saddle's top at x, where the pad's face is: a circle through the bearing point.
export const saddleTop = (x: number) => -(SADDLE.r - Math.sqrt(Math.max(0, SADDLE.r * SADDLE.r - x * x)));
const smax = (a: number, b: number, k: number) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.max(a, b) + (h * h * k) / 4; };
// The canopy's underside at x: its own arch, pressed up onto the pad where the pad is higher.
export function canopyUnder(x: number): number {
  const k = Math.max(0, 1 - (Math.abs(x) / ARCH.crx) ** 2.2), own = ARCH.ccy + ARCH.cry * Math.pow(k, 1 / 2.2);
  const pad = Math.abs(x) < SADDLE.half ? saddleTop(x) + 0.4 : -1e3;
  return smax(own, pad, 4);
}
// The rails' centre line at a turn t, from 0 at the right end to pi at the left.
export function railAt(t: number): [number, number] {
  const c = Math.cos(t), s = Math.sin(t), e = 2 / ARCH.n;
  return [ARCH.rx * Math.sign(c) * Math.abs(c) ** e, ARCH.cy + ARCH.ry * Math.abs(s) ** e];
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
