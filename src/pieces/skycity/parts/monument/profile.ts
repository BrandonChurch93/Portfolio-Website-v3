// The disc's section, in the carving's units (the rim's outer edge is 85): how high its face stands at each distance
// from its middle, and the rim, a thick rounded band that turns over to the back. The face is gently domed and every
// ring on it is rounded, so a polished face carries a bright line of each light it reflects and not one flat color.

const qr = (t: number): number => (t <= 0 ? 0 : t >= 1 ? 1 : Math.sqrt(1 - (1 - t) * (1 - t)));
const bump = (r: number, c: number, w: number, h: number): number => {
  const t = (r - c) / w;
  return Math.abs(t) < 1 ? h * Math.sqrt(1 - t * t) : 0;
};
const land = (r: number, a: number, b: number, h: number, e: number): number => h * Math.min(qr((r - a) / e), qr((b - r) / e));

// How far the face is domed, and where it comes down to the rim.
export const DOME = { tall: 13, to: 70 } as const;
// The rim: the middle of its section, how far it reaches across, how far it stands before the face's plane and how far
// it reaches behind it, and how square its section is (2 is round). It is far deeper behind than before, so the disc
// is a slab and not a coin: seen at its angle, its edge is a wall. Drawn round it read as a tyre.
export const RIM = { c: 77.5, a: 7.5, b: 11, back: 22, square: 3.2 } as const;
// The back, which is never seen face on: a shallow dome behind the rim.
export const BACK = { at: -RIM.back, bulge: 4 } as const;

export const dome = (r: number): number => (r >= DOME.to ? 0 : DOME.tall * (1 - (r / DOME.to) ** 2));

// The rings, from the middle out: the boss, a ring round it, a bead ring, the field of petals, a ring, the band of
// glyph plates, a ring of beads, the band of marked plates, a groove at the rim's foot.
export const RINGS = {
  boss: 7.6, bossRing: [9.75, 1.95, 8.2], beads0: [13.05, 1.35, 3.4], field: [14.4, 28.6],
  ring: [30.65, 2.05, 5.4], glyphs: [32.9, 48.6], beads1: [50.75, 1.95, 3.9], plates: [52.85, 68.1], groove: [69.1, 0.9, 0.8],
} as const;

export function face(r: number): number {
  const R = RINGS;
  let up = 0;
  // The boss, in three flat tiers with crisp rounded edges: a smooth dome there mirrored the room as a melted blob.
  if (r < R.boss + 0.2) up = 8 * qr((R.boss - r) / 0.6) + 4 * qr((5 - r) / 0.5) + 3 * qr((2.6 - r) / 0.45) + (r < 2.6 ? 0.8 * (1 - (r / 2.6) ** 2) : 0);
  up = Math.max(up, bump(r, R.bossRing[0], R.bossRing[1], R.bossRing[2]), bump(r, R.beads0[0], R.beads0[1], R.beads0[2]));
  up = Math.max(up, bump(r, R.ring[0], R.ring[1], R.ring[2]), land(r, R.glyphs[0], R.glyphs[1], 1.7, 0.55));
  up = Math.max(up, bump(r, R.beads1[0], R.beads1[1], R.beads1[2]), land(r, R.plates[0], R.plates[1], 1.7, 0.55));
  let sunk = 0;
  if (r > R.field[0] && r < R.field[1]) sunk -= 0.7 * Math.sin((Math.PI * (r - R.field[0])) / (R.field[1] - R.field[0]));
  sunk -= bump(r, R.groove[0], R.groove[1], R.groove[2]);
  return dome(r) + up + sunk;
}

// One point of the section: across and up, in the carving's units, and whether it is on the back, where the
// carving's map is not read.
export interface Point { r: number; z: number; back: boolean }

// The whole section, from the face's middle out over the rim and in across the back, drawn finely: it is thinned
// where it is straight before it is turned into a solid.
export function section(): Point[] {
  const out: Point[] = [];
  for (let r = 0; r < RIM.c - RIM.a; r += 0.04) out.push({ r, z: face(r), back: false });
  for (let i = 0; i <= 240; i++) {
    const p = Math.PI - (i / 240) * (1.5 * Math.PI), c = Math.cos(p), s = Math.sin(p), e = 2 / RIM.square;
    out.push({ r: RIM.c + RIM.a * Math.sign(c) * Math.abs(c) ** e, z: (p < 0 ? RIM.back : RIM.b) * Math.sign(s) * Math.abs(s) ** e, back: p < 0 });
  }
  for (let r = RIM.c - 0.5; r >= 0; r -= 1) out.push({ r, z: BACK.at - BACK.bulge * (1 - (r / RIM.c) ** 2), back: true });
  out.push({ r: 0, z: BACK.at - BACK.bulge, back: true });
  return out;
}

// The section thinned: no point is kept that lies closer than tol to the line between its neighbours.
export function thin(pts: Point[], tol: number): Point[] {
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack: [number, number][] = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    const A = pts[a], B = pts[b], dx = B.r - A.r, dz = B.z - A.z, len = Math.hypot(dx, dz) || 1;
    let far = -1, at = -1;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs((pts[i].r - A.r) * dz - (pts[i].z - A.z) * dx) / len;
      if (d > far) { far = d; at = i; }
    }
    if (far > tol) { keep[at] = 1; stack.push([a, at], [at, b]); }
  }
  return pts.filter((_, i) => keep[i] || (i > 0 && pts[i].back !== pts[i - 1].back));
}
