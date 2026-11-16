import type * as THREE from 'three';
import type { Tier } from '../../config/site';

// The launch pad is one piece with one stage, and each thing on it is a part: one file in ./parts, behind this
// contract. A part builds its group in units, in the pad's own frame (./layout.ts), and is told each frame what the
// pad is doing. It never touches the stage, the camera or another part.

export const PARTS = ['stone', 'table', 'tower', 'rocket'] as const;
export type PartName = (typeof PARTS)[number];

export interface PartState {
  // The clock, in seconds.
  t: number;
  // How far the stone is lit, from its rim (0) to its middle (1). The rocket lights from its foot up with it (FUEL).
  fill: number;
  // The seconds since the stone became full, which is the launch's own clock. At 0 or less the rocket stands on its
  // table. It can run back, and a held age is a still.
  launch: number;
  // How hard the engine burns, 0 to 1, and how far the rocket has climbed, in units. Both follow from launch. The
  // pad moves the rocket's group up by the climb itself.
  burn: number;
  climb: number;
  // Only while the launch's age is rising: an engine that lights as the rocket settles back is wrong.
  flash: number;
  // What the stream is doing to the stone where it lands: how much it is on it, and the seconds since it struck.
  stream: { on: number; since: number };
  // Where the cursor's light is, in units.
  cursor: THREE.Vector3;
  // Nothing loops and nothing drifts: reduced motion, or a held frame.
  still: boolean;
}

export interface PadPart {
  group: THREE.Group;
  // How the part is framed when it is seen alone: its middle, in units, and how far from it the part reaches.
  alone?: { at: [number, number, number]; r: number };
  // Called before a frame is drawn. It returns true while the part is moving by itself and needs the next frame
  // drawn too.
  update?(s: PartState): boolean | void;
  dispose?(): void;
}

// renderer is the pad's own, for a part that bakes a picture as it is built (the stone's carving). A part draws
// into its own targets with it, puts back what it changed, and keeps no hold of it.
export type PartFactory = (ctx: { tier: Tier; renderer: THREE.WebGLRenderer }) => PadPart | Promise<PadPart>;
