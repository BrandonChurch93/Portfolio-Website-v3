import type * as THREE from 'three';
import type { Tier } from '../../config/site';

// The hero's world is one piece with one stage, and each thing in it is a part: one file in ./parts, behind this
// contract. A part builds its group in the world's units, in the world's own frame (./layout.ts), from files made
// ahead by scripts/world/, and is told each frame what the world is doing. It never touches the stage, the camera
// or another part.

// Every part of the world, in the order they are made ready. `rest` comes last: it is whatever is not built yet,
// as plain dark shapes in its place, and it leaves out what the parts before it say they have built.
export const PARTS = ['rock', 'skin', 'core', 'land', 'pyramid', 'spire', 'towers', 'trees', 'debris', 'rest'] as const;
export type PartName = (typeof PARTS)[number];

export interface PartState {
  // The clock, in seconds.
  t: number;
  // How bright the core burns, about 1 (coreLevel in ./layout.ts). The shared light already follows it: a part
  // reads it only for what it lights itself.
  core: number;
  // The page's stream, which leaves the core's foot: how much of it is there (0 before it has set off, 1 once it
  // has), and the seconds since it set off. In the lab, where a plain line stands in for it, on is 0.
  stream: { on: number; since: number };
  // Nothing loops and nothing drifts: reduced motion, the static tier, or a held frame.
  still: boolean;
}

export interface WorldPart {
  group: THREE.Group;
  // How the part is framed when it is seen alone (?only=): its middle, in units, and how far from it it reaches.
  alone?: { at: [number, number, number]; r: number };
  // Which buildings the part draws, by their place in TOWERS (./placed.ts): the stand ins leave those out.
  stands?: readonly number[];
  // Called before a frame is drawn, and only while something of the part is on the screen. It returns true while
  // the part is moving by itself and needs the next frame drawn too.
  update?(s: PartState): boolean | void;
  dispose?(): void;
}

export interface PartContext {
  tier: Tier;
  renderer: THREE.WebGLRenderer;
  // An iPad or a phone, which is held to a smaller budget (HANDHELD in src/config/site.ts).
  handheld: boolean;
  // What was asked for in the page's address, for a part's own switches while it is being built.
  query: URLSearchParams;
  // The parts made ready before this one that have something to draw, and the buildings they draw.
  built: ReadonlySet<PartName>;
  stands: ReadonlySet<number>;
}

export type PartFactory = (ctx: PartContext) => WorldPart | Promise<WorldPart>;
