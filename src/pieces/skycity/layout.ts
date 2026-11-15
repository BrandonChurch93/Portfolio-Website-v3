import { seeded } from '../../world/build';

// The city in the hero, made new: where everything stands. Units, one a CSS pixel on a screen 1460 wide, in the
// city's own frame: the ground it stands on is a disc that floats, with the middle of its top at the origin, where
// the spire stands. x to the visitor's right, y up, z toward the visitor. How wide it is, how tall, and how much of
// it shows were agreed on the wireframe at /lab/hero-draft (src/hero/plan.ts), and these are its sizes.

// A unit in the stage's metres. The lights, the shadows and the occlusion are set up for a scene a metre or two
// across, as the desk is.
export const SCALE = 0.0015;

// The ground: how far across it reaches, how thick its rim is, and how far down the rock under it comes, to a keel
// under the spire.
export const GROUND = { r: 660, rim: 16, rock: 220 } as const;
// The spire at the middle: how tall it is, and how far across at its foot.
export const SPIRE = { tall: 420, foot: 40 } as const;
// Round the spire: a plaza, then ring boulevards at these distances from the middle, each this wide. Towers stand
// between them.
export const PLAZA = 78;
export const RINGS = [150, 290, 440, 590] as const;
export const ROAD = 14;
// Avenues run out from the plaza to the rim at these bearings, in degrees from straight toward the visitor.
export const AVENUES = [0, 45, 90, 135, 180, 225, 270, 315] as const;
// Parks: each a stretch of one band between two boulevards, from one bearing to another, in degrees. No tower
// stands in one.
export const PARKS: { band: number; from: number; to: number }[] = [
  { band: 3, from: -38, to: -8 }, { band: 3, from: 10, to: 40 }, { band: 2, from: 140, to: 176 }, { band: 3, from: 196, to: 232 }, { band: 1, from: 62, to: 84 },
];
// Where the city's falls leave the rim, across from the middle, at the front of the rim, and the main one, which
// leaves the keel of the rock under the spire. The falls are the stream's own light and are drawn by the stream,
// not by the city: the city only makes the places they leave from (a spout, a channel cut in the rim).
export const FALLS = [-520, -360, -180, 180, 360, 520] as const;

// A place a tower stands: its middle, how wide and deep its foot is, how far it is turned, in degrees, how tall it
// is, and which band it stands in (0 is the innermost).
export interface Lot { x: number; z: number; w: number; d: number; turn: number; tall: number; band: number; seed: number }

// Every lot of the city, the same on every call: towers in rows along each band, tallest near the spire and
// falling toward the rim, none on a boulevard, an avenue or a park. The ground and the towers are made by
// different hands and both read this.
export function lots(): Lot[] {
  const r = seeded(9173), out: Lot[] = [];
  const edges = [PLAZA, ...RINGS];
  for (let band = 0; band < RINGS.length; band++) {
    const inner = edges[band] + ROAD, outer = edges[band + 1] - ROAD / 2, depth = outer - inner;
    const rows = Math.max(1, Math.round(depth / 46));
    for (let row = 0; row < rows; row++) {
      const rad = inner + (depth * (row + 0.5)) / rows, n = Math.floor((2 * Math.PI * rad) / 44);
      for (let i = 0; i < n; i++) {
        const a = ((i + 0.5 * (row % 2)) / n) * 360, w = 22 + r() * 16, d = 22 + r() * 14, lean = r(), seed = Math.floor(r() * 1e6);
        if (AVENUES.some((b) => Math.abs(((a - b + 540) % 360) - 180) * (Math.PI / 180) * rad < ROAD / 2 + w / 2 + 3)) continue;
        if (PARKS.some((p) => p.band === band && ((a - p.from + 720) % 360) <= ((p.to - p.from + 720) % 360))) continue;
        const fall = Math.exp(-((rad / 330) ** 2)), tall = (56 + 250 * fall * (0.5 + 0.5 * lean)) * (0.8 + 0.4 * r());
        const t = a * (Math.PI / 180);
        out.push({ x: Math.round(Math.sin(t) * rad * 10) / 10, z: Math.round(Math.cos(t) * rad * 10) / 10, w: Math.round(w), d: Math.round(d), turn: Math.round(a), tall: Math.round(tall), band, seed });
      }
    }
  }
  return out;
}

// How it is looked at: from straight in front and a little above, in degrees, from this far away, in units. The
// ground is seen nearly edge on, as in the wireframe: the city is a skyline.
export const VIEW = { az: 0, el: 4.5, back: 9000 } as const;
// Its host: this many units wide whatever the screen, with the middle of the ground at the middle of its width and
// this far above its foot. The host is as tall as the page makes it.
export const HOST = { wide: 1460, up: 400 } as const;
