import * as THREE from 'three';
import { seeded } from '../../world/build';

// The world in the hero: where everything stands. It is the top of a small planet that has been torn in half: a
// dome, a little less than half a sphere, curved side up, with the city on it, and under it the planet's torn
// inside, its core, and the pieces of it that broke away (BRIEF.md, Settled, "The hero, the city at rest").
// Units, one a CSS pixel on a screen 1460 wide. The frame: the origin is the top of the dome, where the spire
// stands. x to the visitor's right, y up, z toward the visitor. The planet's core hangs in the tear, straight down
// from there (HEART). Its sizes began on the wireframe at /lab/hero-draft (src/hero/plan.ts). He then asked, twice,
// for a dome that is far less round and a city that is larger and dense, which these are.
//
// The plan of what stands on the world is a flat map, laid over the dome from its top: a place on the map is so far
// to the right of the top and so far toward the visitor, measured along the ground. seat, lift and bend, below, put
// what is on the map onto the dome. Everything stands straight out from the ground under it. The ground is land,
// and seat, lift and bend stand things on it.

// A unit in the stage's metres. The lights, the shadows and the occlusion are set up for a scene a metre or two
// across, as the desk is.
export const SCALE = 0.0015;

// The planet: the radius its top is curved to, how far round from its top it is kept, in degrees, and how far
// across its core is from its middle. He found the first two domes too round: "you can really see the grade of
// the planet". This one is a shallow cap, about 1320 across and 165 tall. That it is a piece of a planet is learnt
// on the scroll, from its torn underside and its core.
export const PLANET = { r: 1400, cap: 28, core: 150 } as const;
// The middle of the core, in the frame: under the middle of the world, a little under the level of its torn edge,
// where the tear shows it. It is not the middle of the sphere the top is curved to, which is far lower.
export const HEART = [0, -310, 0] as const;
// How far out on the map the plan of the city and its places reaches. Beyond it, as far as the torn edge, is the
// broken margin. rim and rock are the disc's, which the first ground was built to, and go with it.
export const GROUND = { r: 472, rim: 16, rock: 220 } as const;
// The spire at the top: how tall it is, and how far across at its foot.
export const SPIRE = { tall: 280, foot: 34 } as const;

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
const bearing = (x: number, z: number): number => ((Math.atan2(x, z) / D2R) + 360) % 360;
// The jungle, at the left of the world by the pyramid: the stretch of the map it fills (the forest in DISTRICTS
// reads the same numbers). It cuts into the city as a wedge.
export const FOREST = { from: 222, to: 318, r0: 330, r1: 590 } as const;
// The second natural area, opposite the jungle at the right of the world, which looks nothing like it: dunes of
// pale gold sand with a pool of mirror polished metal among them. It cuts into the city as a wedge too.
export const DUNES = { from: 52, to: 128, r0: 330, r1: 590 } as const;
// The monument, at the right of the skyline where the dunes meet the city: a colossal Sun disc of polished gold
// standing on its rim, carved as Work's Sun stones are. Where its foot is on the map, and how far across and how
// tall it is. He dropped the mountain that stood here for it.
export const MONUMENT = { x: 390, z: 41, across: 190, tall: 205 } as const;
// The mountains are dropped: he ruled that. The land is level, and this is kept so that what stands on the land
// still asks how high it is.
export const PEAKS: readonly { x: number; z: number; r: number; tall: number }[] = [];
export function relief(_x: number, _z: number): number {
  return 0;
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
// there by as much as bite, in large bites and small teeth. The bites are deep: with an even edge the world read
// as a disc with a rim, and he ruled that there is no platform. The ground above and the torn rock below both end
// on this line, so they meet.
export const EDGE = {
  out: PLANET.cap * D2R * R,
  bite: 150,
  at(deg: number): number {
    const big = ragged(deg, 7, 1), mid = ragged(deg, 19, 2), small = ragged(deg, 53, 3);
    return EDGE.out - EDGE.bite * Math.min(1, 0.72 * big ** 2.2 + 0.2 * mid * mid + 0.14 * small * small);
  },
};
// The broken margin: the ground from here out to the torn edge is damaged. Cracked, split, with things leaning or
// fallen. Where a place round the core reaches further out than this, it is damaged there too.
export const MARGIN = 560;
// Bare ground: from where the city ends (CITY.r) out to the torn edge nothing is built. It is open land, so the
// curve of the planet is seen at its rim, and the tear is ground breaking and not buildings ending.

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
// It is a small world: a dense city, as the capital of a Star Wars or Star Trek world is dense, in the middle of
// the top of the dome with the spire at its middle. It ends about a quarter of the way in from the torn edge all
// the way round, and wedges of open land cut further in toward the middle: the jungle at the left, the dunes at
// the right, and two of bare ground at the front (DISTRICTS below). He ruled all of it.
export const CITY = { r: 472 } as const;
// Round the spire: a plaza, then ring boulevards at these distances from the middle, each this wide. The city's
// buildings stand between the plaza and the last of them, which is where the city ends. The roads are narrow: the
// city is canyons.
export const PLAZA = 78;
export const RINGS = [150, 290, 420, CITY.r] as const;
export const ROAD = 10;
// Avenues run out from the plaza to the rim at these bearings, in degrees from straight toward the visitor.
export const AVENUES = [0, 45, 90, 135, 180, 225, 270, 315] as const;
// Squares inside the core: each a stretch of one band between two boulevards, from one bearing to another, in
// degrees. No tower stands in one.
export const PARKS: { band: number; from: number; to: number }[] = [
  { band: 1, from: 62, to: 84 }, { band: 1, from: 268, to: 292 },
];

// The places that are not the city's own buildings. Each is a stretch of the ground from one bearing to another, in
// degrees from straight toward the visitor, turning to the visitor's right, and from one distance from the middle
// to another. The view is from straight in front and nearly level, and the dome is shallow, so the world is seen
// nearly edge on: what counts is what stands up, in layers one behind another, and the visitor's left and right
// are the ends of the skyline.
//   procession: a way from the spire's plaza toward the visitor, a canyon through the city, ending where the city
//     ends.
//   temple: the quarter with the flair of ancient Egypt, and its pyramid, which he likes. At the left of the
//     skyline, at the jungle's edge.
//   forest: the jungle, at the left of the world behind and round the temple. Far out of scale on purpose: its
//     trees are as tall as the buildings beside them.
//   monument: the Sun disc, at the right of the skyline.
//   dunes: the second natural area, at the right of the world round the monument.
//   open: a wedge of bare ground that cuts into the city.
//   wild: the far side. Hardly seen.
export type Kind = 'procession' | 'forest' | 'dunes' | 'monument' | 'open' | 'wild' | 'temple';
export interface District { kind: Kind; from: number; to: number; r0: number; r1: number }
export const DISTRICTS: District[] = [
  { kind: 'procession', from: -8, to: 8, r0: 150, r1: CITY.r },
  { kind: 'temple', from: 262, to: 292, r0: 330, r1: 470 },
  { kind: 'monument', from: 74, to: 94, r0: 330, r1: 450 },
  { kind: 'forest', from: FOREST.from, to: FOREST.to, r0: FOREST.r0, r1: FOREST.r1 },
  { kind: 'dunes', from: DUNES.from, to: DUNES.to, r0: DUNES.r0, r1: DUNES.r1 },
  { kind: 'open', from: 28, to: 44, r0: 330, r1: CITY.r },
  { kind: 'open', from: 316, to: 332, r0: 350, r1: CITY.r },
  { kind: 'wild', from: 128, to: 222, r0: 380, r1: 590 },
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

// Every lot of the city, the same on every call: buildings packed close in rows along the city's bands, tallest
// near the spire and lower toward the visitor so each row is seen over the one in front. The outermost band is a
// ragged fringe, with gaps, so the city does not end on a line. None on a boulevard, an avenue, a square or the way
// to the spire, and none in the temple quarter, the jungle, the dunes, the monument's ground or an open wedge. The
// ground and the towers are made by different hands and both read this. He likes how dense it is and found it
// reached too far: it is as dense, and smaller.
export const TALLEST = 215;
export function lots(): Lot[] {
  const r = seeded(9173), out: Lot[] = [];
  const edges = [PLAZA, ...RINGS];
  for (let band = 0; band < 4; band++) {
    const inner = edges[band] + ROAD, outer = edges[band + 1] - ROAD / 2, depth = outer - inner, fringe = band === 3;
    const rows = Math.max(1, Math.round(depth / 46)), deep = depth / rows - 4;
    for (let row = 0; row < rows; row++) {
      const rad = inner + (depth * (row + 0.5)) / rows, n = Math.floor((2 * Math.PI * rad) / 46);
      for (let i = 0; i < n; i++) {
        const a = ((i + 0.5 * (row % 2) + 0.24 * (r() - 0.5)) / n) * 360, w = 30 + r() * 14, d = Math.min(deep, 30 + r() * 16), lean = r(), seed = Math.floor(r() * 1e6);
        const fall = Math.exp(-((rad / 300) ** 2)), tall = Math.min(TALLEST, (48 + 225 * fall * (0.45 + 0.55 * lean)) * (0.8 + 0.4 * r()));
        const gone = r() < 0.2;
        if (fringe && gone) continue;
        if (AVENUES.some((b) => Math.abs(((a - b + 540) % 360) - 180) * (Math.PI / 180) * rad < ROAD / 2 + w / 2 + 2)) continue;
        if (PARKS.some((p) => p.band === band && within(a, p.from, p.to))) continue;
        const t = a * (Math.PI / 180);
        if (districtAt(Math.sin(t) * rad, Math.cos(t) * rad)) continue;
        if (rad + d / 2 > EDGE.at(a) - 6) continue;
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
