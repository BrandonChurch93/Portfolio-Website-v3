// The mouse's shape, in millimetres in its own frame: x across (its right is +x), y up from the mat, z along its
// length with the nose at -z. It is a loft of one cross section along its length, a section of straight bands that
// meet at hard creases (the line of light, the lip, the trim, the side, the seam, the top), so that small on the page
// it reads by its bands of value and not as one dome.

export type V2 = [number, number];

export const LEN = 124;
export const Z0 = -LEN / 2;

// Where along its length (0 at the nose, 1 at the tail) the buttons end and the palm begins, the gap between them,
// and where the tail starts to round in plan.
export const SPLIT = 0.43;
export const GAP = 1.2 / LEN;
// How far back the middle of that seam runs from its ends, in millimetres, and over how much of the length it is
// carried there.
export const VEE = { back: 10, run: 0.15 };
// How far the foot is drawn in under the line of light.
const TUCK = 3.4;
export const TAIL = 0.8;

// The slot between the buttons the wheel stands in, its half width and depth, and where it opens and closes along the
// length: only as long as the wheel, and before and behind it the buttons meet at a thin, shallow seam.
export const CHANNEL = { half: 4.6, depth: 4.2, thin: 0.45, shallow: 1.6, from: [0.06, 0.09] as V2, to: [0.245, 0.275] as V2 };
const ramp = (a: number, b: number, t: number) => { const u = Math.min(1, Math.max(0, (t - a) / (b - a))); return u * u * (3 - 2 * u); };
const slot = (t: number) => ramp(CHANNEL.from[0], CHANNEL.from[1], t) * (1 - ramp(CHANNEL.to[0], CHANNEL.to[1], t));
// The small button behind the wheel, and the wheel: where each is along the length and its sizes in millimetres.
export const DPI = { t: 0.3, w: 4.4, l: 7, h: 3, proud: 0.6 };
export const WHEEL = { t: 0.17, r: 9.2, w: 7.2, proud: 3.2 };
// The thin line of light round the foot: how high its lower and upper edges stand.
export const LED = { y0: 1.5, y1: 4.3 };
// How wide and deep the seams are cut.
export const SEAM = { w: 1.1, depth: 2.4 };

// A smooth curve through knots (Catmull-Rom on uneven spacing).
function curve(knots: [number, number][]): (t: number) => number {
  return (t) => {
    const n = knots.length;
    if (t <= knots[0][0]) return knots[0][1];
    if (t >= knots[n - 1][0]) return knots[n - 1][1];
    let i = 0;
    while (knots[i + 1][0] < t) i++;
    const [t0, p0] = knots[i], [t1, p1] = knots[i + 1];
    const slope = (a: number, b: number) => (knots[b][1] - knots[a][1]) / (knots[b][0] - knots[a][0]);
    const m0 = i > 0 ? slope(i - 1, i + 1) : slope(i, i + 1);
    const m1 = i + 2 < n ? slope(i, i + 2) : slope(i, i + 1);
    const h = t1 - t0, s = (t - t0) / h, s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * p0 + (s3 - 2 * s2 + s) * h * m0 + (-2 * s3 + 3 * s2) * p1 + (s3 - s2) * h * m1;
  };
}

// Half its width at the mat: broad at the buttons, in at the waist where the thumb lies, broadest under the palm.
const base = curve([[0, 27.5], [0.14, 29.5], [0.42, 26.6], [0.68, 31], [0.8, 30.8], [1, 30]]);
// How high its spine is: low at the nose, up a long straight run to the hump over the palm, then down to the tail.
const spine = curve([[0, 13], [0.1, 17.5], [0.4, 31.5], [0.62, 40], [0.74, 38.5], [0.87, 29], [0.95, 19], [1, 12.5]]);
// The shoulder, where the dark skirt meets the lip of the shell: its height, and how far in from the widest line it
// stands.
const shoulderY = curve([[0, 7], [0.15, 7.6], [0.4, 7.2], [0.6, 8.4], [0.79, 10.2], [0.9, 9.6], [1, 8]]);
const shoulderIn = curve([[0, 0.6], [0.44, 0.9], [1, 0.6]]);
// Under the thumb, on the left only, the foot flares out into a ledge.
export const FLARE = { at: 0.44, run: 0.2, out: 4.5 };
const flare = (t: number) => FLARE.out * Math.max(0, 1 - ((t - FLARE.at) / FLARE.run) ** 2) ** 2;
// How the section narrows into the rounded tail and the rounded corners of the nose.
function narrow(t: number): number {
  if (t > TAIL) { const u = (t - TAIL) / (1 - TAIL); return Math.sqrt(Math.max(0, 1 - u * u)); }
  if (t < 0.07) return 0.78 + 0.22 * Math.sqrt(t / 0.07);
  return 1;
}
// The points of the section, from the foot outward and up to the middle: the foot, drawn in; the lower and upper
// edges of the line of light; the top of the dark skirt under the shell's lip; the lip's outer edge; the top of the
// steel trim along it; the top of the graphite side facet; the floor of the groove beside the top (between the buttons
// and the side, and on the palm the parting line); the top's own edge; the inner edge of its top facet; the foot of
// the slot's wall; and the slot's floor at the middle. On the palm the last three come together at the spine.
export const I = { foot: 0, ledLow: 1, ledTop: 2, under: 3, lip: 4, trim: 5, facet: 6, groove: 7, edge: 8, top: 9, wall: 10, floor: 11 } as const;
export const COUNT = 12;
// How far back from the nose each point of the section stands at the very front, by its index: the foot is drawn in
// under the buttons' lips, and the seam is a small notch in the nose.
const LEAN = [13, 12, 11, 8, 7.4, 6.5, 2.5, 2, 1.5, 0, 0.6, 0.6];
const LEAN_RUN = 0.18;

export const zAt = (t: number) => Z0 + LEN * t;

// The section at a place along the length, half of it (x >= 0), on the right (side 1) or the left (-1).
export function section(t: number, button: boolean, side = 1): { pts: V2[]; z: number[] } {
  const k = narrow(t), w = base(t) + (side < 0 ? flare(t) : 0), yh = spine(t), yc = shoulderY(t), ws = w - shoulderIn(t);
  const lip = 0.7, ch = 1.0;
  const xl = ws + lip, yl = yc + 0.35;
  const wt = (xl - ch) * 0.64, yt = yl + ch + 0.58 * (yh - yl - ch);
  const open = slot(t);
  const g = button ? CHANNEL.thin + (CHANNEL.half - CHANNEL.thin) * open : 0;
  const deep = button ? CHANNEL.shallow + (CHANNEL.depth - CHANNEL.shallow) * open : 0;
  const pts: V2[] = [
    [w - TUCK, 0],
    [w - 0.9, LED.y0],
    [w - 0.9, LED.y1],
    [ws, yc],
    [xl, yl],
    [xl - ch * 0.8, yl + ch],
    [wt, yt],
    [wt - SEAM.w * 0.3, yt - SEAM.depth * 0.35],
    [wt - SEAM.w, yt + SEAM.w * 0.25],
    [g, yh],
    [g, yh - deep],
    [0, yh - deep],
  ];
  for (const p of pts) p[0] *= k;
  const lean = Math.max(0, 1 - t / LEAN_RUN) ** 2;
  // Toward the seam between the buttons and the palm the middle of the top is carried back, so the seam is a V.
  const v = button ? ramp(SPLIT - VEE.run, SPLIT, t) : 1 - ramp(SPLIT + GAP, SPLIT + GAP + VEE.run, t);
  return { pts, z: pts.map((_, i) => zAt(t) + LEAN[i] * lean + (i >= I.top ? VEE.back * v : 0)) };
}

export const spineAt = spine;

// The thumb's two buttons on the left flank: where along the length each runs, where across the shell's side facet it
// sits, from the trim (0) to the parting line (1), and how proud it stands.
export const THUMB = { runs: [[0.285, 0.36], [0.372, 0.445]] as V2[], across: [0.2, 0.55] as V2, proud: 1.1 };
// The mark on the palm, a slit of light along its spine: where along the length it runs, and its width, in
// millimetres.
export const MARK = { from: 0.66, to: 0.86, stroke: 0.9 };
