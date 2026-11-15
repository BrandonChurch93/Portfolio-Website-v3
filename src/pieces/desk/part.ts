import type * as THREE from 'three';
import type { Tier } from '../../config/site';

// The desk is one piece with one stage, and each thing on it is a part: one file in ./parts, behind this contract.
// A part builds its group in millimetres, in the desk's own frame (./layout.ts), and is told each frame what the
// desk is doing. It never touches the stage, the camera or another part.

export const PARTS = ['bench', 'mat', 'lamp', 'monitor', 'keyboard', 'mouse', 'tablet', 'camera', 'pc'] as const;
export type PartName = (typeof PARTS)[number];

// How much each of the desk's lights is on, 0 to 1. room is the light the desk is seen by before any of its own is
// on. The page brings them up as the stream arrives: the lamp at its strike, then the tablet, the monitor, the keys
// and the PC, left to right.
export interface DeskLights { room: number; lamp: number; tablet: number; monitor: number; keys: number; pc: number }
export const LIT: DeskLights = { room: 1, lamp: 1, tablet: 1, monitor: 1, keys: 1, pc: 1 };

export interface PartState {
  // The clock, in seconds.
  t: number;
  lights: DeskLights;
  // Where the cursor's light is over the desk, in the desk's millimetres, and how much a real cursor leads it, 0 to 1.
  cursor: THREE.Vector3;
  led: number;
  // Where the pointer itself is over the desk's top, in the desk's millimetres. The light stands above the pointer,
  // so a thing that answers the pointer, as the keys do, reads this and not the light's place.
  pointer: THREE.Vector3;
  // What the stream is doing to the lamp: how much it is on it, and the seconds since it struck.
  stream: { on: number; since: number };
  // Nothing loops and nothing drifts: reduced motion, or a held frame.
  still: boolean;
}

export interface DeskPart {
  group: THREE.Group;
  // How the part is framed when it is seen alone: its middle, in the desk's millimetres, and how far from it the
  // part reaches. Without it the frame is taken from everything in the group, a glow's plane included.
  alone?: { at: [number, number, number]; r: number };
  // Called before a frame is drawn. It returns true while the part is moving by itself and needs the next frame
  // drawn too.
  update?(s: PartState): boolean | void;
  dispose?(): void;
}

export type PartFactory = (ctx: { tier: Tier }) => DeskPart | Promise<DeskPart>;
