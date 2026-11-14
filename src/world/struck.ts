import type { Piece } from './piece';

// A piece the stream strikes: the reflector, the studio light, the small thing at the left of a row of skills.
// The page places the piece so that the point the stream meets it at is on the stream's route, and tells it each
// frame what the stream is doing to it. Everything here is beside the piece contract, which a struck piece still keeps.

// Where a point of the piece is drawn in its host: across and down from the host's middle, in host heights, x to
// the right and y down. A piece frames a fixed height of its world whatever its host's width, so these hold for any
// host.
export type Anchor = [x: number, y: number];

// The three ways a thing can come onto the page at its strike. He picks one from the three in motion.
export type Way = 'shards' | 'band' | 'flash';
export const WAYS: readonly Way[] = ['shards', 'band', 'flash'];

export interface Struck {
  // How much the stream is on it, 0 to 1: what the stream lights in it (a lens, a face, its traces) comes up with
  // this and dies with it. since is the seconds since its leading end struck, for a flash, and is large when it has
  // not.
  setStream(on: number, since: number): void;
  // Only on a thing that comes onto the page at its strike. age is the seconds since the strike: at 0 or less
  // nothing of it is drawn, and past the way's length it is whole and at rest. It is worked out from age alone, so
  // an age that runs back takes the thing away again, and a held age is a still.
  setLife?(way: Way, age: number): void;
}

export type StruckPiece = Piece & Struck;
