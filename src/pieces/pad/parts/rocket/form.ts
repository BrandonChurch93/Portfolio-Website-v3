import { FUEL, ROCKET } from '../../layout';

// The rocket's form, in units, measured up from the mouth of its engine, as ROCKET's own heights are: the part puts
// this frame at ROCKET.mouth over the stone. The tower's arms are measured from the stone. Angles are round its axis
// from straight toward the visitor, positive to the visitor's right.

const D2R = Math.PI / 180;
export const R = ROCKET.r;

// Its heights, from the mouth up.
export const H = {
  // The bell's mouth and its throat, the heat shield under the body, and the aft skirt.
  throat: 17,
  shield: 22,
  skirt: 26,
  // The lower stage's tank, from the skirt's seam to the interstage.
  tank: 56,
  inter: ROCKET.bands[0] - 12,
  upper: ROCKET.bands[0] + 14,
  // The upper stage, its collar, the nose and its spike.
  collar: ROCKET.bands[1] - 8,
  nose: ROCKET.bands[1],
  tip: ROCKET.nose,
  spike: ROCKET.tall,
} as const;

// The upper stage is a little slimmer than the lower.
export const R2 = R - 1.6;

// The fins: four, at the corners, so each side shows two, one before the other, at the outline's reach (ROCKET.fin)
// and with their faces to the light. Seen edge on, a fin toward the visitor drew a line down the middle of the bell.
// A fin's root runs up the body, its swept leading edge out to its tip, which comes straight down to its foot on the
// table: the feet stand at FIN.out from the axis, ROCKET.fin across and ROCKET.fin deep, at FIN.foot under the mouth.
export const FIN = { angles: [45, 135, 225, 315].map((a) => a * D2R), rootLo: 30, rootHi: 138, out: ROCKET.fin * Math.SQRT2, tipHi: 14, foot: -7, thick: 3.4 } as const;
// Where the four feet stand on the table, in the pad's units: the table's hold downs are under these.
export const FEET = FIN.angles.map((a) => [Math.sin(a) * FIN.out, ROCKET.mouth + FIN.foot, Math.cos(a) * FIN.out] as [number, number, number]);

// The bell: radius against height, outside, from its mouth up to its throat.
export const BELL: [number, number][] = [[21.5, 0], [20.2, 2.4], [18, 5.6], [15.4, 9.2], [12.8, 12.6], [10.8, 15.4], [9.8, 17], [9.6, 19.5]];

// The raceway that runs up the side and carries the line of light, and the hatches, the ports and the code, by their
// angle round the axis and their heights.
export const RACEWAY = { a: 21 * D2R, w: 5.2, out: 2.3, lo: 28, hi: H.collar - 2 } as const;
export const PORTS = [{ a: -24 * D2R, h: 318, r: 3.6 }, { a: -24 * D2R, h: 343, r: 3.6 }] as const;
export const HATCHES = [{ a: -30 * D2R, h: 172, w: 15, t: 22 }, { a: 18 * D2R, h: 324, w: 12, t: 16 }] as const;
export const CODE = { a: 0, lo: 140, hi: 214, w: 9 } as const;
// The plates the tower's arms reach, on the side toward the tower, at the arms' heights.
export const PLATES = { a: -90 * D2R, h: [455, 375, 193].map((y) => y - ROCKET.mouth), w: 11, t: 13 } as const;

// How high the light has climbed up the rocket, in units from the mouth, for how full the stone is: nothing until the
// lower stage's share, then up each stage in turn. Below the skirt it is not yet on.
export function level(fill: number): number {
  const seg = (a: number, b: number, y0: number, y1: number) => y0 + ((y1 - y0) * (fill - a)) / (b - a);
  if (fill < FUEL.lower) return -100;
  if (fill < FUEL.upper) return seg(FUEL.lower, FUEL.upper, H.skirt, H.upper);
  if (fill < FUEL.nose) return seg(FUEL.upper, FUEL.nose, H.upper, H.nose + 4);
  return seg(FUEL.nose, 1, H.nose + 4, H.spike + 2);
}

// Where a point round the body is, from its angle, its radius and its height.
export const round = (a: number, r: number, h: number): [number, number, number] => [Math.sin(a) * r, h, Math.cos(a) * r];

// The tangent ogive of the nose: its radius at a height over its base.
export function ogive(y: number): number {
  const L = H.tip - H.nose, rho = (R2 * R2 + L * L) / (2 * R2);
  return Math.sqrt(Math.max(0, rho * rho - y * y)) + R2 - rho;
}
