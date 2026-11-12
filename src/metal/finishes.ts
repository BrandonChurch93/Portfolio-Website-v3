import { hex, type PaletteName } from '../config/palette';

export type Finish = 'aged' | 'polished' | 'worn' | 'bronze' | 'panel';
// What a button does under the pointer, beyond the lamp's own glow. Options for Brandon to choose from (BRIEF.md, Open 17).
//   run:   light runs round the cut border from where the pointer came in
//   heat:  the metal warms where the pointer is and cools behind it
//   pull:  the button is drawn toward the pointer and leaves its shadow behind
//   catch: the cuts and the words catch the light only where the pointer is near
export type HoverStyle = 'run' | 'heat' | 'pull' | 'catch';

const lin = (v: number): [number, number, number] => [(v >> 16) & 255, (v >> 8) & 255, v & 255].map((c) => Math.pow(c / 255, 2.2)) as [number, number, number];
const metal = (name: PaletteName) => lin(hex(name));

// The metals, from the palette's metal family (src/config/palette.ts). The numbers a shader takes are linear.
export const COPPER_LIGHT = metal('copper-light');
export const COPPER = metal('copper');
export const BRONZE = metal('bronze');
export const BRONZE_DEEP = metal('bronze-deep');

export interface FinishParams {
  a: [number, number, number]; // the plate's metal, linear F0
  b: [number, number, number]; // the second metal (inlay or panel)
  ra: number; // roughness of a
  rb: number; // roughness of b
  aniso: number; // how brushed: 0 polished round highlight, 1 long streak
  grain: number; // normal perturbation of the brushing
  patina: number; // 0 clean, 1 aged
  scratch: number; // fine scratches
  id: number; // shader finish id
  // For small controls. How domed the face is (design units), how far tarnish reaches in from the edge (design units),
  // and how clean the open face stays, 0 to 1. Left out, a control is domed and tarnish follows the plate rules.
  pillow?: number;
  rimW?: number;
  faceClean?: number;
  // 0 to 1: lit by one wide soft light from straight in front, which a domed face reflects as a band through its middle.
  soft?: number;
  // The least an inlaid word shows of its own metal, 0 to 1, so it reads wherever the lamp is.
  inlay?: number;
  // How much of the pointer's heat the open face shows, 0 to 1. A dark face shows little, so its glowing words still read.
  heat?: number;
}

// Four finishes in copper and bronze.
//   polished: bright copper, words cut in and filled with dark enamel
//   worn:     polished copper for a button, gently domed. It reflects one soft light as a bright band through its
//             middle, where the words are, and the dark of the room along its upper and lower edges. Tarnish keeps
//             to the rim. Clouds of it on the face were tried and read as dirt
//   aged:     darker copper with patina and a double cut border
//   bronze:   dark bronze, words in bright copper set flush
//   panel:    brushed copper frame around a sunk dark bronze panel
export const FINISHES: Record<Finish, FinishParams> = {
  aged: { a: COPPER, b: COPPER_LIGHT, ra: 0.34, rb: 0.3, aniso: 0.45, grain: 0.075, patina: 1, scratch: 1, id: 0 },
  polished: { a: COPPER_LIGHT, b: COPPER_LIGHT, ra: 0.1, rb: 0.1, aniso: 0.08, grain: 0.008, patina: 0.06, scratch: 0.25, id: 1 },
  worn: { a: COPPER_LIGHT, b: COPPER_LIGHT, ra: 0.09, rb: 0.09, aniso: 0.1, grain: 0.008, patina: 0.6, scratch: 0.3, id: 1, pillow: 6, rimW: 8, faceClean: 1, soft: 1, heat: 0.75 },
  bronze: { a: BRONZE_DEEP, b: COPPER_LIGHT, ra: 0.32, rb: 0.38, aniso: 0.5, grain: 0.04, patina: 0.3, scratch: 0.35, id: 2, inlay: 0.8, heat: 0.09 },
  panel: { a: COPPER_LIGHT, b: BRONZE_DEEP, ra: 0.26, rb: 0.38, aniso: 0.9, grain: 0.14, patina: 0.12, scratch: 0.3, id: 3 },
};

export const INK: [number, number, number] = [0.006, 0.005, 0.004];

// The light that runs round a button's border under the pointer.
export const GLOW = metal('pale');
// Heated metal, coolest to hottest, from the palette's light.
export const HEAT_COLORS = [metal('ember'), metal('flame'), metal('hot'), metal('pale')];
// Heat: how many points of warmth a plate holds, how far the pointer moves before it leaves one behind (CSS px),
// and how long warmth takes to build under a still pointer and to fade once it has gone (seconds).
export const HEAT = { points: 6, step: 9, build: 0.22, fade: 0.6 };
// Design units from a control's edge to its cut border (src/metal/mask.ts draws it at 5, one unit wide).
export const CONTROL_RING = 5.5;
