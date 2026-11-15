// The planet's layers, as seen in the break, by how deep they lie under its surface (depth in ./shape.ts): soil, the
// crust in beds, columns of basalt, the dark mantle, and the metal of the deep, which also wraps the core. Each a kind
// of rock, broken its own way. The material reads the layer of each block from its cell, so a block is one stuff,
// and draws the beds inside a layer from where the point is.
import { HEART } from '../../layout';
import { depth } from './shape';
export const LAYER = { made: 0, crust: 1, basalt: 2, mantle: 3, metal: 4 } as const;
export type Layer = (typeof LAYER)[keyof typeof LAYER];

export interface Bed {
  layer: Layer;
  // Where the layer begins and ends, in q.
  from: number;
  to: number;
  // How thick its beds are, how far apart its joints run along a bed, and the most a block may stand along the face
  // before it is broken across again.
  thick: [number, number];
  joint: [number, number];
  tall: number;
  // How far a block stands out of the face or sinks into it, how much it is turned, in degrees, and how far its edges
  // are cut back.
  out: [number, number];
  tilt: number;
  cut: number;
}

export const BEDS: Bed[] = [
  { layer: LAYER.crust, from: 19, to: 128, thick: [6, 20], joint: [8, 60], tall: 28, out: [-2.5, 3.2], tilt: 8, cut: 0.9 },
  { layer: LAYER.basalt, from: 128, to: 222, thick: [40, 54], joint: [11, 19], tall: 64, out: [-3, 4.5], tilt: 3, cut: 0.7 },
  { layer: LAYER.mantle, from: 222, to: 316, thick: [30, 50], joint: [24, 80], tall: 48, out: [-2.5, 5], tilt: 10, cut: 1.4 },
  { layer: LAYER.metal, from: 316, to: 900, thick: [22, 36], joint: [16, 32], tall: 32, out: [-2, 4], tilt: 15, cut: 1.1 },
];

// The metal of the deep also wraps the core, this far from its middle.
export const WRAP = 262;
// The layer at a point.
export function layerOf(x: number, y: number, z: number): Layer {
  if (Math.hypot(x - HEART[0], y - HEART[1], z - HEART[2]) < WRAP) return LAYER.metal;
  const d = depth(x, y, z);
  for (let i = BEDS.length - 1; i >= 0; i--) if (d >= BEDS[i].from) return BEDS[i].layer;
  return LAYER.crust;
}

// What each triangle is, in cell.w. For rock, cell.z is how far the block is sunk among those round it, from 0 to 9,
// twice over, with 1 added on a worn edge.
export const KIND = { rock: 0, back: 1, strip: 2, vent: 3, concrete: 4, copper: 5, bronze: 6, hole: 7, gold: 8 } as const;
