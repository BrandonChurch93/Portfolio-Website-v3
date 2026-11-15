import * as THREE from 'three';
import { BULB as LIGHT, PLACES, SHADE, VIEW } from '../../layout';

// The lamp's form, in the desk's millimetres. Its foot stands at PLACES.lamp and the top of its shade, as the desk is
// seen, is SHADE, where the stream strikes. The shade is placed from that point by the desk's own view, so nothing of
// the lamp stands higher on the screen than SHADE.

const D2R = Math.PI / 180;
export const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// The stage's own light for the lamp stands at the bulb and shines along the shade's axis.
const [LX, LZ] = PLACES.lamp;
export const BULB_AT = V(...LIGHT.at);
export const STRIKE = V(...SHADE);

// The weighted foot: where it stands, and the radius and height of the widest point of its bronze bead.
export const FOOT = { at: V(LX, 0, LZ), r: 88.6, bead: 15.8 } as const;
// The stem stands straight up from the boss to the elbow's bolt.
export const ELBOW_Y = 250;
export const ELBOW = V(LX, ELBOW_Y, LZ);

// The shade, spun from one sheet: radius against depth from the crown, crown to rim. The crown has a hole under the
// vented cap. The rim is rolled outward round a wire.
export const SHELL: [number, number][] = [
  [23.5, 1.5], [26, 2.4], [32, 4.6], [38, 7.6], [44, 11.4], [50, 16], [55.5, 21.4], [60.5, 27.6], [65, 34.6], [69, 42.4],
  [72.6, 51], [75.8, 60.2], [78.8, 69.8], [81.6, 79.4], [84.4, 88.4], [87, 95.2],
];
export const RIM = { r: 89.4, s: 97.2, tube: 2.6 } as const;
export const SKIN = 1.0;
// The cap over the crown's hole, raised on posts so the bulb's heat leaves through the gap under it: radius against
// height above the crown, from its underside round its edge and over its top to the button.
export const CAP: [number, number][] = [
  [0, 4.2], [27.2, 4.4], [28.7, 4.7], [29.1, 5.3], [28.2, 6.0], [24.5, 6.7], [20, 7.3], [17, 7.6], [16.6, 8.4], [15.6, 9.1],
  [13.4, 10.2], [9.8, 11.5], [6.6, 12.2], [5.8, 12.6], [5.6, 14.2], [4.8, 15.2], [2.9, 15.7], [0, 15.9],
];
export const BULB = { s: 50, r: 25 } as const;
// The frosted globe seen in the shade's mouth: lower in the shade than the stage's light, so the page's view, which
// looks into the mouth at a grazing angle, sees its lower part burning.
export const GLOBE = { s: 68, r: 22 } as const;

export function rAt(s: number): number {
  if (s <= SHELL[0][1]) return SHELL[0][0];
  for (let i = 0; i < SHELL.length - 1; i++) {
    const [r0, s0] = SHELL[i], [r1, s1] = SHELL[i + 1];
    if (s <= s1) return r0 + ((r1 - r0) * (s - s0)) / (s1 - s0);
  }
  return SHELL[SHELL.length - 1][0];
}

// The desk's camera at rest, as src/pieces/desk/index.ts places it, for finding where the shade's top is drawn.
function deskCamera(): THREE.PerspectiveCamera {
  const cam = new THREE.PerspectiveCamera(VIEW.fov, 1.6, 0.05, 40);
  const aim = V(...VIEW.aim), reach = VIEW.tall / 2;
  const a = VIEW.az * D2R, e = VIEW.el * D2R, d = reach / Math.tan((VIEW.fov / 2) * D2R);
  cam.position.set(aim.x + d * Math.cos(e) * Math.sin(a), aim.y + d * Math.sin(e), aim.z + d * Math.cos(e) * Math.cos(a));
  cam.lookAt(aim);
  cam.updateMatrixWorld(true);
  cam.updateProjectionMatrix();
  return cam;
}

export const CAMERA = deskCamera();
const right = new THREE.Vector3(), up = new THREE.Vector3(), back = new THREE.Vector3();
CAMERA.matrixWorld.extractBasis(right, up, back);
export const TOWARD = back.clone();
export const SCREEN_RIGHT = right.clone();
export const SCREEN_UP = up.clone();

// The axis the shade opens along. The stage's light aims down at the tablet, and a shade on that axis turns its mouth
// away from the page's eye, so nothing of its lit inside could be seen and the lamp never read as on. So the shade is
// tipped this far toward the eye from the light's aim, which opens a crescent of its lit inside to the page. The
// light itself still aims where it did, inside the cone the shade leaves open.
const TIP = 19;
export const AXIS = (() => {
  const aim = V(...LIGHT.aim).normalize(), eye = CAMERA.position.clone().multiplyScalar(1000).sub(BULB_AT).normalize();
  const across = eye.addScaledVector(aim, -eye.dot(aim)).normalize();
  return aim.multiplyScalar(Math.cos(TIP * D2R)).addScaledVector(across, Math.sin(TIP * D2R)).normalize();
})();

// Where a point of the desk is drawn, in host heights across and down from the host's middle (as the desk's where()).
export function drawn(p: THREE.Vector3): [number, number] {
  const v = p.clone().multiplyScalar(0.001).project(CAMERA);
  return [(v.x * CAMERA.aspect) / 2, -v.y / 2];
}

// Turns the shade's own frame (crown at the origin, opening down -y) into the desk's.
export const TURN = new THREE.Quaternion().setFromUnitVectors(V(0, -1, 0), AXIS);

function outline(): THREE.Vector3[] {
  const pts: [number, number][] = [...SHELL, ...CAP.map(([r, y]): [number, number] => [r, -y])];
  for (let i = 0; i < 24; i++) { const t = (i / 24) * Math.PI * 2; pts.push([RIM.r + Math.cos(t) * RIM.tube, RIM.s + Math.sin(t) * RIM.tube]); }
  const out: THREE.Vector3[] = [];
  for (const [r, s] of pts) for (let k = 0; k < 120; k++) { const t = (k / 120) * Math.PI * 2; out.push(V(r * Math.cos(t), -s, r * Math.sin(t)).applyQuaternion(TURN)); }
  return out;
}

// The crown's place: its top as drawn lies on SHADE, and along the line of sight it is set so the bulb is where the
// stage's light stands.
function seat(): THREE.Vector3 {
  const pts = outline();
  let top = pts[0];
  for (const p of pts) if (p.dot(up) > top.dot(up)) top = p;
  let crown = STRIKE.clone().sub(top), best = 1e9;
  for (let k = -300; k <= 300; k += 0.25) {
    const c = STRIKE.clone().sub(top).addScaledVector(back, k), miss = c.clone().addScaledVector(AXIS, BULB.s).distanceTo(BULB_AT);
    if (miss < best) { best = miss; crown = c; }
  }
  const want = drawn(STRIKE);
  for (let i = 0; i < 4; i++) {
    let hi: [number, number] = [0, 1e9];
    for (const p of pts) { const w = drawn(p.clone().add(crown)); if (w[1] < hi[1]) hi = w; }
    const per = drawn(crown.clone().add(right))[0] - drawn(crown)[0];
    crown.addScaledVector(right, (want[0] - hi[0]) / per).addScaledVector(up, (hi[1] - want[1]) / per);
  }
  return crown;
}

export const CROWN = seat();
// The point of the shade itself that is drawn on SHADE: where the stream lands on it, in the desk's space.
export const HIT = (() => {
  let hi = V(0, 0, 0), y = 1e9;
  for (const p of outline()) { const q = p.clone().add(CROWN), w = drawn(q); if (w[1] < y) { y = w[1]; hi = q; } }
  return hi;
})();
// A point on the shade, by depth from the crown and a direction across the axis.
export const onShade = (s: number, across: THREE.Vector3, out = 0): THREE.Vector3 => {
  const dr = (rAt(s + 1) - rAt(s - 1)) / 2, n = across.clone().addScaledVector(AXIS, -dr).normalize();
  return CROWN.clone().addScaledVector(AXIS, s).addScaledVector(across, rAt(s)).addScaledVector(n, out);
};
export const normalAt = (s: number, across: THREE.Vector3): THREE.Vector3 => {
  const dr = (rAt(s + 1) - rAt(s - 1)) / 2;
  return across.clone().addScaledVector(AXIS, -dr).normalize();
};

// The shade hangs from a knuckle on its flank, on the side toward the elbow, so the arm comes to it from below and
// behind.
const toElbow = ELBOW.clone().sub(CROWN);
export const FLANK = toElbow.addScaledVector(AXIS, -toElbow.dot(AXIS)).normalize();
export const SADDLE_S = 34;
export const KNUCKLE = onShade(SADDLE_S, FLANK, 17);
export const ARM_DIR = KNUCKLE.clone().sub(ELBOW).normalize();
export const ARM_LEN = KNUCKLE.distanceTo(ELBOW);
// The bolts' axes: across the plane each joint swings in. Each points toward the visitor, where its wing nut is.
const facing = (v: THREE.Vector3) => (v.dot(back) < 0 ? v.negate() : v);
export const ELBOW_PIN = facing(ARM_DIR.clone().cross(V(0, 1, 0)).normalize());
const shadeN = normalAt(SADDLE_S, FLANK);
export const SHADE_PIN = facing(ARM_DIR.clone().cross(AXIS).addScaledVector(shadeN, -ARM_DIR.clone().cross(AXIS).dot(shadeN)).normalize());
export const SHADE_N = shadeN;
