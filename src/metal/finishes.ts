import { hex, type PaletteName } from '../config/palette';

export type Finish = 'aged' | 'polished' | 'bronze' | 'panel';

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
}

// Four finishes in copper and bronze.
//   polished: bright copper, words cut in and filled with dark enamel
//   aged:     darker copper with patina and a double cut border
//   bronze:   dark bronze, words in bright copper set flush
//   panel:    brushed copper frame around a sunk dark bronze panel
export const FINISHES: Record<Finish, FinishParams> = {
  aged: { a: COPPER, b: COPPER_LIGHT, ra: 0.34, rb: 0.3, aniso: 0.45, grain: 0.075, patina: 1, scratch: 1, id: 0 },
  polished: { a: COPPER_LIGHT, b: COPPER_LIGHT, ra: 0.1, rb: 0.1, aniso: 0.08, grain: 0.008, patina: 0.06, scratch: 0.25, id: 1 },
  bronze: { a: BRONZE_DEEP, b: COPPER_LIGHT, ra: 0.32, rb: 0.38, aniso: 0.5, grain: 0.04, patina: 0.3, scratch: 0.35, id: 2 },
  panel: { a: COPPER_LIGHT, b: BRONZE_DEEP, ra: 0.26, rb: 0.38, aniso: 0.9, grain: 0.14, patina: 0.12, scratch: 0.3, id: 3 },
};

export const INK: [number, number, number] = [0.006, 0.005, 0.004];
