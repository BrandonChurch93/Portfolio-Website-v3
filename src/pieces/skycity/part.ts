import type * as THREE from 'three';
import type { Tier } from '../../config/site';

// The city is one piece with one stage, and each of its things is a part: one file in ./parts, behind this
// contract. A part builds its group in units, in the city's own frame (./layout.ts), and is told each frame what
// the city is doing. It never touches the stage, the camera or another part.

export const PARTS = ['ground', 'spire', 'towers'] as const;
export type PartName = (typeof PARTS)[number];

export interface PartState {
  // The clock, in seconds.
  t: number;
  // Where the cursor's light is, in units.
  cursor: THREE.Vector3;
  // Nothing loops and nothing drifts: reduced motion, or a held frame.
  still: boolean;
}

export interface CityPart {
  group: THREE.Group;
  // How the part is framed when it is seen alone: its middle, in units, and how far from it the part reaches.
  alone?: { at: [number, number, number]; r: number };
  // Called before a frame is drawn. It returns true while the part is moving by itself and needs the next frame
  // drawn too.
  update?(s: PartState): boolean | void;
  dispose?(): void;
}

// renderer is the city's own, for a part that bakes a picture as it is built. A part draws into its own targets
// with it, puts back what it changed, and keeps no hold of it.
export type PartFactory = (ctx: { tier: Tier; renderer: THREE.WebGLRenderer }) => CityPart | Promise<CityPart>;
