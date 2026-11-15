import * as THREE from 'three';
import { type Builder, seeded, slice } from '../../../../world/build';
import { GROUND } from '../../layout';
import { D2R, KIND, RIM, fallBearings, kind, onRing } from './shape';

// The rim: a made edge, one solid wall round the city. Its top is a broad parapet with a coping and a lamp at every
// bay along its outer edge, overhanging the face. The face, flush under the parapet, is slate down to a copper base
// course, with two ribbons of windows set deep into it, lit or dark room by room, and broad stone pilasters every
// few bays carried down on corbels to the rock. Under its foot a dark reveal and the soffit back to the rock. At each of
// the six places a fall leaves it, the parapet opens between two pylons with beacons on them, a channel crosses the
// promenade, and a spout stands out from the wall, dark until the stream comes.

// The bays of the wall: how many round the rim, how many bays from one pilaster to the next, the windows' two floors
// and their height, and how far either side of a fall the wall is left plain.
const BAYS = 168, PILASTER = 4, FLOORS = [-6.4, -11.4], PANE = 2.8, CLEAR = 13;
// The wall's face and the heights of its courses.
const FACE = 661.8, TOP = 6.3, SET = 2.6;
const SPOUT = { w: 11, out: 676, floor: -0.8, wall: 3.4, pylon: { w: 7, d: 7, top: TOP + 4.5 } } as const;

function lathe(pts: [number, number][], seg: number, from = 0, len = Math.PI * 2): THREE.BufferGeometry {
  return new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg, from, len);
}

// The arcs of the rim between the openings at the falls: from and to, in degrees of bearing.
function arcs(gap: number): [number, number][] {
  const f = fallBearings().sort((a, b) => a - b), out: [number, number][] = [];
  const half = (gap / GROUND.r) / D2R;
  for (let i = 0; i < f.length; i++) out.push([f[i] + half, (i + 1 < f.length ? f[i + 1] : f[0] + 360) - half]);
  return out;
}

// LatheGeometry measures its start from +z toward +x, as a bearing is.
const arcLathe = (pts: [number, number][], from: number, to: number) => lathe(pts, Math.max(2, Math.ceil(to - from)), from * D2R, (to - from) * D2R);

export async function rim(b: Builder, made: THREE.Material): Promise<void> {
  const r = seeded(5521), falls = fallBearings();
  const nearFall = (deg: number, units: number) => falls.some((f) => Math.abs(((deg - f + 540) % 360) - 180) * D2R * GROUND.r < units);
  const p0 = RIM.parapet;

  // The parapet: its inner face, the coping with a chamfer that catches the light along the outer edge, and the
  // outer face down to the floor's level, cut open at each fall.
  for (const [a, z] of arcs(SPOUT.w + 2)) {
    b.add(kind(arcLathe([[p0, 0], [p0, TOP - 0.8]], a, z), KIND.stone), made);
    b.add(kind(arcLathe([[p0 - 0.6, TOP - 0.8], [p0 - 0.6, TOP - 0.2], [p0, TOP], [FACE + 1.2, TOP], [FACE + 1.8, TOP - 0.5], [FACE + 1.8, TOP - 1.1], [FACE, TOP - 1.4]], a, z), KIND.stone), made);
    b.add(kind(arcLathe([[FACE, TOP - 1.4], [FACE, 0]], a, z), KIND.slate), made);
    await slice();
  }
  // Below the floor's level the wall runs unbroken: the slate face with the two ribbons of windows set deep into
  // it, each slot with a soffit over it and a sill sloped out under it, the copper base course, and the soffit back
  // to the rock.
  const wall: [number, number][] = [[FACE, 0]];
  for (const y of FLOORS) {
    const t = y + PANE / 2 + 0.4, u = y - PANE / 2 - 0.4;
    wall.push([FACE, t + 0.2], [FACE, t], [FACE - SET, t], [FACE - SET, u], [FACE + 0.5, u - 0.25], [FACE, u - 0.6]);
  }
  wall.push([FACE, -14.2]);
  b.add(kind(lathe(wall, 180), KIND.slate), made);
  b.add(kind(lathe([[FACE, -14.2], [FACE + 0.8, -14.4], [FACE + 0.8, -16.4], [FACE, -16.7]], 180), KIND.copper), made);
  b.add(kind(lathe([[FACE, -16.7], [FACE - 2, -17], [646, -17.4]], 180), KIND.dark), made);
  await slice();

  // The pilasters, the corbels under them, the windows between, with a steel mullion between each two, and a lamp on
  // the coping's outer edge over every mullion.
  const corbel = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0, -2.5), new THREE.Vector2(-8, -9), new THREE.Vector2(-24, -9), new THREE.Vector2(-24, 0)]);
  const corbelGeo = new THREE.ExtrudeGeometry(corbel, { depth: 10, bevelEnabled: false }).translate(0, 0, -5).rotateY(-Math.PI / 2);
  const bay = 360 / BAYS, cell = bay / 2, cellW = cell * D2R * FACE;
  let room = 0, lit = false, glow = 0, tint = 0;
  for (let i = 0; i < BAYS; i++) {
    const deg = i * bay;
    if (i % PILASTER === 0 && !nearFall(deg, CLEAR + 2)) {
      b.add(kind(new THREE.BoxGeometry(12, TOP - 1.4 + 16.7, 3.6), KIND.stone), made, onRing(deg, FACE + 1.2, (TOP - 1.4 - 16.7) / 2));
      b.add(kind(corbelGeo.clone(), KIND.stone), made, onRing(deg, FACE + 3, -16.7));
    }
    for (const half of [0, 1]) {
      const c0 = deg + half * cell, mid = c0 + cell / 2;
      if (!nearFall(mid, CLEAR + 4)) {
        if (!(i % PILASTER === 0 && half === 0)) for (const y of FLOORS) b.add(kind(new THREE.BoxGeometry(0.8, PANE + 0.8, SET), KIND.steel), made, onRing(c0, FACE - SET / 2, y));
        for (const y of FLOORS) {
          if (room <= 0) { room = 1 + Math.floor(r() * 4); lit = r() < 0.55; glow = 0.25 + 0.75 * r() * r(); tint = 0.3 + 0.32 * r(); }
          room--;
          const m = onRing(mid, FACE - SET + 0.2, y);
          if (lit) b.add(kind(new THREE.BoxGeometry(cellW - 0.7, PANE, 0.3), KIND.light, tint, glow), made, m);
          else b.add(kind(new THREE.BoxGeometry(cellW - 0.7, PANE, 0.3), KIND.glass, 0.003), made, m);
        }
      }
      if (nearFall(c0, SPOUT.w / 2 + 6)) continue;
      b.add(kind(new THREE.OctahedronGeometry(0.75), KIND.light, 0.66, 1.7), made, onRing(c0, FACE - 1.6, TOP + 0.9));
    }
    if (i % 12 === 11) await slice();
  }

  // The six places a fall leaves.
  for (const f of falls) {
    const half = SPOUT.w / 2, ph = r(), P = SPOUT.pylon;
    // Pylons either side of the opening, from the soffit up a little past the coping, capped in copper under a beacon.
    for (const s of [-1, 1]) {
      const deg = f + (s * (half + P.w / 2 + 0.6)) / GROUND.r / D2R, at = FACE + 1.4 - P.d / 2;
      b.add(kind(new THREE.BoxGeometry(P.w, P.top + 17, P.d), KIND.stone), made, onRing(deg, at, (P.top - 17) / 2));
      b.add(kind(new THREE.BoxGeometry(P.w + 0.8, 1.2, P.d + 0.8), KIND.copper), made, onRing(deg, at, P.top + 0.6));
      b.add(kind(new THREE.BoxGeometry(P.w - 2.4, 1.4, P.d - 2.4), KIND.steel), made, onRing(deg, at, P.top + 1.9));
      b.add(kind(new THREE.OctahedronGeometry(1.1), KIND.light, 0.72, 1.6, 2 + ((ph + s * 0.13 + 1) % 1)), made, onRing(deg, at, P.top + 3.4));
      b.add(kind(new THREE.BoxGeometry(1.1, 14, 0.4), KIND.light, 0.42, 0.45), made, onRing(deg, FACE + 1.45, -7));
    }
    // The wall behind the fall, cut back and dark, so the fall stands clear of it.
    b.add(kind(new THREE.BoxGeometry(SPOUT.w + 1.2, 15, 1.2), KIND.dark), made, onRing(f, FACE - 0.4, -9.5));
    // The channel across the promenade and through the parapet, and the spout standing out from the wall.
    const run = SPOUT.out - 600, midR = (SPOUT.out + 600) / 2;
    b.add(kind(new THREE.BoxGeometry(SPOUT.w, 1.2, run), KIND.steel), made, onRing(f, midR, SPOUT.floor - 0.6));
    b.add(kind(new THREE.BoxGeometry(SPOUT.w - 2.8, 0.3, run - 2), KIND.dark), made, onRing(f, midR, SPOUT.floor + 0.15));
    for (const s of [-1, 1]) {
      const m = onRing(f, midR, SPOUT.floor + SPOUT.wall / 2).multiply(new THREE.Matrix4().makeTranslation(s * (SPOUT.w / 2 - 0.7), 0, 0));
      b.add(kind(new THREE.BoxGeometry(1.4, SPOUT.wall, run), KIND.steel), made, m);
    }
    // A bracket under the spout, back to the wall, and the copper lip the fall leaves over.
    const bracket = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(SPOUT.out - FACE - 1, 0), new THREE.Vector2(0, -8)]);
    const bg = new THREE.ExtrudeGeometry(bracket, { depth: 2, bevelEnabled: false }).translate(0, 0, -1).rotateY(-Math.PI / 2);
    b.add(kind(bg, KIND.steel), made, onRing(f, FACE, SPOUT.floor - 1.2));
    b.add(kind(new THREE.BoxGeometry(SPOUT.w + 0.6, 1.2, 1.4), KIND.copper), made, onRing(f, SPOUT.out - 0.2, SPOUT.floor + 0.2));
    await slice();
  }
}


// Where each fall leaves: the middle of the copper lip of each spout, in the city's units, and the middle of the
// keel's mouth for the main fall. The page puts the stream's falls on these.
export function fallsFrom(): { rim: [number, number, number][]; main: [number, number, number] } {
  const r = SPOUT.out - 0.2;
  return { rim: fallBearings().map((f) => [Math.sin(f * D2R) * r, SPOUT.floor + 0.2, Math.cos(f * D2R) * r]), main: [0, -GROUND.rock, 0] };
}
