import type * as THREE from 'three';
import type { Tier } from '../../config/site';
import type { KeptLight } from './kept';

// The hero's world is one piece with one stage, and each thing in it is a part: one file in ./parts, behind this
// contract. A part builds its group in the world's units, in the world's own frame (./layout.ts), from files made
// ahead by scripts/world/, and is told each frame what the world is doing. It never touches the stage, the camera
// or another part.

// Every part of the world, in the order they are made ready. `rest` comes last: it is whatever is not built yet,
// as plain dark shapes in its place, and it leaves out what the parts before it say they have built.
export const PARTS = ['rock', 'skin', 'core', 'land', 'pyramid', 'spire', 'towers', 'trees', 'debris', 'rest'] as const;
export type PartName = (typeof PARTS)[number];
// What of the world is on the first screen. The rest is under it: the world is shown as soon as these are made,
// and the others are fetched and made after, so a first visit waits for about half of the world's files.
export const ABOVE: readonly PartName[] = ['land', 'pyramid', 'spire', 'towers', 'trees'];

// What the page's preloader knows the world's loading by (src/world/loading.ts). A page that waits for the world
// begins it under this name, and the world says how far along it is and when its first frame is drawn.
export const LOADING = 'world';

export interface PartState {
  // The clock, in seconds.
  t: number;
  // How bright the core burns, about 1 (coreLevel in ./layout.ts). The shared light already follows it: a part
  // reads it only for what it lights itself.
  core: number;
  // The page's stream, which leaves the core's foot: how much of it is there (0 before it has set off, 1 once it
  // has), the seconds since it set off, and how far under the core's foot its leading end has run, in units. In the
  // lab, where a plain line stands in for it, on is 0. What it lights is told the same through the shared light
  // (uStream in ./light.ts), which in the lab is the whole line, lit.
  stream: { on: number; since: number; long: number };
  // Where the cursor is in the world's host, as shares of its width and height from its top left (the same is in
  // the shared light as uPointer), and led: 1 while a real cursor leads the page's lamp, 0 while it drifts on its own.
  pointer: { x: number; y: number; led: number };
  // Nothing loops and nothing drifts: reduced motion, the static tier, or a held frame.
  still: boolean;
  // The clock is held at t, as it is for each frame of a film in turn.
  held: boolean;
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
  // A light of the part's own that moves, for when the world keeps the part as pictures (./kept.ts).
  kept?: KeptLight;
  // What a part hands the scripts that take pictures of it, if anything.
  tools?: unknown;
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
