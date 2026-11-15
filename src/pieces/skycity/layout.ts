import * as THREE from 'three';
import { seeded } from '../../world/build';

// The world in the hero: where everything stands. It is the top of a small planet that has been torn in half: a
// dome, a little less than half a sphere, curved side up, with the city on it, and under it the planet's torn
// inside, its core, and the pieces of it that broke away (BRIEF.md, Settled, "The hero, the city at rest").
// Units, one a CSS pixel on a screen 1460 wide. The frame: the origin is the top of the dome, where the spire
// stands. x to the visitor's right, y up, z toward the visitor. The planet's core hangs in the tear, straight down
// from there (HEART). Its sizes began on the wireframe at /lab/hero-draft (src/hero/plan.ts), and he then asked for
// a flatter dome and a larger city, which these are.
//
// The plan of what stands on the world is a flat map, laid over the dome from its top: a place on the map is so far
// to the right of the top and so far toward the visitor, measured along the ground. seat, lift and bend, below, put
// what is on the map onto the dome. Everything stands straight out from the ground under it. The ground is land:
// outside the city it rises in hills and ridges (relief), and seat, lift and bend stand things on the land.

// A unit in the stage's metres. The lights, the shadows and the occlusion are set up for a scene a metre or two
// across, as the desk is.
export const SCALE = 0.0015;

// The planet: the radius its top is curved to, how far round from its top it is kept, in degrees, and how far
// across its core is from its middle. He found a dome that was nearly half a sphere too round: this one is about
// 1320 across and 400 tall.
export const PLANET = { r: 748, cap: 62, core: 150 } as const;
// The middle of the core, in the frame: under the middle of the world, a little under the level of its torn edge,
// where the tear shows it. It is not the middle of the sphere the top is curved to, which is far lower.
export const HEART = [0, -540, 0] as const;
// How far out on the map the plan of the city and its places reaches. Beyond it, as far as the torn edge, is the
// broken margin. rim and rock are the disc's, which the first ground was built to, and go with it.
export const GROUND = { r: 700, rim: 16, rock: 220 } as const;
// The spire at the top: how tall it is, and how far across at its foot.
export const SPIRE = { tall: 240, foot: 30 } as const;

const R = PLANET.r, D2R = Math.PI / 180;

const hash2 = (i: number, j: number): number => {
  const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const ease = (t: number): number => t * t * (3 - 2 * t);
const ramp = (a: number, b: number, x: number): number => ease(Math.min(1, Math.max(0, (x - a) / (b - a))));
const value = (x: number, z: number): number => {
  const i = Math.floor(x), j = Math.floor(z), u = ease(x - i), v = ease(z - j);
  return (hash2(i, j) * (1 - u) + hash2(i + 1, j) * u) * (1 - v) + (hash2(i, j + 1) * (1 - u) + hash2(i + 1, j + 1) * u) * v;
};
// The land outside the city: where on the map it begins to rise, where it is at its full height, where it begins to
// fall away toward the torn edge and where it is level again, how tall its ridges are, and how many degrees to
// each side of the way to the spire are kept level, so the way runs out through a pass.
export const LAND = { from: 470, full: 550, to: 700, out: 770, tall: 38, way: 15 } as const;
// How high the land stands over the planet's own curve at a place on the map: ridges and hills, the same on every
// call. It is level under the city and at the torn edge.
export function relief(x: number, z: number): number {
  const far = Math.hypot(x, z);
  if (far <= LAND.from || far >= LAND.out) return 0;
  const k = ramp(LAND.from, LAND.full, far) * (1 - ramp(LAND.to, LAND.out, far)) * ramp(LAND.way * 0.6, LAND.way * 1.6, Math.abs(Math.atan2(x, z)) / D2R);
  if (k <= 0) return 0;
  const ridge = 1 - Math.abs(2 * value(x / 150 + 7.3, z / 150 + 2.1) - 1);
  return LAND.tall * k * (0.7 * ridge * ridge + 0.3 * value(x / 64 + 1.7, z / 64 + 9.2));
}
const axis = new THREE.Vector3(), turn = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), at = new THREE.Vector3();
// How the ground is turned at a place on the map: straight up there is straight out from the planet.
function tilt(x: number, z: number, out: THREE.Quaternion): THREE.Quaternion {
  const far = Math.hypot(x, z);
  return far < 1e-6 ? out.identity() : out.setFromAxisAngle(axis.set(z / far, 0, -x / far), far / R);
}
// A place on the map, at a height above the land there, as a point of the frame.
export function lift(x: number, y: number, z: number, out = new THREE.Vector3()): THREE.Vector3 {
  const far = Math.hypot(x, z), a = far / R, h = R + relief(x, z) + y, k = far < 1e-6 ? 0 : (h * Math.sin(a)) / far;
  return out.set(x * k, h * Math.cos(a) - R, z * k);
}
// Where a thing stands and how it is turned: the matrix that puts something built upright at the origin onto the
// ground at a place on the map, so far above it, turned so many degrees about its own upright first.
export function seat(x: number, z: number, up = 0, spin = 0, out = new THREE.Matrix4()): THREE.Matrix4 {
  tilt(x, z, turn);
  if (spin) turn.multiply(new THREE.Quaternion().setFromAxisAngle(axis.set(0, 1, 0), spin * D2R));
  return out.compose(lift(x, up, z, at), turn, one);
}
// Lays a geometry built flat on the map over the dome, each point where the map puts it, on the land. For what
// lies on the ground: a floor, a road, a wall. What stands tall is seated whole, with seat, or it would spread as
// it rises. A normal is only turned with the planet's curve: where the land slopes, work the normals out again.
export function bend(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const p = g.getAttribute('position'), n = g.getAttribute('normal'), v = new THREE.Vector3(), q = new THREE.Quaternion();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    lift(x, p.getY(i), z, v);
    p.setXYZ(i, v.x, v.y, v.z);
    if (n) {
      v.set(n.getX(i), n.getY(i), n.getZ(i)).applyQuaternion(tilt(x, z, q));
      n.setXYZ(i, v.x, v.y, v.z);
    }
  }
  p.needsUpdate = true;
  if (n) n.needsUpdate = true;
  g.computeBoundingBox();
  g.computeBoundingSphere();
  return g;
}

const lattice = (i: number, n: number, seed: number): number => {
  const s = Math.sin((((i % n) + n) % n) * 127.1 + seed * 311.7) * 43758.5453;
  return s - Math.floor(s);
};
// A ragged number from 0 to 1 that comes back to itself round a circle: n teeth to the turn.
const ragged = (deg: number, n: number, seed: number): number => {
  const f = (((deg % 360) + 360) % 360) / 360 * n, i = Math.floor(f), t = f - i;
  return lattice(i, n, seed) * (1 - t) + lattice(i + 1, n, seed) * t;
};
// The torn edge: how far out on the map the ground reaches at a bearing, in degrees from straight toward the
// visitor, turning to the visitor's right. Never further than the planet is kept (out), and bitten back from
// there by as much as bite, in large bites and small teeth. The ground above and the torn rock below both end on
// this line, so they meet.
export const EDGE = {
  out: PLANET.cap * D2R * R,
  bite: 80,
  at(deg: number): number {
    const big = ragged(deg, 7, 1), mid = ragged(deg, 19, 2), small = ragged(deg, 53, 3);
    return EDGE.out - EDGE.bite * Math.min(1, 0.55 * big * big + 0.3 * mid + 0.22 * small * small);
  },
};
// The broken margin: the ground from here out to the torn edge is damaged. Cracked, split, with things leaning or
// fallen. Where a place round the core reaches further out than this, it is damaged there too.
export const MARGIN = 700;

// The torn underside. No rock hangs lower than this, as a height in the frame: under it there is only the core and
// what broke away. Round the core the rock is torn back into a hollow this far across from the planet's middle,
// open toward the visitor, so the core is seen from the page's view.
export const TEAR = { low: HEART[1] - 135, hollow: 225 } as const;
// The core: a ball of the stream's own light at the planet's middle, this far across from its middle. The site's
// stream leaves its underside (SOURCE). How bright it burns at a time on the clock is one number that the core,
// the light it throws and whatever it lights all read, so they flicker together.
export const CORE = { r: PLANET.core } as const;
export const SOURCE = [0, HEART[1] - PLANET.core, 0] as const;
export const coreLevel = (t: number): number => 1 + 0.07 * Math.sin(t * 1.9) + 0.05 * Math.sin(t * 4.7 + 1.3) + 0.03 * Math.sin(t * 11.3 + 0.4);
// Where streams of the stream's own light leave the torn face, as points of the frame: each is the tip of a piece
// of the torn rock that hangs toward the visitor, and the light falls free from it. They are drawn by the stream
// and not by the world: the world only makes the places they leave from.
export const VENTS: readonly (readonly [number, number, number])[] = [
  [-500, HEART[1] + 58, 250], [-330, HEART[1] + 6, 300], [-170, HEART[1] - 44, 330],
  [170, HEART[1] - 30, 330], [330, HEART[1] + 18, 300], [500, HEART[1] + 70, 250],
];
// What broke away: the pieces of the planet round the torn underside and under it. None is lower than this, as a
// height in the frame, none further from the planet's upright than this, and none higher than the torn edge.
export const DEBRIS = { low: HEART[1] - 325, far: 980, high: -R * (1 - Math.cos(PLANET.cap * D2R)) } as const;
// It is not towers from edge to edge: he ruled that. It is a small world: a city on the crown of the dome, large
// on the screen, with the spire at its middle, and round the city a wild forest over hills, out to the broken
// margin (DISTRICTS below).
// Round the spire: a plaza, then ring boulevards at these distances from the middle, each this wide. The city's
// buildings stand between the plaza and the last of them.
export const PLAZA = 78;
export const RINGS = [150, 290, 440] as const;
export const ROAD = 14;
// Avenues run out from the plaza to the rim at these bearings, in degrees from straight toward the visitor.
export const AVENUES = [0, 45, 90, 135, 180, 225, 270, 315] as const;
// Squares inside the core: each a stretch of one band between two boulevards, from one bearing to another, in
// degrees. No tower stands in one.
export const PARKS: { band: number; from: number; to: number }[] = [
  { band: 1, from: 62, to: 84 }, { band: 1, from: 268, to: 292 },
];

// The places that are not the city's own buildings. Each is a stretch of the ground from one bearing to another, in
// degrees from straight toward the visitor, turning to the visitor's right, and from one distance from the middle
// to another. The view is from straight in front and nearly level: the visitor's left and right are the skyline,
// where things stand out sideways against the sky, and the face toward the visitor is seen from above.
//   procession: a way from the spire's plaza down the face of the world toward the visitor, through the city and
//     out through a pass in the forest.
//   temple: the quarter with the flair of ancient Egypt, and its pyramid, which he likes. In the city, at the left
//     of the skyline, near enough the top to show at rest on every screen.
//   port: its match at the right of the skyline, where craft land and leave.
//   forest: a wild forest over hills and ridges, as a national forest is, all round the city. Not a farm and not
//     a garden: he ruled that.
//   wild: the far side. Never seen.
export type Kind = 'procession' | 'forest' | 'port' | 'wild' | 'temple';
export interface District { kind: Kind; from: number; to: number; r0: number; r1: number }
export const DISTRICTS: District[] = [
  { kind: 'procession', from: -10, to: 10, r0: 150, r1: 700 },
  { kind: 'port', from: 60, to: 110, r0: 290, r1: 470 },
  { kind: 'temple', from: 250, to: 300, r0: 290, r1: 470 },
  { kind: 'forest', from: 10, to: 128, r0: 470, r1: 700 },
  { kind: 'forest', from: 232, to: 350, r0: 470, r1: 700 },
  { kind: 'wild', from: 128, to: 232, r0: 440, r1: 700 },
];
// Whether a bearing lies in a stretch that runs from one bearing to another, turning to the right.
export const within = (a: number, from: number, to: number): boolean => ((a - from) % 360 + 360) % 360 <= ((to - from) % 360 + 360) % 360;
// The place a point of the ground is in, or none: the city, a boulevard, the margin.
export function districtAt(x: number, z: number): District | null {
  const r = Math.hypot(x, z), a = (Math.atan2(x, z) * 180) / Math.PI;
  return DISTRICTS.find((d) => r >= d.r0 && r <= d.r1 && within(a, d.from, d.to)) ?? null;
}
// Where the city's falls leave the rim, across from the middle, at the front of the rim, and the main one, which
// leaves the keel of the rock under the spire. The falls are the stream's own light and are drawn by the stream,
// not by the city: the city only makes the places they leave from (a spout, a channel cut in the rim).
export const FALLS = [-520, -360, -180, 180, 360, 520] as const;

// A place a tower stands: its middle, how wide and deep its foot is, how far it is turned, in degrees, how tall it
// is, and which band it stands in (0 is the innermost).
export interface Lot { x: number; z: number; w: number; d: number; turn: number; tall: number; band: number; seed: number }

// Every lot of the city, the same on every call: large buildings in rows along the city's three bands, tallest
// near the spire. None on a boulevard, an avenue, a square or the way to the spire, and none in the temple quarter
// or the port. The ground and the towers are made by different hands and both read this. He found the first
// city small: these are few and large.
export const TALLEST = 185;
export function lots(): Lot[] {
  const r = seeded(9173), out: Lot[] = [];
  const edges = [PLAZA, ...RINGS];
  for (let band = 0; band < 3; band++) {
    const inner = edges[band] + ROAD, outer = edges[band + 1] - ROAD / 2, depth = outer - inner;
    const rows = Math.max(1, Math.round(depth / 72)), deep = depth / rows - 8;
    for (let row = 0; row < rows; row++) {
      const rad = inner + (depth * (row + 0.5)) / rows, n = Math.floor((2 * Math.PI * rad) / 86);
      for (let i = 0; i < n; i++) {
        const a = ((i + 0.5 * (row % 2)) / n) * 360, w = 42 + r() * 34, d = Math.min(deep, 42 + r() * 28), lean = r(), seed = Math.floor(r() * 1e6);
        const fall = Math.exp(-((rad / 330) ** 2)), tall = Math.min(TALLEST, (64 + 150 * fall * (0.5 + 0.5 * lean)) * (0.8 + 0.4 * r()));
        if (AVENUES.some((b) => Math.abs(((a - b + 540) % 360) - 180) * (Math.PI / 180) * rad < ROAD / 2 + w / 2 + 3)) continue;
        if (PARKS.some((p) => p.band === band && within(a, p.from, p.to))) continue;
        const t = a * (Math.PI / 180);
        if (districtAt(Math.sin(t) * rad, Math.cos(t) * rad)) continue;
        out.push({ x: Math.round(Math.sin(t) * rad * 10) / 10, z: Math.round(Math.cos(t) * rad * 10) / 10, w: Math.round(w), d: Math.round(d), turn: Math.round(a), tall: Math.round(tall), band, seed });
      }
    }
  }
  return out;
}

// Where the moon stands from the world: the way its light comes from, which is the world's key light. From the
// visitor's right and a little in front, as the moon is in the upper right of the page's sky. A part that draws a
// sheen or a shadow of its own from the moon reads it here.
export const MOONWARD = [0.8, 0.46, 0.08] as const;

// How it is looked at: from straight in front and a little above, in degrees, from this far away, in units. The
// view never moves: the world scrolls with the page.
export const VIEW = { az: 0, el: 4.5, back: 9000 } as const;
// Its host: this many units wide whatever the screen, with the world on its center line, and this tall, with its
// top this far over the tip of the spire. The foot of it is a little under the lowest of what broke away.
export const HOST = { wide: 1460, over: 80, tall: SPIRE.tall + 80 - (DEBRIS.low - 70) } as const;
// The middle of what the host shows, which the view is aimed at.
export const AIM = [0, SPIRE.tall + HOST.over - HOST.tall / 2, 0] as const;
// Where a point of the frame is drawn in the host: how far to the right of its center line, and how far down from
// its top, in units.
export function drawn(x: number, y: number, z: number): [number, number] {
  const e = VIEW.el * D2R, se = Math.sin(e), ce = Math.cos(e), dy = y - AIM[1];
  const k = VIEW.back / (VIEW.back - dy * se - z * ce);
  return [x * k, HOST.tall / 2 - (dy * ce - z * se) * k];
}
