// The disc's rock, which ./rock.ts was built to and nothing else reads. ./rock.ts is kept for the torn underside's
// builder to borrow from: delete this file with it. The ground on the dome uses ./kit.ts.

const D2R = Math.PI / 180;

const RIM = { soffit: 19, under: 651 } as const;
export const ROCK = { top: RIM.soffit, end: 182, r0: RIM.under - 3, rEnd: 76 } as const;
export const KEEL = { top: 177, mouth: 220, flange: 80 } as const;
export const BOWL = { p: 1.7, q: 0.85 } as const;
export function reach(d: number): number {
  const x = Math.min(1, Math.max(0, (d - ROCK.top) / (ROCK.end - ROCK.top)));
  return ROCK.rEnd + (ROCK.r0 - ROCK.rEnd) * (1 - Math.pow(x, BOWL.p)) ** BOWL.q;
}
export const RIB = { bearings: [-108, -72, -36, 36, 72, 108, 144, 180, -144], half: 9, out: 9, deep: 17, from: 24, to: KEEL.top + 2 } as const;
export const CHUTE = { half: 15, rib: 6 } as const;
export const gap = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);
export const seen = (deg: number, wide = 112) => gap(deg, 0) < wide;

export { D2R };
