import * as THREE from 'three';
import { seeded } from '../../../../world/build';
import { FALLS, GROUND } from '../../layout';

// The shape of the ground, in units, shared by everything that is made for it. Depths are measured down from the
// ground's top, so a depth of 16 is y = -16.

const D2R = Math.PI / 180;

// The rim: the promenade runs out to the parapet, whose inner face stands here. Everything else of the rim is in
// ./rim.ts.
export const RIM = { parapet: 641 } as const;

// The rock: under the rim a cliff that leans in a little, then the body, which narrows to the keel in strata. The
// keel's collar takes over where the rock ends, and its mouth is the bottom of the ground.
export const ROCK = { top: 17, cliff: 46, end: 182, r0: 648, rCliff: 630, rEnd: 74, bend: 1.0 } as const;
export const KEEL = { top: 177, mouth: GROUND.rock, flange: 80 } as const;

// The smooth line the rock's strata are hung from: how far out it is at a depth.
export function reach(d: number): number {
  if (d <= ROCK.cliff) return ROCK.r0 + ((ROCK.rCliff - ROCK.r0) * (d - ROCK.top)) / (ROCK.cliff - ROCK.top);
  const x = Math.min(1, (d - ROCK.cliff) / (ROCK.end - ROCK.cliff));
  return ROCK.rEnd + (ROCK.rCliff - ROCK.rEnd) * (1 - x) ** ROCK.bend;
}

// The ribs that hold the rock, let into it in cut channels, sixteen round it, one under every avenue and one between
// each two. Each runs from an anchor under the rim to the keel's flange. Half its width, how far it stands out from
// the line of the strata's tops, and how far its channel is cut back.
export const RIB = { n: 16, half: 5.6, out: 1.4, deep: 7.5, clear: 2.6, from: 20, to: KEEL.top + 2 } as const;
export const ribAngles = (): number[] => Array.from({ length: RIB.n }, (_, i) => (i * 360) / RIB.n);

// A lift housing on every rib, half sunk into the rock: a drum standing upright, how far down its middle is, its
// radius and its height.
export const POD = { d: 122, r: 11.5, tall: 30 } as const;

// The strata: the depth each one's top is at. The last ends where the rock does.
export function strata(): number[] {
  const r = seeded(4410), tops: number[] = [ROCK.top];
  let d = ROCK.top;
  // A few massive beds between thin ones: no two neighbours alike.
  while (d < ROCK.end - 8) {
    const q = r();
    d += q < 0.28 ? 5 + 4 * r() : q < 0.62 ? 10 + 7 * r() : 20 + 14 * r();
    tops.push(d);
  }
  const last = tops[tops.length - 1];
  return tops.map((t) => ROCK.top + ((t - ROCK.top) * (ROCK.end - ROCK.top)) / (last - ROCK.top));
}

// Where each fall leaves the rim: its bearing in degrees from straight toward the visitor.
export const fallBearings = (): number[] => FALLS.map((x) => Math.asin(x / GROUND.r) / D2R);

// The cell attribute every made thing carries: what it is made of and how it is lit. The made material reads it.
export const KIND = { stone: 0, steel: 1, copper: 2, dark: 3, light: 4, leaf: 5, bronze: 6, glass: 7, slate: 8 } as const;
export function kind(g: THREE.BufferGeometry, k: number, a = 0, b = 0, c = 0): THREE.BufferGeometry {
  const n = g.getAttribute('position').count, cell = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { cell[i * 4] = k; cell[i * 4 + 1] = a; cell[i * 4 + 2] = b; cell[i * 4 + 3] = c; }
  g.setAttribute('cell', new THREE.Float32BufferAttribute(cell, 4));
  return g;
}

// A periodic noise round the circle, smooth, the same on every call for one seed.
export function ringNoise(seed: number, terms: [number, number][]): (deg: number) => number {
  const r = seeded(seed), ph = terms.map(() => r() * Math.PI * 2);
  return (deg: number) => { let s = 0; terms.forEach(([f, a], i) => { s += a * Math.sin(f * deg * D2R + ph[i]); }); return s; };
}

// Place a geometry at a bearing and a radius, its own +z pointing out from the middle.
export function onRing(bearing: number, r: number, y: number): THREE.Matrix4 {
  const t = bearing * D2R;
  return new THREE.Matrix4().makeRotationY(t).setPosition(Math.sin(t) * r, y, Math.cos(t) * r);
}

// Whether a bearing is on the half of the ground that is seen: the view is fixed, from in front, and nothing behind
// the rock's widest line is ever drawn on the screen.
export const seen = (deg: number) => Math.abs(((deg + 540) % 360) - 180) < 112;

export { D2R };
