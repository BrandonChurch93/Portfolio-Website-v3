import * as THREE from 'three';
import { seat } from '../../layout';

// The port: the Harbour in the Rock, where every craft of the world lands and leaves. It is the match of the temple
// quarter's pyramid at the left of the skyline, and plainly not another pyramid, nor a gate standing free: a massif
// of rock, rugged and layered, its left flank a sheer cliff and its right climbing in landing terraces of dressed
// stone with hangar mouths cut into the rock behind them, lit from within. At its foot a front cut in the rock, as the
// old temples were, with four colossi seated before it and a great hangar door between them that craft fly out of.
// On its summit a beacon. At its outer foot, toward the limb, a harbour basin of light walled by quays with obelisk
// beacons, where the barque lies moored.
//
// Everything here is in the citadel's own frame, in units: its middle on the ground at the origin, y up, +z the way
// its front faces, +x to its right. The frame is seated whole on the world at CITADEL (seat in ../../layout.ts).

export const D2R = Math.PI / 180;
export type XZ = [number, number];
export type XYZ = [number, number, number];

// Where the citadel's middle is on the world's map, and how far it is turned about its own upright, in degrees: its
// front faces the visitor, turned a little toward the spire.
export const CITADEL = { at: [364, -26] as XZ, spin: -16 } as const;
// The matrix that stands the citadel on the world.
export const frame = (): THREE.Matrix4 => seat(CITADEL.at[0], CITADEL.at[1], 0, CITADEL.spin);
// How far everything that stands on the ground runs on down into it, so the dome's curve never shows under it.
export const SINK = 14;

// The massif: a crag of rock, its left part a cliff that rises sheer over the front cut in its foot to its summit,
// its right part stepping down toward the limb in ledges, each a landing terrace. Its extent across and in depth, its
// summit, where the cliff ends and the steps begin across, how much the cliff leans back as it rises, and each step:
// the height it begins at, how far across it reaches, and where its front stands.
export const MASSIF = {
  x0: -86, z0: -94, top: 176, split: -18, lean: 0.1, cliff: 22, rag: 7,
  steps: [[-SINK, 58, 21], [34, 50, 17], [70, 36, -3], [110, 18, -25], [137, -6, -41], [158, -18, -56]] as [number, number, number][],
} as const;
// The front cut in the rock at the massif's foot: across, how tall, where its face stands, how much it leans back as it
// rises, and the great door in it: its middle across, its width at the foot and at the head, how tall.
export const FACADE = { x0: -72, x1: 40, tall: 60, z: 24, batter: 0.05 } as const;
export const DOOR = { x: -16, wb: 22, wt: 16, h: 36 } as const;
// The colossi seated before the front, two each side of the door: across, how far forward, how tall.
export const COLOSSI = { x: [-62, -41, 9, 30], z: 37, tall: 38 } as const;
// The terraces on the massif's steps, decks of dressed stone, each with its hangar mouths in the rock behind it: its
// height, its extent, and each mouth's middle across, its width at the foot and the head, and how tall.
export interface Terrace { y: number; x0: number; x1: number; z0: number; z1: number; bays: [number, number, number, number][] }
export const TERRACES: Terrace[] = [
  { y: 70, x0: -12, x1: 48, z0: -4, z1: 16, bays: [[4, 14, 10, 13], [30, 12, 8, 11]] },
  { y: 110, x0: -12, x1: 34, z0: -26, z1: -4, bays: [[10, 13, 9, 12]] },
  { y: 137, x0: -12, x1: 16, z0: -42, z1: -26, bays: [[2, 11, 8, 10]] },
];
// The beacon on the summit: a stout obelisk of dark metal capped in gold: where, its foot, how tall.
export const BEACON = { x: -78, z: -82, foot: 9, tall: 22 } as const;
// The harbour on the outer side: its walls' extent, how tall the quays are and how wide, how deep the broad quay at
// its back is, and the level of the basin's light.
export const HARBOUR = { x0: 58, x1: 114, z0: -56, z1: 26, wall: 13, quay: 7, back: 16, pool: 4 } as const;
// The obelisk beacons at the harbour's corners: where, foot width, and height.
export const OBELISKS: [number, number, number, number][] = [[110, 21, 9, 38], [110, -51, 9, 34]];

// The berths, each a place a craft rests and which way it faces (degrees, 0 is +x, turning toward -z): one inside the
// great door, from which a craft flies out through it, one on each of the two lower terraces, one on the harbour's
// back quay. They are in the citadel's frame.
export interface Berth { at: XYZ; face: number; door?: boolean }
export const BERTHS: Berth[] = [
  { at: [DOOR.x, 0.4, -16], face: -90, door: true },
  { at: [18, 70.4, 6], face: -90 },
  { at: [22, 110.4, -15], face: -90 },
  { at: [94, 13.4, -48], face: 0 },
];

// The barque lies moored on the summit, held a little over the rock: where its middle is, which way it faces, and its
// size against its design (104 long).
export const BARQUE = { at: [-48, 176 + 13, -38] as XYZ, face: 6, scale: 0.8, len: 104 } as const;

// The paving of the forecourt round the citadel, laid on the ground: from how far out on the map to how far, and
// between which bearings.
export const PAVING = { r0: 292, r1: 468, from: 74, to: 108 } as const;

// Nothing in the air may come in front of his words: no craft is ever higher than this in the frame.
export const CEILING = 220;
