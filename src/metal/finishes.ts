import { hex, type PaletteName } from '../config/palette';

export type Finish = 'aged' | 'polished' | 'coated' | 'bronze' | 'panel' | 'card';

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
  // How bright the one soft light is (1 as photographed), and a clear coat that throws the lamp back pale and wide.
  // Together they let the cursor's light show on a face that would otherwise be too bright to show it.
  band?: number;
  coat?: number;
}

// The finishes, in copper and bronze.
//   polished: bright copper, words cut in and filled with dark enamel
//   coated:   polished copper for a button, gently domed, under a clear coat. It reflects one soft light as a band
//             through its middle, where the words are, and the dark of the room along its upper and lower edges.
//             The band is turned down a little and the coat throws the lamp back pale, so the cursor's light shows
//             crossing it. Tarnish keeps to the rim. Clouds of it on the face were tried and read as dirt
//   aged:     darker copper with patina and a double cut border
//   bronze:   dark bronze, words in bright copper set flush
//   panel:    brushed copper frame around a sunk dark bronze panel
//   card:     a project card. Copper only as its edge bead and the frame round its picture, and on one layout a
//             band of dark bronze under the picture. The face is not metal
export const FINISHES: Record<Finish, FinishParams> = {
  aged: { a: COPPER, b: COPPER_LIGHT, ra: 0.34, rb: 0.3, aniso: 0.45, grain: 0.075, patina: 1, scratch: 1, id: 0 },
  polished: { a: COPPER_LIGHT, b: COPPER_LIGHT, ra: 0.1, rb: 0.1, aniso: 0.08, grain: 0.008, patina: 0.06, scratch: 0.25, id: 1 },
  coated: { a: COPPER_LIGHT, b: COPPER_LIGHT, ra: 0.09, rb: 0.09, aniso: 0.1, grain: 0.008, patina: 0.6, scratch: 0.3, id: 1, pillow: 6, rimW: 8, faceClean: 1, soft: 1, band: 0.72, coat: 0.3 },
  bronze: { a: BRONZE_DEEP, b: COPPER_LIGHT, ra: 0.32, rb: 0.38, aniso: 0.5, grain: 0.04, patina: 0.3, scratch: 0.35, id: 2, inlay: 0.8 },
  panel: { a: COPPER_LIGHT, b: BRONZE_DEEP, ra: 0.26, rb: 0.38, aniso: 0.9, grain: 0.14, patina: 0.12, scratch: 0.3, id: 3 },
  card: { a: COPPER, b: BRONZE_DEEP, ra: 0.2, rb: 0.44, aniso: 0.25, grain: 0.02, patina: 0.5, scratch: 0, id: 4 },
};

// A card's face, and the warmth light raises on it. The stream's own card is drawn with the same two colors.
export const FACE = metal('bg-2');
export const FACE_LIT = metal('bronze-deep');
// The tones a card's picture is mapped onto at rest, dark to light.
export const RAMP = new Float32Array([...metal('bg'), ...metal('bronze-deep'), ...metal('bronze'), ...metal('copper'), ...metal('copper-light')]);

export const INK: [number, number, number] = [0.006, 0.005, 0.004];

// The light that runs round a button's border under the pointer.
export const GLOW = metal('pale');
// Design units from a control's edge to its cut border (src/metal/mask.ts draws it at 5, one unit wide).
export const CONTROL_RING = 5.5;
