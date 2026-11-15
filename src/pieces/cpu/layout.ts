// Where everything on the square of board is, in millimetres. The board's top is y = 0, x runs to the right and z
// toward the viewer, so the board read from the front has its text upright. The socket's own sizes are from its
// middle; SOCKET says where that middle is on the board.

export type P2 = [number, number];

export const BOARD = { half: 55, thick: 1.6 } as const;
export const SOCKET = { x: 6, z: 4 } as const;
// The board's corner the stream meets: its left most point in the picture.
export const STRIKE = { x: -55, y: 0, z: -55 } as const;

// The cooler's four holes, plated, with a ring of copper and vias round each.
export const HOLES: P2[] = [[-33, -35], [45, -35], [-33, 43], [45, 43]];
export const HOLE = { r: 1.9, ring: 3.4 } as const;

// The processor: substrate, then the lid, which is a skirt with a wing at each end and a raised top with a chamfer.
export const PKG = { hw: 22.5, hd: 18.75, y0: 1.5, y1: 2.65 } as const;
export const IHS = { skirt: [19, 15.5] as P2, wing: [21.3, 7] as P2, top: [16.5, 14.2] as P2, y1: 3.55, y2: 5.35, chamfer: 0.55 } as const;
// The socket's plastic body and its cavity. Along the long sides the gap between the cavity's wall and the
// substrate shows the contacts.
export const BODY = { out: [24.5, 21.8] as P2, cav: [23.7, 20.45] as P2, top: 2.6, floor: 0.8 } as const;
// The steel frame screwed to the board round the body, and the load plate hinged at its right end.
export const FRAME = { out: [31, 25.4] as P2, t: 0.9 } as const;
// The window reaches past the lid's skirt at each end, so the lid's wings cross the gap and pass under the plate.
export const PLATE = { out: [25.5, 22.6] as P2, win: [20.4, 20.85] as P2, y: 3.55, t: 0.8, hinge: [27.2, 3.95] as P2, tongue: 30.2 } as const;
// The lever: an axle across the plate's hinge end (x1), turning in two bearings, with a cam in its middle that bears
// on the plate; an arm along the front side to x0; a handle bent out to z handle, which clips under the hook.
export const LEVER = { z: 26.6, y: 2.0, r: 0.95, x0: -22, x1: 29.8, handle: 33.6, axle: -12, cam: [-1.5, 9.5] as P2, hook: -17.4 } as const;
export const SCREWS: P2[] = [[-28, -22], [28, -22], [-28, 22], [28, 22]];
export const SHOULDER: P2 = [-28.6, 0];

// The power stages: a choke, its power stage in front toward the socket and a solid capacitor behind, along the top
// and down the left.
export interface Phase { choke: P2; mos: P2; cap: P2; turn: number }
export const PHASES: Phase[] = [
  ...Array.from({ length: 7 }, (_, i): Phase => { const x = -22 + 9.4 * i; return { choke: [x, -42], mos: [x, -31.6], cap: [x, -50.9], turn: 0 }; }),
  ...Array.from({ length: 6 }, (_, i): Phase => { const z = -22 + 9.4 * i; return { choke: [-43, z], mos: [-32.2, z], cap: [-50.9, z], turn: Math.PI / 2 }; }),
];
export const CHOKE = { w: 7.2, h: 4.8 } as const;
export const MOS = { w: 6, d: 5, h: 0.9 } as const;
export const CAP = { r: 3.15, h: 7 } as const;

// The eight pin power header in the corner the stream strikes, the fan header at the front right.
export const EPS = { x: -44.4, z: -48.6, w: 18.4, d: 9.6, h: 12.6 } as const;
export const FAN = { x: 44, z: 51, pitch: 2.54 } as const;

// Chips.
export const QFP = { x: 47, z: -47, w: 7 } as const;
export const QFN = { x: -45, z: 46.5, w: 5 } as const;
export const SOIC = { x: -8.5, z: 47.5 } as const;
export const LED = { x: -37, z: -42.2 } as const;
// The lower right: a second controller with its decoupling, its crystal, and a debug header.
export const U44 = { x: 12, z: 46.5, w: 6 } as const;
export const XTAL = { x: 38.5, z: 34, w: 5, d: 3.2 } as const;
export const DBG = { x: 49.5, z: 33.5, pitch: 2, n: 5 } as const;

// Small parts, as rows: where the first is, how many across and down, and how far apart.
export type Small = '0402c' | '0402r' | '0603c' | '0603r' | '0805c';
export interface Run { x: number; z: number; nx: number; nz: number; dx: number; dz: number; kind: Small; turn?: boolean }
export const SMALLS: Run[][] = [
  // Under the top row of power stages, toward the socket.
  [{ x: -20, z: -25.2, nx: 12, nz: 1, dx: 1.8, dz: 0, kind: '0402r' }, { x: 6, z: -25.2, nx: 10, nz: 1, dx: 1.8, dz: 0, kind: '0402c' }],
  // Down the left between the power stages and the frame.
  [{ x: -27.6, z: -18, nx: 1, nz: 16, dx: 0, dz: 2.6, kind: '0402c', turn: true }],
  // Right of the socket, between the bundles.
  [{ x: 40.5, z: -11, nx: 6, nz: 3, dx: 2.2, dz: 1.6, kind: '0402c' }],
  [{ x: 40.5, z: 8, nx: 6, nz: 2, dx: 2.2, dz: 1.9, kind: '0603c' }],
  [{ x: 40.5, z: 22.4, nx: 5, nz: 2, dx: 2.6, dz: 2.2, kind: '0805c' }],
  // In front of the socket, between the bundles.
  [{ x: 11, z: 33, nx: 6, nz: 3, dx: 1.8, dz: 1.4, kind: '0402c' }],
  [{ x: -13.6, z: 51.8, nx: 4, nz: 1, dx: 2.1, dz: 0, kind: '0603r' }],
  [{ x: -50.4, z: 51.8, nx: 5, nz: 1, dx: 2.0, dz: 0, kind: '0402r' }, { x: -50.4, z: 40.6, nx: 3, nz: 1, dx: 2.4, dz: 0, kind: '0603c' }],
  // Behind the clock chip in the top right corner.
  [{ x: 41.2, z: -53.2, nx: 6, nz: 1, dx: 2.1, dz: 0, kind: '0402c' }],
  // Round the second controller.
  [{ x: 7.6, z: 43.6, nx: 1, nz: 4, dx: 0, dz: 1.8, kind: '0402c', turn: true }, { x: 8.8, z: 51.4, nx: 5, nz: 1, dx: 1.6, dz: 0, kind: '0402c' }],
];
export const SMALL_SIZE: Record<Small, [number, number, number]> = {
  '0402c': [1.0, 0.5, 0.5], '0402r': [1.0, 0.35, 0.5], '0603c': [1.6, 0.8, 0.8], '0603r': [1.6, 0.45, 0.8], '0805c': [2.0, 1.1, 1.25],
};

// The bundles of traces that fan out from under the socket's frame to the board's edges: the polyline of the
// bundle's middle, how many traces, how far apart, and how wide each is.
export interface Bundle { path: P2[]; n: number; pitch: number; w: number }
export const BUNDLES: Bundle[] = [
  { path: [[36.4, -14.6], [41.4, -14.6], [44.8, -18.0], [57, -18.0]], n: 12, pitch: 0.4, w: 0.17 },
  { path: [[36.4, 1.0], [43.4, 1.0], [46.6, 4.2], [57, 4.2]], n: 16, pitch: 0.38, w: 0.16 },
  { path: [[36.4, 15.4], [40.6, 15.4], [43.6, 18.4], [57, 18.4]], n: 10, pitch: 0.42, w: 0.18 },
  { path: [[-14.4, 28.6], [-14.4, 35.6], [-19.6, 40.8], [-19.6, 57]], n: 10, pitch: 0.42, w: 0.18 },
  { path: [[5.4, 28.6], [5.4, 37.6], [2.2, 40.8], [2.2, 57]], n: 14, pitch: 0.38, w: 0.16 },
  { path: [[25.6, 28.6], [25.6, 34.2], [31.4, 40.0], [31.4, 57]], n: 12, pitch: 0.4, w: 0.17 },
  { path: [[-22.4, 28.6], [-22.4, 31.2], [-26.4, 35.2], [-57, 35.2]], n: 8, pitch: 0.44, w: 0.2 },
];
// The length a wave of light runs, in millimetres: a trace's distance from the socket is written as a share of it.
export const RUN = 46;

export const DEG = Math.PI / 180;
export const toWorld = (p: P2): P2 => [p[0] + SOCKET.x, p[1] + SOCKET.z];
